import Anthropic from '@anthropic-ai/sdk';
import { AppState } from '../shared/types';
import { TOOL_DEFS, applyTool } from '../shared/tools';
import { totals } from '../shared/logic';
import { fetchUrlText } from './fetchUrl';

function summarize(state: AppState): string {
  const t = totals(state);
  return JSON.stringify(
    {
      couple: state.settings.coupleNames,
      currency: state.settings.currency,
      total_budget: state.settings.totalBudget,
      guest_count: state.settings.guestCount,
      budget_sum_target: t.target,
      categories: state.categories.map((c) => {
        const b = state.budget.find((x) => x.categoryId === c.id);
        return {
          id: c.id,
          name: c.name,
          budget: b ? { min: b.min, target: b.target, max: b.max } : null,
          // array order == rank order
          options: state.options
            .filter((o) => o.categoryId === c.id)
            .map((o, i) => ({ id: o.id, rank: i + 1, name: o.name, status: o.status, cost: o.cost, rating: o.rating, lead_time_months: o.leadTimeMonths, scenarios: o.scenarioIds.length ? o.scenarioIds : 'all' })),
        };
      }),
      scenarios: state.scenarios.map((s) => ({ id: s.id, name: s.name, date: s.date })),
      rings: state.rings.map((r) => ({ id: r.id, name: r.name, vendor: r.vendor, price: r.price, status: r.status })),
      proposal_ideas: state.proposals.map((p) => ({ id: p.id, name: p.name, location: p.location, status: p.status })),
      decision_tree_nodes: state.tree.nodes.map((n) => n.data.label),
    },
    null,
    1,
  );
}

const SYSTEM = `You are the planning assistant inside "Yabi Ena Johnny", a private wedding-planning workspace for a couple.
You help them compare venues and vendors, rank choices, manage budgets and timelines, and capture decisions.

Rules:
- You can read the planner's current data (below) and change it with tools. When the user pastes a link, call fetch_url first, extract the facts (name, location, price, capacity, lead time), then call add_option (or add_ring / add_proposal_idea) with those facts. Never invent prices: if a price is not on the page, leave cost at 0 and say so.
- Make the changes the user asks for, then confirm briefly what you did. Ask a question only if something essential is missing.
- Prefer status "rejected" over delete_option unless asked to delete.
- Timelines can differ per scenario. If an option only works for an earlier or later date, attach it to that scenario (scenarios field) and mention lead times.
- Costs are in the planner's currency. Be warm, concise and practical. Offer a short opinion when asked to compare, using the numbers.

Current planner data (JSON):
`;

export async function runChat(initial: AppState, history: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  let state = initial;
  const actions: string[] = [];
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  let reply = '';

  for (let turn = 0; turn < 10; turn++) {
    const res = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM + summarize(state),
      tools: TOOL_DEFS as unknown as Anthropic.Tool[],
      messages,
    });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) reply = text;
    if (res.stop_reason !== 'tool_use') break;

    messages.push({ role: 'assistant', content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== 'tool_use') continue;
      const input = (block.input ?? {}) as Record<string, any>;
      if (block.name === 'fetch_url') {
        try {
          const page = await fetchUrlText(String(input.url));
          results.push({ type: 'tool_result', tool_use_id: block.id, content: page || '(empty page)' });
          actions.push(`Read ${new URL(String(input.url)).hostname}`);
        } catch (e: any) {
          results.push({ type: 'tool_result', tool_use_id: block.id, content: `Could not fetch: ${e.message}`, is_error: true });
        }
        continue;
      }
      const r = applyTool(state, block.name, input);
      state = r.state;
      if (r.action) actions.push(r.action);
      results.push({ type: 'tool_result', tool_use_id: block.id, content: r.message, is_error: r.error });
    }
    messages.push({ role: 'user', content: results });
  }
  return { reply: reply || 'Done.', state, actions };
}

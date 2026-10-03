import Anthropic from '@anthropic-ai/sdk';
import { AppState } from '../shared/types';
import { TOOL_DEFS, applyTool } from '../shared/tools';
import { guestCounts, totals } from '../shared/logic';
import { fetchUrlText } from './fetchUrl';
import { Attachment, attachmentBlocks } from './attachments';

function summarize(state: AppState): string {
  const t = totals(state);
  return JSON.stringify(
    {
      couple: state.settings.coupleNames,
      currency: state.settings.currency,
      total_budget: state.settings.totalBudget,
      guest_count: state.settings.guestCount,
      budget_sum_target: t.target,
      home_country: state.settings.homeCountry,
      guest_list: { ...guestCounts(state), people: state.guests.map((g) => ({ id: g.id, name: g.name, side: g.side, status: g.status })) },
      categories: state.categories.filter((c) => !c.hidden).map((c) => {
        const b = state.budget.find((x) => x.categoryId === c.id);
        return {
          id: c.id,
          name: c.name,
          budget: b ? { min: b.min, target: b.target, max: b.max } : null,
          // array order == rank order
          options: state.options
            .filter((o) => o.categoryId === c.id)
            .map((o, i) => ({ id: o.id, rank: i + 1, name: o.name, country: o.country || undefined, status: o.status, cost: o.cost, rating: o.rating, lead_time_months: o.leadTimeMonths, scenarios: o.scenarioIds.length ? o.scenarioIds : 'all' })),
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
- When the user attaches files (price sheets, brochures, PDFs, screenshots, spreadsheets, documents), read them carefully and add every venue / vendor / option you find to the right category with add_option (several calls in one turn is fine). Use only numbers that are in the files; never guess a price. If the same venue appears in more than one file or page, merge it into ONE option, and if it already exists in the planner use update_option.
- Prices that differ by day of the week or season go in "pricing", one entry per distinct price (for example Mon–Thu, Fri, Sat, Sun). Put minimum spend, service charge, tax, deposit, capacity, hours and what is included in "notes" or "custom". If a price is per person, multiply by the planner's guest_count only when you say so in "notes".
- After adding from a file, finish with a short summary: each option with its prices by day, plus anything unclear, missing or worth asking the venue.
- Timelines can differ per scenario. If an option only works for an earlier or later date, attach it to that scenario (scenarios field) and mention lead times.
- Costs are in the planner's currency. Be warm, concise and practical. Offer a short opinion when asked to compare, using the numbers.

Current planner data (JSON):
`;

const RING_TOOLS = new Set(['add_ring', 'update_ring', 'add_proposal_idea']);

export async function runChat(initial: AppState, history: Array<{ role: 'user' | 'assistant'; content: string }>, ringUnlocked = false, attachments: Attachment[] = []) {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  let state = initial;
  const actions: string[] = [];
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  if (attachments.length) {
    // The files travel with the newest user message only; they stay unchanged through the whole tool loop.
    const last = messages[messages.length - 1];
    const text = typeof last.content === 'string' ? last.content : '';
    last.content = [...(await attachmentBlocks(attachments)), { type: 'text', text: text || 'Please read the attached file(s) and add what you find to the planner.' }];
  }
  let reply = '';

  // Built ONCE per request and reused verbatim on every step of the tool loop. The model's reasoning blocks are
  // bound to the exact system prompt they were produced under, so changing it mid-loop (e.g. re-summarising the
  // planner after a tool edits it) makes the API reject the replayed blocks. Later changes reach the model
  // through the tool results instead.
  const system = SYSTEM + (ringUnlocked ? '' : '\n(The private ring & proposal section is locked in this session: do not discuss or create rings or proposal ideas.)\n') + summarize(initial);
  const tools = (ringUnlocked ? TOOL_DEFS : TOOL_DEFS.filter((t) => !RING_TOOLS.has(t.name))) as unknown as Anthropic.Tool[];

  for (let turn = 0; turn < 10; turn++) {
    const res = await client.messages.create({
      model,
      max_tokens: 16000, // reasoning tokens count toward this limit
      system,
      tools,
      messages,
    });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) reply = text;
    if (res.stop_reason === 'refusal') { reply = reply || 'Sorry, I can’t help with that request.'; break; }
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
      if (!ringUnlocked && RING_TOOLS.has(block.name)) {
        results.push({ type: 'tool_result', tool_use_id: block.id, content: 'That section is locked.', is_error: true });
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

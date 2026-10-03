import { AppState, Option, Status, TreeEdge, TreeNode, uid } from './types';
import { moveOption } from './logic';

/** Tool schemas exposed to the Claude assistant. (fetch_url is handled by the server.) */
export const TOOL_DEFS = [
  {
    name: 'fetch_url',
    description: 'Fetch a web page (venue, vendor, ring listing, etc.) and return its readable text so you can extract name, price, location and details.',
    input_schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  },
  {
    name: 'add_option',
    description: 'Add a new option (venue, vendor, person, etc.) to a planning category.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category id or name' },
        name: { type: 'string' },
        vendor: { type: 'string', description: 'Vendor name (or role for wedding-party people)' },
        url: { type: 'string' },
        location: { type: 'string' },
        cost: { type: 'number', description: 'Total estimated cost in the budget currency' },
        rating: { type: 'number', description: '0-5' },
        status: { type: 'string', enum: ['idea', 'shortlist', 'chosen', 'rejected'] },
        pros: { type: 'string' },
        cons: { type: 'string' },
        notes: { type: 'string' },
        lead_time_months: { type: 'number', description: 'Months before the wedding it must be booked' },
        availability: { type: 'string' },
        scenarios: { type: 'array', items: { type: 'string' }, description: 'Scenario names/ids this applies to; omit for all' },
      },
      required: ['category', 'name'],
    },
  },
  {
    name: 'update_option',
    description: 'Change fields on an existing option. Identify it by id or name.',
    input_schema: {
      type: 'object',
      properties: {
        option: { type: 'string', description: 'Option id or (part of) its name' },
        name: { type: 'string' }, vendor: { type: 'string' }, url: { type: 'string' }, location: { type: 'string' },
        cost: { type: 'number' }, rating: { type: 'number' },
        status: { type: 'string', enum: ['idea', 'shortlist', 'chosen', 'rejected'] },
        pros: { type: 'string' }, cons: { type: 'string' }, notes: { type: 'string' },
        lead_time_months: { type: 'number' }, availability: { type: 'string' },
        scenarios: { type: 'array', items: { type: 'string' } },
        category: { type: 'string', description: 'Move to this category' },
      },
      required: ['option'],
    },
  },
  {
    name: 'delete_option',
    description: 'Permanently remove an option. Prefer setting status to "rejected" unless the user asks to delete.',
    input_schema: { type: 'object', properties: { option: { type: 'string' } }, required: ['option'] },
  },
  {
    name: 'rank_option',
    description: 'Move an option to a rank position inside its category (1 = top choice).',
    input_schema: { type: 'object', properties: { option: { type: 'string' }, position: { type: 'number' } }, required: ['option', 'position'] },
  },
  {
    name: 'set_budget',
    description: 'Set the min/target/max budget range for a category. Provide only the values to change.',
    input_schema: {
      type: 'object',
      properties: { category: { type: 'string' }, min: { type: 'number' }, target: { type: 'number' }, max: { type: 'number' } },
      required: ['category'],
    },
  },
  {
    name: 'set_total_budget',
    description: 'Set the overall wedding budget and/or guest count.',
    input_schema: { type: 'object', properties: { total_budget: { type: 'number' }, guest_count: { type: 'number' } } },
  },
  {
    name: 'add_note',
    description: 'Log a discussion note / decision in the conversation log.',
    input_schema: {
      type: 'object',
      properties: { title: { type: 'string' }, body: { type: 'string' }, category: { type: 'string' }, decision: { type: 'string' } },
      required: ['title', 'body'],
    },
  },
  {
    name: 'add_scenario',
    description: 'Create a new timeline scenario (e.g. an earlier or later wedding date).',
    input_schema: { type: 'object', properties: { name: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, notes: { type: 'string' } }, required: ['name', 'date'] },
  },
  {
    name: 'update_scenario',
    description: 'Rename or re-date a timeline scenario.',
    input_schema: { type: 'object', properties: { scenario: { type: 'string' }, name: { type: 'string' }, date: { type: 'string' }, notes: { type: 'string' } }, required: ['scenario'] },
  },
  {
    name: 'add_ring',
    description: 'Add an engagement ring option from a vendor.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' }, vendor: { type: 'string' }, url: { type: 'string' }, price: { type: 'number' },
        stone: { type: 'string' }, carat: { type: 'string' }, metal: { type: 'string' }, style: { type: 'string' },
        rating: { type: 'number' }, status: { type: 'string', enum: ['idea', 'shortlist', 'chosen', 'rejected'] }, notes: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_ring',
    description: 'Change fields on an existing ring option.',
    input_schema: {
      type: 'object',
      properties: {
        ring: { type: 'string', description: 'Ring id or name' },
        name: { type: 'string' }, vendor: { type: 'string' }, url: { type: 'string' }, price: { type: 'number' },
        stone: { type: 'string' }, carat: { type: 'string' }, metal: { type: 'string' }, style: { type: 'string' },
        rating: { type: 'number' }, status: { type: 'string', enum: ['idea', 'shortlist', 'chosen', 'rejected'] }, notes: { type: 'string' },
      },
      required: ['ring'],
    },
  },
  {
    name: 'add_proposal_idea',
    description: 'Add a place / plan idea for the proposal.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' }, location: { type: 'string' }, cost: { type: 'number' }, vibe: { type: 'string' },
        rating: { type: 'number' }, pros: { type: 'string' }, cons: { type: 'string' }, notes: { type: 'string' },
        status: { type: 'string', enum: ['idea', 'shortlist', 'chosen', 'rejected'] },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_if_then',
    description: 'Add a branch to the decision tree: "if <condition> then <outcome>". Optionally hang it off an existing node by label.',
    input_schema: {
      type: 'object',
      properties: {
        condition: { type: 'string', description: 'The "if" (becomes the edge label)' },
        outcome: { type: 'string', description: 'The "then" (becomes the new node)' },
        parent: { type: 'string', description: 'Label (or part) of an existing node to branch from; omitted = create a new root question' },
        kind: { type: 'string', enum: ['question', 'option', 'outcome'] },
      },
      required: ['condition', 'outcome'],
    },
  },
  {
    name: 'add_category',
    description: 'Add a new custom planning category.',
    input_schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } }, required: ['name'] },
  },
] as const;

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

function findCategory(state: AppState, ref: unknown) {
  const r = norm(ref);
  return state.categories.find((c) => c.id === r || norm(c.name) === r) ?? state.categories.find((c) => norm(c.name).includes(r) || r.includes(c.id));
}
function findOption(state: AppState, ref: unknown) {
  const r = norm(ref);
  return state.options.find((o) => o.id === ref) ?? state.options.find((o) => norm(o.name) === r) ?? state.options.find((o) => norm(o.name).includes(r));
}
function findScenario(state: AppState, ref: unknown) {
  const r = norm(ref);
  return state.scenarios.find((s) => s.id === ref || norm(s.name) === r) ?? state.scenarios.find((s) => norm(s.name).includes(r));
}
const clampRating = (n: unknown) => Math.max(0, Math.min(5, Number(n) || 0));
const validStatus = (s: unknown): Status | undefined => (['idea', 'shortlist', 'chosen', 'rejected'].includes(String(s)) ? (s as Status) : undefined);

export interface ToolResult {
  state: AppState;
  message: string; // fed back to the model
  action?: string; // short human-readable summary shown in the chat UI
  error?: boolean;
}

/** Apply a (non-network) tool call to the state. Pure: returns a new state. */
export function applyTool(state: AppState, name: string, input: Record<string, any>): ToolResult {
  const fail = (message: string): ToolResult => ({ state, message, error: true });
  switch (name) {
    case 'add_option': {
      const cat = findCategory(state, input.category);
      if (!cat) return fail(`No category matching "${input.category}". Categories: ${state.categories.map((c) => `${c.id} (${c.name})`).join(', ')}`);
      const scenarioIds = ((input.scenarios as string[]) ?? []).map((s) => findScenario(state, s)?.id).filter(Boolean) as string[];
      const opt: Option = {
        id: uid('opt'), categoryId: cat.id, name: String(input.name), vendor: input.vendor ?? '', url: input.url ?? '', location: input.location ?? '',
        cost: Number(input.cost) || 0, rating: clampRating(input.rating), status: validStatus(input.status) ?? 'idea',
        pros: input.pros ?? '', cons: input.cons ?? '', notes: input.notes ?? '', scenarioIds, leadTimeMonths: Number(input.lead_time_months) || 0,
        availability: input.availability ?? '', tags: [], custom: {}, createdAt: new Date().toISOString(),
      };
      return { state: { ...state, options: [...state.options, opt] }, message: `Added option ${opt.id} "${opt.name}" to ${cat.name}.`, action: `Added "${opt.name}" to ${cat.name}` };
    }
    case 'update_option': {
      const o = findOption(state, input.option);
      if (!o) return fail(`No option matching "${input.option}".`);
      const next: Option = { ...o };
      for (const k of ['name', 'vendor', 'url', 'location', 'pros', 'cons', 'notes', 'availability'] as const) if (input[k] !== undefined) next[k] = String(input[k]);
      if (input.cost !== undefined) next.cost = Number(input.cost) || 0;
      if (input.rating !== undefined) next.rating = clampRating(input.rating);
      if (input.lead_time_months !== undefined) next.leadTimeMonths = Number(input.lead_time_months) || 0;
      if (validStatus(input.status)) next.status = validStatus(input.status)!;
      if (input.scenarios) next.scenarioIds = (input.scenarios as string[]).map((s) => findScenario(state, s)?.id).filter(Boolean) as string[];
      if (input.category) {
        const cat = findCategory(state, input.category);
        if (cat) next.categoryId = cat.id;
      }
      return { state: { ...state, options: state.options.map((x) => (x.id === o.id ? next : x)) }, message: `Updated "${next.name}".`, action: `Updated "${next.name}"` };
    }
    case 'delete_option': {
      const o = findOption(state, input.option);
      if (!o) return fail(`No option matching "${input.option}".`);
      return { state: { ...state, options: state.options.filter((x) => x.id !== o.id) }, message: `Deleted "${o.name}".`, action: `Deleted "${o.name}"` };
    }
    case 'rank_option': {
      const o = findOption(state, input.option);
      if (!o) return fail(`No option matching "${input.option}".`);
      const sameCat = state.options.filter((x) => x.categoryId === o.categoryId);
      const from = sameCat.findIndex((x) => x.id === o.id);
      const to = Math.max(0, Math.min(sameCat.length - 1, Number(input.position) - 1));
      let options = state.options;
      if (to === 0) options = moveOption(options, o.id, 'top');
      else for (let i = from; i !== to; i += to > from ? 1 : -1) options = moveOption(options, o.id, to > from ? 1 : -1);
      return { state: { ...state, options }, message: `"${o.name}" is now rank ${to + 1}.`, action: `Ranked "${o.name}" #${to + 1}` };
    }
    case 'set_budget': {
      const cat = findCategory(state, input.category);
      if (!cat) return fail(`No category matching "${input.category}".`);
      const existing = state.budget.find((b) => b.categoryId === cat.id) ?? { categoryId: cat.id, min: 0, target: 0, max: 0 };
      const line = { ...existing };
      if (input.min !== undefined) line.min = Number(input.min);
      if (input.target !== undefined) line.target = Number(input.target);
      if (input.max !== undefined) line.max = Number(input.max);
      line.max = Math.max(line.max, line.target); line.min = Math.min(line.min, line.target);
      const budget = state.budget.some((b) => b.categoryId === cat.id) ? state.budget.map((b) => (b.categoryId === cat.id ? line : b)) : [...state.budget, line];
      return { state: { ...state, budget }, message: `Budget for ${cat.name}: ${line.min}-${line.max}, target ${line.target}.`, action: `Budget ${cat.name}: ${line.min.toLocaleString()}–${line.max.toLocaleString()}` };
    }
    case 'set_total_budget': {
      const settings = { ...state.settings };
      if (input.total_budget !== undefined) settings.totalBudget = Number(input.total_budget);
      if (input.guest_count !== undefined) settings.guestCount = Number(input.guest_count);
      return { state: { ...state, settings }, message: 'Updated overall budget settings.', action: 'Updated total budget / guest count' };
    }
    case 'add_note': {
      const cat = input.category ? findCategory(state, input.category) : undefined;
      const note = { id: uid('note'), title: String(input.title), body: String(input.body), author: 'Claude', categoryId: cat?.id ?? '', decision: input.decision ?? '', resolved: false, createdAt: new Date().toISOString() };
      return { state: { ...state, notes: [note, ...state.notes] }, message: 'Note saved.', action: `Logged note "${note.title}"` };
    }
    case 'add_scenario': {
      const milestones = state.scenarios[0]?.milestones.map((m) => ({ ...m, id: uid('ms'), done: false })) ?? [];
      const sc = { id: uid('sc'), name: String(input.name), date: String(input.date), color: '#7fa8d6', notes: input.notes ?? '', milestones };
      return { state: { ...state, scenarios: [...state.scenarios, sc] }, message: `Created scenario ${sc.id}.`, action: `New timeline "${sc.name}"` };
    }
    case 'update_scenario': {
      const sc = findScenario(state, input.scenario);
      if (!sc) return fail(`No scenario matching "${input.scenario}".`);
      const next = { ...sc, name: input.name ?? sc.name, date: input.date ?? sc.date, notes: input.notes ?? sc.notes };
      return { state: { ...state, scenarios: state.scenarios.map((s) => (s.id === sc.id ? next : s)) }, message: `Updated scenario "${next.name}".`, action: `Updated timeline "${next.name}"` };
    }
    case 'add_ring': {
      const ring = {
        id: uid('ring'), name: String(input.name), vendor: input.vendor ?? '', url: input.url ?? '', price: Number(input.price) || 0, stone: input.stone ?? '', carat: input.carat ?? '',
        metal: input.metal ?? '', style: input.style ?? '', rating: clampRating(input.rating), status: validStatus(input.status) ?? 'idea', notes: input.notes ?? '', createdAt: new Date().toISOString(),
      };
      return { state: { ...state, rings: [...state.rings, ring] }, message: `Added ring ${ring.id}.`, action: `Added ring "${ring.name}"` };
    }
    case 'update_ring': {
      const r = norm(input.ring);
      const ring = state.rings.find((x) => x.id === input.ring) ?? state.rings.find((x) => norm(x.name).includes(r));
      if (!ring) return fail(`No ring matching "${input.ring}".`);
      const next = { ...ring };
      for (const k of ['name', 'vendor', 'url', 'stone', 'carat', 'metal', 'style', 'notes'] as const) if (input[k] !== undefined) next[k] = String(input[k]);
      if (input.price !== undefined) next.price = Number(input.price) || 0;
      if (input.rating !== undefined) next.rating = clampRating(input.rating);
      if (validStatus(input.status)) next.status = validStatus(input.status)!;
      return { state: { ...state, rings: state.rings.map((x) => (x.id === ring.id ? next : x)) }, message: `Updated ring "${next.name}".`, action: `Updated ring "${next.name}"` };
    }
    case 'add_proposal_idea': {
      const p = {
        id: uid('prop'), name: String(input.name), location: input.location ?? '', cost: Number(input.cost) || 0, vibe: input.vibe ?? '', rating: clampRating(input.rating),
        status: validStatus(input.status) ?? 'idea', pros: input.pros ?? '', cons: input.cons ?? '', notes: input.notes ?? '', createdAt: new Date().toISOString(),
      };
      return { state: { ...state, proposals: [...state.proposals, p] }, message: `Added proposal idea ${p.id}.`, action: `Added proposal idea "${p.name}"` };
    }
    case 'add_if_then': {
      const nodes: TreeNode[] = [...state.tree.nodes];
      const edges: TreeEdge[] = [...state.tree.edges];
      const parentRef = norm(input.parent);
      const parent = parentRef ? nodes.find((n) => norm(n.data.label).includes(parentRef)) : undefined;
      const kind = (['question', 'option', 'outcome'].includes(input.kind) ? input.kind : 'outcome') as TreeNode['data']['kind'];
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0);
      const siblings = parent ? edges.filter((e) => e.source === parent.id).length : 0;
      const pos = parent ? { x: parent.position.x + (siblings - 0.5) * 240, y: parent.position.y + 170 } : { x: 0, y: maxY + 170 };
      const node: TreeNode = { id: uid('n'), type: 'decision', position: pos, data: { label: String(input.outcome), kind } };
      nodes.push(node);
      if (parent) edges.push({ id: uid('e'), source: parent.id, target: node.id, label: String(input.condition) });
      else {
        const root: TreeNode = { id: uid('n'), type: 'decision', position: { x: pos.x, y: pos.y - 170 }, data: { label: String(input.condition), kind: 'question' } };
        nodes.push(root);
        edges.push({ id: uid('e'), source: root.id, target: node.id, label: 'then' });
      }
      return { state: { ...state, tree: { nodes, edges } }, message: 'Decision tree updated.', action: `Tree: if ${input.condition} → ${input.outcome}` };
    }
    case 'add_category': {
      const cat = { id: uid('cat'), name: String(input.name), icon: 'sparkles', color: '#c9a45c', description: input.description ?? '', kind: 'vendor' as const };
      return { state: { ...state, categories: [...state.categories, cat], budget: [...state.budget, { categoryId: cat.id, min: 0, target: 0, max: 0 }] }, message: `Created category ${cat.id}.`, action: `New category "${cat.name}"` };
    }
    default:
      return fail(`Unknown tool ${name}`);
  }
}

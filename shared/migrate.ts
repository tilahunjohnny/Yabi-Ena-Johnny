import { AppState, Category, Guest, uid } from './types';
import { CATEGORY_SEED, MILESTONE_TEMPLATE, NEW_CHECKLIST, PLAN_SEED } from './seed';

/** Shares the original template used for the budget, to tell untouched defaults from edits. */
const OLD_SHARES: Record<string, number> = {
  venue: 0.3, party: 0.01, catering: 0.2, photo: 0.1, attire: 0.07, music: 0.06, decor: 0.08,
  officiant: 0.01, stationery: 0.02, lodging: 0.03, cake: 0.02, honeymoon: 0.08, planner: 0.02,
};
const defaultLine = (total: number, share: number) => {
  const target = Math.round((total * share) / 100) * 100;
  return { min: Math.round((target * 0.7) / 100) * 100, target, max: Math.round((target * 1.35) / 100) * 100 };
};

/**
 * Brings any saved planner up to the current shape. Safe to run repeatedly: the version-2 changes
 * (simplified categories, guest list, Plans A/B/C) run once, and nothing the user typed is deleted
 * (hidden categories keep their data).
 */
function toV2(input: AppState): AppState {
  let s: AppState = input;

  const total = s.settings.totalBudget;

  // --- 1. Categories: simplified list; "Wedding Party" becomes the Guest List feature.
  const existing = new Map(s.categories.map((c) => [c.id, c]));
  const seedIds = new Set(CATEGORY_SEED.map((c) => c.id));
  const categories: Category[] = CATEGORY_SEED.map(({ share: _share, ...seed }) => {
    const old = existing.get(seed.id);
    if (!old) return seed;
    const renamedByUser = seed.id === 'venue' ? old.name !== 'Venue & Location' : false;
    return { ...old, color: seed.color, hidden: seed.hidden ?? false, name: seed.id === 'venue' && !renamedByUser ? seed.name : old.name, description: seed.id === 'venue' ? seed.description : old.description };
  });
  const custom = s.categories.filter((c) => !seedIds.has(c.id) && c.id !== 'party');
  categories.push(...custom);

  // --- 2. Wedding Party options become guests (side unknown, so they land on Yabi's side with a note).
  const moved: Guest[] = s.options
    .filter((o) => o.categoryId === 'party')
    .map((o) => ({ id: uid('g'), name: o.name, side: 'yabi' as const, status: o.status === 'rejected' ? ('maybe' as const) : ('yes' as const), group: o.vendor || 'Wedding party', notes: [o.notes, 'Moved from Wedding Party: check which side.'].filter(Boolean).join(' '), createdAt: o.createdAt }));

  // --- 3. Budget: reset lines that were still the untouched old defaults; drop the party line.
  const lines = s.budget.filter((b) => b.categoryId !== 'party');
  const newShare = new Map(CATEGORY_SEED.map((c) => [c.id, c.share]));
  const budget = categories.map((c) => {
    const line = lines.find((b) => b.categoryId === c.id);
    const fresh = { categoryId: c.id, ...defaultLine(total, newShare.get(c.id) ?? 0) };
    if (!line) return fresh;
    const old = OLD_SHARES[c.id];
    const wasDefault = old !== undefined && JSON.stringify({ ...defaultLine(total, old) }) === JSON.stringify({ min: line.min, target: line.target, max: line.max });
    return wasDefault ? fresh : line;
  });

  // --- 4. Plans A / B / C.
  const keepCategory = new Set(['venue', 'honeymoon', 'planner']);
  const removedIds = new Set(CATEGORY_SEED.filter((c) => !keepCategory.has(c.id)).map((c) => c.id).concat('party'));
  const cleanMilestones = (list: AppState['scenarios'][number]['milestones']) => {
    const kept = list.filter((m) => m.done || !removedIds.has(m.categoryId));
    const titles = new Set(kept.map((m) => m.title.toLowerCase()));
    const add = MILESTONE_TEMPLATE.filter((t) => !titles.has(t.title.toLowerCase())).map((t) => ({ ...t, id: uid('ms'), done: false }));
    return [...kept, ...add];
  };
  const byId = new Map(s.scenarios.map((sc) => [sc.id, sc]));
  const plans = PLAN_SEED.map((p) => {
    const old = byId.get(p.id);
    return { id: p.id, name: `${p.name} — ${p.label}`, date: p.date, color: p.color, notes: old?.notes ?? '', milestones: cleanMilestones(old?.milestones ?? []) };
  });
  const planIds = new Set(PLAN_SEED.map((p) => p.id));
  const others = s.scenarios.filter((sc) => !planIds.has(sc.id)).map((sc) => ({ ...sc, milestones: cleanMilestones(sc.milestones) }));

  // --- 5. Checklist: drop the wedding-party prompts, add the new ones.
  let checklist = s.checklist.filter((c) => c.categoryId !== 'party');
  const have = new Set(checklist.map((c) => c.title.toLowerCase()));
  checklist = [...checklist, ...NEW_CHECKLIST.filter(([, t]) => !have.has(t.toLowerCase())).map(([categoryId, title]) => ({ id: uid('ck'), title, categoryId, done: false, note: '' }))];

  s = {
    ...s,
    version: 2,
    categories,
    budget,
    scenarios: [...plans, ...others],
    checklist,
    guests: [...s.guests, ...moved],
    options: s.options.filter((o) => o.categoryId !== 'party'),
    notes: s.notes.map((n) => (n.categoryId === 'party' ? { ...n, categoryId: '' } : n)),
  };
  return s;
}


function toColors(s: AppState): AppState {
  const catColor = new Map(CATEGORY_SEED.map((c) => [c.id, c.color]));
  const planColor = new Map(PLAN_SEED.map((p) => [p.id, p.color]));
  return {
    ...s,
    version: 5,
    categories: s.categories.map((c) => (catColor.has(c.id) ? { ...c, color: catColor.get(c.id)! } : c)),
    scenarios: s.scenarios.map((sc) => (planColor.has(sc.id) ? { ...sc, color: planColor.get(sc.id)! } : sc)),
  };
}

/**
 * Brings any saved planner up to the current shape. Safe to run repeatedly: each step runs once, and
 * nothing the user typed is deleted (hidden categories keep their data).
 */
export function migrateState(input: AppState): AppState {
  let s: AppState = {
    ...input,
    settings: { ...input.settings, homeCountry: input.settings.homeCountry ?? 'United States' },
    guests: input.guests ?? [],
    options: (input.options ?? []).map((o) => (o.country === undefined ? { ...o, country: '' } : o)),
  };
  const v = input.version ?? 1;
  if (v < 2) s = toV2(s);
  if (v < 5) s = toColors(s);
  return s;
}

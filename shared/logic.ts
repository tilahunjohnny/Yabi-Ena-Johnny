import { AppState, Option, Scenario } from './types';

/** Options for a category, in rank order, optionally filtered to a scenario. */
export function optionsFor(state: AppState, categoryId: string, scenarioId: string = 'all'): Option[] {
  return state.options.filter(
    (o) => o.categoryId === categoryId && (scenarioId === 'all' || o.scenarioIds.length === 0 || o.scenarioIds.includes(scenarioId)),
  );
}

export const isLive = (o: Option) => o.status !== 'rejected';

/** Top three live options by rank. A chosen option always sits first. */
export function top3(state: AppState, categoryId: string, scenarioId: string = 'all'): Option[] {
  const live = optionsFor(state, categoryId, scenarioId).filter(isLive);
  const chosen = live.filter((o) => o.status === 'chosen');
  const rest = live.filter((o) => o.status !== 'chosen');
  return [...chosen, ...rest].slice(0, 3);
}

/** Estimated cost for a category: the chosen option, else the #1 ranked live option. */
export function estimateFor(state: AppState, categoryId: string, scenarioId: string = 'all') {
  const t = top3(state, categoryId, scenarioId);
  const pick = t[0];
  return { cost: pick?.cost ?? 0, option: pick, locked: pick?.status === 'chosen' };
}

export function totals(state: AppState, scenarioId: string = 'all') {
  let min = 0, target = 0, max = 0, estimate = 0, locked = 0;
  for (const line of state.budget) {
    min += line.min;
    target += line.target;
    max += line.max;
    const e = estimateFor(state, line.categoryId, scenarioId);
    estimate += e.cost;
    if (e.locked) locked += e.cost;
  }
  return { min, target, max, estimate, locked };
}

export function scenarioById(state: AppState, id: string): Scenario | undefined {
  return state.scenarios.find((s) => s.id === id);
}

export function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T12:00:00').getTime();
  const b = new Date(toIso + 'T12:00:00').getTime();
  return (b - a) / (1000 * 60 * 60 * 24 * 30.4375);
}

export const today = () => new Date().toISOString().slice(0, 10);

/** Move an option up/down inside its category (array order == rank). */
export function moveOption(options: Option[], id: string, dir: -1 | 1 | 'top'): Option[] {
  const target = options.find((o) => o.id === id);
  if (!target) return options;
  const sameCat = options.filter((o) => o.categoryId === target.categoryId);
  const idx = sameCat.findIndex((o) => o.id === id);
  const newIdx = dir === 'top' ? 0 : Math.max(0, Math.min(sameCat.length - 1, idx + dir));
  if (newIdx === idx) return options;
  const reordered = sameCat.slice();
  reordered.splice(idx, 1);
  reordered.splice(newIdx, 0, target);
  let k = 0;
  return options.map((o) => (o.categoryId === target.categoryId ? reordered[k++] : o));
}

export function money(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);
}

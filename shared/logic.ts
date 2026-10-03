import { AppState, Category, Option, PriceTier, Scenario, Weekday } from './types';

/** Options for a category, in rank order, optionally filtered to a scenario. */
export function optionsFor(state: AppState, categoryId: string, scenarioId: string = 'all'): Option[] {
  return state.options.filter(
    (o) => o.categoryId === categoryId && (scenarioId === 'all' || o.scenarioIds.length === 0 || o.scenarioIds.includes(scenarioId)),
  );
}

/** Categories that are shown (not hidden). */
export const visibleCategories = (state: AppState): Category[] => state.categories.filter((c) => !c.hidden);

export const isLive = (o: Option) => o.status !== 'rejected';

/** Top three live options by rank. A chosen option always sits first. */
export function top3(state: AppState, categoryId: string, scenarioId: string = 'all'): Option[] {
  const live = optionsFor(state, categoryId, scenarioId).filter(isLive);
  const chosen = live.filter((o) => o.status === 'chosen');
  const rest = live.filter((o) => o.status !== 'chosen');
  return [...chosen, ...rest].slice(0, 3);
}

/** Estimated cost for a category: the chosen option, else the #1 ranked live option. */
export const WEEKDAYS: Array<{ id: Weekday; short: string; long: string }> = [
  { id: 'mon', short: 'Mon', long: 'Monday' }, { id: 'tue', short: 'Tue', long: 'Tuesday' }, { id: 'wed', short: 'Wed', long: 'Wednesday' },
  { id: 'thu', short: 'Thu', long: 'Thursday' }, { id: 'fri', short: 'Fri', long: 'Friday' }, { id: 'sat', short: 'Sat', long: 'Saturday' }, { id: 'sun', short: 'Sun', long: 'Sunday' },
];
const ORDER = WEEKDAYS.map((d) => d.id);

export function weekdayOf(iso: string): Weekday {
  const d = new Date(iso + 'T12:00:00').getDay(); // 0 = Sunday
  return ORDER[(d + 6) % 7];
}

/** "Mon–Thu", "Fri", "Sat–Sun", "Mon, Wed, Sat": a readable label for a set of days. */
export function dayLabel(days: Weekday[]): string {
  const idx = ORDER.map((d, i) => (days.includes(d) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return 'Any day';
  if (idx.length === 7) return 'Every day';
  const runs: number[][] = [];
  for (const i of idx) { const last = runs[runs.length - 1]; if (last && i === last[last.length - 1] + 1) last.push(i); else runs.push([i]); }
  return runs.map((r) => (r.length === 1 ? WEEKDAYS[r[0]].short : r.length === 2 ? `${WEEKDAYS[r[0]].short}, ${WEEKDAYS[r[1]].short}` : `${WEEKDAYS[r[0]].short}–${WEEKDAYS[r[r.length - 1]].short}`)).join(', ');
}

/** The price tier that covers a given date's weekday (first match). */
export function tierForDate(o: Pick<Option, 'tiers'>, iso: string): PriceTier | undefined {
  const day = weekdayOf(iso);
  return o.tiers.find((t) => t.days.includes(day));
}

/** What this option costs: under a plan it follows that plan's weekday, otherwise the headline cost. */
export function costFor(o: Option, scenario?: Scenario): number {
  if (scenario && o.tiers.length) return tierForDate(o, scenario.date)?.cost ?? o.cost;
  return o.cost;
}

/** The tier to highlight: the plan's weekday tier, or the headline tier. */
export function activeTier(o: Option, scenario?: Scenario): PriceTier | undefined {
  if (scenario && o.tiers.length) return tierForDate(o, scenario.date);
  return o.tiers.find((t) => t.id === o.tierId);
}

export function estimateFor(state: AppState, categoryId: string, scenarioId: string = 'all') {
  const t = top3(state, categoryId, scenarioId);
  const pick = t[0];
  const scenario = scenarioId === 'all' ? undefined : state.scenarios.find((s) => s.id === scenarioId);
  return { cost: pick ? costFor(pick, scenario) : 0, option: pick, locked: pick?.status === 'chosen' };
}

export function totals(state: AppState, scenarioId: string = 'all') {
  let min = 0, target = 0, max = 0, estimate = 0, locked = 0;
  const visible = new Set(visibleCategories(state).map((c) => c.id));
  for (const line of state.budget) {
    if (!visible.has(line.categoryId)) continue;
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

/** Is this option in a different country than home? (Unknown country counts as not abroad.) */
export const isAbroad = (o: Pick<Option, 'country'>, homeCountry: string) =>
  !!o.country.trim() && o.country.trim().toLowerCase() !== homeCountry.trim().toLowerCase();

export function guestCounts(state: AppState) {
  const by = (side: 'yabi' | 'johnny') => {
    const g = state.guests.filter((x) => x.side === side);
    return { yes: g.filter((x) => x.status === 'yes').length, maybe: g.filter((x) => x.status === 'maybe').length };
  };
  const yabi = by('yabi'), johnny = by('johnny');
  return { yabi, johnny, yes: yabi.yes + johnny.yes, maybe: yabi.maybe + johnny.maybe };
}

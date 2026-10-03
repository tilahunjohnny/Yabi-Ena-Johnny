import { AppState, BudgetLine } from './types';
import { visibleCategories } from './logic';

export const STEP = 100;
const round = (n: number, step = STEP) => Math.round(n / step) * step;

/** Budget lines for the categories that are shown, in category order. */
export function visibleLines(state: AppState): BudgetLine[] {
  return visibleCategories(state)
    .map((c) => state.budget.find((b) => b.categoryId === c.id))
    .filter((b): b is BudgetLine => !!b);
}

/** Keep the min–max range the same relative width around a moved target. */
function withTarget(line: BudgetLine, target: number): BudgetLine {
  const minRatio = line.target > 0 ? line.min / line.target : 0.7;
  const maxRatio = line.target > 0 ? line.max / line.target : 1.35;
  return { ...line, target, min: round(target * minRatio), max: round(target * maxRatio) };
}

/** Share `amount` between lines in proportion to their current targets (equally if they are all 0). Sums exactly to `amount`. */
function distribute(lines: BudgetLine[], amount: number): number[] {
  const n = lines.length;
  if (!n) return [];
  const sum = lines.reduce((a, l) => a + l.target, 0);
  const raw = lines.map((l) => (sum > 0 ? (amount * l.target) / sum : amount / n));
  const out = raw.map((v) => Math.max(0, round(v)));
  // put any rounding difference on the largest line so the total is exact
  const diff = amount - out.reduce((a, v) => a + v, 0);
  const big = out.indexOf(Math.max(...out));
  out[big] = Math.max(0, out[big] + diff);
  return out;
}

/**
 * Move one category's slider. With `balance` on, every other unlocked category shrinks or grows in
 * proportion so the visible targets keep adding up to the total. Locked categories never move.
 */
export function moveSlider(state: AppState, categoryId: string, requested: number, balance: boolean): BudgetLine[] {
  const total = state.settings.totalBudget;
  const lines = visibleLines(state);
  const me = lines.find((l) => l.categoryId === categoryId);
  if (!me) return state.budget;
  const others = lines.filter((l) => l.categoryId !== categoryId);
  const free = others.filter((l) => !l.locked);
  const lockedSum = others.filter((l) => l.locked).reduce((a, l) => a + l.target, 0);

  const updated = new Map<string, BudgetLine>();
  if (!balance || free.length === 0) {
    const cap = balance ? Math.max(0, total - lockedSum) : Infinity; // with everything else locked, can't grow past the total
    updated.set(categoryId, withTarget(me, Math.min(Math.max(0, round(requested)), cap)));
  } else {
    const target = Math.min(Math.max(0, round(requested)), Math.max(0, total - lockedSum));
    updated.set(categoryId, withTarget(me, target));
    const shares = distribute(free, Math.max(0, total - lockedSum - target));
    free.forEach((l, i) => updated.set(l.categoryId, withTarget(l, shares[i])));
  }
  return state.budget.map((b) => updated.get(b.categoryId) ?? b);
}

/** Change the overall total. With `balance` on, the unlocked categories scale to fill it (locked ones keep their amount). */
export function changeTotal(state: AppState, newTotal: number, balance: boolean): { total: number; budget: BudgetLine[] } {
  const total = Math.max(0, Math.round(newTotal));
  if (!balance) return { total, budget: state.budget };
  const next: AppState = { ...state, settings: { ...state.settings, totalBudget: total } };
  return { total, budget: balanceToTotal(next) };
}

/** Make the visible targets add up exactly to the total (locked lines stay put). */
export function balanceToTotal(state: AppState): BudgetLine[] {
  const total = state.settings.totalBudget;
  const lines = visibleLines(state);
  const free = lines.filter((l) => !l.locked);
  const lockedSum = lines.filter((l) => l.locked).reduce((a, l) => a + l.target, 0);
  if (!free.length) return state.budget;
  const shares = distribute(free, Math.max(0, total - lockedSum));
  const updated = new Map(free.map((l, i) => [l.categoryId, withTarget(l, shares[i])]));
  return state.budget.map((b) => updated.get(b.categoryId) ?? b);
}

export const sumTargets = (state: AppState) => visibleLines(state).reduce((a, l) => a + l.target, 0);

/**
 * Cost per guest. Only the things that scale with headcount count: the venue and food & drink.
 * `budgeted` uses what you allocated on the sliders; `picks` uses what your leading options cost.
 */
export function perGuest(state: AppState, picks: (categoryId: string) => number) {
  const ids = ['venue', 'catering'];
  const guests = state.settings.guestCount;
  const budgeted = ids.reduce((a, id) => a + (state.budget.find((b) => b.categoryId === id)?.target ?? 0), 0);
  const fromPicks = ids.reduce((a, id) => a + picks(id), 0);
  return {
    guests,
    budgeted: guests > 0 ? budgeted / guests : 0,
    fromPicks: guests > 0 ? fromPicks / guests : 0,
    budgetedTotal: budgeted,
    picksTotal: fromPicks,
  };
}

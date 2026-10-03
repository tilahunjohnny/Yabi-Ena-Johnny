import { Jeweler, RingBrief } from './types';

const DAY = 86_400_000;
const parse = (iso: string) => new Date(iso + 'T12:00:00');
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, days: number) => new Date(parse(iso).getTime() + days * DAY).toISOString().slice(0, 10);
export const daysBetween = (fromIso: string, toIso: string) => Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / DAY);

/** The jeweler's current price: the most recent quote (0 when none). */
export const latestQuote = (j: Jeweler) => j.quotes[j.quotes.length - 1]?.amount ?? 0;
export const firstQuote = (j: Jeweler) => j.quotes[0]?.amount ?? 0;

export interface ReadyEstimate {
  /** ISO date the ring should be done, or '' when the lead time is not known. */
  date: string;
  /** true = the order is placed (a firm date); false = if ordered today. */
  firm: boolean;
  /** Days past the needed-by date (positive = too late), or null when there is no needed-by date. */
  lateBy: number | null;
}

/** When the ring will be done: order date + the jeweler's turnaround, or "if ordered today" until it is ordered. */
export function readyEstimate(j: Jeweler, needBy: string, today = todayIso()): ReadyEstimate {
  if (!j.leadWeeks || j.status === 'passed') return { date: '', firm: false, lateBy: null };
  if (j.status === 'ready') return { date: j.orderedOn ? addDays(j.orderedOn, j.leadWeeks * 7) : today, firm: true, lateBy: null };
  const firm = (j.status === 'ordered' || !!j.orderedOn) && !!j.orderedOn;
  const date = addDays(firm ? j.orderedOn : today, j.leadWeeks * 7);
  return { date, firm, lateBy: needBy ? daysBetween(needBy, date) : null };
}

/** The latest day an order can be placed to still have the ring by the needed-by date. */
export const orderBy = (j: Jeweler, needBy: string) => (needBy && j.leadWeeks ? addDays(needBy, -j.leadWeeks * 7) : '');

export interface CompareRow { j: Jeweler; price: number; change: number; ready: ReadyEstimate; vsBudget: number | null }

/** One row per jeweler still in play, with the cheapest and the soonest flagged. */
export function compareJewelers(jewelers: Jeweler[], brief: RingBrief, today = todayIso()) {
  const rows: CompareRow[] = jewelers
    .filter((j) => j.status !== 'passed')
    .map((j) => {
      const price = latestQuote(j);
      return { j, price, change: j.quotes.length > 1 ? price - firstQuote(j) : 0, ready: readyEstimate(j, brief.needBy, today), vsBudget: brief.budget && price ? price - brief.budget : null };
    });
  const priced = rows.filter((r) => r.price > 0);
  const timed = rows.filter((r) => r.ready.date);
  return {
    rows,
    cheapest: priced.length ? priced.reduce((a, b) => (b.price < a.price ? b : a)).j.id : '',
    soonest: timed.length ? timed.reduce((a, b) => (b.ready.date < a.ready.date ? b : a)).j.id : '',
  };
}

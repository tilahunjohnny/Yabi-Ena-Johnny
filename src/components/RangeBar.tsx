import { BudgetLine } from '../../shared/types';
import { money } from '../../shared/logic';

/** Visual min–max band with a target tick and an estimate marker. */
export function RangeBar({ line, estimate, currency, scaleMax }: { line: BudgetLine; estimate: number; currency: string; scaleMax?: number }) {
  const max = Math.max(scaleMax ?? 0, line.max * 1.15, estimate * 1.05, 1);
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%`;
  const over = estimate > line.max;
  return (
    <div className="range" title={`Range ${money(line.min, currency)} – ${money(line.max, currency)} · target ${money(line.target, currency)} · estimate ${money(estimate, currency)}`}>
      <div className="track" />
      <div className="band" style={{ left: pct(line.min), width: `calc(${pct(line.max)} - ${pct(line.min)})` }} />
      <div className="tick" style={{ left: pct(line.target) }} />
      {estimate > 0 && <div className={`est ${over ? 'over' : ''}`} style={{ left: pct(estimate) }} />}
    </div>
  );
}

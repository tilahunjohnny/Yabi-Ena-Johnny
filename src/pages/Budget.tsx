import { Link } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { estimateFor, money, totals, visibleCategories } from '../../shared/logic';
import { BudgetLine } from '../../shared/types';
import { useStore } from '../store';
import { CatIcon, NumInput, PageHead, tint } from '../components/ui';
import { RangeBar } from '../components/RangeBar';

export default function Budget() {
  const { state, update, scenarioId, toast } = useStore();
  const cur = state.settings.currency;
  const t = totals(state, scenarioId);
  const total = state.settings.totalBudget;
  const sc = state.scenarios.find((s) => s.id === scenarioId);
  const scale = Math.max(...state.budget.filter((b) => visibleCategories(state).some((c) => c.id === b.categoryId)).map((b) => b.max), 1);

  const setLine = (categoryId: string, patch: Partial<BudgetLine>) =>
    update((s) => ({
      ...s,
      budget: s.budget.map((b) => {
        if (b.categoryId !== categoryId) return b;
        const n = { ...b, ...patch };
        // keep min <= target <= max
        if (patch.target !== undefined) { n.min = Math.min(n.min, n.target); n.max = Math.max(n.max, n.target); }
        if (patch.min !== undefined) n.target = Math.max(n.target, n.min);
        if (patch.max !== undefined) n.target = Math.min(n.target, n.max);
        n.max = Math.max(n.max, n.min);
        return n;
      }),
    }));

  const autoFromOptions = () => {
    update((s) => ({
      ...s,
      budget: s.budget.map((b) => {
        const e = estimateFor(s, b.categoryId, scenarioId);
        return e.cost > 0 ? { ...b, target: e.cost, min: Math.min(b.min, e.cost), max: Math.max(b.max, Math.round(e.cost * 1.15)) } : b;
      }),
    }));
    toast('Targets updated from your top picks');
  };

  const over = t.estimate > total;
  const targetOver = t.target > total;

  return (
    <div className="page">
      <PageHead
        eyebrow={sc ? `Timeline: ${sc.name}` : 'All timelines'}
        title="Budget"
        subtitle="Set a flexible range for every major item. The gold band is your acceptable min–max, the tick is your target, and the dot is what your current top pick actually costs."
        actions={<button className="btn" onClick={autoFromOptions}><Wand2 size={16} /> Set targets from top picks</button>}
      />

      <div className="grid g4" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="tiny muted">Overall budget</div>
          <NumInput className="num" value={total} onChange={(n) => update((s) => ({ ...s, settings: { ...s.settings, totalBudget: n } }))} prefix="$" />
          <div className="tiny muted" style={{ marginTop: 8 }}>for {state.settings.guestCount} guests · {money(total / Math.max(1, state.settings.guestCount), cur)}/guest</div>
        </div>
        <div className="card"><div className="tiny muted">Planned targets</div><div className="stat" style={{ color: targetOver ? 'var(--bad)' : undefined }}>{money(t.target, cur)}</div><div className="tiny muted">range {money(t.min, cur)} – {money(t.max, cur)}</div></div>
        <div className="card"><div className="tiny muted">Estimate from picks</div><div className="stat" style={{ color: over ? 'var(--bad)' : undefined }}>{money(t.estimate, cur)}</div><div className="tiny muted">{money(t.locked, cur)} locked in</div></div>
        <div className="card">
          <div className="tiny muted">{over ? 'Over budget by' : 'Remaining'}</div>
          <div className="stat" style={{ color: over ? 'var(--bad)' : 'var(--good)' }}>{money(Math.abs(total - t.estimate), cur)}</div>
          <div className="progress" style={{ marginTop: 10 }}><i style={{ width: `${Math.min(100, (t.estimate / Math.max(1, total)) * 100)}%` }} /></div>
        </div>
      </div>

      <div className="card">
        {state.budget.filter((b) => visibleCategories(state).some((c) => c.id === b.categoryId)).map((b, i) => {
          const cat = state.categories.find((c) => c.id === b.categoryId);
          if (!cat) return null;
          const e = estimateFor(state, cat.id, scenarioId);
          return (
            <div key={b.categoryId} style={{ padding: '16px 0', borderTop: i ? '1px solid var(--border)' : undefined }}>
              <div className="row between wrap" style={{ gap: 14 }}>
                <Link to={`/c/${cat.id}`} className="row" style={{ gap: 10, color: 'inherit', minWidth: 220 }}>
                  <span style={{ color: tint(cat.color) }}><CatIcon name={cat.icon} /></span>
                  <div><strong>{cat.name}</strong><div className="tiny muted">{e.option ? `${e.locked ? '✓ ' : ''}${e.option.name} · ${money(e.cost, cur)}` : 'no pick yet'}</div></div>
                </Link>
                <div className="row wrap" style={{ gap: 14 }}>
                  <label className="tiny muted">Min <NumInput className="num" value={b.min} onChange={(n) => setLine(b.categoryId, { min: n })} /></label>
                  <label className="tiny muted">Target <NumInput className="num" value={b.target} onChange={(n) => setLine(b.categoryId, { target: n })} /></label>
                  <label className="tiny muted">Max <NumInput className="num" value={b.max} onChange={(n) => setLine(b.categoryId, { max: n })} /></label>
                </div>
              </div>
              <RangeBar line={b} estimate={e.cost} currency={cur} scaleMax={scale} />
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ marginTop: 12 }}>
        Tip: pick a timeline at the top to see how the estimate changes if you go earlier or later — options can be tied to specific timelines.
      </div>
    </div>
  );
}

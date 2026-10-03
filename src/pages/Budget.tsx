import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Scale, Unlock, Wand2 } from 'lucide-react';
import { estimateFor, money, totals } from '../../shared/logic';
import { balanceToTotal, changeTotal, moveSlider, perGuest, STEP, sumTargets, visibleLines } from '../../shared/budget';
import { BudgetLine } from '../../shared/types';
import { useStore } from '../store';
import { CatIcon, NumInput, PageHead, Seg, tint } from '../components/ui';

const THUMB = 22; // px, keeps markers lined up with the slider thumb

const markerLeft = (pct: number) => `calc(${pct}% + ${(0.5 - pct / 100) * THUMB}px)`;

export default function Budget() {
  const { state, update, scenarioId, toast } = useStore();
  const [balance, setBalance] = useState(() => { try { return localStorage.getItem('yej:balance') !== 'off'; } catch { return true; } });
  const cur = state.settings.currency;
  const total = state.settings.totalBudget;
  const t = totals(state, scenarioId);
  const sc = state.scenarios.find((s) => s.id === scenarioId);
  const lines = visibleLines(state);
  const pg = perGuest(state, (id) => estimateFor(state, id, scenarioId).cost);
  const sum = sumTargets(state);
  const diff = total - sum; // >0 unallocated, <0 over

  const setBalanceMode = (on: boolean) => { setBalance(on); try { localStorage.setItem('yej:balance', on ? 'on' : 'off'); } catch { /* ignore */ } };
  const slide = (id: string, v: number) => update((s) => ({ ...s, budget: moveSlider(s, id, v, balance) }));
  const setTotal = (n: number) => update((s) => { const r = changeTotal(s, n, balance); return { ...s, settings: { ...s.settings, totalBudget: r.total }, budget: r.budget }; });
  const patchLine = (id: string, p: Partial<BudgetLine>) => update((s) => ({ ...s, budget: s.budget.map((b) => (b.categoryId === id ? { ...b, ...p } : b)) }));

  const autoFromOptions = () => {
    update((s) => ({
      ...s,
      budget: s.budget.map((b) => {
        const e = estimateFor(s, b.categoryId, scenarioId);
        return e.cost > 0 ? { ...b, target: e.cost, min: Math.min(b.min, e.cost), max: Math.max(b.max, Math.round(e.cost * 1.15)) } : b;
      }),
    }));
    toast('Targets set from your top picks');
  };

  const sliderMax = Math.max(total, 1);
  const over = t.estimate > total;

  return (
    <div className="page">
      <PageHead
        eyebrow={sc ? `Timeline: ${sc.name}` : 'All timelines'}
        title="Budget"
        subtitle="Drag any slider to decide how much each part gets. With balancing on, the other categories shrink or grow to keep everything adding up to your total. Lock a category to hold it in place."
        actions={<button className="btn" onClick={autoFromOptions}><Wand2 size={16} /> Set from top picks</button>}
      />

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row between wrap" style={{ gap: 14 }}>
          <div>
            <div className="tiny muted">Total budget</div>
            <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
              <span className="stat">{money(total, cur)}</span>
              <span className="small muted" title="Only the venue and food & drink are counted, because those are the costs that grow with the guest list.">
                <strong style={{ color: 'var(--text)' }}>{pg.guests > 0 ? money(pg.budgeted, cur) : '—'}</strong> per guest for venue + food &amp; drink ({pg.guests} guests)
                {pg.picksTotal > 0 && pg.guests > 0 && <> · your picks: <strong style={{ color: pg.fromPicks > pg.budgeted ? 'var(--bad)' : 'var(--text)' }}>{money(pg.fromPicks, cur)}</strong></>}
              </span>
            </div>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <Seg value={balance ? 'on' : 'off'} onChange={(v) => setBalanceMode(v === 'on')} options={[{ value: 'on', label: 'Balance others' }, { value: 'off', label: 'Independent' }]} />
            <NumInput className="num" value={total} onChange={setTotal} prefix={cur === 'USD' ? '$' : ''} />
          </div>
        </div>
        <input className="slider" type="range" aria-label="Total budget" min={0} max={Math.max(300000, total * 2)} step={1000} value={total}
          style={{ ['--pct' as any]: `${(total / Math.max(300000, total * 2)) * 100}%`, marginTop: 14 }} onChange={(e) => setTotal(Number(e.target.value))} />

        <div className="alloc" role="img" aria-label="How the budget is split" style={{ marginTop: 16 }}>
          {lines.map((l) => {
            const cat = state.categories.find((c) => c.id === l.categoryId)!;
            return <i key={l.categoryId} title={`${cat.name}: ${money(l.target, cur)}`} style={{ width: `${(l.target / Math.max(total, sum, 1)) * 100}%`, background: tint(cat.color) }} />;
          })}
          {diff > 0 && <i className="free" title={`Unallocated: ${money(diff, cur)}`} style={{ width: `${(diff / Math.max(total, 1)) * 100}%` }} />}
        </div>
        <div className="row between wrap" style={{ marginTop: 8, gap: 8 }}>
          <div className="row wrap tiny muted" style={{ gap: 12 }}>
            {lines.map((l) => { const cat = state.categories.find((c) => c.id === l.categoryId)!; return <span key={l.categoryId} className="row" style={{ gap: 5 }}><i className="dot" style={{ background: tint(cat.color) }} />{cat.name.replace(/ &.*$/, '')} {Math.round((l.target / Math.max(1, total)) * 100)}%</span>; })}
          </div>
          {diff !== 0 ? (
            <div className="row" style={{ gap: 8 }}>
              <span className="small" style={{ color: diff < 0 ? 'var(--bad)' : 'var(--warn)' }}>{diff > 0 ? `${money(diff, cur)} unallocated` : `${money(-diff, cur)} over the total`}</span>
              <button className="btn sm" onClick={() => update((s) => ({ ...s, budget: balanceToTotal(s) }))}><Scale size={13} /> Balance to total</button>
            </div>
          ) : <span className="small" style={{ color: 'var(--good)' }}>Adds up to the total ✓</span>}
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card"><div className="tiny muted">Planned targets</div><div className="stat">{money(t.target, cur)}</div><div className="tiny muted">across {lines.length} categories</div></div>
        <div className="card"><div className="tiny muted">Estimate from picks</div><div className="stat" style={{ color: over ? 'var(--bad)' : undefined }}>{money(t.estimate, cur)}</div><div className="tiny muted">{money(t.locked, cur)} locked in</div></div>
        <div className="card">
          <div className="tiny muted">{over ? 'Picks are over budget by' : 'Left after picks'}</div>
          <div className="stat" style={{ color: over ? 'var(--bad)' : undefined }}>{money(Math.abs(total - t.estimate), cur)}</div>
          <div className="progress" style={{ marginTop: 10 }}><i style={{ width: `${Math.min(100, (t.estimate / Math.max(1, total)) * 100)}%` }} /></div>
        </div>
      </div>

      <div className="card">
        {lines.map((b, i) => {
          const cat = state.categories.find((c) => c.id === b.categoryId);
          if (!cat) return null;
          const e = estimateFor(state, cat.id, scenarioId);
          const share = (b.target / Math.max(1, total)) * 100;
          const estPct = Math.min(100, (e.cost / sliderMax) * 100);
          const barPct = (b.target / sliderMax) * 100;
          return (
            <div key={b.categoryId} style={{ padding: '18px 0', borderTop: i ? '1px solid var(--border)' : undefined }}>
              <div className="row between wrap" style={{ gap: 10 }}>
                <Link to={`/c/${cat.id}`} className="row" style={{ gap: 10, color: 'inherit', minWidth: 220 }}>
                  <span style={{ color: tint(cat.color) }}><CatIcon name={cat.icon} /></span>
                  <div><strong>{cat.name}</strong><div className="tiny muted">{e.option ? `${e.locked ? '✓ ' : ''}${e.option.name} · ${money(e.cost, cur)}` : 'no pick yet'}</div></div>
                </Link>
                <div className="row" style={{ gap: 10 }}>
                  <span className="serif" style={{ fontSize: '1.5rem' }}>{money(b.target, cur)}</span>
                  <span className="pill">{share.toFixed(share < 10 && share > 0 ? 1 : 0)}%</span>
                  <button className={`btn sm icon ${b.locked ? '' : 'ghost'}`} aria-pressed={!!b.locked} title={b.locked ? 'Locked: other sliders won’t change this' : 'Lock this amount'} aria-label={`${b.locked ? 'Unlock' : 'Lock'} ${cat.name}`} onClick={() => patchLine(b.categoryId, { locked: !b.locked })} style={b.locked ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : undefined}>{b.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                </div>
              </div>

              <div className="slide-wrap">
                <input className="slider" type="range" aria-label={`${cat.name} budget`} min={0} max={sliderMax} step={STEP} value={Math.min(b.target, sliderMax)} disabled={!!b.locked}
                  style={{ ['--pct' as any]: `${barPct}%`, ['--c' as any]: tint(cat.color) }} onChange={(ev) => slide(b.categoryId, Number(ev.target.value))} />
                {e.cost > 0 && <div className={`pick ${e.cost > b.target ? 'over' : ''}`} style={{ left: markerLeft(estPct) }} title={`Your pick: ${money(e.cost, cur)}${e.cost > b.target ? ' (more than this budget)' : ''}`} />}
              </div>

              <div className="row between wrap" style={{ gap: 10, marginTop: 4 }}>
                <span className="tiny muted">{e.cost > 0 ? `The dot is what your pick costs (${money(e.cost, cur)}).` : 'No pick yet for this category.'}</span>
                <label className="tiny muted row" style={{ gap: 6 }}>Exact <NumInput className="num" value={b.target} onChange={(n) => slide(b.categoryId, n)} /></label>
              </div>
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ marginTop: 12 }}>
        {balance ? 'Balancing is on: moving one slider takes from, or gives to, the other unlocked categories in proportion.' : 'Balancing is off: each slider moves on its own, so the split can drift from the total.'} Pick a timeline at the top to see how your picks compare under each plan.
      </div>
    </div>
  );
}

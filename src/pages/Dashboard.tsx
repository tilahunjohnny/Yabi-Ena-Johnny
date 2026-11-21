import { Link } from 'react-router-dom';
import { guestCounts, money, monthsBetween, today, totals } from '../../shared/logic';
import { useStore } from '../store';
import { fmtDate, tint } from '../components/ui';

export default function Dashboard() {
  const { state, scenarioId, setScenarioId } = useStore();
  const cur = state.settings.currency;
  const g = guestCounts(state);
  const live = state.places.filter((p) => p.status !== 'rejected');
  const ceremony = live.filter((p) => p.kind === 'ceremony').length;
  const reception = live.filter((p) => p.kind === 'reception').length;
  const both = live.filter((p) => p.kind === 'both').length;
  const t = totals(state, scenarioId);
  const budgetPct = Math.min(100, (t.estimate / Math.max(1, state.settings.totalBudget)) * 100);

  return (
    <div className="page">
      <div className="hero" style={{ marginBottom: 26 }}>
        <div className="eyebrow">Our wedding, together</div>
        <h1 style={{ margin: '8px 0 6px', fontSize: '3rem' }}>{state.settings.coupleNames}</h1>
      </div>

      <div className="grid g3" style={{ marginBottom: 22 }}>
        {state.scenarios.map((s) => {
          const months = monthsBetween(today(), s.date);
          const days = Math.max(0, Math.round(months * 30.4375));
          const est = totals(state, s.id).estimate;
          const done = s.milestones.filter((m) => m.done).length;
          const active = scenarioId === s.id;
          return (
            <div key={s.id} className="card plan" style={{ borderTop: `4px solid ${tint(s.color)}`, outline: active ? `2px solid ${tint(s.color)}` : undefined }}>
              <div className="row between">
                <h3 style={{ color: tint(s.color) }}>{s.name}</h3>
                {active ? <span className="pill shortlist">Viewing</span> : <button className="btn sm" onClick={() => setScenarioId(s.id)}>View plan</button>}
              </div>
              <div className="count" style={{ fontFamily: 'var(--serif)', fontSize: '3rem', fontWeight: 600, lineHeight: 1.05, margin: '8px 0 2px' }}>{days}<span className="small muted" style={{ fontFamily: 'var(--sans)', marginLeft: 8, fontSize: '.85rem' }}>days to go</span></div>
              <div className="small muted">{fmtDate(s.date)} · {months.toFixed(1)} months</div>
              <div className="sep" />
              <div className="row between tiny muted" style={{ marginTop: 12 }}><span>Est. {money(est, cur)}</span><span>{done}/{s.milestones.length} milestones</span></div>
            </div>
          );
        })}
      </div>

      <div className="grid g3">
        <Link to="/budget" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="tiny muted">Estimated spend</div>
          <div className="stat">{money(t.estimate, cur)}</div>
          <div className="progress" style={{ margin: '10px 0 6px' }}><i style={{ width: `${budgetPct}%`, background: t.estimate > state.settings.totalBudget ? 'var(--bad)' : undefined }} /></div>
          <div className="tiny muted">of {money(state.settings.totalBudget, cur)} budget</div>
        </Link>
        <Link to="/guests" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="tiny muted">Guest list</div>
          <div className="stat">{g.yes}<span className="muted small"> + {g.maybe} maybe</span></div>
          <div className="tiny muted" style={{ marginTop: 10 }}>Yabi {g.yabi.yes + g.yabi.maybe} · Johnny {g.johnny.yes + g.johnny.maybe}</div>
        </Link>
        <Link to="/places" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="tiny muted">Locations</div>
          <div className="stat">{state.places.filter((p) => p.status !== 'rejected').length}</div>
          <div className="tiny muted" style={{ marginTop: 10 }}>{ceremony} ceremony · {reception} reception{both ? ` · ${both} both` : ''}</div>
        </Link>
      </div>
    </div>
  );
}

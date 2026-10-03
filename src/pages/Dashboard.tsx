import { Link } from 'react-router-dom';
import { ArrowRight, Gem, MessageSquare, Sparkles } from 'lucide-react';
import { money, monthsBetween, today, top3, totals } from '../../shared/logic';
import { useStore } from '../store';
import { CatIcon, fmtDate, PageHead, Stars } from '../components/ui';

export default function Dashboard() {
  const { state, scenarioId, ringUnlocked } = useStore();
  const cur = state.settings.currency;
  const t = totals(state, scenarioId);
  const scenarios = scenarioId === 'all' ? state.scenarios : state.scenarios.filter((s) => s.id === scenarioId);
  const decided = state.categories.filter((c) => top3(state, c.id, scenarioId)[0]?.status === 'chosen').length;
  const withOptions = state.categories.filter((c) => top3(state, c.id, scenarioId).length > 0).length;
  const open = state.notes.filter((n) => !n.resolved);
  const checkDone = state.checklist.filter((c) => c.done).length;
  const budgetPct = Math.min(100, (t.estimate / Math.max(1, state.settings.totalBudget)) * 100);

  return (
    <div className="page">
      <div className="hero" style={{ marginBottom: 24 }}>
        <div className="eyebrow">Welcome back</div>
        <h1 style={{ margin: '8px 0 20px', fontSize: '2.8rem' }}>{state.settings.coupleNames}</h1>
        <div className="grid g3">
          {scenarios.slice(0, 3).map((s) => {
            const months = monthsBetween(today(), s.date);
            const days = Math.round(months * 30.4375);
            return (
              <div key={s.id}>
                <div className="tiny muted" style={{ color: s.color }}>● {s.name}</div>
                <div className="count">{days > 0 ? days : 0}<span className="small muted" style={{ fontFamily: 'var(--sans)', marginLeft: 8 }}>days</span></div>
                <div className="small muted">{fmtDate(s.date)} · {months.toFixed(1)} months</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="tiny muted">Estimated spend</div>
          <div className="stat">{money(t.estimate, cur)}</div>
          <div className="progress" style={{ margin: '10px 0 6px' }}><i style={{ width: `${budgetPct}%`, background: t.estimate > state.settings.totalBudget ? 'var(--bad)' : undefined }} /></div>
          <div className="tiny muted">of {money(state.settings.totalBudget, cur)} budget</div>
        </div>
        <div className="card"><div className="tiny muted">Categories decided</div><div className="stat">{decided}<span className="muted small"> / {state.categories.length}</span></div><div className="tiny muted" style={{ marginTop: 10 }}>{withOptions} have contenders</div></div>
        <div className="card"><div className="tiny muted">Open discussions</div><div className="stat">{open.length}</div><Link to="/discussions" className="tiny" style={{ display: 'inline-block', marginTop: 10 }}>Review log →</Link></div>
        <div className="card"><div className="tiny muted">Checklist</div><div className="stat">{checkDone}<span className="muted small"> / {state.checklist.length}</span></div><div className="progress" style={{ margin: '10px 0 0' }}><i style={{ width: `${(checkDone / Math.max(1, state.checklist.length)) * 100}%` }} /></div></div>
      </div>

      <div className="row between" style={{ marginBottom: 12 }}>
        <h2>Our leading choices</h2>
        <Link to="/budget" className="small row" style={{ gap: 4 }}>Budget view <ArrowRight size={14} /></Link>
      </div>
      <div className="grid auto" style={{ marginBottom: 28 }}>
        {state.categories.map((c) => {
          const lead = top3(state, c.id, scenarioId)[0];
          return (
            <Link key={c.id} to={`/c/${c.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
              <div className="row between"><span style={{ color: c.color }}><CatIcon name={c.icon} /></span><span className="tiny muted">{lead ? (lead.status === 'chosen' ? '✓ chosen' : 'leading') : 'empty'}</span></div>
              <div className="small muted" style={{ marginTop: 8 }}>{c.name}</div>
              {lead ? (
                <>
                  <div className="serif" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{lead.name}</div>
                  <div className="row between" style={{ marginTop: 6 }}><span className="small">{money(lead.cost, cur)}</span><Stars value={lead.rating} size={12} /></div>
                </>
              ) : (
                <div className="small muted" style={{ marginTop: 4 }}>Nothing yet — add an option</div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="grid g3">
        <Link to="/assistant" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Sparkles size={20} color="var(--accent)" /><h3 style={{ margin: '10px 0 4px' }}>Ask Claude</h3>
          <div className="small muted">Paste a venue link and let the assistant add it, rank it, or rework your budget.</div>
        </Link>
        <Link to="/decisions" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <MessageSquare size={20} color="var(--accent)" /><h3 style={{ margin: '10px 0 4px' }}>Decision tree</h3>
          <div className="small muted">Map out “if this, then that” — {state.tree.nodes.length} ideas connected.</div>
        </Link>
        <Link to="/ring" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Gem size={20} color="var(--accent)" /><h3 style={{ margin: '10px 0 4px' }}>Ring & proposal</h3>
          <div className="small muted">{ringUnlocked ? `${state.rings.length} rings · ${state.proposals.length} proposal ideas tracked.` : '🔒 Private — password required.'}</div>
        </Link>
      </div>
    </div>
  );
}

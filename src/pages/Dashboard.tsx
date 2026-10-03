import { Link } from 'react-router-dom';
import { ArrowRight, Gem, MapPin, MessageSquare, Sparkles, Users } from 'lucide-react';
import { guestCounts, isAbroad, money, monthsBetween, today, top3, totals } from '../../shared/logic';
import { useStore } from '../store';
import { fmtDate, Stars } from '../components/ui';

export default function Dashboard() {
  const { state, scenarioId, setScenarioId, ringUnlocked } = useStore();
  const cur = state.settings.currency;
  const g = guestCounts(state);
  const open = state.notes.filter((n) => !n.resolved).length;
  const venues = state.options.filter((o) => o.categoryId === 'venue' && o.status !== 'rejected');
  const t = totals(state, scenarioId);
  const budgetPct = Math.min(100, (t.estimate / Math.max(1, state.settings.totalBudget)) * 100);

  return (
    <div className="page">
      <div className="hero" style={{ marginBottom: 26 }}>
        <div className="eyebrow">Our wedding, together</div>
        <h1 style={{ margin: '8px 0 6px', fontSize: '3rem' }}>{state.settings.coupleNames}</h1>
        <div className="muted">Three possible dates, one planner. Pick a plan to see everything through it.</div>
      </div>

      <div className="grid g3" style={{ marginBottom: 26 }}>
        {state.scenarios.map((s) => {
          const months = monthsBetween(today(), s.date);
          const days = Math.max(0, Math.round(months * 30.4375));
          const lead = top3(state, 'venue', s.id)[0];
          const est = totals(state, s.id).estimate;
          const done = s.milestones.filter((m) => m.done).length;
          const active = scenarioId === s.id;
          return (
            <div key={s.id} className="card plan" style={{ borderTop: `4px solid ${s.color}`, outline: active ? `2px solid ${s.color}` : undefined }}>
              <div className="row between">
                <h3 style={{ color: s.color }}>{s.name}</h3>
                {active ? <span className="pill shortlist">Viewing</span> : <button className="btn sm" onClick={() => setScenarioId(s.id)}>View plan</button>}
              </div>
              <div className="count" style={{ fontFamily: 'var(--serif)', fontSize: '3rem', fontWeight: 600, lineHeight: 1.05, margin: '8px 0 2px' }}>{days}<span className="small muted" style={{ fontFamily: 'var(--sans)', marginLeft: 8, fontSize: '.85rem' }}>days to go</span></div>
              <div className="small muted">{fmtDate(s.date)} · {months.toFixed(1)} months</div>
              <div className="sep" />
              <div className="tiny muted">Leading venue</div>
              {lead ? (
                <Link to="/c/venue" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div className="serif" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{lead.name}</div>
                  <div className="row between small" style={{ marginTop: 2 }}>
                    <span className="row" style={{ gap: 6 }}>{money(lead.cost, cur)}{lead.country && <span className="muted row" style={{ gap: 3 }}><MapPin size={12} />{isAbroad(lead, state.settings.homeCountry) ? `${lead.country} · abroad` : lead.country}</span>}</span>
                    <Stars value={lead.rating} size={12} />
                  </div>
                </Link>
              ) : <div className="small muted">None yet. <Link to="/c/venue">Add a venue →</Link></div>}
              <div className="row between tiny muted" style={{ marginTop: 12 }}><span>Est. {money(est, cur)}</span><span>{done}/{s.milestones.length} milestones</span></div>
            </div>
          );
        })}
      </div>

      <div className="grid g4" style={{ marginBottom: 26 }}>
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
        <Link to="/c/venue" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="tiny muted">Venues in the running</div>
          <div className="stat">{venues.length}</div>
          <div className="tiny muted" style={{ marginTop: 10 }}>{venues.filter((v) => isAbroad(v, state.settings.homeCountry)).length} abroad</div>
        </Link>
        <Link to="/discussions" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="tiny muted">Open discussions</div>
          <div className="stat">{open}</div>
          <div className="tiny muted" style={{ marginTop: 10 }}>Review the log →</div>
        </Link>
      </div>

      <div className="row between" style={{ marginBottom: 12 }}><h2>Jump to</h2></div>
      <div className="grid g3">
        <Link to="/assistant" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Sparkles size={20} color="var(--accent)" /><h3 style={{ margin: '10px 0 4px' }}>Ask Claude</h3>
          <div className="small muted">Paste a venue link and let the assistant add it, rank it, or update the guest list.</div>
        </Link>
        <Link to="/decisions" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <MessageSquare size={20} color="var(--accent)" /><h3 style={{ margin: '10px 0 4px' }}>Decision tree</h3>
          <div className="small muted">Map out “if this, then that”: {state.tree.nodes.length} ideas connected.</div>
        </Link>
        <Link to="/ring" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Gem size={20} color="var(--accent)" /><h3 style={{ margin: '10px 0 4px' }}>Ring & proposal</h3>
          <div className="small muted">{ringUnlocked ? `${state.rings.length} rings · ${state.proposals.length} proposal ideas tracked.` : '🔒 Private — password required.'}</div>
        </Link>
      </div>
      <div className="tiny muted" style={{ marginTop: 18 }}><Users size={12} style={{ verticalAlign: -2 }} /> <ArrowRight size={12} style={{ verticalAlign: -2 }} /> Plans are edited on the <Link to="/timeline">Timelines</Link> page.</div>
    </div>
  );
}

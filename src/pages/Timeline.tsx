import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { addMonths, SCENARIO_COLORS } from '../../shared/seed';
import { money, monthsBetween, today, top3, totals } from '../../shared/logic';
import { Scenario, uid } from '../../shared/types';
import { useStore } from '../store';
import { Field, fmtDate, PageHead } from '../components/ui';

interface Item { key: string; title: string; date: string; done?: boolean; categoryId: string; kind: 'milestone' | 'booking'; msId?: string; cost?: number }

export default function Timeline() {
  const { state, update, scenarioId, toast } = useStore();
  const [adding, setAdding] = useState('');
  const [addMonthsBefore, setAddMonthsBefore] = useState(3);
  const cur = state.settings.currency;
  const shown = scenarioId === 'all' ? state.scenarios : state.scenarios.filter((s) => s.id === scenarioId);

  const patch = (id: string, p: Partial<Scenario>) => update((s) => ({ ...s, scenarios: s.scenarios.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  const addScenario = (copyFrom?: Scenario) =>
    update((s) => {
      const base = copyFrom ?? s.scenarios[0];
      const sc: Scenario = {
        id: uid('sc'),
        name: copyFrom ? `${copyFrom.name} (copy)` : `Plan ${String.fromCharCode(65 + s.scenarios.length)}`,
        date: addMonths(base?.date ?? today(), 6),
        color: SCENARIO_COLORS[s.scenarios.length % SCENARIO_COLORS.length],
        notes: '',
        milestones: (base?.milestones ?? []).map((m) => ({ ...m, id: uid('ms'), done: false })),
      };
      return { ...s, scenarios: [...s.scenarios, sc] };
    });

  const items = (sc: Scenario): Item[] => {
    const ms: Item[] = sc.milestones.map((m) => ({ key: m.id, msId: m.id, title: m.title, date: addMonths(sc.date, -m.monthsBefore), done: m.done, categoryId: m.categoryId, kind: 'milestone' }));
    // "Book by" dates derived from the option lead times that apply to this scenario.
    const bookings: Item[] = state.categories.flatMap((c) =>
      top3(state, c.id, sc.id).filter((o) => o.leadTimeMonths > 0 && o.status !== 'idea').slice(0, 1).map((o) => ({
        key: `b_${o.id}`, title: `Book ${o.name}`, date: addMonths(sc.date, -o.leadTimeMonths), categoryId: c.id, kind: 'booking' as const, cost: o.cost,
      })),
    );
    return [...ms, ...bookings].sort((a, b) => a.date.localeCompare(b.date));
  };

  const catName = (id: string) => state.categories.find((c) => c.id === id)?.name ?? '';

  return (
    <div className="page">
      <PageHead
        eyebrow="Timelines"
        title="Timeline scenarios"
        subtitle="Different choices can mean a different date. Build an earlier and a later plan side by side — each gets its own milestones, “book by” dates and cost."
        actions={<button className="btn primary" onClick={() => addScenario()}><Plus size={16} /> New scenario</button>}
      />

      {state.scenarios.length > 1 && (
        <div className="card" style={{ marginBottom: 22, overflowX: 'auto' }}>
          <h3 style={{ marginBottom: 12 }}>At a glance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead><tr>{['Scenario', 'Date', 'From today', 'Est. cost', 'Planning left', 'Milestones'].map((h) => <th key={h} className="tiny muted" style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500 }}>{h}</th>)}</tr></thead>
            <tbody>
              {state.scenarios.map((s) => {
                const m = monthsBetween(today(), s.date);
                const done = s.milestones.filter((x) => x.done).length;
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px' }}><span style={{ color: s.color }}>●</span> <strong>{s.name}</strong></td>
                    <td style={{ padding: '10px' }}>{fmtDate(s.date)}</td>
                    <td style={{ padding: '10px' }}>{m.toFixed(1)} mo</td>
                    <td style={{ padding: '10px' }}>{money(totals(state, s.id).estimate, cur)}</td>
                    <td style={{ padding: '10px', color: m < 8 ? 'var(--warn)' : undefined }}>{m < 8 ? 'Tight' : m < 12 ? 'Comfortable' : 'Generous'}</td>
                    <td style={{ padding: '10px' }}>{done}/{s.milestones.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid g2">
        {shown.map((sc) => {
          const list = items(sc);
          const now = today();
          return (
            <div key={sc.id} className="card" style={{ borderTop: `3px solid ${sc.color}` }}>
              <div className="row between wrap" style={{ gap: 8 }}>
                <input value={sc.name} onChange={(e) => patch(sc.id, { name: e.target.value })} style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 600, background: 'transparent', border: '1px solid transparent', padding: '4px 8px', width: 'auto', flex: 1 }} aria-label="Scenario name" />
                <div className="row" style={{ gap: 2 }}>
                  <button className="btn sm icon ghost" title="Duplicate" onClick={() => addScenario(sc)}><Copy size={14} /></button>
                  <button className="btn sm icon ghost danger" title="Delete" disabled={state.scenarios.length < 2} onClick={() => confirm(`Delete "${sc.name}"?`) && update((s) => ({ ...s, scenarios: s.scenarios.filter((x) => x.id !== sc.id), options: s.options.map((o) => ({ ...o, scenarioIds: o.scenarioIds.filter((x) => x !== sc.id) })) }))}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid g2" style={{ margin: '12px 0' }}>
                <Field label="Wedding date"><input type="date" value={sc.date} onChange={(e) => e.target.value && patch(sc.id, { date: e.target.value })} /></Field>
                <Field label="Est. cost"><div className="price" style={{ marginTop: 2 }}>{money(totals(state, sc.id).estimate, cur)}</div></Field>
              </div>
              <Field label="Notes"><textarea value={sc.notes} onChange={(e) => patch(sc.id, { notes: e.target.value })} placeholder="Why this date? What does it unlock or cost us?" style={{ minHeight: 56 }} /></Field>
              <div className="sep" />
              <div className="tl" style={{ ['--c' as any]: sc.color }}>
                {list.map((it) => {
                  const late = it.date < now && !it.done;
                  return (
                    <div key={it.key} className={`tl-item ${it.done ? 'done' : ''} ${late ? 'late' : ''}`}>
                      <div className="row" style={{ gap: 10 }}>
                        {it.kind === 'milestone' ? (
                          <input type="checkbox" style={{ width: 16, height: 16, padding: 0, accentColor: sc.color }} checked={!!it.done} onChange={() => patch(sc.id, { milestones: sc.milestones.map((m) => (m.id === it.msId ? { ...m, done: !m.done } : m)) })} />
                        ) : <span className="pill shortlist">book by</span>}
                        <div className="grow">
                          <div style={{ textDecoration: it.done ? 'line-through' : undefined, color: it.done ? 'var(--muted)' : undefined }}>{it.title}</div>
                          <div className="tiny muted">{fmtDate(it.date)} · {catName(it.categoryId)}{late ? <span style={{ color: 'var(--bad)' }}> · overdue</span> : ''}{it.cost ? ` · ${money(it.cost, cur)}` : ''}</div>
                        </div>
                        {it.kind === 'milestone' && <button className="btn sm icon ghost" aria-label="Remove milestone" onClick={() => patch(sc.id, { milestones: sc.milestones.filter((m) => m.id !== it.msId) })}><Trash2 size={13} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form className="row" style={{ marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); if (!adding.trim()) return; patch(sc.id, { milestones: [...sc.milestones, { id: uid('ms'), title: adding.trim(), monthsBefore: addMonthsBefore, categoryId: 'planner', done: false }] }); setAdding(''); toast('Milestone added'); }}>
                <input placeholder="Add milestone…" value={adding} onChange={(e) => setAdding(e.target.value)} />
                <input type="number" min={0} step={0.5} value={addMonthsBefore} onChange={(e) => setAddMonthsBefore(Number(e.target.value) || 0)} style={{ width: 70 }} title="Months before the wedding" aria-label="Months before the wedding" />
                <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>mo before</span>
                <button className="btn" type="submit"><Plus size={15} /></button>
              </form>
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ marginTop: 14 }}>
        “Book by” dates come from each option’s <em>book how many months before</em> field on its <Link to="/c/venue">category page</Link>; options tied to a scenario only show up there.
      </div>
    </div>
  );
}

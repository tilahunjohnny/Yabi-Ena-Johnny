import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GitCompare, MessageSquare, Plus } from 'lucide-react';
import { isAbroad, optionsFor, top3, money } from '../../shared/logic';
import { Option, Status } from '../../shared/types';
import { useStore } from '../store';
import { CatIcon, Empty, PageHead, Seg } from '../components/ui';
import { CompareTable, OptionCard, OptionForm, blankOption } from '../components/options';
import { RangeBar } from '../components/RangeBar';

export default function CategoryPage() {
  const { id } = useParams();
  const { state, update, scenarioId } = useStore();
  const cat = state.categories.find((c) => c.id === id);
  const [editing, setEditing] = useState<{ option: Option; isNew: boolean } | null>(null);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [sort, setSort] = useState<'rank' | 'cost' | 'rating'>('rank');
  const [place, setPlace] = useState<string>('all'); // all | home | abroad | c:<Country>
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const all = useMemo(() => (cat ? optionsFor(state, cat.id, scenarioId) : []), [state, cat, scenarioId]);
  if (!cat) return <div className="page"><Empty title="Category not found">It may have been removed in Settings.</Empty></div>;

  const podium = top3(state, cat.id, scenarioId);
  const line = state.budget.find((b) => b.categoryId === cat.id);
  const rankOf = (o: Option) => state.options.filter((x) => x.categoryId === cat.id).findIndex((x) => x.id === o.id) + 1;
  const home = state.settings.homeCountry;
  const countries = Array.from(all.reduce((m, o) => (o.country.trim() ? m.set(o.country.trim(), (m.get(o.country.trim()) ?? 0) + 1) : m), new Map<string, number>()));
  const inPlace = (o: Option) => place === 'all' || (place === 'home' && !isAbroad(o, home)) || (place === 'abroad' && isAbroad(o, home)) || (place.startsWith('c:') && o.country.trim() === place.slice(2));
  let list = all.filter((o) => (filter === 'all' || o.status === filter) && inPlace(o));
  if (sort === 'cost') list = [...list].sort((a, b) => a.cost - b.cost);
  if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
  const chosen = selected.map((sid) => all.find((o) => o.id === sid)).filter(Boolean) as Option[];
  const toggle = (oid: string) => setSelected((s) => (s.includes(oid) ? s.filter((x) => x !== oid) : s.length >= 4 ? s : [...s, oid]));
  const notes = state.notes.filter((n) => n.categoryId === cat.id);
  const todo = state.checklist.filter((c) => c.categoryId === cat.id);
  const estimate = podium[0]?.cost ?? 0;

  return (
    <div className="page">
      <PageHead
        eyebrow={`${all.length} option${all.length === 1 ? '' : 's'}`}
        title={<span className="row" style={{ gap: 14 }}><span style={{ color: cat.color }}><CatIcon name={cat.icon} size={30} /></span>{cat.name}</span>}
        subtitle={cat.description}
        actions={
          <>
            <button className="btn" onClick={() => { setComparing((c) => !c); }} disabled={all.length < 2}><GitCompare size={16} /> {comparing ? 'Hide compare' : 'Compare'}</button>
            <button className="btn primary" onClick={() => setEditing({ option: blankOption(cat.id, scenarioId === 'all' ? [] : [scenarioId]), isNew: true })}><Plus size={16} /> Add option</button>
          </>
        }
      />

      {line && (
        <div className="card" style={{ marginBottom: 22 }}>
          <div className="row between wrap">
            <div><div className="eyebrow">Budget range</div><div className="small muted">Estimate uses your {podium[0]?.status === 'chosen' ? 'chosen' : '#1'} option</div></div>
            <div className="row" style={{ gap: 20 }}>
              <div><div className="tiny muted">Target</div><div className="price">{money(line.target, state.settings.currency)}</div></div>
              <div><div className="tiny muted">Estimate</div><div className="price" style={{ color: estimate > line.max ? 'var(--bad)' : undefined }}>{money(estimate, state.settings.currency)}</div></div>
            </div>
          </div>
          <RangeBar line={line} estimate={estimate} currency={state.settings.currency} />
        </div>
      )}

      <h2 style={{ marginBottom: 12 }}>Top 3</h2>
      {podium.length === 0 ? (
        <Empty title="No contenders yet" action={<button className="btn primary" onClick={() => setEditing({ option: blankOption(cat.id, scenarioId === 'all' ? [] : [scenarioId]), isNew: true })}><Plus size={16} /> Add your first option</button>}>
          Add what you’re considering — or paste a link into the <Link to="/assistant">Assistant</Link> and let Claude fill it in.
        </Empty>
      ) : (
        <div className="podium">
          {podium.map((o, i) => (
            <div key={o.id} className={`card pod m${i + 1}`}>
              <div className={`medal m${i + 1}`}>{i + 1}</div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>{o.status === 'chosen' ? '✓ Chosen' : i === 0 ? 'Leading' : 'Contender'}</div>
              <h3 style={{ paddingRight: 36 }}>{o.name}</h3>
              <div className="small muted">{[o.vendor, [o.location, o.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || '—'}{isAbroad(o, home) && <span className="pill abroad" style={{ marginLeft: 6 }}>✈ Abroad</span>}</div>
              <div className="price" style={{ margin: '12px 0 4px' }}>{money(o.cost, state.settings.currency)}</div>
              <div className="small" style={{ minHeight: 40 }}>{o.pros && <div><span style={{ color: 'var(--good)' }}>+</span> {o.pros}</div>}{o.cons && <div><span style={{ color: 'var(--bad)' }}>−</span> {o.cons}</div>}</div>
              <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setEditing({ option: o, isNew: false })}>Open</button>
            </div>
          ))}
        </div>
      )}

      {comparing && (
        <div style={{ marginTop: 26 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2>Side by side</h2>
            <span className="small muted">Tick up to 4 options below{chosen.length ? ` · ${chosen.length} selected` : ''}</span>
          </div>
          {chosen.length >= 2 ? <CompareTable options={chosen} /> : <Empty title="Pick two or more">Use the ✓ button on any option to add it here.</Empty>}
        </div>
      )}

      <div className="row between wrap" style={{ margin: '30px 0 12px' }}>
        <h2>All options</h2>
        <div className="row wrap">
          <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'shortlist', label: 'Shortlist' }, { value: 'chosen', label: 'Chosen' }, { value: 'idea', label: 'Ideas' }, { value: 'rejected', label: 'Passed' }]} />
          <Seg value={sort} onChange={setSort} options={[{ value: 'rank', label: 'My rank' }, { value: 'cost', label: 'Cost ↑' }, { value: 'rating', label: 'Rating' }]} />
        </div>
      </div>
      {countries.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="tiny muted" style={{ marginBottom: 2 }}>Where</div>
          <div className="chip-pick" style={{ marginTop: 0 }}>
            <button className={place === 'all' ? 'on' : ''} onClick={() => setPlace('all')}>All places · {all.length}</button>
            <button className={place === 'home' ? 'on' : ''} onClick={() => setPlace('home')}>{home} · {all.filter((o) => !isAbroad(o, home)).length}</button>
            <button className={place === 'abroad' ? 'on' : ''} onClick={() => setPlace('abroad')}>✈ Abroad · {all.filter((o) => isAbroad(o, home)).length}</button>
            {countries.filter(([c]) => c.toLowerCase() !== home.toLowerCase()).map(([c, n]) => (
              <button key={c} className={place === `c:${c}` ? 'on' : ''} onClick={() => setPlace(`c:${c}`)}>{c} · {n}</button>
            ))}
          </div>
        </div>
      )}
      <div className="col">
        {list.map((o) => <OptionCard key={o.id} option={o} rank={rankOf(o)} selected={selected.includes(o.id)} onSelect={() => { toggle(o.id); setComparing(true); }} onEdit={() => setEditing({ option: o, isNew: false })} />)}
        {list.length === 0 && all.length > 0 && <div className="muted small">Nothing matches this filter.</div>}
        {scenarioId !== 'all' && <div className="tiny muted">Showing options that work for the selected timeline. Switch to “All timelines” at the top to see everything.</div>}
      </div>

      <div className="grid g2" style={{ marginTop: 34 }}>
        <div className="card flat">
          <div className="row between"><h3>Things to think about</h3><span className="tiny muted">{todo.filter((t) => t.done).length}/{todo.length}</span></div>
          {todo.length === 0 && <div className="small muted" style={{ marginTop: 8 }}>No prompts for this category. Add your own on the <Link to="/checklist">Checklist</Link> page.</div>}
          {todo.map((t) => (
            <label key={t.id} className={`check ${t.done ? 'done' : ''}`}>
              <input type="checkbox" checked={t.done} onChange={() => update((s) => ({ ...s, checklist: s.checklist.map((c) => (c.id === t.id ? { ...c, done: !c.done } : c)) }))} />
              <span className="t">{t.title}</span>
            </label>
          ))}
        </div>
        <div className="card flat">
          <div className="row between"><h3>Discussion</h3><Link to={`/discussions?cat=${cat.id}`} className="small row" style={{ gap: 4 }}><MessageSquare size={13} /> Open log</Link></div>
          {notes.length === 0 && <div className="small muted" style={{ marginTop: 8 }}>No conversations logged for this category yet.</div>}
          {notes.slice(0, 4).map((n) => (
            <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <strong className="small">{n.title}</strong>
              <div className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{n.body.slice(0, 160)}{n.body.length > 160 ? '…' : ''}</div>
              {n.decision && <div className="small" style={{ color: 'var(--good)', marginTop: 4 }}>Decision: {n.decision}</div>}
            </div>
          ))}
        </div>
      </div>

      {editing && <OptionForm key={editing.option.id} initial={editing.option} category={cat} isNew={editing.isNew} onClose={() => setEditing(null)} />}
    </div>
  );
}

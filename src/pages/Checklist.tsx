import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { uid } from '../../shared/types';
import { useStore } from '../store';
import { CatIcon, PageHead, Seg } from '../components/ui';

export default function Checklist() {
  const { state, update } = useStore();
  const [show, setShow] = useState<'all' | 'todo' | 'done'>('all');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const done = state.checklist.filter((c) => c.done).length;
  const pct = (done / Math.max(1, state.checklist.length)) * 100;

  const add = (categoryId: string) => {
    const title = (draft[categoryId] ?? '').trim();
    if (!title) return;
    update((s) => ({ ...s, checklist: [...s.checklist, { id: uid('ck'), title, categoryId, done: false, note: '' }] }));
    setDraft((d) => ({ ...d, [categoryId]: '' }));
  };

  return (
    <div className="page">
      <PageHead eyebrow="Everything to think about" title="Checklist" subtitle="Every decision a wedding asks of you, grouped by category. Tick things off as you decide, and add your own." actions={<Seg value={show} onChange={setShow} options={[{ value: 'all', label: 'All' }, { value: 'todo', label: 'To decide' }, { value: 'done', label: 'Done' }]} />} />
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row between"><strong>{done} of {state.checklist.length} decided</strong><span className="muted small">{Math.round(pct)}%</span></div>
        <div className="progress" style={{ marginTop: 10 }}><i style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        {state.categories.map((c) => {
          const items = state.checklist.filter((i) => i.categoryId === c.id && (show === 'all' || (show === 'done' ? i.done : !i.done)));
          return (
            <div key={c.id} className="card flat">
              <div className="row" style={{ gap: 10, marginBottom: 6 }}>
                <span style={{ color: c.color }}><CatIcon name={c.icon} /></span><h3>{c.name}</h3>
                <span className="tiny muted" style={{ marginLeft: 'auto' }}>{state.checklist.filter((i) => i.categoryId === c.id && i.done).length}/{state.checklist.filter((i) => i.categoryId === c.id).length}</span>
              </div>
              {items.map((i) => (
                <div key={i.id} className={`check ${i.done ? 'done' : ''}`}>
                  <input type="checkbox" checked={i.done} onChange={() => update((s) => ({ ...s, checklist: s.checklist.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)) }))} />
                  <span className="t grow">{i.title}</span>
                  <button className="btn sm icon ghost danger" aria-label="Remove" onClick={() => update((s) => ({ ...s, checklist: s.checklist.filter((x) => x.id !== i.id) }))}><Trash2 size={13} /></button>
                </div>
              ))}
              <form className="row" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); add(c.id); }}>
                <input placeholder="Add your own…" value={draft[c.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [c.id]: e.target.value }))} />
                <button className="btn icon" type="submit" aria-label="Add"><Plus size={15} /></button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

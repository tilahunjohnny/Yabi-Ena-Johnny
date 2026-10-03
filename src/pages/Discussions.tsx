import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Note, uid } from '../../shared/types';
import { visibleCategories } from '../../shared/logic';
import { useStore } from '../store';
import { Empty, Field, Modal, PageHead, Seg, tint } from '../components/ui';

export default function Discussions() {
  const { state, update } = useStore();
  const [params, setParams] = useSearchParams();
  const catFilter = params.get('cat') ?? 'all';
  const [show, setShow] = useState<'open' | 'resolved' | 'all'>('all');
  const [editing, setEditing] = useState<Note | null>(null);
  const isNew = editing ? !state.notes.some((n) => n.id === editing.id) : false;

  const list = state.notes.filter((n) => (catFilter === 'all' || n.categoryId === catFilter) && (show === 'all' || (show === 'open' ? !n.resolved : n.resolved)));
  const blank = (): Note => ({ id: uid('note'), title: '', body: '', author: state.settings.coupleNames.split('&')[0].trim() || 'Me', categoryId: catFilter === 'all' ? '' : catFilter, decision: '', resolved: false, createdAt: new Date().toISOString() });
  const save = () => {
    if (!editing || !editing.title.trim()) return;
    update((s) => ({ ...s, notes: isNew ? [editing, ...s.notes] : s.notes.map((n) => (n.id === editing.id ? editing : n)) }));
    setEditing(null);
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Conversation log"
        title="Discussions"
        subtitle="Keep a record of what we talked about, what we leaned toward, and what we decided — so nothing gets lost between conversations."
        actions={<button className="btn primary" onClick={() => setEditing(blank())}><Plus size={16} /> New entry</button>}
      />
      <div className="row wrap" style={{ marginBottom: 18 }}>
        <Seg value={show} onChange={setShow} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }]} />
        <select value={catFilter} onChange={(e) => (e.target.value === 'all' ? setParams({}) : setParams({ cat: e.target.value }))} style={{ width: 'auto' }}>
          <option value="all">All categories</option>
          {visibleCategories(state).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <Empty title="Nothing logged yet" action={<button className="btn primary" onClick={() => setEditing(blank())}><Plus size={16} /> Log a conversation</button>}>
          Jot down the pros and cons you talked through, questions for vendors, or what you each prefer.
        </Empty>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {list.map((n) => {
            const cat = state.categories.find((c) => c.id === n.categoryId);
            return (
              <div key={n.id} className="card" style={{ opacity: n.resolved ? 0.7 : 1 }}>
                <div className="row between wrap" style={{ gap: 10 }}>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <h3>{n.title}</h3>
                    {cat && <span className="pill" style={{ color: tint(cat.color) }}>{cat.name}</span>}
                    {n.author === 'Claude' && <span className="pill shortlist"><Sparkles size={11} /> Claude</span>}
                    {n.resolved && <span className="pill chosen">Resolved</span>}
                  </div>
                  <div className="row" style={{ gap: 2 }}>
                    <button className="btn sm ghost" onClick={() => update((s) => ({ ...s, notes: s.notes.map((x) => (x.id === n.id ? { ...x, resolved: !x.resolved } : x)) }))}>{n.resolved ? <><RotateCcw size={13} /> Reopen</> : <><Check size={13} /> Resolve</>}</button>
                    <button className="btn sm ghost" onClick={() => setEditing(n)}>Edit</button>
                    <button className="btn sm icon ghost danger" aria-label="Delete" onClick={() => confirm('Delete this entry?') && update((s) => ({ ...s, notes: s.notes.filter((x) => x.id !== n.id) }))}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="tiny muted" style={{ margin: '2px 0 8px' }}>{n.author} · {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
                {n.decision && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--good) 12%, transparent)', color: 'var(--good)' }}><strong>Decision:</strong> {n.decision}</div>}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={isNew ? 'New entry' : 'Edit entry'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><button className="btn primary" onClick={save} disabled={!editing.title.trim()}>Save</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <Field label="Topic"><input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Venue: Lake house vs. ballroom" /></Field>
            <div className="grid g2">
              <Field label="Category"><select value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}><option value="">General</option>{visibleCategories(state).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Who"><input value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} /></Field>
            </div>
            <Field label="What we discussed"><textarea style={{ minHeight: 140 }} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>
            <Field label="Decision (if any)"><input value={editing.decision} onChange={(e) => setEditing({ ...editing, decision: e.target.value })} placeholder="What did we land on?" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

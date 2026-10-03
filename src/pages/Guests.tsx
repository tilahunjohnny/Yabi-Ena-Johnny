import { useState } from 'react';
import { ArrowLeftRight, Check, HelpCircle, Plus, StickyNote, Trash2 } from 'lucide-react';
import { guestCounts } from '../../shared/logic';
import { Guest, GuestSide, GuestStatus, uid } from '../../shared/types';
import { useStore } from '../store';
import { Empty, PageHead, Seg } from '../components/ui';

const GROUPS = ['Family', 'Friends', 'Work', 'Other'];

function Row({ g }: { g: Guest }) {
  const { update } = useStore();
  const [notes, setNotes] = useState(false);
  const patch = (p: Partial<Guest>) => update((s) => ({ ...s, guests: s.guests.map((x) => (x.id === g.id ? { ...x, ...p } : x)) }));
  return (
    <div className="guest" style={{ opacity: g.status === 'maybe' ? 0.92 : 1 }}>
      <div className="row" style={{ gap: 8 }}>
        <input className="guest-name" value={g.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Guest name" />
        <div className="seg" role="group" aria-label="Status" style={{ flex: 'none' }}>
          <button className={g.status === 'yes' ? 'on' : ''} onClick={() => patch({ status: 'yes' })} title="Definitely invited"><Check size={13} /> Yes</button>
          <button className={g.status === 'maybe' ? 'on maybe' : ''} onClick={() => patch({ status: 'maybe' })} title="Maybe, still deciding"><HelpCircle size={13} /> Maybe</button>
        </div>
      </div>
      <div className="row between" style={{ marginTop: 6 }}>
        <div className="row" style={{ gap: 6 }}>
          <select value={g.group} onChange={(e) => patch({ group: e.target.value })} aria-label="Group" style={{ width: 'auto', padding: '3px 8px', fontSize: 12 }}>
            <option value="">No group</option>
            {Array.from(new Set([...GROUPS, g.group].filter(Boolean))).map((x) => <option key={x}>{x}</option>)}
          </select>
          <button className={`btn sm ghost ${g.notes ? 'has-note' : ''}`} onClick={() => setNotes((n) => !n)} title="Notes"><StickyNote size={13} /> {g.notes ? 'Note' : 'Add note'}</button>
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button className="btn sm ghost icon" title={`Move to ${g.side === 'yabi' ? "Johnny's" : "Yabi's"} side`} onClick={() => patch({ side: g.side === 'yabi' ? 'johnny' : 'yabi' })}><ArrowLeftRight size={14} /></button>
          <button className="btn sm ghost icon danger" title="Remove from the list" aria-label={`Remove ${g.name}`} onClick={() => update((s) => ({ ...s, guests: s.guests.filter((x) => x.id !== g.id) }))}><Trash2 size={14} /></button>
        </div>
      </div>
      {(notes || (g.notes && notes)) && <textarea autoFocus value={g.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Plus-one? Travel? Anything to remember…" style={{ marginTop: 8, minHeight: 54 }} />}
      {!notes && g.notes && <div className="tiny muted" style={{ marginTop: 6 }}>{g.notes}</div>}
    </div>
  );
}

function Side({ side, title, filter }: { side: GuestSide; title: string; filter: 'all' | GuestStatus }) {
  const { state, update } = useStore();
  const [text, setText] = useState('');
  const [group, setGroup] = useState('');
  const counts = guestCounts(state)[side];
  const list = state.guests.filter((g) => g.side === side && (filter === 'all' || g.status === filter));
  const sorted = [...list].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'yes' ? -1 : 1));

  const add = (status: GuestStatus) => {
    // Paste a whole list: one name per line (or comma separated).
    const names = text.split(/[\n,]/).map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    const now = new Date().toISOString();
    update((s) => ({ ...s, guests: [...s.guests, ...names.map((name) => ({ id: uid('g'), name, side, status, group, notes: '', createdAt: now }))] }));
    setText('');
  };

  return (
    <section className="card guest-col">
      <div className="row between" style={{ marginBottom: 4 }}>
        <h2>{title}</h2>
        <div className="small"><strong>{counts.yes}</strong> yes · <span className="muted">{counts.maybe} maybe</span></div>
      </div>
      <form className="col" style={{ gap: 8, margin: '12px 0' }} onSubmit={(e) => { e.preventDefault(); add('yes'); }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Add names to ${title}… (one per line to add several)`} aria-label={`Add guests to ${title}`}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add('yes'); } }} style={{ minHeight: 46 }} rows={1} />
        <div className="row wrap" style={{ gap: 8 }}>
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group for new guests" style={{ width: 'auto' }}>
            <option value="">No group</option>{GROUPS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <button type="submit" className="btn primary" disabled={!text.trim()}><Plus size={14} /> Add</button>
          <button type="button" className="btn" disabled={!text.trim()} onClick={() => add('maybe')}><HelpCircle size={14} /> Add as maybe</button>
        </div>
      </form>
      {sorted.length === 0 ? (
        <div className="small muted" style={{ padding: '18px 4px' }}>{state.guests.some((g) => g.side === side) ? 'Nobody matches this filter.' : 'No one here yet. Type a name above and press Enter.'}</div>
      ) : sorted.map((g) => <Row key={g.id} g={g} />)}
    </section>
  );
}

export default function Guests() {
  const { state, update, toast } = useStore();
  const [filter, setFilter] = useState<'all' | GuestStatus>('all');
  const c = guestCounts(state);
  const upper = c.yes + c.maybe;
  return (
    <div className="page">
      <PageHead
        eyebrow="Who’s coming"
        title="Guest list"
        subtitle="Add people to Yabi’s side or Johnny’s side, mark who’s a definite yes and who’s a maybe, and remove anyone who falls off. Move a name across sides with the arrows."
        actions={<Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Everyone' }, { value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }]} />}
      />
      <div className="grid g4" style={{ marginBottom: 22 }}>
        <div className="card"><div className="tiny muted">Definite</div><div className="stat">{c.yes}</div></div>
        <div className="card"><div className="tiny muted">Maybe</div><div className="stat">{c.maybe}</div></div>
        <div className="card"><div className="tiny muted">Headcount range</div><div className="stat">{c.yes}–{upper}</div></div>
        <div className="card">
          <div className="tiny muted">Budget uses</div>
          <div className="stat">{state.settings.guestCount}</div>
          <button className="btn sm" style={{ marginTop: 8 }} disabled={upper === 0 || upper === state.settings.guestCount} onClick={() => { update((s) => ({ ...s, settings: { ...s.settings, guestCount: upper } })); toast(`Guest estimate set to ${upper}`); }}>Use {upper}</button>
        </div>
      </div>
      {state.guests.length === 0 && <Empty title="Start the list">Add the first few names on either side. Paste a list, one name per line, to add many at once.</Empty>}
      <div className="grid g2" style={{ alignItems: 'start', marginTop: state.guests.length ? 0 : 18 }}>
        <Side side="yabi" title="Yabi’s side" filter={filter} />
        <Side side="johnny" title="Johnny’s side" filter={filter} />
      </div>
    </div>
  );
}

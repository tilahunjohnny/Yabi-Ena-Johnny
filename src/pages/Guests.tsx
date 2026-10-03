import { useRef, useState } from 'react';
import { ArrowLeftRight, Check, HelpCircle, Plus, StickyNote, Trash2, Upload } from 'lucide-react';
import { guestCounts } from '../../shared/logic';
import { Guest, GuestSide, GuestStatus, uid } from '../../shared/types';
import { useStore } from '../store';
import { Empty, Field, Modal, PageHead, Seg } from '../components/ui';
import { ImportedGuest, parseGuestSheet } from '../lib/guestImport';

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

function Side({ side, title, filter, order }: { side: GuestSide; title: string; filter: 'all' | GuestStatus; order: 'list' | 'az' }) {
  const { state, update } = useStore();
  const [text, setText] = useState('');
  const [group, setGroup] = useState('');
  const counts = guestCounts(state)[side];
  const list = state.guests.filter((g) => g.side === side && (filter === 'all' || g.status === filter));
  // "List order" keeps people in the order they were added or imported; A–Z sorts by name.
  const sorted = order === 'az' ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;

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

function ImportDialog({ rows, onClose }: { rows: ImportedGuest[]; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [unsure, setUnsure] = useState<GuestStatus>('maybe'); // how "Probably" / blank statuses are treated
  const [fallbackSide, setFallbackSide] = useState<GuestSide>('yabi');
  const [mode, setMode] = useState<'add' | 'replace'>(state.guests.length ? 'add' : 'replace');

  const resolved = rows.map((r) => ({ ...r, side: r.side ?? fallbackSide, status: (r.rawStatus === 'yes' ? 'yes' : r.rawStatus === 'maybe' ? 'maybe' : unsure) as GuestStatus }));
  const known = new Set(mode === 'add' ? state.guests.map((g) => `${g.side}|${g.name.toLowerCase().trim()}`) : []);
  const fresh = resolved.filter((r) => !known.has(`${r.side}|${r.name.toLowerCase()}`));
  const skipped = resolved.length - fresh.length;
  const side = (s: GuestSide) => ({ all: fresh.filter((r) => r.side === s), yes: fresh.filter((r) => r.side === s && r.status === 'yes').length });
  const yabi = side('yabi'), johnny = side('johnny');
  const unsureCount = rows.filter((r) => r.rawStatus === 'probably' || r.rawStatus === 'blank').length;
  const noSide = rows.filter((r) => !r.side).length;

  const run = () => {
    const now = new Date().toISOString();
    const added = fresh.map((r) => ({ id: uid('g'), name: r.name, side: r.side, status: r.status, group: r.group, notes: '', createdAt: now }));
    update((s) => ({ ...s, guests: mode === 'replace' ? added : [...s.guests, ...added] }));
    toast(`${added.length} guests imported`);
    onClose();
  };

  const Block = ({ title, d }: { title: string; d: ReturnType<typeof side> }) => (
    <div className="card flat">
      <div className="tiny muted">{title}</div>
      <div className="stat">{d.all.length}</div>
      <div className="small muted">{d.yes} yes · {d.all.length - d.yes} maybe</div>
      <div className="tiny" style={{ marginTop: 8 }}>Starts with <strong>{d.all[0]?.name ?? '—'}</strong></div>
    </div>
  );

  return (
    <Modal title="Import guest list" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={run} disabled={!fresh.length}>Import {fresh.length} guests</button></>}>
      <p className="small muted" style={{ marginTop: 0 }}>Found <strong>{rows.length}</strong> people. “Bride” is placed on Yabi’s side and “Groom” on Johnny’s side. Check the split below before importing.</p>
      <div className="grid g2" style={{ marginBottom: 14 }}><Block title="Yabi’s side" d={yabi} /><Block title="Johnny’s side" d={johnny} /></div>
      <div className="grid g2">
        {unsureCount > 0 && (
          <Field label={`“Probably” or blank status (${unsureCount})`}>
            <select value={unsure} onChange={(e) => setUnsure(e.target.value as GuestStatus)}><option value="maybe">Count as Maybe</option><option value="yes">Count as Yes</option></select>
          </Field>
        )}
        {noSide > 0 && (
          <Field label={`No side given (${noSide})`}>
            <select value={fallbackSide} onChange={(e) => setFallbackSide(e.target.value as GuestSide)}><option value="yabi">Put on Yabi’s side</option><option value="johnny">Put on Johnny’s side</option></select>
          </Field>
        )}
        <Field label="Your current list">
          <select value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'replace')}>
            <option value="add">Keep it and add these{state.guests.length ? ` (${state.guests.length} now)` : ''}</option>
            <option value="replace">Replace it with these</option>
          </select>
        </Field>
      </div>
      {skipped > 0 && <p className="tiny muted">{skipped} already on your list (same name and side) will be skipped.</p>}
    </Modal>
  );
}

export default function Guests() {
  const { state, update, toast } = useStore();
  const [filter, setFilter] = useState<'all' | GuestStatus>('all');
  const [order, setOrder] = useState<'list' | 'az'>('list');
  const [importRows, setImportRows] = useState<ImportedGuest[] | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const c = guestCounts(state);
  const onFile = async (f: File) => {
    setImportError('');
    try {
      const rows = await parseGuestSheet(f);
      if (!rows.length) throw new Error('No names found');
      setImportRows(rows);
    } catch (e: any) {
      setImportError(`Couldn’t read that file (${e?.message || 'unknown error'}). Use an .xlsx with First Name / Last Name columns.`);
    }
  };
  const upper = c.yes + c.maybe;
  return (
    <div className="page">
      <PageHead
        eyebrow="Who’s coming"
        title="Guest list"
        subtitle="Add people to Yabi’s side or Johnny’s side, mark who’s a definite yes and who’s a maybe, and remove anyone who falls off. Move a name across sides with the arrows."
        actions={
          <>
            <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import spreadsheet</button>
            <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
            <Seg value={order} onChange={setOrder} options={[{ value: 'list', label: 'List order' }, { value: 'az', label: 'A–Z' }]} />
            <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Everyone' }, { value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }]} />
          </>
        }
      />
      {importError && <div className="small" style={{ color: 'var(--bad)', marginBottom: 12 }}>{importError}</div>}
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
        <Side side="yabi" title="Yabi’s side" filter={filter} order={order} />
        <Side side="johnny" title="Johnny’s side" filter={filter} order={order} />
      </div>
      {importRows && <ImportDialog rows={importRows} onClose={() => setImportRows(null)} />}
    </div>
  );
}

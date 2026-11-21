import { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Check, FolderInput, GripVertical, HelpCircle, Heart, Pencil, Plus, StickyNote, Trash2, Upload, X } from 'lucide-react';
import { guestCounts } from '../../shared/logic';
import { Guest, GuestSide, GuestStatus, uid } from '../../shared/types';
import { useStore } from '../store';
import { Empty, Field, Modal, NumInput, PageHead, Seg } from '../components/ui';
import { ImportedGuest, parseGuestSheet } from '../lib/guestImport';

const GROUPS = ['Family', 'Friends', 'Work', 'Other'];
const NEW_GROUP = '__new__';
const DRAG = 'application/x-yej-guests';

interface Ctl {
  selected: Set<string>;
  toggle: (ids: string[], on?: boolean) => void;
  groups: string[];
  /** Move guests to a side and/or group. */
  move: (ids: string[], to: { side?: GuestSide; group?: string }) => void;
  askGroup: () => string | null;
}

function Row({ g, ctl }: { g: Guest; ctl: Ctl }) {
  const { update } = useStore();
  const [notes, setNotes] = useState(false);
  const patch = (p: Partial<Guest>) => update((s) => ({ ...s, guests: s.guests.map((x) => (x.id === g.id ? { ...x, ...p } : x)) }));
  const picked = ctl.selected.has(g.id);
  return (
    <div className={`guest ${picked ? 'picked' : ''}`} style={{ opacity: g.status === 'maybe' ? 0.92 : 1 }} draggable
      onDragStart={(e) => { const ids = picked ? Array.from(ctl.selected) : [g.id]; e.dataTransfer.setData(DRAG, JSON.stringify(ids)); e.dataTransfer.effectAllowed = 'move'; }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="drag-grip" aria-hidden="true"><GripVertical size={14} /></span>
        <input type="checkbox" className="guest-pick" checked={picked} onChange={() => ctl.toggle([g.id])} aria-label={`Select ${g.name}`} />
        <input className="guest-name" value={g.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Guest name" />
        <button className={`btn sm icon ghost heart ${g.inner ? 'on' : ''}`} onClick={() => patch({ inner: !g.inner })} aria-pressed={!!g.inner} title={g.inner ? 'In the small wedding. Click to remove' : 'Add to the small wedding'}><Heart size={14} fill={g.inner ? 'currentColor' : 'none'} /></button>
        <div className="seg" role="group" aria-label="Status" style={{ flex: 'none' }}>
          <button className={g.status === 'yes' ? 'on' : ''} onClick={() => patch({ status: 'yes' })} title="Definitely invited"><Check size={13} /> Yes</button>
          <button className={g.status === 'maybe' ? 'on maybe' : ''} onClick={() => patch({ status: 'maybe' })} title="Maybe, still deciding"><HelpCircle size={13} /> Maybe</button>
        </div>
      </div>
      <div className="row between" style={{ marginTop: 6, paddingLeft: 40 }}>
        <div className="row" style={{ gap: 6 }}>
          <select value={g.group} onChange={(e) => { if (e.target.value === NEW_GROUP) { const n = ctl.askGroup(); if (n) patch({ group: n }); } else patch({ group: e.target.value }); }} aria-label="Group" style={{ width: 'auto', padding: '3px 8px', fontSize: 12 }}>
            <option value="">No group</option>
            {Array.from(new Set([...ctl.groups, g.group].filter(Boolean))).map((x) => <option key={x}>{x}</option>)}
            <option value={NEW_GROUP}>New group…</option>
          </select>
          <button className={`btn sm ghost ${g.notes ? 'has-note' : ''}`} onClick={() => setNotes((n) => !n)} title="Notes"><StickyNote size={13} /> {g.notes ? 'Note' : 'Add note'}</button>
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button className="btn sm ghost icon" title={`Move to ${g.side === 'yabi' ? "Johnny's" : "Yabi's"} side`} onClick={() => patch({ side: g.side === 'yabi' ? 'johnny' : 'yabi' })}><ArrowLeftRight size={14} /></button>
          <button className="btn sm ghost icon danger" title="Remove from the list" aria-label={`Remove ${g.name}`} onClick={() => update((s) => ({ ...s, guests: s.guests.filter((x) => x.id !== g.id) }))}><Trash2 size={14} /></button>
        </div>
      </div>
      {notes && <textarea autoFocus value={g.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Plus-one? Travel? Anything to remember…" style={{ marginTop: 8, minHeight: 54 }} />}
      {!notes && g.notes && <div className="tiny muted" style={{ marginTop: 6, paddingLeft: 40 }}>{g.notes}</div>}
    </div>
  );
}

/** A place names can be dropped: a side, or one group inside a side. */
function Drop({ children, onDrop, className = '' }: { children: React.ReactNode; onDrop: (ids: string[]) => void; className?: string }) {
  const [over, setOver] = useState(false);
  return (
    <div className={`${className} ${over ? 'drop-over' : ''}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => { e.preventDefault(); setOver(false); try { onDrop(JSON.parse(e.dataTransfer.getData(DRAG))); } catch { /* not ours */ } }}>
      {children}
    </div>
  );
}

function Side({ side, title, filter, order, view, grouped, ctl }: { side: GuestSide; title: string; filter: 'all' | GuestStatus; order: 'list' | 'az'; view: 'all' | 'small'; grouped: boolean; ctl: Ctl }) {
  const { state, update } = useStore();
  const [text, setText] = useState('');
  const [group, setGroup] = useState('');
  const counts = guestCounts(state)[side];
  const mine = state.guests.filter((g) => g.side === side);
  const list = mine.filter((g) => (filter === 'all' || g.status === filter) && (view === 'all' || g.inner));
  // "List order" keeps people in the order they were added or imported; A–Z sorts by name.
  const sorted = order === 'az' ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  const small = mine.filter((g) => g.inner).length;

  const add = (status: GuestStatus, intoGroup = group, names = text.split(/[\n,]/).map((n) => n.trim()).filter(Boolean)) => {
    // Paste a whole list: one name per line (or comma separated).
    if (!names.length) return;
    const now = new Date().toISOString();
    update((s) => ({ ...s, guests: [...s.guests, ...names.map((name) => ({ id: uid('g'), name, side, status, group: intoGroup, ...(view === 'small' ? { inner: true } : {}), notes: '', createdAt: now }))] }));
    setText('');
  };

  const sections = useMemo(() => {
    if (!grouped) return [{ name: null as string | null, items: sorted }];
    const names = Array.from(new Set(sorted.map((g) => g.group)));
    names.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
    return names.map((n) => ({ name: n, items: sorted.filter((g) => g.group === n) }));
  }, [sorted, grouped]);

  const renameGroup = (from: string) => {
    const to = prompt(`Rename the group "${from}" to:`, from)?.trim();
    if (!to || to === from) return;
    update((s) => ({ ...s, guests: s.guests.map((g) => (g.group === from ? { ...g, group: to } : g)) }));
  };

  return (
    <Drop className="card guest-col" onDrop={(ids) => ctl.move(ids, { side })}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h2>{title}</h2>
        <div className="small"><strong>{counts.yes}</strong> yes · <span className="muted">{counts.maybe} maybe</span> · <span className="muted"><Heart size={11} style={{ verticalAlign: -1 }} /> {small}</span></div>
      </div>
      <form className="col" style={{ gap: 8, margin: '12px 0' }} onSubmit={(e) => { e.preventDefault(); add('yes'); }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Add names to ${title}… (one per line to add several)`} aria-label={`Add guests to ${title}`}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add('yes'); } }} style={{ minHeight: 46 }} rows={1} />
        <div className="row wrap" style={{ gap: 8 }}>
          <select value={group} onChange={(e) => { if (e.target.value === NEW_GROUP) { const n = ctl.askGroup(); if (n) setGroup(n); } else setGroup(e.target.value); }} aria-label="Group for new guests" style={{ width: 'auto' }}>
            <option value="">No group</option>{Array.from(new Set([...ctl.groups, group].filter(Boolean))).map((x) => <option key={x}>{x}</option>)}<option value={NEW_GROUP}>New group…</option>
          </select>
          <button type="submit" className="btn primary" disabled={!text.trim()}><Plus size={14} /> Add</button>
          <button type="button" className="btn" disabled={!text.trim()} onClick={() => add('maybe')}><HelpCircle size={14} /> Add as maybe</button>
        </div>
      </form>
      {sorted.length === 0 ? (
        <div className="small muted" style={{ padding: '18px 4px' }}>{view === 'small' ? 'No one picked for the small wedding on this side yet. Tap the heart next to a name.' : mine.length ? 'Nobody matches this filter.' : 'No one here yet. Type a name above and press Enter.'}</div>
      ) : sections.map((sec) => (
        <Drop key={sec.name ?? 'all'} className={sec.name === null ? '' : 'guest-group'} onDrop={(ids) => ctl.move(ids, sec.name === null ? { side } : { side, group: sec.name })}>
          {sec.name !== null && (
            <div className="group-head">
              <input type="checkbox" checked={sec.items.every((g) => ctl.selected.has(g.id))} onChange={(e) => ctl.toggle(sec.items.map((g) => g.id), e.target.checked)} aria-label={`Select everyone in ${sec.name || 'no group'}`} />
              <strong>{sec.name || 'No group'}</strong><span className="tiny muted">{sec.items.length}</span>
              {sec.name && <button className="btn sm ghost icon" title="Rename this group" onClick={() => renameGroup(sec.name!)}><Pencil size={12} /></button>}
              <form className="group-add" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('n') as HTMLInputElement; const names = input.value.split(/[\n,]/).map((n) => n.trim()).filter(Boolean); add('yes', sec.name!, names); input.value = ''; }}>
                <input name="n" placeholder={`Add to ${sec.name || 'this group'}…`} aria-label={`Add a guest to ${sec.name || 'no group'}`} />
              </form>
            </div>
          )}
          {sec.items.map((g) => <Row key={g.id} g={g} ctl={ctl} />)}
        </Drop>
      ))}
    </Drop>
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
  const [view, setView] = useState<'all' | 'small'>('all');
  const [grouped, setGrouped] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importRows, setImportRows] = useState<ImportedGuest[] | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const c = guestCounts(state);
  const groups = useMemo(() => Array.from(new Set([...GROUPS, ...state.guests.map((g) => g.group).filter(Boolean)])), [state.guests]);
  const ids = new Set(state.guests.map((g) => g.id));
  const sel = Array.from(selected).filter((id) => ids.has(id));

  const askGroup = () => prompt('Name the new group (e.g. College friends, Cousins):')?.trim() || null;
  const toggle = (list: string[], on?: boolean) => setSelected((cur) => { const n = new Set(cur); const add = on ?? !list.every((id) => n.has(id)); list.forEach((id) => (add ? n.add(id) : n.delete(id))); return n; });
  const apply = (idsToChange: string[], fn: (g: Guest) => Guest) => { const set = new Set(idsToChange); update((s) => ({ ...s, guests: s.guests.map((g) => (set.has(g.id) ? fn(g) : g)) })); };
  const move = (list: string[], to: { side?: GuestSide; group?: string }) => {
    apply(list, (g) => ({ ...g, ...(to.side ? { side: to.side } : {}), ...(to.group !== undefined ? { group: to.group } : {}) }));
    toast(`Moved ${list.length} ${list.length === 1 ? 'name' : 'names'}`);
  };
  const ctl: Ctl = { selected, toggle, groups, move, askGroup };

  const upper = c.yes + c.maybe;
  const smallList = state.guests.filter((g) => g.inner);
  const target = state.settings.smallGuestTarget ?? 0;
  const setBudgetGuests = (n: number) => { update((s) => ({ ...s, settings: { ...s.settings, guestCount: n } })); toast(`Guest estimate set to ${n}`); };

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

  return (
    <div className="page">
      <PageHead
        eyebrow="Who’s coming"
        title="Guest list"
        subtitle="One big list, plus a smaller one inside it. Tap the heart next to a name to include them in a smaller wedding. Select names to move or group them, or drag them to another side or group."
        actions={
          <>
            <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import spreadsheet</button>
            <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          </>
        }
      />
      {importError && <div className="small" style={{ color: 'var(--bad)', marginBottom: 12 }}>{importError}</div>}

      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="tiny muted">Full wedding</div>
          <div className="stat">{c.yes}<span className="muted small"> yes · {c.maybe} maybe</span></div>
          <div className="tiny muted" style={{ marginTop: 6 }}>Headcount {c.yes}–{upper}</div>
        </div>
        <div className="card" style={{ borderColor: smallList.length ? 'var(--accent)' : undefined }}>
          <div className="row between"><div className="tiny muted">Small wedding</div><label className="tiny muted row" style={{ gap: 6 }}>Goal <NumInput value={target} onChange={(n) => update((s) => ({ ...s, settings: { ...s.settings, smallGuestTarget: n } }))} className="tiny-num" /></label></div>
          <div className="stat">{smallList.length}{target > 0 && <span className="muted small"> of {target}</span>}</div>
          {target > 0 && <div className="progress" style={{ margin: '8px 0 4px' }}><i style={{ width: `${Math.min(100, (smallList.length / target) * 100)}%`, background: smallList.length > target ? 'var(--bad)' : undefined }} /></div>}
          <div className="tiny muted">{target > 0 && smallList.length > target ? `${smallList.length - target} over your goal` : target > 0 ? `${target - smallList.length} spots left` : 'Set a goal to see how many spots are left'}</div>
          <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
            <button className="btn sm" disabled={!c.yes} onClick={() => { apply(state.guests.filter((g) => g.status === 'yes').map((g) => g.id), (g) => ({ ...g, inner: true })); toast('Added everyone marked Yes'); }}>Start from my Yeses</button>
            <button className="btn sm ghost" disabled={!smallList.length} onClick={() => { if (confirm('Clear the small wedding list? Your full list is not changed.')) { apply(smallList.map((g) => g.id), (g) => ({ ...g, inner: false })); } }}>Clear</button>
          </div>
        </div>
        <div className="card">
          <div className="tiny muted">The budget is using</div>
          <div className="stat">{state.settings.guestCount}<span className="muted small"> guests</span></div>
          <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
            <button className="btn sm" disabled={upper === 0 || upper === state.settings.guestCount} onClick={() => setBudgetGuests(upper)}>Use full ({upper})</button>
            <button className="btn sm" disabled={smallList.length === 0 || smallList.length === state.settings.guestCount} onClick={() => setBudgetGuests(smallList.length)}>Use small ({smallList.length})</button>
          </div>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 10, marginBottom: 14 }}>
        <Seg value={view} onChange={setView} options={[{ value: 'all', label: `Everyone · ${state.guests.length}` }, { value: 'small', label: <><Heart size={13} /> Small wedding · {smallList.length}</> }]} />
        <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }]} />
        <Seg value={grouped ? 'g' : 'n'} onChange={(v) => setGrouped(v === 'g')} options={[{ value: 'n', label: 'Plain list' }, { value: 'g', label: 'Grouped' }]} />
        <Seg value={order} onChange={setOrder} options={[{ value: 'list', label: 'List order' }, { value: 'az', label: 'A–Z' }]} />
      </div>

      {sel.length > 0 && (
        <div className="bulkbar" role="toolbar" aria-label="Selected guests">
          <strong>{sel.length} selected</strong>
          <button className="btn sm" onClick={() => move(sel, { side: 'yabi' })}><FolderInput size={13} /> Yabi’s side</button>
          <button className="btn sm" onClick={() => move(sel, { side: 'johnny' })}><FolderInput size={13} /> Johnny’s side</button>
          <select aria-label="Move to group" value="" onChange={(e) => { const v = e.target.value; if (!v) return; const g = v === NEW_GROUP ? askGroup() : v === '__none__' ? '' : v; if (g !== null) move(sel, { group: g }); }} style={{ width: 'auto' }}>
            <option value="">Group as…</option>
            {groups.map((x) => <option key={x}>{x}</option>)}
            <option value="__none__">No group</option>
            <option value={NEW_GROUP}>New group…</option>
          </select>
          <button className="btn sm" onClick={() => apply(sel, (g) => ({ ...g, inner: true }))}><Heart size={13} /> Add to small</button>
          <button className="btn sm ghost" onClick={() => apply(sel, (g) => ({ ...g, inner: false }))}>Remove from small</button>
          <button className="btn sm" onClick={() => apply(sel, (g) => ({ ...g, status: 'yes' }))}>Yes</button>
          <button className="btn sm" onClick={() => apply(sel, (g) => ({ ...g, status: 'maybe' }))}>Maybe</button>
          <button className="btn sm danger" onClick={() => { if (confirm(`Remove ${sel.length} ${sel.length === 1 ? 'person' : 'people'} from the list?`)) { const s = new Set(sel); update((st) => ({ ...st, guests: st.guests.filter((g) => !s.has(g.id)) })); setSelected(new Set()); } }}><Trash2 size={13} /></button>
          <button className="btn sm ghost icon" aria-label="Clear selection" onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto' }}><X size={14} /></button>
        </div>
      )}

      {state.guests.length === 0 && <Empty title="Start the list">Add the first few names on either side. Paste a list, one name per line, to add many at once.</Empty>}
      <div className="grid g2" style={{ alignItems: 'start', marginTop: state.guests.length ? 0 : 18 }}>
        <Side side="yabi" title="Yabi’s side" filter={filter} order={order} view={view} grouped={grouped} ctl={ctl} />
        <Side side="johnny" title="Johnny’s side" filter={filter} order={order} view={view} grouped={grouped} ctl={ctl} />
      </div>
      {importRows && <ImportDialog rows={importRows} onClose={() => setImportRows(null)} />}
    </div>
  );
}

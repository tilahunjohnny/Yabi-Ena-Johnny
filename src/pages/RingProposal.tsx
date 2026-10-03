import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUp, ExternalLink, Gem, Lock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { ChecklistItem, ProposalIdea, Ring, Status, uid } from '../../shared/types';
import { money } from '../../shared/logic';
import { useStore } from '../store';
import { Empty, Field, Modal, NumInput, PageHead, Seg, Stars, StatusPill, STATUSES, STATUS_LABEL } from '../components/ui';

function move<T>(arr: T[], idx: number, dir: -1 | 1 | 'top'): T[] {
  const to = dir === 'top' ? 0 : Math.max(0, Math.min(arr.length - 1, idx + dir));
  if (to === idx) return arr;
  const next = arr.slice();
  const [x] = next.splice(idx, 1);
  next.splice(to, 0, x);
  return next;
}

function StatusPick({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return <Field label="Status"><div className="chip-pick">{STATUSES.map((s) => <button type="button" key={s} className={value === s ? 'on' : ''} onClick={() => onChange(s)}>{STATUS_LABEL[s]}</button>)}</div></Field>;
}

const blankRing = (): Ring => ({ id: uid('ring'), name: '', vendor: '', url: '', price: 0, stone: '', carat: '', metal: '', style: '', rating: 0, status: 'idea', notes: '', createdAt: new Date().toISOString() });
const blankIdea = (): ProposalIdea => ({ id: uid('prop'), name: '', location: '', cost: 0, vibe: '', rating: 0, status: 'idea', pros: '', cons: '', notes: '', createdAt: new Date().toISOString() });

function RingModal({ initial, isNew, onClose }: { initial: Ring; isNew: boolean; onClose: () => void }) {
  const { update, state } = useStore();
  const [r, setR] = useState(initial);
  const set = <K extends keyof Ring>(k: K, v: Ring[K]) => setR((p) => ({ ...p, [k]: v }));
  const save = () => { update((s) => ({ ...s, rings: isNew ? [...s.rings, r] : s.rings.map((x) => (x.id === r.id ? r : x)) })); onClose(); };
  return (
    <Modal title={isNew ? 'Add a ring' : 'Edit ring'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!r.name.trim()} onClick={save}>Save</button></>}>
      <div className="grid g2">
        <Field label="Ring name"><input autoFocus value={r.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Oval solitaire, hidden halo" /></Field>
        <Field label="Vendor / jeweler"><input value={r.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="Blue Nile, local jeweler…" /></Field>
        <Field label="Link"><input value={r.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></Field>
        <Field label={`Price (${state.settings.currency})`}><NumInput value={r.price} onChange={(n) => set('price', n)} /></Field>
        <Field label="Stone / cut"><input value={r.stone} onChange={(e) => set('stone', e.target.value)} placeholder="Lab diamond, oval…" /></Field>
        <Field label="Carat"><input value={r.carat} onChange={(e) => set('carat', e.target.value)} placeholder="1.5" /></Field>
        <Field label="Metal"><input value={r.metal} onChange={(e) => set('metal', e.target.value)} placeholder="18k yellow gold" /></Field>
        <Field label="Style"><input value={r.style} onChange={(e) => set('style', e.target.value)} placeholder="Classic, vintage, minimal…" /></Field>
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Field label="Rating"><div><Stars value={r.rating} onChange={(n) => set('rating', n)} size={22} /></div></Field>
        <StatusPick value={r.status} onChange={(s) => set('status', s)} />
      </div>
      <div style={{ marginTop: 14 }}><Field label="Notes"><textarea value={r.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Return policy, resizing, certification, what she has said she likes…" /></Field></div>
    </Modal>
  );
}

function IdeaModal({ initial, isNew, onClose }: { initial: ProposalIdea; isNew: boolean; onClose: () => void }) {
  const { update, state } = useStore();
  const [p, setP] = useState(initial);
  const set = <K extends keyof ProposalIdea>(k: K, v: ProposalIdea[K]) => setP((x) => ({ ...x, [k]: v }));
  const save = () => { update((s) => ({ ...s, proposals: isNew ? [...s.proposals, p] : s.proposals.map((x) => (x.id === p.id ? p : x)) })); onClose(); };
  return (
    <Modal title={isNew ? 'Add a proposal idea' : 'Edit idea'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!p.name.trim()} onClick={save}>Save</button></>}>
      <div className="grid g2">
        <Field label="Idea"><input autoFocus value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sunrise hike, surprise dinner" /></Field>
        <Field label="Where"><input value={p.location} onChange={(e) => set('location', e.target.value)} placeholder="Place or city" /></Field>
        <Field label={`Estimated cost (${state.settings.currency})`}><NumInput value={p.cost} onChange={(n) => set('cost', n)} /></Field>
        <Field label="Vibe"><input value={p.vibe} onChange={(e) => set('vibe', e.target.value)} placeholder="Intimate, adventurous, family…" /></Field>
        <Field label="Rating"><div><Stars value={p.rating} onChange={(n) => set('rating', n)} size={22} /></div></Field>
        <StatusPick value={p.status} onChange={(s) => set('status', s)} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Field label="Pros"><textarea value={p.pros} onChange={(e) => set('pros', e.target.value)} /></Field>
        <Field label="Cons"><textarea value={p.cons} onChange={(e) => set('cons', e.target.value)} /></Field>
      </div>
      <div style={{ marginTop: 14 }}><Field label="Notes / logistics"><textarea value={p.notes} onChange={(e) => set('notes', e.target.value)} /></Field></div>
    </Modal>
  );
}

function RingGate() {
  const { unlockRing } = useStore();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [caught, setCaught] = useState<string | null>(null);
  const [noPics, setNoPics] = useState(false);
  const [misses, setMisses] = useState(0);
  const [tilt, setTilt] = useState(0);
  const deck = useRef<string[]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => { fetch('/api/ring/status').then((r) => r.json()).then((d) => setConfigured(!!d.configured)).catch(() => {}); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    const ok = await unlockRing(pw).catch(() => false);
    setBusy(false);
    if (ok) return;
    setPw('');
    setMisses((m) => m + 1);
    try {
      const { images } = (await (await fetch('/api/ring/gotcha')).json()) as { images: string[] };
      setNoPics(images.length === 0);
      // Shuffle-bag: show every picture once before any repeats (and never the same one twice in a row).
      if (deck.current.length === 0) {
        const last = caught;
        deck.current = [...images].sort(() => Math.random() - 0.5);
        if (deck.current.length > 1 && deck.current[deck.current.length - 1] === last) deck.current.unshift(deck.current.pop()!);
      }
      setTilt(Math.round((Math.random() * 10 - 5) * 10) / 10);
      setCaught(deck.current.length ? deck.current.pop()! : '');
    } catch { setNoPics(true); setCaught(''); }
  };

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="card" style={{ textAlign: 'center', padding: 32, marginTop: 30 }}>
        <Lock size={30} color="var(--accent)" />
        <h2 style={{ margin: '12px 0 4px' }}>This part is private</h2>
        <p className="muted small" style={{ margin: '0 0 18px' }}>Enter the password to continue.</p>
        <form onSubmit={submit} className="col">
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" aria-label="Password" />
          <button className="btn primary" type="submit" disabled={busy || !pw} style={{ justifyContent: 'center' }}>{busy ? 'Checking…' : 'Unlock'}</button>
        </form>
        {!configured && <p className="small" style={{ color: 'var(--warn)', marginTop: 14 }}>No ring password has been set on the server yet (RING_PASSWORD), so this section can’t be opened.</p>}
        {caught !== null && (
          <div className="gotcha" key={misses} style={{ ['--tilt' as any]: `${tilt}deg` }}>
            {caught ? <img src={caught} alt="" onError={() => setNoPics(true)} /> : null}
            {(noPics || !caught) && <div className="gotcha-emoji">🙈😏</div>}
            <div className="gotcha-text">HAHA You thought!</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RingProposal() {
  const { ringUnlocked } = useStore();
  return ringUnlocked ? <RingContent /> : <RingGate />;
}

function RingContent() {
  const { state, update, lockRing } = useStore();
  const [tab, setTab] = useState<'rings' | 'where' | 'prep'>('rings');
  const [ring, setRing] = useState<{ r: Ring; isNew: boolean } | null>(null);
  const [idea, setIdea] = useState<{ p: ProposalIdea; isNew: boolean } | null>(null);
  const [todo, setTodo] = useState('');
  const cur = state.settings.currency;

  const sortedRings = [...state.rings.filter((r) => r.status === 'chosen'), ...state.rings.filter((r) => r.status !== 'chosen')];
  const topRing = sortedRings.find((r) => r.status !== 'rejected');
  const live = (l: Array<{ status: Status }>) => l.filter((x) => x.status !== 'rejected').length;
  const prepDone = state.proposalChecklist.filter((c) => c.done).length;

  const setProp = (fn: (l: ChecklistItem[]) => ChecklistItem[]) => update((s) => ({ ...s, proposalChecklist: fn(s.proposalChecklist) }));

  return (
    <div className="page">
      <PageHead
        eyebrow="Just between us"
        title="Ring & Proposal"
        subtitle="Collect rings from different vendors, keep your top choice, and brainstorm the perfect place and moment to ask."
        actions={
          <>
            <button className="btn ghost" onClick={() => lockRing()} title="Lock this section"><Lock size={15} /> Lock</button>
            {tab === 'rings' && <button className="btn primary" onClick={() => setRing({ r: blankRing(), isNew: true })}><Plus size={16} /> Add ring</button>}
            {tab === 'where' && <button className="btn primary" onClick={() => setIdea({ p: blankIdea(), isNew: true })}><Plus size={16} /> Add idea</button>}
          </>
        }
      />
      <div style={{ marginBottom: 20 }}>
        <Seg value={tab} onChange={setTab} options={[{ value: 'rings', label: <><Gem size={14} /> Rings · {state.rings.length}</> }, { value: 'where', label: <><MapPin size={14} /> Where to propose · {state.proposals.length}</> }, { value: 'prep', label: `Prep list · ${prepDone}/${state.proposalChecklist.length}` }]} />
      </div>

      {tab === 'rings' && (
        <>
          {topRing && (
            <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)', background: 'linear-gradient(135deg, var(--accent-soft), var(--surface))' }}>
              <div className="eyebrow">{topRing.status === 'chosen' ? 'Our ring' : 'Top choice right now'}</div>
              <div className="row between wrap" style={{ marginTop: 8 }}>
                <div><h2>{topRing.name}</h2><div className="small muted">{[topRing.vendor, topRing.stone, topRing.carat && `${topRing.carat}ct`, topRing.metal].filter(Boolean).join(' · ')}</div></div>
                <div className="price">{money(topRing.price, cur)}</div>
              </div>
            </div>
          )}
          {state.rings.length === 0 ? (
            <Empty title="No rings yet" action={<button className="btn primary" onClick={() => setRing({ r: blankRing(), isNew: true })}><Plus size={16} /> Add the first ring</button>}>Save rings from different vendors here, compare price and style, and promote a favourite.</Empty>
          ) : (
            <div className="grid auto">
              {state.rings.map((r, i) => (
                <div key={r.id} className={`card flat ${r.status === 'rejected' ? 'opt rejected' : ''}`} style={{ display: 'block' }}>
                  <div className="row between"><div className="row" style={{ gap: 8 }}><span className="rank pill">#{i + 1}</span><StatusPill status={r.status} /></div><Stars value={r.rating} size={13} onChange={(n) => update((s) => ({ ...s, rings: s.rings.map((x) => (x.id === r.id ? { ...x, rating: n } : x)) }))} /></div>
                  <h3 style={{ margin: '10px 0 2px' }}>{r.name}</h3>
                  <div className="small muted">{[r.vendor, r.style].filter(Boolean).join(' · ') || '—'}</div>
                  <div className="small" style={{ marginTop: 6 }}>{[r.stone, r.carat && `${r.carat}ct`, r.metal].filter(Boolean).join(' · ')}</div>
                  <div className="row between" style={{ margin: '10px 0' }}><span className="price">{money(r.price, cur)}</span>{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="row small" style={{ gap: 4 }}><ExternalLink size={13} /> View</a>}</div>
                  {r.notes && <div className="small muted" style={{ marginBottom: 8 }}>{r.notes}</div>}
                  <div className="row" style={{ gap: 2 }}>
                    <button className="btn sm ghost icon" title="Make #1" onClick={() => update((s) => ({ ...s, rings: move(s.rings, i, 'top') }))}><ChevronsUp size={14} /></button>
                    <button className="btn sm ghost icon" title="Up" onClick={() => update((s) => ({ ...s, rings: move(s.rings, i, -1) }))}><ArrowUp size={14} /></button>
                    <button className="btn sm ghost icon" title="Down" onClick={() => update((s) => ({ ...s, rings: move(s.rings, i, 1) }))}><ArrowDown size={14} /></button>
                    <button className="btn sm ghost icon" title="Edit" onClick={() => setRing({ r, isNew: false })}><Pencil size={14} /></button>
                    <button className="btn sm ghost icon danger" title="Delete" onClick={() => confirm(`Delete "${r.name}"?`) && update((s) => ({ ...s, rings: s.rings.filter((x) => x.id !== r.id) }))}><Trash2 size={14} /></button>
                    <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => update((s) => ({ ...s, rings: s.rings.map((x) => (x.id === r.id ? { ...x, status: x.status === 'chosen' ? 'shortlist' : 'chosen' } : x)) }))}>{r.status === 'chosen' ? 'Unchoose' : 'Choose'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="tiny muted" style={{ marginTop: 12 }}>{live(state.rings)} still in the running.</div>
        </>
      )}

      {tab === 'where' && (
        state.proposals.length === 0 ? (
          <Empty title="No ideas yet" action={<button className="btn primary" onClick={() => setIdea({ p: blankIdea(), isNew: true })}><Plus size={16} /> Brainstorm an idea</button>}>Beach at sunrise? A trip? A quiet dinner at home? Capture every idea, then rank them.</Empty>
        ) : (
          <div className="grid auto">
            {state.proposals.map((p, i) => (
              <div key={p.id} className="card flat" style={{ opacity: p.status === 'rejected' ? 0.55 : 1 }}>
                <div className="row between"><div className="row" style={{ gap: 8 }}><span className="pill">#{i + 1}</span><StatusPill status={p.status} /></div><Stars value={p.rating} size={13} onChange={(n) => update((s) => ({ ...s, proposals: s.proposals.map((x) => (x.id === p.id ? { ...x, rating: n } : x)) }))} /></div>
                <h3 style={{ margin: '10px 0 2px' }}>{p.name}</h3>
                <div className="small muted row" style={{ gap: 6 }}>{p.location && <><MapPin size={12} />{p.location}</>}{p.vibe && <span>· {p.vibe}</span>}</div>
                <div className="price" style={{ margin: '8px 0' }}>{money(p.cost, cur)}</div>
                <div className="small">{p.pros && <div><span style={{ color: 'var(--good)' }}>+</span> {p.pros}</div>}{p.cons && <div><span style={{ color: 'var(--bad)' }}>−</span> {p.cons}</div>}</div>
                <div className="row" style={{ gap: 2, marginTop: 10 }}>
                  <button className="btn sm ghost icon" title="Make #1" onClick={() => update((s) => ({ ...s, proposals: move(s.proposals, i, 'top') }))}><ChevronsUp size={14} /></button>
                  <button className="btn sm ghost icon" title="Up" onClick={() => update((s) => ({ ...s, proposals: move(s.proposals, i, -1) }))}><ArrowUp size={14} /></button>
                  <button className="btn sm ghost icon" title="Down" onClick={() => update((s) => ({ ...s, proposals: move(s.proposals, i, 1) }))}><ArrowDown size={14} /></button>
                  <button className="btn sm ghost icon" title="Edit" onClick={() => setIdea({ p, isNew: false })}><Pencil size={14} /></button>
                  <button className="btn sm ghost icon danger" title="Delete" onClick={() => confirm(`Delete "${p.name}"?`) && update((s) => ({ ...s, proposals: s.proposals.filter((x) => x.id !== p.id) }))}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'prep' && (
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="progress" style={{ marginBottom: 10 }}><i style={{ width: `${(prepDone / Math.max(1, state.proposalChecklist.length)) * 100}%` }} /></div>
          {state.proposalChecklist.map((c) => (
            <div key={c.id} className={`check ${c.done ? 'done' : ''}`}>
              <input type="checkbox" checked={c.done} onChange={() => setProp((l) => l.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} />
              <span className="t grow">{c.title}</span>
              <button className="btn sm icon ghost danger" aria-label="Remove" onClick={() => setProp((l) => l.filter((x) => x.id !== c.id))}><Trash2 size={13} /></button>
            </div>
          ))}
          <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); if (!todo.trim()) return; setProp((l) => [...l, { id: uid('pk'), title: todo.trim(), categoryId: 'proposal', done: false, note: '' }]); setTodo(''); }}>
            <input placeholder="Add something to think about…" value={todo} onChange={(e) => setTodo(e.target.value)} />
            <button className="btn" type="submit"><Plus size={15} /></button>
          </form>
        </div>
      )}

      {ring && <RingModal key={ring.r.id} initial={ring.r} isNew={ring.isNew} onClose={() => setRing(null)} />}
      {idea && <IdeaModal key={idea.p.id} initial={idea.p} isNew={idea.isNew} onClose={() => setIdea(null)} />}
    </div>
  );
}

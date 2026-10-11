import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardCopy, Heart, HelpCircle, ImagePlus, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DesignChoice, DesignElement, DesignInspo, DesignVote, RingBrief, uid } from '../../shared/types';
import { useStore } from '../store';
import { deleteRingImage, uploadRingImage } from '../lib/ringImages';
import { fmtDate, Field, Modal } from './ui';

/** The parts of a ring that get designed. `brief` is the RingBrief field a decided choice can be copied into. */
export const ELEMENTS: Array<{ id: DesignElement; label: string; hint: string; brief?: keyof RingBrief }> = [
  { id: 'overall', label: 'Overall look', hint: 'The feeling: vintage, modern, romantic…', brief: 'description' },
  { id: 'shape', label: 'Stone shape', hint: 'Cushion, elongated cushion, oval…', brief: 'shape' },
  { id: 'setting', label: 'Setting', hint: 'Floral basket, petal count, prongs, hidden halo…', brief: 'setting' },
  { id: 'band', label: 'Band', hint: 'Width, plain or pavé, tapered, comfort fit…', brief: 'band' },
  { id: 'metal', label: 'Metal', hint: '14k / 18k yellow, white, rose, platinum', brief: 'metal' },
  { id: 'stone', label: 'Stone', hint: 'Lab vs natural, carat, color, clarity', brief: 'stone' },
  { id: 'details', label: 'Details', hint: 'Milgrain, engraving on the gallery, side stones', brief: 'details' },
  { id: 'engraving', label: 'Engraving & extras', hint: 'Words or date inside the band, finish, gift box' },
];
const EL = Object.fromEntries(ELEMENTS.map((e) => [e.id, e])) as Record<DesignElement, (typeof ELEMENTS)[number]>;

const VOTES: Array<{ id: DesignVote; label: string }> = [{ id: 'love', label: 'Love' }, { id: 'maybe', label: 'Maybe' }, { id: 'no', label: 'Not for her' }];
const VOTE_ICON = { love: Heart, maybe: HelpCircle, no: X } as const;

const blankInspo = (p: Partial<DesignInspo>): DesignInspo => ({ id: uid('dsn'), image: '', url: '', title: '', element: 'overall', vote: 'maybe', note: '', createdAt: new Date().toISOString(), ...p });

/** Builds the plain-text design brief to paste into an email or message to a jeweler. */
export function designBriefText(b: RingBrief, choices: DesignChoice[], inspo: DesignInspo[]): string {
  const lines: string[] = ['Custom engagement ring brief', ''];
  for (const e of ELEMENTS) {
    const c = choices.find((x) => x.element === e.id);
    if (!c?.choice.trim() && !c?.note.trim()) continue;
    lines.push(`${e.label}: ${c.choice.trim() || '(open)'}${c.decided ? '' : ' (still deciding)'}`);
    if (c.note.trim()) lines.push(`  Question / note: ${c.note.trim()}`);
  }
  const loved = inspo.filter((i) => i.vote === 'love');
  const avoid = inspo.filter((i) => i.vote === 'no' && i.note.trim());
  if (loved.length) lines.push('', `Inspiration I love (${loved.length} pictures, happy to send): ${[...new Set(loved.map((i) => EL[i.element].label.toLowerCase()))].join(', ')}`);
  for (const i of loved.filter((x) => x.note.trim())) lines.push(`  - ${EL[i.element].label}: ${i.note.trim()}`);
  if (avoid.length) { lines.push('', 'Please avoid:'); for (const i of avoid) lines.push(`  - ${EL[i.element].label}: ${i.note.trim()}`); }
  lines.push('');
  if (b.ringSize) lines.push(`Ring size: ${b.ringSize}`);
  if (b.needBy) lines.push(`Needed by: ${fmtDate(b.needBy)}`);
  lines.push('', 'Could you tell me what is feasible, the price for each option, resizing and warranty terms, and the turnaround?');
  return lines.join('\n');
}

/* ───────────── Inspiration card editor ───────────── */

function InspoModal({ initial, onClose }: { initial: DesignInspo; onClose: () => void }) {
  const { update } = useStore();
  const [d, setD] = useState(initial);
  const set = <K extends keyof DesignInspo>(k: K, v: DesignInspo[K]) => setD((p) => ({ ...p, [k]: v }));
  const save = () => { update((s) => ({ ...s, designInspo: s.designInspo.map((x) => (x.id === d.id ? d : x)) })); onClose(); };
  const del = () => {
    if (!confirm('Remove this from the board?')) return;
    update((s) => ({ ...s, designInspo: s.designInspo.filter((x) => x.id !== d.id) }));
    if (d.image) deleteRingImage(d.image);
    onClose();
  };
  return (
    <Modal title={d.title || 'Inspiration'} onClose={onClose} footer={<><button className="btn danger" onClick={del}><Trash2 size={14} /> Remove</button><span style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      {d.image && <img src={d.image} alt={d.title || 'Inspiration'} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, background: 'var(--accent-soft)', marginBottom: 14 }} />}
      <div className="grid g2">
        <Field label="Title"><input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Petal basket from a jeweler's page" /></Field>
        <Field label="Link (source)"><input value={d.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></Field>
      </div>
      <Field label="What is it about?"><div className="chip-pick">{ELEMENTS.map((e) => <button type="button" key={e.id} className={d.element === e.id ? 'on' : ''} onClick={() => set('element', e.id)}>{e.label}</button>)}</div></Field>
      <div style={{ marginTop: 12 }}><Field label="How does it feel for her?"><div className="chip-pick">{VOTES.map((v) => <button type="button" key={v.id} className={d.vote === v.id ? 'on' : ''} onClick={() => set('vote', v.id)}>{v.label}</button>)}</div></Field></div>
      <div style={{ marginTop: 12 }}><Field label="What you like (or don’t) about it" hint="e.g. “the six-petal shape, but thinner prongs”. This goes into the jeweler brief."><textarea value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="The detail to copy, change or avoid…" /></Field></div>
    </Modal>
  );
}

/* ───────────── The customisation sheet ───────────── */

function Sheet({ inspo, onOpen }: { inspo: DesignInspo[]; onOpen: (i: DesignInspo) => void }) {
  const { state, update, toast } = useStore();
  const b = state.ringBrief;
  const get = (el: DesignElement): DesignChoice => state.designChoices.find((c) => c.element === el) ?? { element: el, choice: '', decided: false, note: '' };
  const patch = (el: DesignElement, p: Partial<DesignChoice>) => update((s) => {
    const cur = s.designChoices.find((c) => c.element === el) ?? { element: el, choice: '', decided: false, note: '' };
    const next = { ...cur, ...p };
    return { ...s, designChoices: s.designChoices.some((c) => c.element === el) ? s.designChoices.map((c) => (c.element === el ? next : c)) : [...s.designChoices, next] };
  });
  const toBrief = (el: DesignElement) => {
    const f = EL[el].brief;
    const c = get(el);
    if (!f || !c.choice.trim()) return;
    update((s) => ({ ...s, ringBrief: { ...s.ringBrief, [f]: c.choice.trim() } }));
    toast(`Updated “${EL[el].label}” on the ring brief`);
  };
  const copy = async () => {
    const text = designBriefText(b, state.designChoices, inspo);
    try { await navigator.clipboard.writeText(text); toast('Design brief copied. Paste it into an email or message.'); } catch { window.prompt('Copy the design brief:', text); }
  };
  const decided = ELEMENTS.filter((e) => get(e.id).decided).length;

  return (
    <div className="card" style={{ marginTop: 22 }}>
      <div className="row between wrap" style={{ gap: 10 }}>
        <div>
          <h3>Customisation sheet</h3>
          <p className="small muted" style={{ margin: '4px 0 0' }}>Decide each part of the ring. Mark it decided when you’re sure; copy the result to the ring brief or send it to a jeweler.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="pill">{decided}/{ELEMENTS.length} decided</span>
          <button className="btn" onClick={copy}><ClipboardCopy size={15} /> Copy jeweler brief</button>
        </div>
      </div>
      <div className="progress" style={{ margin: '12px 0' }}><i style={{ width: `${(decided / ELEMENTS.length) * 100}%` }} /></div>
      {ELEMENTS.map((e) => {
        const c = get(e.id);
        const loved = inspo.filter((i) => i.element === e.id && i.vote === 'love' && i.image);
        const current = e.brief ? String(b[e.brief] ?? '') : '';
        return (
          <div key={e.id} className="design-row">
            <div className="design-row-head">
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={c.decided} onChange={() => patch(e.id, { decided: !c.decided })} aria-label={`${e.label} decided`} />
                <strong>{e.label}</strong>
              </label>
              {c.decided && <span className="pill chosen"><Check size={11} /> decided</span>}
            </div>
            <div className="grid g2" style={{ marginTop: 8 }}>
              <input value={c.choice} onChange={(ev) => patch(e.id, { choice: ev.target.value })} placeholder={e.hint} aria-label={`${e.label} choice`} />
              <input value={c.note} onChange={(ev) => patch(e.id, { note: ev.target.value })} placeholder="Question for the jeweler, or a worry…" aria-label={`${e.label} note`} />
            </div>
            <div className="row wrap" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
              {loved.slice(0, 6).map((i) => <button key={i.id} className="design-thumb" onClick={() => onOpen(i)} aria-label={`Open ${i.title || 'inspiration'}`}><img src={i.image} alt="" /></button>)}
              {e.brief && c.choice.trim() && c.choice.trim() !== current && <button className="btn sm" onClick={() => toBrief(e.id)}>Use on the ring brief</button>}
              {e.brief && current && <span className="tiny muted">On the brief: {current.length > 60 ? `${current.slice(0, 60)}…` : current}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── The board ───────────── */

export function DesignBoard() {
  const { state, update, toast } = useStore();
  const inspo = state.designInspo;
  const [elFilter, setElFilter] = useState<DesignElement | 'all'>('all');
  const [voteFilter, setVoteFilter] = useState<DesignVote | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [edit, setEdit] = useState<DesignInspo | null>(null);
  const [link, setLink] = useState({ open: false, url: '', title: '' });
  const file = useRef<HTMLInputElement>(null);
  const defaults = useRef({ element: 'overall' as DesignElement });
  defaults.current.element = elFilter === 'all' ? 'overall' : elFilter;

  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setBusy(true);
    const made: DesignInspo[] = [];
    for (const f of imgs) {
      try { made.push(blankInspo({ image: await uploadRingImage(f), element: defaults.current.element, title: f.name.replace(/\.[^.]+$/, '').slice(0, 60) })); } catch (e: any) { toast(`${f.name}: ${e?.message || 'could not upload'}`); }
    }
    setBusy(false);
    if (made.length) update((s) => ({ ...s, designInspo: [...made.reverse(), ...s.designInspo] }));
    if (file.current) file.current.value = '';
  };

  // Paste a screenshot straight onto the page.
  const addRef = useRef(addFiles);
  addRef.current = addFiles;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) { e.preventDefault(); addRef.current(files); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const addLink = () => {
    const url = link.url.trim();
    if (!url) return;
    update((s) => ({ ...s, designInspo: [blankInspo({ url, title: link.title.trim() || url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60), element: defaults.current.element }), ...s.designInspo] }));
    setLink({ open: false, url: '', title: '' });
  };

  const setVote = (id: string, vote: DesignVote) => update((s) => ({ ...s, designInspo: s.designInspo.map((x) => (x.id === id ? { ...x, vote } : x)) }));

  const shown = useMemo(() => inspo.filter((i) => (elFilter === 'all' || i.element === elFilter) && (voteFilter === 'all' || i.vote === voteFilter)), [inspo, elFilter, voteFilter]);
  const loved = inspo.filter((i) => i.vote === 'love').length;
  const count = (el: DesignElement) => inspo.filter((i) => i.element === el).length;
  const decided = ELEMENTS.filter((e) => state.designChoices.find((c) => c.element === e.id)?.decided).length;

  return (
    <div>
      <div className="ring-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 0 }}>
        <div className="s"><span className="tiny muted">On the board</span><b>{inspo.length}</b></div>
        <div className="s"><span className="tiny muted">Loved</span><b>{loved}</b></div>
        <div className="s"><span className="tiny muted">Parts decided</span><b>{decided}/{ELEMENTS.length}</b></div>
        <div className="s"><span className="tiny muted">Still open</span><b>{ELEMENTS.length - decided}</b></div>
      </div>

      <div
        className={`design-drop ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
      >
        <ImagePlus size={22} />
        <div>
          <strong>{busy ? 'Uploading…' : 'Drop inspiration here'}</strong>
          <div className="small muted">Drag pictures in, paste a screenshot, or choose files. New pictures are tagged{elFilter === 'all' ? ' “Overall look”' : ` “${EL[elFilter].label}”`}; change it any time.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => file.current?.click()} disabled={busy}><Plus size={15} /> Add pictures</button>
          <button className="btn" onClick={() => setLink((l) => ({ ...l, open: !l.open }))}><Link2 size={15} /> Add a link</button>
        </div>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      </div>
      {link.open && (
        <form className="row wrap" style={{ gap: 8, marginBottom: 14 }} onSubmit={(e) => { e.preventDefault(); addLink(); }}>
          <input style={{ flex: '2 1 240px' }} autoFocus value={link.url} onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))} placeholder="Paste a link (Pinterest, a jeweler’s page…)" aria-label="Link" />
          <input style={{ flex: '1 1 160px' }} value={link.title} onChange={(e) => setLink((l) => ({ ...l, title: e.target.value }))} placeholder="Title (optional)" aria-label="Title" />
          <button className="btn primary" type="submit" disabled={!link.url.trim()}>Save</button>
        </form>
      )}

      <div className="chip-pick" style={{ marginBottom: 6 }}>
        <button className={elFilter === 'all' ? 'on' : ''} onClick={() => setElFilter('all')}>All · {inspo.length}</button>
        {ELEMENTS.map((e) => <button key={e.id} className={elFilter === e.id ? 'on' : ''} onClick={() => setElFilter(e.id)}>{e.label} · {count(e.id)}</button>)}
      </div>
      <div className="chip-pick" style={{ marginBottom: 16 }}>
        <button className={voteFilter === 'all' ? 'on' : ''} onClick={() => setVoteFilter('all')}>Any feeling</button>
        {VOTES.map((v) => <button key={v.id} className={voteFilter === v.id ? 'on' : ''} onClick={() => setVoteFilter(v.id)}>{v.label} · {inspo.filter((i) => i.vote === v.id).length}</button>)}
      </div>

      {shown.length === 0 ? (
        <div className="empty"><h3>{inspo.length ? 'Nothing matches those filters' : 'Start your board'}</h3><div>{inspo.length ? 'Try a different part of the ring or feeling.' : 'Add rings you love, settings, details like milgrain, engraving ideas. Tag each by the part you want to borrow, and mark how it feels.'}</div></div>
      ) : (
        <div className="design-grid">
          {shown.map((i) => (
            <div key={i.id} className={`design-card ${i.vote}`}>
              {i.image ? (
                <button className="design-img" onClick={() => setEdit(i)} aria-label={`Open ${i.title || 'inspiration'}`}><img src={i.image} alt={i.title} loading="lazy" /></button>
              ) : (
                <a className="design-link" href={i.url} target="_blank" rel="noreferrer"><Link2 size={18} /> {i.title || i.url}</a>
              )}
              <div className="design-body">
                <div className="row between" style={{ gap: 6 }}>
                  <span className="pill">{EL[i.element].label}</span>
                  <button className="btn sm icon ghost" aria-label="Edit" onClick={() => setEdit(i)}><Pencil size={13} /></button>
                </div>
                {i.image && i.title && <div className="small" style={{ marginTop: 6, fontWeight: 500 }}>{i.title}</div>}
                {i.note && <div className="small muted" style={{ marginTop: 4 }}>{i.note}</div>}
                <div className="design-votes" role="group" aria-label="How does it feel for her?">
                  {VOTES.map((v) => { const I = VOTE_ICON[v.id]; return <button key={v.id} className={i.vote === v.id ? `on ${v.id}` : ''} title={v.label} aria-label={v.label} aria-pressed={i.vote === v.id} onClick={() => setVote(i.id, v.id)}><I size={14} /></button>; })}
                  {i.url && i.image && <a href={i.url} target="_blank" rel="noreferrer" className="tiny" style={{ marginLeft: 'auto' }}>source</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet inspo={inspo} onOpen={setEdit} />
      {edit && <InspoModal key={edit.id} initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

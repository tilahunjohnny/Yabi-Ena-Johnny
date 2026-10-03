import { useRef, useState } from 'react';
import { Clock, ExternalLink, ImagePlus, Pencil, Plus, Trash2, Trophy, Zap } from 'lucide-react';
import { Jeweler, JewelerStatus, RingBrief, RingHint, RingQuote, uid } from '../../shared/types';
import { compareJewelers, daysBetween, latestHigh, latestQuote, orderBy, readyEstimate, todayIso } from '../../shared/ringplan';
import { money } from '../../shared/logic';
import { useStore } from '../store';
import { deleteRingImage, uploadRingImage } from '../lib/ringImages';
import { Empty, Field, fmtDate, Modal, NumInput } from './ui';

/** "$9,200–$9,500" for a range, "$9,200" for a single price. */
export const priceText = (low: number, high: number | undefined, cur: string) => (high && high > low ? `${money(low, cur)}–${money(high, cur)}` : money(low, cur));

export const JEWELER_STATUS: Record<JewelerStatus, string> = { researching: 'Researching', inquired: 'Inquired', quoted: 'Quoted', ordered: 'Ordered', ready: 'Ready', passed: 'Passed' };
const STATUS_ORDER: JewelerStatus[] = ['researching', 'inquired', 'quoted', 'ordered', 'ready', 'passed'];

/* ───────────── Top dashboard: pictures, the ring she is getting, and the numbers that matter ───────────── */

export function RingDashboard() {
  const { state, update, toast } = useStore();
  const { ringBrief: b, jewelers } = state;
  const cur = state.settings.currency;
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const shown = b.images[Math.min(idx, b.images.length - 1)];

  const patch = (p: Partial<RingBrief>) => update((s) => ({ ...s, ringBrief: { ...s.ringBrief, ...p } }));
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const saved: string[] = [];
    for (const f of Array.from(files)) {
      try { saved.push(await uploadRingImage(f)); } catch (e: any) { toast(`${f.name}: ${e?.message || 'could not upload'}`); }
    }
    setBusy(false);
    if (saved.length) { update((s) => ({ ...s, ringBrief: { ...s.ringBrief, images: [...s.ringBrief.images, ...saved] } })); setIdx(b.images.length); }
    if (file.current) file.current.value = '';
  };
  const remove = (src: string) => {
    if (!confirm('Remove this picture?')) return;
    patch({ images: b.images.filter((x) => x !== src) });
    deleteRingImage(src);
    setIdx(0);
  };

  const { rows, cheapest, soonest } = compareJewelers(jewelers, b);
  const lowest = rows.filter((r) => r.price > 0).sort((x, y) => x.price - y.price)[0];
  const soon = rows.filter((r) => r.ready.date).sort((x, y) => (x.ready.date < y.ready.date ? -1 : 1))[0];
  const inquiring = jewelers.filter((j) => j.status === 'inquired' || j.status === 'quoted' || j.status === 'researching').length;
  const daysToProposal = b.proposalDate ? daysBetween(todayIso(), b.proposalDate) : null;
  void cheapest; void soonest;
  const facts: Array<[string, string]> = ([['Shape', b.shape], ['Carat', b.carat], ['Stone', b.stone], ['Color', b.color], ['Clarity', b.clarity], ['Metal', b.metal], ['Setting', b.setting], ['Band', b.band], ['Details', b.details], ['Her size', b.ringSize]] as Array<[string, string]>).filter(([, v]) => v);

  return (
    <div className="ring-hero">
      <div className="ring-gallery">
        <div className="main">
          {shown ? <img src={shown} alt={b.name || 'The ring'} /> : (
            <button className="btn" onClick={() => file.current?.click()} disabled={busy}><ImagePlus size={16} /> {busy ? 'Uploading…' : 'Add pictures of the ring'}</button>
          )}
          {shown && <button className="btn sm icon danger del" aria-label="Remove picture" onClick={() => remove(shown)}><Trash2 size={14} /></button>}
        </div>
        <div className="ring-thumbs">
          {b.images.map((src, i) => <button key={src} className={i === Math.min(idx, b.images.length - 1) ? 'on' : ''} onClick={() => setIdx(i)} aria-label={`Picture ${i + 1}`}><img src={src} alt="" /></button>)}
          {b.images.length > 0 && <button className="add" onClick={() => file.current?.click()} disabled={busy} aria-label="Add pictures"><Plus size={18} /></button>}
        </div>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>

      <div className="card" style={{ borderColor: 'var(--accent)', background: 'linear-gradient(135deg, var(--accent-soft), var(--surface))' }}>
        <div className="eyebrow">The ring I’m aiming for</div>
        <input className="ring-title" value={b.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Give it a name — e.g. The oval hidden-halo" aria-label="Ring name" style={{ width: '100%', marginTop: 8, fontFamily: 'var(--serif)', fontSize: '1.45rem', border: 0, background: 'transparent', padding: 0 }} />
        <textarea value={b.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Describe it in a sentence or two…" aria-label="Description" style={{ width: '100%', minHeight: 54, marginTop: 6, border: 0, background: 'transparent', padding: 0, resize: 'vertical' }} />
        {facts.length > 0 && <dl className="ring-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        <div className="ring-stats">
          <div className="s"><span className="tiny muted">Budget</span><b>{b.budget ? money(b.budget, cur) : '—'}</b></div>
          <div className="s"><span className="tiny muted">Lowest quote{lowest ? ` · ${lowest.j.name}` : ''}</span><b className={lowest && b.budget && lowest.high > b.budget ? 'bad-t' : ''}>{lowest ? priceText(lowest.price, lowest.high, cur) : '—'}</b></div>
          <div className="s"><span className="tiny muted">Soonest ready{soon ? ` · ${soon.j.name}` : ''}</span><b>{soon ? fmtDate(soon.ready.date) : '—'}</b></div>
          <div className="s"><span className="tiny muted">{daysToProposal !== null ? 'Proposal in' : 'Places inquiring'}</span><b>{daysToProposal !== null ? `${Math.max(0, daysToProposal)} days` : inquiring}</b></div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── What she has said + the spec of the ring ───────────── */

const KIND_LABEL: Record<RingHint['kind'], string> = { loves: 'She loves', avoids: 'She doesn’t like', size: 'Size', other: 'Other' };
const KINDS = Object.keys(KIND_LABEL) as RingHint['kind'][];

export function HerDetails() {
  const { state, update } = useStore();
  const b = state.ringBrief;
  const hints = state.ringHints;
  const [text, setText] = useState('');
  const [kind, setKind] = useState<RingHint['kind']>('loves');
  const patch = (p: Partial<RingBrief>) => update((s) => ({ ...s, ringBrief: { ...s.ringBrief, ...p } }));
  const setHints = (fn: (l: RingHint[]) => RingHint[]) => update((s) => ({ ...s, ringHints: fn(s.ringHints) }));
  const text$ = (k: keyof RingBrief, label: string, ph: string) => <Field label={label}><input value={String(b[k] ?? '')} onChange={(e) => patch({ [k]: e.target.value } as Partial<RingBrief>)} placeholder={ph} /></Field>;

  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card">
        <h3>What she’s said</h3>
        <p className="small muted" style={{ margin: '4px 0 12px' }}>Every comment, hint or screenshot-worthy moment. Jot it down while you remember it.</p>
        <form className="col" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; setHints((l) => [{ id: uid('hint'), kind, text: text.trim(), heardOn: todayIso() }, ...l]); setText(''); }}>
          <div className="chip-pick">{KINDS.map((k) => <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}</div>
          <div className="row"><input value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'size' ? 'e.g. Size 6.5 (borrowed her ring)' : 'e.g. Wants it simple, nothing too sparkly'} aria-label="What she said" /><button className="btn" type="submit"><Plus size={15} /></button></div>
        </form>
        {hints.length === 0 ? <p className="small muted" style={{ marginTop: 14 }}>Nothing yet.</p> : (
          <div style={{ marginTop: 10 }}>
            {hints.map((h) => (
              <div key={h.id} className="row between" style={{ padding: '9px 0', borderTop: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <div><span className="pill" style={{ marginRight: 8 }}>{KIND_LABEL[h.kind]}</span><span className="small">{h.text}</span>{h.heardOn && <span className="tiny muted"> · {fmtDate(h.heardOn)}</span>}</div>
                <button className="btn sm icon ghost danger" aria-label="Remove" onClick={() => setHints((l) => l.filter((x) => x.id !== h.id))}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>The ring’s spec</h3>
        <div className="grid g2" style={{ marginTop: 12 }}>
          {text$('shape', 'Shape / cut', 'Oval, emerald, round…')}
          {text$('carat', 'Carat', '1.5–2')}
          {text$('stone', 'Stone', 'Lab-grown diamond')}
          {text$('color', 'Color', 'D–F')}
          {text$('clarity', 'Clarity', 'VVS1–VVS2')}
          {text$('metal', 'Metal', '14k yellow gold')}
          {text$('setting', 'Setting', 'Solitaire, hidden halo…')}
          {text$('band', 'Band', 'Thin, pavé, plain…')}
          {text$('details', 'Other details', 'Milgrain edges…')}
          {text$('ringSize', 'Her ring size', '6.5')}
          <Field label={`Budget (${state.settings.currency})`}><NumInput value={b.budget} onChange={(n) => patch({ budget: n })} /></Field>
          <Field label="Need the ring by" hint="Drives the “too late” warnings on Timeline"><input type="date" value={b.needBy} onChange={(e) => patch({ needBy: e.target.value })} /></Field>
          <Field label="Proposal date (if set)"><input type="date" value={b.proposalDate} onChange={(e) => patch({ proposalDate: e.target.value })} /></Field>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Jewelers I'm asking, each with a running list of quotes ───────────── */

const blankJeweler = (): Jeweler => ({ id: uid('jwl'), name: '', contact: '', url: '', location: '', status: 'inquired', inquiredOn: todayIso(), spec: '', quotes: [], deposit: 0, leadWeeks: 0, orderedOn: '', quoteExpires: '', notes: '', createdAt: new Date().toISOString() });

function JewelerModal({ initial, isNew, onClose }: { initial: Jeweler; isNew: boolean; onClose: () => void }) {
  const { update, state } = useStore();
  const [j, setJ] = useState(initial);
  const [amt, setAmt] = useState(0);
  const [amtHigh, setAmtHigh] = useState(0);
  const [qnote, setQnote] = useState('');
  const set = <K extends keyof Jeweler>(k: K, v: Jeweler[K]) => setJ((p) => ({ ...p, [k]: v }));
  const addQuote = () => {
    if (!amt) return;
    const q: RingQuote = { id: uid('q'), date: todayIso(), amount: Math.min(amt, amtHigh || amt), ...(amtHigh > amt ? { amountHigh: amtHigh } : amt > amtHigh && amtHigh ? { amountHigh: amt } : {}), note: qnote.trim() };
    setJ((p) => ({ ...p, quotes: [...p.quotes, q], status: p.status === 'researching' || p.status === 'inquired' ? 'quoted' : p.status }));
    setAmt(0); setAmtHigh(0); setQnote('');
  };
  const save = () => { update((s) => ({ ...s, jewelers: isNew ? [...s.jewelers, j] : s.jewelers.map((x) => (x.id === j.id ? j : x)) })); onClose(); };
  const cur = state.settings.currency;
  return (
    <Modal title={isNew ? 'Add a jeweler' : j.name || 'Edit jeweler'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!j.name.trim()} onClick={save}>Save</button></>}>
      <div className="grid g2">
        <Field label="Jeweler / company"><input autoFocus value={j.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" /></Field>
        <Field label="Contact (who you’re talking to)"><input value={j.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Name, phone or email" /></Field>
        <Field label="Link"><input value={j.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></Field>
        <Field label="Where"><input value={j.location} onChange={(e) => set('location', e.target.value)} placeholder="City / online" /></Field>
        <Field label="Asked on"><input type="date" value={j.inquiredOn} onChange={(e) => set('inquiredOn', e.target.value)} /></Field>
        <Field label="Status"><select value={j.status} onChange={(e) => set('status', e.target.value as JewelerStatus)}>{STATUS_ORDER.map((s) => <option key={s} value={s}>{JEWELER_STATUS[s]}</option>)}</select></Field>
      </div>
      <div style={{ marginTop: 14 }}><Field label="What they quoted for"><input value={j.spec} onChange={(e) => set('spec', e.target.value)} placeholder="e.g. 1.8ct oval lab diamond, 14k yellow gold, hidden halo" /></Field></div>

      <div className="card flat" style={{ marginTop: 14 }}>
        <strong className="small">Quotes ({cur})</strong>
        {j.quotes.length === 0 && <div className="small muted" style={{ marginTop: 6 }}>No price yet.</div>}
        {j.quotes.map((q, i) => (
          <div key={q.id} className="row between" style={{ padding: '7px 0', borderTop: i ? '1px solid var(--border)' : 0 }}>
            <span className="small"><b>{priceText(q.amount, q.amountHigh, cur)}</b> <span className="muted">· {fmtDate(q.date)}{q.note ? ` · ${q.note}` : ''}{i === j.quotes.length - 1 && j.quotes.length > 1 ? ' · current' : ''}</span></span>
            <button className="btn sm icon ghost danger" aria-label="Remove quote" onClick={() => setJ((p) => ({ ...p, quotes: p.quotes.filter((x) => x.id !== q.id) }))}><Trash2 size={13} /></button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <NumInput value={amt} onChange={setAmt} prefix="$" />
          <NumInput value={amtHigh} onChange={setAmtHigh} prefix="to $" />
          <input value={qnote} onChange={(e) => setQnote(e.target.value)} placeholder="Note (e.g. after negotiating)" aria-label="Quote note" />
          <button className="btn" type="button" onClick={addQuote} disabled={!amt}><Plus size={15} /> Add quote</button>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14 }}>
        <Field label="Turnaround (weeks)" hint="From the order to the ring being done"><NumInput value={j.leadWeeks} onChange={(n) => set('leadWeeks', n)} /></Field>
        <Field label={`Deposit (${cur})`}><NumInput value={j.deposit} onChange={(n) => set('deposit', n)} /></Field>
        <Field label="Ordered on" hint="Leave empty until you place the order"><input type="date" value={j.orderedOn} onChange={(e) => set('orderedOn', e.target.value)} /></Field>
        <Field label="Quote good until"><input type="date" value={j.quoteExpires} onChange={(e) => set('quoteExpires', e.target.value)} /></Field>
      </div>
      <div style={{ marginTop: 14 }}><Field label="Notes"><textarea value={j.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Resizing, warranty, certification, how they responded…" /></Field></div>
    </Modal>
  );
}

export function useJewelerEditor() {
  const [ed, setEd] = useState<{ j: Jeweler; isNew: boolean } | null>(null);
  return {
    openNew: () => setEd({ j: blankJeweler(), isNew: true }),
    open: (j: Jeweler) => setEd({ j, isNew: false }),
    modal: ed && <JewelerModal key={ed.j.id} initial={ed.j} isNew={ed.isNew} onClose={() => setEd(null)} />,
  };
}

export function Jewelers({ editor }: { editor: ReturnType<typeof useJewelerEditor> }) {
  const { state, update } = useStore();
  const cur = state.settings.currency;
  const { jewelers, ringBrief } = state;
  if (jewelers.length === 0) return <Empty title="No jewelers yet" action={<button className="btn primary" onClick={editor.openNew}><Plus size={16} /> Add the first one</button>}>Add each place you’re asking. Log every price they quote and how long they say it will take.</Empty>;
  const sorted = [...jewelers].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  return (
    <div className="grid auto">
      {sorted.map((j) => {
        const price = latestQuote(j);
        const high = latestHigh(j);
        const ready = readyEstimate(j, ringBrief.needBy);
        return (
          <div key={j.id} className="card flat" style={{ opacity: j.status === 'passed' ? 0.55 : 1 }}>
            <div className="row between"><span className="pill">{JEWELER_STATUS[j.status]}</span><span className="tiny muted">{j.inquiredOn && `Asked ${fmtDate(j.inquiredOn)}`}</span></div>
            <h3 style={{ margin: '10px 0 2px' }}>{j.name}</h3>
            <div className="small muted">{[j.location, j.contact].filter(Boolean).join(' · ') || '—'}</div>
            {j.spec && <div className="small" style={{ marginTop: 6 }}>{j.spec}</div>}
            <div className="row between" style={{ margin: '10px 0' }}>
              <span className="price">{price ? priceText(price, high, cur) : 'No quote yet'}</span>
              {j.url && <a href={j.url} target="_blank" rel="noreferrer" className="row small" style={{ gap: 4 }}><ExternalLink size={13} /> Site</a>}
            </div>
            <div className="small muted row" style={{ gap: 6 }}><Clock size={13} />{j.leadWeeks ? `${j.leadWeeks} wk turnaround${ready.date ? ` · ready ${ready.firm ? '' : 'if ordered today: '}${fmtDate(ready.date)}` : ''}` : 'Turnaround not known'}</div>
            {ready.lateBy !== null && ready.lateBy > 0 && <div className="small bad-t" style={{ marginTop: 4 }}>{ready.lateBy} days after you need it</div>}
            <div className="row" style={{ gap: 2, marginTop: 10 }}>
              <button className="btn sm ghost icon" title="Edit / add a quote" onClick={() => editor.open(j)}><Pencil size={14} /></button>
              <button className="btn sm ghost icon danger" title="Delete" onClick={() => confirm(`Delete "${j.name}"?`) && update((s) => ({ ...s, jewelers: s.jewelers.filter((x) => x.id !== j.id) }))}><Trash2 size={14} /></button>
              <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => editor.open(j)}><Plus size={13} /> Quote</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── Compare prices + the timeline of when the ring will be done ───────────── */

export function Compare({ editor }: { editor: ReturnType<typeof useJewelerEditor> }) {
  const { state } = useStore();
  const cur = state.settings.currency;
  const b = state.ringBrief;
  const { rows, cheapest, soonest } = compareJewelers(state.jewelers, b);
  const log = state.jewelers.flatMap((j) => j.quotes.map((q) => ({ j, q }))).sort((a, c) => (a.q.date < c.q.date ? 1 : a.q.date > c.q.date ? -1 : 0));
  if (state.jewelers.length === 0) return <Empty title="Nothing to compare yet">Add a jeweler on the Jewelers tab and log what they quote.</Empty>;

  const today = todayIso();
  const dates = rows.map((r) => r.ready.date).concat(b.needBy ? [b.needBy] : []).filter(Boolean);
  const end = dates.length ? dates.reduce((a, c) => (c > a ? c : a)) : '';
  const span = end ? Math.max(1, daysBetween(today, end)) : 1;
  const pct = (iso: string) => Math.min(100, Math.max(0, (daysBetween(today, iso) / span) * 100));

  return (
    <div className="col" style={{ gap: 20 }}>
      <div className="card">
        <h3>Side by side</h3>
        <div className="cmp" style={{ marginTop: 8 }}>
          <table>
            <thead><tr><th style={{ width: 'auto' }}>Jeweler</th><th style={{ width: 'auto' }}>Current quote</th><th style={{ width: 'auto' }}>vs budget</th><th style={{ width: 'auto' }}>Deposit</th><th style={{ width: 'auto' }}>Turnaround</th><th style={{ width: 'auto' }}>Ready</th><th style={{ width: 'auto' }}>Order by</th></tr></thead>
            <tbody>
              {rows.map(({ j, price, high, change, ready, vsBudget }) => {
                const ob = orderBy(j, b.needBy);
                return (
                  <tr key={j.id}>
                    <td><a href="#" onClick={(e) => { e.preventDefault(); editor.open(j); }}><b>{j.name}</b></a><div className="tiny muted">{JEWELER_STATUS[j.status]}{j.spec ? ` · ${j.spec}` : ''}</div></td>
                    <td>{price ? <><b>{priceText(price, high, cur)}</b>{j.id === cheapest && rows.filter((r) => r.price).length > 1 && <span className="pill" style={{ marginLeft: 6 }}><Trophy size={11} /> lowest</span>}{change !== 0 && <div className={`tiny ${change < 0 ? 'good-t' : 'bad-t'}`}>{change < 0 ? '↓' : '↑'} {money(Math.abs(change), cur)} since first quote</div>}</> : '—'}</td>
                    <td>{vsBudget === null ? '—' : <span className={vsBudget > 0 ? 'bad-t' : 'good-t'}>{vsBudget > 0 ? '+' : '−'}{money(Math.abs(vsBudget), cur)}</span>}</td>
                    <td>{j.deposit ? money(j.deposit, cur) : '—'}</td>
                    <td>{j.leadWeeks ? `${j.leadWeeks} wk` : '—'}</td>
                    <td>{ready.date ? <>{fmtDate(ready.date)}{j.id === soonest && rows.filter((r) => r.ready.date).length > 1 && <span className="pill" style={{ marginLeft: 6 }}><Zap size={11} /> soonest</span>}<div className={`tiny ${ready.lateBy !== null && ready.lateBy > 0 ? 'bad-t' : 'muted'}`}>{ready.firm ? 'ordered' : 'if ordered today'}{ready.lateBy !== null ? (ready.lateBy > 0 ? ` · ${ready.lateBy}d late` : ' · in time') : ''}</div></> : '—'}</td>
                    <td>{ob ? <span className={ob < today && j.status !== 'ordered' && j.status !== 'ready' ? 'bad-t' : ''}>{fmtDate(ob)}</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {end && (
        <div className="card">
          <h3>When the ring will be done</h3>
          <p className="small muted" style={{ margin: '4px 0 12px' }}>From today{b.needBy ? ', with the day you need it marked' : ''}. Not-yet-ordered jewelers assume you order today.</p>
          {rows.filter((r) => r.ready.date).map(({ j, ready }) => (
            <div key={j.id} style={{ marginBottom: 12 }}>
              <div className="row between small"><b>{j.name}</b><span className={ready.lateBy !== null && ready.lateBy > 0 ? 'bad-t' : 'muted'}>{fmtDate(ready.date)}{ready.lateBy !== null && (ready.lateBy > 0 ? ` · ${ready.lateBy} days late` : ' · in time')}</span></div>
              <div className="tl"><i style={{ width: `${pct(ready.date)}%`, opacity: ready.firm ? 1 : 0.55 }} />{b.needBy && <span className="mark" title={`Need by ${fmtDate(b.needBy)}`} style={{ left: `${pct(b.needBy)}%` }} />}</div>
            </div>
          ))}
          {b.needBy && <div className="tiny muted"><span style={{ display: 'inline-block', width: 2, height: 11, background: 'var(--text)', verticalAlign: 'middle', marginRight: 6 }} />Need it by {fmtDate(b.needBy)}</div>}
        </div>
      )}

      <div className="card">
        <h3>Every price quoted</h3>
        {log.length === 0 ? <p className="small muted">No quotes logged yet.</p> : (
          <div className="cmp" style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th style={{ width: 'auto' }}>Date</th><th style={{ width: 'auto' }}>Jeweler</th><th style={{ width: 'auto' }}>Price</th><th style={{ width: 'auto' }}>Note</th></tr></thead>
              <tbody>{log.map(({ j, q }) => <tr key={q.id}><td>{fmtDate(q.date)}</td><td>{j.name}</td><td><b>{priceText(q.amount, q.amountHigh, cur)}</b></td><td className="muted">{q.note || '—'}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

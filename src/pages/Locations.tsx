import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ImagePlus, MapPin, Pencil, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { Place, PlaceKind, Status, uid } from '../../shared/types';
import { KIND_LABEL, classifyLink } from '../../shared/places';
import { detectSource, normalizeUrl } from '../../shared/ideas';
import { money } from '../../shared/logic';
import { useStore } from '../store';
import { fetchPreview, uploadIdeaImage } from '../lib/ideas';
import { Empty, Field, Modal, NumInput, PageHead, Seg, Stars, STATUSES, STATUS_LABEL, StatusPill } from '../components/ui';

const KINDS: PlaceKind[] = ['ceremony', 'reception', 'both', 'other'];
const blank = (kind: PlaceKind = 'reception'): Place => ({ id: uid('place'), name: '', kind, url: '', location: '', country: '', image: '', capacity: 0, cost: 0, status: 'idea', rating: 0, note: '', createdAt: new Date().toISOString() });

/** "Hacienda de las Flores | Wedding Venue – Wedgewood" → "Hacienda de las Flores". */
const cleanTitle = (t: string) => t.split(/\s+[|–—-]\s+/)[0].trim();

function PlaceModal({ initial, isNew, onClose }: { initial: Place; isNew: boolean; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Place>(k: K, v: Place[K]) => setP((x) => ({ ...x, [k]: v }));
  const save = () => {
    const url = p.url ? normalizeUrl(p.url) || p.url : '';
    const final = { ...p, url, name: p.name.trim() };
    update((s) => ({ ...s, places: isNew ? [final, ...s.places] : s.places.map((x) => (x.id === final.id ? final : x)) }));
    toast(isNew ? 'Added to Locations' : 'Saved');
    onClose();
  };
  return (
    <Modal title={isNew ? 'Add a location' : 'Edit location'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!p.name.trim() || busy} onClick={save}>Save</button></>}>
      <Field label="What is it for?">
        <div className="chip-pick">{KINDS.map((k) => <button type="button" key={k} className={p.kind === k ? 'on' : ''} onClick={() => set('kind', k)}>{KIND_LABEL[k]}</button>)}</div>
      </Field>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Field label="Name"><input autoFocus value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. St. Mary’s Chapel" /></Field>
        <Field label="Link"><input value={p.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></Field>
        <Field label="City / area"><input value={p.location} onChange={(e) => set('location', e.target.value)} /></Field>
        <Field label="Country"><input value={p.country} onChange={(e) => set('country', e.target.value)} placeholder={state.settings.homeCountry} /></Field>
        <Field label="Holds (guests)"><NumInput value={p.capacity} onChange={(n) => set('capacity', n)} /></Field>
        <Field label={`Rough cost (${state.settings.currency})`}><NumInput value={p.cost} onChange={(n) => set('cost', n)} /></Field>
        <Field label="Status"><div className="chip-pick">{STATUSES.map((s) => <button type="button" key={s} className={p.status === s ? 'on' : ''} onClick={() => set('status', s)}>{STATUS_LABEL[s]}</button>)}</div></Field>
        <Field label="Rating"><div><Stars value={p.rating} onChange={(n) => set('rating', n)} size={22} /></div></Field>
      </div>
      <div style={{ marginTop: 14 }}><Field label="Notes"><textarea value={p.note} onChange={(e) => set('note', e.target.value)} placeholder="What we liked, questions to ask, who visited…" /></Field></div>
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <div className="idea-thumb" style={{ width: 120 }}>{p.image ? <img src={p.image} alt="" referrerPolicy="no-referrer" /> : <span className="muted tiny">No picture</span>}</div>
        <button type="button" className="btn sm" disabled={busy} onClick={() => file.current?.click()}><ImagePlus size={14} /> {p.image ? 'Replace' : 'Add a picture'}</button>
        {p.image && <button type="button" className="btn sm ghost danger" onClick={() => set('image', '')}>Remove</button>}
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          setBusy(true);
          try { set('image', await uploadIdeaImage(f)); } catch (err: any) { toast(err?.message || 'Could not use that picture'); } finally { setBusy(false); }
        }} />
      </div>
    </Modal>
  );
}

export default function Locations() {
  const { state, update, toast } = useStore();
  const [filter, setFilter] = useState<'all' | PlaceKind>('all');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ask, setAsk] = useState<{ url: string; title: string; image: string; note: string; siteName: string } | null>(null);
  const [edit, setEdit] = useState<{ p: Place; isNew: boolean } | null>(null);
  const [fresh, setFresh] = useState('');
  const cur = state.settings.currency;
  const places = state.places;

  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, places.filter((p) => p.kind === k).length])) as Record<PlaceKind, number>, [places]);

  const addPlace = (kind: PlaceKind, d: { url: string; title: string; image: string; note: string; siteName: string }) => {
    const place: Place = { ...blank(kind), name: cleanTitle(d.title) || d.siteName || 'New location', url: d.url, image: d.image, note: d.note.slice(0, 300) };
    update((s) => ({ ...s, places: [place, ...s.places] }));
    setFresh(place.id);
    setTimeout(() => setFresh(''), 2500);
    setAsk(null);
    setLink('');
    setMsg(`Filed “${place.name}” under ${KIND_LABEL[kind]}. Not right? Change it on the card.`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(link);
    if (!url) { setMsg('Paste a full web link (like https://…).'); return; }
    if (places.some((p) => p.url === url)) { setMsg('That link is already on the list.'); return; }
    setBusy(true); setMsg(''); setAsk(null);
    let d = { url, title: '', image: '', note: '', siteName: new URL(url).hostname.replace(/^www\./, '') };
    try {
      const p = await fetchPreview(url);
      d = { url: p.url, title: p.title, image: p.image, note: p.description ?? '', siteName: p.siteName || d.siteName };
    } catch { /* still file it from the address alone */ }
    setBusy(false);
    const v = classifyLink(d.url, d.title, d.note);
    if (v.destination === 'idea') { setAsk(d); setMsg(`This looks more like inspiration (${v.reason}), not a specific place.`); return; }
    addPlace(v.destination, d);
  };

  const patch = (id: string, p: Partial<Place>) => update((s) => ({ ...s, places: s.places.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const remove = (p: Place) => confirm(`Delete "${p.name}"?`) && update((s) => ({ ...s, places: s.places.filter((x) => x.id !== p.id) }));

  const shownKinds = filter === 'all' ? KINDS : [filter];
  const total = places.length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Where"
        title="Locations"
        subtitle="Every place we’re thinking about. Paste a link and it lands in the right spot: ceremony, reception, or both."
        actions={<button className="btn primary" onClick={() => setEdit({ p: blank(), isNew: true })}><Plus size={16} /> Add by hand</button>}
      />

      <form className="card flat" onSubmit={submit} style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a link to a venue, church, chapel, hotel…" aria-label="Link" />
          <button className="btn primary" type="submit" disabled={busy || !link.trim()}><Sparkles size={15} /> {busy ? 'Reading…' : 'File it'}</button>
        </div>
        {msg && <div className="small muted" style={{ marginTop: 8 }}>{msg}</div>}
        {ask && (
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            <span className="small">Add it as:</span>
            {KINDS.slice(0, 3).map((k) => <button key={k} type="button" className="btn sm" onClick={() => addPlace(k, ask)}>{KIND_LABEL[k]}</button>)}
            <button type="button" className="btn sm ghost" onClick={() => {
              update((s) => ({ ...s, ideas: [{ id: uid('idea'), url: ask.url, title: cleanTitle(ask.title) || ask.siteName, note: ask.note.slice(0, 300), image: ask.image, source: detectSource(ask.url), siteName: ask.siteName, tags: [], categoryId: '', favorite: false, revisitMonths: 0, createdAt: new Date().toISOString() }, ...s.ideas] }));
              setAsk(null); setLink(''); setMsg('Saved to the Idea Board instead.'); toast('Saved to the Idea Board');
            }}>Idea Board instead</button>
          </div>
        )}
      </form>

      <div style={{ marginBottom: 18, overflowX: 'auto' }}>
        <Seg value={filter} onChange={setFilter} options={[
          { value: 'all', label: `All · ${total}` },
          { value: 'ceremony', label: `Ceremony · ${counts.ceremony}` },
          { value: 'reception', label: `Reception · ${counts.reception}` },
          { value: 'both', label: `Both · ${counts.both}` },
        ]} />
      </div>

      {total === 0 ? (
        <Empty title="No locations yet" action={<button className="btn primary" onClick={() => setEdit({ p: blank(), isNew: true })}><Plus size={16} /> Add the first one</button>}>
          Paste a link above, or add a place by hand. Ceremony sites and reception venues are kept in separate lists so you can compare them side by side.
        </Empty>
      ) : (
        shownKinds.map((k) => {
          const list = places.filter((p) => p.kind === k);
          if (!list.length && (filter === 'all' || k === 'other')) return null;
          return (
            <section key={k} style={{ marginBottom: 26 }}>
              <h2 style={{ marginBottom: 12 }}>{KIND_LABEL[k]} <span className="muted small" style={{ fontFamily: 'var(--sans)' }}>· {list.length}</span></h2>
              {list.length === 0 ? <p className="small muted">Nothing here yet.</p> : (
                <div className="grid auto">
                  {list.map((p) => (
                    <div key={p.id} className="card flat" style={{ opacity: p.status === 'rejected' ? 0.55 : 1, outline: fresh === p.id ? '2px solid var(--accent)' : undefined }}>
                      {p.image && <div className="idea-thumb" style={{ marginBottom: 10 }}><img src={p.image} alt="" referrerPolicy="no-referrer" /></div>}
                      <div className="row between"><StatusPill status={p.status} /><Stars value={p.rating} size={13} onChange={(n) => patch(p.id, { rating: n })} /></div>
                      <h3 style={{ margin: '10px 0 2px' }}>{p.name}</h3>
                      <div className="small muted row wrap" style={{ gap: 8 }}>
                        {(p.location || p.country) && <span className="row" style={{ gap: 3 }}><MapPin size={12} />{[p.location, p.country].filter(Boolean).join(', ')}</span>}
                        {p.capacity > 0 && <span className="row" style={{ gap: 3 }}><Users size={12} />{p.capacity}</span>}
                        {p.cost > 0 && <span>{money(p.cost, cur)}</span>}
                      </div>
                      {p.note && <div className="small muted" style={{ marginTop: 6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.note}</div>}
                      <div className="row" style={{ gap: 6, marginTop: 12 }}>
                        <select value={p.kind} onChange={(e) => patch(p.id, { kind: e.target.value as PlaceKind })} aria-label="Move to" style={{ width: 'auto', padding: '5px 8px', fontSize: 12.5 }}>
                          {KINDS.map((x) => <option key={x} value={x}>{KIND_LABEL[x]}</option>)}
                        </select>
                        <select value={p.status} onChange={(e) => patch(p.id, { status: e.target.value as Status })} aria-label="Status" style={{ width: 'auto', padding: '5px 8px', fontSize: 12.5 }}>
                          {STATUSES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}
                        </select>
                        <span style={{ marginLeft: 'auto' }} className="row">
                          {p.url && <a className="btn sm ghost icon" href={p.url} target="_blank" rel="noreferrer" title="Open link"><ExternalLink size={14} /></a>}
                          <button className="btn sm ghost icon" title="Edit" onClick={() => setEdit({ p, isNew: false })}><Pencil size={14} /></button>
                          <button className="btn sm ghost icon danger" title="Delete" onClick={() => remove(p)}><Trash2 size={14} /></button>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
      <div className="tiny muted">Comparing prices by day for a venue? Use <Link to="/c/venue">Wedding Venues & Locations</Link>.</div>
      {edit && <PlaceModal key={edit.p.id} initial={edit.p} isNew={edit.isNew} onClose={() => setEdit(null)} />}
    </div>
  );
}

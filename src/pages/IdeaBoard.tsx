import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ExternalLink, ImagePlus, Link2, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Idea, IdeaSource, uid } from '../../shared/types';
import { SOURCES, detectSource, normalizeUrl } from '../../shared/ideas';
import { addMonths } from '../../shared/seed';
import { today, visibleCategories } from '../../shared/logic';
import { useStore } from '../store';
import { Empty, Field, fmtMonthYear, Modal, PageHead, Seg, tint } from '../components/ui';
import { fetchPreview, uploadIdeaImage } from '../lib/ideas';

const REVISIT = [0, 12, 9, 6, 4, 3, 2, 1];
const blank = (url = ''): Idea => ({ id: uid('idea'), url, title: '', note: '', image: '', source: url ? detectSource(url) : 'other', siteName: '', tags: [], categoryId: '', favorite: false, revisitMonths: 0, createdAt: new Date().toISOString() });

function IdeaModal({ initial, isNew, autoFetch, onClose }: { initial: Idea; isNew: boolean; autoFetch: boolean; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [d, setD] = useState<Idea>(initial);
  const [tagText, setTagText] = useState(initial.tags.join(', '));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Idea>(k: K, v: Idea[K]) => setD((p) => ({ ...p, [k]: v }));
  const allTags = useMemo(() => Array.from(new Set(state.ideas.flatMap((i) => i.tags))), [state.ideas]);

  const doFetch = async (url = d.url) => {
    const clean = normalizeUrl(url);
    if (!clean) { setNote('Paste a full web link first.'); return; }
    setBusy(true); setNote('');
    try {
      const p = await fetchPreview(clean);
      setD((x) => ({ ...x, url: p.url, source: p.source, siteName: p.siteName || x.siteName, title: x.title || p.title, note: x.note || (p.description ?? '').slice(0, 300), image: x.image || p.image }));
      setNote(p.error ? `Couldn’t read details from that site (${p.error}). The link is saved: add a title and picture yourself.` : p.title ? 'Details filled in. Edit anything you like.' : 'Saved the link. Add a title and note below.');
    } catch (e: any) { setNote(e.message || 'Could not read that link.'); } finally { setBusy(false); }
  };
  useEffect(() => { if (autoFetch && initial.url) doFetch(initial.url); /* eslint-disable-next-line */ }, []);

  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { set('image', await uploadIdeaImage(f)); } catch (e: any) { setNote(e.message || 'Could not use that picture.'); } finally { setBusy(false); }
  };

  const save = () => {
    const url = d.url ? normalizeUrl(d.url) || d.url : '';
    const title = d.title.trim() || d.siteName || (url ? new URL(url).hostname.replace(/^www\./, '') : '');
    if (!title) return;
    const tags = Array.from(new Set(tagText.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)));
    const final: Idea = { ...d, url, title, tags, source: url ? detectSource(url) : d.source };
    update((s) => ({ ...s, ideas: isNew ? [final, ...s.ideas] : s.ideas.map((x) => (x.id === final.id ? final : x)) }));
    toast(isNew ? 'Saved to your idea board' : 'Saved');
    onClose();
  };

  return (
    <Modal title={isNew ? 'Save an idea' : 'Edit idea'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy || (!d.title.trim() && !d.url.trim() && !d.siteName)}>{isNew ? 'Save idea' : 'Save changes'}</button></>}>
      <Field label="Link">
        <div className="row" style={{ gap: 8 }}>
          <input autoFocus={!autoFetch} value={d.url} onChange={(e) => set('url', e.target.value)} onBlur={() => { if (d.url && !d.title && !busy) doFetch(); }} placeholder="Paste an Instagram, Pinterest, TikTok, YouTube or article link" />
          <button type="button" className="btn" onClick={() => doFetch()} disabled={busy || !d.url.trim()}><Link2 size={14} /> {busy ? 'Reading…' : 'Fetch details'}</button>
        </div>
      </Field>
      {note && <div className="small muted" style={{ margin: '8px 0 0' }}>{note}</div>}

      <div className="grid g2" style={{ marginTop: 14, alignItems: 'start' }}>
        <div className="col" style={{ gap: 12 }}>
          <Field label="Title"><input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="What is it?" /></Field>
          <Field label="Why we like it / notes"><textarea value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="The arch, the colours, the menu idea…" style={{ minHeight: 96 }} /></Field>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <div className="tiny muted" style={{ letterSpacing: '.03em', textTransform: 'uppercase', fontWeight: 500 }}>Picture</div>
          <div className="idea-thumb">{d.image ? <img src={d.image} alt="" referrerPolicy="no-referrer" /> : <span className="muted small">No picture yet</span>}</div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn sm" onClick={() => file.current?.click()} disabled={busy}><ImagePlus size={14} /> {d.image ? 'Replace' : 'Upload a picture'}</button>
            {d.image && <button type="button" className="btn sm ghost danger" onClick={() => set('image', '')}>Remove</button>}
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14 }}>
        <Field label="Tags" hint="Comma separated: florals, arch, menu…">
          <input list="idea-tags" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="florals, arch" />
          <datalist id="idea-tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Belongs to">
          <select value={d.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">General inspiration</option>
            {visibleCategories(state).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Look at this again…" hint="Shows up as a reminder as that point approaches.">
          <select value={d.revisitMonths} onChange={(e) => set('revisitMonths', Number(e.target.value))}>
            {REVISIT.map((m) => <option key={m} value={m}>{m === 0 ? 'No reminder' : `${m} month${m > 1 ? 's' : ''} before the wedding`}</option>)}
          </select>
        </Field>
        <Field label="Saved">
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <button type="button" className={`btn ${d.favorite ? 'primary' : ''}`} onClick={() => set('favorite', !d.favorite)}><Star size={14} fill={d.favorite ? 'currentColor' : 'none'} /> {d.favorite ? 'Favourite' : 'Mark as favourite'}</button>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

export default function IdeaBoard() {
  const { state, update, scenarioId } = useStore();
  const [q, setQ] = useState('');
  const [onlySaved, setOnlySaved] = useState<'all' | 'fav'>('all');
  const [src, setSrc] = useState<'all' | IdeaSource>('all');
  const [cat, setCat] = useState('all');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<'new' | 'revisit'>('new');
  const [quick, setQuick] = useState('');
  const [quickErr, setQuickErr] = useState('');
  const [editing, setEditing] = useState<{ idea: Idea; isNew: boolean; autoFetch: boolean } | null>(null);

  // The date reminders count back from: the plan you're viewing, otherwise the next upcoming plan.
  const plan = state.scenarios.find((s) => s.id === scenarioId) ?? [...state.scenarios].filter((s) => s.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0] ?? state.scenarios[0];
  const revisitDate = (i: Idea) => (plan && i.revisitMonths > 0 ? addMonths(plan.date, -i.revisitMonths) : '');
  const soon = addMonths(today(), 1);
  const due = state.ideas.filter((i) => revisitDate(i) && revisitDate(i) <= soon).sort((a, b) => revisitDate(a).localeCompare(revisitDate(b)));

  const tags = useMemo(() => { const m = new Map<string, number>(); state.ideas.forEach((i) => i.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14); }, [state.ideas]);
  const sources = useMemo(() => Array.from(new Set(state.ideas.map((i) => i.source))), [state.ideas]);

  let list = state.ideas.filter((i) => {
    const hay = `${i.title} ${i.note} ${i.siteName} ${i.tags.join(' ')}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (onlySaved === 'all' || i.favorite) && (src === 'all' || i.source === src) && (cat === 'all' || i.categoryId === cat) && (!tag || i.tags.includes(tag));
  });
  if (sort === 'revisit') list = [...list].sort((a, b) => (revisitDate(a) || '9999').localeCompare(revisitDate(b) || '9999'));

  const addQuick = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(quick);
    if (!url) { setQuickErr('Paste a full link, like https://www.instagram.com/p/…'); return; }
    setQuickErr(''); setQuick('');
    setEditing({ idea: blank(url), isNew: true, autoFetch: true });
  };
  const patch = (id: string, p: Partial<Idea>) => update((s) => ({ ...s, ideas: s.ideas.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const catName = (id: string) => state.categories.find((c) => c.id === id);

  return (
    <div className="page">
      <PageHead eyebrow="Plan" title="Idea board" subtitle="Save articles, Instagram posts, Pinterest pins and videos in one place. Tag them, mark favourites, and set a reminder so they come back when you’re close to the date."
        actions={<button className="btn primary" onClick={() => setEditing({ idea: blank(), isNew: true, autoFetch: false })}><Plus size={16} /> Save an idea</button>} />

      <form className="card" onSubmit={addQuick} style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10 }}>
          <Link2 size={18} color="var(--muted)" />
          <input value={quick} onChange={(e) => { setQuick(e.target.value); setQuickErr(''); }} placeholder="Paste a link and press Enter. We’ll grab the title and picture for you." aria-label="Paste a link" />
          <button className="btn primary" type="submit" disabled={!quick.trim()}>Save</button>
        </div>
        {quickErr && <div className="small" style={{ color: 'var(--bad)', marginTop: 8 }}>{quickErr}</div>}
      </form>

      {due.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
          <div className="row" style={{ gap: 8 }}><Bell size={16} color="var(--accent)" /><strong>Time to take another look</strong><span className="tiny muted">counting from {plan?.name}</span></div>
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            {due.map((i) => <button key={i.id} className="tierchip" onClick={() => setEditing({ idea: i, isNew: false, autoFetch: false })}><span>{i.title.length > 40 ? i.title.slice(0, 40) + '…' : i.title}</span> <i>{fmtMonthYear(revisitDate(i))}</i></button>)}
          </div>
        </div>
      )}

      {state.ideas.length > 0 && (
        <div className="col" style={{ gap: 12, marginBottom: 18 }}>
          <div className="row wrap" style={{ gap: 10 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ideas…" aria-label="Search ideas" style={{ maxWidth: 260 }} />
            <Seg value={onlySaved} onChange={setOnlySaved} options={[{ value: 'all', label: 'All' }, { value: 'fav', label: '★ Favourites' }]} />
            <select value={src} onChange={(e) => setSrc(e.target.value as any)} style={{ width: 'auto' }} aria-label="Source"><option value="all">All sources</option>{sources.map((s) => <option key={s} value={s}>{SOURCES[s].label}</option>)}</select>
            <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 'auto' }} aria-label="Category"><option value="all">All categories</option><option value="">General</option>{visibleCategories(state).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <Seg value={sort} onChange={setSort} options={[{ value: 'new', label: 'Newest' }, { value: 'revisit', label: 'Revisit soonest' }]} />
          </div>
          {tags.length > 0 && <div className="chip-pick" style={{ marginTop: 0 }}>{tags.map(([t, n]) => <button key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(tag === t ? '' : t)}>#{t} · {n}</button>)}</div>}
        </div>
      )}

      {state.ideas.length === 0 ? (
        <Empty title="Nothing saved yet" action={<button className="btn primary" onClick={() => setEditing({ idea: blank(), isNew: true, autoFetch: false })}><Plus size={16} /> Save your first idea</button>}>
          Paste a link above, or save one by hand. Instagram and Pinterest sometimes won’t share a thumbnail; you can upload a screenshot instead.
        </Empty>
      ) : list.length === 0 ? <div className="muted">Nothing matches those filters.</div> : (
        <div className="masonry">
          {list.map((i) => {
            const c = i.categoryId ? catName(i.categoryId) : undefined;
            const rv = revisitDate(i);
            return (
              <article key={i.id} className="idea card flat">
                {i.image ? <img className="idea-img" src={i.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <div className="idea-ph"><span>{SOURCES[i.source].label}</span></div>}
                <div className="idea-body">
                  <div className="row between" style={{ gap: 8 }}>
                    <span className="pill">{SOURCES[i.source].label}</span>
                    <button className="btn sm icon ghost" aria-label={i.favorite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={i.favorite} onClick={() => patch(i.id, { favorite: !i.favorite })} style={{ color: i.favorite ? 'var(--accent)' : undefined }}><Star size={15} fill={i.favorite ? 'currentColor' : 'none'} /></button>
                  </div>
                  <h3 className="idea-title">{i.url ? <a href={i.url} target="_blank" rel="noreferrer">{i.title}</a> : i.title}</h3>
                  {i.siteName && <div className="tiny muted">{i.siteName}</div>}
                  {i.note && <p className="small idea-note">{i.note}</p>}
                  <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                    {c && <Link to={`/c/${c.id}`} className="pill" style={{ color: tint(c.color) }}>{c.name}</Link>}
                    {rv && <span className="pill"><Bell size={10} /> {fmtMonthYear(rv)}</span>}
                    {i.tags.map((t) => <button key={t} className="pill" onClick={() => setTag(t)} style={{ cursor: 'pointer' }}>#{t}</button>)}
                  </div>
                  <div className="row" style={{ gap: 2, marginTop: 10 }}>
                    {i.url && <a className="btn sm ghost" href={i.url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open</a>}
                    <span className="grow" />
                    <button className="btn sm icon ghost" aria-label="Edit" onClick={() => setEditing({ idea: i, isNew: false, autoFetch: false })}><Pencil size={14} /></button>
                    <button className="btn sm icon ghost danger" aria-label="Delete" onClick={() => confirm(`Remove “${i.title}” from the board?`) && update((s) => ({ ...s, ideas: s.ideas.filter((x) => x.id !== i.id) }))}><Trash2 size={14} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && <IdeaModal key={editing.idea.id} initial={editing.idea} isNew={editing.isNew} autoFetch={editing.autoFetch} onClose={() => setEditing(null)} />}
    </div>
  );
}

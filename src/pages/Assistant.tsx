import { useEffect, useRef, useState } from 'react';
import { FileText, MessageSquarePlus, Paperclip, Send, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { AppState, Chat, ChatMessage, uid } from '../../shared/types';
import { useStore } from '../store';
import { PageHead } from '../components/ui';
import { visibleCategories } from '../../shared/logic';
import { ACCEPT, fileToBase64, fmtSize, screenFiles } from '../lib/attach';

const SUGGESTIONS = [
  'Add this venue: https://… and rank it against the others',
  'Read my attached price sheet and add each venue with its prices by day',
  'Compare my top 3 venues — which is best value for 120 guests?',
  'Add Meron to Yabi’s side of the guest list as a maybe',
  'Which of my venues are out of the country, and what’s the cheapest one abroad?',
  'If we go earlier, which options stop working? Log it in the decision tree.',
];

export default function Assistant() {
  const { state, update, replace } = useStore();
  const [activeId, setActiveId] = useState<string>(state.chats[0]?.id ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState('venue'); // which category files should be added to ('auto' lets Claude decide)
  const fileInput = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const chat = state.chats.find((c) => c.id === activeId);

  useEffect(() => { fetch('/api/chat/status').then((r) => r.json()).then(setStatus).catch(() => setStatus({ configured: false, model: '' })); }, []);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [chat?.messages.length, busy]);

  const newChat = () => {
    const c: Chat = { id: uid('chat'), title: 'New conversation', messages: [], updatedAt: new Date().toISOString() };
    update((s) => ({ ...s, chats: [c, ...s.chats] }));
    setActiveId(c.id);
  };

  const withMessage = (s: AppState, chatId: string, m: ChatMessage, title?: string): AppState => ({
    ...s,
    chats: s.chats.map((c) => (c.id === chatId ? { ...c, title: title ?? c.title, messages: [...c.messages, m], updatedAt: m.createdAt } : c)),
  });

  const addFiles = (list: FileList | File[]) => {
    const { keep, error: err } = screenFiles(files, Array.from(list));
    setFileError(err);
    if (keep.length) setFiles((f) => [...f, ...keep]);
  };

  const send = async (content: string) => {
    const attached = files;
    const catName = state.categories.find((c) => c.id === target)?.name;
    let msg = content.trim();
    if (!msg && attached.length) msg = target === 'auto'
      ? 'Please read the attached file(s) and add every option you find to the planner, with prices by day of the week where they differ.'
      : `Please read the attached file(s) and add every option you find to ${catName}, with prices by day of the week where they differ.`;
    else if (msg && attached.length && target !== 'auto') msg += ` (Add anything from the attached files to ${catName}.)`;
    if (!msg || busy) return;
    setError('');
    let id = chat?.id;
    let base = state;
    if (!id) {
      const c: Chat = { id: uid('chat'), title: msg.slice(0, 42), messages: [], updatedAt: new Date().toISOString() };
      base = { ...state, chats: [c, ...state.chats] };
      id = c.id;
      setActiveId(id);
    }
    const userMsg: ChatMessage = { id: uid('m'), role: 'user', content: msg, createdAt: new Date().toISOString(), ...(attached.length ? { attachments: attached.map((f) => ({ name: f.name, size: f.size })) } : {}) };
    const isFirst = (base.chats.find((c) => c.id === id)?.messages.length ?? 0) === 0;
    const next = withMessage(base, id, userMsg, isFirst ? msg.slice(0, 42) : undefined);
    update(() => next);
    setText('');
    setFiles([]);
    setFileError('');
    setBusy(true);
    try {
      const attachments = await Promise.all(attached.map(async (f) => ({ name: f.name, mediaType: f.type, data: await fileToBase64(f) })));
      const history = next.chats.find((c) => c.id === id)!.messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, state: next, attachments }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (res.status === 413 ? 'Those files are too large to send.' : 'Request failed'));
      const reply: ChatMessage = { id: uid('m'), role: 'assistant', content: data.reply, actions: data.actions, createdAt: new Date().toISOString() };
      update(() => withMessage(data.state as AppState, id!, reply));
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <PageHead eyebrow="Powered by Claude" title="Assistant" subtitle="Paste a link, ask for a comparison, or tell it what to change. It can add and rank options, adjust the budget, and branch your decision tree." />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 230px) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="card flat col" style={{ gap: 6 }}>
          <button className="btn primary" onClick={newChat}><MessageSquarePlus size={15} /> New chat</button>
          {state.chats.map((c) => (
            <div key={c.id} className="row" style={{ gap: 2 }}>
              <button className="btn ghost sm grow" style={{ justifyContent: 'flex-start', overflow: 'hidden', textOverflow: 'ellipsis', background: c.id === activeId ? 'var(--accent-soft)' : undefined, color: c.id === activeId ? 'var(--accent)' : undefined }} onClick={() => setActiveId(c.id)}>{c.title}</button>
              <button className="btn ghost sm icon danger" aria-label="Delete chat" onClick={() => { if (confirm('Delete this conversation?')) { update((s) => ({ ...s, chats: s.chats.filter((x) => x.id !== c.id) })); if (activeId === c.id) setActiveId(''); } }}><Trash2 size={13} /></button>
            </div>
          ))}
          {state.chats.length === 0 && <div className="tiny muted">Conversations are saved here so you can revisit them.</div>}
        </div>

        <div className="col" style={{ gap: 14, minWidth: 0 }}>
        <div className={`card dropzone ${dragging ? 'drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
          <div className="row between wrap" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <span className="dz-icon"><Upload size={20} /></span>
              <div>
                <strong>Upload files</strong>
                <div className="small muted">Drop price sheets, brochures or screenshots here. Claude reads them and adds each option with its prices (including different prices for Mon–Thu, Fri, Sat and Sun).</div>
              </div>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <label className="small muted row" style={{ gap: 6 }}>Add to
                <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }} aria-label="Add to category">
                  <option value="auto">Let Claude decide</option>
                  {visibleCategories(state).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <button className="btn" onClick={() => fileInput.current?.click()}><Paperclip size={15} /> Choose files</button>
              <input ref={fileInput} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>PDF · Word (.docx) · Excel (.xlsx) · images (PNG, JPG, WebP) · CSV · text. Up to 15 MB each.</div>
          {files.length > 0 && (
            <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
              {files.map((f, i) => (
                <span key={f.name + i} className="filechip"><FileText size={13} />{f.name}<span className="muted"> · {fmtSize(f.size)}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((l) => l.filter((_, j) => j !== i))}><X size={12} /></button></span>
              ))}
              <button className="btn primary sm" disabled={busy} onClick={() => send(text)}><Sparkles size={13} /> Read {files.length === 1 ? 'file' : `${files.length} files`} &amp; add options</button>
            </div>
          )}
          {fileError && <div className="small" style={{ color: 'var(--bad)', marginTop: 10 }}>{fileError}</div>}
        </div>

        <div className="card chat" style={{ height: 'calc(100vh - 330px)', minHeight: 440 }}>
          {status && !status.configured && (
            <div className="small" style={{ padding: '10px 14px', borderRadius: 12, background: 'color-mix(in srgb, var(--warn) 14%, transparent)', marginBottom: 12 }}>
              <strong>Assistant not connected yet.</strong> Add <code>ANTHROPIC_API_KEY</code> to a <code>.env</code> file next to <code>package.json</code> and restart the server.
            </div>
          )}
          <div className="chat-log" ref={logRef}>
            {!chat || chat.messages.length === 0 ? (
              <div className="col" style={{ margin: 'auto', textAlign: 'center', alignItems: 'center', maxWidth: 520 }}>
                <Sparkles size={30} color="var(--accent)" />
                <h2>What shall we plan?</h2>
                <div className="col" style={{ width: '100%', gap: 8 }}>
                  {SUGGESTIONS.map((s) => <button key={s} className="btn" style={{ whiteSpace: 'normal', textAlign: 'left' }} onClick={() => setText(s)}>{s}</button>)}
                </div>
              </div>
            ) : (
              chat.messages.map((m) => (
                <div key={m.id} className={`msg ${m.role}`}>
                  {m.attachments && m.attachments.length > 0 && <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>{m.attachments.map((a, i) => <span key={i} className="filechip on-dark"><FileText size={12} />{a.name}</span>)}</div>}
                  {m.content}
                  {m.actions && m.actions.length > 0 && <div className="actions">{m.actions.map((a, i) => <span key={i} className="pill">✓ {a}</span>)}</div>}
                </div>
              ))
            )}
            {busy && <div className="msg assistant typing"><span /><span /><span /></div>}
            {error && <div className="small" style={{ color: 'var(--bad)' }}>{error}</div>}
          </div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <button type="button" className="btn icon" title="Attach files" aria-label="Attach files" onClick={() => fileInput.current?.click()}><Paperclip size={16} /></button>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a link, attach a price sheet, or ask anything…  (Enter to send)" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} rows={1} />
            <button className="btn primary" type="submit" disabled={busy || (!text.trim() && !files.length)}><Send size={15} /> Send</button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}

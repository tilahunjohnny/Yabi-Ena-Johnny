import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { AppState, Chat, ChatMessage, uid } from '../../shared/types';
import { useStore } from '../store';
import { PageHead } from '../components/ui';

const SUGGESTIONS = [
  'Add this venue: https://… and rank it against the others',
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

  const send = async (content: string) => {
    const msg = content.trim();
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
    const userMsg: ChatMessage = { id: uid('m'), role: 'user', content: msg, createdAt: new Date().toISOString() };
    const isFirst = (base.chats.find((c) => c.id === id)?.messages.length ?? 0) === 0;
    const next = withMessage(base, id, userMsg, isFirst ? msg.slice(0, 42) : undefined);
    update(() => next);
    setText('');
    setBusy(true);
    try {
      const history = next.chats.find((c) => c.id === id)!.messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, state: next }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
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

        <div className="card chat">
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
                  {m.content}
                  {m.actions && m.actions.length > 0 && <div className="actions">{m.actions.map((a, i) => <span key={i} className="pill">✓ {a}</span>)}</div>}
                </div>
              ))
            )}
            {busy && <div className="msg assistant typing"><span /><span /><span /></div>}
            {error && <div className="small" style={{ color: 'var(--bad)' }}>{error}</div>}
          </div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a link or ask anything…  (Enter to send, Shift+Enter for a new line)" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} rows={1} />
            <button className="btn primary" type="submit" disabled={busy || !text.trim()}><Send size={15} /> Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from '../shared/types';
import { seedState } from '../shared/seed';
import { migrateState } from '../shared/migrate';

type SyncStatus = 'loading' | 'saving' | 'saved' | 'offline';

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  sync: SyncStatus;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toast: (msg: string) => void;
  toastMsg: string;
  ringUnlocked: boolean;
  unlockRing: (password: string) => Promise<boolean>;
  lockRing: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

const LS_KEY = 'yabi-ena-johnny:state:v1';

function loadLocal(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? migrateState(JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadLocal() ?? seedState());
  const [sync, setSync] = useState<SyncStatus>('loading');
  const [scenarioId, setScenarioIdRaw] = useState<string>(() => localStorage.getItem('yej:scenario') || 'all');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('yej:theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light'; // Japandi is a light palette; dark is opt-in via the toggle
  });
  const [toastMsg, setToastMsg] = useState('');
  const [ringUnlocked, setRingUnlocked] = useState(false);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const serverRev = useRef(0);
  const online = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('yej:theme', theme);
  }, [theme]);

  // Initial load from the shared server copy (falls back to the local cache).
  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((d) => {
        serverRev.current = d.rev;
        online.current = true;
        setRingUnlocked(!!d.ringUnlocked);
        setState(migrateState(d.state));
        setSync('saved');
      })
      .catch(() => setSync('offline'));
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    version.current += 1;
    setState(fn);
  }, []);
  const replace = useCallback((s: AppState) => {
    savedVersion.current = version.current;
    setState(s);
  }, []);

  // Debounced save: localStorage always, server when reachable.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* quota */ }
    if (version.current === savedVersion.current) return;
    const v = version.current;
    setSync('saving');
    const t = setTimeout(() => {
      fetch('/api/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state }) })
        .then((r) => r.json())
        .then((d) => {
          serverRev.current = d.rev;
          online.current = true;
          savedVersion.current = v;
          setSync('saved');
        })
        .catch(() => setSync('offline'));
    }, 500);
    return () => clearTimeout(t);
  }, [state]);

  // Pick up changes from the other person when the tab regains focus.
  useEffect(() => {
    const onFocus = async () => {
      if (!online.current || version.current !== savedVersion.current) return;
      try {
        const { rev } = await (await fetch('/api/rev')).json();
        if (rev > serverRev.current) {
          const d = await (await fetch('/api/state')).json();
          serverRev.current = d.rev;
          setRingUnlocked(!!d.ringUnlocked);
          replace(migrateState(d.state));
        }
      } catch { /* offline */ }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [replace]);

  const reloadFromServer = useCallback(async () => {
    const d = await (await fetch('/api/state')).json();
    serverRev.current = d.rev;
    setRingUnlocked(!!d.ringUnlocked);
    replace(migrateState(d.state));
  }, [replace]);

  const unlockRing = useCallback(async (password: string) => {
    const res = await fetch('/api/ring/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) return false;
    await reloadFromServer();
    return true;
  }, [reloadFromServer]);

  const lockRing = useCallback(async () => {
    await fetch('/api/ring/lock', { method: 'POST' });
    await reloadFromServer(); // replaces the in-memory and cached copy with the stripped one
  }, [reloadFromServer]);

  const logout = useCallback(async () => {
    try { await fetch('/logout', { method: 'POST' }); } catch { /* offline: still clear local data below */ }
    // Don't leave the planner (or ring data) cached in this browser after signing out.
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    window.location.assign('/'); // the server now answers with the password page
  }, []);

  const setScenarioId = (id: string) => {
    setScenarioIdRaw(id);
    localStorage.setItem('yej:scenario', id);
  };
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  }, []);

  // If the active scenario was deleted, fall back to "all".
  const activeScenario = scenarioId === 'all' || state.scenarios.some((s) => s.id === scenarioId) ? scenarioId : 'all';

  return (
    <Ctx.Provider value={{ state, update, replace, scenarioId: activeScenario, setScenarioId, sync, theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), toast, toastMsg, ringUnlocked, unlockRing, lockRing, logout }}>
      {children}
    </Ctx.Provider>
  );
}

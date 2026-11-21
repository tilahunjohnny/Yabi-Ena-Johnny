import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { CalendarRange, CheckSquare, ChevronDown, MapPin, CloudOff, Lightbulb, Cloud, Gem, LogOut, Users, GitBranch, LayoutDashboard, Menu, MessagesSquare, Moon, PiggyBank, Settings as Cog, Sparkles, Sun } from 'lucide-react';
import { useStore } from './store';
import { CatIcon, tint } from './components/ui';
import { visibleCategories } from '../shared/logic';
import Guests from './pages/Guests';
import IdeaBoard from './pages/IdeaBoard';
import Locations from './pages/Locations';
import { loadGotcha } from './lib/gotcha';
import Backdrop from './components/Backdrop';
import Dashboard from './pages/Dashboard';
import CategoryPage from './pages/CategoryPage';
import Budget from './pages/Budget';
import Timeline from './pages/Timeline';
import Decisions from './pages/Decisions';
import Discussions from './pages/Discussions';
import Checklist from './pages/Checklist';
import RingProposal from './pages/RingProposal';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';

export default function App() {
  const { state, scenarioId, setScenarioId, sync, theme, toggleTheme, toastMsg, logout } = useStore();
  const [passwordProtected, setPasswordProtected] = useState(false);
  // Warm up the lock-screen pictures in the background so they appear instantly when someone opens the ring page.
  useEffect(() => { const t = setTimeout(() => { loadGotcha(); }, 1500); return () => clearTimeout(t); }, []);
  useEffect(() => { fetch('/api/auth/info').then((r) => r.json()).then((d) => setPasswordProtected(!!d.passwordProtected)).catch(() => {}); }, []);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);

  // Less on screen at once: the vendor categories and the occasional tools fold away.
  const [fold, setFold] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('yej:fold') || '{}'); } catch { return {}; } });
  const toggle = (k: string) => setFold((f) => { const n = { ...f, [k]: !(f[k] ?? true) }; try { localStorage.setItem('yej:fold', JSON.stringify(n)); } catch { /* private mode */ } return n; });
  const folded = (k: string, active: boolean) => (fold[k] ?? true) && !active; // folded by default, but never hide the page you're on
  const onCat = loc.pathname.startsWith('/c/');
  const onMore = ['/ideas', '/decisions', '/discussions', '/checklist'].some((p) => loc.pathname.startsWith(p));
  const group = (k: string, label: string, active: boolean, children: React.ReactNode) => (
    <>
      <button className={`nav-label nav-fold ${folded(k, active) ? '' : 'open'}`} onClick={() => toggle(k)} aria-expanded={!folded(k, active)}>{label}<ChevronDown size={13} /></button>
      {!folded(k, active) && children}
    </>
  );

  const link = (to: string, icon: React.ReactNode, label: string, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>{icon}{label}</NavLink>
  );

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="mark">Yabi Ena Johnny</div>
          <div className="sub">Our wedding, together</div>
        </div>
        <nav className="nav">
          {link('/', <LayoutDashboard size={17} />, 'Overview', true)}
          {link('/assistant', <Sparkles size={17} />, 'Assistant')}
          <div className="nav-label">Plan</div>
          {link('/places', <MapPin size={17} />, 'Locations')}
          {link('/budget', <PiggyBank size={17} />, 'Budget')}
          {link('/guests', <Users size={17} />, 'Guest List')}
          {link('/timeline', <CalendarRange size={17} />, 'Timelines')}
          {group('cats', 'Vendors & details', onCat, visibleCategories(state).map((c) => (
            <NavLink key={c.id} to={`/c/${c.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span style={{ color: c.color, display: 'inline-flex' }}><CatIcon name={c.icon} size={17} /></span>
              {c.name}
              <span className="count">{state.options.filter((o) => o.categoryId === c.id).length || ''}</span>
            </NavLink>
          )))}
          {group('more', 'More tools', onMore, <>
            {link('/ideas', <Lightbulb size={17} />, 'Idea Board')}
            {link('/checklist', <CheckSquare size={17} />, 'Checklist')}
            {link('/discussions', <MessagesSquare size={17} />, 'Discussions')}
            {link('/decisions', <GitBranch size={17} />, 'Decision tree')}
          </>)}
          <div className="nav-label">Just us</div>
          {link('/ring', <Gem size={17} />, 'Ring & Proposal')}
          {link('/settings', <Cog size={17} />, 'Settings')}
        </nav>
        {passwordProtected && (
          <button className="btn ghost" onClick={logout} style={{ marginTop: 'auto', justifyContent: 'flex-start', opacity: 0.85 }}>
            <LogOut size={16} /> Log out
          </button>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn icon ghost menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu"><Menu size={18} /></button>
          <div className="seg" role="tablist" aria-label="Timeline scenario" style={{ overflowX: 'auto', maxWidth: '60vw' }}>
            <button className={scenarioId === 'all' ? 'on' : ''} onClick={() => setScenarioId('all')}>All timelines</button>
            {state.scenarios.map((s) => (
              <button key={s.id} className={scenarioId === s.id ? 'on' : ''} onClick={() => setScenarioId(s.id)}><span style={{ color: tint(s.color) }}>●</span> {s.name}</button>
            ))}
          </div>
          <div className="spacer" />
          <span className="tiny muted row" style={{ gap: 5 }} title={sync === 'offline' ? 'Server unreachable — saving in this browser only' : 'Synced'}>
            {sync === 'offline' ? <CloudOff size={14} /> : <Cloud size={14} />}{sync === 'saving' ? 'Saving…' : sync === 'offline' ? 'Local only' : sync === 'loading' ? 'Loading…' : 'Saved'}
          </span>
          <button className="btn icon ghost" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
          {passwordProtected && <button className="btn icon ghost" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={17} /></button>}
        </header>
        <Backdrop />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/guests" element={<Guests />} />
          <Route path="/places" element={<Locations />} />
          <Route path="/ideas" element={<IdeaBoard />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/discussions" element={<Discussions />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/c/:id" element={<CategoryPage />} />
          <Route path="/ring" element={<RingProposal />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

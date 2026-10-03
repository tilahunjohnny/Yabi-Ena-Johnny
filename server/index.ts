import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppState } from '../shared/types';
import { seedState } from '../shared/seed';
import { migrateState } from '../shared/migrate';
import { runChat } from './chat';
import { authMiddleware } from './auth';
import { gotchaPath, mergeSecrets, registerRingRoutes, ringUnlocked, stripSecrets } from './ring';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const DB_FILE = process.env.DATA_FILE || path.join(root, 'data', 'db.json');

// Minimal .env loader so no extra dependency is needed.
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env */ }

let rev = 0;
function load(): AppState {
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    rev = raw.rev ?? 0;
    const loaded = raw.state as AppState;
    const migrated = migrateState(loaded);
    if (migrated.version !== loaded.version) save(migrated); // persist the upgrade once
    return migrated;
  } catch {
    const s = seedState();
    save(s);
    return s;
  }
}
function save(state: AppState) {
  rev += 1;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ rev, state }, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

let current = load();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.get('/healthz', (_req, res) => res.send('ok'));
// Logging out must work from any state, so it sits before the auth gate. It only clears this browser's cookies.
app.post('/logout', (_req, res) => {
  const expired = 'HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
  res.setHeader('Set-Cookie', [`yej_auth=; ${expired}`, `yej_ring=; ${expired}`]);
  res.json({ ok: true });
});

// Photos for the sign-in screen must load before anyone is signed in.
app.use('/welcome', express.static(path.join(root, 'welcome'), { maxAge: '7d' }));
app.use(authMiddleware(process.env.APP_PASSWORD));
if (!process.env.APP_PASSWORD) console.warn('WARNING: APP_PASSWORD is not set — anyone who can reach this server can edit your planner.');

app.get('/api/auth/info', (_req, res) => res.json({ passwordProtected: !!process.env.APP_PASSWORD }));
registerRingRoutes(app, gotchaPath(root), path.join(path.dirname(DB_FILE), 'ring-comments.json'));
app.use('/gotcha', express.static(gotchaPath(root), { maxAge: '7d' }));

app.get('/api/state', (req, res) => {
  const unlocked = ringUnlocked(req);
  res.json({ rev, ringUnlocked: unlocked, state: unlocked ? current : stripSecrets(current) });
});
app.get('/api/rev', (_req, res) => res.json({ rev }));
app.put('/api/state', (req, res) => {
  const state = req.body?.state as AppState | undefined;
  if (!state || !Array.isArray(state.options) || !state.settings) return res.status(400).json({ error: 'Invalid state' });
  current = mergeSecrets(state, current, ringUnlocked(req));
  save(current);
  res.json({ rev });
});

app.get('/api/chat/status', (_req, res) => res.json({ configured: !!process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5' }));

app.post('/api/chat', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set on the server. Add it to .env and restart.' });
  }
  const messages = req.body?.messages as Array<{ role: 'user' | 'assistant'; content: string }> | undefined;
  if (!messages?.length) return res.status(400).json({ error: 'No messages' });
  try {
    // The client's state is authoritative (it may hold edits not yet synced).
    const unlocked = ringUnlocked(req);
    if (req.body.state) current = mergeSecrets(req.body.state as AppState, current, unlocked);
    const { reply, state, actions } = await runChat(unlocked ? current : stripSecrets(current), messages, unlocked);
    current = mergeSecrets(state, current, unlocked);
    save(current);
    res.json({ reply, actions, state: unlocked ? current : stripSecrets(current), rev });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Chat failed' });
  }
});

const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`Yabi Ena Johnny API on http://localhost:${port}`));

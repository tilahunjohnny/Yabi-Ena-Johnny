import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, Express } from 'express';
import { AppState } from '../shared/types';
import { blankRingBrief } from '../shared/seed';
import { sniff } from './ideas';

const COOKIE = 'yej_ring';
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;

const sign = (pw: string) => crypto.createHmac('sha256', pw).update('yabi-ena-johnny-ring').digest('hex');
const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** True when the request carries a valid ring cookie. Without RING_PASSWORD nobody is ever unlocked. */
export function ringUnlocked(req: Request): boolean {
  const pw = process.env.RING_PASSWORD;
  if (!pw) return false;
  const got = /(?:^|;\s*)yej_ring=([a-f0-9]+)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
  return safeEq(got, sign(pw));
}

/** Remove everything private from a state before it leaves the server. */
export function stripSecrets(state: AppState): AppState {
  return { ...state, rings: [], proposals: [], proposalChecklist: [], ringBrief: blankRingBrief(), ringHints: [], jewelers: [] };
}

/** Accept an incoming state, but never let a locked client overwrite the private parts. */
export function mergeSecrets(incoming: AppState, existing: AppState, unlocked: boolean): AppState {
  if (unlocked) return incoming;
  return { ...incoming, rings: existing.rings, proposals: existing.proposals, proposalChecklist: existing.proposalChecklist, ringBrief: existing.ringBrief, ringHints: existing.ringHints, jewelers: existing.jewelers };
}

export interface VisitorComment { id: string; name: string; text: string; createdAt: string }

export function registerRingRoutes(app: Express, gotchaDir: string, commentsFile: string, imgDir: string) {
  let failures = 0;

  const readComments = (): VisitorComment[] => {
    try { return JSON.parse(fs.readFileSync(commentsFile, 'utf8')) as VisitorComment[]; } catch { return []; }
  };
  const writeComments = (list: VisitorComment[]) => {
    fs.mkdirSync(path.dirname(commentsFile), { recursive: true });
    const tmp = commentsFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
    fs.renameSync(tmp, commentsFile);
  };

  // Anyone signed in to the site may read and leave comments; only the unlocked owner may delete them.
  app.get('/api/ring/comments', (_req, res) => res.json({ comments: readComments() }));
  app.post('/api/ring/comments', (req: Request, res: Response) => {
    const text = String(req.body?.text ?? '').trim().slice(0, 500);
    const name = String(req.body?.name ?? '').trim().slice(0, 40) || 'Anonymous snoop';
    if (!text) return res.status(400).json({ error: 'Say something first' });
    const list = [...readComments(), { id: crypto.randomUUID(), name, text, createdAt: new Date().toISOString() }].slice(-200);
    writeComments(list);
    res.json({ comments: list });
  });
  app.delete('/api/ring/comments/:id', (req: Request, res: Response) => {
    if (!ringUnlocked(req)) return res.status(403).json({ error: 'Locked' });
    const list = readComments().filter((c) => c.id !== req.params.id);
    writeComments(list);
    res.json({ comments: list });
  });

  app.get('/api/ring/status', (req, res) => res.json({ configured: !!process.env.RING_PASSWORD, unlocked: ringUnlocked(req) }));

  app.post('/api/ring/unlock', async (req: Request, res: Response) => {
    const pw = process.env.RING_PASSWORD;
    if (!pw) return res.status(503).json({ error: 'RING_PASSWORD is not set on the server.' });
    if (failures > 3) await new Promise((r) => setTimeout(r, Math.min(failures, 20) * 300));
    if (safeEq(sign(String(req.body?.password ?? '')), sign(pw))) {
      failures = 0;
      // Session cookie (no Max-Age): it disappears when the browser closes.
      res.setHeader('Set-Cookie', `${COOKIE}=${sign(pw)}; HttpOnly; SameSite=Lax; Path=/${req.secure ? '; Secure' : ''}`);
      return res.json({ ok: true });
    }
    failures++;
    res.status(401).json({ error: 'Wrong password' });
  });

  app.post('/api/ring/lock', (_req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });

  // Pictures of the ring being aimed for. Unlike the sticker pictures these are private: only someone
  // who has unlocked the ring section can upload, view or delete them.
  fs.mkdirSync(imgDir, { recursive: true });
  const NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;
  app.post('/api/ring/images', (req: Request, res: Response) => {
    if (!ringUnlocked(req)) return res.status(403).json({ error: 'Locked' });
    const buf = Buffer.from(String(req.body?.data ?? ''), 'base64');
    const kind = sniff(buf);
    if (!kind || buf.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'That isn’t a picture I can use (JPG, PNG, WebP or GIF, up to 8 MB).' });
    const name = `${crypto.randomUUID()}.${kind.ext}`;
    fs.writeFileSync(path.join(imgDir, name), buf);
    res.json({ image: `/ring-img/${name}` });
  });
  app.delete('/api/ring/images/:name', (req: Request, res: Response) => {
    if (!ringUnlocked(req)) return res.status(403).json({ error: 'Locked' });
    if (NAME.test(req.params.name)) fs.rmSync(path.join(imgDir, req.params.name), { force: true });
    res.json({ ok: true });
  });
  app.get('/ring-img/:name', (req: Request, res: Response) => {
    if (!ringUnlocked(req)) return res.status(403).end();
    if (!NAME.test(req.params.name)) return res.status(404).end();
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.sendFile(path.join(imgDir, req.params.name), (err) => { if (err && !res.headersSent) res.status(404).end(); });
  });

  /** The "HAHA you thought" pictures shown after a wrong guess. */
  app.get('/api/ring/gotcha', (_req, res) => {
    let files: string[] = [];
    try { files = fs.readdirSync(gotchaDir).filter((f) => IMG.test(f)); } catch { /* none yet */ }
    res.json({ images: files.map((f) => `/gotcha/${encodeURIComponent(f)}`) });
  });
}

export const gotchaPath = (root: string) => path.join(root, 'gotcha');

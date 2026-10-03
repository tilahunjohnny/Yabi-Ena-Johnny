import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, Express } from 'express';
import { AppState } from '../shared/types';

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
  return { ...state, rings: [], proposals: [], proposalChecklist: [] };
}

/** Accept an incoming state, but never let a locked client overwrite the private parts. */
export function mergeSecrets(incoming: AppState, existing: AppState, unlocked: boolean): AppState {
  if (unlocked) return incoming;
  return { ...incoming, rings: existing.rings, proposals: existing.proposals, proposalChecklist: existing.proposalChecklist };
}

export function registerRingRoutes(app: Express, gotchaDir: string) {
  let failures = 0;

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

  /** The "HAHA you thought" pictures shown after a wrong guess. */
  app.get('/api/ring/gotcha', (_req, res) => {
    let files: string[] = [];
    try { files = fs.readdirSync(gotchaDir).filter((f) => IMG.test(f)); } catch { /* none yet */ }
    res.json({ images: files.map((f) => `/gotcha/${encodeURIComponent(f)}`) });
  });
}

export const gotchaPath = (root: string) => path.join(root, 'gotcha');

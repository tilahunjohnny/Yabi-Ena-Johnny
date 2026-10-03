import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const COOKIE = 'yej_auth';
const sign = (pw: string) => crypto.createHmac('sha256', pw).update('yabi-ena-johnny-session').digest('hex');
const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const page = (error = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yabi Ena Johnny</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0d12;color:#f4efe7;font:15px system-ui,sans-serif}
form{width:min(340px,90vw);text-align:center}h1{font:600 2.2rem Georgia,serif;margin:0 0 6px;background:linear-gradient(120deg,#d6b26b,#e6a3b8);-webkit-background-clip:text;color:transparent}
p{color:#9a94a6;margin:0 0 22px}input,button{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:11px;border:1px solid #2b2833;font:inherit}
input{background:#1f1c26;color:inherit;margin-bottom:10px}button{background:#d6b26b;color:#1a1408;font-weight:600;cursor:pointer}.e{color:#ec7a6a;margin-top:10px}</style></head>
<body><form method="post" action="/login"><h1>Yabi Ena Johnny</h1><p>Our wedding, together</p><input type="password" name="password" placeholder="Password" autofocus required><button>Enter</button>${error ? `<div class="e">${error}</div>` : ''}</form></body></html>`;

export function authMiddleware(password: string | undefined) {
  if (!password) return (_q: Request, _s: Response, next: NextFunction) => next();
  const token = sign(password);
  const cookieOf = (req: Request) => /(?:^|;\s*)yej_auth=([a-f0-9]+)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
  let failures = 0;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && req.path === '/login') {
      if (failures > 5) await new Promise((r) => setTimeout(r, Math.min(failures, 20) * 250));
      const given = String(req.body?.password ?? '');
      if (safeEq(sign(given), token)) {
        failures = 0;
        res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 90}${req.secure ? '; Secure' : ''}`);
        return res.redirect('/');
      }
      failures++;
      return res.status(401).send(page('Wrong password'));
    }
    if (safeEq(cookieOf(req), token)) return next();
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not signed in' });
    res.status(401).send(page());
  };
}

import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const COOKIE = 'yej_auth';
const sign = (pw: string) => crypto.createHmac('sha256', pw).update('yabi-ena-johnny-session').digest('hex');
const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const PHOTOS = [1, 2, 3, 4, 5].map((n) => `/welcome/${n}.webp`);

const page = (error = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yabi Ena Johnny</title>
<style>
@font-face{font-family:'Marcellus';font-weight:400;font-style:normal;font-display:swap;src:url(/welcome/fonts/marcellus-400.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-weight:400;font-style:normal;font-display:swap;src:url(/welcome/fonts/dm-sans-400.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-weight:500;font-style:normal;font-display:swap;src:url(/welcome/fonts/dm-sans-500.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-weight:600;font-style:normal;font-display:swap;src:url(/welcome/fonts/dm-sans-600.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-weight:700;font-style:normal;font-display:swap;src:url(/welcome/fonts/dm-sans-700.woff2) format('woff2')}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:#1F1E1A;color:#F4F1E6;font:15px 'DM Sans',system-ui,sans-serif;overflow-x:hidden}
.bg{position:fixed;inset:0;z-index:0}
.bg i{position:absolute;inset:-6%;background-size:cover;background-position:center;filter:blur(22px) saturate(1.15);opacity:0;animation:cross 30s infinite,drift 30s ease-in-out infinite alternate}
.bg i:nth-child(2){animation-delay:6s}.bg i:nth-child(3){animation-delay:12s}.bg i:nth-child(4){animation-delay:18s}.bg i:nth-child(5){animation-delay:24s}
@keyframes cross{0%{opacity:0}5%{opacity:.95}20%{opacity:.95}26%{opacity:0}100%{opacity:0}}
@keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.14) translateY(-1.5%)}}
.veil{position:fixed;inset:0;z-index:1;background:radial-gradient(ellipse at 50% 40%,rgba(44,40,32,.22),rgba(31,30,26,.78) 80%),linear-gradient(180deg,rgba(44,40,32,.28),rgba(31,30,26,.62))}
main{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 0 36px}
.arches{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(8px,1.8vw,22px);width:min(980px,92vw);align-items:end}
.a{margin:0;aspect-ratio:3/4.1;border-radius:999px 999px 16px 16px;overflow:hidden;border:1px solid rgba(226,214,192,.7);box-shadow:0 18px 50px rgba(0,0,0,.5),0 0 0 6px rgba(255,255,255,.04);opacity:0;animation:rise .9s cubic-bezier(.2,.8,.2,1) forwards}
.a img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.04)}
.a1,.a5{--lift:0px}.a2,.a4{--lift:-30px}.a3{--lift:-62px}
.a1{animation-delay:.1s}.a2{animation-delay:.25s}.a3{animation-delay:.4s}.a4{animation-delay:.55s}.a5{animation-delay:.7s}
@keyframes rise{from{opacity:0;transform:translateY(calc(var(--lift) + 28px))}to{opacity:1;transform:translateY(var(--lift))}}
form{margin-top:clamp(18px,4vh,40px);width:min(380px,90vw);text-align:center;padding:26px 26px 24px;border-radius:22px;background:rgba(42,41,36,.6);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 70px rgba(0,0,0,.5);animation:rise2 .9s .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise2{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#E0DAC6;margin-bottom:6px}
h1{font:400 clamp(2rem,5.6vw,2.5rem)/1.1 'Marcellus',Georgia,serif;letter-spacing:.01em;margin:0 0 18px;background:linear-gradient(120deg,#F6F3E8,#D9A98B);-webkit-background-clip:text;background-clip:text;color:transparent}
input,button{width:100%;padding:13px 15px;border-radius:12px;border:1px solid rgba(255,255,255,.14);font:inherit}
input{background:rgba(255,255,255,.07);color:#F4F1E6;margin-bottom:10px;outline:none}input::placeholder{color:#b3ae9a}input:focus{border-color:#D9A98B;box-shadow:0 0 0 3px rgba(217,169,139,.25)}
button{background:#F4F1E6;color:#2A2A25;font-weight:600;border:0;cursor:pointer;transition:filter .15s}button:hover{filter:brightness(1.08)}
.e{color:#F0A596;margin-top:12px;font-size:13.5px}
@media (max-width:560px){.a1,.a5{--lift:0px}.a2,.a4{--lift:-14px}.a3{--lift:-30px}.a{border-width:1px;box-shadow:0 10px 26px rgba(0,0,0,.5)}}
@media (prefers-reduced-motion:reduce){.bg i,.a,form{animation:none!important;opacity:1}.bg i:not(:first-child){display:none}.a{transform:translateY(var(--lift))}}
</style></head>
<body>
<div class="bg">${PHOTOS.map((u) => `<i style="background-image:url(${u})"></i>`).join('')}</div><div class="veil"></div>
<main>
  <div class="arches">${PHOTOS.map((u, i) => `<figure class="a a${i + 1}"><img src="${u}" alt="" ${i > 1 ? 'loading="eager"' : 'fetchpriority="high"'}></figure>`).join('')}</div>
  <form method="post" action="/login">
    <div class="eyebrow">Our wedding, together</div>
    <h1>Yabi Ena Johnny</h1>
    <input type="password" name="password" placeholder="Password" autofocus required aria-label="Password">
    <button>Enter</button>${error ? `<div class="e">${error}</div>` : ''}
  </form>
</main></body></html>`;

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

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Express, Request, Response } from 'express';
import { detectSource, normalizeUrl } from '../shared/ideas';
import { fetchResource } from './fetchUrl';

const MAX_IMAGE = 6 * 1024 * 1024;
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").trim();

/** Collects <meta property/name=… content=…> pairs regardless of attribute order. */
function readMeta(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const val = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (key && val !== undefined && !(key in out)) out[key] = decode(val);
  }
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (title && !out['title']) out['title'] = decode(title.replace(/\s+/g, ' '));
  return out;
}

/** Recognises an image by its first bytes (never trust the file name or header alone). */
function sniff(buf: Buffer): { ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return { ext: 'jpg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png' };
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { ext: 'webp' };
  if (buf.slice(0, 3).toString() === 'GIF') return { ext: 'gif' };
  return null;
}

export function registerIdeaRoutes(app: Express, imgDir: string) {
  fs.mkdirSync(imgDir, { recursive: true });
  const save = (buf: Buffer): string | null => {
    const kind = sniff(buf);
    if (!kind || buf.length > MAX_IMAGE) return null;
    const name = `${crypto.randomUUID()}.${kind.ext}`;
    fs.writeFileSync(path.join(imgDir, name), buf);
    return `/idea-img/${name}`;
  };

  // Reads a link's title, description and thumbnail, and keeps a copy of the thumbnail so it never expires.
  app.post('/api/ideas/preview', async (req: Request, res: Response) => {
    const url = normalizeUrl(String(req.body?.url ?? ''));
    if (!url) return res.status(400).json({ error: 'That doesn’t look like a web link.' });
    const source = detectSource(url);
    try {
      const page = await fetchResource(url, { maxBytes: 600_000, accept: 'text/html,application/xhtml+xml' });
      const meta = readMeta(page.buffer.toString('utf8'));
      let image = '';
      const imgUrl = meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || meta['twitter:image:src'];
      if (imgUrl) {
        try {
          const img = await fetchResource(new URL(imgUrl, page.finalUrl).toString(), { maxBytes: MAX_IMAGE, accept: 'image/*', strict: true });
          image = save(img.buffer) ?? '';
        } catch { /* a missing thumbnail is fine */ }
      }
      res.json({ url, source, title: meta['og:title'] || meta['twitter:title'] || meta['title'] || '', description: meta['og:description'] || meta['description'] || meta['twitter:description'] || '', siteName: meta['og:site_name'] || new URL(page.finalUrl).hostname.replace(/^www\./, ''), image });
    } catch (e: any) {
      // Instagram and Pinterest often refuse automated visitors; the user can still save the link by hand.
      res.json({ url, source, title: '', description: '', siteName: new URL(url).hostname.replace(/^www\./, ''), image: '', error: e?.message || 'Could not read that page.' });
    }
  });

  // A picture the user uploads themselves (already shrunk by the browser).
  app.post('/api/ideas/upload', (req: Request, res: Response) => {
    const data = String(req.body?.data ?? '');
    const image = save(Buffer.from(data, 'base64'));
    if (!image) return res.status(400).json({ error: 'That isn’t a picture I can use (JPG, PNG, WebP or GIF, up to 6 MB).' });
    res.json({ image });
  });
}

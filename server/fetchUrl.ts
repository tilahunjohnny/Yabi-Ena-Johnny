import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = ip.toLowerCase();
  return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:');
}

async function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) links are supported.');
  const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
  if (addrs.some((a) => isPrivate(a.address))) throw new Error('Refusing to fetch a private/internal address.');
}

function htmlToText(html: string): string {
  const meta: string[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) meta.push(`Title: ${title.trim()}`);
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](og:[a-z:_]+|description|product:price:amount|product:price:currency)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)) {
    meta.push(`${m[1]}: ${m[2]}`);
  }
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    meta.push(`JSON-LD: ${m[1].replace(/\s+/g, ' ').slice(0, 1500)}`);
  }
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return `${meta.join('\n')}\n\n${body}`.slice(0, 14000);
}

export async function fetchUrlText(raw: string): Promise<string> {
  let url = new URL(raw);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; YabiEnaJohnnyBot/1.0)', accept: 'text/html,application/xhtml+xml' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    if (!res.ok) throw new Error(`The site responded with HTTP ${res.status}.`);
    return htmlToText(await res.text());
  }
  throw new Error('Too many redirects.');
}

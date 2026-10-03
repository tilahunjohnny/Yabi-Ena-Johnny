import { IdeaSource } from './types';

export const SOURCES: Record<IdeaSource, { label: string }> = {
  instagram: { label: 'Instagram' }, pinterest: { label: 'Pinterest' }, tiktok: { label: 'TikTok' }, youtube: { label: 'YouTube' },
  facebook: { label: 'Facebook' }, article: { label: 'Article' }, other: { label: 'Other' },
};

/** Works out where a link comes from. */
export function detectSource(url: string): IdeaSource {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'other'; }
  if (/(^|\.)instagram\.com$/.test(host) || host === 'instagr.am') return 'instagram';
  if (/(^|\.)pinterest\./.test(host) || host === 'pin.it') return 'pinterest';
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
  if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be') return 'youtube';
  if (/(^|\.)facebook\.com$/.test(host) || host === 'fb.com' || host === 'fb.watch') return 'facebook';
  return 'article';
}

/** Adds https:// when someone pastes "example.com/page". Returns '' if it isn't a usable web link. */
export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return '';
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try { const u = new URL(withScheme); return /\./.test(u.hostname) ? u.toString() : ''; } catch { return ''; }
}

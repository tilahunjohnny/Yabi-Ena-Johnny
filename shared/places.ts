import { IdeaSource, PlaceKind } from './types';
import { detectSource } from './ideas';

/** Where a pasted link belongs. */
export type Destination = PlaceKind | 'idea';

const CEREMONY = /\b(ceremony|ceremonies|church|chapel|cathedral|basilica|orthodox|altar|temple|mosque|synagogue|sanctuary|courthouse|city hall|elope|elopement|officiant|vows)\b/i;
const RECEPTION = /\b(reception|receptions|venue|venues|banquet|ballroom|event space|event venue|hall|estate|vineyard|winery|barn|resort|hotel|restaurant|rooftop|loft|garden|mansion|manor|castle|country club|brewery|dinner|party|catering|capacity|guests)\b/i;
const BOTH = /\b(ceremony (and|&|\+) reception|ceremony,? reception|ceremonies? (and|&) receptions?|weddings? (&|and) events?|on-?site ceremony|ceremony on-?site|all[- ]in[- ]one)\b/i;
const WEDDING = /\b(wedding|weddings|bride|bridal|marry|marriage|nuptials)\b/i;

export interface Verdict { destination: Destination; confidence: 'high' | 'medium' | 'low'; reason: string }

/**
 * Works out where a link should go from its address, title and description.
 * Social posts and articles stay on the Idea Board unless they clearly describe a place; a place that mentions
 * both ceremony and reception goes to "both".
 */
export function classifyLink(url: string, title = '', description = ''): Verdict {
  let host = '', path = '';
  try { const u = new URL(url); host = u.hostname.replace(/^www\./, ''); path = decodeURIComponent(u.pathname).replace(/[-_/]+/g, ' '); } catch { /* keep blank */ }
  const text = `${title} ${description} ${path}`;
  const source: IdeaSource = url ? detectSource(url) : 'other';
  const social = source !== 'article' && source !== 'other';

  const both = BOTH.test(text);
  const cer = CEREMONY.test(text);
  const rec = RECEPTION.test(text);
  const hasWedding = WEDDING.test(text) || /wedding|venue|church|chapel/i.test(host);
  const strongRec = /\b(venue|venues|reception|ballroom|banquet|event space|estate|vineyard|winery|barn)\b/i.test(text);
  const strongCer = /\b(ceremony|church|chapel|cathedral|basilica|synagogue|mosque|temple|courthouse|city hall)\b/i.test(text);

  if (both || (strongCer && strongRec && hasWedding)) return { destination: 'both', confidence: both ? 'high' : 'medium', reason: 'mentions both a ceremony and a reception' };
  if (strongCer && !strongRec) return { destination: 'ceremony', confidence: 'high', reason: 'looks like a ceremony location' };
  if (cer && !rec) return { destination: 'ceremony', confidence: 'medium', reason: 'mentions a ceremony' };
  if (strongRec && !social) return { destination: 'reception', confidence: hasWedding ? 'high' : 'medium', reason: 'looks like a venue' };
  if (strongRec && social && hasWedding && /venue/i.test(text)) return { destination: 'reception', confidence: 'low', reason: 'a social post about a venue' };
  if (rec && !social && hasWedding) return { destination: 'reception', confidence: 'low', reason: 'sounds like a reception space' };
  return { destination: 'idea', confidence: 'low', reason: social ? 'a social post' : 'general inspiration' };
}

export const KIND_LABEL: Record<PlaceKind, string> = { ceremony: 'Ceremony', reception: 'Reception', both: 'Ceremony + reception', other: 'Other' };

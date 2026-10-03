import { readSheet } from 'read-excel-file/browser';
import { GuestSide } from '../../shared/types';

export interface ImportedGuest {
  name: string;
  side: GuestSide | null; // null = the sheet didn't say
  /** 'yes' | 'maybe' | 'probably' | 'blank' (the sheet's wording, normalised) */
  rawStatus: 'yes' | 'maybe' | 'probably' | 'blank';
  group: string;
}

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

const titleCase = (s: string) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const GROUPS: Record<string, string> = { friend: 'Friends', friends: 'Friends', family: 'Family', work: 'Work', coworker: 'Work', other: 'Other' };

/**
 * Reads a guest-list spreadsheet. It looks for a header row (First Name(s) / Last Name(s) / Invited by / Category / Invite?)
 * and understands "Bride" as Yabi's side and "Groom" as Johnny's side.
 */
export async function parseGuestSheet(file: File): Promise<ImportedGuest[]> {
  const rows = (await readSheet(file)) as unknown[][];
  const headerAt = rows.findIndex((r) => r.some((c) => /first\s*name/i.test(clean(c))));
  const header = headerAt >= 0 ? rows[headerAt].map(clean) : [];
  const col = (re: RegExp, fallback = -1) => {
    const i = header.findIndex((h) => re.test(h));
    return i >= 0 ? i : fallback;
  };
  const first = col(/first\s*name/i, 0);
  const last = col(/last\s*name/i, header.length ? -1 : 1);
  const by = col(/invited\s*by|side|belongs/i);
  const cat = col(/^category|group/i);
  const st = col(/invite\?|^status|rsvp|response/i);

  const out: ImportedGuest[] = [];
  for (const r of rows.slice(headerAt + 1)) {
    const name = [clean(r[first]), last >= 0 ? clean(r[last]) : ''].filter(Boolean).join(' ');
    if (!name) continue;
    const who = by >= 0 ? clean(r[by]).toLowerCase() : '';
    const side: GuestSide | null = /bride|yabi/.test(who) ? 'yabi' : /groom|johnny/.test(who) ? 'johnny' : null;
    const status = st >= 0 ? clean(r[st]).toLowerCase() : '';
    const rawStatus: ImportedGuest['rawStatus'] = /^(definite|yes|confirmed|invited)/.test(status) ? 'yes' : /^maybe/.test(status) ? 'maybe' : /^prob/.test(status) ? 'probably' : 'blank';
    const g = cat >= 0 ? clean(r[cat]) : '';
    out.push({ name, side, rawStatus, group: GROUPS[g.toLowerCase()] ?? (g ? titleCase(g) : '') });
  }
  return out;
}

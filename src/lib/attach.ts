export const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.docx,.csv,.txt,.md,.json';
const OK = new Set(ACCEPT.replace(/\./g, '').split(','));
export const MAX_FILE = 15 * 1024 * 1024;
export const MAX_TOTAL = 25 * 1024 * 1024;

export const extOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';
export const isAllowed = (f: File) => OK.has(extOf(f.name));
export const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Checks a new batch of files against the allowed types and size limits. Returns what to keep and a message for what was refused. */
export function screenFiles(existing: File[], incoming: File[]): { keep: File[]; error: string } {
  const problems: string[] = [];
  const keep: File[] = [];
  let total = existing.reduce((a, f) => a + f.size, 0);
  for (const f of incoming) {
    if (!isAllowed(f)) problems.push(`${f.name}: that type can't be read${/heic|heif/i.test(extOf(f.name)) ? ' (export the photo as JPG first)' : ''}`);
    else if (f.size > MAX_FILE) problems.push(`${f.name}: larger than 15 MB`);
    else if (total + f.size > MAX_TOTAL) problems.push(`${f.name}: would go over 25 MB in total`);
    else if (existing.some((e) => e.name === f.name && e.size === f.size) || keep.some((e) => e.name === f.name && e.size === f.size)) continue;
    else { keep.push(f); total += f.size; }
  }
  return { keep, error: problems.join(' · ') };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    r.readAsDataURL(file);
  });
}

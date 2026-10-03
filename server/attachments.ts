import type Anthropic from '@anthropic-ai/sdk';
import readExcelFile from 'read-excel-file/node';
import mammoth from 'mammoth';

export interface Attachment {
  name: string;
  mediaType: string;
  data: string; // base64
}

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_CHARS = 80_000;

const IMAGES: Record<string, 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const PLAIN = new Set(['txt', 'md', 'csv', 'tsv', 'json', 'html', 'htm', 'rtf']);

const ext = (name: string) => name.toLowerCase().split('.').pop() ?? '';
const clip = (text: string) => (text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n…[file continues; truncated]` : text);
const cell = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());

async function spreadsheetText(buf: Buffer): Promise<string> {
  const sheets = await readExcelFile(buf);
  return sheets
    .map(({ sheet, data }) => {
      const rows = data.map((r) => r.map(cell)).filter((r) => r.some((c) => c));
      return `## Sheet: ${sheet}\n${rows.map((r) => r.join('\t')).join('\n')}`;
    })
    .join('\n\n');
}

/** Turns uploaded files into Claude content blocks: PDFs and images natively, everything else as extracted text. */
export async function attachmentBlocks(files: Attachment[]): Promise<Anthropic.ContentBlockParam[]> {
  let total = 0;
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const f of files) {
    const size = Math.floor((f.data.length * 3) / 4);
    total += size;
    if (size > MAX_FILE_BYTES) throw new Error(`"${f.name}" is larger than 15 MB.`);
    if (total > MAX_TOTAL_BYTES) throw new Error('Attachments are larger than 25 MB in total.');
    const e = ext(f.name);
    const buf = Buffer.from(f.data, 'base64');
    if (e === 'pdf' || f.mediaType === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data }, title: f.name });
    } else if (IMAGES[e]) {
      blocks.push({ type: 'text', text: `Attached image "${f.name}":` }, { type: 'image', source: { type: 'base64', media_type: IMAGES[e], data: f.data } });
    } else if (e === 'xlsx' || e === 'xlsm') {
      blocks.push({ type: 'text', text: `Attached spreadsheet "${f.name}" (tab-separated):\n${clip(await spreadsheetText(buf))}` });
    } else if (e === 'docx') {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      blocks.push({ type: 'text', text: `Attached document "${f.name}":\n${clip(value)}` });
    } else if (PLAIN.has(e) || f.mediaType.startsWith('text/')) {
      const raw = buf.toString('utf8');
      blocks.push({ type: 'text', text: `Attached file "${f.name}":\n${clip(e === 'html' || e === 'htm' ? raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ') : raw)}` });
    } else {
      throw new Error(`"${f.name}" can't be read (${e || 'unknown type'}). Use PDF, image (PNG/JPG/WebP/GIF), Excel (.xlsx), Word (.docx), CSV or text.`);
    }
  }
  return blocks;
}

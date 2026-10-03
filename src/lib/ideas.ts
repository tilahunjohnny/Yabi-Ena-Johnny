import { IdeaSource } from '../../shared/types';

export interface LinkPreview { url: string; source: IdeaSource; title: string; description: string; siteName: string; image: string; error?: string }

export async function fetchPreview(url: string): Promise<LinkPreview> {
  const res = await fetch('/api/ideas/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not read that link.');
  return data;
}

/** Shrinks a picture to at most 1000px (JPEG) in the browser, then stores it on the server. Returns the saved path. */
export async function uploadIdeaImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  const res = await fetch('/api/ideas/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data }) });
  const out = await res.json();
  if (!res.ok) throw new Error(out.error || 'Upload failed');
  return out.image as string;
}

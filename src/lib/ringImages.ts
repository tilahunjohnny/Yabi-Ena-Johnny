/** Shrinks a photo to at most 1600px (JPEG) in the browser, then stores it privately on the server. Returns the saved path. */
export async function uploadRingImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
  const res = await fetch('/api/ring/images', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data }) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || 'Upload failed');
  return out.image as string;
}

export async function deleteRingImage(path: string) {
  const name = path.split('/').pop();
  if (name) await fetch(`/api/ring/images/${name}`, { method: 'DELETE' }).catch(() => {});
}

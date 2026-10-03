/**
 * The pictures on the Ring & Proposal lock screen. They are fetched and decoded ahead of time (the app
 * starts this in the background after sign-in), so when someone clicks the link they burst out at once
 * instead of popping in one by one as they download.
 */
let cached: Promise<string[]> | null = null;

const preload = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
    img.decode?.().then(resolve, resolve);
  });

export function loadGotcha(): Promise<string[]> {
  if (!cached) {
    cached = fetch('/api/ring/gotcha')
      .then((r) => r.json())
      .then(async (d: { images?: string[] }) => {
        const images = d.images ?? [];
        // Wait for the pictures, but never hold the page up for more than ~2 seconds.
        await Promise.race([Promise.all(images.map(preload)), new Promise((r) => setTimeout(r, 2000))]);
        return images;
      })
      .catch(() => {
        cached = null; // try again next time
        return [];
      });
  }
  return cached;
}

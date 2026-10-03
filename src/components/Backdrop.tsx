import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { loadGotcha } from '../lib/gotcha';

/** Where a sticker sits: edge + offset along it, size, tilt. Fixed in the margins so they never cover text. */
const SLOTS = [
  { right: 14, top: 96, size: 92 },
  { right: 22, top: '40%', size: 78 },
  { right: 10, top: '66%', size: 96 },
  { right: 10, bottom: 26, size: 104 },
  { right: 120, top: 70, size: 66 },
  { right: 90, bottom: 10, size: 74 },
  { right: '22%', bottom: 4, size: 84 },
  { right: '38%', bottom: 6, size: 70 },
  { left: '34%', bottom: 8, size: 74 },
  { left: 280, bottom: 12, size: 82 },
  { left: 276, top: '30%', size: 64 },
  { left: 280, top: '62%', size: 72 },
  { right: '30%', top: 62, size: 58 },
  { left: '48%', top: 64, size: 56 },
] as const;

const shuffle = <T,>(a: readonly T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

/** The sticker-style cut-outs from the Ring & Proposal wall, sprinkled in the margins of every page. */
export default function Backdrop() {
  const { pathname } = useLocation();
  const [pics, setPics] = useState<string[]>([]);
  useEffect(() => {
    loadGotcha().then((all) => setPics(all.filter((u) => /\.(webp|png)$/i.test(u)))); // cut-outs only
  }, []);
  // Re-shuffled on every page change (and every load), so the spots and the pictures keep moving.
  const placed = useMemo(() => {
    const slots = shuffle(SLOTS).slice(0, 4 + Math.floor(Math.random() * 3));
    const order = shuffle(pics);
    return slots.map((slot, i) => ({ slot, src: order[i % order.length], tilt: Math.round((Math.random() * 2 - 1) * 18) }));
  }, [pathname, pics]);
  if (!pics.length || pathname.startsWith('/ring')) return null; // the Ring & Proposal page keeps its own picture wall
  return (
    <div aria-hidden="true" className="stickers">
      {placed.map(({ slot, src, tilt }, i) => (
        <img key={`${pathname}-${i}`} className="sticker" src={src} alt="" style={{ ...slot, width: slot.size, ['--tilt' as any]: `${tilt}deg`, animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  );
}

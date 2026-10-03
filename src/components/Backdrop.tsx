import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { loadGotcha } from '../lib/gotcha';

/** Where a sticker sits: edge + offset along it, size, tilt. Fixed in the margins so they never cover text. */
const SLOTS = [
  { right: 14, top: 96, size: 92, tilt: 9 },
  { right: 22, top: '46%', size: 78, tilt: -12 },
  { right: 10, bottom: 26, size: 104, tilt: -7 },
  { left: '30%', bottom: 8, size: 74, tilt: 13 },
  { right: '22%', bottom: 4, size: 84, tilt: -10 },
  { right: 120, top: 70, size: 66, tilt: 17 },
  { left: 280, top: '58%', size: 64, tilt: -16 },
] as const;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** The sticker-style cut-outs from the Ring & Proposal wall, sprinkled in the margins of every page. */
export default function Backdrop() {
  const { pathname } = useLocation();
  const [pics, setPics] = useState<string[]>([]);
  useEffect(() => {
    loadGotcha().then((all) => setPics(all.filter((u) => /\.(webp|png)$/i.test(u)))); // cut-outs only
  }, []);
  if (!pics.length) return null;
  const h = hash(pathname.split('/').slice(0, 2).join('/'));
  const count = 4 + (h % 3);
  return (
    <div aria-hidden="true" className="stickers">
      {Array.from({ length: count }, (_, i) => {
        const slot = SLOTS[(h + i * 2) % SLOTS.length];
        const src = pics[(h + i * 5) % pics.length];
        return <img key={`${pathname}-${i}`} className="sticker" src={src} alt="" style={{ ...slot, width: slot.size, ['--tilt' as any]: `${slot.tilt}deg`, animationDelay: `${i * 70}ms` }} />;
      })}
    </div>
  );
}

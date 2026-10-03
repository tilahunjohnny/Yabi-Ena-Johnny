import { useLocation } from 'react-router-dom';

type Spot = { photo: 1 | 2 | 3 | 4 | 5; pos: 'tl' | 'tr' | 'bl' | 'br'; size: 'md' | 'lg' | 'xl' };

/**
 * Faint, tinted photos from the landing page, tucked into corners behind the content.
 * They sit in the margins and open space, never behind text, and change from page to page.
 */
const SPOTS: Array<[RegExp, Spot[]]> = [
  [/^\/$/, [{ photo: 5, pos: 'bl', size: 'lg' }]],
  [/^\/budget/, [{ photo: 4, pos: 'tr', size: 'xl' }, { photo: 1, pos: 'bl', size: 'md' }]],
  [/^\/guests/, [{ photo: 1, pos: 'br', size: 'lg' }, { photo: 3, pos: 'tr', size: 'md' }]],
  [/^\/timeline/, [{ photo: 5, pos: 'tr', size: 'lg' }]],
  [/^\/ideas/, [{ photo: 2, pos: 'tr', size: 'xl' }, { photo: 4, pos: 'bl', size: 'md' }]],
  [/^\/discussions/, [{ photo: 4, pos: 'bl', size: 'lg' }]],
  [/^\/checklist/, [{ photo: 1, pos: 'tr', size: 'lg' }]],
  [/^\/decisions/, [{ photo: 3, pos: 'br', size: 'md' }]],
  [/^\/c\//, [{ photo: 3, pos: 'br', size: 'lg' }, { photo: 2, pos: 'tr', size: 'md' }]],
  [/^\/assistant/, [{ photo: 2, pos: 'br', size: 'md' }]],
];

export const HERO_PHOTO = '/welcome/3.webp';

export default function Backdrop() {
  const { pathname } = useLocation();
  const spots = SPOTS.find(([re]) => re.test(pathname))?.[1] ?? [];
  return (
    <div aria-hidden="true">
      {spots.map((s, i) => (
        <div key={`${pathname}-${i}`} className={`backdrop ${s.pos} ${s.size}`} style={{ backgroundImage: `url(/welcome/${s.photo}.webp)` }} />
      ))}
    </div>
  );
}

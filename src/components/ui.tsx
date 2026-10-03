import { ReactNode, useEffect } from 'react';
import {
  Landmark, Users, Utensils, Camera, Shirt, Music, Flower2, ScrollText, Mail, BedDouble, CakeSlice, Plane, Sparkles, Heart, Gem, Star, X, Gift, Car, Church, Wine, Palette, MapPin, Briefcase,
  LucideIcon,
} from 'lucide-react';
import { Status } from '../../shared/types';

export const ICONS: Record<string, LucideIcon> = {
  landmark: Landmark, users: Users, utensils: Utensils, camera: Camera, shirt: Shirt, music: Music, flower: Flower2, scroll: ScrollText, mail: Mail, bed: BedDouble, cake: CakeSlice,
  plane: Plane, sparkles: Sparkles, heart: Heart, gem: Gem, gift: Gift, car: Car, church: Church, wine: Wine, palette: Palette, pin: MapPin, briefcase: Briefcase,
};

export function CatIcon({ name, size = 18 }: { name: string; size?: number }) {
  const I = ICONS[name] ?? Sparkles;
  return <I size={size} />;
}

export function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span className={`stars ${onChange ? '' : 'ro'}`} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} onClick={onChange ? () => onChange(n === value ? 0 : n) : undefined} tabIndex={onChange ? 0 : -1}>
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}

export const STATUS_LABEL: Record<Status, string> = { idea: 'Idea', shortlist: 'Shortlist', chosen: 'Chosen', rejected: 'Passed' };
export const STATUSES: Status[] = ['idea', 'shortlist', 'chosen', 'rejected'];

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill ${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHead({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <div style={{ marginBottom: action ? 14 : 0 }}>{children}</div>
      {action}
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }> }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <span className="hint tiny muted" style={{ display: 'block', marginTop: 4, textTransform: 'none', letterSpacing: 0 }}>{hint}</span>}
    </label>
  );
}

/** Number input that doesn't fight the user while typing. */
export function NumInput({ value, onChange, className = '', prefix }: { value: number; onChange: (n: number) => void; className?: string; prefix?: string }) {
  return (
    <span className="row" style={{ gap: 4 }}>
      {prefix && <span className="muted small">{prefix}</span>}
      <input className={className} type="number" inputMode="decimal" min={0} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value) || 0)} onFocus={(e) => e.target.select()} />
    </span>
  );
}

export const fmtDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const fmtMonthYear = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/** A data colour (plan or category) blended toward the text colour so it stays readable in light and dark themes. */
export const tint = (c: string) => `color-mix(in srgb, ${c} 62%, var(--text))`;

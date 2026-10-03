import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUp, ExternalLink, Pencil, Plus, Trash2, Clock, MapPin, Check } from 'lucide-react';
import { Category, Option, Status, uid } from '../../shared/types';
import { moveOption, money } from '../../shared/logic';
import { useStore } from '../store';
import { Field, Modal, NumInput, Stars, StatusPill, STATUSES, STATUS_LABEL } from './ui';

export function blankOption(categoryId: string, scenarioIds: string[] = []): Option {
  return {
    id: uid('opt'), categoryId, name: '', vendor: '', url: '', location: '', cost: 0, rating: 0, status: 'idea', pros: '', cons: '', notes: '', scenarioIds,
    leadTimeMonths: 0, availability: '', tags: [], custom: {}, createdAt: new Date().toISOString(),
  };
}

export function OptionForm({ initial, category, isNew, onClose }: { initial: Option; category: Category; isNew: boolean; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [o, setO] = useState<Option>(initial);
  const [customRows, setCustomRows] = useState<Array<[string, string]>>(Object.entries(initial.custom));
  const set = <K extends keyof Option>(k: K, v: Option[K]) => setO((p) => ({ ...p, [k]: v }));
  const people = category.kind === 'people';

  const save = () => {
    if (!o.name.trim()) return;
    const custom: Record<string, string> = {};
    customRows.forEach(([k, v]) => k.trim() && (custom[k.trim()] = v));
    const final = { ...o, name: o.name.trim(), custom };
    update((s) => ({ ...s, options: isNew ? [...s.options, final] : s.options.map((x) => (x.id === final.id ? final : x)) }));
    toast(isNew ? 'Added' : 'Saved');
    onClose();
  };

  return (
    <Modal
      title={isNew ? `Add to ${category.name}` : `Edit ${initial.name || 'option'}`}
      onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={!o.name.trim()}>{isNew ? 'Add option' : 'Save changes'}</button></>}
    >
      <div className="grid g2">
        <Field label={people ? 'Name' : 'Name / title'}><input autoFocus value={o.name} onChange={(e) => set('name', e.target.value)} placeholder={people ? 'e.g. Meron' : 'e.g. Rosewood Estate'} /></Field>
        <Field label={people ? 'Role' : 'Vendor'}><input value={o.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder={people ? 'Bridesmaid, best man…' : 'Company or contact'} /></Field>
        <Field label="Link"><input value={o.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></Field>
        <Field label="Location"><input value={o.location} onChange={(e) => set('location', e.target.value)} placeholder="City, country" /></Field>
        <Field label={`Estimated cost (${state.settings.currency})`}><NumInput value={o.cost} onChange={(n) => set('cost', n)} /></Field>
        <Field label="Book how many months before?" hint="Drives the “book by” date on each timeline."><NumInput value={o.leadTimeMonths} onChange={(n) => set('leadTimeMonths', n)} /></Field>
        <Field label="Availability / timing note"><input value={o.availability} onChange={(e) => set('availability', e.target.value)} placeholder="e.g. Open after June 2027" /></Field>
        <div>
          <Field label="Rating"><div><Stars value={o.rating} onChange={(n) => set('rating', n)} size={22} /></div></Field>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Field label="Status">
          <div className="chip-pick">{STATUSES.map((s) => <button type="button" key={s} className={o.status === s ? 'on' : ''} onClick={() => set('status', s)}>{STATUS_LABEL[s]}</button>)}</div>
        </Field>
      </div>

      <div style={{ marginTop: 14 }}>
        <Field label="Works for which timelines?" hint="Leave all unselected if it works for every scenario.">
          <div className="chip-pick">
            {state.scenarios.map((s) => {
              const on = o.scenarioIds.includes(s.id);
              return <button type="button" key={s.id} className={on ? 'on' : ''} onClick={() => set('scenarioIds', on ? o.scenarioIds.filter((x) => x !== s.id) : [...o.scenarioIds, s.id])}>{s.name}</button>;
            })}
          </div>
        </Field>
      </div>

      <div className="grid g2" style={{ marginTop: 14 }}>
        <Field label="Pros"><textarea value={o.pros} onChange={(e) => set('pros', e.target.value)} /></Field>
        <Field label="Cons"><textarea value={o.cons} onChange={(e) => set('cons', e.target.value)} /></Field>
      </div>
      <div style={{ marginTop: 14 }}><Field label="Notes"><textarea value={o.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything we discussed, quotes, questions to ask…" /></Field></div>

      <div style={{ marginTop: 14 }}>
        <Field label="Custom fields" hint="Add anything you want to compare: capacity, deposit, hours, style…">
          <div className="col" style={{ gap: 8 }}>
            {customRows.map(([k, v], i) => (
              <div className="row" key={i}>
                <input placeholder="Field" value={k} onChange={(e) => setCustomRows((r) => r.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                <input placeholder="Value" value={v} onChange={(e) => setCustomRows((r) => r.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                <button type="button" className="btn ghost icon" onClick={() => setCustomRows((r) => r.filter((_, j) => j !== i))} aria-label="Remove field"><Trash2 size={15} /></button>
              </div>
            ))}
            <div><button type="button" className="btn sm" onClick={() => setCustomRows((r) => [...r, ['', '']])}><Plus size={14} /> Add field</button></div>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

export function OptionCard({
  option, rank, compact, selected, onSelect, onEdit,
}: { option: Option; rank: number; compact?: boolean; selected?: boolean; onSelect?: () => void; onEdit: () => void }) {
  const { state, update, toast } = useStore();
  const scs = option.scenarioIds.map((id) => state.scenarios.find((s) => s.id === id)).filter(Boolean);
  const setStatus = (status: Status) => update((s) => ({ ...s, options: s.options.map((x) => (x.id === option.id ? { ...x, status } : x)) }));
  const move = (d: -1 | 1 | 'top') => update((s) => ({ ...s, options: moveOption(s.options, option.id, d) }));
  const del = () => {
    if (confirm(`Delete "${option.name}"?`)) {
      update((s) => ({ ...s, options: s.options.filter((x) => x.id !== option.id) }));
      toast('Deleted');
    }
  };
  return (
    <div className={`card flat opt ${option.status === 'rejected' ? 'rejected' : ''}`} style={selected ? { borderColor: 'var(--accent)' } : undefined}>
      <div className="rank">{rank}</div>
      <div className="grow">
        <div className="row wrap" style={{ gap: 8 }}>
          <strong style={{ fontSize: 15.5 }}>{option.name}</strong>
          <StatusPill status={option.status} />
          {scs.map((s) => <span key={s!.id} className="pill" style={{ color: s!.color }}>● {s!.name}</span>)}
        </div>
        <div className="row wrap small muted" style={{ gap: 14, marginTop: 4 }}>
          {option.vendor && <span>{option.vendor}</span>}
          {option.location && <span className="row" style={{ gap: 4 }}><MapPin size={12} />{option.location}</span>}
          {option.leadTimeMonths > 0 && <span className="row" style={{ gap: 4 }}><Clock size={12} />book {option.leadTimeMonths}mo ahead</span>}
          {option.url && <a href={option.url} target="_blank" rel="noreferrer" className="row" style={{ gap: 4 }}><ExternalLink size={12} />link</a>}
        </div>
        {!compact && (option.pros || option.cons) && (
          <div className="small" style={{ marginTop: 8 }}>
            {option.pros && <div><span style={{ color: 'var(--good)' }}>+</span> {option.pros}</div>}
            {option.cons && <div><span style={{ color: 'var(--bad)' }}>−</span> {option.cons}</div>}
          </div>
        )}
        {!compact && option.availability && <div className="tiny muted" style={{ marginTop: 6 }}>🗓 {option.availability}</div>}
      </div>
      <div className="side col" style={{ alignItems: 'flex-end', gap: 6 }}>
        <div className="price">{money(option.cost, state.settings.currency)}</div>
        <Stars value={option.rating} onChange={(n) => update((s) => ({ ...s, options: s.options.map((x) => (x.id === option.id ? { ...x, rating: n } : x)) }))} size={14} />
        <div className="row" style={{ gap: 2 }}>
          {onSelect && <button className="btn sm icon" title="Select to compare" onClick={onSelect} style={selected ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : undefined}><Check size={14} /></button>}
          <button className="btn sm icon ghost" title="Move to top" onClick={() => move('top')}><ChevronsUp size={14} /></button>
          <button className="btn sm icon ghost" title="Move up" onClick={() => move(-1)}><ArrowUp size={14} /></button>
          <button className="btn sm icon ghost" title="Move down" onClick={() => move(1)}><ArrowDown size={14} /></button>
          <button className="btn sm icon ghost" title="Edit" onClick={onEdit}><Pencil size={14} /></button>
          <button className="btn sm icon ghost danger" title="Delete" onClick={del}><Trash2 size={14} /></button>
        </div>
        <select value={option.status} onChange={(e) => setStatus(e.target.value as Status)} style={{ padding: '3px 8px', fontSize: 12, width: 'auto' }} aria-label="Status">
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
    </div>
  );
}

export function CompareTable({ options }: { options: Option[] }) {
  const { state } = useStore();
  const cur = state.settings.currency;
  const customKeys = Array.from(new Set(options.flatMap((o) => Object.keys(o.custom))));
  const costs = options.map((o) => o.cost).filter((c) => c > 0);
  const bestCost = costs.length ? Math.min(...costs) : -1;
  const bestRating = Math.max(...options.map((o) => o.rating));
  const Row = ({ label, cell }: { label: string; cell: (o: Option) => React.ReactNode }) => (
    <tr><th>{label}</th>{options.map((o) => <td key={o.id}>{cell(o)}</td>)}</tr>
  );
  return (
    <div className="cmp card flat">
      <table>
        <thead><tr><th></th>{options.map((o) => <td key={o.id}><strong className="serif" style={{ fontSize: 17 }}>{o.name}</strong><div className="tiny muted">{o.vendor}</div></td>)}</tr></thead>
        <tbody>
          <tr><th>Cost</th>{options.map((o) => <td key={o.id} className={o.cost > 0 && o.cost === bestCost ? 'best' : ''}>{money(o.cost, cur)}{o.cost > 0 && o.cost === bestCost && options.length > 1 ? ' · lowest' : ''}</td>)}</tr>
          <tr><th>Rating</th>{options.map((o) => <td key={o.id} className={o.rating > 0 && o.rating === bestRating ? 'best' : ''}><Stars value={o.rating} size={14} /></td>)}</tr>
          <Row label="Status" cell={(o) => <StatusPill status={o.status} />} />
          <Row label="Location" cell={(o) => o.location || '—'} />
          <Row label="Book ahead" cell={(o) => (o.leadTimeMonths ? `${o.leadTimeMonths} months` : '—')} />
          <Row label="Availability" cell={(o) => o.availability || '—'} />
          <Row label="Timelines" cell={(o) => (o.scenarioIds.length ? o.scenarioIds.map((id) => state.scenarios.find((s) => s.id === id)?.name).filter(Boolean).join(', ') : 'All')} />
          <Row label="Pros" cell={(o) => o.pros || '—'} />
          <Row label="Cons" cell={(o) => o.cons || '—'} />
          {customKeys.map((k) => <Row key={k} label={k} cell={(o) => o.custom[k] || '—'} />)}
          <Row label="Link" cell={(o) => (o.url ? <a href={o.url} target="_blank" rel="noreferrer">Open ↗</a> : '—')} />
        </tbody>
      </table>
    </div>
  );
}

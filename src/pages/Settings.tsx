import { useRef } from 'react';
import { Download, Eye, EyeOff, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { AppState, Category, uid } from '../../shared/types';
import { seedState } from '../../shared/seed';
import { useStore } from '../store';
import { Field, ICONS, NumInput, PageHead } from '../components/ui';

export default function Settings() {
  const { state, update, toast } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const set = (p: Partial<AppState['settings']>) => update((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  const patchCat = (id: string, p: Partial<Category>) => update((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...p } : c)) }));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `yabi-ena-johnny-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as AppState;
      if (!Array.isArray(data.options) || !data.settings || !Array.isArray(data.categories)) throw new Error('bad file');
      if (confirm('Replace everything with this backup?')) { update(() => data); toast('Backup restored'); }
    } catch { alert('That file doesn’t look like a Yabi Ena Johnny backup.'); }
  };

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHead eyebrow="Make it yours" title="Settings" />
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>The basics</h3>
        <div className="grid g2">
          <Field label="Couple name(s)"><input value={state.settings.coupleNames} onChange={(e) => set({ coupleNames: e.target.value })} /></Field>
          <Field label="Currency"><select value={state.settings.currency} onChange={(e) => set({ currency: e.target.value })}>{['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ETB'].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Home country" hint="Venues in any other country are flagged as abroad."><input value={state.settings.homeCountry} onChange={(e) => set({ homeCountry: e.target.value })} /></Field>
          <Field label="Total budget"><NumInput value={state.settings.totalBudget} onChange={(n) => set({ totalBudget: n })} /></Field>
          <Field label="Guest count (estimate)"><NumInput value={state.settings.guestCount} onChange={(n) => set({ guestCount: n })} /></Field>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <h3>Categories</h3>
          <button className="btn sm" onClick={() => { const id = uid('cat'); update((s) => ({ ...s, categories: [...s.categories, { id, name: 'New category', icon: 'sparkles', color: '#8C786A', description: '', kind: 'vendor' }], budget: [...s.budget, { categoryId: id, min: 0, target: 0, max: 0 }] })); }}><Plus size={14} /> Add</button>
        </div>
        <div className="small muted" style={{ marginBottom: 10 }}>Rename, recolour, or add the things only your wedding needs. Hidden categories keep everything you entered and can be shown again any time.</div>
        {state.categories.map((c) => (
          <div key={c.id} className="row wrap" style={{ padding: '8px 0', borderTop: '1px solid var(--border)', opacity: c.hidden ? 0.55 : 1 }}>
            <input type="color" value={c.color} onChange={(e) => patchCat(c.id, { color: e.target.value })} style={{ width: 40, padding: 2, height: 36 }} aria-label="Colour" />
            <select value={c.icon} onChange={(e) => patchCat(c.id, { icon: e.target.value })} style={{ width: 120 }} aria-label="Icon">{Object.keys(ICONS).map((k) => <option key={k}>{k}</option>)}</select>
            <input className="grow" value={c.name} onChange={(e) => patchCat(c.id, { name: e.target.value })} aria-label="Name" />
            <button className="btn sm ghost" title={c.hidden ? 'Show this category again' : 'Hide from the sidebar, dashboard and budget (data is kept)'} onClick={() => patchCat(c.id, { hidden: !c.hidden })}>{c.hidden ? <><EyeOff size={14} /> Hidden</> : <><Eye size={14} /> Shown</>}</button>
            <select value={c.kind} onChange={(e) => patchCat(c.id, { kind: e.target.value as Category['kind'] })} style={{ width: 110 }} aria-label="Type"><option value="vendor">Vendors</option><option value="people">People</option></select>
            <button className="btn sm icon ghost danger" aria-label="Delete category" onClick={() => {
              const n = state.options.filter((o) => o.categoryId === c.id).length;
              if (confirm(`Delete "${c.name}"${n ? ` and its ${n} option(s)` : ''}?`)) update((s) => ({ ...s, categories: s.categories.filter((x) => x.id !== c.id), budget: s.budget.filter((b) => b.categoryId !== c.id), options: s.options.filter((o) => o.categoryId !== c.id), checklist: s.checklist.filter((i) => i.categoryId !== c.id) }));
            }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Your data</h3>
        <div className="small muted" style={{ marginBottom: 12 }}>Everything is saved to the shared planner file on the server (and cached in this browser). Export a backup any time.</div>
        <div className="row wrap">
          <button className="btn" onClick={exportData}><Download size={15} /> Export backup</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Import backup</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <button className="btn danger" onClick={() => confirm('Erase everything and start from the template?') && update(() => seedState())}><RotateCcw size={15} /> Reset to template</button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Settings, X, Save, Columns, Plus, Trash2, Hash, Calendar, ToggleLeft, List } from 'lucide-react';

export default function TableSettingsModal({ isOpen, table, onClose, onSave, onAddColumn, onDeleteColumn }) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && table) {
      setLabel(table.label || '');
      setDescription(table.description || '');
      setError('');
    }
  }, [isOpen, table]);

  if (!isOpen || !table) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!label.trim()) return setError('Le nom de la table est obligatoire.');
    setSaving(true);
    setError('');
    try {
      await onSave({ label: label.trim(), description: description.trim() });
      onClose();
    } catch (err) {
      setError(err.message || 'Impossible de modifier la table.');
    } finally {
      setSaving(false);
    }
  };

  const typeIcon = (type) => {
    if (type === 'number' || type === 'int') return <Hash className="h-3.5 w-3.5 text-emerald-500" />;
    if (type === 'date') return <Calendar className="h-3.5 w-3.5 text-amber-500" />;
    if (type === 'boolean') return <ToggleLeft className="h-3.5 w-3.5 text-indigo-500" />;
    if (type === 'select') return <List className="h-3.5 w-3.5 text-purple-500" />;
    return <span className="text-[10px] font-mono text-slate-400">Aa</span>;
  };
  const typeLabel = (type) => ({ int: 'INT', number: 'FLOAT', date: 'DATE', boolean: 'BOOLEAN', select: 'TEXT (liste)', text: 'TEXT' }[type] || String(type).toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Settings className="h-5 w-5" /></span>
            <div><h2 className="text-sm font-semibold text-slate-900">Paramètres de la table</h2><p className="text-xs text-slate-500">{table.name}</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <label className="block text-xs font-medium text-slate-700">Nom affiché
            <input autoFocus required value={label} onChange={e => setLabel(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </label>
          <label className="block text-xs font-medium text-slate-700">Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </label>
          <p className="text-[11px] leading-relaxed text-slate-500">Le nom technique reste « {table.name} » pour conserver les connexions aux pages et aux blocs. Le nom affiché est actualisé partout automatiquement.</p>
          <section className="border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600"><Columns className="h-3.5 w-3.5" />Colonnes ({table.columns?.length || 0})</h3>
              <button type="button" onClick={onAddColumn} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"><Plus className="h-3.5 w-3.5" />Créer</button>
            </div>
            {table.columns?.length ? (
              <div className="space-y-2">
                {table.columns.map(column => (
                  <div key={column.id} title={`Type : ${typeLabel(column.type)}`} className="group relative flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {typeIcon(column.type)}
                      <span className="truncate text-xs font-medium text-slate-800">{column.label}</span>
                      <span className="truncate font-mono text-[10px] text-slate-400">{column.name}</span>
                      {column.options?.dependsOn && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Dépend de : {column.options.dependsOn}
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={() => onDeleteColumn(column)} title={`Supprimer ${column.label}`} aria-label={`Supprimer la colonne ${column.label}`} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    <span className="pointer-events-none absolute bottom-full left-3 z-20 mb-1 hidden rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block group-focus-within:block">Type : {typeLabel(column.type)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400">Aucune colonne pour le moment.</p>}
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200">Annuler</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}

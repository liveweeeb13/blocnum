import React, { useState } from 'react';
import { X, Plus, Trash2, Table as TableIcon } from 'lucide-react';

export default function CreateTableModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState([
    { name: 'titre', label: 'Titre', type: 'text', required: true }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddColumn = () => {
    setColumns([
      ...columns,
      { name: '', label: '', type: 'text', required: false, optionsStr: '' }
    ]);
  };

  const handleRemoveColumn = (index) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index, field, value) => {
    const updated = [...columns];
    updated[index][field] = value;
    // Auto-fill label if name is typed
    if (field === 'name' && !updated[index].label) {
      updated[index].label = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setColumns(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !label.trim()) {
      setError('Veuillez renseigner le nom et le libellé de la table');
      return;
    }

    const processedColumns = columns.map(c => {
      let options = [];
      if (c.type === 'select' && c.optionsStr) {
        options = c.optionsStr.split(',').map(s => s.trim()).filter(Boolean);
      }
      return {
        name: c.name.trim(),
        label: c.label.trim() || c.name.trim(),
        type: c.type,
        options,
        required: !!c.required
      };
    }).filter(c => !!c.name);

    setLoading(true);
    try {
      await onCreate({
        name: name.trim().toLowerCase(),
        label: label.trim(),
        description: description.trim(),
        columns: processedColumns
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la création de la table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Créer une nouvelle table</h3>
              <p className="text-xs text-slate-500">Configurez votre table et ses colonnes initiales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Libellé affiché <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Commandes"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (!name) {
                    setName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                  }
                }}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom technique (BDD) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: commandes"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Suivi des commandes clients"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Columns Section */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-700">
                Colonnes de la table
              </label>
              <button
                type="button"
                onClick={handleAddColumn}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une colonne</span>
              </button>
            </div>

            <div className="space-y-3">
              {columns.map((col, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nom technique (ex: montant)"
                      value={col.name}
                      onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Libellé (ex: Montant TTC)"
                      value={col.label}
                      onChange={(e) => handleColumnChange(index, 'label', e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={col.type}
                      onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="text">Texte</option>
                      <option value="int">Nombre entier (INT)</option>
                      <option value="number">Nombre décimal (FLOAT)</option>
                      <option value="date">Date</option>
                      <option value="boolean">Booléen (Oui/Non)</option>
                      <option value="select">Liste de choix</option>
                    </select>

                    {columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(index)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {col.type === 'select' && (
                    <input
                      type="text"
                      placeholder="Choix séparés par des virgules (ex: En attente, Validé, Annulé)"
                      value={col.optionsStr || ''}
                      onChange={(e) => handleColumnChange(index, 'optionsStr', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {loading ? 'Création...' : 'Créer la table'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';

export default function AddColumnModal({ isOpen, onClose, onAdd, tableName }) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [optionsStr, setOptionsStr] = useState('');
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Le nom technique est obligatoire');
      return;
    }

    let options = [];
    if (type === 'select' && optionsStr) {
      options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
    }

    setLoading(true);
    try {
      await onAdd({
        name: name.trim().toLowerCase(),
        label: label.trim() || name.trim(),
        type,
        options,
        required
      });
      onClose();
      // Reset
      setName('');
      setLabel('');
      setType('text');
      setOptionsStr('');
      setRequired(false);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'ajout de la colonne');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ajouter une colonne</h3>
              <p className="text-xs text-slate-500">Pour la table <code className="text-indigo-600 font-mono">{tableName}</code></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Libellé de la colonne
            </label>
            <input
              type="text"
              placeholder="Ex: Date de livraison"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!name) {
                  setName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom technique (SQL) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: date_livraison"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Type de données
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="text">Texte</option>
              <option value="int">Nombre entier (INT)</option>
              <option value="number">Nombre décimal (FLOAT)</option>
              <option value="date">Date</option>
              <option value="boolean">Booléen (Oui / Non)</option>
              <option value="select">Liste de choix (Select)</option>
            </select>
          </div>

          {type === 'select' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Options possibles (séparées par des virgules)
              </label>
              <input
                type="text"
                placeholder="Ex: En cours, Terminé, Annulé"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="req_check"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="req_check" className="text-xs text-slate-600 cursor-pointer">
              Champ obligatoire
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {loading ? 'Ajout...' : 'Ajouter la colonne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

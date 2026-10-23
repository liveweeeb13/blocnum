import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Plus, ArrowRight } from 'lucide-react';
import { getSelectOptions, getColumnDependency } from '../../utils/formOptions';
import FormSelectField from '../Common/FormSelectField';

export default function RecordModal({ isOpen, onClose, onSave, columns = [], initialData = null }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const defaults = {};
      columns.forEach(col => {
        if (col.type === 'boolean') {
          defaults[col.name] = 0;
        } else {
          defaults[col.name] = '';
        }
      });
      setFormData(defaults);
    }
  }, [initialData, columns, isOpen]);

  if (!isOpen) return null;

  const handleChange = (name, value) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: value
      };
      // Reset dependent columns if their parent value changes
      columns.forEach(otherCol => {
        if (getColumnDependency(otherCol) === name) {
          const validOptions = getSelectOptions(otherCol, next);
          if (!validOptions.includes(next[otherCol.name])) {
            next[otherCol.name] = '';
          }
        }
      });
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              {isEdit ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {isEdit ? `Modifier l'enregistrement #${initialData.id}` : 'Nouvelle entrée manuelle'}
              </h3>
              <p className="text-xs text-slate-500">Renseignez les valeurs pour chaque champ</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              {error}
            </div>
          )}

          {columns.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-4">
              Aucune colonne définie pour cette table. Ajoutez d'abord des colonnes.
            </p>
          ) : (
            columns.map(col => {
              const val = formData[col.name] !== undefined ? formData[col.name] : '';

              return (
                <div key={col.name}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {col.label} {col.required ? <span className="text-red-500">*</span> : null}
                  </label>

                  {col.type === 'boolean' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`field_${col.name}`}
                        checked={!!val}
                        onChange={(e) => handleChange(col.name, e.target.checked ? 1 : 0)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <label htmlFor={`field_${col.name}`} className="text-xs text-slate-600 cursor-pointer">
                        {val ? 'Vrai' : 'Faux'}
                      </label>
                    </div>
                  ) : col.type === 'select' ? (
                    <FormSelectField
                      col={col}
                      val={val}
                      columns={columns}
                      formData={formData}
                      onChange={handleChange}
                    />
                  ) : col.type === 'number' || col.type === 'int' ? (
                    <input
                      type="number"
                      step={col.type === 'int' ? '1' : 'any'}
                      value={val}
                      required={!!col.required}
                      onChange={(e) => handleChange(col.name, e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={`0`}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : col.type === 'date' ? (
                    <input
                      type="date"
                      value={val}
                      required={!!col.required}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      required={!!col.required}
                      placeholder={`Valeur pour ${col.label}...`}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              );
            })
          )}

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
              disabled={loading || columns.length === 0}
              className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

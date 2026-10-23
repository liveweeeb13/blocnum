import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Split, Code2, ListTree, Sparkles, Plus, Trash2 } from 'lucide-react';
import { parseMappingInput } from '../../utils/formOptions';

export default function AddColumnModal({ isOpen, onClose, onAdd, tableName, existingColumns = [] }) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Select configuration state
  const [selectMode, setSelectMode] = useState('simple'); // 'simple' | 'conditional'
  const [optionsStr, setOptionsStr] = useState('');
  const [dependsOn, setDependsOn] = useState('');
  const [mappingFormat, setMappingFormat] = useState('visual'); // 'visual' | 'code'
  const [mappingRows, setMappingRows] = useState([
    { key: 'A', values: 'Station 1, Station 2' },
    { key: 'B', values: 'Station 3, Station 4' }
  ]);
  const [rawMappingText, setRawMappingText] = useState('');

  // Always reset fields when opening modal
  useEffect(() => {
    if (isOpen) {
      setName('');
      setLabel('');
      setType('text');
      setRequired(false);
      setSelectMode('simple');
      setOptionsStr('');
      setDependsOn('');
      setMappingFormat('visual');
      setMappingRows([
        { key: 'A', values: 'Station 1, Station 2' },
        { key: 'B', values: 'Station 3, Station 4' }
      ]);
      setRawMappingText('');
      setError('');
    }
  }, [isOpen]);

  // Automatically pick first suitable parent column when switching to conditional
  useEffect(() => {
    if (selectMode === 'conditional' && !dependsOn && existingColumns.length > 0) {
      setDependsOn(existingColumns[0].name);
    }
  }, [selectMode, dependsOn, existingColumns]);

  // When parent column is chosen, pre-fill keys if parent is a select with options
  useEffect(() => {
    if (dependsOn) {
      const parentCol = existingColumns.find(c => c.name === dependsOn);
      if (parentCol && Array.isArray(parentCol.options) && parentCol.options.length > 0) {
        setMappingRows(prev => {
          // If mapping is still empty or single blank, populate from parent options
          if (prev.length <= 1 && (!prev[0] || !prev[0].key)) {
            return parentCol.options.map(opt => ({ key: String(opt), values: '' }));
          }
          return prev;
        });
      }
    }
  }, [dependsOn, existingColumns]);

  if (!isOpen) return null;

  const handleAddMappingRow = () => {
    setMappingRows(prev => [...prev, { key: '', values: '' }]);
  };

  const handleRemoveMappingRow = (index) => {
    setMappingRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleMappingRowChange = (index, field, val) => {
    setMappingRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Helper to load Lyon Metro example as requested by user
  const handleLoadMetroExample = () => {
    setName('direction');
    setLabel('Direction');
    setType('select');
    setSelectMode('conditional');
    setMappingFormat('visual');
    setMappingRows([
      { key: 'A', values: 'Station 1, Station 2' },
      { key: 'B', values: 'Station 3, Station 4' }
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Le nom technique est obligatoire');
      return;
    }

    let options = [];
    if (type === 'select') {
      if (selectMode === 'simple') {
        if (!optionsStr.trim()) {
          setError('Veuillez renseigner au moins une option pour la liste de choix');
          return;
        }
        options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        // Conditional mode
        if (!dependsOn) {
          setError('Veuillez sélectionner la colonne dont dépend cette liste');
          return;
        }

        let mapping = {};
        if (mappingFormat === 'code') {
          mapping = parseMappingInput(rawMappingText);
        } else {
          mappingRows.forEach(r => {
            const k = r.key.trim();
            if (k) {
              mapping[k] = r.values.split(',').map(s => s.trim()).filter(Boolean);
            }
          });
        }

        if (Object.keys(mapping).length === 0) {
          setError('Veuillez définir au moins une condition et ses options associées');
          return;
        }

        options = {
          dependsOn,
          mapping
        };
      }
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
      // Reset form
      setName('');
      setLabel('');
      setType('text');
      setOptionsStr('');
      setSelectMode('simple');
      setDependsOn('');
      setMappingRows([{ key: '', values: '' }]);
      setRawMappingText('');
      setRequired(false);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'ajout de la colonne');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ajouter une colonne</h3>
              <p className="text-xs text-slate-500">Pour la table <code className="text-indigo-600 font-mono font-medium">{tableName}</code></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Libellé affiché
              </label>
              <input
                type="text"
                placeholder="Ex: Station de métro"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (!name) {
                    setName(e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_'));
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
                placeholder="Ex: station_metro"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Type de données
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
            >
              <option value="text">Texte</option>
              <option value="select">Liste de choix</option>
              <option value="int">Nombre entier (INT)</option>
              <option value="number">Nombre décimal (FLOAT)</option>
              <option value="date">Date</option>
              <option value="boolean">Booléen</option>
            </select>
          </div>

          {/* SELECT OPTIONS CONFIGURATION */}
          {type === 'select' && (
            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ListTree className="w-4 h-4 text-indigo-600" />
                  Configuration de la liste de choix
                </span>

                <button
                  type="button"
                  onClick={handleLoadMetroExample}
                  className="text-[11px] font-medium text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
            
                </button>
              </div>

              {/* Mode Toggle: Simple vs Conditionnelle */}
              <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-indigo-100">
                <button
                  type="button"
                  onClick={() => setSelectMode('simple')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    selectMode === 'simple'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Liste fixe (Simple)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectMode('conditional')}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    selectMode === 'conditional'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Conditionnelle (Dépendante)</span>
                </button>
              </div>

              {/* 1. SIMPLE SELECT */}
              {selectMode === 'simple' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Options possibles (séparées par des virgules)
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Les valeurs saisies s'afficheront dans le menu déroulant.
                  </p>
                </div>
              )}

              {/* 2. CONDITIONAL / DEPENDENT SELECT */}
              {selectMode === 'conditional' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cette liste dépend du choix dans la colonne :
                    </label>
                    {existingColumns.length > 0 ? (
                      <select
                        value={dependsOn}
                        onChange={(e) => setDependsOn(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
                      >
                        <option value="">-- Choisir la colonne parente --</option>
                        {existingColumns.map(c => (
                          <option key={c.name} value={c.name}>
                            {c.label} ({c.name})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        ⚠️ Cette table n'a pas encore d'autre colonne. Créez d'abord la colonne parente (ex: « Ligne ») pour pouvoir y lier cette liste.
                      </p>
                    )}
                  </div>

                  {/* Format Sub-Toggle: Visual vs Code */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-700">
                      Options selon la valeur choisie :
                    </span>
                    <div className="flex items-center gap-1 text-[11px] bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          if (mappingFormat === 'code' && rawMappingText) {
                            const parsed = parseMappingInput(rawMappingText);
                            const rows = Object.entries(parsed).map(([k, v]) => ({ key: k, values: v.join(', ') }));
                            if (rows.length) setMappingRows(rows);
                          }
                          setMappingFormat('visual');
                        }}
                        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          mappingFormat === 'visual' ? 'bg-white font-semibold text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Visuel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const mappingObj = {};
                          mappingRows.forEach(r => {
                            if (r.key.trim()) mappingObj[r.key.trim()] = r.values.split(',').map(s => s.trim()).filter(Boolean);
                          });
                          setRawMappingText(JSON.stringify(mappingObj, null, 2));
                          setMappingFormat('code');
                        }}
                        className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                          mappingFormat === 'code' ? 'bg-white font-semibold text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Code2 className="w-3 h-3" />
                        <span>Code / JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* VISUAL MAPPING ROWS */}
                  {mappingFormat === 'visual' ? (
                    <div className="space-y-2">
                      {mappingRows.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                          <div className="w-1/3">
                            <label className="block text-[10px] text-slate-400 mb-0.5">Si valeur parente =</label>
                            <input
                              type="text"
                              placeholder="Ex: A"
                              value={row.key}
                              onChange={(e) => handleMappingRowChange(idx, 'key', e.target.value)}
                              className="w-full px-2 py-1 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                            />
                          </div>

                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-400 mb-0.5">Alors options proposées (séparées par virgules)</label>
                            <input
                              type="text"
                              placeholder="Ex: Station 1, Station 2"
                              value={row.values}
                              onChange={(e) => handleMappingRowChange(idx, 'values', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveMappingRow(idx)}
                            disabled={mappingRows.length <= 1}
                            className="mt-3.5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddMappingRow}
                        className="w-full py-1.5 border border-dashed border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter une condition</span>
                      </button>
                    </div>
                  ) : (
                    /* CODE / PASTE MAPPING */
                    <div>
                      <textarea
                        rows={6}
                        value={rawMappingText}
                        onChange={(e) => setRawMappingText(e.target.value)}
                        placeholder={`Collez votre objet JSON ou JS ici :\n{\n  '1': ['Station 1', 'Station 2'],\n  '2': ['Station 3', 'Station 4']\n}`}
                        className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-emerald-400"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Accepte du JSON standard, des objets JS avec apostrophes ou un format simple clé : val1, val2.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="req_check"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="req_check" className="text-xs text-slate-700 font-medium cursor-pointer">
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {loading ? 'Ajout...' : 'Ajouter la colonne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

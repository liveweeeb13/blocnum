import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';
import CreateTableModal from './CreateTableModal';
import AddColumnModal from './AddColumnModal';
import TableSettingsModal from './TableSettingsModal';
import RecordModal from './RecordModal';
import { 
  Database, Plus, Trash2, Edit2, Search, RefreshCw, 
  AlertCircle, CheckCircle2, ChevronRight, Hash, Calendar, ToggleLeft, List, Settings
} from 'lucide-react';

export default function DatabaseStudio() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [newRecordData, setNewRecordData] = useState({});
  const [savingRecord, setSavingRecord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // Modals
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchTables = async (selectName = null) => {
    try {
      setLoading(true);
      const res = await apiRequest('/tables');
      setTables(res.tables || []);

      if (res.tables && res.tables.length > 0) {
        if (selectName) {
          const match = res.tables.find(t => t.name === selectName);
          setSelectedTable(match || res.tables[0]);
        } else if (!selectedTable) {
          setSelectedTable(res.tables[0]);
        } else {
          // Refresh selected table definition
          const updated = res.tables.find(t => t.id === selectedTable.id);
          setSelectedTable(updated || res.tables[0]);
        }
      } else {
        setSelectedTable(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur chargement des tables : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName) => {
    if (!tableName) return;
    try {
      setDataLoading(true);
      const res = await apiRequest(`/tables/${tableName}/data`);
      setTableData(res.rows || []);
    } catch (err) {
      console.error(err);
      showToast('Erreur chargement des données : ' + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable.name);
      const defaults = {};
      (selectedTable.columns || []).forEach(col => { defaults[col.name] = col.type === 'boolean' ? 0 : ''; });
      setNewRecordData(defaults);
    } else {
      setTableData([]);
      setNewRecordData({});
    }
  }, [selectedTable?.name]);

  // Handle table creation
  const handleCreateTable = async (payload) => {
    const res = await apiRequest('/tables', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(`Table "${payload.label}" créée avec succès`);
    await fetchTables(res.table?.name);
  };

  // Handle delete table
  const handleDeleteTable = async (table) => {
    if (!window.confirm(`Confirmez-vous la suppression de la table "${table.label}" (${table.name}) et de toutes ses données ?`)) {
      return;
    }
    try {
      await apiRequest(`/tables/${table.id}`, { method: 'DELETE' });
      showToast(`Table "${table.label}" supprimée`);
      await fetchTables();
    } catch (err) {
      showToast('Erreur suppression : ' + err.message);
    }
  };

  // Handle add column
  const handleAddColumn = async (payload) => {
    const request = { method: 'POST', body: JSON.stringify(payload) };
    try {
      await apiRequest(`/tables/${encodeURIComponent(selectedTable.name)}/columns`, request);
    } catch (err) {
      // Support API servers that have not yet loaded the name-based route.
      if (!/404|introuvable/i.test(err.message)) throw err;
      await apiRequest(`/tables/${selectedTable.id}/columns`, request);
    }
    showToast(`Colonne "${payload.label}" ajoutée`);
    await fetchTables(selectedTable.name);
  };

  const handleDeleteColumn = async (column) => {
    if (!window.confirm(`Supprimer la colonne « ${column.label} » et toutes ses valeurs ?`)) return;
    try {
      await apiRequest(`/tables/${selectedTable.id}/columns/${column.id}`, { method: 'DELETE' });
      showToast(`Colonne « ${column.label} » supprimée`);
      await fetchTables(selectedTable.name);
    } catch (err) {
      showToast('Erreur de suppression : ' + err.message);
    }
  };

  const handleSaveTableSettings = async (payload) => {
    await apiRequest(`/tables/${selectedTable.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    showToast('Paramètres de la table mis à jour');
    await fetchTables(selectedTable.name);
  };

  // Handle save record (insert or update)
  const handleSaveRecord = async (formData) => {
    if (editingRecord) {
      await apiRequest(`/tables/${selectedTable.name}/data/${editingRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      showToast('Enregistrement mis à jour');
    } else {
      await apiRequest(`/tables/${selectedTable.name}/data`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast('Nouvelle entrée ajoutée');
    }
    await fetchTableData(selectedTable.name);
    await fetchTables(selectedTable.name);
  };

  const handleCreateInlineRecord = async () => {
    if (!selectedTable || savingRecord) return;
    try {
      setSavingRecord(true);
      await apiRequest(`/tables/${selectedTable.name}/data`, { method: 'POST', body: JSON.stringify(newRecordData) });
      showToast('Nouvelle entrée ajoutée');
      const defaults = {};
      (selectedTable.columns || []).forEach(col => { defaults[col.name] = col.type === 'boolean' ? 0 : ''; });
      setNewRecordData(defaults);
      await fetchTableData(selectedTable.name);
      await fetchTables(selectedTable.name);
    } catch (err) {
      showToast('Erreur lors de l’ajout : ' + err.message);
    } finally {
      setSavingRecord(false);
    }
  };

  // Handle delete record
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Supprimer cette entrée ?')) return;
    try {
      await apiRequest(`/tables/${selectedTable.name}/data/${recordId}`, {
        method: 'DELETE'
      });
      showToast('Entrée supprimée');
      await fetchTableData(selectedTable.name);
      await fetchTables(selectedTable.name);
    } catch (err) {
      showToast('Erreur suppression : ' + err.message);
    }
  };

  // Filter rows
  const filteredRows = tableData.filter(row => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return Object.values(row).some(val => 
      val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'int':
      case 'number': return <Hash className="w-3 h-3 text-emerald-500" />;
      case 'date': return <Calendar className="w-3 h-3 text-amber-500" />;
      case 'boolean': return <ToggleLeft className="w-3 h-3 text-indigo-500" />;
      case 'select': return <List className="w-3 h-3 text-purple-500" />;
      default: return <span className="text-[10px] font-mono text-slate-400">Aa</span>;
    }
  };

  const getTypeLabel = (type) => ({ int: 'INT', number: 'FLOAT', date: 'DATE', boolean: 'BOOLEAN', select: 'TEXT (liste)', text: 'TEXT' }[type] || String(type).toUpperCase());

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sidebar: Tables List */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Tables de Données</h2>
          </div>
          <button
            onClick={() => setIsCreateTableOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs transition-all hover:bg-indigo-500 cursor-pointer"
            aria-label="Créer une nouvelle table"
            title="Créer une nouvelle liste de données (ex: Clients, Commandes)"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400">Chargement...</div>
          ) : tables.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Aucune table pour le moment. Cliquez sur "Nouvelle table" pour commencer !
            </div>
          ) : (
            tables.map(table => {
              const isSelected = selectedTable?.id === table.id;
              return (
                <div key={table.id} className={`group flex items-center gap-1 rounded-xl transition-all ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200/80 shadow-xs' : 'hover:bg-slate-100/80'}`}>
                  <button
                    onClick={() => setSelectedTable(table)}
                    className={`min-w-0 flex-1 flex items-center justify-between p-2.5 rounded-xl text-left text-xs cursor-pointer ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Database className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <div className="truncate font-medium">{table.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">app_{table.name}</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table)}
                    title={`Supprimer la table ${table.label}`}
                    aria-label={`Supprimer la table ${table.label}`}
                    className={`mr-1.5 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Panel: Selected Table Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {selectedTable ? (
          <>
            {/* Table Header Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900">{selectedTable.label}</h1>
                  <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                    app_{selectedTable.name}
                  </span>
                </div>
                {selectedTable.description && (
                  <p className="text-xs text-slate-500 mt-1">{selectedTable.description}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsTableSettingsOpen(true)}
                  aria-label="Paramètres de la table"
                  title="Paramètres de la table"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-xs transition-all hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                </button>

              </div>
            </div>

            {/* Table Toolbar (Search & Count) */}
            <div className="p-4 px-6 flex items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher dans les données..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <button
                  onClick={() => fetchTableData(selectedTable.name)}
                  className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-600 transition-colors"
                  title="Rafraîchir les données"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                </button>
                <span>{filteredRows.length} entrée(s)</span>
              </div>
            </div>

            {/* Data Grid */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10 backdrop-blur-xs">
                        <th className="py-3 px-4 w-14 font-mono text-slate-400"># ID</th>
                        {selectedTable.columns?.map(col => (
                          <th key={col.id} title={`Type : ${getTypeLabel(col.type)}`} className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {getTypeIcon(col.type)}
                              <span>{col.label}</span>
                            </div>
                          </th>
                        ))}
                        <th className="py-3 px-4 whitespace-nowrap text-slate-400 font-normal">Créé le</th>
                        <th className="py-3 px-4 w-20 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-indigo-50/50">
                        <td className="py-2 px-4 font-mono text-slate-300">—</td>
                        {selectedTable.columns?.map(col => (
                          <td key={col.id} className="py-2 px-2 min-w-40">
                            {col.type === 'boolean' ? (
                              <input type="checkbox" checked={!!newRecordData[col.name]} onChange={e => setNewRecordData(prev => ({ ...prev, [col.name]: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-indigo-600" aria-label={col.label} />
                            ) : col.type === 'select' ? (
                              <select value={newRecordData[col.name] ?? ''} required={!!col.required} onChange={e => setNewRecordData(prev => ({ ...prev, [col.name]: e.target.value }))} className="w-full min-w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                                <option value="">{col.label}</option>
                                {(col.options || []).map((option, index) => <option key={index} value={option}>{option}</option>)}
                              </select>
                            ) : (
                              <input type={col.type === 'number' || col.type === 'int' ? 'number' : col.type === 'date' ? 'date' : 'text'} step={col.type === 'int' ? '1' : col.type === 'number' ? 'any' : undefined} required={!!col.required} value={newRecordData[col.name] ?? ''} placeholder={col.label} onChange={e => setNewRecordData(prev => ({ ...prev, [col.name]: (col.type === 'number' || col.type === 'int') && e.target.value !== '' ? Number(e.target.value) : e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateInlineRecord(); } }} className="w-full min-w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                            )}
                          </td>
                        ))}
                        <td className="py-2 px-4 text-slate-300">—</td>
                        <td className="py-2 px-3 text-right">
                          <button type="button" onClick={handleCreateInlineRecord} disabled={savingRecord || !selectedTable.columns?.length} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                            <Plus className="h-3.5 w-3.5" /> Ajouter
                          </button>
                        </td>
                      </tr>
                      {dataLoading ? (
                        <tr>
                          <td colSpan={(selectedTable.columns?.length || 0) + 3} className="py-12 text-center text-slate-400">
                            Chargement des données...
                          </td>
                        </tr>
                      ) : filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={(selectedTable.columns?.length || 0) + 3} className="py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <AlertCircle className="w-8 h-8 text-slate-300" />
                              <p className="font-medium">Aucun enregistrement dans cette table</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map(row => (
                          <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="py-3 px-4 font-mono text-slate-400 font-medium">#{row.id}</td>
                            {selectedTable.columns?.map(col => {
                              const val = row[col.name];
                              return (
                                <td key={col.id} className="py-3 px-4 whitespace-nowrap text-slate-700">
                                  {col.type === 'boolean' ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {val ? 'Oui' : 'Non'}
                                    </span>
                                  ) : col.type === 'select' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      {val || '-'}
                                    </span>
                                  ) : (
                                    <span>{val !== null && val !== undefined && val !== '' ? String(val) : <span className="text-slate-300 italic">null</span>}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                              {row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingRecord(row);
                                    setIsRecordModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Modifier</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(row.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Supprimer</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <Database className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Aucune table sélectionnée</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Créez votre première table ou sélectionnez-en une dans la colonne de gauche pour gérer les colonnes et les entrées.
            </p>
            <button
              onClick={() => setIsCreateTableOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-sm transition-all"
            >
              + Créer une table
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateTableModal
        isOpen={isCreateTableOpen}
        onClose={() => setIsCreateTableOpen(false)}
        onCreate={handleCreateTable}
      />

      <TableSettingsModal
        isOpen={isTableSettingsOpen}
        table={selectedTable}
        onClose={() => setIsTableSettingsOpen(false)}
        onSave={handleSaveTableSettings}
        onAddColumn={() => setIsAddColumnOpen(true)}
        onDeleteColumn={handleDeleteColumn}
      />

      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        onAdd={handleAddColumn}
        tableName={selectedTable?.label}
      />

      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        columns={selectedTable?.columns || []}
        initialData={editingRecord}
      />
    </div>
  );
}

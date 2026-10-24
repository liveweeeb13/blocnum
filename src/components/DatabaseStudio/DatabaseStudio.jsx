import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';
import CreateTableModal from './CreateTableModal';
import AddColumnModal from './AddColumnModal';
import TableSettingsModal from './TableSettingsModal';
import RecordModal from './RecordModal';
import { getSelectOptions, getColumnDependency } from '../../utils/formOptions';
import { 
  Database, Plus, Trash2, Edit2, Search, RefreshCw, 
  AlertCircle, CheckCircle2, ChevronRight, Hash, Calendar, ToggleLeft, List, Settings,
  X, Table as TableIcon, LayoutGrid, PlusCircle
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
  const [displayMode, setDisplayMode] = useState('table'); // 'table' | 'cards'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-50 min-w-0">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Mobile Top Bar (Screen < md) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Database className="w-4 h-4 text-indigo-600 shrink-0" />
          <select
            value={selectedTable?.name || ''}
            onChange={(e) => {
              const match = tables.find(t => t.name === e.target.value);
              if (match) setSelectedTable(match);
            }}
            className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
          >
            {tables.map(t => (
              <option key={t.id} value={t.name}>{t.label} ({t.rowCount ?? 0})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsCreateTableOpen(true)}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer"
            title="Créer une nouvelle table"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs cursor-pointer"
            title="Toutes les tables"
            aria-label="Toutes les tables"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Slide-over Drawer */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900">Tables de Données</h2>
              </div>
              <button 
                onClick={() => setMobileSidebarOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {tables.map(table => {
                const isSelected = selectedTable?.id === table.id;
                return (
                  <div key={table.id} className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <button
                      onClick={() => {
                        setSelectedTable(table);
                        setMobileSidebarOpen(false);
                      }}
                      className="flex-1 text-left truncate flex items-center gap-2 cursor-pointer"
                    >
                      <Database className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <div className="truncate">{table.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">app_{table.name}</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleDeleteTable(table)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer ml-1"
                      title="Supprimer la table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  setIsCreateTableOpen(true);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar: Tables List */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0">
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
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0">
        {selectedTable ? (
          <>
            {/* Table Header Bar */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{selectedTable.label}</h1>
                  <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                    app_{selectedTable.name}
                  </span>
                </div>
                {selectedTable.description && (
                  <p className="text-xs text-slate-500 mt-1 truncate">{selectedTable.description}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setIsRecordModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  title="Ajouter une nouvelle entrée avec le formulaire"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle entrée</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddColumnOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium shadow-2xs transition-all cursor-pointer"
                  title="Ajouter une colonne à la table"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Colonne</span>
                </button>

                <button
                  onClick={() => setIsTableSettingsOpen(true)}
                  aria-label="Paramètres de la table"
                  title="Paramètres de la table"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Table Toolbar (Search, View Toggle & Count) */}
            <div className="p-3 px-4 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher dans les données..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
                {/* View Switcher (Tableau vs Fiches) */}
                <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-slate-600 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('table')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      displayMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Affichage en tableau"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tableau</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('cards')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      displayMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Affichage en fiches (idéal sur mobile)"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Fiches</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fetchTableData(selectedTable.name)}
                    className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Rafraîchir les données"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <span className="text-slate-400 font-medium whitespace-nowrap">{filteredRows.length} entrée(s)</span>
                </div>
              </div>
            </div>

            {/* Data View: Table or Cards */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 min-w-0">
              {displayMode === 'cards' ? (
                /* Cards View (Perfect for Mobile / Tablets) */
                <div className="space-y-4">
                  {dataLoading ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Chargement des données...
                    </div>
                  ) : filteredRows.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-3">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-medium text-xs">Aucun enregistrement dans cette table</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecord(null);
                          setIsRecordModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer la première entrée</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredRows.map(row => (
                        <div key={row.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-indigo-300 hover:shadow-xs transition-all">
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/80">
                              #{row.id}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingRecord(row);
                                  setIsRecordModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Modifier</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(row.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            {selectedTable.columns?.map(col => {
                              const val = row[col.name];
                              return (
                                <div key={col.id} className="flex items-start justify-between gap-2">
                                  <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
                                    {getTypeIcon(col.type)}
                                    <span>{col.label} :</span>
                                  </span>
                                  <span className="text-slate-800 text-right font-medium break-words max-w-[65%]">
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
                                      val !== null && val !== undefined && val !== '' ? String(val) : <span className="text-slate-300 italic font-normal">null</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {row.created_at && (
                            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                              Créé le {new Date(row.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Table View with Sticky Columns */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-20 backdrop-blur-xs">
                          <th className="py-3 px-4 w-14 font-mono text-slate-400 sticky left-0 bg-slate-50 z-20"># ID</th>
                          {selectedTable.columns?.map(col => (
                            <th key={col.id} title={`Type : ${getTypeLabel(col.type)}`} className="py-3 px-4 whitespace-nowrap group/col">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  {getTypeIcon(col.type)}
                                  <span className="font-semibold text-slate-800">{col.label}</span>
                                  {col.options?.dependsOn && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-normal bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      {col.options.dependsOn}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteColumn(col);
                                  }}
                                  title={`Supprimer la colonne « ${col.label} »`}
                                  className="opacity-0 group-hover/col:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </th>
                          ))}
                          <th className="py-3 px-4 whitespace-nowrap text-slate-400 font-normal">Créé le</th>
                          <th className="py-3 px-4 w-28 text-right sticky right-0 bg-slate-50 z-20 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-indigo-50/50">
                          <td className="py-2 px-4 font-mono text-slate-300 sticky left-0 bg-indigo-50/90 z-10">—</td>
                          {selectedTable.columns?.map(col => (
                            <td key={col.id} className="py-2 px-2 min-w-[120px] max-w-[220px]">
                              {col.type === 'boolean' ? (
                                <input type="checkbox" checked={!!newRecordData[col.name]} onChange={e => setNewRecordData(prev => ({ ...prev, [col.name]: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-indigo-600" aria-label={col.label} />
                              ) : col.type === 'select' ? (
                                <InlineSelectCell
                                  col={col}
                                  value={newRecordData[col.name]}
                                  newRecordData={newRecordData}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setNewRecordData(prev => {
                                      const next = { ...prev, [col.name]: val };
                                      selectedTable.columns?.forEach(otherCol => {
                                        if (getColumnDependency(otherCol) === col.name) {
                                          const validOpts = getSelectOptions(otherCol, next);
                                          if (!validOpts.includes(next[otherCol.name])) {
                                            next[otherCol.name] = '';
                                          }
                                        }
                                      });
                                      return next;
                                    });
                                  }}
                                />
                              ) : (
                                <input type={col.type === 'number' || col.type === 'int' ? 'number' : col.type === 'date' ? 'date' : 'text'} step={col.type === 'int' ? '1' : col.type === 'number' ? 'any' : undefined} required={!!col.required} value={newRecordData[col.name] ?? ''} placeholder={col.label} onChange={e => setNewRecordData(prev => ({ ...prev, [col.name]: (col.type === 'number' || col.type === 'int') && e.target.value !== '' ? Number(e.target.value) : e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateInlineRecord(); } }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                              )}
                            </td>
                          ))}
                          <td className="py-2 px-4 text-slate-300">—</td>
                          <td className="py-2 px-3 text-right sticky right-0 bg-indigo-50/95 z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
                            <button type="button" onClick={handleCreateInlineRecord} disabled={savingRecord || !selectedTable.columns?.length} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
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
                              <td className="py-3 px-4 font-mono text-slate-400 font-medium sticky left-0 bg-white group-hover:bg-indigo-50/40 z-10">#{row.id}</td>
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
                              <td className="py-3 px-4 text-right whitespace-nowrap sticky right-0 bg-white/95 group-hover:bg-indigo-50/95 z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
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
              )}
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
        existingColumns={selectedTable?.columns || []}
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

function InlineSelectCell({ col, value, onChange, newRecordData }) {
  const options = getSelectOptions(col, newRecordData);
  const dependency = getColumnDependency(col);
  const isLocked = Boolean(dependency && (!newRecordData[dependency] || newRecordData[dependency] === ''));

  // Auto-select first real option so there is NEVER any field name as an option
  useEffect(() => {
    if (!isLocked && options.length > 0 && (!value || !options.includes(value))) {
      onChange({ target: { value: options[0] } });
    }
  }, [isLocked, options, value]);

  return (
    <select
      value={value ?? (options[0] || '')}
      required={!!col.required}
      disabled={isLocked}
      onChange={onChange}
      className={`w-full min-w-[120px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${
        isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
      }`}
    >
      {isLocked && <option value="" disabled>-- En attente --</option>}
      {options.map((option, index) => (
        <option key={index} value={option}>{option}</option>
      ))}
    </select>
  );
}

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { resolveTemplateObject } from '../../utils/templateVariables';
import { getAttachedButtons } from '../../utils/attachedButtons';
import { getBlockAppearanceClassName, getBlockAppearanceStyle } from '../../utils/blockAppearance';
import { runButtonAction } from '../../utils/actionRunner';
import RecordModal from '../DatabaseStudio/RecordModal';
import ActionButton from '../Common/ActionButton';
import { 
  Eye, Layout, RefreshCw, CheckCircle2, AlertCircle, 
  Search, BarChart2, Plus, ArrowRight, ExternalLink, Info, Check, Table as TableIcon, 
  Edit2, Trash2, Edit, Trash
} from 'lucide-react';

export default function ViewMode({ targetSlug, onEditPage }) {
  const { user } = useAuth();
  const [pages, setPages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(() => targetSlug || new URLSearchParams(window.location.search).get('page') || '');
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [tablesMeta, setTablesMeta] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Fetch all pages for the dropdown / switch
  useEffect(() => {
    apiRequest('/pages')
      .then(res => {
        setPages(res.pages || []);
        if (!selectedSlug && res.pages && res.pages.length > 0) {
          setSelectedSlug(res.pages[0].slug);
        }
      })
      .catch(console.error);

    // Fetch tables metadata (to know columns for forms and tables)
    apiRequest('/tables')
      .then(res => {
        const metaMap = {};
        (res.tables || []).forEach(t => {
          metaMap[t.name] = t;
        });
        setTablesMeta(metaMap);
      })
      .catch(console.error);
  }, []);

  // Update slug if prop changed
  useEffect(() => {
    if (targetSlug) {
      setSelectedSlug(targetSlug);
    }
  }, [targetSlug]);

  useEffect(() => {
    if (!selectedSlug) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === 'view') {
      url.searchParams.set('page', selectedSlug);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [selectedSlug]);

  // Load selected page details
  useEffect(() => {
    if (!selectedSlug) return;
    setLoading(true);
    apiRequest(`/pages/slug/${selectedSlug}`)
      .then(res => {
        setPageData(res.page);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement page : ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedSlug]);

  const handleDataChanged = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Bar for View Mode: Humanized testing banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-14 z-30 shadow-2xs">
        {/* Left: Mode badge & Page switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Test en direct</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Interactive Page Pills */}
          {pages.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-0.5">
              {pages.map(p => {
                const isActive = p.slug === selectedSlug;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedSlug(p.slug)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                        : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <span>{p.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          {onEditPage && (
            <button
              onClick={() => onEditPage(selectedSlug)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Retourner dans l'éditeur pour modifier cette page"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Modifier la page</span>
            </button>
          )}

          <button
            onClick={handleDataChanged}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Recharger les données de la base"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>

          <a
            href={selectedSlug === 'index' ? '/page/' : `/page/${selectedSlug || ''}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-colors cursor-pointer"
            title="Voir cette page comme un vrai visiteur (sans aucune barre)"
          >
            <span>Rendu visiteur</span>
            <ExternalLink className="w-3 h-3 text-indigo-500" />
          </a>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Chargement de la page...
          </div>
        ) : !pageData ? (
          <div className="p-16 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm">Page introuvable ou aucune page disponible.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pageData.layout && pageData.layout.length > 0 ? (
              pageData.layout.map(sourceBlock => {
                const block = resolveTemplateObject(sourceBlock, user);
                return (
                <div key={block.id} className={getBlockAppearanceClassName(block)} style={getBlockAppearanceStyle(block)} data-block-type={block.type}>
                  <RenderLiveBlock
                    block={block}
                    tableMeta={tablesMeta[block.tableName]}
                    refreshTrigger={refreshTrigger}
                    onDataChanged={handleDataChanged}
                    onNavigatePage={(slug) => setSelectedSlug(slug)}
                    showToast={showToast}
                  />
                </div>
                );
              })
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200 shadow-xs max-w-lg mx-auto">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Layout className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">Votre page est prête à être construite</h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Vous n'avez pas encore ajouté de blocs sur cette page. Rendez-vous dans l'Éditeur de pages pour assembler vos titres, tableaux, formulaires ou boutons.
                </p>
                {onEditPage && (
                  <button
                    onClick={() => onEditPage(selectedSlug)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ajouter des blocs dans l'Éditeur</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ==========================================
// LIVE BLOCK RENDERERS
// ==========================================

function RenderLiveBlock({ block, tableMeta, refreshTrigger, onDataChanged, onNavigatePage, showToast }) {
  if (block.type === 'button') {
    return (
      <LiveButtonBlock
        block={block}
        onNavigatePage={onNavigatePage}
        onDataChanged={onDataChanged}
        showToast={showToast}
      />
    );
  }

  if (block.type === 'header') {
    return (
      <div className="mb-2 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AttachedButtonGroup block={block} placement="left" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                {block.title}
              </h1>
              {block.subtitle && (
                <p className="text-gray-500 text-xs mt-1">{block.subtitle}</p>
              )}
            </div>
          </div>
          <AttachedButtonGroup block={block} placement="right" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
        </div>
        <AttachedButtonGroup block={block} placement="footer" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
      </div>
    );
  }

  if (block.type === 'alert') {
    return (
      <div className="p-3.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs shadow-2xs flex items-center justify-between gap-3">
        <div>
          {block.title && <p className="font-semibold text-gray-900 mb-0.5">{block.title}</p>}
          <p className="text-gray-600">{block.message}</p>
        </div>
        <AttachedButtonGroup block={block} onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
      </div>
    );
  }

  if (block.type === 'stats') {
    return (
      <LiveStatsBlock
        block={block}
        tableMeta={tableMeta}
        refreshTrigger={refreshTrigger}
        onNavigatePage={onNavigatePage}
        onDataChanged={onDataChanged}
        showToast={showToast}
      />
    );
  }

  if (block.type === 'table') {
    return (
      <LiveTableBlock
        block={block}
        tableMeta={tableMeta}
        refreshTrigger={refreshTrigger}
        onDataChanged={onDataChanged}
        onNavigatePage={onNavigatePage}
        showToast={showToast}
      />
    );
  }

  if (block.type === 'form') {
    return (
      <LiveFormBlock
        block={block}
        tableMeta={tableMeta}
        onDataChanged={onDataChanged}
        onNavigatePage={onNavigatePage}
        showToast={showToast}
      />
    );
  }

  return null;
}

// 0. LIVE BUTTON COMPONENT
function LiveButtonBlock({ block, onNavigatePage, onDataChanged, showToast, isAttached = false }) {
  return (
    <ActionButton
      block={block}
      onNavigatePage={onNavigatePage}
      onDataChanged={onDataChanged}
      showToast={showToast}
      isAttached={isAttached}
    />
  );
}

function AttachedButtonGroup({ block, placement = 'all', ...props }) {
  const buttons = getAttachedButtons(block).filter(button => {
    if (placement === 'left') return button.position === 'header-left';
    if (placement === 'right') return ['header-right', 'header-inline', 'header-center', undefined, 'header'].includes(button.position);
    if (placement === 'footer') return button.position?.startsWith('footer');
    if (placement === 'remaining') return button.position !== 'header-right';
    return true;
  });
  if (!buttons.length) return null;
  const items = buttons.map((button, index) => <LiveButtonBlock key={button.id || index} block={button} {...props} isAttached={true} />);
  if (placement === 'footer') {
    const position = buttons[0].position;
    return <div className={`pt-1 flex ${position === 'footer-center' ? 'justify-center' : position === 'footer-left' ? 'justify-start' : 'justify-end'}`}>{items}</div>;
  }
  return <div className="flex items-center gap-2">{items}</div>;
}

// 1. LIVE STATS COMPONENT
function LiveStatsBlock({ block, tableMeta, refreshTrigger, onNavigatePage, onDataChanged, showToast }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!block.tableName) return;
    apiRequest(`/tables/${block.tableName}/data`)
      .then(res => setCount(res.rows?.length || 0))
      .catch(() => setCount(0));
  }, [block.tableName, refreshTrigger]);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium">
          {block.statLabel || block.title || 'Métrique'}
        </p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{String(count ?? 0)}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Table : {tableMeta?.label || block.tableName}
        </p>
      </div>
      <AttachedButtonGroup block={block} onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
    </div>
  );
}

// 2. LIVE TABLE COMPONENT WITH COLUMN SELECTION & TOGGLEABLE EDIT/DELETE BUTTONS
function LiveTableBlock({ block, tableMeta, refreshTrigger, onDataChanged, onNavigatePage, showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchRows = () => {
    if (!block.tableName) return;
    setLoading(true);
    apiRequest(`/tables/${block.tableName}/data`)
      .then(res => setRows(res.rows || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRows();
  }, [block.tableName, refreshTrigger]);

  const allColumns = tableMeta?.columns || [];
  
  // Filter columns according to block configuration (block.visibleColumns)
  const displayedColumns = (block.visibleColumns && block.visibleColumns.length > 0)
    ? allColumns.filter(c => block.visibleColumns.includes(c.name))
    : allColumns;

  // Toggleable action buttons (allowEdit and allowDelete, default true)
  const allowEdit = block.allowEdit !== false;
  const allowDelete = block.allowDelete !== false;
  const hasActions = allowEdit || allowDelete;

  // Handle edit save
  const handleSaveEdit = async (formData) => {
    if (!editingRecord) return;
    await apiRequest(`/tables/${block.tableName}/data/${editingRecord.id}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });
    showToast('Enregistrement modifié avec succès');
    fetchRows();
    onDataChanged();
  };

  // Handle delete
  const handleDeleteRow = async (rowId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet enregistrement ?')) return;
    try {
      await apiRequest(`/tables/${block.tableName}/data/${rowId}`, {
        method: 'DELETE'
      });
      showToast('Enregistrement supprimé');
      fetchRows();
      onDataChanged();
    } catch (err) {
      showToast('Erreur lors de la suppression : ' + err.message);
    }
  };

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return Object.values(r).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(term));
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AttachedButtonGroup block={block} placement="left" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
          <div>
            <h3 className="text-base font-semibold text-slate-900">{block.title || 'Données'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Table : <span className="font-medium text-indigo-600">{tableMeta?.label || block.tableName}</span>
              <span className="text-slate-300 mx-2">•</span>
              <span>{filtered.length} ligne(s) affichée(s)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AttachedButtonGroup block={block} placement="right" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
              <th className="py-3 px-4 w-12 font-mono text-slate-400"># ID</th>
              {displayedColumns.map(col => (
                <th key={col.id || col.name} className="py-3 px-4 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="py-3 px-4 whitespace-nowrap text-slate-400 font-normal">Date</th>
              {hasActions && (
                <th className="py-3 px-4 whitespace-nowrap text-right font-medium text-slate-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={displayedColumns.length + (hasActions ? 3 : 2)} className="py-8 text-center text-slate-400">
                  Chargement...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={displayedColumns.length + (hasActions ? 3 : 2)} className="py-8 text-center text-slate-400">
                  Aucune donnée trouvée
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="py-3 px-4 font-mono text-slate-400 font-medium">#{row.id}</td>
                  {displayedColumns.map(col => {
                    const val = row[col.name];
                    return (
                      <td key={col.id || col.name} className="py-3 px-4 whitespace-nowrap text-slate-800">
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
                          <span>{val !== null && val !== undefined && val !== '' ? String(val) : '-'}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}
                  </td>

                  {/* ACTION BUTTONS (MODIFIER / SUPPRIMER) */}
                  {hasActions && (
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {allowEdit && (
                          <button
                            onClick={() => {
                              setEditingRecord(row);
                              setIsEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>
                        )}
                        {allowDelete && (
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer attached button */}
      <div className="border-t border-slate-100 bg-slate-50/70 p-3.5"><AttachedButtonGroup block={block} placement="footer" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} /></div>

      {/* Edit Record Modal for View mode */}
      {isEditModalOpen && (
        <RecordModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveEdit}
          columns={allColumns}
          initialData={editingRecord}
        />
      )}
    </div>
  );
}

// 3. LIVE FORM COMPONENT (Insert real data into SQLite!)
function LiveFormBlock({ block, tableMeta, onDataChanged, onNavigatePage, showToast }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const columns = tableMeta?.columns || [];

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!block.tableName) return;
    setError('');
    setLoading(true);

    try {
      await apiRequest(`/tables/${block.tableName}/data`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast(`Enregistrement ajouté avec succès dans ${tableMeta?.label || block.tableName} !`);
      setFormData({});
      onDataChanged();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{block.title || 'Formulaire'}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajoute des données dans <span className="font-medium text-indigo-600">{tableMeta?.label || block.tableName}</span>
          </p>
        </div>
        <AttachedButtonGroup block={block} placement="right" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
          {error}
        </div>
      )}

      {columns.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Aucune colonne disponible pour ce formulaire.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {columns.map(col => {
              const val = formData[col.name] !== undefined ? formData[col.name] : '';

              return (
                <div key={col.name}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {col.label} {col.required ? <span className="text-red-500">*</span> : null}
                  </label>

                  {col.type === 'boolean' ? (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id={`live_${col.name}`}
                        checked={!!val}
                        onChange={(e) => handleChange(col.name, e.target.checked ? 1 : 0)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <label htmlFor={`live_${col.name}`} className="text-xs text-slate-600 cursor-pointer">
                        {val ? 'Oui' : 'Non'}
                      </label>
                    </div>
                  ) : col.type === 'select' ? (
                    <select
                      value={val}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      required={!!col.required}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">-- Choisir une valeur --</option>
                      {(col.options || []).map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : col.type === 'number' || col.type === 'int' ? (
                    <input
                      type="number"
                      step={col.type === 'int' ? '1' : 'any'}
                      value={val}
                      required={!!col.required}
                      onChange={(e) => handleChange(col.name, e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : col.type === 'date' ? (
                    <input
                      type="date"
                      value={val}
                      required={!!col.required}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      required={!!col.required}
                      placeholder={`Saisir ${col.label.toLowerCase()}...`}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <AttachedButtonGroup block={block} placement="remaining" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <span>Enregistrement...</span>
              ) : (
                <>
                  <span>{block.buttonText || 'Enregistrer'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

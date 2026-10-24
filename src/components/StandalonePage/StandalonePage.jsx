import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { resolveTemplateObject, evaluateVisibilityCondition } from '../../utils/templateVariables';
import { getAttachedButtons } from '../../utils/attachedButtons';
import { getBlockAppearanceClassName, getBlockAppearanceStyle } from '../../utils/blockAppearance';
import { runButtonAction } from '../../utils/actionRunner';
import { getSelectOptions, getColumnDependency } from '../../utils/formOptions';
import FormSelectField from '../Common/FormSelectField';
import RecordModal from '../DatabaseStudio/RecordModal';
import ActionButton from '../Common/ActionButton';
import { CheckCircle2, AlertCircle, Search, ArrowRight, Edit, Trash } from 'lucide-react';

export default function StandalonePage({ slugProp }) {
  const { user } = useAuth();
  const [pages, setPages] = useState([]);
  const [currentSlug, setCurrentSlug] = useState(() => {
    if (slugProp) return slugProp;
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    return pathParts[0] === 'page' && pathParts[1] ? pathParts[1] : '';
  });
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [tablesMeta, setTablesMeta] = useState({});
  const [tableCounts, setTableCounts] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Load all pages list
  useEffect(() => {
    apiRequest('/pages')
      .then(res => {
        const availablePages = res.pages || [];
        setPages(availablePages);
        if (!currentSlug && availablePages.length > 0) {
          const rootPage = availablePages.find(page => page.slug === 'index');
          setCurrentSlug(rootPage?.slug || availablePages[0].slug);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch tables metadata and row counts (for dynamic $[count[table]] variables)
  useEffect(() => {
    apiRequest('/tables')
      .then(res => {
        const metaMap = {};
        const countMap = {};
        (res.tables || []).forEach(t => {
          metaMap[t.name] = t;
          countMap[t.name] = t.rowCount ?? 0;
        });
        setTablesMeta(metaMap);
        setTableCounts(res.tables || countMap);
      })
      .catch(console.error);
  }, [refreshTrigger]);

  // Fetch page layout whenever currentSlug changes
  useEffect(() => {
    if (!currentSlug) return;
    setLoading(true);
    apiRequest(`/pages/slug/${currentSlug}`)
      .then(res => {
        setPageData(res.page);
        if (res.page?.title) {
          document.title = res.page.title;
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur : ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [currentSlug]);

  const handleDataChanged = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSwitchPage = (newSlug) => {
    setCurrentSlug(newSlug);
    window.history.pushState({}, '', newSlug === 'index' ? '/page/' : `/page/${newSlug}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      {/* Main Page Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10">
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-xs">
            Chargement...
          </div>
        ) : !pageData ? (
          <div className="p-16 text-center text-gray-400 text-xs">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p>Page introuvable.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pageData.layout && pageData.layout.length > 0 ? (
              pageData.layout
                .filter((sourceBlock) => evaluateVisibilityCondition(sourceBlock.visibilityRule, user, tableCounts))
                .map((sourceBlock) => {
                  const block = resolveTemplateObject(sourceBlock, user, tableCounts);
                  return (
                  <div key={block.id} className={getBlockAppearanceClassName(block)} style={getBlockAppearanceStyle(block)} data-block-type={block.type}>
                    <RenderBlock
                      block={block}
                      tableMeta={tablesMeta[block.tableName]}
                      refreshTrigger={refreshTrigger}
                      onDataChanged={handleDataChanged}
                      onNavigatePage={handleSwitchPage}
                      showToast={showToast}
                      tablesMeta={tablesMeta}
                      user={user}
                      tableCounts={tableCounts}
                    />
                  </div>
                  );
                })
            ) : (
              <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-400 text-xs">
                Cette page ne contient encore aucun élément.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Discreet bottom footer */}
      <footer className="py-6 text-center text-xs text-gray-400">
        <div className="flex items-center justify-center gap-2">
          <span>BlocNum</span>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// RENDERERS FOR STANDALONE PAGE BLOCKS
// ==========================================

function ContainerBlock({ block, tableMeta, refreshTrigger, onDataChanged, onNavigatePage, showToast, tablesMeta, user, tableCounts }) {
  const childBlocks = Array.isArray(block.blocks) ? block.blocks : [];
  const visibleChildBlocks = childBlocks.filter(sourceChild => evaluateVisibilityCondition(sourceChild.visibilityRule, user, tableCounts));
  const isHorizontal = block.direction === 'horizontal';
  const gapClass = block.gap === 'none' ? 'gap-0' :
                   block.gap === 'sm' ? 'gap-2' :
                   block.gap === 'lg' ? 'gap-6' :
                   block.gap === 'xl' ? 'gap-8' : 'gap-4';

  const containerStyle = {
    borderColor: block.borderEnabled !== false ? (block.borderColor || '#cbd5e1') : 'transparent',
    borderWidth: block.borderEnabled !== false ? `${block.borderWidth || 1}px` : '0px',
    borderStyle: block.borderEnabled !== false ? 'solid' : 'none',
    borderRadius: `${block.borderRadius ?? 16}px`,
    backgroundColor: block.backgroundColor || '#ffffff',
    padding: block.innerPadding !== undefined && block.innerPadding !== null ? `${block.innerPadding}px` : '20px',
    color: block.textColor || undefined,
  };

  return (
    <div
      className={`w-full transition-all flex ${isHorizontal ? 'flex-row flex-wrap items-stretch' : 'flex-col'} ${gapClass} shadow-2xs`}
      style={containerStyle}
    >
      {visibleChildBlocks.length === 0 ? (
        childBlocks.length === 0 ? (
          <div className="py-4 text-center text-xs text-gray-400 w-full italic">
            Conteneur vide
          </div>
        ) : null
      ) : (
        visibleChildBlocks.map(sourceChild => {
          const child = user ? resolveTemplateObject(sourceChild, user, tableCounts) : sourceChild;
          return (
            <div
              key={child.id}
              className={`w-full ${isHorizontal ? 'flex-1 min-w-[260px]' : ''} ${getBlockAppearanceClassName(child)}`}
              style={getBlockAppearanceStyle(child)}
              data-block-type={child.type}
            >
              <RenderBlock
                block={child}
                tableMeta={tablesMeta ? tablesMeta[child.tableName] : tableMeta}
                refreshTrigger={refreshTrigger}
                onDataChanged={onDataChanged}
                onNavigatePage={onNavigatePage}
                showToast={showToast}
                tablesMeta={tablesMeta}
                user={user}
                tableCounts={tableCounts}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

function RenderBlock({ block, tableMeta, refreshTrigger, onDataChanged, onNavigatePage, showToast, tablesMeta, user, tableCounts }) {
  if (block.type === 'container') {
    return (
      <ContainerBlock
        block={block}
        tableMeta={tableMeta}
        refreshTrigger={refreshTrigger}
        onDataChanged={onDataChanged}
        onNavigatePage={onNavigatePage}
        showToast={showToast}
        tablesMeta={tablesMeta}
        user={user}
        tableCounts={tableCounts}
      />
    );
  }
  if (block.type === 'button') {
    return (
      <ButtonBlock
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight whitespace-pre-line">
                {block.title}
              </h1>
              {block.subtitle && (
                <p className="text-gray-500 text-sm mt-1 whitespace-pre-line leading-relaxed">{block.subtitle}</p>
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
      <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-800 text-xs shadow-2xs flex items-center justify-between gap-3">
        <div>
          {block.title && <p className="font-semibold text-gray-900 mb-0.5 whitespace-pre-line">{block.title}</p>}
          <p className="text-gray-600 whitespace-pre-line leading-relaxed">{block.message}</p>
        </div>
        <AttachedButtonGroup block={block} onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
      </div>
    );
  }

  if (block.type === 'stats') {
    return (
      <StatsBlock
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
      <TableBlock
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
      <FormBlock
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

// BUTTON COMPONENT
function ButtonBlock({ block, onNavigatePage, onDataChanged, showToast, isAttached = false }) {
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
  const isVertical = block.attachedButtonsLayout === 'vertical';
  const items = buttons.map((button, index) => <ButtonBlock key={button.id || index} block={button} {...props} isAttached={true} />);
  if (placement === 'footer') {
    const position = buttons[0].position;
    const justifyClass = position === 'footer-center'
      ? (isVertical ? 'items-center' : 'justify-center')
      : position === 'footer-left'
      ? (isVertical ? 'items-start' : 'justify-start')
      : (isVertical ? 'items-end' : 'justify-end');
    return <div className={`pt-2 flex ${isVertical ? 'flex-col' : 'flex-row items-center flex-wrap'} ${justifyClass} gap-2`}>{items}</div>;
  }
  const alignClass = placement === 'left' ? 'items-start' : 'items-end';
  return <div className={`flex ${isVertical ? `flex-col ${alignClass}` : 'flex-row items-center flex-wrap'} gap-2`}>{items}</div>;
}

// STATS
function StatsBlock({ block, tableMeta, refreshTrigger, onNavigatePage, onDataChanged, showToast }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!block.tableName) return;
    apiRequest(`/tables/${block.tableName}/data`)
      .then(res => setCount(res.rows?.length || 0))
      .catch(() => setCount(0));
  }, [block.tableName, refreshTrigger]);

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium">
          {block.statLabel || block.title || 'Métrique'}
        </p>
        <p className="text-3xl font-extrabold text-gray-900 mt-1">{String(count ?? 0)}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Table : {tableMeta?.label || block.tableName}
        </p>
      </div>
      <AttachedButtonGroup block={block} onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
    </div>
  );
}

// TABLE
function TableBlock({ block, tableMeta, refreshTrigger, onDataChanged, onNavigatePage, showToast }) {
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
  const displayedColumns = (block.visibleColumns && block.visibleColumns.length > 0)
    ? allColumns.filter(c => block.visibleColumns.includes(c.name))
    : allColumns;

  const allowEdit = block.allowEdit !== false;
  const allowDelete = block.allowDelete !== false;
  const hasActions = allowEdit || allowDelete;

  const handleSaveEdit = async (formData) => {
    if (!editingRecord) return;
    await apiRequest(`/tables/${block.tableName}/data/${editingRecord.id}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });
    showToast('Modifié avec succès');
    fetchRows();
    onDataChanged();
  };

  const handleDeleteRow = async (rowId) => {
    if (!window.confirm('Supprimer cet enregistrement ?')) return;
    try {
      await apiRequest(`/tables/${block.tableName}/data/${rowId}`, {
        method: 'DELETE'
      });
      showToast('Supprimé');
      fetchRows();
      onDataChanged();
    } catch (err) {
      showToast('Erreur : ' + err.message);
    }
  };

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return Object.values(r).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(term));
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AttachedButtonGroup block={block} placement="left" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{block.title || 'Données'}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Table : <span className="font-medium text-slate-600">{tableMeta?.label || block.tableName}</span>
              <span className="mx-1.5">•</span>
              {filtered.length} ligne(s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AttachedButtonGroup block={block} placement="right" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 font-mono text-slate-400">#ID</th>
              {displayedColumns.map(col => (
                <th key={col.id || col.name} className="py-3 px-4 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="py-3 px-4 whitespace-nowrap text-slate-400 font-normal normal-case">Date</th>
              {hasActions && (
                <th className="py-3 px-4 whitespace-nowrap text-right font-medium text-slate-600 normal-case">
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
                  Aucun résultat
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 font-medium">#{row.id}</td>
                  {displayedColumns.map(col => {
                    const val = row[col.name];
                    return (
                      <td key={col.id || col.name} className="py-3 px-4 text-slate-800 whitespace-nowrap">
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

                  {hasActions && (
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs">
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

// FORM
function FormBlock({ block, tableMeta, onDataChanged, onNavigatePage, showToast }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const columns = tableMeta?.columns || [];

  const handleChange = (name, value) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: value
      };
      // Reset dependent fields if parent field changes
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
    if (!block.tableName) return;
    setError('');
    setLoading(true);

    try {
      await apiRequest(`/tables/${block.tableName}/data`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast('Enregistrement ajouté avec succès');
      setFormData({});
      onDataChanged();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{block.title || 'Formulaire'}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Ajout dans : {tableMeta?.label || block.tableName}
          </p>
        </div>
        <AttachedButtonGroup block={block} placement="right" onNavigatePage={onNavigatePage} onDataChanged={onDataChanged} showToast={showToast} />
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
          {error}
        </div>
      )}

      {columns.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Aucun champ disponible.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {columns.map(col => {
              const val = formData[col.name] !== undefined ? formData[col.name] : '';

              return (
                <div key={col.name}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {col.label} {col.required ? '*' : ''}
                  </label>

                  {col.type === 'boolean' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`pub_${col.name}`}
                        checked={!!val}
                        onChange={(e) => handleChange(col.name, e.target.checked ? 1 : 0)}
                        className="w-3.5 h-3.5 rounded text-gray-900 border-gray-300"
                      />
                      <label htmlFor={`pub_${col.name}`} className="text-xs text-gray-600 cursor-pointer">
                        {val ? 'Oui' : 'Non'}
                      </label>
                    </div>
                  ) : col.type === 'select' ? (
                    <FormSelectField
                      col={col}
                      val={val}
                      columns={columns}
                      formData={formData}
                      onChange={handleChange}
                      size="xs"
                    />
                  ) : col.type === 'number' || col.type === 'int' ? (
                    <input
                      type="number"
                      step={col.type === 'int' ? '1' : 'any'}
                      value={val}
                      required={!!col.required}
                      onChange={(e) => handleChange(col.name, e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                    />
                  ) : col.type === 'date' ? (
                    <input
                      type="date"
                      value={val}
                      required={!!col.required}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      required={!!col.required}
                      placeholder="..."
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
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
              className="px-4 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>{loading ? 'Envoi...' : (block.buttonText || 'Enregistrer')}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


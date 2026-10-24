import React from 'react';
import { 
  ChevronUp, ChevronDown, Trash2, GripVertical, 
  ExternalLink, ArrowRight, MousePointer, HelpCircle, Pin, CornerUpLeft
} from 'lucide-react';
import ActionButton from '../Common/ActionButton';
import { getAttachedButtons } from '../../utils/attachedButtons';
import { getBlockAppearanceClassName, getBlockAppearanceStyle } from '../../utils/blockAppearance';
import { resolveTemplateObject } from '../../utils/templateVariables';

function AttachedButtonSet({ block, placement = 'all' }) {
  const buttons = getAttachedButtons(block).filter(button => {
    if (placement === 'left') return button.position === 'header-left';
    if (placement === 'right') return ['header-right', 'header-inline', 'header-center', undefined].includes(button.position);
    if (placement === 'footer') return button.position?.startsWith('footer');
    return true;
  });
  if (!buttons.length) return null;
  const isVertical = block.attachedButtonsLayout === 'vertical';

  if (placement === 'footer') {
    const position = buttons[0].position;
    const justifyClass = position === 'footer-center'
      ? (isVertical ? 'items-center' : 'justify-center')
      : position === 'footer-left'
      ? (isVertical ? 'items-start' : 'justify-start')
      : (isVertical ? 'items-end' : 'justify-end');

    return (
      <div className={`pt-2 flex ${isVertical ? 'flex-col' : 'flex-row items-center flex-wrap'} ${justifyClass} gap-2`}>
        {buttons.map((button, index) => <ActionButton key={button.id || index} block={button} isPreview={true} isAttached={true} />)}
      </div>
    );
  }

  const alignClass = placement === 'left' ? 'items-start' : 'items-end';
  return (
    <div className={`flex ${isVertical ? `flex-col ${alignClass}` : 'flex-row items-center flex-wrap'} gap-2`}>
      {buttons.map((button, index) => <ActionButton key={button.id || index} block={button} isPreview={true} isAttached={true} />)}
    </div>
  );
}

class BlockErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('CanvasBlock error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 my-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Composant en cours de configuration</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Associez vos données ou vérifiez les propriétés à droite.</p>
          </div>
          <button
            type="button"
            onClick={() => this.props.onDelete && this.props.onDelete(this.props.blockId)}
            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            Supprimer ce bloc
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CanvasBlock(props) {
  return (
    <BlockErrorBoundary blockId={props.block?.id} onDelete={props.onDelete}>
      <CanvasBlockContent {...props} />
    </BlockErrorBoundary>
  );
}

function CanvasBlockContent({ 
  block, 
  isSelected, 
  onSelect, 
  onMoveUp, 
  onMoveDown, 
  onDelete, 
  isFirst, 
  isLast,
  tables = [],
  pages = [],
  index,
  onDragStart,
  onDragEnd,
  isDragging,
  // Dropping on this block
  isDragOverBlock,
  onDragOverBlock,
  onDropOnBlock,
  // Container props
  onAddChildBlock,
  onSelectChildBlock,
  onMoveChildBlock,
  onDeleteChildBlock,
  onExtractChildBlock,
  selectedBlockId,
}) {
  const connectedTable = tables.find(t => t.name === block.tableName);

  const previewBlock = React.useMemo(() => {
    return resolveTemplateObject(block, { tables, tableName: block.tableName }) || block;
  }, [block, tables]);

  const getHumanTypeName = (type) => {
    switch (type) {
      case 'button': return 'Bouton';
      case 'header': return 'Texte';
      case 'table': return 'Tableau de données';
      case 'form': return 'Formulaire';
      case 'stats': return 'Compteur';
      case 'alert': return 'Note';
      case 'container': return 'Conteneur';
      default: return type;
    }
  };

  const getFloatingPositionName = (pos) => {
    switch (pos) {
      case 'float-top-left': return 'Haut Gauche';
      case 'float-top-center': return 'Haut Centre';
      case 'float-top-right': return 'Haut Droite';
      case 'float-middle-left': return 'Milieu Gauche';
      case 'float-center': return 'Plein Centre';
      case 'float-middle-right': return 'Milieu Droite';
      case 'float-bottom-left': return 'Bas Gauche';
      case 'float-bottom-center': return 'Bas Centre';
      case 'float-bottom-right': return 'Bas Droite (FAB)';
      default: return 'Flottant';
    }
  };

  const getButtonAlignClass = (b) => {
    if (b.position && b.position.startsWith('float')) {
      if (b.position.endsWith('-right')) return 'justify-end';
      if (b.position.endsWith('-center') || b.position === 'float-center') return 'justify-center';
      return 'justify-start';
    }
    if (b.align === 'center') return 'justify-center';
    if (b.align === 'right') return 'justify-end';
    if (b.align === 'full') return 'w-full';
    return 'justify-start';
  };

  // ========================================================
  // ALL BLOCKS (BUTTON, HEADER, TABLE, FORM, STATS, ALERT, CONTAINER)
  // ========================================================
  const isContainer = block.type === 'container';

  const containerCardStyle = isContainer ? {
    borderColor: block.borderEnabled !== false ? (block.borderColor || '#cbd5e1') : '#e2e8f0',
    borderWidth: block.borderEnabled !== false ? `${block.borderWidth || 1}px` : '1px',
    borderStyle: block.borderEnabled !== false ? 'solid' : 'dashed',
    borderRadius: `${block.borderRadius ?? 16}px`,
    backgroundColor: block.backgroundColor || '#ffffff',
  } : {};

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverBlock}
      onDrop={onDropOnBlock}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect(e);
      }}
      style={containerCardStyle}
      className={`relative transition-all cursor-pointer overflow-hidden ${
        isDragging ? 'opacity-30 border-dashed border-gray-400' : ''
      } ${
        isDragOverBlock
          ? 'ring-4 ring-indigo-500/30 border-indigo-600 bg-indigo-50/20 shadow-md'
          : isSelected
          ? 'ring-2 ring-indigo-600/40 shadow-xs'
          : 'hover:border-gray-300'
      } ${
        !isContainer
          ? `bg-white rounded-xl border ${isSelected ? 'border-gray-900 ring-2 ring-gray-900/10' : 'border-gray-200'}`
          : ''
      }`}
    >
      {/* Drop on Block Overlay Banner */}
      {isDragOverBlock && (
        <div className="absolute inset-0 z-30 bg-indigo-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-semibold p-4 text-center pointer-events-none animate-fade-in">
          <Pin className="w-6 h-6 mb-1 text-white animate-bounce" />
          <span>✦ Déposer pour fixer le bouton sur ce bloc</span>
        </div>
      )}

      {/* Header bar of block with Grip Handle */}
      <div className="bg-gray-50 px-3 sm:px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between text-xs gap-1.5">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 flex-wrap">
          {/* Drag Handle Icon */}
          <div 
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 p-0.5 flex items-center gap-1 shrink-0"
            title="Glisser-déposer pour réordonner"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <span className="font-semibold text-slate-800 shrink-0">
            {getHumanTypeName(block.type)}
          </span>
          
          {block.type === 'button' && (
            <span className="text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/80 font-mono font-medium truncate max-w-[140px]">
              {block.mode === 'conditional'
                ? 'Si ... Alors'
                : (block.action?.type === 'page' ? `/${block.action?.pageSlug || ''}` : block.action?.type || 'action')}
            </span>
          )}
          
          {block.tableName && (
            <span className="text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/80 font-medium truncate max-w-[140px]">
              Table : {connectedTable?.label || block.tableName}
            </span>
          )}
          {getAttachedButtons(block).length > 0 && (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium shrink-0">
              + {getAttachedButtons(block).length} bouton(s)
            </span>
          )}
          {block.visibilityRule && (
            <span 
              className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 font-medium flex items-center gap-1 shrink-0"
              title={`Affiché uniquement si : ${block.visibilityRule}`}
            >
              <span>👁️</span>
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {onExtractChildBlock && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onExtractChildBlock(block.id); }}
              className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer"
              title="Extraire ce bloc du conteneur"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            disabled={isFirst}
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
            title="Monter"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={isLast}
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
            title="Descendre"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
            className="p-1 text-gray-400 hover:text-red-600 ml-1 cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Canvas Representation */}
      <div 
        className={isContainer ? '' : `p-5 ${getBlockAppearanceClassName(block)}`} 
        style={isContainer ? {
          padding: block.innerPadding !== undefined && block.innerPadding !== null ? `${block.innerPadding}px` : '20px',
          color: block.textColor || undefined,
        } : getBlockAppearanceStyle(block)} 
        data-block-type={block.type}
      >
        {/* BUTTON BLOCK */}
        {block.type === 'button' && (
          <div className={`flex ${getButtonAlignClass(block)}`}>
            <div className="inline-block relative">
              <ActionButton block={previewBlock} isPreview={true} />
              {block.position && block.position.startsWith('float') && (
                <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                  📍 {getFloatingPositionName(block.position)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* HEADER BLOCK */}
        {block.type === 'header' && (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <AttachedButtonSet block={block} placement="left" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 whitespace-pre-line">{previewBlock.title || 'Titre'}</h2>
                  {previewBlock.subtitle && (
                    <p className="text-gray-500 text-xs mt-1 whitespace-pre-line leading-relaxed">{previewBlock.subtitle}</p>
                  )}
                </div>
              </div>
              <AttachedButtonSet block={block} placement="right" />
            </div>
            <AttachedButtonSet block={block} placement="footer" />
          </div>
        )}

        {/* STATS BLOCK */}
        {block.type === 'stats' && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{previewBlock.statLabel || previewBlock.title || 'Métrique'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {connectedTable ? connectedTable.rowCount : 0}
              </p>
            </div>
            <AttachedButtonSet block={block} />
          </div>
        )}

        {/* TABLE BLOCK */}
        {block.type === 'table' && (() => {
          const allCols = connectedTable?.columns || [];
          const displayedCols = block.visibleColumns && block.visibleColumns.length > 0
            ? allCols.filter(c => block.visibleColumns.includes(c.name))
            : allCols;

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{previewBlock.title || 'Tableau'}</span>
                  <AttachedButtonSet block={block} placement="left" />
                </div>
                
                <div className="flex items-center gap-2">
                  <AttachedButtonSet block={block} placement="right" />
                  <div className="flex gap-2 text-gray-400 text-[11px]">
                    {block.allowEdit !== false && <span>[Modifier: Oui]</span>}
                    {block.allowDelete !== false && <span>[Supprimer: Oui]</span>}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                <div className="flex bg-gray-100 px-3 py-2 text-[11px] font-medium text-gray-600 border-b border-gray-200 gap-4 overflow-x-auto">
                  <span className="shrink-0">#ID</span>
                  {displayedCols.length === 0 ? (
                    <span className="text-gray-400 italic">Aucune colonne</span>
                  ) : (
                    displayedCols.map(c => (
                      <span key={c.id || c.name} className="shrink-0">{c.label}</span>
                    ))
                  )}
                  {(block.allowEdit !== false || block.allowDelete !== false) && (
                    <span className="ml-auto text-gray-400 shrink-0">Actions</span>
                  )}
                </div>

                {connectedTable && displayedCols.length > 0 ? (
                  <div className="divide-y divide-gray-100 bg-white">
                    <div className="flex items-center px-3 py-2 text-xs text-gray-500 gap-4 overflow-x-auto">
                      <span className="font-mono text-gray-400 shrink-0">#1</span>
                      {displayedCols.map((c, i) => (
                        <span key={i} className="shrink-0 text-gray-700">
                          {c.type === 'number' ? '42' : c.type === 'date' ? '2026-10-24' : c.type === 'boolean' ? 'Oui' : `Exemple ${c.label}`}
                        </span>
                      ))}
                      {(block.allowEdit !== false || block.allowDelete !== false) && (
                        <span className="ml-auto flex items-center gap-2 text-[11px] text-indigo-600 shrink-0">
                          {block.allowEdit !== false && <span className="hover:underline">Modifier</span>}
                          {block.allowDelete !== false && <span className="text-red-500 hover:underline">Supprimer</span>}
                        </span>
                      )}
                    </div>
                    <div className="p-2 text-center text-[11px] text-slate-500 bg-slate-50/70">
                      💡 Les {connectedTable.rowCount || 0} entrées réelles s'affichent dans l'onglet « Tester en direct »
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400 italic">
                    Associez une table dans les propriétés à droite pour afficher vos données
                  </div>
                )}
              </div>

              <AttachedButtonSet block={block} placement="footer" />
            </div>
          );
        })()}

        {/* FORM BLOCK */}
        {block.type === 'form' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-xs">{previewBlock.title || 'Formulaire'}</span>
                <AttachedButtonSet block={block} placement="left" />
              </div>
              <AttachedButtonSet block={block} placement="right" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
              {connectedTable?.columns && connectedTable.columns.length > 0 ? (
                connectedTable.columns.map(c => (
                  <div key={c.id}>
                    <label className="block text-[11px] text-gray-600 mb-0.5">{c.label}</label>
                    <div className="h-7 bg-white border border-gray-200 rounded px-2 text-xs flex items-center text-gray-400">
                      ...
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-xs text-gray-400 py-1">
                  Aucune colonne
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <AttachedButtonSet block={block} placement="footer" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-gray-900 text-white rounded text-xs font-medium">
                  {previewBlock.buttonText || 'Enregistrer'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ALERT BLOCK */}
        {block.type === 'alert' && (
          <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-xs flex items-center justify-between gap-3">
            <div>
              {previewBlock.title && <p className="font-semibold whitespace-pre-line">{previewBlock.title}</p>}
              <p className="mt-0.5 text-gray-600 whitespace-pre-line leading-relaxed">{previewBlock.message || 'Information'}</p>
            </div>
            <AttachedButtonSet block={block} />
          </div>
        )}

        {/* CONTAINER / ENCADRÉ BLOCK */}
        {block.type === 'container' && (
          <div className="space-y-3">
            {(!block.blocks || block.blocks.length === 0) ? (
              <div className="p-6 sm:p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/40 text-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 text-base">
                  📦
                </div>
                <p className="text-xs font-semibold text-slate-700">Conteneur vide</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Glissez un bloc ici ou choisissez un bloc à insérer dans cet encadré :</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                  {[
                    { type: 'header', label: 'Titre', icon: '📝' },
                    { type: 'button', label: 'Bouton', icon: '🔘' },
                    { type: 'table', label: 'Tableau', icon: '📊' },
                    { type: 'form', label: 'Formulaire', icon: '✍️' },
                    { type: 'alert', label: 'Note', icon: '💡' },
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddChildBlock && onAddChildBlock(block.id, item.type); }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer shadow-2xs hover:border-indigo-300"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`flex ${block.direction === 'horizontal' ? 'flex-row flex-wrap items-stretch' : 'flex-col'} ${
                  block.gap === 'none' ? 'gap-0' :
                  block.gap === 'sm' ? 'gap-2' :
                  block.gap === 'lg' ? 'gap-6' :
                  block.gap === 'xl' ? 'gap-8' : 'gap-3.5'
                }`}>
                  {block.blocks.map((childBlock, childIndex) => (
                    <div
                      key={childBlock.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectChildBlock) {
                          onSelectChildBlock(childBlock.id);
                        } else if (onSelect) {
                          onSelect();
                        }
                      }}
                      className={block.direction === 'horizontal' ? 'flex-1 min-w-[260px]' : 'w-full'}
                    >
                      <CanvasBlock
                        block={childBlock}
                        tables={tables}
                        pages={pages}
                        isSelected={selectedBlockId === childBlock.id}
                        onSelect={(e) => {
                          e?.stopPropagation?.();
                          if (onSelectChildBlock) {
                            onSelectChildBlock(childBlock.id);
                          } else if (onSelect) {
                            onSelect();
                          }
                        }}
                        onMoveUp={() => onMoveChildBlock && onMoveChildBlock(childBlock.id, 'up')}
                        onMoveDown={() => onMoveChildBlock && onMoveChildBlock(childBlock.id, 'down')}
                        onDelete={() => onDeleteChildBlock ? onDeleteChildBlock(childBlock.id) : onDelete(childBlock.id)}
                        isFirst={childIndex === 0}
                        isLast={childIndex === block.blocks.length - 1}
                        index={childIndex}
                        onAddChildBlock={onAddChildBlock}
                        onSelectChildBlock={onSelectChildBlock}
                        onMoveChildBlock={onMoveChildBlock}
                        onDeleteChildBlock={onDeleteChildBlock}
                        onExtractChildBlock={onExtractChildBlock}
                        selectedBlockId={selectedBlockId}
                      />
                    </div>
                  ))}
                </div>

                
              </div>
            )}
            <AttachedButtonSet block={block} placement="footer" />
          </div>
        )}
      </div>
    </div>
  );
}

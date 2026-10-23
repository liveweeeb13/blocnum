import React from 'react';
import { 
  ChevronUp, ChevronDown, Trash2, GripVertical, 
  ExternalLink, ArrowRight, MousePointer, HelpCircle, Pin
} from 'lucide-react';
import ActionButton from '../Common/ActionButton';
import { getAttachedButtons } from '../../utils/attachedButtons';
import { getBlockAppearanceClassName, getBlockAppearanceStyle } from '../../utils/blockAppearance';

function AttachedButtonSet({ block, placement = 'all' }) {
  const buttons = getAttachedButtons(block).filter(button => {
    if (placement === 'left') return button.position === 'header-left';
    if (placement === 'right') return ['header-right', 'header-inline', 'header-center', undefined].includes(button.position);
    if (placement === 'footer') return button.position?.startsWith('footer');
    return true;
  });
  if (!buttons.length) return null;
  if (placement === 'footer') {
    const position = buttons[0].position;
    return <div className={`pt-2 flex ${position === 'footer-center' ? 'justify-center' : position === 'footer-left' ? 'justify-start' : 'justify-end'}`}>
      {buttons.map((button, index) => <ActionButton key={button.id || index} block={button} isPreview={true} isAttached={true} />)}
    </div>;
  }
  return <div className="flex items-center gap-2">{buttons.map((button, index) => <ActionButton key={button.id || index} block={button} isPreview={true} isAttached={true} />)}</div>;
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
  onDropOnBlock
}) {
  const connectedTable = tables.find(t => t.name === block.tableName);

  const getHumanTypeName = (type) => {
    switch (type) {
      case 'header': return 'En-tête & Titre';
      case 'table': return 'Tableau de données';
      case 'form': return 'Formulaire de saisie';
      case 'stats': return 'Compteur statistique';
      case 'alert': return 'Note d\'information';
      case 'button': return 'Bouton';
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
  // 1. STANDALONE BUTTON -> COMPACT, NATIVE (NOT A GIANT CARD!)
  // ========================================================
  if (block.type === 'button') {
    return (
      <div
        draggable
        onDragStart={(e) => {
          try {
            e.dataTransfer.setData('text/plain', String(index));
            e.dataTransfer.setData('canvasIndex', String(index));
            e.dataTransfer.effectAllowed = 'move';
          } catch (_) {}
          onDragStart && onDragStart(e, index);
        }}
        onDragEnd={onDragEnd}
        onDragOver={onDragOverBlock}
        onDrop={onDropOnBlock}
        onClick={onSelect}
        className={`relative my-2.5 py-2 px-2.5 group transition-all cursor-grab active:cursor-grabbing rounded-xl border border-transparent ${
          isDragging ? 'opacity-30' : ''
        } ${
          isSelected 
            ? 'border-indigo-400/60 ring-2 ring-indigo-500/20 bg-indigo-50/30 shadow-2xs' 
            : 'hover:bg-slate-100 hover:border-slate-200/80'
        }`}
      >
        {/* Floating Mini Action Toolbar on Hover or Selection */}
        <div className={`absolute -top-8 left-2 z-30 transition-all duration-150 flex items-center gap-2 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] shadow-md border border-slate-700/50 pointer-events-auto ${
          isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
        }`}>
          {/* Drag Handle */}
          <div 
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              try {
                e.dataTransfer.setData('text/plain', String(index));
                e.dataTransfer.setData('canvasIndex', String(index));
                e.dataTransfer.effectAllowed = 'move';
              } catch (_) {}
              onDragStart && onDragStart(e, index);
            }}
            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-white flex items-center gap-1 font-medium select-none"
            title="Glisser-déposer pour déplacer le bouton"
          >
            <GripVertical className="w-3 h-3 text-slate-400" />
            <span className="text-[10px]">Déplacer</span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          {/* Move Up/Down */}
          <button
            type="button"
            disabled={isFirst}
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer p-0.5 rounded hover:bg-slate-800"
            title="Monter"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer p-0.5 rounded hover:bg-slate-800"
            title="Descendre"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          <div className="h-3 w-px bg-slate-700" />

          {/* Action indicator */}
          <span className="text-indigo-300 font-mono text-[9px] max-w-[140px] truncate">
            {block.mode === 'conditional'
              ? 'Si ... Alors'
              : (block.action?.type === 'page' ? `/${block.action?.pageSlug || ''}` : block.action?.type || 'action')}
          </span>

          <div className="h-3 w-px bg-slate-700" />

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
            className="text-red-400 hover:text-red-300 cursor-pointer p-0.5 rounded hover:bg-slate-800"
            title="Supprimer ce bouton"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* The Button Itself */}
        <div className={`flex ${getButtonAlignClass(block)}`}>
          <div className="inline-block relative">
            <ActionButton block={block} isPreview={true} />
            {block.position && block.position.startsWith('float') && (
              <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                📍 {getFloatingPositionName(block.position)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. CONTENT BLOCKS (HEADER, TABLE, FORM, STATS, ALERT)
  // ========================================================
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverBlock}
      onDrop={onDropOnBlock}
      onClick={onSelect}
      className={`relative bg-white rounded-xl border transition-all cursor-pointer overflow-hidden ${
        isDragging ? 'opacity-30 border-dashed border-gray-400' : ''
      } ${
        isDragOverBlock
          ? 'ring-4 ring-indigo-500/30 border-indigo-600 bg-indigo-50/20 shadow-md'
          : isSelected
          ? 'border-gray-900 ring-2 ring-gray-900/10 shadow-xs'
          : 'border-gray-200 hover:border-gray-300'
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
      <div className="bg-gray-50 px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Drag Handle Icon */}
          <div 
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 p-0.5 flex items-center gap-1"
            title="Glisser-déposer pour réordonner"
          >
            <GripVertical className="w-3.5 h-3.5" />
            <span className="text-[10px] text-gray-400 font-medium">Glisser</span>
          </div>

          <span className="font-semibold text-slate-800">
            {getHumanTypeName(block.type)}
          </span>
          {block.tableName && (
            <span className="text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/80 font-medium">
              Table : {connectedTable?.label || block.tableName}
            </span>
          )}
          {getAttachedButtons(block).length > 0 && (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
              + {getAttachedButtons(block).length} bouton(s) fixé(s)
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
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
      <div className={`p-5 ${getBlockAppearanceClassName(block)}`} style={getBlockAppearanceStyle(block)} data-block-type={block.type}>
        {/* HEADER BLOCK */}
        {block.type === 'header' && (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <AttachedButtonSet block={block} placement="left" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{block.title || 'Titre'}</h2>
                  {block.subtitle && (
                    <p className="text-gray-500 text-xs mt-1">{block.subtitle}</p>
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
              <p className="text-xs text-gray-500">{block.statLabel || block.title || 'Métrique'}</p>
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
                  <span className="font-semibold text-gray-900">{block.title || 'Tableau'}</span>
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
                <span className="font-semibold text-gray-900 text-xs">{block.title || 'Formulaire'}</span>
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
                  {block.buttonText || 'Enregistrer'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ALERT BLOCK */}
        {block.type === 'alert' && (
          <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-xs flex items-center justify-between gap-3">
            <div>
              {block.title && <p className="font-semibold">{block.title}</p>}
              <p className="mt-0.5 text-gray-600">{block.message || 'Information'}</p>
            </div>
            <AttachedButtonSet block={block} />
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';
import { getAttachedButtons } from '../../utils/attachedButtons';
import { 
  findBlockById, updateBlockById, deleteBlockById, 
  findParentContainer, addChildToContainer, 
  moveBlockInLayout, extractBlockFromContainer 
} from '../../utils/containerBlocks';
import CreatePageModal from './CreatePageModal';
import CanvasBlock from './CanvasBlock';
import BlockSettings from './BlockSettings';
import { 
  Layout, Plus, Save, Eye, Trash2, CheckCircle2, 
  Type, Table, FormInput, BarChart2, Info, ChevronRight, MousePointer, GripVertical, PlusCircle,
  List, X, Sliders
} from 'lucide-react';

export default function PagesBuilder({ onOpenViewPage, initialPageSlug }) {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [layout, setLayout] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [mobilePagesDrawerOpen, setMobilePagesDrawerOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  // Drag and Drop States
  const [draggedCanvasIndex, setDraggedCanvasIndex] = useState(null);
  const [draggedPaletteType, setDraggedPaletteType] = useState(null);
  const [activeDropIndex, setActiveDropIndex] = useState(null);
  const [dragOverBlockId, setDragOverBlockId] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchTables = async () => {
    try {
      const res = await apiRequest('/tables');
      setTables(res.tables || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPages = async (selectId = null) => {
    try {
      setLoading(true);
      const res = await apiRequest('/pages');
      setPages(res.pages || []);

      if (res.pages && res.pages.length > 0) {
        let targetId = selectId;
        if (!targetId && initialPageSlug) {
          const match = res.pages.find(p => p.slug === initialPageSlug);
          if (match) targetId = match.id;
        }
        targetId = targetId || selectedPage?.id || res.pages[0].id;
        await loadPageDetails(targetId);
      } else {
        setSelectedPage(null);
        setLayout([]);
      }
    } catch (err) {
      showToast('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPageSlug && pages.length > 0) {
      const match = pages.find(p => p.slug === initialPageSlug);
      if (match && selectedPage?.id !== match.id) {
        loadPageDetails(match.id);
      }
    }
  }, [initialPageSlug]);

  const loadPageDetails = async (pageId) => {
    try {
      const res = await apiRequest(`/pages/${pageId}`);
      setSelectedPage(res.page);
      setLayout(res.page.layout || []);
      if (res.page.layout && res.page.layout.length > 0) {
        setSelectedBlockId(res.page.layout[0].id);
      } else {
        setSelectedBlockId(null);
      }
    } catch (err) {
      showToast('Erreur : ' + err.message);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchPages();
  }, []);

  const handleCreatePage = async (payload) => {
    const res = await apiRequest('/pages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(`Page "${payload.title}" créée`);
    await fetchPages(res.page?.id);
  };

  const handleDeletePage = async (page) => {
    if (!window.confirm(`Supprimer la page "${page.title}" ?`)) return;
    try {
      await apiRequest(`/pages/${page.id}`, { method: 'DELETE' });
      showToast('Page supprimée');
      await fetchPages();
    } catch (err) {
      showToast('Erreur : ' + err.message);
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;
    try {
      setSaving(true);
      await apiRequest(`/pages/${selectedPage.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: selectedPage.title,
          description: selectedPage.description,
          layout: layout
        })
      });
      showToast('Page enregistrée');
      const updatedPages = pages.map(p => p.id === selectedPage.id ? { ...p, title: selectedPage.title } : p);
      setPages(updatedPages);
    } catch (err) {
      showToast('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper to generate a new block with complete defaults
  const createBlock = (type) => {
    const newBlockId = 'block_' + Date.now();
    const firstTable = tables.length > 0 ? tables[0].name : '';
    const firstPage = pages.length > 0 ? pages[0].slug : '';

    let newBlock = { id: newBlockId, type };

    if (type === 'button') {
      newBlock.label = 'Mon Bouton';
      newBlock.variant = 'primary';
      newBlock.size = 'md';
      newBlock.widthMode = 'auto';
      newBlock.roundness = 'md';
      newBlock.icon = 'auto';
      newBlock.align = 'left';
      newBlock.position = 'standard'; // 'standard' | 'float-bottom-right' | 'float-top-right' | etc.
      newBlock.mode = 'direct';
      newBlock.action = {
        type: 'page',
        pageSlug: firstPage,
        url: '',
        newTab: true,
        message: ''
      };
      newBlock.condition = {
        type: 'confirm',
        question: 'Voulez-vous continuer ?'
      };
      newBlock.thenAction = {
        type: 'page',
        pageSlug: firstPage,
        url: '',
        newTab: true,
        message: ''
      };
      newBlock.hasElse = false;
      newBlock.elseAction = {
        type: 'message',
        message: 'Action annulée'
      };
    } else if (type === 'header') {
      newBlock.title = 'Titre de la section';
      newBlock.subtitle = 'Description de la page';
    } else if (type === 'table') {
      newBlock.title = 'Tableau des données';
      newBlock.tableName = firstTable;
      newBlock.allowEdit = true;
      newBlock.allowDelete = true;
    } else if (type === 'form') {
      newBlock.title = 'Formulaire d\'ajout';
      newBlock.tableName = firstTable;
      newBlock.buttonText = 'Enregistrer';
    } else if (type === 'stats') {
      newBlock.title = 'Métrique';
      newBlock.statLabel = 'Total des entrées';
      newBlock.tableName = firstTable;
    } else if (type === 'alert') {
      newBlock.title = 'Note';
      newBlock.message = 'Information pour les utilisateurs.';
      newBlock.alertType = 'info';
    } else if (type === 'container') {
      newBlock.title = 'Conteneur';
      newBlock.blocks = [];
      newBlock.borderEnabled = true;
      newBlock.borderWidth = 1;
      newBlock.borderColor = '#cbd5e1';
      newBlock.borderRadius = 16;
      newBlock.backgroundColor = '#ffffff';
      newBlock.innerPadding = 20;
      newBlock.direction = 'vertical';
      newBlock.gap = 'md';
    }

    return newBlock;
  };

  // Attach button directly onto an existing block
  const attachButtonToBlock = (blockId) => {
    const firstPage = pages.length > 0 ? pages[0].slug : '';
    const newButton = {
      label: 'Action',
      position: 'header-right', // 'header-right' | 'header-inline' | 'footer'
      variant: 'primary',
      mode: 'direct',
      action: {
        type: 'page',
        pageSlug: firstPage,
        url: '',
        newTab: true,
        message: ''
      },
      condition: {
        type: 'confirm',
        question: 'Voulez-vous continuer ?'
      },
      thenAction: {
        type: 'page',
        pageSlug: firstPage,
        url: '',
        newTab: true,
        message: ''
      },
      hasElse: false,
      elseAction: {
        type: 'message',
        message: 'Action annulée'
      }
    };

    const newLayout = layout.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          attachedButtons: [...getAttachedButtons(b), { ...newButton, id: 'attached_' + Date.now() }]
        };
      }
      return b;
    });

    setLayout(newLayout);
    setSelectedBlockId(blockId);
    showToast('Bouton fixé sur le bloc !');
  };

  // Detach an attached button and turn it into a standalone block right under the component
  const handleDetachAttachedButtonToStandalone = (blockId, buttonIndex = 0) => {
    const targetBlock = layout.find(b => b.id === blockId);
    const attachedButtons = getAttachedButtons(targetBlock);
    if (!targetBlock || !attachedButtons[buttonIndex]) return;

    const btnData = attachedButtons[buttonIndex];
    const newBlockId = 'block_' + Date.now();
    const newStandaloneButton = {
      id: newBlockId,
      type: 'button',
      label: btnData.label || 'Mon Bouton',
      size: btnData.size || 'md',
      widthMode: btnData.widthMode || 'auto',
      customWidth: btnData.customWidth,
      roundness: btnData.roundness || 'md',
      outerMargin: btnData.outerMargin || 0,
      variant: btnData.variant || 'primary',
      icon: btnData.icon || 'auto',
      align: 'left',
      position: 'standard',
      mode: btnData.mode || 'direct',
      action: btnData.action,
      condition: btnData.condition,
      thenAction: btnData.thenAction,
      hasElse: btnData.hasElse,
      elseAction: btnData.elseAction
    };

    const blockIdx = layout.findIndex(b => b.id === blockId);
    const remainingButtons = attachedButtons.filter((_, index) => index !== buttonIndex);
    const newLayout = layout.map(b => b.id === blockId ? { ...b, attachedButtons: remainingButtons, attachedButton: null } : b);
    newLayout.splice(blockIdx + 1, 0, newStandaloneButton);

    setLayout(newLayout);
    setSelectedBlockId(newBlockId);
    showToast('Bouton détaché en bloc autonome !');
  };

  // Attach a standalone button onto another block
  const handleAttachStandaloneToBlock = (standaloneBlockId, targetBlockId) => {
    const standaloneBlock = layout.find(b => b.id === standaloneBlockId);
    if (!standaloneBlock || standaloneBlock.type !== 'button') return;

    const newLayout = layout.filter(b => b.id !== standaloneBlockId).map(b => {
      if (b.id === targetBlockId) {
        return {
          ...b,
          attachedButtons: [...getAttachedButtons(b), {
            id: standaloneBlock.id,
            label: standaloneBlock.label || 'Action',
            size: standaloneBlock.size || 'md',
            widthMode: standaloneBlock.widthMode || 'auto',
            customWidth: standaloneBlock.customWidth,
            roundness: standaloneBlock.roundness || 'md',
            outerMargin: standaloneBlock.outerMargin || 0,
            variant: standaloneBlock.variant || 'primary',
            icon: standaloneBlock.icon || 'auto',
            position: 'header-right',
            mode: standaloneBlock.mode || 'direct',
            action: standaloneBlock.action,
            condition: standaloneBlock.condition,
            thenAction: standaloneBlock.thenAction,
            hasElse: standaloneBlock.hasElse,
            elseAction: standaloneBlock.elseAction
          }]
        };
      }
      return b;
    });

    setLayout(newLayout);
    setSelectedBlockId(targetBlockId);
    showToast('Bouton déplacé sur le bloc !');
  };

  // Add block at end
  const handleAddBlock = (type) => {
    const block = createBlock(type);
    setLayout([...layout, block]);
    setSelectedBlockId(block.id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileSettingsOpen(true);
    }
    showToast(`Composant ${getHumanBlockTypeName(type)} ajouté !`);
  };

  // Insert block at specific index
  const insertBlockAt = (type, index) => {
    const block = createBlock(type);
    const newLayout = [...layout];
    newLayout.splice(index, 0, block);
    setLayout(newLayout);
    setSelectedBlockId(block.id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileSettingsOpen(true);
    }
    showToast(`Composant ${getHumanBlockTypeName(type)} inséré`);
  };

  // Move existing block from fromIndex to toIndex
  const moveBlock = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const newLayout = [...layout];
    const [item] = newLayout.splice(fromIndex, 1);
    const target = fromIndex < toIndex ? toIndex - 1 : toIndex;
    newLayout.splice(target, 0, item);
    setLayout(newLayout);
  };

  // Palette Drag Handlers
  const handlePaletteDragStart = (e, type) => {
    setDraggedPaletteType(type);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('application/x-free-low-code-palette', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handlePaletteDragEnd = () => {
    window.setTimeout(() => {
      setDraggedPaletteType(null);
      setActiveDropIndex(null);
      setDragOverBlockId(null);
    }, 0);
  };

  // Canvas Reordering Drag Handlers
  const handleCanvasDragStart = (e, index) => {
    setDraggedCanvasIndex(index);
    try {
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.setData('canvasIndex', String(index));
      e.dataTransfer.setData('application/x-free-low-code-canvas-index', String(index));
      e.dataTransfer.effectAllowed = 'move';
    } catch (_) {}
  };

  const handleCanvasDragEnd = () => {
    window.setTimeout(() => {
      setDraggedCanvasIndex(null);
      setActiveDropIndex(null);
      setDragOverBlockId(null);
    }, 0);
  };

  // Drop Zone Handlers (between blocks)
  const handleDragOverZone = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = draggedPaletteType ? 'copy' : 'move';
    } catch (_) {}
    setActiveDropIndex(index);
    setDragOverBlockId(null);
  };

  const handleDropOnZone = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();

    const plainData = e.dataTransfer.getData('text/plain');
    const transferPaletteType = e.dataTransfer.getData('application/x-free-low-code-palette') || (['button', 'header', 'table', 'form', 'stats', 'alert', 'container'].includes(plainData) ? plainData : '') || draggedPaletteType;
    const transferCanvasIndex = e.dataTransfer.getData('application/x-free-low-code-canvas-index') || e.dataTransfer.getData('canvasIndex');
    const canvasIndex = transferCanvasIndex !== '' ? Number(transferCanvasIndex) : draggedCanvasIndex;

    if (transferPaletteType) {
      insertBlockAt(transferPaletteType, targetIndex);
    } else if (canvasIndex !== null && Number.isInteger(canvasIndex)) {
      moveBlock(canvasIndex, targetIndex);
    }

    setDraggedPaletteType(null);
    setDraggedCanvasIndex(null);
    setActiveDropIndex(null);
    setDragOverBlockId(null);
  };

  // Dropping directly ON a block (to attach button or place inside container)
  const handleDragOverBlock = (e, blockId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = draggedPaletteType ? 'copy' : 'move';
    } catch (_) {}
    setDragOverBlockId(blockId);
    setActiveDropIndex(null);
  };

  const handleDropOnBlock = (e, blockId) => {
    e.preventDefault();
    e.stopPropagation();

    const plainData = e.dataTransfer.getData('text/plain');
    const transferPaletteType = e.dataTransfer.getData('application/x-free-low-code-palette') || (['button', 'header', 'table', 'form', 'stats', 'alert', 'container'].includes(plainData) ? plainData : '') || draggedPaletteType;
    const transferCanvasIndex = e.dataTransfer.getData('application/x-free-low-code-canvas-index') || e.dataTransfer.getData('canvasIndex');
    const canvasIndex = transferCanvasIndex !== '' ? Number(transferCanvasIndex) : draggedCanvasIndex;

    const targetBlock = findBlockById(layout, blockId);

    // If target is a container, place inside it!
    if (targetBlock && targetBlock.type === 'container') {
      if (transferPaletteType && transferPaletteType !== 'container') {
        const newChild = createBlock(transferPaletteType);
        setLayout(addChildToContainer(layout, blockId, newChild));
        setSelectedBlockId(newChild.id);
        showToast(`Bloc ${transferPaletteType} ajouté dans le conteneur !`);
        setDraggedPaletteType(null);
        setDraggedCanvasIndex(null);
        setDragOverBlockId(null);
        setActiveDropIndex(null);
        return;
      }
      if (canvasIndex !== null && Number.isInteger(canvasIndex)) {
        const draggedBlock = layout[canvasIndex];
        if (draggedBlock && draggedBlock.id !== blockId) {
          const layoutWithoutDragged = layout.filter((_, i) => i !== canvasIndex);
          setLayout(addChildToContainer(layoutWithoutDragged, blockId, draggedBlock));
          setSelectedBlockId(draggedBlock.id);
          showToast('Bloc placé dans le conteneur !');
          setDraggedPaletteType(null);
          setDraggedCanvasIndex(null);
          setDragOverBlockId(null);
          setActiveDropIndex(null);
          return;
        }
      }
    }

    if (transferPaletteType === 'button') {
      attachButtonToBlock(blockId);
    } else if (canvasIndex !== null && Number.isInteger(canvasIndex)) {
      const draggedBlock = layout[canvasIndex];
      if (draggedBlock && draggedBlock.type === 'button') {
        // Turn standalone button into attached button on this block!
        const newLayout = layout.filter((_, i) => i !== canvasIndex).map(b => {
          if (b.id === blockId) {
            return {
              ...b,
              attachedButtons: [...getAttachedButtons(b), {
                id: draggedBlock.id,
                label: draggedBlock.label || 'Action',
                position: 'header-right',
                size: draggedBlock.size || 'md',
                widthMode: draggedBlock.widthMode || 'auto',
                customWidth: draggedBlock.customWidth,
                roundness: draggedBlock.roundness || 'md',
                outerMargin: draggedBlock.outerMargin || 0,
                variant: draggedBlock.variant || 'primary',
                icon: draggedBlock.icon || 'auto',
                mode: draggedBlock.mode || 'direct',
                action: draggedBlock.action,
                condition: draggedBlock.condition,
                thenAction: draggedBlock.thenAction,
                hasElse: draggedBlock.hasElse,
                elseAction: draggedBlock.elseAction
              }]
            };
          }
          return b;
        });
        setLayout(newLayout);
        setSelectedBlockId(blockId);
        showToast('Bouton fixé sur le composant !');
      } else {
        const targetIdx = layout.findIndex(b => b.id === blockId);
        if (targetIdx !== -1) {
          moveBlock(canvasIndex, targetIdx);
        }
      }
    } else if (transferPaletteType) {
      const targetIdx = layout.findIndex(b => b.id === blockId);
      insertBlockAt(transferPaletteType, targetIdx);
    } else {
      showToast('Dépose le bouton sur le composant cible.');
    }

    setDraggedPaletteType(null);
    setDraggedCanvasIndex(null);
    setDragOverBlockId(null);
    setActiveDropIndex(null);
  };

  const handleMoveUp = (blockIdOrIndex) => {
    const id = typeof blockIdOrIndex === 'string' ? blockIdOrIndex : layout[blockIdOrIndex]?.id;
    if (!id) return;
    setLayout(moveBlockInLayout(layout, id, 'up'));
    showToast('Composant monté ↑');
  };

  const handleMoveDown = (blockIdOrIndex) => {
    const id = typeof blockIdOrIndex === 'string' ? blockIdOrIndex : layout[blockIdOrIndex]?.id;
    if (!id) return;
    setLayout(moveBlockInLayout(layout, id, 'down'));
    showToast('Composant descendu ↓');
  };

  const handleDeleteBlock = (blockId) => {
    const newLayout = deleteBlockById(layout, blockId);
    setLayout(newLayout);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(newLayout.length > 0 ? newLayout[0].id : null);
      setIsMobileSettingsOpen(false);
    }
  };

  const handleUpdateBlock = (updatedBlock) => {
    setLayout(updateBlockById(layout, updatedBlock));
  };

  const handleSelectBlock = (id) => {
    setSelectedBlockId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileSettingsOpen(true);
    }
  };

  const getHumanBlockTypeName = (type) => {
    switch (type) {
      case 'button': return 'Bouton';
      case 'header': return 'Texte';
      case 'table': return 'Tableau de données';
      case 'form': return 'Formulaire';
      case 'stats': return 'Compteur';
      case 'alert': return 'Note';
      case 'container': return 'Conteneur';
      default: return type || 'Composant';
    }
  };

  const selectedBlock = findBlockById(layout, selectedBlockId);
  const isDraggingAny = draggedPaletteType !== null || draggedCanvasIndex !== null;

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)] bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow text-xs flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sidebar: Pages list (Desktop >= md) */}
      <aside className="hidden md:flex md:w-56 bg-white border-r border-gray-200 flex-col shrink-0">
        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-900">Pages</span>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            title="Nouvelle page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="p-4 text-center text-xs text-gray-400">Chargement...</div>
          ) : pages.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">
              Aucune page.
            </div>
          ) : (
            pages.map(page => {
              const isSelected = selectedPage?.id === page.id;
              return (
                <button
                  key={page.id}
                  onClick={() => loadPageDetails(page.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{page.title}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{page.slug === 'index' ? '/page/' : `/${page.slug}`}</span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Mobile Top Bar (Screen < md) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shadow-2xs shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Layout className="w-4 h-4 text-indigo-600 shrink-0" />
          <select
            value={selectedPage?.id || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) loadPageDetails(id);
            }}
            className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
          >
            {pages.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.slug === 'index' ? '/page/' : `/${p.slug}`})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer"
            title="Créer une nouvelle page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Page</span>
          </button>
          <button
            onClick={() => setMobilePagesDrawerOpen(true)}
            className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs cursor-pointer"
            title="Toutes les pages"
            aria-label="Toutes les pages"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Pages Slide-over Drawer */}
      {mobilePagesDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900">Vos Pages</h2>
              </div>
              <button 
                onClick={() => setMobilePagesDrawerOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {pages.map(page => {
                const isSelected = selectedPage?.id === page.id;
                return (
                  <div key={page.id} className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <button
                      onClick={() => {
                        loadPageDetails(page.id);
                        setMobilePagesDrawerOpen(false);
                      }}
                      className="flex-1 text-left truncate flex items-center gap-2 cursor-pointer"
                    >
                      <Layout className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <div className="truncate">{page.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{page.slug === 'index' ? '/page/' : `/${page.slug}`}</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        setMobilePagesDrawerOpen(false);
                        handleDeletePage(page);
                      }} 
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer ml-1"
                      title="Supprimer la page"
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
                  setMobilePagesDrawerOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une nouvelle page</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedPage ? (
          <>
            {/* Top Toolbar */}
            <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-slate-400 shrink-0">Page :</span>
                  <input
                    type="text"
                    value={selectedPage.title}
                    onChange={(e) => setSelectedPage({ ...selectedPage, title: e.target.value })}
                    className="text-xs sm:text-sm font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none px-1 rounded-sm transition-colors truncate max-w-[150px] sm:max-w-none"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 truncate">
                  {selectedPage.slug === 'index' ? '/page/' : `/page/${selectedPage.slug}`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-end shrink-0">
                <button
                  onClick={() => onOpenViewPage && onOpenViewPage(selectedPage.slug)}
                  className="px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Tester cette page en mode interactif"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">Tester en direct</span>
                  <span className="sm:hidden">Tester</span>
                </button>

                <button
                  onClick={handleSavePage}
                  disabled={saving}
                  className="px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-98"
                  title="Sauvegarder l'agencement de la page"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                </button>

                <button
                  onClick={() => handleDeletePage(selectedPage)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Supprimer la page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Draggable Component Palette Bar */}
            <div className="bg-slate-50 border-b border-slate-200/80 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-xs no-scrollbar">
              <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1 shrink-0">
                <span>Composants :</span>
              </span>

              {/* 1. BOUTON */}
              <div
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, 'button')}
                onDragEnd={handlePaletteDragEnd}
                onClick={() => handleAddBlock('button')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50/60 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 rounded-xl font-medium flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xs select-none transition-all hover:scale-102 shrink-0"
                title="Bouton interactif (action au clic, lien externe ou condition Si...Alors)"
              >
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">🔘</span>
                <span>Bouton</span>
              </div>

              {/* 2. TITRE */}
              <div
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, 'header')}
                onDragEnd={handlePaletteDragEnd}
                onClick={() => handleAddBlock('header')}
                className="px-3 py-1.5 bg-white hover:bg-blue-50/60 text-slate-700 hover:text-blue-900 border border-slate-200 hover:border-blue-300 rounded-xl font-medium flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xs select-none transition-all hover:scale-102 shrink-0"
                title="Grand titre d'en-tête et sous-titre"
              >
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">📝</span>
                <span>Titre</span>
              </div>

              {/* 3. TABLEAU */}
              <div
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, 'table')}
                onDragEnd={handlePaletteDragEnd}
                onClick={() => handleAddBlock('table')}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50/60 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl font-medium flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xs select-none transition-all hover:scale-102 shrink-0"
                title="Tableau de données réelles (recherche, colonnes au choix, modifier, supprimer)"
              >
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">📊</span>
                <span>Tableau</span>
              </div>

              {/* 4. FORMULAIRE */}
              <div
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, 'form')}
                onDragEnd={handlePaletteDragEnd}
                onClick={() => handleAddBlock('form')}
                className="px-3 py-1.5 bg-white hover:bg-amber-50/60 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded-xl font-medium flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xs select-none transition-all hover:scale-102 shrink-0"
                title="Formulaire pour permettre aux visiteurs d'insérer des données"
              >
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">✍️</span>
                <span>Formulaire</span>
              </div>

              {/* 5. NOTE */}
              <div
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, 'alert')}
                onDragEnd={handlePaletteDragEnd}
                onClick={() => handleAddBlock('alert')}
                className="px-3 py-1.5 bg-white hover:bg-orange-50/60 text-slate-700 hover:text-orange-900 border border-slate-200 hover:border-orange-300 rounded-xl font-medium flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xs select-none transition-all hover:scale-102 shrink-0"
                title="Bannière d'information ou message d'alerte"
              >
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span className="w-5 h-5 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs">💡</span>
                <span>Note</span>
              </div>

              {/* 6. CONTENEUR / ENCADRÉ */}
              <div
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, 'container')}
                onDragEnd={handlePaletteDragEnd}
                onClick={() => handleAddBlock('container')}
                className="px-3 py-1.5 bg-white hover:bg-violet-50/60 text-slate-700 hover:text-violet-900 border border-slate-200 hover:border-violet-300 rounded-xl font-medium flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xs select-none transition-all hover:scale-102 shrink-0"
                title="Conteneur vide pour regrouper plusieurs blocs dans une bordure"
              >
                <GripVertical className="w-3 h-3 text-slate-300" />
                <span className="w-5 h-5 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs">📦</span>
                <span>Conteneur</span>
              </div>

        
            </div>

            {/* Canvas Body + Properties Panel */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Canvas Scroll Area - full width on mobile, flex-1 on desktop */}
              <div className="w-full flex-1 overflow-y-auto p-3 sm:p-6 md:p-8">
                <div className="max-w-3xl mx-auto pb-28">
                  {/* Drop zone at the very top (index 0) */}
                  <DropZone
                    index={0}
                    isActive={activeDropIndex === 0}
                    isVisible={isDraggingAny}
                    onDragOver={(e) => handleDragOverZone(e, 0)}
                    onDrop={(e) => handleDropOnZone(e, 0)}
                    onInsert={() => insertBlockAt('button', 0)}
                  />

                  {layout.length === 0 ? (
                    <div 
                      onDragOver={(e) => handleDragOverZone(e, 0)}
                      onDrop={(e) => handleDropOnZone(e, 0)}
                      className={`p-6 sm:p-10 md:p-12 text-center border-2 border-dashed rounded-2xl transition-all ${
                        activeDropIndex === 0
                          ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-md'
                          : 'border-slate-300 bg-white shadow-xs'
                      }`}
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                        <Layout className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        Votre page est prête à être construite !
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 mb-4">Ajoutez un premier bloc pour commencer :</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto text-left">
                        <button
                          type="button"
                          onClick={() => handleAddBlock('header')}
                          className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all group cursor-pointer text-left shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 font-semibold text-xs text-slate-900 group-hover:text-blue-900">
                            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">📝</span>
                            <span>En-tête & Titre</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('table')}
                          className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all group cursor-pointer text-left shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 font-semibold text-xs text-slate-900 group-hover:text-emerald-900">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">📊</span>
                            <span>Tableau de données</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('form')}
                          className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-xl transition-all group cursor-pointer text-left shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 font-semibold text-xs text-slate-900 group-hover:text-amber-900">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">✍️</span>
                            <span>Formulaire d'ajout</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('button')}
                          className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all group cursor-pointer text-left shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 font-semibold text-xs text-slate-900 group-hover:text-indigo-900">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">🔘</span>
                            <span>Bouton</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddBlock('container')}
                          className="p-3 bg-slate-50 hover:bg-violet-50/50 border border-slate-200 hover:border-violet-300 rounded-xl transition-all group cursor-pointer text-left shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 font-semibold text-xs text-slate-900 group-hover:text-violet-900">
                            <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs">📦</span>
                            <span>Conteneur (Encadré)</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    layout.map((block, index) => (
                      <React.Fragment key={block.id}>
                        <CanvasBlock
                          block={block}
                          tables={tables}
                          pages={pages}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => handleSelectBlock(block.id)}
                          onMoveUp={() => handleMoveUp(block.id)}
                          onMoveDown={() => handleMoveDown(block.id)}
                          onDelete={handleDeleteBlock}
                          isFirst={index === 0}
                          isLast={index === layout.length - 1}
                          index={index}
                          onDragStart={handleCanvasDragStart}
                          onDragEnd={handleCanvasDragEnd}
                          isDragging={draggedCanvasIndex === index}
                          // Dragging directly ON this block
                          isDragOverBlock={dragOverBlockId === block.id}
                          onDragOverBlock={(e) => handleDragOverBlock(e, block.id)}
                          onDropOnBlock={(e) => handleDropOnBlock(e, block.id)}
                          // Container callbacks
                          onAddChildBlock={(containerId, childType) => {
                            const child = createBlock(childType);
                            setLayout(addChildToContainer(layout, containerId, child));
                            handleSelectBlock(child.id);
                            showToast('Bloc ajouté dans le conteneur !');
                          }}
                          onSelectChildBlock={(id) => handleSelectBlock(id)}
                          onMoveChildBlock={(id, dir) => setLayout(moveBlockInLayout(layout, id, dir))}
                          onDeleteChildBlock={(id) => handleDeleteBlock(id)}
                          onExtractChildBlock={(id) => {
                            setLayout(extractBlockFromContainer(layout, id));
                            showToast('Bloc extrait du conteneur !');
                          }}
                          selectedBlockId={selectedBlockId}
                        />

                        {/* Drop zone between/after blocks */}
                        <DropZone
                          index={index + 1}
                          isActive={activeDropIndex === index + 1}
                          isVisible={isDraggingAny}
                          onDragOver={(e) => handleDragOverZone(e, index + 1)}
                          onDrop={(e) => handleDropOnZone(e, index + 1)}
                          onInsert={() => insertBlockAt('button', index + 1)}
                        />
                      </React.Fragment>
                    ))
                  )}
                </div>
              </div>

              {/* Desktop Settings Panel (Visible only on lg+) */}
              <div className="hidden lg:flex shrink-0">
                <BlockSettings
                  block={selectedBlock}
                  tables={tables}
                  pages={pages}
                  layout={layout}
                  onChange={handleUpdateBlock}
                  onDelete={handleDeleteBlock}
                  onMoveUp={() => selectedBlock && handleMoveUp(selectedBlock.id)}
                  onMoveDown={() => selectedBlock && handleMoveDown(selectedBlock.id)}
                  onAttachButton={() => selectedBlock && attachButtonToBlock(selectedBlock.id)}
                  onDetachToStandalone={handleDetachAttachedButtonToStandalone}
                  onAttachStandaloneToBlock={handleAttachStandaloneToBlock}
                  onAddChildBlock={(containerId, childType) => {
                    const child = createBlock(childType);
                    setLayout(addChildToContainer(layout, containerId, child));
                    setSelectedBlockId(child.id);
                    showToast('Bloc ajouté dans le conteneur !');
                  }}
                  onSelectBlock={(id) => setSelectedBlockId(id)}
                  onExtractChildBlock={(id) => {
                    setLayout(extractBlockFromContainer(layout, id));
                    showToast('Bloc extrait du conteneur !');
                  }}
                />
              </div>
            </div>

            {/* Mobile Bottom Floating Action Bar (When block selected on screen < lg) */}
            {selectedBlock && (
              <div className="lg:hidden fixed bottom-4 left-3 right-3 z-30 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
                  <div className="truncate">
                    <span className="text-xs font-semibold truncate block">
                      {getHumanBlockTypeName(selectedBlock.type)}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {selectedBlock.title || selectedBlock.label || (selectedBlock.type === 'button' ? selectedBlock.text : 'Composant sélectionné')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSettingsOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Régler</span>
                </button>
              </div>
            )}

            {/* Mobile Settings Slide-up Drawer (Screen < lg) */}
            {isMobileSettingsOpen && selectedBlock && (
              <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
                <div className="bg-white w-full h-[90vh] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
                  {/* Drawer Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        Propriétés : {getHumanBlockTypeName(selectedBlock.type)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileSettingsOpen(false)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>✓ Retour</span>
                    </button>
                  </div>

                  {/* Settings Content */}
                  <div className="flex-1 overflow-y-auto">
                    <BlockSettings
                      block={selectedBlock}
                      tables={tables}
                      pages={pages}
                      layout={layout}
                      isMobileDrawer={true}
                      onClose={() => setIsMobileSettingsOpen(false)}
                      onChange={handleUpdateBlock}
                      onDelete={(id) => {
                        handleDeleteBlock(id);
                        setIsMobileSettingsOpen(false);
                      }}
                      onMoveUp={() => selectedBlock && handleMoveUp(selectedBlock.id)}
                      onMoveDown={() => selectedBlock && handleMoveDown(selectedBlock.id)}
                      onAttachButton={() => selectedBlock && attachButtonToBlock(selectedBlock.id)}
                      onDetachToStandalone={handleDetachAttachedButtonToStandalone}
                      onAttachStandaloneToBlock={handleAttachStandaloneToBlock}
                      onAddChildBlock={(containerId, childType) => {
                        const child = createBlock(childType);
                        setLayout(addChildToContainer(layout, containerId, child));
                        setSelectedBlockId(child.id);
                        showToast('Bloc ajouté dans le conteneur !');
                      }}
                      onSelectBlock={(id) => setSelectedBlockId(id)}
                      onExtractChildBlock={(id) => {
                        setLayout(extractBlockFromContainer(layout, id));
                        showToast('Bloc extrait du conteneur !');
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 text-xs">
            <p>Sélectionnez une page pour l'éditer.</p>
          </div>
        )}
      </main>

      {/* Create Page Modal */}
      <CreatePageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePage}
      />
    </div>
  );
}

// Visual Drop Zone Component
function DropZone({ index, isActive, isVisible, onDragOver, onDrop, onInsert }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`my-1.5 transition-all flex items-center justify-center ${
        isActive
          ? 'h-12 bg-indigo-100/80 border-2 border-dashed border-indigo-600 rounded-xl text-indigo-900 text-xs font-bold shadow-md scale-[1.01]'
          : isVisible
          ? 'h-10 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50/50 text-xs font-medium text-indigo-700 shadow-2xs'
          : hovered
          ? 'h-6'
          : 'h-2'
      }`}
    >
      {isActive ? (
        <span className="flex items-center gap-1.5 animate-bounce">
          <span>✦ Déposer le composant ici</span>
        </span>
      ) : isVisible ? (
        <span className="text-[11px] font-medium flex items-center gap-1 text-indigo-600">
          <span>↓ Déposer à cette position</span>
        </span>
      ) : hovered ? (
        <button
          type="button"
          onClick={onInsert}
          className="px-2.5 py-0.5 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 rounded-full text-[10px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          title="Insérer un bouton directement ici"
        >
          <PlusCircle className="w-2.5 h-2.5 text-indigo-500" />
          <span>+ Bouton ici</span>
        </button>
      ) : null}
    </div>
  );
}

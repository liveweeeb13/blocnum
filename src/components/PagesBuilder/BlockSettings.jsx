import React, { useState } from 'react';
import { getAttachedButtons } from '../../utils/attachedButtons';
import { 
  Trash2, MousePointer, HelpCircle, Pin, Plus, 
  ArrowUp, ArrowDown, Move, Maximize2, Minimize2, CornerDownRight,
  Sparkles, Layers, Sliders, MapPin, Zap, Settings, ShieldCheck
} from 'lucide-react';

export default function BlockSettings({ 
  block, 
  onChange, 
  onDelete, 
  tables = [], 
  pages = [], 
  layout = [],
  onMoveUp,
  onMoveDown,
  onAttachButton,
  onDetachToStandalone,
  onAttachStandaloneToBlock
}) {
  const [btnTab, setBtnTab] = useState('style'); // 'style' | 'position' | 'action'
  const [blockTab, setBlockTab] = useState('props'); // 'props' | 'button'
  const [attachedButtonIndex, setAttachedButtonIndex] = useState(0);
  const [draggingAttachedButtonIndex, setDraggingAttachedButtonIndex] = useState(null);

  const getHumanBlockTypeName = (type) => {
    switch (type) {
      case 'button': return 'Bouton interactif';
      case 'header': return 'En-tête & Titre';
      case 'table': return 'Tableau de données';
      case 'form': return 'Formulaire de saisie';
      case 'stats': return 'Compteur statistique';
      case 'alert': return 'Note d\'information';
      default: return type;
    }
  };

  if (!block) {
    return (
      <aside className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col items-center justify-center text-center text-slate-400 text-xs shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-3">
          <Settings className="w-6 h-6 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-700">Sélectionnez un composant</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[210px]">
          Cliquez sur un élément dans la page pour personnaliser son apparence, sa disposition ou ses actions.
        </p>
        {layout.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 w-full text-[11px] text-slate-500">
            <span>{layout.length} composant(s) sur cette page</span>
          </div>
        )}
      </aside>
    );
  }

  const handleUpdate = (field, value) => {
    onChange({
      ...block,
      [field]: value
    });
  };

  const attachedButtons = getAttachedButtons(block);
  const selectedButtonIndex = Math.min(attachedButtonIndex, Math.max(0, attachedButtons.length - 1));
  const selectedButton = attachedButtons[selectedButtonIndex];

  const handleUpdateAttachedButton = (field, value) => {
    const nextButtons = attachedButtons.map((button, index) => index === selectedButtonIndex
      ? { ...button, [field]: value }
      : button);
    onChange({
      ...block,
      attachedButtons: nextButtons,
      attachedButton: null
    });
  };

  const addAttachedButton = () => {
    const firstPage = pages[0]?.slug || '';
    const newButton = {
      id: `attached_${Date.now()}_${attachedButtons.length}`,
      label: 'Action',
      position: 'header-right',
      variant: 'primary',
      size: 'md',
      widthMode: 'auto',
      roundness: 'md',
      icon: 'auto',
      mode: 'direct',
      action: { type: 'page', pageSlug: firstPage, newTab: true, url: '', message: '' },
      condition: { type: 'confirm', question: 'Voulez-vous continuer ?' },
      thenAction: { type: 'page', pageSlug: firstPage, newTab: true, url: '', message: '' },
      hasElse: false,
      elseAction: { type: 'message', message: 'Action annulée' },
    };
    onChange({ ...block, attachedButtons: [...attachedButtons, newButton], attachedButton: null });
    setAttachedButtonIndex(attachedButtons.length);
  };

  const removeAttachedButton = () => {
    onChange({ ...block, attachedButtons: attachedButtons.filter((_, index) => index !== selectedButtonIndex), attachedButton: null });
    setAttachedButtonIndex(Math.max(0, selectedButtonIndex - 1));
  };

  const reorderAttachedButton = (targetIndex) => {
    if (draggingAttachedButtonIndex === null || draggingAttachedButtonIndex === targetIndex) return;
    const nextButtons = [...attachedButtons];
    const [movedButton] = nextButtons.splice(draggingAttachedButtonIndex, 1);
    nextButtons.splice(targetIndex, 0, movedButton);
    onChange({ ...block, attachedButtons: nextButtons, attachedButton: null });
    setAttachedButtonIndex(targetIndex);
    setDraggingAttachedButtonIndex(null);
  };

  const otherBlocks = layout.filter(b => b.id !== block.id);
  const selectedTableObj = tables.find(t => t.name === block.tableName);
  const availableCols = selectedTableObj?.columns || [];

  const currentVisible = block.visibleColumns !== undefined 
    ? block.visibleColumns 
    : availableCols.map(c => c.name);

  const toggleColumn = (colName) => {
    let next;
    if (currentVisible.includes(colName)) {
      next = currentVisible.filter(c => c !== colName);
    } else {
      next = [...currentVisible, colName];
    }
    handleUpdate('visibleColumns', next);
  };

  const selectAllCols = () => {
    handleUpdate('visibleColumns', availableCols.map(c => c.name));
  };

  const deselectAllCols = () => {
    handleUpdate('visibleColumns', []);
  };

  const floatingGridPositions = [
    { id: 'float-top-left', label: 'Haut Gauche', icon: '↖' },
    { id: 'float-top-center', label: 'Haut Centre', icon: '⬆' },
    { id: 'float-top-right', label: 'Haut Droite', icon: '↗' },
    { id: 'float-middle-left', label: 'Milieu Gauche', icon: '⬅' },
    { id: 'float-center', label: 'Plein Centre', icon: '⏺' },
    { id: 'float-middle-right', label: 'Milieu Droite', icon: '➡' },
    { id: 'float-bottom-left', label: 'Bas Gauche', icon: '↙' },
    { id: 'float-bottom-center', label: 'Bas Centre', icon: '⬇' },
    { id: 'float-bottom-right', label: 'Bas Droite (FAB)', icon: '↘' }
  ];

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shrink-0">
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
          <span className="text-xs font-semibold text-slate-900">
            {getHumanBlockTypeName(block.type)}
          </span>
        </div>
        <button
          onClick={() => onDelete(block.id)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title="Supprimer ce composant"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mx-4 mt-3 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-[10px] leading-relaxed text-slate-600">
        <p className="font-semibold text-indigo-800">Variables dans les textes</p>
        <p className="mt-1">Nom connecté : <code className="text-indigo-700">$[username]</code></p>
        <p className="mt-1 break-words font-mono text-[9px] text-slate-500">$[if[$[username]=="admin"]return["Bonjour l'admin"]else["Bonjour"]]</p>
      </div>

      {/* Segmented Tabs */}
      {block.type === 'button' ? (
        <div className="px-4 pt-3 pb-1 border-b border-slate-100">
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setBtnTab('style')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                btnTab === 'style'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Style</span>
            </button>
            <button
              type="button"
              onClick={() => setBtnTab('position')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                btnTab === 'position'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>Position</span>
            </button>
            <button
              type="button"
              onClick={() => setBtnTab('action')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                btnTab === 'action'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Action</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-1 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setBlockTab('props')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                blockTab === 'props'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3 h-3" />
              <span>Propriétés</span>
            </button>
            <button
              type="button"
              onClick={() => setBlockTab('button')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                blockTab === 'button'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>Bouton {attachedButtons.length ? `• ${attachedButtons.length}` : ''}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Form Fields Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Apparence du composant</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Couleurs et bordure du bloc entier.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorPickerField label="Couleur du texte" value={block.textColor || '#111827'} onChange={value => handleUpdate('textColor', value)} />
            <ColorPickerField label="Arrière-plan" value={block.backgroundColor || '#ffffff'} onChange={value => handleUpdate('backgroundColor', value)} />
          </div>
          <label className="block text-[11px] font-medium text-slate-600">Marge intérieure (px)
            <input type="number" min={0} max={64} placeholder="Auto" value={block.innerPadding ?? ''} onChange={event => handleUpdate('innerPadding', event.target.value === '' ? null : Math.max(0, Math.min(64, Number(event.target.value) || 0)))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-700">
            <input type="checkbox" checked={!!block.borderEnabled} onChange={event => handleUpdate('borderEnabled', event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Activer la bordure
          </label>
          {block.borderEnabled && <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-medium text-slate-600">Largeur (px)
              <input type="number" min={1} max={12} value={block.borderWidth || 1} onChange={event => handleUpdate('borderWidth', Math.max(1, Math.min(12, Number(event.target.value) || 1)))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
            </label>
            <label className="block text-[11px] font-medium text-slate-600">Rayon des coins (px)
              <input type="number" min={0} max={32} value={block.borderRadius ?? 8} onChange={event => handleUpdate('borderRadius', Math.max(0, Math.min(32, Number(event.target.value) || 0)))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
            </label>
            <div className="col-span-2"><ColorPickerField label="Couleur de bordure" value={block.borderColor || '#cbd5e1'} onChange={value => handleUpdate('borderColor', value)} /></div>
          </div>}
          {(block.textColor || block.backgroundColor || block.borderEnabled || block.innerPadding !== undefined && block.innerPadding !== null) && <button type="button" onClick={() => onChange({ ...block, textColor: '', backgroundColor: '', borderEnabled: false, borderWidth: 1, borderRadius: 8, borderColor: '', innerPadding: null })} className="text-[10px] font-medium text-slate-500 underline hover:text-slate-800">Réinitialiser l’apparence</button>}
        </section>

        {/* =========================================
            1. STANDALONE BUTTON SETTINGS
           ========================================= */}
        {block.type === 'button' ? (
          <>
            {/* TAB 1: STYLE */}
            {btnTab === 'style' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Libellé du bouton</label>
                  <input
                    type="text"
                    value={block.label || ''}
                    onChange={(e) => handleUpdate('label', e.target.value)}
                    placeholder="Ex: Confirmer la commande"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs font-medium"
                  />
                </div>

                {/* Size */}
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">Taille</label>
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'sm', label: 'Petit' },
                      { id: 'md', label: 'Moyen' },
                      { id: 'lg', label: 'Grand' },
                      { id: 'xl', label: 'Max' }
                    ].map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdate('size', s.id)}
                        className={`py-1 text-center rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          (block.size || 'md') === s.id
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Width */}
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">Largeur</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleUpdate('widthMode', 'auto')}
                      className={`py-1 text-center rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        (block.widthMode || 'auto') === 'auto'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Ajustée
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('widthMode', 'full')}
                      className={`py-1 text-center rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        block.widthMode === 'full'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Pleine
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('widthMode', 'custom')}
                      className={`py-1 text-center rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        block.widthMode === 'custom'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Libre (px)
                    </button>
                  </div>

                  {block.widthMode === 'custom' && (
                    <div className="pt-1.5 flex items-center gap-2">
                      <input
                        type="range"
                        min={80}
                        max={500}
                        step={10}
                        value={block.customWidth || 180}
                        onChange={(e) => handleUpdate('customWidth', Number(e.target.value))}
                        className="flex-1 accent-slate-900 cursor-pointer"
                      />
                      <span className="font-mono text-xs w-12 text-right text-slate-600">
                        {block.customWidth || 180}px
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-700 font-medium">Marge extérieure</label>
                    <span className="font-mono text-[10px] text-slate-500">{block.outerMargin || 0}px</span>
                  </div>
                  <input type="number" min={0} max={32} step={1} value={block.outerMargin ?? 0} onChange={e => handleUpdate('outerMargin', e.target.value === '' ? 0 : Math.max(0, Math.min(32, Number(e.target.value))))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none" />
                  <p className="text-[10px] text-slate-400">Espace autour du bouton, en pixels.</p>
                </div>

                {/* Roundness */}
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">Forme des coins</label>
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'none', label: 'Carré' },
                      { id: 'sm', label: 'Léger' },
                      { id: 'md', label: 'Arrondi' },
                      { id: 'full', label: 'Pilule' }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleUpdate('roundness', r.id)}
                        className={`py-1 text-center rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          (block.roundness || 'md') === r.id
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color and Icon */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Couleur</label>
                    <select
                      value={block.variant || 'primary'}
                      onChange={(e) => handleUpdate('variant', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 bg-white text-xs cursor-pointer"
                    >
                      <option value="primary">Noir</option>
                      <option value="secondary">Gris</option>
                      <option value="outline">Blanc</option>
                      <option value="danger">Rouge</option>
                      <option value="success">Vert</option>
                      <option value="indigo">Bleu</option>
                      <option value="ghost">Transparent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Icône</label>
                    <select
                      value={block.icon || 'auto'}
                      onChange={(e) => handleUpdate('icon', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 bg-white text-xs cursor-pointer"
                    >
                      <option value="auto">Auto (selon action)</option>
                      <option value="arrow">Flèche (→)</option>
                      <option value="external">Lien ext (↗)</option>
                      <option value="plus">Plus (+)</option>
                      <option value="check">Coche (✓)</option>
                      <option value="zap">Éclair (⚡)</option>
                      <option value="star">Étoile (★)</option>
                      <option value="send">Envoi (➤)</option>
                      <option value="none">Sans icône</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: POSITION */}
            {btnTab === 'position' && (
              <div className="space-y-4 animate-fade-in">
                {/* Mode: Standard vs Floating */}
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">Type d'emplacement</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleUpdate('position', 'standard')}
                      className={`py-1.5 text-center rounded-lg font-medium transition-all cursor-pointer ${
                        (block.position || 'standard') === 'standard'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Dans la page
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('position', 'float-bottom-right')}
                      className={`py-1.5 text-center rounded-lg font-medium transition-all cursor-pointer ${
                        block.position && block.position.startsWith('float')
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Flottant à l'écran
                    </button>
                  </div>
                </div>

                {/* If In-Page: Alignment & Reordering */}
                {(block.position || 'standard') === 'standard' ? (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div>
                      <label className="block text-slate-600 text-[11px] font-medium mb-1">Alignement horizontal</label>
                      <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        {[
                          { id: 'left', label: 'Gauche' },
                          { id: 'center', label: 'Centré' },
                          { id: 'right', label: 'Droite' },
                          { id: 'full', label: 'Plein' }
                        ].map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleUpdate('align', a.id)}
                            className={`py-1 text-center rounded text-[10px] font-medium transition-all cursor-pointer ${
                              (block.align || 'left') === a.id
                                ? 'bg-slate-900 text-white font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Move Up/Down */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                      <span className="text-slate-500 text-[11px]">Déplacer dans la page :</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={onMoveUp}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Monter"
                        >
                          <ArrowUp className="w-3 h-3" />
                          <span>Monter</span>
                        </button>
                        <button
                          type="button"
                          onClick={onMoveDown}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Descendre"
                        >
                          <ArrowDown className="w-3 h-3" />
                          <span>Descendre</span>
                        </button>
                      </div>
                    </div>

                    {/* Move to another block */}
                    {otherBlocks.length > 0 && onAttachStandaloneToBlock && (
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block text-slate-600 text-[11px] mb-1">
                          Fixer sur un composant existant :
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              onAttachStandaloneToBlock(block.id, e.target.value);
                            }
                          }}
                          defaultValue=""
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
                        >
                          <option value="">-- Choisir un composant cible --</option>
                          {otherBlocks.map(b => (
                            <option key={b.id} value={b.id}>
                              Fixer sur : {b.title || b.type}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  /* If Floating: 3x3 Grid */
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-700 font-medium">Position sur l'écran :</span>
                      <span className="text-[10px] text-indigo-600 font-semibold">
                        {floatingGridPositions.find(p => p.id === block.position)?.label || 'Personnalisé'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-white rounded-xl border border-slate-200">
                      {floatingGridPositions.map(pos => {
                        const isActive = block.position === pos.id;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => {
                              const newAlign = pos.id.endsWith('-right') ? 'right' : (pos.id.endsWith('-center') || pos.id === 'float-center') ? 'center' : 'left';
                              onChange({
                                ...block,
                                position: pos.id,
                                align: newAlign
                              });
                            }}
                            title={pos.label}
                            className={`h-10 flex flex-col items-center justify-center rounded-lg text-xs transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-100'
                            }`}
                          >
                            <span className="text-sm leading-none">{pos.icon}</span>
                            <span className="text-[9px] mt-0.5 truncate max-w-full px-1">
                              {pos.label.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Free offset sliders */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Ajuster la position libre :</span>
                        {(block.offsetX || block.offsetY) ? (
                          <button
                            type="button"
                            onClick={() => onChange({ ...block, offsetX: 0, offsetY: 0 })}
                            className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                          >
                            Réinitialiser
                          </button>
                        ) : null}
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Décalage horizontal (X) :</span>
                          <span className="font-mono">{block.offsetX || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min={-150}
                          max={150}
                          step={5}
                          value={block.offsetX || 0}
                          onChange={(e) => handleUpdate('offsetX', Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Décalage vertical (Y) :</span>
                          <span className="font-mono">{block.offsetY || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          step={5}
                          value={block.offsetY || 0}
                          onChange={(e) => handleUpdate('offsetY', Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ACTION */}
            {btnTab === 'action' && (
              <div className="space-y-4 animate-fade-in">
                {/* Trigger Mode */}
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">Type de logique</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleUpdate('mode', 'direct')}
                      className={`py-1.5 text-center rounded-lg font-medium transition-all cursor-pointer ${
                        (block.mode || 'direct') === 'direct'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Action directe
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('mode', 'conditional')}
                      className={`py-1.5 text-center rounded-lg font-medium transition-all cursor-pointer ${
                        block.mode === 'conditional'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Si ... Alors ...
                    </button>
                  </div>
                </div>

                {/* Direct Action */}
                {(block.mode || 'direct') === 'direct' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                    <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
                      Action au clic
                    </span>
                    <ActionSelector
                      action={block.action || { type: 'page', pageSlug: '' }}
                      onChange={(newAction) => handleUpdate('action', newAction)}
                      pages={pages}
                    />
                  </div>
                )}

                {/* Conditional Action */}
                {block.mode === 'conditional' && (
                  <ConditionalActionEditor
                    condition={block.condition}
                    thenAction={block.thenAction}
                    hasElse={block.hasElse}
                    elseAction={block.elseAction}
                    onChangeCondition={(c) => handleUpdate('condition', c)}
                    onChangeThen={(a) => handleUpdate('thenAction', a)}
                    onChangeHasElse={(v) => handleUpdate('hasElse', v)}
                    onChangeElse={(a) => handleUpdate('elseAction', a)}
                    tables={tables}
                    pages={pages}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          /* =========================================
              2. CONTENT BLOCKS (HEADER, TABLE, FORM, STATS, ALERT)
             ========================================= */
          <>
            {blockTab === 'props' ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Titre du bloc</label>
                  <input
                    type="text"
                    value={block.title || ''}
                    onChange={(e) => handleUpdate('title', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs"
                  />
                </div>

                {block.type === 'header' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Sous-titre / Description</label>
                    <textarea
                      rows={2}
                      value={block.subtitle || ''}
                      onChange={(e) => handleUpdate('subtitle', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs"
                    />
                  </div>
                )}

                {(block.type === 'table' || block.type === 'form' || block.type === 'stats') && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Table de données associée</label>
                    <select
                      value={block.tableName || ''}
                      onChange={(e) => handleUpdate('tableName', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 bg-white text-xs cursor-pointer"
                    >
                      <option value="">-- Choisir une table --</option>
                      {tables.map(t => (
                        <option key={t.id || t.name} value={t.name}>
                          {t.label || t.name} ({t.rowCount} entrées)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {block.type === 'table' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-700 font-medium">Colonnes affichées</label>
                        <div className="flex gap-2 text-[10px]">
                          <button type="button" onClick={selectAllCols} className="text-indigo-600 hover:underline">Toutes</button>
                          <span>•</span>
                          <button type="button" onClick={deselectAllCols} className="text-slate-400 hover:underline">Aucune</button>
                        </div>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        {availableCols.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Sélectionnez une table pour voir ses colonnes.</p>
                        ) : (
                          availableCols.map(col => (
                            <label key={col.name} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded-lg">
                              <input
                                type="checkbox"
                                checked={currentVisible.includes(col.name)}
                                onChange={() => toggleColumn(col.name)}
                                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300"
                              />
                              <span>{col.label}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="block text-slate-700 font-medium text-[11px]">Boutons d'action dans le tableau</label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={block.allowEdit !== false}
                          onChange={(e) => handleUpdate('allowEdit', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300"
                        />
                        <span>Bouton Modifier par ligne</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={block.allowDelete !== false}
                          onChange={(e) => handleUpdate('allowDelete', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300"
                        />
                        <span>Bouton Supprimer par ligne</span>
                      </label>
                    </div>
                  </div>
                )}

                {block.type === 'form' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Texte du bouton d'envoi</label>
                    <input
                      type="text"
                      value={block.buttonText || ''}
                      onChange={(e) => handleUpdate('buttonText', e.target.value)}
                      placeholder="Enregistrer"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-xs"
                    />
                  </div>
                )}

                {block.type === 'alert' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Message d'information</label>
                    <textarea
                      rows={2}
                      value={block.message || ''}
                      onChange={(e) => handleUpdate('message', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-xs"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: ATTACHED BUTTON */
              <div className="space-y-4 animate-fade-in">
                {selectedButton ? (
                  <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-900 text-xs flex items-center gap-1.5">
                        <Pin className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Bouton fixé sur ce composant</span>
                      </span>
                      <div className="flex items-center gap-2 text-[10px]">
                        {onDetachToStandalone && (
                          <button
                            type="button"
                            onClick={() => onDetachToStandalone(block.id, selectedButtonIndex)}
                            className="text-indigo-600 hover:underline cursor-pointer flex items-center gap-0.5 font-medium"
                          >
                            <CornerDownRight className="w-2.5 h-2.5" />
                            <span>Rendre autonome</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={removeAttachedButton}
                          className="text-red-500 hover:underline cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {attachedButtons.map((button, index) => <button key={button.id || index} type="button" draggable onDragStart={() => setDraggingAttachedButtonIndex(index)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); reorderAttachedButton(index); }} onDragEnd={() => setDraggingAttachedButtonIndex(null)} onClick={() => setAttachedButtonIndex(index)} title="Glisser pour réordonner" className={`cursor-grab rounded-lg border px-2 py-1 text-[10px] font-medium active:cursor-grabbing ${index === selectedButtonIndex ? 'border-indigo-300 bg-white text-indigo-800' : 'border-indigo-100 text-indigo-600 hover:bg-white'} ${draggingAttachedButtonIndex === index ? 'opacity-40' : ''}`}>{button.label || `Bouton ${index + 1}`}</button>)}
                      <button type="button" onClick={addAttachedButton} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-700"><Plus className="h-3 w-3" />Ajouter</button>
                    </div>
                    <div>
                      <label className="block text-slate-700 text-[11px] font-medium mb-1">Texte du bouton</label>
                      <input
                        type="text"
                        value={selectedButton.label || ''}
                        onChange={(e) => handleUpdateAttachedButton('label', e.target.value)}
                        placeholder="Ex: Action"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 text-[11px] font-medium mb-1">Emplacement</label>
                        <select
                          value={selectedButton.position || 'header-right'}
                          onChange={(e) => handleUpdateAttachedButton('position', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                        >
                          <option value="header-right">En-tête droite</option>
                          <option value="header-left">En-tête gauche</option>
                          <option value="header-center">En-tête centre</option>
                          <option value="footer-right">Pied droite</option>
                          <option value="footer-left">Pied gauche</option>
                          <option value="footer-center">Pied centre</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 text-[11px] font-medium mb-1">Style</label>
                        <select
                          value={selectedButton.variant || 'primary'}
                          onChange={(e) => handleUpdateAttachedButton('variant', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                        >
                          <option value="primary">Noir</option>
                          <option value="secondary">Gris</option>
                          <option value="outline">Contour</option>
                          <option value="danger">Rouge</option>
                          <option value="success">Vert</option>
                          <option value="indigo">Bleu</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-indigo-100 pt-3">
                      <div className="space-y-1.5">
                        <label className="block text-slate-700 text-[11px] font-medium">Taille</label>
                        <div className="grid grid-cols-4 gap-1 rounded-lg bg-indigo-50 p-1">
                          {[['sm', 'Petit'], ['md', 'Moyen'], ['lg', 'Grand'], ['xl', 'Max']].map(([value, label]) => <button key={value} type="button" onClick={() => handleUpdateAttachedButton('size', value)} className={`rounded-md py-1.5 text-[10px] font-medium ${ (selectedButton.size || 'md') === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800' }`}>{label}</button>)}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-slate-700 text-[11px] font-medium">Largeur</label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-indigo-50 p-1">
                          {[['auto', 'Ajustée'], ['full', 'Pleine'], ['custom', 'Libre (px)']].map(([value, label]) => <button key={value} type="button" onClick={() => handleUpdateAttachedButton('widthMode', value)} className={`rounded-md py-1.5 text-[10px] font-medium ${(selectedButton.widthMode || 'auto') === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
                        </div>
                        {selectedButton.widthMode === 'custom' && <div className="flex items-center gap-2"><input type="range" min={80} max={500} step={10} value={selectedButton.customWidth || 180} onChange={event => handleUpdateAttachedButton('customWidth', Number(event.target.value))} className="flex-1 accent-indigo-600" /><span className="w-12 text-right font-mono text-[10px] text-slate-600">{selectedButton.customWidth || 180}px</span></div>}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between"><label className="block text-slate-700 text-[11px] font-medium">Marge extérieure</label><span className="font-mono text-[10px] text-slate-500">{selectedButton.outerMargin || 0}px</span></div>
                        <input type="number" min={0} max={32} step={1} value={selectedButton.outerMargin ?? 0} onChange={event => handleUpdateAttachedButton('outerMargin', event.target.value === '' ? 0 : Math.max(0, Math.min(32, Number(event.target.value))))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:border-indigo-400 focus:outline-none" />
                        <p className="text-[10px] text-slate-400">Espace autour du bouton, en pixels.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-slate-700 text-[11px] font-medium">Forme des coins</label>
                        <div className="grid grid-cols-4 gap-1 rounded-lg bg-indigo-50 p-1">
                          {[['none', 'Carré'], ['sm', 'Léger'], ['md', 'Arrondi'], ['full', 'Pilule']].map(([value, label]) => <button key={value} type="button" onClick={() => handleUpdateAttachedButton('roundness', value)} className={`rounded-md py-1.5 text-[10px] font-medium ${(selectedButton.roundness || 'md') === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block text-slate-700 text-[11px] font-medium">Couleur
                          <select value={selectedButton.variant || 'primary'} onChange={event => handleUpdateAttachedButton('variant', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]">
                            <option value="primary">Noir</option><option value="secondary">Gris</option><option value="outline">Blanc</option><option value="danger">Rouge</option><option value="success">Vert</option><option value="indigo">Bleu</option><option value="ghost">Transparent</option>
                          </select>
                        </label>
                        <label className="block text-slate-700 text-[11px] font-medium">Icône
                          <select value={selectedButton.icon || 'auto'} onChange={event => handleUpdateAttachedButton('icon', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]">
                            <option value="auto">Auto (selon action)</option><option value="arrow">Flèche</option><option value="external">Lien externe</option><option value="plus">Plus</option><option value="check">Coche</option><option value="zap">Éclair</option><option value="star">Étoile</option><option value="send">Envoi</option><option value="none">Sans icône</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-100">
                      <label className="block text-slate-700 text-[11px] font-medium mb-1">Action au clic</label>
                      <ActionSelector
                        action={selectedButton.action || { type: 'page', pageSlug: '' }}
                        onChange={(newAction) => handleUpdateAttachedButton('action', newAction)}
                        pages={pages}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Pin className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Aucun bouton fixé sur ce composant</p>
                    <p className="text-[11px] text-slate-400 mt-1 mb-3">
                      Ajoutez un bouton qui restera toujours attaché à ce tableau ou formulaire.
                    </p>
                    <button
                      type="button"
                      onClick={addAttachedButton}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Fixer un bouton maintenant</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function ColorPickerField({ label, value, onChange }) {
  const color = value || '#ffffff';
  return (
    <label className="block min-w-0 text-[11px] font-medium text-slate-600">
      {label}
      <span className="relative mt-1 flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm transition hover:border-indigo-300 hover:shadow focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
        <span className="h-5 w-5 shrink-0 rounded-md border border-black/10 shadow-inner" style={{ backgroundColor: color }} />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-700">{color}</span>
        <span className="ml-auto text-[10px] text-slate-400">Choisir</span>
        <input type="color" aria-label={label} value={color} onChange={event => onChange(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </span>
    </label>
  );
}

// Action Selector Component
function ActionSelector({ action, onChange, pages = [] }) {
  const currentAction = action || { type: 'page', pageSlug: '' };

  const setType = (type) => {
    onChange({
      ...currentAction,
      type
    });
  };

  const setField = (field, val) => {
    onChange({
      ...currentAction,
      [field]: val
    });
  };

  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-slate-700 font-medium text-[11px] mb-1">Que doit faire ce bouton ?</label>
        <select
          value={currentAction.type || 'page'}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 bg-white text-xs cursor-pointer font-medium"
        >
          <option value="page">Rerigier vers une autre page</option>
          <option value="url">Ouvrir un lien externe</option>
          <option value="message">Afficher une notification</option>
          <option value="refresh">Recharger les données</option>
        </select>
      </div>

      {currentAction.type === 'page' && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
          <label className="block text-slate-700 font-medium text-[11px] mb-1">Page de destination :</label>
          <select
            value={currentAction.pageSlug || ''}
            onChange={(e) => setField('pageSlug', e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-slate-50 text-xs cursor-pointer"
          >
            <option value="">-- Choisir une page --</option>
            {pages.map(p => (
              <option key={p.id} value={p.slug}>
                {p.title} (/{p.slug})
              </option>
            ))}
          </select>
        </div>
      )}

      {currentAction.type === 'url' && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-2">
          <div>
            <label className="block text-slate-700 font-medium text-[11px] mb-1">Lien du site internet :</label>
            <input
              type="text"
              placeholder="https://example.com"
              value={currentAction.url || ''}
              onChange={(e) => setField('url', e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-mono"
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={currentAction.newTab !== false}
              onChange={(e) => setField('newTab', e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300"
            />
            <span>Ouvrir dans un nouvel onglet</span>
          </label>
        </div>
      )}

      {currentAction.type === 'message' && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
          <label className="block text-slate-700 font-medium text-[11px] mb-1">Message affiché à l'écran :</label>
          <input
            type="text"
            placeholder="Ex: Merci beaucoup pour votre confirmation !"
            value={currentAction.message || ''}
            onChange={(e) => setField('message', e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs"
          />
        </div>
      )}
    </div>
  );
}

// Conditional Logic Editor (Si ... Alors ... Sinon)
function ConditionalActionEditor({
  condition,
  thenAction,
  hasElse,
  elseAction,
  onChangeCondition,
  onChangeThen,
  onChangeHasElse,
  onChangeElse,
  tables = [],
  pages = []
}) {
  return (
    <div className="space-y-3">
      {/* 1. SI (Condition) */}
      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
        <span className="font-semibold text-amber-900 block text-[11px] uppercase tracking-wider">
          1. SI (Condition)
        </span>

        <div>
          <label className="block text-slate-700 text-[11px] font-medium mb-1">Vérifier :</label>
          <select
            value={condition?.type || 'confirm'}
            onChange={(e) => onChangeCondition({ ...(condition || {}), type: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white text-xs cursor-pointer font-medium"
          >
            <option value="confirm">❓ Demander confirmation avant d'agir</option>
            <option value="table_count">📊 Tester le nombre de lignes dans une table</option>
            <option value="prompt">🔑 Demander un mot de passe ou code secret</option>
          </select>
        </div>

        {(condition?.type || 'confirm') === 'confirm' && (
          <div>
            <label className="block text-slate-700 text-[11px] mb-1">Message de la question :</label>
            <input
              type="text"
              placeholder="Ex: Voulez-vous continuer ?"
              value={condition?.question || ''}
              onChange={(e) => onChangeCondition({ ...(condition || {}), question: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-amber-200 rounded-xl bg-white text-xs"
            />
          </div>
        )}

        {condition?.type === 'table_count' && (
          <div className="space-y-1.5">
            <div>
              <label className="block text-slate-700 text-[11px]">Table :</label>
              <select
                value={condition?.tableName || ''}
                onChange={(e) => onChangeCondition({ ...(condition || {}), tableName: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-amber-200 rounded-xl bg-white text-xs"
              >
                <option value="">-- Choisir une table --</option>
                {tables.map(t => (
                  <option key={t.id} value={t.name}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-slate-700 text-[11px]">Opérateur :</label>
                <select
                  value={condition?.operator || '>'}
                  onChange={(e) => onChangeCondition({ ...(condition || {}), operator: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-amber-200 rounded-xl bg-white text-xs"
                >
                  <option value=">">Supérieur à (&gt;)</option>
                  <option value="<">Inférieur à (&lt;)</option>
                  <option value="=">Égal à (=)</option>
                  <option value=">=">Supérieur ou égal (&gt;=)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 text-[11px]">Valeur :</label>
                <input
                  type="number"
                  value={condition?.value !== undefined ? condition.value : 0}
                  onChange={(e) => onChangeCondition({ ...(condition || {}), value: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-amber-200 rounded-xl bg-white text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {condition?.type === 'prompt' && (
          <div className="space-y-1.5">
            <div>
              <label className="block text-slate-700 text-[11px]">Question posée :</label>
              <input
                type="text"
                placeholder="Ex: Entrez le mot de passe :"
                value={condition?.promptQuestion || ''}
                onChange={(e) => onChangeCondition({ ...(condition || {}), promptQuestion: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-amber-200 rounded-xl bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-[11px]">Valeur exacte attendue :</label>
              <input
                type="text"
                placeholder="Ex: 1234"
                value={condition?.expectedValue || ''}
                onChange={(e) => onChangeCondition({ ...(condition || {}), expectedValue: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-amber-200 rounded-xl bg-white text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. ALORS */}
      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
        <span className="font-semibold text-emerald-900 block text-[11px] uppercase tracking-wider">
          2. ALORS (Si condition vérifiée)
        </span>
        <ActionSelector
          action={thenAction || { type: 'page', pageSlug: '' }}
          onChange={onChangeThen}
          pages={pages}
        />
      </div>

      {/* 3. SINON */}
      <div className="pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={!!hasElse}
            onChange={(e) => onChangeHasElse(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300"
          />
          <span>Ajouter une alternative (SINON)</span>
        </label>
      </div>

      {hasElse && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
            3. SINON (Si condition non vérifiée)
          </span>
          <ActionSelector
            action={elseAction || { type: 'message', message: 'Action annulée' }}
            onChange={onChangeElse}
            pages={pages}
          />
        </div>
      )}
    </div>
  );
}

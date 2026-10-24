import React, { useState } from 'react';
import { 
  ArrowRight, ExternalLink, Plus, Check, Zap, Star, 
  Send, Sparkles, RefreshCw, MousePointer, Info
} from 'lucide-react';
import { runButtonAction } from '../../utils/actionRunner';

/**
 * Returns Tailwind classes for the button based on its configuration
 */
export function getButtonClass(block = {}) {
  const {
    variant = 'primary',
    size = 'md',
    roundness = 'md',
    widthMode = 'auto'
  } = block;

  let base = "font-medium inline-flex items-center justify-center transition-all cursor-pointer shadow-2xs select-none active:scale-[0.98] ";

  // 1. SIZE & PADDING
  switch (size) {
    case 'sm':
      base += "px-2.5 py-1 text-[11px] gap-1 ";
      break;
    case 'lg':
      base += "px-5 py-2.5 text-sm gap-2 ";
      break;
    case 'xl':
      base += "px-6 py-3.5 text-base gap-2.5 font-semibold ";
      break;
    case 'md':
    default:
      base += "px-3.5 py-1.5 text-xs gap-1.5 ";
      break;
  }

  // 2. ROUNDNESS / RADIUS
  switch (roundness) {
    case 'none':
      base += "rounded-none ";
      break;
    case 'sm':
      base += "rounded-md ";
      break;
    case 'full':
      base += "rounded-full ";
      break;
    case 'md':
    default:
      base += "rounded-xl ";
      break;
  }

  // 3. COLOR VARIANT
  switch (variant) {
    case 'secondary':
      base += "bg-gray-200 text-gray-800 hover:bg-gray-300 ";
      break;
    case 'outline':
      base += "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 ";
      break;
    case 'danger':
      base += "bg-red-600 text-white hover:bg-red-700 ";
      break;
    case 'success':
      base += "bg-emerald-600 text-white hover:bg-emerald-700 ";
      break;
    case 'indigo':
      base += "bg-indigo-600 text-white hover:bg-indigo-700 ";
      break;
    case 'ghost':
      base += "bg-transparent text-gray-700 hover:bg-gray-100 shadow-none ";
      break;
    case 'primary':
    default:
      base += "bg-gray-900 text-white hover:bg-gray-800 ";
      break;
  }

  // 4. WIDTH MODE
  if (widthMode === 'full' || block.align === 'full') {
    base += "w-full ";
  }

  return base;
}

/**
 * Returns inline styles for width if widthMode is 'custom'
 */
export function getButtonInlineStyle(block = {}) {
  const style = {};
  if (block.widthMode === 'custom' && block.customWidth) {
    style.width = `${block.customWidth}px`;
    style.maxWidth = '100%';
  }
  if (block.outerMargin) {
    style.margin = `${block.outerMargin}px`;
  }
  return style;
}

/**
 * Returns wrapper classes for in-flow or floating positioning
 */
export function getButtonWrapperClass(block = {}, isAttached = false, isPreview = false) {
  if (isPreview || isAttached || block.isAttached || block.position?.startsWith('header') || block.position?.startsWith('footer') || block.position === 'inline') {
    return "inline-flex items-center shrink-0 ";
  }

  const position = block.position || 'standard';

  // 1. FLOATING POSITIONS (FIXED ON SCREEN)
  switch (position) {
    case 'float-top-left':
      return "fixed top-20 left-6 z-40 ";
    case 'float-top-center':
      return "fixed top-20 left-1/2 -translate-x-1/2 z-40 ";
    case 'float-top-right':
      return "fixed top-20 right-6 z-40 ";
    case 'float-middle-left':
      return "fixed top-1/2 left-6 -translate-y-1/2 z-40 ";
    case 'float-center':
      return "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 ";
    case 'float-middle-right':
      return "fixed top-1/2 right-6 -translate-y-1/2 z-40 ";
    case 'float-bottom-left':
      return "fixed bottom-6 left-6 z-40 ";
    case 'float-bottom-center':
      return "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 ";
    case 'float-bottom-right':
      return "fixed bottom-6 right-6 z-40 ";
    case 'custom-coords':
      return "fixed z-40 ";
    default:
      break;
  }

  // 2. IN-FLOW ALIGNMENT
  const align = block.align || 'left';
  let wrapper = "my-1 flex ";
  if (align === 'center') wrapper += "justify-center";
  else if (align === 'right') wrapper += "justify-end";
  else if (align === 'full') wrapper += "w-full";
  else wrapper += "justify-start";

  return wrapper;
}

/**
 * Returns icon element based on block.icon or action type
 */
export function renderButtonIcon(block = {}, iconClass = "w-3.5 h-3.5") {
  const iconChoice = block.icon || 'auto';

  if (iconChoice === 'none') return null;
  if (iconChoice === 'plus') return <Plus className={iconClass} />;
  if (iconChoice === 'check') return <Check className={iconClass} />;
  if (iconChoice === 'zap') return <Zap className={iconClass} />;
  if (iconChoice === 'star') return <Star className={iconClass} />;
  if (iconChoice === 'send') return <Send className={iconClass} />;
  if (iconChoice === 'sparkles') return <Sparkles className={iconClass} />;
  if (iconChoice === 'refresh') return <RefreshCw className={iconClass} />;
  if (iconChoice === 'arrow') return <ArrowRight className={iconClass} />;
  if (iconChoice === 'external') return <ExternalLink className={iconClass} />;

  // 'auto' mode: pick icon based on action
  const actionType = block.mode === 'conditional'
    ? (block.thenAction?.type || 'message')
    : (block.action?.type || 'page');

  if (actionType === 'url') return <ExternalLink className={iconClass} />;
  if (actionType === 'refresh') return <RefreshCw className={iconClass} />;
  return <ArrowRight className={iconClass} />;
}

/**
 * Universal Action Button Component
 */
export default function ActionButton({ 
  block = {}, 
  onNavigatePage, 
  onDataChanged, 
  showToast, 
  isPreview = false,
  isAttached = false,
  className = '',
  style = {}
}) {
  const [running, setRunning] = useState(false);

  const handleClick = async (e) => {
    if (isPreview) {
      e?.preventDefault?.();
      return;
    }
    setRunning(true);
    try {
      await runButtonAction({
        block,
        onNavigatePage,
        onDataChanged,
        showToast
      });
    } catch (err) {
      console.error(err);
      showToast?.('Erreur : ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const btnClasses = getButtonClass(block) + ' ' + className + (isPreview ? ' pointer-events-none' : '');
  const inlineStyles = { 
    ...getButtonInlineStyle(block), 
    ...(block.offsetX ? { transform: `translateX(${block.offsetX}px)` } : {}),
    ...(block.offsetY ? { marginTop: `${block.offsetY}px` } : {}),
    ...style 
  };
  const wrapperClass = getButtonWrapperClass(block, isAttached, isPreview);

  const iconClass = block.size === 'xl' ? 'w-4.5 h-4.5' :
                    block.size === 'lg' ? 'w-4 h-4' :
                    block.size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const customFloatingStyle = (!isPreview && block.position === 'custom-coords') ? {
    left: `${block.customX ?? 20}px`,
    top: `${block.customY ?? 100}px`
  } : {};

  const textPos = block.textPosition || 'above';
  const isHorizontalText = textPos === 'left' || textPos === 'right';

  const textElement = block.text ? (
    <p className={`text-xs ${textPos === 'below' ? 'text-slate-500' : 'text-slate-700'} whitespace-pre-line leading-relaxed max-w-xl`}>
      {block.text}
    </p>
  ) : null;

  const buttonElement = (
    <button
      type="button"
      onClick={handleClick}
      disabled={running}
      className={`lowcode-action-button ${btnClasses}`}
      style={inlineStyles}
      tabIndex={isPreview ? -1 : 0}
    >
      <span>{block.label || 'Mon Bouton'}</span>
      {renderButtonIcon(block, iconClass)}
    </button>
  );

  return (
    <div className={wrapperClass} style={customFloatingStyle}>
      <div
        className={`inline-flex ${
          isHorizontalText
            ? 'flex-row items-center gap-3'
            : `flex-col ${
                block.align === 'center'
                  ? 'items-center text-center'
                  : block.align === 'right'
                  ? 'items-end text-right'
                  : 'items-start text-left'
              }`
        } ${block.widthMode === 'full' || block.align === 'full' ? 'w-full justify-between' : ''}`}
      >
        {block.text && (textPos === 'above' || textPos === 'left') && (
          isHorizontalText ? textElement : <div className="mb-1.5">{textElement}</div>
        )}
        {buttonElement}
        {block.text && (textPos === 'below' || textPos === 'right') && (
          isHorizontalText ? textElement : <div className="mt-1.5">{textElement}</div>
        )}
      </div>
    </div>
  );
}


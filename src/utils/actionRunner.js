import { apiRequest } from '../api';

/**
 * Execute button actions with support for:
 * - Direct action (Page, External URL, Message, Refresh)
 * - Conditional logic (Si ... Alors ... Sinon ...)
 */
export async function runButtonAction({ block, onNavigatePage, onDataChanged, showToast }) {
  if (!block) return;

  const mode = block.mode || 'direct'; // 'direct' | 'conditional'

  if (mode === 'direct') {
    const action = block.action || { type: 'page', pageSlug: '' };
    await executeSingleAction(action, { onNavigatePage, onDataChanged, showToast });
    return;
  }

  // Conditional: Si ... Alors ... Sinon
  const condition = block.condition || { type: 'confirm', question: 'Confirmer ?' };
  let isTrue = false;

  try {
    if (condition.type === 'confirm') {
      isTrue = window.confirm(condition.question || 'Voulez-vous continuer ?');
    } else if (condition.type === 'prompt') {
      const input = window.prompt(condition.promptQuestion || 'Entrez la valeur :');
      isTrue = input !== null && input.trim() === String(condition.expectedValue || '').trim();
    } else if (condition.type === 'table_count') {
      if (condition.tableName) {
        const res = await apiRequest(`/tables/${condition.tableName}/data`);
        const count = res.rows ? res.rows.length : 0;
        const targetVal = Number(condition.value) || 0;
        const op = condition.operator || '>';
        if (op === '>') isTrue = count > targetVal;
        else if (op === '<') isTrue = count < targetVal;
        else if (op === '=') isTrue = count === targetVal;
        else if (op === '>=') isTrue = count >= targetVal;
        else if (op === '<=') isTrue = count <= targetVal;
      }
    }
  } catch (err) {
    console.error('Error evaluating condition:', err);
    isTrue = false;
  }

  if (isTrue) {
    // ALORS
    const thenAction = block.thenAction || { type: 'message', message: 'Condition vérifiée' };
    await executeSingleAction(thenAction, { onNavigatePage, onDataChanged, showToast });
  } else {
    // SINON (if configured)
    if (block.hasElse && block.elseAction) {
      await executeSingleAction(block.elseAction, { onNavigatePage, onDataChanged, showToast });
    }
  }
}

async function executeSingleAction(action, { onNavigatePage, onDataChanged, showToast }) {
  if (!action || !action.type) return;

  switch (action.type) {
    case 'page': {
      if (!action.pageSlug) {
        showToast('Aucune page sélectionnée');
        return;
      }
      if (onNavigatePage) {
        onNavigatePage(action.pageSlug);
      } else {
        window.location.href = `/page/${action.pageSlug}`;
      }
      break;
    }

    case 'url': {
      if (!action.url) {
        showToast('Aucune URL spécifiée');
        return;
      }
      let targetUrl = action.url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      if (action.newTab !== false) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = targetUrl;
      }
      break;
    }

    case 'message': {
      if (action.message) {
        showToast(action.message);
      }
      break;
    }

    case 'refresh': {
      if (onDataChanged) {
        onDataChanged();
      }
      showToast('Données actualisées');
      break;
    }

    default:
      break;
  }
}


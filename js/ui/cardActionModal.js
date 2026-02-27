import { getLastHistoryEntry } from '../cardHistory.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';
import { bindTap } from '../utils/tap.js';

const IDS = {
  modal: 'card-action-modal',
  panel: '.modal__panel',
  title: '#card-action-title',
  message: '#card-action-message',
  actions: '#card-action-actions',
  closeTop: '#card-action-close-top',
  closeBottom: '#card-action-close-bottom'
};

let initialized = false;
let returnFocusEl = null;
let closeHandler = null;
let actionHandler = null;
let actionButtonUnbinds = [];
let dismissible = true;
const VALID_VARIANTS = new Set(['normal', 'ditto', 'penalty', 'choice']);
const VALID_ACTION_VARIANTS = new Set(['primary', 'secondary', 'danger']);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeMessage(title, message) {
  const safeTitle = String(title || '').trim();
  const safeMessage = String(message || '').trim();
  if (!safeTitle || !safeMessage) return safeMessage;

  const prefixedTitle = new RegExp(`^${escapeRegExp(safeTitle)}\\s*[-:]\\s*`, 'i');
  const normalized = safeMessage.replace(prefixedTitle, '').trim();
  return normalized || safeMessage;
}

function resolveVariant(variant) {
  const normalized = String(variant || '').trim().toLowerCase();
  return VALID_VARIANTS.has(normalized) ? normalized : 'normal';
}

function resolveActionVariant(variant) {
  const normalized = String(variant || '').trim().toLowerCase();
  return VALID_ACTION_VARIANTS.has(normalized) ? normalized : 'primary';
}

function normalizeActions(actions) {
  if (!Array.isArray(actions)) return [];

  return actions
    .map((action, index) => {
      if (!action || typeof action !== 'object') return null;

      const id = String(action.id ?? `action_${index + 1}`).trim();
      const label = String(action.label ?? '').trim();
      if (!id || !label) return null;

      return {
        id,
        label,
        variant: resolveActionVariant(action.variant),
        closeOnSelect: action.closeOnSelect !== false
      };
    })
    .filter(Boolean);
}

function refs() {
  const modal = document.getElementById(IDS.modal);
  if (!modal) return {};

  return {
    modal,
    panel: modal.querySelector(IDS.panel),
    titleEl: modal.querySelector(IDS.title),
    messageEl: modal.querySelector(IDS.message),
    actionsEl: modal.querySelector(IDS.actions),
    closeTopEl: modal.querySelector(IDS.closeTop),
    closeBottomEl: modal.querySelector(IDS.closeBottom)
  };
}

function isOpen(modal) {
  return Boolean(modal?.classList.contains('is-open'));
}

function setOpen(modal, open) {
  if (!modal) return;
  const currentlyOpen = isOpen(modal);
  if (currentlyOpen === open) return;

  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');

  if (open) lockModalScroll();
  else unlockModalScroll();
}

function clearActionButtons(actionsEl) {
  actionButtonUnbinds.forEach(unbind => {
    try {
      if (typeof unbind === 'function') unbind();
    } catch (err) {
      console.error('Card action modal button cleanup failed.', err);
    }
  });
  actionButtonUnbinds = [];

  if (actionsEl) actionsEl.innerHTML = '';
}

function toggleActionButtonsDisabled(actionsEl, disabled) {
  if (!actionsEl) return;
  actionsEl.querySelectorAll('button').forEach((btn) => {
    btn.disabled = disabled;
  });
}

function closeModal(restoreFocus = true) {
  const { modal, actionsEl } = refs();
  if (!modal || !isOpen(modal)) return;

  if (restoreFocus && returnFocusEl && typeof returnFocusEl.focus === 'function') {
    returnFocusEl.focus();
  }

  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement && modal.contains(activeEl)) {
    activeEl.blur();
  }

  setOpen(modal, false);
  clearActionButtons(actionsEl);

  const handler = closeHandler;
  closeHandler = null;
  actionHandler = null;
  dismissible = true;
  if (typeof handler === 'function') {
    try {
      handler();
    } catch (err) {
      console.error('Card action modal close handler failed.', err);
    }
  }

  returnFocusEl = null;
}

export function initCardActionModal() {
  if (initialized) return;

  const { modal } = refs();
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    const target = e.target;
    if (!dismissible) return;
    if (target && target.closest && target.closest('[data-close-card-action]')) {
      closeModal(true);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen(modal) && dismissible) {
      closeModal(true);
    }
  });

  initialized = true;
}

export function showCardActionModal({
  title = 'Card Action',
  message = '',
  fallbackMessage = 'Check Card History for details.',
  variant = 'normal',
  dismissible: canDismiss = true,
  actions = [],
  closeLabel = 'Close',
  onClose = null,
  onAction = null
} = {}) {
  initCardActionModal();

  const {
    modal,
    panel,
    titleEl,
    messageEl,
    actionsEl,
    closeTopEl,
    closeBottomEl
  } = refs();
  if (!modal || !panel || !messageEl || !actionsEl) return;

  const safeTitle = String(title || '').trim() || 'Card Action';
  const fallback = String(fallbackMessage || '').trim();
  const fromHistory = getLastHistoryEntry();
  const resolvedMessage = String(message || fromHistory || fallback).trim();
  const finalMessage = normalizeMessage(safeTitle, resolvedMessage);
  const finalVariant = resolveVariant(variant);
  const normalizedActions = normalizeActions(actions);
  const safeCloseLabel = String(closeLabel || 'Close').trim() || 'Close';

  if (titleEl) titleEl.textContent = safeTitle;
  messageEl.textContent = finalMessage || fallback;
  modal.dataset.variant = finalVariant;

  dismissible = Boolean(canDismiss);
  closeHandler = typeof onClose === 'function' ? onClose : null;
  actionHandler = typeof onAction === 'function' ? onAction : null;

  const showCloseButtons = dismissible;
  [closeTopEl, closeBottomEl].forEach((btn) => {
    if (!btn) return;
    btn.hidden = !showCloseButtons;
    btn.disabled = !showCloseButtons;
  });
  if (closeBottomEl) closeBottomEl.textContent = safeCloseLabel;

  clearActionButtons(actionsEl);
  if (normalizedActions.length > 0) {
    actionsEl.hidden = false;

    normalizedActions.forEach((action, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card-action__button card-action__button--option';
      button.dataset.variant = action.variant;
      button.dataset.actionId = action.id;
      button.textContent = action.label;
      actionsEl.appendChild(button);

      const unbind = bindTap(button, async () => {
        if (button.disabled) return;

        toggleActionButtonsDisabled(actionsEl, true);

        let keepOpen = false;
        try {
          if (typeof actionHandler === 'function') {
            const result = await actionHandler(action, index);
            if (result === false) keepOpen = true;
          }
        } catch (err) {
          keepOpen = true;
          console.error('Card action modal option handler failed.', err);
        }

        if (keepOpen || action.closeOnSelect === false) {
          toggleActionButtonsDisabled(actionsEl, false);
          return;
        }

        closeModal(false);
      });

      actionButtonUnbinds.push(unbind);
    });
  } else {
    actionsEl.hidden = true;
  }

  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement && !modal.contains(activeEl)) {
    returnFocusEl = activeEl;
  } else if (!returnFocusEl || (returnFocusEl instanceof HTMLElement && modal.contains(returnFocusEl))) {
    returnFocusEl = null;
  }
  setOpen(modal, true);
  panel.focus();
}

export function closeCardActionModal() {
  closeModal(true);
}

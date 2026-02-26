import { getLastHistoryEntry } from '../cardHistory.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';

const IDS = {
  modal: 'card-action-modal',
  panel: '.modal__panel',
  title: '#card-action-title',
  message: '#card-action-message'
};

let initialized = false;
let returnFocusEl = null;
let closeHandler = null;
const VALID_VARIANTS = new Set(['normal', 'ditto', 'penalty']);

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

function refs() {
  const modal = document.getElementById(IDS.modal);
  if (!modal) return {};

  return {
    modal,
    panel: modal.querySelector(IDS.panel),
    titleEl: modal.querySelector(IDS.title),
    messageEl: modal.querySelector(IDS.message)
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

function closeModal(restoreFocus = true) {
  const { modal } = refs();
  if (!modal || !isOpen(modal)) return;

  if (restoreFocus && returnFocusEl && typeof returnFocusEl.focus === 'function') {
    returnFocusEl.focus();
  }

  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement && modal.contains(activeEl)) {
    activeEl.blur();
  }

  setOpen(modal, false);

  const handler = closeHandler;
  closeHandler = null;
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
    if (target && target.closest && target.closest('[data-close-card-action]')) {
      closeModal(true);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen(modal)) {
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
  onClose = null
} = {}) {
  initCardActionModal();

  const { modal, panel, titleEl, messageEl } = refs();
  if (!modal || !panel || !messageEl) return;

  const safeTitle = String(title || '').trim() || 'Card Action';
  const fallback = String(fallbackMessage || '').trim();
  const fromHistory = getLastHistoryEntry();
  const resolvedMessage = String(message || fromHistory || fallback).trim();
  const finalMessage = normalizeMessage(safeTitle, resolvedMessage);
  const finalVariant = resolveVariant(variant);

  if (titleEl) titleEl.textContent = safeTitle;
  messageEl.textContent = finalMessage || fallback;
  modal.dataset.variant = finalVariant;

  closeHandler = typeof onClose === 'function' ? onClose : null;
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

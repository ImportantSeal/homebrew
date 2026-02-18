import { getLastHistoryEntry } from '../cardHistory.js';

const IDS = {
  modal: 'card-action-modal',
  panel: '.modal__panel',
  title: '#card-action-title',
  message: '#card-action-message'
};

let initialized = false;
let returnFocusEl = null;
let closeHandler = null;

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
  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function closeModal(restoreFocus = true) {
  const { modal } = refs();
  if (!modal || !isOpen(modal)) return;

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

  if (restoreFocus && returnFocusEl && typeof returnFocusEl.focus === 'function') {
    returnFocusEl.focus();
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
  onClose = null
} = {}) {
  initCardActionModal();

  const { modal, panel, titleEl, messageEl } = refs();
  if (!modal || !panel || !messageEl) return;

  const fallback = String(fallbackMessage || '').trim();
  const fromHistory = getLastHistoryEntry();
  const finalMessage = String(message || fromHistory || fallback).trim();

  if (titleEl) titleEl.textContent = title;
  messageEl.textContent = finalMessage || fallback;

  closeHandler = typeof onClose === 'function' ? onClose : null;
  returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  setOpen(modal, true);
  panel.focus();
}

export function closeCardActionModal() {
  closeModal(true);
}

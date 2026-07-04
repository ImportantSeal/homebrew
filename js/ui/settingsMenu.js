import { bindTap } from '../utils/tap.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';

const DEFAULTS = {
  toggleId: 'settings-toggle',
  modalId: 'settings-modal',
  panelSelector: '.modal__panel',
  closeSelector: '[data-close-settings]',
  toolSelector: '[data-settings-tool]'
};

let initialized = false;

function isElement(value) {
  return value instanceof HTMLElement;
}

function getRefs(config = DEFAULTS) {
  const modal = document.getElementById(config.modalId);
  return {
    toggleBtn: document.getElementById(config.toggleId),
    modal,
    panel: modal?.querySelector(config.panelSelector) || null
  };
}

function isMenuOpen(modal) {
  return Boolean(modal?.classList.contains('is-open'));
}

function openMenu(config = DEFAULTS, { focusPanel = true } = {}) {
  const { toggleBtn, modal, panel } = getRefs(config);
  if (!toggleBtn || !modal) return false;

  if (!isMenuOpen(modal)) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    lockModalScroll();
  }

  if (focusPanel) {
    panel?.focus?.();
  }

  return true;
}

function closeMenu(config = DEFAULTS, { restoreFocus = true } = {}) {
  const { toggleBtn, modal } = getRefs(config);
  if (!toggleBtn || !modal || !isMenuOpen(modal)) return false;

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  toggleBtn.setAttribute('aria-expanded', 'false');
  unlockModalScroll();

  if (restoreFocus) {
    toggleBtn.focus();
  }

  return true;
}

export function openGameMenu(options = {}) {
  return openMenu(DEFAULTS, options);
}

export function initSettingsMenu(options = {}) {
  if (initialized) return;

  const config = { ...DEFAULTS, ...(options || {}) };
  const { toggleBtn, modal } = getRefs(config);
  if (!toggleBtn || !modal) return;

  const boundTools = new WeakSet();

  function isOpen() {
    return isMenuOpen(modal);
  }

  function open() {
    openMenu(config);
  }

  function close({ restoreFocus = true } = {}) {
    closeMenu(config, { restoreFocus });
  }

  function bindTool(tool) {
    if (!isElement(tool) || boundTools.has(tool)) return;
    boundTools.add(tool);

    bindTap(tool, () => {
      close({ restoreFocus: true });
    }, { capture: true });
  }

  function bindTools(root = modal) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll(config.toolSelector).forEach(bindTool);
  }

  bindTap(toggleBtn, () => {
    if (isOpen()) close();
    else open();
  });

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest(config.closeSelector)) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      close();
    }
  });

  bindTools();

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!node) return;
          if (isElement(node) && node.matches?.(config.toolSelector)) {
            bindTool(node);
          }
          bindTools(node);
        });
      });
    });
    observer.observe(modal, { childList: true, subtree: true });
  }

  initialized = true;
}

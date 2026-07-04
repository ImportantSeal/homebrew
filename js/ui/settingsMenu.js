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

export function initSettingsMenu(options = {}) {
  if (initialized) return;

  const config = { ...DEFAULTS, ...(options || {}) };
  const toggleBtn = document.getElementById(config.toggleId);
  const modal = document.getElementById(config.modalId);
  if (!toggleBtn || !modal) return;

  const panel = modal.querySelector(config.panelSelector);
  const boundTools = new WeakSet();

  function isOpen() {
    return modal.classList.contains('is-open');
  }

  function open() {
    if (isOpen()) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    lockModalScroll();
    panel?.focus?.();
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen()) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    unlockModalScroll();

    if (restoreFocus) {
      toggleBtn.focus();
    }
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

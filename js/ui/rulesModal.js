// js/ui/rulesModal.js
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';

export function initRulesModal() {
  const toggleBtn = document.getElementById('rules-toggle');
  const modal = document.getElementById('rules-modal');
  if (!toggleBtn || !modal) return;

  const panel = modal.querySelector('.modal__panel');

  const open = () => {
    if (modal.classList.contains('is-open')) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    lockModalScroll();
    panel?.focus?.();
  };

  const close = () => {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    unlockModalScroll();
    toggleBtn.focus();
  };

  toggleBtn.addEventListener('click', () => {
    const isOpen = modal.classList.contains('is-open');
    if (isOpen) close();
    else open();
  });

  // Sulje backdropista tai X-napista
  modal.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.closest && target.closest('[data-close]')) {
      close();
    }
  });

  // Sulje Escillä
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      close();
    }
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function append(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
}

function buildCardActionModal(document) {
  const modal = document.createElement('div');
  modal.id = 'card-action-modal';
  modal.className = 'modal modal--card-action';
  modal.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'modal__backdrop';
  backdrop.setAttribute('data-close-card-action', '');

  const panel = document.createElement('div');
  panel.className = 'modal__panel';
  panel.setAttribute('tabindex', '-1');

  const header = document.createElement('div');
  header.className = 'modal__header';

  const title = document.createElement('h2');
  title.id = 'card-action-title';

  const closeTop = document.createElement('button');
  closeTop.id = 'card-action-close-top';
  closeTop.setAttribute('data-close-card-action', '');

  const body = document.createElement('div');
  body.className = 'modal__body';

  const message = document.createElement('div');
  message.id = 'card-action-message';
  message.className = 'card-action__message';

  const actions = document.createElement('div');
  actions.id = 'card-action-actions';
  actions.className = 'card-action__actions';

  const closeBottom = document.createElement('button');
  closeBottom.id = 'card-action-close-bottom';
  closeBottom.setAttribute('data-close-card-action', '');

  append(header, title, closeTop);
  append(body, message, actions, closeBottom);
  append(panel, header, body);
  append(modal, backdrop, panel);
  document.body.appendChild(modal);

  return { modal, title, message, actions };
}

test('effect player selection opens a menu and returns the selected player', async () => {
  const dom = installDom();

  try {
    const refs = buildCardActionModal(dom.document);
    const { enablePlayerNameSelection } = await importFresh('../js/ui/effectSelectionUi.js', import.meta.url);

    const picks = [];
    enablePlayerNameSelection(
      {
        currentPlayerIndex: 0,
        players: [
          { name: 'A', color: '#EE6868' },
          { name: 'B', color: '#68ABEE' },
          { name: 'C', color: '#68EEAB' }
        ]
      },
      (targetIndex, cleanup) => {
        cleanup();
        picks.push(targetIndex);
      },
      {
        title: 'Target Effect',
        message: 'Choose now.'
      }
    );

    assert.equal(refs.modal.classList.contains('is-open'), true);
    assert.equal(refs.title.textContent, 'Target Effect');
    assert.equal(refs.message.textContent, 'Choose now.');

    const buttons = refs.actions.querySelectorAll('.card-action__button--option');
    assert.deepEqual(buttons.map((button) => button.textContent), ['A', 'B', 'C']);
    assert.equal(buttons[1].classList.contains('card-action__button--player'), true);
    assert.equal(
      buttons[1].querySelector('.player-name-token')?.style.getPropertyValue('--player-color'),
      '#68ABEE'
    );

    dom.click(buttons[1]);
    await dom.flush();

    assert.deepEqual(picks, [1]);
    assert.equal(refs.modal.classList.contains('is-open'), false);
  } finally {
    dom.cleanup();
  }
});

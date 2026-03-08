import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function append(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
  return parent;
}

function buildSetupDom(document) {
  const setupContainer = document.createElement('section');
  setupContainer.id = 'setup-container';

  const playerInput = document.createElement('input');
  playerInput.id = 'player-input';

  const addPlayerButton = document.createElement('button');
  addPlayerButton.id = 'add-player-button';

  const playerList = document.createElement('ul');
  playerList.id = 'player-list';

  const includeItemsCheckbox = document.createElement('input');
  includeItemsCheckbox.id = 'include-items-checkbox';
  includeItemsCheckbox.checked = true;

  const includeItemsMenuToggle = document.createElement('button');
  includeItemsMenuToggle.id = 'include-items-menu-toggle';
  includeItemsMenuToggle.setAttribute('aria-expanded', 'false');

  const itemsInfoMenu = document.createElement('div');
  itemsInfoMenu.id = 'items-info-menu';
  itemsInfoMenu.hidden = true;

  const startGameButton = document.createElement('button');
  startGameButton.id = 'start-game-button';
  startGameButton.disabled = true;

  append(
    document.body,
    setupContainer,
    playerInput,
    addPlayerButton,
    playerList,
    includeItemsCheckbox,
    includeItemsMenuToggle,
    itemsInfoMenu,
    startGameButton
  );

  return {
    setupContainer,
    playerInput,
    addPlayerButton,
    playerList,
    includeItemsCheckbox,
    includeItemsMenuToggle,
    itemsInfoMenu,
    startGameButton
  };
}

test('initSetup handles player entry, items menu toggling, and game start DOM state', async () => {
  const dom = installDom();

  try {
    const { initSetup } = await importFresh('../js/setup.js', import.meta.url);
    const refs = buildSetupDom(dom.document);
    const state = { players: [], includeItems: true };
    let startCount = 0;

    initSetup({
      state,
      startGame: () => {
        startCount += 1;
      }
    });

    assert.equal(state.includeItems, false);
    assert.equal(refs.includeItemsCheckbox.checked, false);

    refs.playerInput.value = 'Alice';
    dom.click(refs.addPlayerButton);
    assert.equal(state.players.length, 1);
    assert.equal(refs.playerList.childElementCount, 1);
    assert.equal(refs.playerList.firstElementChild.textContent, 'Alice');
    assert.ok(state.players[0].color);
    assert.equal(refs.startGameButton.disabled, true);

    refs.playerInput.value = 'Alice';
    dom.click(refs.addPlayerButton);
    assert.equal(state.players.length, 1);

    refs.playerInput.value = 'Bob';
    dom.keydown(refs.playerInput, 'Enter');
    assert.equal(state.players.length, 2);
    assert.equal(refs.playerList.childElementCount, 2);
    assert.equal(refs.playerList.lastElementChild.textContent, 'Bob');
    assert.equal(refs.startGameButton.disabled, false);

    dom.click(refs.includeItemsMenuToggle);
    assert.equal(refs.itemsInfoMenu.hidden, false);
    assert.equal(refs.includeItemsMenuToggle.getAttribute('aria-expanded'), 'true');

    refs.includeItemsMenuToggle.focus();
    dom.keydown(dom.document, 'Escape');
    assert.equal(refs.itemsInfoMenu.hidden, true);
    assert.equal(refs.includeItemsMenuToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(dom.document.activeElement, refs.includeItemsMenuToggle);

    dom.click(refs.includeItemsMenuToggle);
    assert.equal(refs.itemsInfoMenu.hidden, false);

    const outside = dom.document.createElement('button');
    dom.document.body.appendChild(outside);
    dom.click(outside);
    assert.equal(refs.itemsInfoMenu.hidden, true);

    refs.includeItemsCheckbox.checked = true;
    dom.click(refs.startGameButton);

    assert.equal(startCount, 1);
    assert.equal(state.includeItems, true);
    assert.equal(refs.setupContainer.style.display, 'none');
  } finally {
    dom.cleanup();
  }
});

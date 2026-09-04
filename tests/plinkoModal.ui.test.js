import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function append(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
  return parent;
}

function buildHistoryDom(document) {
  const section = document.createElement('section');
  section.className = 'history-section';

  const history = document.createElement('div');
  history.id = 'card-history';
  section.appendChild(history);
  document.body.appendChild(section);
}

function buildPlinkoModalDom(document) {
  const toggle = document.createElement('button');
  toggle.id = 'plinko-toggle';
  toggle.setAttribute('aria-expanded', 'false');

  const modal = document.createElement('div');
  modal.id = 'plinko-modal';
  modal.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'modal__panel';

  const back = document.createElement('button');
  back.setAttribute('data-back-menu', '');

  const close = document.createElement('button');
  close.setAttribute('data-close-plinko', '');

  const cardRule = document.createElement('section');
  cardRule.id = 'plinko-card-rule';
  cardRule.hidden = true;

  const cardName = document.createElement('strong');
  cardName.setAttribute('data-plinko-card-name', '');

  const cardInstruction = document.createElement('p');
  cardInstruction.setAttribute('data-plinko-card-instruction', '');

  const target = document.createElement('label');
  target.setAttribute('data-plinko-target', '');
  target.hidden = true;

  const targetSelect = document.createElement('select');
  targetSelect.setAttribute('data-plinko-target-select', '');
  target.appendChild(targetSelect);
  append(cardRule, cardName, cardInstruction, target);

  const board = document.createElement('div');
  board.id = 'plinko-board';

  const drop = document.createElement('button');
  drop.id = 'plinko-drop';

  const result = document.createElement('div');
  result.id = 'plinko-result';

  const summary = document.createElement('div');
  summary.id = 'plinko-summary';
  ['total', 'drinks', 'gives', 'shots'].forEach((key) => {
    const value = document.createElement('strong');
    value.setAttribute(`data-plinko-${key}`, '');
    summary.appendChild(value);
  });

  append(panel, back, close, cardRule, board, drop, result, summary);
  modal.appendChild(panel);
  append(document.body, toggle, modal);

  return {
    toggle,
    modal,
    close,
    cardRule,
    cardName,
    drop,
    result,
    summary
  };
}

function createMatterStub(document) {
  let nextBodyId = 1;
  const engines = [];

  function createBody(options = {}) {
    return {
      id: nextBodyId++,
      label: options.label || '',
      plugin: { ...(options.plugin || {}) },
      ...options
    };
  }

  function listenersFor(target) {
    if (!target.__matterListeners) target.__matterListeners = new Map();
    return target.__matterListeners;
  }

  const Matter = {
    Bodies: {
      rectangle: (_x, _y, _width, _height, options) => createBody(options),
      circle: (_x, _y, _radius, options) => createBody(options)
    },
    Composite: {
      add(world, bodies) {
        world.bodies.push(...(Array.isArray(bodies) ? bodies : [bodies]));
      },
      remove(world, body) {
        world.bodies = world.bodies.filter((candidate) => candidate !== body);
      },
      clear(world) {
        world.bodies = [];
      }
    },
    Engine: {
      create(options = {}) {
        const engine = { ...options, world: { bodies: [] } };
        engines.push(engine);
        return engine;
      },
      clear() {}
    },
    Events: {
      on(target, type, listener) {
        const listeners = listenersFor(target);
        const entries = listeners.get(type) || [];
        entries.push(listener);
        listeners.set(type, entries);
      },
      off(target, type, listener) {
        const listeners = listenersFor(target);
        const entries = listeners.get(type) || [];
        listeners.set(type, entries.filter((entry) => entry !== listener));
      }
    },
    Render: {
      create({ element, engine }) {
        const canvas = document.createElement('canvas');
        element.appendChild(canvas);
        return { engine, canvas, textures: {} };
      },
      run() {},
      stop() {}
    },
    Runner: {
      create: () => ({}),
      run() {},
      stop() {}
    }
  };

  return {
    Matter,
    resolveLatestBall(slotIndex = 0) {
      const engine = engines.at(-1);
      const ball = engine?.world?.bodies.find((body) => body.label === 'plinko-ball');
      const sensor = engine?.world?.bodies.find(
        (body) => body.plugin?.plinkoSlotIndex === slotIndex
      );
      const collisionHandlers = engine?.__matterListeners?.get('collisionStart') || [];

      assert.ok(ball, 'expected a dropped Plinko ball');
      assert.ok(sensor, `expected Plinko sensor ${slotIndex}`);
      assert.ok(collisionHandlers.length > 0, 'expected a Plinko collision handler');

      collisionHandlers.forEach((handler) => {
        handler({ pairs: [{ bodyA: ball, bodyB: sensor }] });
      });
    }
  };
}

function createState() {
  return {
    players: [{ name: 'Alice' }, { name: 'Bob' }],
    currentPlayerIndex: 0,
    cardHistory: [],
    historyEntryCount: 0
  };
}

function activateCardPlinko(dom, onComplete) {
  dom.window.dispatchEvent(new CustomEvent('plinko-card-activated', {
    detail: {
      name: 'One Drop',
      instruction: 'Drop exactly one ball.',
      playerName: 'Alice',
      playerCount: 2,
      players: [{ index: 0, name: 'Alice' }, { index: 1, name: 'Bob' }],
      playerIndex: 0,
      mode: 'one',
      dropLimit: 1,
      onComplete
    }
  }));
}

async function createHarness() {
  const dom = installDom();
  const previousMatter = globalThis.Matter;

  dom.window.setTimeout = setTimeout;
  dom.window.clearTimeout = clearTimeout;

  buildHistoryDom(dom.document);
  const refs = buildPlinkoModalDom(dom.document);
  const matter = createMatterStub(dom.document);
  globalThis.Matter = matter.Matter;

  const { initPlinkoModal } = await importFresh('../js/ui/plinkoModal.js', import.meta.url);
  await initPlinkoModal({ state: createState() });

  return {
    dom,
    refs,
    matter,
    cleanup() {
      if (previousMatter === undefined) delete globalThis.Matter;
      else globalThis.Matter = previousMatter;
      dom.cleanup();
    }
  };
}

test('closing card Plinko before a result keeps the card pending for reopening', async () => {
  const harness = await createHarness();
  const { dom, refs } = harness;
  let completionCount = 0;

  try {
    activateCardPlinko(dom, () => {
      completionCount += 1;
    });

    dom.click(refs.toggle);
    assert.equal(refs.cardRule.hidden, false);
    assert.equal(refs.cardName.textContent, 'One Drop');

    dom.click(refs.close);
    assert.equal(refs.modal.classList.contains('is-open'), false);
    assert.equal(completionCount, 0);

    dom.click(refs.toggle);
    assert.equal(refs.modal.classList.contains('is-open'), true);
    assert.equal(refs.cardRule.hidden, false);
    assert.equal(refs.cardName.textContent, 'One Drop');

    dom.click(refs.close);
    assert.equal(completionCount, 0);
  } finally {
    harness.cleanup();
  }
});

test('resolved card Plinko completes its turn exactly once when closed', async () => {
  const harness = await createHarness();
  const { dom, refs, matter } = harness;
  let completionCount = 0;

  try {
    activateCardPlinko(dom, () => {
      completionCount += 1;
    });

    dom.click(refs.toggle);
    dom.click(refs.drop);
    matter.resolveLatestBall();

    assert.equal(completionCount, 0);
    assert.equal(refs.summary.querySelector('[data-plinko-total]').textContent, '1');

    dom.click(refs.close);
    assert.equal(completionCount, 1);

    dom.click(refs.close);
    dom.keydown(dom.document, 'Escape');
    assert.equal(completionCount, 1);
  } finally {
    harness.cleanup();
  }
});

test('a later generic Plinko session does not reuse card completion', async () => {
  const harness = await createHarness();
  const { dom, refs, matter } = harness;
  let completionCount = 0;

  try {
    activateCardPlinko(dom, () => {
      completionCount += 1;
    });

    dom.click(refs.toggle);
    dom.click(refs.drop);
    matter.resolveLatestBall();
    dom.click(refs.close);
    assert.equal(completionCount, 1);

    dom.click(refs.toggle);
    assert.equal(refs.cardRule.hidden, true);
    dom.click(refs.drop);
    matter.resolveLatestBall();
    dom.click(refs.close);

    assert.equal(completionCount, 1);
  } finally {
    harness.cleanup();
  }
});

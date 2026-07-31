import { addHistoryEntry } from '../cardHistory.js';
import { bindTap } from '../utils/tap.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';
import { openGameMenu } from './settingsMenu.js';

const MATTER_ASSET_URL = new URL('../matter.min.js', import.meta.url).href;
let matterLoadPromise = null;
let Bodies;
let Composite;
let Engine;
let Events;
let Render;
let Runner;

function loadMatter() {
  if (globalThis.Matter) return Promise.resolve(globalThis.Matter);
  if (matterLoadPromise) return matterLoadPromise;

  matterLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = MATTER_ASSET_URL;
    script.async = true;
    script.addEventListener('load', () => {
      if (globalThis.Matter) resolve(globalThis.Matter);
      else reject(new Error('Matter.js loaded without exposing the Matter API'));
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Matter.js')), { once: true });
    document.head.appendChild(script);
  });

  return matterLoadPromise;
}

function assignMatter(matter) {
  ({ Bodies, Composite, Engine, Events, Render, Runner } = matter);
}

export const PLINKO_SLOTS = [
  { id: 'give-shot-left', label: 'Give a shot', shots: 1 },
  { id: 'give-4-drink-1-left', label: 'Give 4 and drink 1', give: 4, drink: 1 },
  { id: 'give-3-drink-1-left', label: 'Give 3 and drink 1', give: 3, drink: 1 },
  { id: 'give-2-drink-1-left', label: 'Give 2 and drink 1', give: 2, drink: 1 },
  { id: 'give-1-drink-1-left', label: 'Give 1 and drink 1', give: 1, drink: 1 },
  { id: 'drink-1-left', label: 'Drink 1', drink: 1 },
  { id: 'drink-2', label: 'Drink 2', drink: 2 },
  { id: 'drink-1-right', label: 'Drink 1', drink: 1 },
  { id: 'give-1-drink-1-right', label: 'Give 1 and drink 1', give: 1, drink: 1 },
  { id: 'give-2-drink-1-right', label: 'Give 2 and drink 1', give: 2, drink: 1 },
  { id: 'give-3-drink-1-right', label: 'Give 3 and drink 1', give: 3, drink: 1 },
  { id: 'give-4-drink-1-right', label: 'Give 4 and drink 1', give: 4, drink: 1 },
  { id: 'give-shot-right', label: 'Give a shot', shots: 1 }
];

const WIDTH = 780;
const HEIGHT = 650;
const SLOT_WIDTH = 60;
const BOARD_LEFT = (WIDTH - SLOT_WIDTH * PLINKO_SLOTS.length) / 2;
const SLOT_TOP = 455;
const FLOOR_Y = 640;
const BALL_RADIUS = 10;
const PEG_RADIUS = 6;
const ROW_COUNT = 12;
const ROW_GAP = 30;
const PEG_GAP = 58;
const BALL_LABEL = 'plinko-ball';
const RESULT_DELAY_MS = 450;

let initialized = false;
let runtime = null;
const activeBalls = new Set();
const resolvedBallIds = new Set();
const removalTimers = new Map();
let sessionSummary = { total: 0, drinks: 0, gives: 0, shots: 0 };
let returnFocusEl = null;
let pendingCardRule = null;
let activeCardRule = null;
let sessionPlayerName = 'Someone';
let dropsStarted = 0;
let outcomes = [];
let selectedOutcomeIndex = 0;

function refs() {
  const modal = document.getElementById('plinko-modal');
  return {
    toggle: document.getElementById('plinko-toggle'),
    modal,
    panel: modal?.querySelector('.modal__panel') || null,
    back: modal?.querySelector('[data-back-menu]') || null,
    board: document.getElementById('plinko-board'),
    drop: document.getElementById('plinko-drop'),
    result: document.getElementById('plinko-result'),
    summary: document.getElementById('plinko-summary'),
    cardRule: document.getElementById('plinko-card-rule'),
    outcomes: document.getElementById('plinko-outcomes')
  };
}

function createBoard(engine) {
  const bodies = [];
  const staticStyle = { fillStyle: '#b8f7ee', strokeStyle: '#ffffff', lineWidth: 1 };
  const wallStyle = { fillStyle: '#34415d', strokeStyle: '#8191b3', lineWidth: 1 };
  const pegOptions = { isStatic: true, restitution: 0.55, friction: 0, render: staticStyle };

  bodies.push(
    Bodies.rectangle(BOARD_LEFT - 8, HEIGHT / 2, 16, HEIGHT, { isStatic: true, render: wallStyle }),
    Bodies.rectangle(WIDTH - BOARD_LEFT + 8, HEIGHT / 2, 16, HEIGHT, { isStatic: true, render: wallStyle }),
    Bodies.rectangle(WIDTH / 2, FLOOR_Y + 8, SLOT_WIDTH * PLINKO_SLOTS.length + 16, 16, { isStatic: true, restitution: 0, render: wallStyle })
  );

  for (let row = 0; row < ROW_COUNT; row += 1) {
    const count = row % 2 === 0 ? 13 : 12;
    const startX = WIDTH / 2 - ((count - 1) * PEG_GAP) / 2;
    const y = 82 + row * ROW_GAP;
    for (let column = 0; column < count; column += 1) {
      bodies.push(Bodies.circle(startX + column * PEG_GAP, y, PEG_RADIUS, pegOptions));
    }
  }

  for (let index = 0; index <= PLINKO_SLOTS.length; index += 1) {
    const x = BOARD_LEFT + index * SLOT_WIDTH;
    bodies.push(Bodies.rectangle(x, (SLOT_TOP + FLOOR_Y) / 2, 5, FLOOR_Y - SLOT_TOP, {
      isStatic: true,
      restitution: 0.05,
      friction: 0.1,
      render: wallStyle
    }));
  }

  PLINKO_SLOTS.forEach((slot, index) => {
    const sensor = Bodies.rectangle(BOARD_LEFT + (index + 0.5) * SLOT_WIDTH, FLOOR_Y - 18, SLOT_WIDTH - 7, 22, {
      isStatic: true,
      isSensor: true,
      label: `plinko-slot-${slot.id}`,
      render: { visible: false }
    });
    sensor.plugin.plinkoSlotIndex = index;
    sensor.plugin.plinkoSlotId = slot.id;
    bodies.push(sensor);
  });

  Composite.add(engine.world, bodies);
}

function drawSlotLabels(event) {
  const context = event.source.context;
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '800 13px Montserrat, sans-serif';
  PLINKO_SLOTS.forEach((slot, index) => {
    const x = BOARD_LEFT + (index + 0.5) * SLOT_WIDTH;
    context.fillStyle = index === 6 ? '#ffe09a' : '#edf4ff';
    const lines = slot.label.split(/\s+/);
    const lineHeight = 17;
    const startY = SLOT_TOP + 17;
    lines.forEach((line, lineIndex) => {
      context.fillText(line, x, startY + lineIndex * lineHeight, SLOT_WIDTH - 8);
    });
  });
  context.restore();
}

function resolveCollision(event, state) {
  for (const pair of event.pairs) {
    const ball = pair.bodyA.label === BALL_LABEL ? pair.bodyA : pair.bodyB.label === BALL_LABEL ? pair.bodyB : null;
    const sensor = ball === pair.bodyA ? pair.bodyB : ball === pair.bodyB ? pair.bodyA : null;
    const index = sensor?.plugin?.plinkoSlotIndex;
    if (!ball || !activeBalls.has(ball) || resolvedBallIds.has(ball.id)) continue;
    if (!Number.isInteger(index)) continue;

    const reward = PLINKO_SLOTS[index];
    resolvedBallIds.add(ball.id);
    ball.isSleeping = true;
    const drinks = (reward.drink || 0) * (activeCardRule?.drinkMultiplier || 1);
    const gives = (reward.give || 0) * (activeCardRule?.giveMultiplier || 1);
    outcomes.push({ label: reward.label, drinks, gives, shots: reward.shots || 0 });
    recomputeSummary();
    renderOutcomes();
    if (refs().result) {
      const modifier = activeCardRule?.giveMultiplier > 1
        ? ` (Give ${gives})`
        : activeCardRule?.drinkMultiplier > 1 ? ` (Drink ${drinks})` : '';
      refs().result.textContent = `${reward.label}${modifier}`;
    }
    const timer = window.setTimeout(() => {
      if (runtime) Composite.remove(runtime.engine.world, ball);
      activeBalls.delete(ball);
      resolvedBallIds.delete(ball.id);
      removalTimers.delete(ball.id);
    }, RESULT_DELAY_MS);
    removalTimers.set(ball.id, timer);
  }
}

function renderSummary() {
  const { summary } = refs();
  if (!summary) return;
  const values = {
    total: sessionSummary.total,
    drinks: sessionSummary.drinks,
    gives: sessionSummary.gives,
    shots: sessionSummary.shots
  };
  Object.entries(values).forEach(([key, value]) => {
    const target = summary.querySelector(`[data-plinko-${key}]`);
    if (target) target.textContent = String(value);
  });
}

function resetSummary() {
  sessionSummary = { total: 0, drinks: 0, gives: 0, shots: 0 };
  outcomes = [];
  dropsStarted = 0;
  selectedOutcomeIndex = 0;
  renderSummary();
  renderOutcomes();
}

function includedOutcomeIndexes() {
  if (activeCardRule?.mode === 'choose-one') return new Set([selectedOutcomeIndex]);
  if (activeCardRule?.mode === 'double-or-nothing' && outcomes.length > 1) {
    return new Set(outcomes.map((_, index) => index).filter((index) => index > 0));
  }
  return new Set(outcomes.map((_, index) => index));
}

function recomputeSummary() {
  const included = includedOutcomeIndexes();
  sessionSummary = outcomes.reduce((summary, outcome, index) => {
    if (included.has(index)) {
      summary.drinks += outcome.drinks;
      summary.gives += outcome.gives;
      summary.shots += outcome.shots;
    }
    return summary;
  }, { total: outcomes.length, drinks: 0, gives: 0, shots: 0 });
  renderSummary();
}

function logSummary(state) {
  if (sessionSummary.total < 1) return;
  const card = activeCardRule?.name ? ` [${activeCardRule.name}]` : '';
  const targetSelect = refs().cardRule?.querySelector('[data-plinko-target-select]');
  const targetName = targetSelect?.selectedOptions?.[0]?.textContent || '';
  const target = targetName
    ? activeCardRule?.mode === 'shared' ? `, shared with ${targetName}` : `, performed by ${targetName}`
    : '';
  addHistoryEntry(state, `${sessionPlayerName} played Plinko${card}${target}: ${sessionSummary.total} drops, Drink ${sessionSummary.drinks}, Give ${sessionSummary.gives}, Give a shot ${sessionSummary.shots}`);
}

function renderOutcomes() {
  const { outcomes: container } = refs();
  if (!container) return;
  container.replaceChildren();
  const included = includedOutcomeIndexes();
  outcomes.forEach((outcome, index) => {
    const chip = document.createElement(activeCardRule?.mode === 'choose-one' ? 'button' : 'span');
    chip.className = 'plinko-outcome';
    chip.textContent = `${index + 1}. ${outcome.label}`;
    chip.classList.toggle('is-counted', included.has(index));
    if (chip instanceof HTMLButtonElement) {
      chip.type = 'button';
      chip.addEventListener('click', () => {
        selectedOutcomeIndex = index;
        recomputeSummary();
        renderOutcomes();
      });
    }
    container.appendChild(chip);
  });
}

function renderCardRule() {
  const { cardRule, drop } = refs();
  if (!cardRule) return;
  cardRule.hidden = !activeCardRule;
  if (activeCardRule) {
    const name = cardRule.querySelector('[data-plinko-card-name]');
    const instruction = cardRule.querySelector('[data-plinko-card-instruction]');
    if (name) name.textContent = activeCardRule.name;
    if (instruction) instruction.textContent = activeCardRule.instruction;
  }
  const targetField = cardRule.querySelector('[data-plinko-target]');
  const targetSelect = cardRule.querySelector('[data-plinko-target-select]');
  const needsTarget = activeCardRule?.mode === 'target' || activeCardRule?.mode === 'shared';
  if (targetField) targetField.hidden = !needsTarget;
  if (targetSelect) {
    targetSelect.replaceChildren();
    (activeCardRule?.players || [])
      .filter((player) => player.index !== activeCardRule?.playerIndex)
      .forEach((player) => {
        const option = document.createElement('option');
        option.value = String(player.index);
        option.textContent = player.name;
        targetSelect.appendChild(option);
      });
  }
  if (drop) drop.textContent = activeCardRule?.mode === 'ball-storm' ? 'Drop all' : 'Drop';
}

function dropLimit() {
  if (!activeCardRule) return Infinity;
  if (activeCardRule.mode === 'ball-storm') return Math.max(1, Number(activeCardRule.playerCount) || 1);
  return Number.isFinite(activeCardRule.dropLimit) ? activeCardRule.dropLimit : Infinity;
}

function syncDropButton() {
  const { drop } = refs();
  if (drop) drop.disabled = dropsStarted >= dropLimit();
}

function createRuntime(state) {
  const { board } = refs();
  if (!board || runtime) return;
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
  createBoard(engine);
  const render = Render.create({
    element: board,
    engine,
    options: { width: WIDTH, height: HEIGHT, wireframes: false, background: 'transparent', pixelRatio: Math.min(window.devicePixelRatio || 1, 2) }
  });
  const runner = Runner.create();
  const collisionHandler = (event) => resolveCollision(event, state);
  Events.on(engine, 'collisionStart', collisionHandler);
  Events.on(render, 'afterRender', drawSlotLabels);
  Render.run(render);
  Runner.run(runner, engine);
  runtime = { engine, render, runner, collisionHandler };
}

function destroyRuntime() {
  removalTimers.forEach((timer) => window.clearTimeout(timer));
  removalTimers.clear();
  if (runtime) {
    Events.off(runtime.engine, 'collisionStart', runtime.collisionHandler);
    Events.off(runtime.render, 'afterRender', drawSlotLabels);
    Runner.stop(runtime.runner);
    Render.stop(runtime.render);
    Composite.clear(runtime.engine.world, false, true);
    Engine.clear(runtime.engine);
    runtime.render.canvas.remove();
    runtime.render.textures = {};
  }
  runtime = null;
  activeBalls.clear();
  resolvedBallIds.clear();
}

function dropBall() {
  const { result } = refs();
  if (!runtime || dropsStarted >= dropLimit()) return;
  const batchSize = activeCardRule?.mode === 'ball-storm' ? dropLimit() - dropsStarted : 1;
  for (let batchIndex = 0; batchIndex < batchSize; batchIndex += 1) {
    const startX = WIDTH / 2 + (Math.random() * 8 - 4);
    const ball = Bodies.circle(startX, 45 - batchIndex * (BALL_RADIUS * 2 + 3), BALL_RADIUS, {
      restitution: 0.45,
      friction: 0.001,
      frictionAir: 0.0015,
      density: 0.004,
      label: BALL_LABEL,
      render: { fillStyle: '#ff4fd8', strokeStyle: '#ffffff', lineWidth: 2 }
    });
    activeBalls.add(ball);
    Composite.add(runtime.engine.world, ball);
    dropsStarted += 1;
  }
  syncDropButton();
  if (result) result.textContent = `${activeBalls.size} ball${activeBalls.size === 1 ? '' : 's'} falling...`;
}

function openModal(state) {
  const { modal, panel, toggle, drop, result } = refs();
  if (!modal || !toggle || modal.classList.contains('is-open')) return;
  returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  toggle.setAttribute('aria-expanded', 'true');
  lockModalScroll();
  activeCardRule = pendingCardRule;
  pendingCardRule = null;
  sessionPlayerName = activeCardRule?.playerName
    || state.players?.[state.currentPlayerIndex]?.name
    || 'Someone';
  if (drop) drop.disabled = false;
  if (result) result.textContent = 'Ready';
  resetSummary();
  renderCardRule();
  syncDropButton();
  createRuntime(state);
  panel?.focus?.();
}

function closeModal(state, restoreFocus = true) {
  const { modal, toggle } = refs();
  if (!modal?.classList.contains('is-open')) return;
  logSummary(state);
  destroyRuntime();
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  toggle?.setAttribute('aria-expanded', 'false');
  unlockModalScroll();
  if (restoreFocus) (returnFocusEl || toggle)?.focus?.();
  returnFocusEl = null;
  activeCardRule = null;
}

export async function initPlinkoModal({ state } = {}) {
  if (initialized || !state) return;
  assignMatter(await loadMatter());
  const { modal, toggle, back, drop } = refs();
  if (!modal || !toggle) return;
  bindTap(toggle, () => openModal(state));
  bindTap(back, () => { closeModal(state, false); openGameMenu(); });
  bindTap(drop, dropBall);
  modal.addEventListener('click', (event) => {
    if (event.target?.closest?.('[data-close-plinko]')) closeModal(state, true);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal(state, true);
  });
  window.addEventListener('plinko-card-activated', (event) => {
    pendingCardRule = event.detail && typeof event.detail === 'object' ? { ...event.detail } : null;
  });
  initialized = true;
}

// Development-only, headless physical simulation. It deliberately uses the same
// board, start position, ball properties and collision sensors as the live game.
export async function simulatePlinkoDrops(dropCount = 1000) {
  if (!Number.isInteger(dropCount) || dropCount < 1) throw new RangeError('dropCount must be a positive integer');
  if (!Engine) assignMatter(await loadMatter());
  const counts = Array(PLINKO_SLOTS.length).fill(0);
  for (let drop = 0; drop < dropCount; drop += 1) {
    const engine = Engine.create();
    createBoard(engine);
    const ball = Bodies.circle(WIDTH / 2 + (Math.random() * 8 - 4), 45, BALL_RADIUS, {
      restitution: 0.45, friction: 0.001, frictionAir: 0.0015, density: 0.004, label: BALL_LABEL
    });
    Composite.add(engine.world, ball);
    let landed = -1;
    const onCollision = (event) => {
      event.pairs.forEach((pair) => {
        const other = pair.bodyA === ball ? pair.bodyB : pair.bodyB === ball ? pair.bodyA : null;
        if (Number.isInteger(other?.plugin?.plinkoSlotIndex)) landed = other.plugin.plinkoSlotIndex;
      });
    };
    Events.on(engine, 'collisionStart', onCollision);
    for (let step = 0; step < 1200 && landed < 0; step += 1) Engine.update(engine, 1000 / 60);
    Events.off(engine, 'collisionStart', onCollision);
    if (landed >= 0) counts[landed] += 1;
    Engine.clear(engine);
    if (drop % 50 === 49) await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  }
  return Object.fromEntries(PLINKO_SLOTS.map((slot, index) => [slot.id, counts[index]]));
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.simulatePlinkoDrops = simulatePlinkoDrops;
}

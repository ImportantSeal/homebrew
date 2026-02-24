import { state } from '../state.js';
import { CARD_KIND_LABELS, CARD_KIND_ORDER, STATS_UPDATED_EVENT, getStatsSnapshot } from '../stats.js';
import { bindTap } from '../utils/tap.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';
import { applyPlayerColor, ensurePlayerColors, getPlayerColorByName, setPlayerColoredText } from '../utils/playerColors.js';

const IDS = {
  toggle: 'stats-toggle',
  modal: 'stats-modal',
  panel: '.modal__panel',
  board: 'stats-board',
  empty: 'stats-empty'
};

let initialized = false;
let returnFocusEl = null;

function refs() {
  const modal = document.getElementById(IDS.modal);
  return {
    toggleBtn: document.getElementById(IDS.toggle),
    modal,
    panel: modal?.querySelector(IDS.panel) || null,
    board: document.getElementById(IDS.board),
    empty: document.getElementById(IDS.empty)
  };
}

function isModalOpen(modal) {
  return Boolean(modal?.classList.contains('is-open'));
}

function setModalOpen(modal, toggleBtn, open) {
  if (!modal) return;
  const currentlyOpen = isModalOpen(modal);
  if (currentlyOpen === open) return;

  modal.classList.toggle('is-open', open);
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');

  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (open) lockModalScroll();
  else unlockModalScroll();
}

function formatValue(value) {
  return Number(value || 0).toLocaleString('fi-FI');
}

function createMetric(label, value, variant = '') {
  const metric = document.createElement('div');
  metric.className = 'stats-metric';
  if (variant) metric.classList.add(`stats-metric--${variant}`);

  const metricLabel = document.createElement('span');
  metricLabel.className = 'stats-metric__label';
  metricLabel.textContent = label;

  const metricValue = document.createElement('strong');
  metricValue.className = 'stats-metric__value';
  metricValue.textContent = formatValue(value);

  metric.append(metricLabel, metricValue);
  return metric;
}

function topKinds(kindCounts, limit = 4) {
  return CARD_KIND_ORDER
    .map((kind) => ({
      kind,
      label: CARD_KIND_LABELS[kind] || kind,
      count: Number(kindCounts?.[kind] || 0)
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function resolveLeader(snapshot, key) {
  const leaders = [];
  let bestValue = 0;

  snapshot.forEach((entry) => {
    const value = Number(entry?.[key] || 0);
    if (value <= 0) return;

    if (value > bestValue) {
      bestValue = value;
      leaders.length = 0;
      leaders.push(String(entry.playerName || ''));
      return;
    }

    if (value === bestValue) {
      leaders.push(String(entry.playerName || ''));
    }
  });

  if (!leaders.length || bestValue <= 0) return null;
  return {
    playerNames: leaders,
    value: bestValue
  };
}

function resolveTopGlobalKind(snapshot) {
  const totals = {};
  CARD_KIND_ORDER.forEach((kind) => {
    totals[kind] = 0;
  });

  snapshot.forEach((entry) => {
    CARD_KIND_ORDER.forEach((kind) => {
      totals[kind] += Number(entry.kindCounts?.[kind] || 0);
    });
  });

  const topKinds = [];
  let topCount = 0;
  CARD_KIND_ORDER.forEach((kind) => {
    const count = totals[kind];
    if (count > topCount) {
      topKinds.length = 0;
      topKinds.push(kind);
      topCount = count;
      return;
    }

    if (count > 0 && count === topCount) {
      topKinds.push(kind);
    }
  });

  if (!topKinds.length || topCount <= 0) return null;
  return {
    labels: topKinds.map((kind) => CARD_KIND_LABELS[kind] || kind),
    count: topCount
  };
}

function joinLeaderNames(playerNames = []) {
  return playerNames.filter(Boolean).join(', ');
}

function joinKindLabels(labels = []) {
  return labels.filter(Boolean).join(', ');
}

function createSummary(snapshot) {
  const summary = document.createElement('section');
  summary.className = 'stats-summary';

  const title = document.createElement('h3');
  title.textContent = 'Game Leaders';
  summary.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'stats-summary__grid';

  const topKind = resolveTopGlobalKind(snapshot);
  const drinkLeader = resolveLeader(snapshot, 'drinksTaken');
  const giveLeader = resolveLeader(snapshot, 'drinksGiven');
  const penaltyLeader = resolveLeader(snapshot, 'penaltiesTaken');
  const mysteryLeader = resolveLeader(snapshot, 'mysteryCardsSelected');

  const summaryItems = [
    {
      label: 'Most picked type',
      text: topKind ? `${joinKindLabels(topKind.labels)} (${formatValue(topKind.count)})` : '-'
    },
    {
      label: 'Most drinks taken',
      text: drinkLeader ? `${joinLeaderNames(drinkLeader.playerNames)} (${formatValue(drinkLeader.value)})` : '-'
    },
    {
      label: 'Most drinks given',
      text: giveLeader ? `${joinLeaderNames(giveLeader.playerNames)} (${formatValue(giveLeader.value)})` : '-'
    },
    {
      label: 'Most penalties',
      text: penaltyLeader ? `${joinLeaderNames(penaltyLeader.playerNames)} (${formatValue(penaltyLeader.value)})` : '-'
    },
    {
      label: 'Most mystery picks',
      text: mysteryLeader ? `${joinLeaderNames(mysteryLeader.playerNames)} (${formatValue(mysteryLeader.value)})` : '-'
    }
  ];

  summaryItems.forEach((item) => {
    const cell = document.createElement('article');
    cell.className = 'stats-summary__item';

    const label = document.createElement('span');
    label.className = 'stats-summary__label';
    label.textContent = item.label;

    const value = document.createElement('strong');
    value.className = 'stats-summary__value';
    setPlayerColoredText(value, item.text, state.players);

    cell.append(label, value);
    grid.appendChild(cell);
  });

  summary.appendChild(grid);
  return summary;
}

function createPlayerCard(entry, playerIndex = 0) {
  const card = document.createElement('article');
  card.className = 'stats-player';

  const header = document.createElement('header');
  header.className = 'stats-player__header';

  const identity = document.createElement('div');
  identity.className = 'stats-player__identity';

  const rank = document.createElement('span');
  rank.className = 'stats-player__rank';
  rank.textContent = `#${playerIndex + 1}`;

  const color = getPlayerColorByName(state.players, entry.playerName);
  const name = document.createElement('h3');
  name.className = 'stats-player__name player-name-token';
  name.textContent = entry.playerName;
  applyPlayerColor(name, color);

  const picked = document.createElement('span');
  picked.className = 'stats-player__picked';
  picked.textContent = `${formatValue(entry.cardsSelected)} cards`;

  identity.append(rank, name);
  header.append(identity, picked);

  const metrics = document.createElement('div');
  metrics.className = 'stats-player__metrics';
  metrics.append(
    createMetric('Drinks taken', entry.drinksTaken, 'taken'),
    createMetric('Drinks given', entry.drinksGiven, 'given'),
    createMetric('Mystery picks', entry.mysteryCardsSelected, 'mystery'),
    createMetric('Penalties', entry.penaltiesTaken, 'penalty')
  );

  const allKinds = topKinds(entry.kindCounts, CARD_KIND_ORDER.length);
  const highestKindCount = allKinds[0]?.count || 0;
  const topKindLabels = allKinds
    .filter((kindEntry) => kindEntry.count === highestKindCount)
    .map((kindEntry) => kindEntry.label);
  const topKindText = highestKindCount > 0
    ? `${joinKindLabels(topKindLabels)} (${formatValue(highestKindCount)})`
    : 'No picks yet';

  const topKind = document.createElement('p');
  topKind.className = 'stats-player__top-kind';
  topKind.textContent = `Most picked type: ${topKindText}`;

  const kindWrap = document.createElement('div');
  kindWrap.className = 'stats-player__kinds';

  const kinds = topKinds(entry.kindCounts, 5);
  if (kinds.length === 0) {
    const emptyChip = document.createElement('span');
    emptyChip.className = 'stats-kind stats-kind--empty';
    emptyChip.textContent = 'No card stats yet';
    kindWrap.appendChild(emptyChip);
  } else {
    kinds.forEach((kindEntry) => {
      const chip = document.createElement('span');
      chip.className = 'stats-kind';
      chip.textContent = `${kindEntry.label}: ${formatValue(kindEntry.count)}`;
      kindWrap.appendChild(chip);
    });
  }

  card.append(header, metrics, topKind, kindWrap);
  return card;
}

function renderStats() {
  const { board, empty } = refs();
  if (!board || !empty) return;

  ensurePlayerColors(state.players);
  const snapshot = getStatsSnapshot(state);
  board.innerHTML = '';

  if (!snapshot.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  board.appendChild(createSummary(snapshot));
  snapshot.forEach((entry, index) => {
    board.appendChild(createPlayerCard(entry, index));
  });
}

function openModal() {
  const { modal, panel, toggleBtn } = refs();
  if (!modal) return;

  returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  setModalOpen(modal, toggleBtn, true);
  renderStats();
  panel?.focus?.();
}

function closeModal(restoreFocus = true) {
  const { modal, toggleBtn } = refs();
  if (!modal) return;

  setModalOpen(modal, toggleBtn, false);

  if (restoreFocus && returnFocusEl && typeof returnFocusEl.focus === 'function') {
    returnFocusEl.focus();
  }
  returnFocusEl = null;
}

export function refreshStatsModal() {
  const { modal } = refs();
  if (!isModalOpen(modal)) return;
  renderStats();
}

export function initStatsModal() {
  if (initialized) return;

  const { modal, toggleBtn } = refs();
  if (!modal || !toggleBtn) return;

  bindTap(toggleBtn, () => {
    if (isModalOpen(modal)) {
      closeModal(true);
    } else {
      openModal();
    }
  });

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('[data-close-stats]')) {
      closeModal(true);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen(modal)) {
      closeModal(true);
    }
  });

  document.addEventListener(STATS_UPDATED_EVENT, () => {
    refreshStatsModal();
  });

  initialized = true;
}

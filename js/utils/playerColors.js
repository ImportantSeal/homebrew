const PLAYER_COLOR_PALETTE = [
  '#56D7FF',
  '#FF8F70',
  '#92F27D',
  '#FFC66B',
  '#D39BFF',
  '#7EF0D0',
  '#FF7FCF',
  '#7FD6A3',
  '#FFB0E2',
  '#A7C4FF',
  '#8FE39A',
  '#F7DE6A'
];

const NAME_CHAR_RE = /[0-9A-Za-z\u00C0-\u024F]/;

function trimText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hashText(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function colorFromName(name, index = 0) {
  const normalizedName = trimText(name).toLowerCase();
  const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  const key = normalizedName || `player-${safeIndex + 1}`;
  const hash = hashText(key) + (safeIndex * 17);
  return PLAYER_COLOR_PALETTE[Math.abs(hash) % PLAYER_COLOR_PALETTE.length];
}

function isBoundaryChar(char) {
  return !char || !NAME_CHAR_RE.test(char);
}

function hasNameBoundaries(text, start, end) {
  const prevChar = start > 0 ? text.charAt(start - 1) : '';
  const nextChar = end < text.length ? text.charAt(end) : '';
  return isBoundaryChar(prevChar) && isBoundaryChar(nextChar);
}

function getUniquePlayerNames(players = []) {
  if (!Array.isArray(players)) return [];

  const seen = new Set();
  return players
    .map((player, index) => {
      const name = trimText(player?.name);
      if (!name) return null;

      const lookupKey = name.toLowerCase();
      if (seen.has(lookupKey)) return null;
      seen.add(lookupKey);

      return {
        name,
        nameLower: name.toLowerCase(),
        color: ensurePlayerColor(player, index),
        index
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.name.length - a.name.length);
}

export function ensurePlayerColor(player, index = 0) {
  if (!player || typeof player !== 'object') return colorFromName('', index);

  const existingColor = trimText(player.color);
  if (existingColor) return existingColor;

  const color = colorFromName(player.name, index);
  player.color = color;
  return color;
}

export function ensurePlayerColors(players = []) {
  if (!Array.isArray(players)) return [];
  return players.map((player, index) => ensurePlayerColor(player, index));
}

export function getPlayerColorByIndex(players = [], playerIndex = 0) {
  if (!Array.isArray(players) || players.length === 0) {
    return colorFromName('', playerIndex);
  }

  const safeIndex = Number(playerIndex);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= players.length) {
    return colorFromName('', safeIndex);
  }

  return ensurePlayerColor(players[safeIndex], safeIndex);
}

export function findPlayerIndexByName(players = [], playerName = '') {
  const target = trimText(playerName);
  if (!target || !Array.isArray(players)) return -1;

  const exact = players.findIndex((player) => trimText(player?.name) === target);
  if (exact >= 0) return exact;

  const lowered = target.toLowerCase();
  return players.findIndex((player) => trimText(player?.name).toLowerCase() === lowered);
}

export function getPlayerColorByName(players = [], playerName = '') {
  const index = findPlayerIndexByName(players, playerName);
  if (index < 0) return null;
  return getPlayerColorByIndex(players, index);
}

export function applyPlayerColor(element, color) {
  if (!element || !element.style) return;

  const safeColor = trimText(color);
  if (!safeColor) {
    element.style.removeProperty('--player-color');
    return;
  }

  element.style.setProperty('--player-color', safeColor);
}

export function setPlayerColoredText(element, text, players = []) {
  if (!element) return;

  const source = String(text ?? '');
  const playerNames = getUniquePlayerNames(players);

  element.textContent = '';
  if (!source) return;
  if (!playerNames.length) {
    element.textContent = source;
    return;
  }

  const lowerSource = source.toLowerCase();
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let plainStart = 0;

  while (cursor < source.length) {
    let match = null;

    for (const entry of playerNames) {
      if (!lowerSource.startsWith(entry.nameLower, cursor)) continue;

      const end = cursor + entry.name.length;
      if (!hasNameBoundaries(source, cursor, end)) continue;

      match = entry;
      break;
    }

    if (!match) {
      cursor += 1;
      continue;
    }

    if (cursor > plainStart) {
      fragment.appendChild(document.createTextNode(source.slice(plainStart, cursor)));
    }

    const matchEnd = cursor + match.name.length;
    const matchedText = source.slice(cursor, matchEnd);
    const chip = document.createElement('span');
    chip.className = 'player-name-token';
    chip.textContent = matchedText;
    chip.dataset.playerIndex = String(match.index);
    applyPlayerColor(chip, match.color);
    fragment.appendChild(chip);

    cursor = matchEnd;
    plainStart = matchEnd;
  }

  if (plainStart < source.length) {
    fragment.appendChild(document.createTextNode(source.slice(plainStart)));
  }
  element.appendChild(fragment);
}

const PLAYER_COLOR_PALETTE = [
  '#EE6868',
  '#EEAB68',
  '#EEEE68',
  '#ABEE68',
  '#68EE68',
  '#68EEAB',
  '#68EEEE',
  '#68ABEE',
  '#6868EE',
  '#AB68EE',
  '#EE68EE',
  '#EE68AB'
];

const PLAYER_COLOR_MIN_DISTANCE = 60;
const NAME_CHAR_RE = /[0-9A-Za-z\u00C0-\u024F]/;
const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

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

function normalizeHexColor(color) {
  const value = trimText(color);
  if (!HEX_COLOR_RE.test(value)) return '';

  if (value.length === 4) {
    const r = value.charAt(1);
    const g = value.charAt(2);
    const b = value.charAt(3);
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return value.toUpperCase();
}

function hexToRgb(color) {
  const normalized = normalizeHexColor(color);
  if (!normalized) return null;

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;

  return { r, g, b };
}

function colorDistance(colorA, colorB) {
  if (!colorA || !colorB) return 0;
  const dr = colorA.r - colorB.r;
  const dg = colorA.g - colorB.g;
  const db = colorA.b - colorB.b;
  return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
}

function shuffle(values = []) {
  const next = Array.isArray(values) ? [...values] : [];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function collectUsedColors(players = [], excludedPlayer = null) {
  if (!Array.isArray(players)) return [];

  const seen = new Set();
  const used = [];
  for (const player of players) {
    if (!player || typeof player !== 'object' || player === excludedPlayer) continue;
    const color = normalizeHexColor(player.color);
    if (!color || seen.has(color)) continue;
    seen.add(color);
    used.push(color);
  }
  return used;
}

function pickRandomDistinctColor(usedColors = []) {
  const palette = shuffle(PLAYER_COLOR_PALETTE.map((color) => normalizeHexColor(color)).filter(Boolean));
  if (!palette.length) return colorFromName('');

  const usedSet = new Set(usedColors.map((color) => normalizeHexColor(color)).filter(Boolean));
  const usedRgb = [...usedSet].map((color) => hexToRgb(color)).filter(Boolean);
  const available = palette.filter((color) => !usedSet.has(color));
  const candidates = available.length ? available : palette;

  for (const candidate of candidates) {
    const rgb = hexToRgb(candidate);
    if (!rgb) continue;
    const tooClose = usedRgb.some((used) => colorDistance(rgb, used) < PLAYER_COLOR_MIN_DISTANCE);
    if (!tooClose) return candidate;
  }

  let bestColor = candidates[0];
  let bestDistance = -1;
  for (const candidate of candidates) {
    const rgb = hexToRgb(candidate);
    if (!rgb) continue;

    const minDistance = usedRgb.length
      ? Math.min(...usedRgb.map((used) => colorDistance(rgb, used)))
      : Number.POSITIVE_INFINITY;

    if (minDistance > bestDistance) {
      bestDistance = minDistance;
      bestColor = candidate;
    }
  }

  return bestColor || palette[0];
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
        color: ensurePlayerColor(player, index, players),
        index
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.name.length - a.name.length);
}

export function ensurePlayerColor(player, index = 0, players = []) {
  if (!player || typeof player !== 'object') return colorFromName('', index);

  const existingColor = trimText(player.color);
  if (existingColor) {
    const normalized = normalizeHexColor(existingColor);
    if (normalized && normalized !== existingColor) player.color = normalized;
    return normalized || existingColor;
  }

  const usedColors = collectUsedColors(players, player);
  const color = pickRandomDistinctColor(usedColors);
  player.color = color;
  return color;
}

export function ensurePlayerColors(players = []) {
  if (!Array.isArray(players)) return [];
  return players.map((player, index) => ensurePlayerColor(player, index, players));
}

export function getPlayerColorByIndex(players = [], playerIndex = 0) {
  if (!Array.isArray(players) || players.length === 0) {
    return colorFromName('', playerIndex);
  }

  const safeIndex = Number(playerIndex);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= players.length) {
    return colorFromName('', safeIndex);
  }

  return ensurePlayerColor(players[safeIndex], safeIndex, players);
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

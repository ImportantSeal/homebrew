import { getPlayerColorByIndex } from '../../utils/playerColors.js';

function getPlayers(state) {
  return Array.isArray(state?.players) ? state.players : [];
}

export function inventoryCount(player) {
  return Array.isArray(player?.inventory) ? player.inventory.length : 0;
}

export function totalOtherItems(state, selfIndex) {
  return getPlayers(state).reduce((sum, player, idx) => {
    if (idx === selfIndex) return sum;
    return sum + inventoryCount(player);
  }, 0);
}

export function maxItemsAnyPlayer(state) {
  return Math.max(0, ...getPlayers(state).map((player) => inventoryCount(player)));
}

function normalizeChoiceText(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeChoiceOptions(options) {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      if (!option || typeof option !== 'object') return null;

      const id = normalizeChoiceText(option.id, `choice_${index + 1}`);
      const label = normalizeChoiceText(option.label, '');
      if (!label) return null;
      if (typeof option.run !== 'function') return null;

      return {
        id,
        label,
        variant: normalizeChoiceText(option.variant, 'primary').toLowerCase(),
        playerColor: normalizeChoiceText(option.playerColor, ''),
        run: option.run
      };
    })
    .filter(Boolean);
}

export function createChoiceAction({
  key = '',
  title = 'Choose One',
  message = 'Choose one option to continue.',
  variant = 'choice',
  options = []
} = {}) {
  const normalizedOptions = normalizeChoiceOptions(options);
  if (normalizedOptions.length === 0) return null;

  return {
    type: 'choice',
    key: normalizeChoiceText(key, ''),
    title: normalizeChoiceText(title, 'Choose One'),
    message: normalizeChoiceText(message, 'Choose one option to continue.'),
    variant: normalizeChoiceText(variant, 'choice').toLowerCase(),
    options: normalizedOptions
  };
}

export function applyEveryoneDrink(state, amount, reason, log, applyDrinkEvent) {
  if (!Array.isArray(state?.players) || typeof applyDrinkEvent !== 'function') return;

  state.players.forEach((_, idx) => {
    applyDrinkEvent(state, idx, amount, reason, log, { suppressSelfLog: true });
  });
}

export function applyEveryoneElseDrink(state, selfIndex, amount, reason, log, applyDrinkEvent) {
  if (!Array.isArray(state?.players) || typeof applyDrinkEvent !== 'function') return;

  state.players.forEach((_, idx) => {
    if (idx === selfIndex) return;
    applyDrinkEvent(state, idx, amount, reason, log, { suppressSelfLog: true });
  });
}

export function ensureInventory(player) {
  if (!player || typeof player !== 'object') return [];
  if (!Array.isArray(player.inventory)) player.inventory = [];
  return player.inventory;
}

export function createTargetPlayerChoiceAction({
  key = 'TARGET_PICK',
  title = 'Pick a Player',
  message = 'Pick one player to continue.',
  state,
  optionVariant = 'danger',
  onPick
} = {}) {
  const players = getPlayers(state);
  const options = players
    .map((player, idx) => ({
      idx,
      name: normalizeChoiceText(player?.name, `Player ${idx + 1}`),
      color: getPlayerColorByIndex(players, idx)
    }))
    .map(({ idx, name, color }) => ({
      id: `target_${idx}`,
      label: name,
      variant: optionVariant,
      playerColor: color,
      run: (context) => {
        if (typeof onPick !== 'function') return {};
        const result = onPick(context, idx, name);
        return result && typeof result === 'object' ? result : {};
      }
    }));

  if (options.length === 0) return null;

  return createChoiceAction({
    key,
    title,
    message,
    variant: 'choice',
    options
  });
}

export function runSpecialChoiceAction(choiceAction, optionId, context) {
  if (!choiceAction || choiceAction.type !== 'choice') return null;

  const options = Array.isArray(choiceAction.options) ? choiceAction.options : [];
  if (options.length === 0) return null;

  const selectedId = String(optionId ?? '').trim();
  const selected = options.find((option) => String(option.id).trim() === selectedId);
  if (!selected || typeof selected.run !== 'function') return null;

  const result = selected.run(context);
  return result && typeof result === 'object' ? result : {};
}

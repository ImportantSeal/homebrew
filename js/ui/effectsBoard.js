// js/ui/effectsBoard.js

function formatEffectTitle(effect) {
  switch (effect.type) {
    case "LEFT_HAND":
      return "Left Hand Rule";
    case "NO_NAMES":
      return "No Names";
    case "DRINK_BUDDY":
      return "Drink Buddy";
    default:
      return effect.title || "Effect";
  }
}

function formatEffectDescription(state, effect) {
  const turns = effect.remainingTurns ?? 0;

  switch (effect.type) {
    case "LEFT_HAND":
      return `Everyone drinks with left hand.`;
    case "NO_NAMES":
      return `No names allowed (first/last).`;
    case "DRINK_BUDDY": {
      const src = state.players?.[effect.sourceIndex]?.name ?? "Someone";
      const tgt = state.players?.[effect.targetIndex]?.name ?? "Someone";
      return `${tgt} drinks whenever ${src} drinks.`;
    }
    default:
      return effect.description || "";
  }
}

export function renderEffectsBoard(state) {
  const board = document.getElementById("effects-board");
  if (!board) return;

  board.innerHTML = "";

  const effects = Array.isArray(state.effects) ? state.effects : [];

  if (effects.length === 0) {
    const none = document.createElement("div");
    none.textContent = "No active effects";
    none.style.color = "rgba(234,240,255,0.75)";
    none.style.padding = "0.35rem 0.2rem";
    board.appendChild(none);
    return;
  }

  effects.forEach((effect) => {
    const row = document.createElement("div");
    row.className = "effect-row";

    const title = document.createElement("div");
    title.className = "effect-title";
    title.textContent = formatEffectTitle(effect);

    const meta = document.createElement("div");
    meta.className = "effect-meta";
    meta.textContent = formatEffectDescription(state, effect);

    const remaining = document.createElement("div");
    remaining.className = "effect-remaining";
    remaining.textContent = `${effect.remainingTurns} turn${effect.remainingTurns === 1 ? "" : "s"} left`;

    row.appendChild(title);
    row.appendChild(meta);
    row.appendChild(remaining);

    board.appendChild(row);
  });
}

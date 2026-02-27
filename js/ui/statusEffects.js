// js/ui/statusEffects.js
// Renders active timed effects + player statuses in the side panel.
import { applyPlayerColor, ensurePlayerColor, setPlayerColoredText } from '../utils/playerColors.js';
import { getEffectTitle } from '../logic/effectNames.js';

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function effectIcon(type) {
  switch (type) {
    case "LEFT_HAND": return "\u{1FAF2}";
    case "NO_NAMES": return "\u{1F910}";
    case "NO_SWEARING": return "\u{1F92C}";
    case "NO_PHONE_TOUCH": return "\u{1F4F5}";
    case "DRINK_BUDDY": return "\u{1F91D}\u{1F37B}";
    case "DITTO_MAGNET": return "\u{1F9F2}";
    case "KINGS_TAX": return "\u{1F451}";
    default: return "\u2728";
  }
}

function effectTitle(type) {
  return getEffectTitle(type, type || "Effect");
}

function effectDescription(state, eff) {
  switch (eff.type) {
    case "LEFT_HAND":
      return "Everyone must drink with their LEFT hand.";
    case "NO_NAMES": {
      const tgt = state.players?.[eff.targetIndex]?.name;
      return tgt ? `${tgt} is not allowed to say any names.` : "No names allowed.";
    }
    case "NO_SWEARING":
      return "The next player who swears drinks. Click Remove after it triggers.";
    case "NO_PHONE_TOUCH":
      return "Everyone keeps their phone away. The first touch drinks 2.";
    case "DRINK_BUDDY": {
      const src = state.players?.[eff.sourceIndex]?.name ?? "Someone";
      const tgt = state.players?.[eff.targetIndex]?.name ?? "Someone";
      return `${tgt} drinks whenever ${src} drinks.`;
    }
    case "DITTO_MAGNET": {
      const tgt = state.players?.[eff.targetIndex]?.name ?? "Someone";
      return `If Ditto triggers for ${tgt}, they take a Shot.`;
    }
    case "KINGS_TAX": {
      const king = state.players?.[eff.targetIndex]?.name;
      return king
        ? `${king} is king. Anyone who interrupts them drinks 2.`
        : "A temporary king is active. Anyone interrupting them drinks 2.";
    }
    default:
      return "An effect is active.";
  }
}

function effectAppliesTo(state, eff) {
  switch (eff.type) {
    case "LEFT_HAND":
      return "Applies to: Everyone";
    case "NO_NAMES": {
      const tgt = state.players?.[eff.targetIndex]?.name ?? "Player";
      return `Applies to: ${tgt}`;
    }
    case "NO_SWEARING":
      return "Applies to: Everyone";
    case "NO_PHONE_TOUCH":
      return "Applies to: Everyone";
    case "DRINK_BUDDY": {
      const src = state.players?.[eff.sourceIndex]?.name ?? "Someone";
      const tgt = state.players?.[eff.targetIndex]?.name ?? "Someone";
      return `Link: ${src} -> ${tgt}`;
    }
    case "DITTO_MAGNET": {
      const tgt = state.players?.[eff.targetIndex]?.name ?? "Someone";
      return `Magnetized: ${tgt}`;
    }
    case "KINGS_TAX": {
      const king = state.players?.[eff.targetIndex]?.name ?? "Player";
      return `King: ${king}`;
    }
    default:
      return "Applies to: â€”";
  }
}

function addChip(row, label, onRemove) {
  const chip = document.createElement(onRemove ? 'button' : 'span');
  if (onRemove) chip.type = 'button';
  chip.className = 'status-chip' + (onRemove ? ' is-removable' : '');

  chip.appendChild(el("span", "status-chip-label", label));

  if (onRemove) {
    const close = el("span", "status-chip-close", "Ã—");
    chip.appendChild(close);
    chip.title = "Click to remove";
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove();
    });
  }

  row.appendChild(chip);
}

function buildEffectCard(state, eff, onRemoveEffect) {
  const card = el("div", "effect-card");
  card.dataset.type = eff.type || "GENERIC";

  const left = el("div", "effect-left");
  const icon = el("div", "effect-icon", effectIcon(eff.type));
  left.appendChild(icon);

  const mid = el("div", "effect-mid");
  mid.appendChild(el("div", "effect-title", effectTitle(eff.type)));
  const desc = el("div", "effect-desc");
  setPlayerColoredText(desc, effectDescription(state, eff), state.players);
  mid.appendChild(desc);

  const applies = el("div", "effect-applies");
  setPlayerColoredText(applies, effectAppliesTo(state, eff), state.players);
  mid.appendChild(applies);

  const right = el("div", "effect-right");
  const remaining = typeof eff.remainingTurns === "number" ? eff.remainingTurns : 0;
  right.appendChild(el("div", "effect-remaining", `${remaining} turn${remaining === 1 ? "" : "s"} left`));

  if (typeof onRemoveEffect === "function") {
    const removeBtn = el("button", "effect-remove", "Remove");
    removeBtn.type = "button";
    removeBtn.title = "End this effect manually";
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemoveEffect({ effect: eff, label: effectTitle(eff.type) });
    });
    right.appendChild(removeBtn);
  }

  // Progress bar
  const total = Math.max(1, Number(eff.totalTurns || eff.remainingTurns || 1));
  const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));

  const bar = el("div", "effect-bar");
  const fill = el("span", "effect-bar-fill");
  fill.style.width = `${pct}%`;
  bar.appendChild(fill);

  if (remaining <= 2) card.classList.add("is-warning");

  card.appendChild(left);
  card.appendChild(mid);
  card.appendChild(right);
  card.appendChild(bar);

  return card;
}

export function renderStatusEffects(state, options = {}) {
  const { onRemoveEffect, onRemoveStatus } = options || {};

  const root = document.getElementById('status-effects');
  if (!root) return;

  root.innerHTML = "";

  const effects = Array.isArray(state.effects) ? state.effects.filter(e => (e?.remainingTurns ?? 0) > 0) : [];

  const hasPendingPick = !!state.effectSelection?.active;

  // --- Active Effects section ---
  if (effects.length > 0 || hasPendingPick) {
    root.appendChild(el("div", "effects-section-title", "Active effects"));

    // Pending selection hint
    if (hasPendingPick) {
      const pending = state.effectSelection?.pending;
      const pendingCard = el("div", "effect-card is-pending");
      const pendingLeft = el("div", "effect-left");
      const pendingIcon = pending?.type ? effectIcon(pending.type) : "\u{1F3AF}";
      pendingLeft.appendChild(el("div", "effect-icon", pendingIcon));
      pendingCard.appendChild(pendingLeft);

      const mid = el("div", "effect-mid");
      mid.appendChild(el("div", "effect-title", "Pick a target"));
      mid.appendChild(el("div", "effect-desc", "Click a player name in the turn order to finish this effect."));
      mid.appendChild(el("div", "effect-applies", pending?.type ? `Effect: ${effectTitle(pending.type)}` : "Effect: â€”"));
      pendingCard.appendChild(mid);

      const right = el("div", "effect-right");
      right.appendChild(el("div", "effect-remaining", "Waiting..."));
      pendingCard.appendChild(right);

      pendingCard.appendChild(el("div", "effect-bar")).appendChild(el("span", "effect-bar-fill"));
      root.appendChild(pendingCard);
    }

    effects.forEach(eff => {
      root.appendChild(buildEffectCard(state, eff, onRemoveEffect));
    });
  }

  // --- Player statuses (Shield / etc.) ---
  let anyStatuses = false;
  const statusWrap = el("div", "status-section");

  state.players.forEach((p, idx) => {
    const row = el("div", "status-row");

    const statusPlayer = el("span", "status-player player-name-token", `${p.name}:`);
    applyPlayerColor(statusPlayer, ensurePlayerColor(p, idx));
    row.appendChild(statusPlayer);

    let hasForPlayer = false;
    if (p.shield) {
      addChip(
        row,
        "ðŸ›¡ Shield",
        onRemoveStatus ? () => onRemoveStatus({ playerIndex: idx, key: "shield", label: "Shield" }) : null
      );
      hasForPlayer = true;
    }
    if (p.skipNextTurn) {
      addChip(
        row,
        "â­ Skip Next Turn",
        onRemoveStatus ? () => onRemoveStatus({ playerIndex: idx, key: "skipNextTurn", label: "Skip Next Turn" }) : null
      );
      hasForPlayer = true;
    }
    if (p.extraLife) {
      addChip(
        row,
        "â¤ï¸ Extra Life",
        onRemoveStatus ? () => onRemoveStatus({ playerIndex: idx, key: "extraLife", label: "Extra Life" }) : null
      );
      hasForPlayer = true;
    }

    if (hasForPlayer) {
      anyStatuses = true;
      statusWrap.appendChild(row);
    }
  });

  if (anyStatuses) {
    root.appendChild(el("div", "effects-section-title", "Player status"));
    root.appendChild(statusWrap);
  }

  // If nothing, keep empty so CSS hides it
  if (!root.childElementCount) root.innerHTML = "";
}

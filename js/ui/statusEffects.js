// js/ui/statusEffects.js
// Renders active timed effects + player statuses under the 3 cards.

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function effectIcon(type) {
  switch (type) {
    case "LEFT_HAND": return "🫲";
    case "NO_NAMES": return "🤐";
    case "DRINK_BUDDY": return "🤝🍻";
    default: return "✨";
  }
}

function effectTitle(type) {
  switch (type) {
    case "LEFT_HAND": return "Left Hand Rule";
    case "NO_NAMES": return "No Names";
    case "DRINK_BUDDY": return "Drink Buddy";
    default: return type || "Effect";
  }
}

function effectDescription(state, eff) {
  switch (eff.type) {
    case "LEFT_HAND":
      return "Everyone must drink with their LEFT hand.";
    case "NO_NAMES": {
      const tgt = state.players?.[eff.targetIndex]?.name;
      return tgt ? `${tgt} is not allowed to say any names.` : "No names allowed.";
    }
    case "DRINK_BUDDY": {
      const src = state.players?.[eff.sourceIndex]?.name ?? "Someone";
      const tgt = state.players?.[eff.targetIndex]?.name ?? "Someone";
      return `${tgt} drinks whenever ${src} drinks.`;
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
    case "DRINK_BUDDY": {
      const src = state.players?.[eff.sourceIndex]?.name ?? "Someone";
      const tgt = state.players?.[eff.targetIndex]?.name ?? "Someone";
      return `Link: ${src} → ${tgt}`;
    }
    default:
      return "Applies to: —";
  }
}

function addChip(row, label) {
  const chip = document.createElement('span');
  chip.className = 'status-chip';
  chip.textContent = label;
  row.appendChild(chip);
}

function buildEffectCard(state, eff) {
  const card = el("div", "effect-card");
  card.dataset.type = eff.type || "GENERIC";

  const left = el("div", "effect-left");
  const icon = el("div", "effect-icon", effectIcon(eff.type));
  left.appendChild(icon);

  const mid = el("div", "effect-mid");
  mid.appendChild(el("div", "effect-title", effectTitle(eff.type)));
  mid.appendChild(el("div", "effect-desc", effectDescription(state, eff)));
  mid.appendChild(el("div", "effect-applies", effectAppliesTo(state, eff)));

  const right = el("div", "effect-right");
  const remaining = typeof eff.remainingTurns === "number" ? eff.remainingTurns : 0;
  right.appendChild(el("div", "effect-remaining", `${remaining} turn${remaining === 1 ? "" : "s"} left`));

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

export function renderStatusEffects(state) {
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
      pendingCard.appendChild(el("div", "effect-left")).appendChild(el("div", "effect-icon", "🎯"));
      const mid = el("div", "effect-mid");
      mid.appendChild(el("div", "effect-title", "Pick a target"));
      mid.appendChild(el("div", "effect-desc", "Click a player name in the turn order to finish this effect."));
      mid.appendChild(el("div", "effect-applies", pending?.type ? `Effect: ${pending.type}` : "Effect: —"));
      pendingCard.appendChild(mid);
      const right = el("div", "effect-right");
      right.appendChild(el("div", "effect-remaining", "Waiting…"));
      pendingCard.appendChild(right);
      pendingCard.appendChild(el("div", "effect-bar")).appendChild(el("span", "effect-bar-fill"));
      root.appendChild(pendingCard);
    }

    effects.forEach(eff => {
      root.appendChild(buildEffectCard(state, eff));
    });
  }

  // --- Player statuses (Shield / Immunity / etc.) ---
  let anyStatuses = false;
  const statusWrap = el("div", "status-section");

  state.players.forEach((p) => {
    const row = el("div", "status-row");

    row.appendChild(el("span", "status-player", `${p.name}:`));

    let hasForPlayer = false;
    if (p.shield) { addChip(row, "🛡 Shield"); hasForPlayer = true; }
    if (p.immunity) { addChip(row, "🧪 Immunity"); hasForPlayer = true; }
    if (p.skipNextTurn) { addChip(row, "⏭ Skip Next Turn"); hasForPlayer = true; }
    if (p.extraLife) { addChip(row, "❤️ Extra Life"); hasForPlayer = true; }

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

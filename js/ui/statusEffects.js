// js/ui/statusEffects.js
// Renders active status flags/effects under the 3 cards.

function addChip(row, label, extra = "") {
  const chip = document.createElement('span');
  chip.className = 'status-chip';

  const t = document.createElement('span');
  t.textContent = label;
  chip.appendChild(t);

  if (extra) {
    const strong = document.createElement('strong');
    strong.textContent = ` ${extra}`;
    chip.appendChild(strong);
  }

  row.appendChild(chip);
}

function isGlobalEffect(e) {
  return e && e.scope === "all";
}

export function renderStatusEffects(state) {
  const el = document.getElementById('status-effects');
  if (!el) return;

  el.innerHTML = "";

  const effects = Array.isArray(state.effects) ? state.effects : [];

  let any = false;

  // ✅ Global effects row
  const global = effects.filter(isGlobalEffect);
  if (global.length > 0) {
    const row = document.createElement('div');
    row.className = 'status-row';

    const name = document.createElement('span');
    name.className = 'status-player';
    name.textContent = `All:`;
    row.appendChild(name);

    global.forEach(e => {
      const label = e.label || e.type || "Effect";
      const left = Number.isFinite(e.remainingTurns) ? `${e.remainingTurns}t` : "";
      addChip(row, label, left);
    });

    el.appendChild(row);
    any = true;
  }

  // ✅ Per-player rows (flags + per-player effects)
  state.players.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'status-row';

    const name = document.createElement('span');
    name.className = 'status-player';
    name.textContent = `${p.name}:`;
    row.appendChild(name);

    let has = false;

    // flags
    if (p.shield) { addChip(row, "Shield"); has = true; }
    if (p.immunity) { addChip(row, "Immunity"); has = true; }
    if (p.skipNextTurn) { addChip(row, "Skip Next Turn"); has = true; }
    if (p.extraLife) { addChip(row, "Extra Life"); has = true; }

    // timed effects (non-global)
    effects.forEach(e => {
      if (!e || isGlobalEffect(e)) return;

      const left = Number.isFinite(e.remainingTurns) ? `${e.remainingTurns}t` : "";

      if (e.type === "DRINK_BUDDY") {
        const src = state.players?.[e.sourceIndex]?.name ?? "Someone";
        const tgt = state.players?.[e.targetIndex]?.name ?? "Someone";

        if (e.sourceIndex === idx) {
          addChip(row, "Drink Buddy", `${tgt} · ${left}`);
          has = true;
        } else if (e.targetIndex === idx) {
          addChip(row, "Buddy", `${src} · ${left}`);
          has = true;
        }
      } else if (e.playerIndex === idx) {
        const label = e.label || e.type || "Effect";
        addChip(row, label, left);
        has = true;
      }
    });

    if (has) {
      el.appendChild(row);
      any = true;
    }
  });

  // hide when empty
  if (!any) el.innerHTML = "";
}

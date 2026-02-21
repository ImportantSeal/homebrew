import { bindTap } from '../utils/tap.js';

export function renderItemsBoard(state, onUseItem) {
  const board = document.getElementById('items-board');
  if (!board) return;
  board.innerHTML = '';

  state.players.forEach((player, pIndex) => {
    const row = document.createElement('div');
    row.className = 'player-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = player.name + ':';
    row.appendChild(nameSpan);

    if (!player.inventory || player.inventory.length === 0) {
      const none = document.createElement('span');
      none.textContent = ' No items';
      row.appendChild(none);
    } else {
      player.inventory.forEach((item, iIndex) => {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'item-badge clickable';
        badge.textContent = item;
        badge.title = 'Use this item';

        bindTap(badge, (e) => {
          e.stopPropagation();
          onUseItem(pIndex, iIndex);
        });

        row.appendChild(badge);
      });
    }

    board.appendChild(row);
  });
}

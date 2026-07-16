# Homebrew

Browser-based drinking game with plain HTML, CSS, and modular JavaScript.

I am very lazy with documentation. This README will probably get nicer on some bleak rainy day.

## Run

Install dependencies once:

```bash
npm install
```

Run locally with Vite:

```bash
npm run dev
```

Production preview:

```bash
npm run build
npm run preview
```

The source files are still plain HTML, CSS, and modular JavaScript. Vite is only used for local serving and production builds.

## Structure

- `index.html` - app shell and modal markup
- `js/app.js` - app entry and game data validation
- `js/setup.js` - player setup screen
- `js/state.js` - runtime state factory and reset logic
- `js/gameData.js` - cards, items, penalties, actions, effects
- `js/logic/` - deck, effects, penalties, card schemas, flow state
- `js/game/controller.js` - main game controller
- `js/game/controller/cardHandlers/` - card selection flows
- `js/ui/` - DOM rendering and UI adapters
- `vite.config.mjs` - Vite build config for GitHub Pages
- `.github/workflows/pages.yml` - GitHub Pages deploy workflow
- `tests/` - Node test suite with a lightweight DOM harness

## Build and Deploy

GitHub Pages deploys the generated `dist/` folder.

Vite bundles the app and gives production CSS/JS files content hashes, so browsers pick up new versions without manually changing cache-busting query strings.

The GitHub Pages base path is `/homebrew/`.

Do not edit `dist/` by hand. Run:

```bash
npm run build
```

## Runtime Flow

1. `js/app.js` validates configured action/effect codes.
2. Setup creates players and starts the game controller.
3. `dealTurnCards` fills `state.currentCards` with three cards.
4. `renderCards` paints those cards.
5. Card clicks route through `cardHandlers.js`.
6. Plain cards, object cards, penalties, choices, effects, and items each continue in their own small flow module.

## Card Data

Main card locations:

- Normal cards: `gameData.normalDeck`
- Penalty cards: `gameData.penaltyDeck`
- Items: `gameData.itemCards`
- Challenge cards: `gameData.socialCards`
- Crowd cards: `gameData.crowdChallenge.subcategories`
- Special cards: `gameData.special.subcategories`

Prefer structured card fields over text parsing:

```js
{
  id: "drink_3",
  type: "plain",
  name: "Drink 3",
  drink: { scope: "self", amount: 3 }
}
```

Useful plain-card fields:

- `drink: { scope: "self" | "all", amount }`
- `give: { amount }`
- `penaltyCall: "single" | "group"`

Useful object-card fields:

- `name`
- `instruction`
- `action: ACTION_CODES.SOMETHING`
- `effect: { type: EFFECT_TYPES.SOMETHING, turns, needsTarget }`
- `leaderboardTopic`

## Test One Card

Use `js/dev/testCard.js`.

Default random deck:

```js
export const testCard = null;
export const testSubcard = null;
```

Force an existing card by id or name:

```js
export const testCard = "drink_3";
export const testSubcard = null;
```

Force a new plain card:

```js
export const testCard = makeMixCard("test_mix", "Drink 2, Give 1", 2, 1);
export const testSubcard = null;
```

Force an existing Special/Crowd/Challenge subcard:

```js
export const testCard = "Special Card";
export const testSubcard = "Drink and Draw Again";
```

Paste a copied subcard directly:

```js
export const testCard = {
  name: "Drink and Draw Again",
  instruction: "Drink 1. Your turn does not pass; draw new cards.",
  action: ACTION_CODES.DRINK_AND_DRAW_AGAIN
};
export const testSubcard = null;
```

Paste an effect subcard:

```js
export const testCard = {
  name: "Left Hand Rule",
  instruction: "For the next 6 turns, everyone drinks with their LEFT hand.",
  effect: { type: EFFECT_TYPES.LEFT_HAND, turns: 6 }
};
export const testSubcard = null;
```

When test mode is active, all three cards are the forced card and no mystery card is hidden.

If random cards appear, the string did not match any known id/name. Check spelling or paste the object directly.

Always reset both exports to `null` before committing normal gameplay changes.

## Manual Card Test Checklist

1. Edit `js/dev/testCard.js`.
2. Hard refresh the browser.
3. Start a game with enough players for the card flow.
4. Confirm all three visible cards are the target card.
5. Click the card and finish every modal, choice, penalty, item, or target-pick step.
6. Check Card History and Stats for the expected side effects.
7. Redraw or advance turns to repeat the same card safely.

For action/effect cards, also run the automated tests before trusting the manual result.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run build:verify
```

Full local QA:

```bash
npm run qa
```

## Notes

- The project uses native ES modules.
- Vite is used for build output and hashed production assets.
- Tests run in Node with `node:test`.
- DOM-heavy tests use `tests/domHarness.js`.
- `build:verify` checks local imports and the built `dist` assets.
- `typecheck` validates game data contracts, not TypeScript types.

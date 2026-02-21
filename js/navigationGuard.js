const HISTORY_GUARD_KEY = '__homebrewLeaveGuard';

let guardEnabled = false;
let handlersBound = false;
let isLeavingViaBack = false;

function pushGuardState() {
  const currentState =
    window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {};

  window.history.pushState(
    { ...currentState, [HISTORY_GUARD_KEY]: true },
    document.title,
    window.location.href
  );
}

function onBeforeUnload(event) {
  if (!guardEnabled) return;

  // Most browsers ignore custom text and show their own standard warning.
  event.preventDefault();
  event.returnValue = '';
}

function onPopState() {
  if (!guardEnabled || isLeavingViaBack) return;

  const shouldLeave = window.confirm(
    'Leave the game? Your current game progress may be lost.'
  );

  if (!shouldLeave) {
    pushGuardState();
    return;
  }

  isLeavingViaBack = true;
  disableLeaveGuard();
  window.history.back();
}

function bindHandlers() {
  if (handlersBound) return;
  handlersBound = true;

  window.addEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('popstate', onPopState);
}

export function enableLeaveGuard() {
  bindHandlers();

  if (guardEnabled) return;

  guardEnabled = true;
  isLeavingViaBack = false;
  pushGuardState();
}

export function disableLeaveGuard() {
  guardEnabled = false;
}

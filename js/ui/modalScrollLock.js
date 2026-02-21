const LOCK_CLASS = 'modal-open';
const LOCK_COUNT_KEY = 'modalLockCount';

function getBody() {
  return document?.body || null;
}

function getLockCount(body) {
  const raw = body?.dataset?.[LOCK_COUNT_KEY];
  const parsed = Number.parseInt(raw || '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function setLockCount(body, count) {
  if (!body) return;
  if (count > 0) {
    body.dataset[LOCK_COUNT_KEY] = String(count);
  } else {
    delete body.dataset[LOCK_COUNT_KEY];
  }
}

export function lockModalScroll() {
  const body = getBody();
  if (!body) return;

  const nextCount = getLockCount(body) + 1;
  setLockCount(body, nextCount);
  body.classList.add(LOCK_CLASS);
}

export function unlockModalScroll() {
  const body = getBody();
  if (!body) return;

  const nextCount = Math.max(0, getLockCount(body) - 1);
  setLockCount(body, nextCount);

  if (nextCount === 0) {
    body.classList.remove(LOCK_CLASS);
  }
}

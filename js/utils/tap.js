const TOUCH_CLICK_GUARD_MS = 700;

/**
 * Bind a single "tap" interaction for both touch and click without double-firing.
 * Returns an unbind function.
 */
export function bindTap(element, handler, { capture = false } = {}) {
  if (!element || typeof handler !== "function") return () => {};

  let lastTouchAt = 0;

  const onTouchEnd = (event) => {
    lastTouchAt = Date.now();
    event.preventDefault();
    handler(event);
  };

  const onClick = (event) => {
    if (Date.now() - lastTouchAt < TOUCH_CLICK_GUARD_MS) return;
    handler(event);
  };

  element.addEventListener("touchend", onTouchEnd, { passive: false, capture });
  element.addEventListener("click", onClick, capture);

  return () => {
    element.removeEventListener("touchend", onTouchEnd, capture);
    element.removeEventListener("click", onClick, capture);
  };
}

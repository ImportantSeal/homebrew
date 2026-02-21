const TOUCH_CLICK_GUARD_MS = 700;
const TOUCH_MOVE_TOLERANCE_PX = 10;

/**
 * Bind a single "tap" interaction for both touch and click without double-firing.
 * Returns an unbind function.
 */
export function bindTap(element, handler, { capture = false } = {}) {
  if (!element || typeof handler !== "function") return () => {};

  let lastTouchAt = 0;
  let activeTouchId = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;

  const onTouchStart = (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    activeTouchId = touch.identifier;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoved = false;
  };

  const onTouchMove = (event) => {
    if (activeTouchId === null) return;

    const touches = event.changedTouches;
    if (!touches) return;

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      if (touch.identifier !== activeTouchId) continue;

      if (
        Math.abs(touch.clientX - touchStartX) > TOUCH_MOVE_TOLERANCE_PX ||
        Math.abs(touch.clientY - touchStartY) > TOUCH_MOVE_TOLERANCE_PX
      ) {
        touchMoved = true;
      }
      return;
    }
  };

  const onTouchEnd = (event) => {
    lastTouchAt = Date.now();

    if (activeTouchId === null) return;

    const touches = event.changedTouches;
    if (!touches) {
      activeTouchId = null;
      touchMoved = false;
      return;
    }

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      if (touch.identifier !== activeTouchId) continue;

      const moved =
        touchMoved ||
        Math.abs(touch.clientX - touchStartX) > TOUCH_MOVE_TOLERANCE_PX ||
        Math.abs(touch.clientY - touchStartY) > TOUCH_MOVE_TOLERANCE_PX;

      activeTouchId = null;
      touchMoved = false;

      if (moved) return;

      event.preventDefault();
      handler(event);
      return;
    }
  };

  const onTouchCancel = () => {
    activeTouchId = null;
    touchMoved = false;
  };

  const onClick = (event) => {
    if (Date.now() - lastTouchAt < TOUCH_CLICK_GUARD_MS) return;
    handler(event);
  };

  element.addEventListener("touchstart", onTouchStart, { passive: true, capture });
  element.addEventListener("touchmove", onTouchMove, { passive: true, capture });
  element.addEventListener("touchend", onTouchEnd, { passive: false, capture });
  element.addEventListener("touchcancel", onTouchCancel, { passive: true, capture });
  element.addEventListener("click", onClick, capture);

  return () => {
    element.removeEventListener("touchstart", onTouchStart, capture);
    element.removeEventListener("touchmove", onTouchMove, capture);
    element.removeEventListener("touchend", onTouchEnd, capture);
    element.removeEventListener("touchcancel", onTouchCancel, capture);
    element.removeEventListener("click", onClick, capture);
  };
}

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

  const resetTouchTracking = () => {
    activeTouchId = null;
    touchStartX = 0;
    touchStartY = 0;
    touchMoved = false;
  };

  const getActiveTouch = (event) => {
    if (activeTouchId === null) return null;

    const touches = event.changedTouches;
    if (!touches) return null;

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      if (touch.identifier === activeTouchId) return touch;
    }

    return null;
  };

  const onTouchStart = (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    activeTouchId = touch.identifier;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoved = false;
  };

  const onTouchMove = (event) => {
    const touch = getActiveTouch(event);
    if (!touch) return;

    if (
      Math.abs(touch.clientX - touchStartX) > TOUCH_MOVE_TOLERANCE_PX ||
      Math.abs(touch.clientY - touchStartY) > TOUCH_MOVE_TOLERANCE_PX
    ) {
      touchMoved = true;
    }
  };

  const onTouchEnd = (event) => {
    lastTouchAt = Date.now();
    const touch = getActiveTouch(event);
    if (!touch) {
      resetTouchTracking();
      return;
    }

    const moved =
      touchMoved ||
      Math.abs(touch.clientX - touchStartX) > TOUCH_MOVE_TOLERANCE_PX ||
      Math.abs(touch.clientY - touchStartY) > TOUCH_MOVE_TOLERANCE_PX;

    resetTouchTracking();
    if (moved) return;

    event.preventDefault();
    handler(event);
  };

  const onTouchCancel = () => resetTouchTracking();

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

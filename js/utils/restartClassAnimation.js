export function restartClassAnimation(element, className) {
  if (!element?.classList || !className) return;

  if (typeof requestAnimationFrame !== 'function') {
    element.classList.remove(className);
    element.classList.add(className);
    return;
  }

  const store = element._classAnimationRafIds instanceof Map
    ? element._classAnimationRafIds
    : new Map();

  element._classAnimationRafIds = store;

  const previousFrameId = store.get(className);
  if (previousFrameId != null) {
    cancelAnimationFrame(previousFrameId);
  }

  element.classList.remove(className);

  const frameId = requestAnimationFrame(() => {
    if (!element?.classList) return;
    element.classList.add(className);
    store.delete(className);
  });

  store.set(className, frameId);
}

export function cancelClassAnimationRestart(element, className) {
  if (!element?._classAnimationRafIds || !className) return;

  const store = element._classAnimationRafIds;
  const frameId = store.get(className);
  if (frameId != null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frameId);
  }

  store.delete(className);
}

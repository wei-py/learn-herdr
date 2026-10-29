export const POSITION_LIMIT = 80;

const overflowProperties = ['overflow', 'overflow-x', 'overflow-y'];
const readOverflow = element => overflowProperties.map(property => [
  property,
  element.style.getPropertyValue(property),
  element.style.getPropertyPriority(property),
]);
function restoreOverflow(element, declarations) {
  for (const property of overflowProperties) element.style.removeProperty(property);
  for (const [property, value, priority] of declarations) {
    if (value) element.style.setProperty(property, value, priority);
  }
}

export function createScrollManager({
  root,
  body,
  frame = callback => globalThis.requestAnimationFrame(callback),
  cancelFrame = id => globalThis.cancelAnimationFrame(id),
  reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
}) {
  const positions = new Map();
  const subscriptions = new Set();
  let lock = null;

  function remember(key) {
    positions.delete(key);
    positions.set(key, root.scrollTop);
    if (positions.size > POSITION_LIMIT) positions.delete(positions.keys().next().value);
  }
  function scrollTo(top, smooth = false) {
    root.scrollTo({ top, left: 0, behavior: smooth && !reducedMotion() ? 'smooth' : 'instant' });
  }
  function restorePosition({ top, left }) {
    root.scrollTo({ top, left, behavior: 'instant' });
  }
  function unlock() {
    if (!lock) return;
    const saved = lock;
    lock = null;
    restoreOverflow(body, saved.bodyOverflow);
    restoreOverflow(root, saved.rootOverflow);
    restorePosition(saved);
  }
  function observe(target, callback) {
    let pending = null;
    let active = true;
    const listener = () => {
      if (!active || pending !== null) return;
      pending = frame(() => {
        pending = null;
        if (active) callback(target.scrollTop);
      });
    };
    target.addEventListener('scroll', listener, { passive: true });
    const cleanup = () => {
      if (!active) return;
      active = false;
      target.removeEventListener('scroll', listener);
      if (pending !== null) cancelFrame(pending);
      pending = null;
      subscriptions.delete(cleanup);
    };
    subscriptions.add(cleanup);
    return cleanup;
  }

  return {
    remember,
    restore(key) {
      scrollTo(positions.get(key) ?? 0);
    },
    top(smooth = false) {
      scrollTo(0, smooth);
    },
    scrollTo,
    scrollToAnchor(element, { smooth = true, focus = false } = {}) {
      if (!element) return;
      const view = element.ownerDocument?.defaultView || globalThis;
      const margin = parseFloat(view.getComputedStyle(element).scrollMarginTop) || 0;
      scrollTo(root.scrollTop + element.getBoundingClientRect().top -
        root.getBoundingClientRect().top - (root.clientTop || 0) - margin, smooth);
      if (focus) element.focus({ preventScroll: true });
    },
    observe,
    setOverlay(open) {
      if (open && !lock) {
        lock = {
          top: root.scrollTop,
          left: root.scrollLeft,
          bodyOverflow: readOverflow(body),
          rootOverflow: readOverflow(root),
        };
        body.style.setProperty('overflow', 'hidden', 'important');
        root.style.setProperty('overflow', 'hidden', 'important');
        restorePosition(lock);
      } else if (!open) unlock();
    },
    preserve(updateFn) {
      const position = { top: root.scrollTop, left: root.scrollLeft };
      try {
        return updateFn();
      } finally {
        restorePosition(position);
      }
    },
    dispose() {
      unlock();
      for (const cleanup of subscriptions) cleanup();
      positions.clear();
    },
  };
}

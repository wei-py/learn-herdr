import { POSITION_LIMIT } from './scroll.js';

export function createEntryKey(random = globalThis.crypto) {
  return Array.from(random.getRandomValues(new Uint32Array(4)), value =>
    value.toString(16).padStart(8, '0')).join('');
}

function canonicalHash(hash) {
  const value = String(hash || '').replace(/^#/, '');
  const separator = value.indexOf('?');
  const path = (separator < 0 ? value : value.slice(0, separator)) || 'courses';
  if (path === 'courses') return 'courses';
  if (separator < 0) return path;
  const params = new URLSearchParams(value.slice(separator + 1));
  params.sort();
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}`;
}
const isList = hash => hash === 'courses' || hash.split('?')[0] === 'reference';
function readEntry(state, hash) {
  const entry = state?.herdrNavigation;
  return entry && /^[a-f0-9]{32}$/.test(entry.key) && entry.hash === hash ? entry : null;
}
function withEntry(state, entry) {
  return { ...(state && typeof state === 'object' && !Array.isArray(state) ? state : {}), herdrNavigation: entry };
}

export function createNavigation({
  history,
  location,
  events,
  scroll,
  renderRoute,
  beforeNavigate = () => {},
  createKey = createEntryKey,
}) {
  const rememberedEntries = new Map();
  const recentLists = new Map();
  let current = null;
  let previousRestoration;
  let started = false;
  let disposed = false;
  const currentURL = () => `${location.pathname}${location.search}${location.hash}`;
  const routeURL = hash => `${location.pathname}${location.search}#${hash}`;

  function rememberCurrent() {
    scroll.remember(current.key);
    rememberedEntries.delete(current.key);
    rememberedEntries.set(current.key, current.hash);
    if (isList(current.hash)) recentLists.set(current.hash, current.key);
    if (rememberedEntries.size > POSITION_LIMIT) {
      const [key, hash] = rememberedEntries.entries().next().value;
      rememberedEntries.delete(key);
      if (recentLists.get(hash) === key) recentLists.delete(hash);
    }
  }
  function adoptEntry() {
    const hash = canonicalHash(location.hash);
    const entry = readEntry(history.state, hash);
    if (entry) return { key: entry.key, hash };
    const adopted = { key: createKey(), hash };
    history.replaceState(withEntry(history.state, adopted), '', currentURL());
    return adopted;
  }
  function onHistoryChange() {
    if (!started || disposed) return;
    // Both events can describe the same traversal. The live entry, not the event
    // payload, also handles an external hash whose event was queued before start.
    const next = adoptEntry();
    if (next.key === current.key && next.hash === current.hash) return;
    rememberCurrent();
    beforeNavigate();
    current = next;
    renderRoute(current.hash, { restore: true });
    scroll.restore(current.key);
    rememberCurrent();
  }

  return {
    start() {
      if (started || disposed) return;
      previousRestoration = history.scrollRestoration;
      history.scrollRestoration = 'manual';
      current = adoptEntry();
      started = true;
      events.addEventListener('popstate', onHistoryChange);
      events.addEventListener('hashchange', onHistoryChange);
      // Positions are intentionally document-local, including after a reload of
      // a URL that already contains a valid history marker.
      renderRoute(current.hash, { restore: false });
      scroll.top();
      rememberCurrent();
    },
    push(hash) {
      if (!started || disposed) return;
      const nextHash = canonicalHash(hash);
      if (nextHash === current.hash) return;
      rememberCurrent();
      const restoreKey = isList(nextHash) ? recentLists.get(nextHash) : undefined;
      const next = { key: createKey(), hash: nextHash };
      history.pushState(withEntry(null, next), '', routeURL(nextHash));
      beforeNavigate();
      current = next;
      renderRoute(current.hash, { restore: restoreKey !== undefined });
      if (restoreKey !== undefined) scroll.restore(restoreKey);
      else scroll.top();
      rememberCurrent();
    },
    replace(hash) {
      if (!started || disposed) return;
      const nextHash = canonicalHash(hash);
      if (recentLists.get(current.hash) === current.key && nextHash !== current.hash) {
        recentLists.delete(current.hash);
      }
      current = { key: current.key, hash: nextHash };
      history.replaceState(withEntry(history.state, current), '', routeURL(nextHash));
      // Filtering already updated the DOM. Do not render, close overlays, or
      // scroll here: the entry and its current position belong to the new query.
      rememberCurrent();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      events.removeEventListener('popstate', onHistoryChange);
      events.removeEventListener('hashchange', onHistoryChange);
      if (started) history.scrollRestoration = previousRestoration;
      rememberedEntries.clear();
      recentLists.clear();
      current = null;
      started = false;
    },
  };
}

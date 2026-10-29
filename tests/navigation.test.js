import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntryKey, createNavigation } from '../src/navigation.js';
import { POSITION_LIMIT } from '../src/scroll.js';

function fixture({ url = 'http://localhost/learn/?edition=1', state = null } = {}) {
  let address = new URL(url);
  const location = {};
  const syncLocation = () => {
    for (const field of ['pathname', 'search', 'hash']) location[field] = address[field];
  };
  syncLocation();
  const listeners = new Map();
  const events = {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type) {
      for (const callback of listeners.get(type) || []) callback({ type, state: history.state });
    },
  };
  const entries = [{ state, url: address.href }];
  let index = 0;
  const changeURL = value => { address = new URL(value, address); syncLocation(); };
  const history = {
    scrollRestoration: 'auto',
    get state() { return entries[index].state; },
    pushState(value, unused, nextURL) {
      changeURL(nextURL);
      entries.splice(index + 1);
      entries.push({ state: value, url: address.href });
      index++;
    },
    replaceState(value, unused, nextURL) {
      changeURL(nextURL);
      entries[index] = { state: value, url: address.href };
    },
    go(delta, hashFirst = false) {
      const oldHash = location.hash;
      index += delta;
      changeURL(entries[index].url);
      if (hashFirst && oldHash !== location.hash) events.emit('hashchange');
      events.emit('popstate');
      if (!hashFirst && oldHash !== location.hash) events.emit('hashchange');
    },
    externalHash(hash, foreignState = null) {
      this.pushState(foreignState, '', hash);
      events.emit('hashchange');
    },
  };
  const positions = new Map();
  const scroll = {
    position: 0,
    remember(key) {
      positions.delete(key);
      positions.set(key, this.position);
      if (positions.size > POSITION_LIMIT) positions.delete(positions.keys().next().value);
    },
    restore(key) { this.position = positions.get(key) ?? 0; },
    top() { this.position = 0; },
  };
  const rendered = [];
  let beforeCount = 0;
  let keyCount = 0;
  const navigation = createNavigation({
    history, location, events, scroll,
    createKey: () => (++keyCount).toString(16).padStart(32, '0'),
    beforeNavigate() { beforeCount++; },
    renderRoute(hash, options) {
      rendered.push({ hash, ...options });
      scroll.position = 0;
    },
  });
  return {
    history, location, events, entries, scroll, rendered, navigation, listeners,
    get beforeCount() { return beforeCount; },
  };
}

test('entry keys use all 128 cryptographic bits without requiring secure-context randomUUID', () => {
  const key = createEntryKey({
    getRandomValues(values) {
      assert.ok(values instanceof Uint32Array);
      assert.equal(values.length, 4);
      values.set([0, 1, 0x1234abcd, 0xffffffff]);
      return values;
    },
  });
  assert.equal(key, '00000000000000011234abcdffffffff');
});

test('initial empty URL remains intact and back/forward restores each entry exactly once', () => {
  const f = fixture();
  f.navigation.start();
  f.navigation.start();
  assert.equal(f.location.hash, '');
  assert.equal(f.history.scrollRestoration, 'manual');
  assert.deepEqual(f.rendered, [{ hash: 'courses', restore: false }]);
  const initialKey = f.history.state.herdrNavigation.key;
  assert.match(initialKey, /^[a-f0-9]{32}$/);
  f.scroll.position = 760;
  f.navigation.push('learn/prefix');
  const lessonKey = f.history.state.herdrNavigation.key;
  assert.notEqual(lessonKey, initialKey);
  assert.equal(f.scroll.position, 0);
  f.scroll.position = 230;
  f.history.go(-1);
  assert.equal(f.location.hash, '');
  assert.equal(f.scroll.position, 760);
  assert.equal(f.rendered.length, 3);
  assert.deepEqual(f.rendered.at(-1), { hash: 'courses', restore: true });
  f.scroll.position = 820;
  f.history.go(1, true);
  assert.equal(f.scroll.position, 230);
  assert.equal(f.rendered.length, 4);
  f.history.go(-1);
  assert.equal(f.scroll.position, 820);
  assert.equal(f.location.pathname, '/learn/');
  assert.equal(f.location.search, '?edition=1');
});

test('explicit map and reference returns use the most recent matching list position', () => {
  const f = fixture();
  f.navigation.start();
  f.scroll.position = 900;
  f.navigation.push('learn/prefix');
  f.navigation.push('courses');
  assert.equal(f.scroll.position, 900);
  assert.deepEqual(f.rendered.at(-1), { hash: 'courses', restore: true });
  f.scroll.position = 1030;
  f.navigation.push('reference?q=split&kind=action');
  assert.equal(f.scroll.position, 0);
  f.scroll.position = 450;
  f.navigation.push('learn/split');
  f.navigation.push('#reference?kind=action&q=split');
  assert.equal(f.scroll.position, 450);
  assert.deepEqual(f.rendered.at(-1), { hash: 'reference?kind=action&q=split', restore: true });
  f.navigation.push('courses');
  assert.equal(f.scroll.position, 1030);
  f.navigation.push('reference?q=other');
  assert.equal(f.scroll.position, 0);
  assert.equal(f.rendered.at(-1).restore, false);
});

test('same-route pushes and query replacements do not rerender or reset study state', () => {
  const f = fixture();
  f.navigation.start();
  f.navigation.push('learn/prefix');
  f.scroll.position = 320;
  const lessonRenders = f.rendered.length;
  const lessonEntries = f.entries.length;
  const lessonBefore = f.beforeCount;
  f.navigation.push('#learn/prefix');
  assert.equal(f.rendered.length, lessonRenders);
  assert.equal(f.entries.length, lessonEntries);
  assert.equal(f.beforeCount, lessonBefore);
  assert.equal(f.scroll.position, 320);
  f.navigation.push('reference');
  f.scroll.position = 180;
  const key = f.history.state.herdrNavigation.key;
  const renders = f.rendered.length;
  const entryCount = f.entries.length;
  const beforeCount = f.beforeCount;
  f.navigation.replace('reference?q=split&kind=action');
  assert.equal(f.history.state.herdrNavigation.key, key);
  assert.equal(f.location.hash, '#reference?kind=action&q=split');
  assert.equal(f.scroll.position, 180);
  assert.equal(f.rendered.length, renders);
  assert.equal(f.entries.length, entryCount);
  assert.equal(f.beforeCount, beforeCount);
  f.navigation.push('reference?kind=action&q=split');
  assert.equal(f.rendered.length, renders);
  f.navigation.push('learn/split');
  f.history.go(-1);
  assert.equal(f.scroll.position, 180);
  assert.equal(f.rendered.at(-1).hash, 'reference?kind=action&q=split');
});

test('replacing a list query cannot reuse its new position for the obsolete query', () => {
  const f = fixture();
  f.navigation.start();
  f.navigation.push('reference?q=old');
  f.scroll.position = 500;
  f.navigation.replace('reference?q=new');
  f.scroll.position = 120;
  f.navigation.push('learn/prefix');
  f.navigation.push('reference?q=old');
  assert.equal(f.scroll.position, 0);
  assert.equal(f.rendered.at(-1).restore, false);
  f.navigation.push('reference?q=new');
  assert.equal(f.scroll.position, 120);
});

test('foreign hash entries are adopted safely and paired browser events are deduplicated', () => {
  const f = fixture();
  f.navigation.start();
  f.scroll.position = 640;
  f.navigation.push('learn/prefix');
  f.scroll.position = 160;
  f.history.externalHash('#foreign/path', { unrelated: 'retained' });
  assert.equal(f.history.state.unrelated, 'retained');
  assert.match(f.history.state.herdrNavigation.key, /^[a-f0-9]{32}$/);
  assert.equal(f.rendered.at(-1).hash, 'foreign/path');
  assert.equal(f.scroll.position, 0);
  const renders = f.rendered.length;
  f.events.emit('popstate');
  f.events.emit('hashchange');
  assert.equal(f.rendered.length, renders);
  f.scroll.position = 280;
  f.history.go(-1);
  assert.equal(f.scroll.position, 160);
  f.history.go(1);
  assert.equal(f.scroll.position, 280);
  f.history.go(-2);
  assert.equal(f.scroll.position, 640);
});

test('valid markers survive reload but no previous-document scroll position is restored', () => {
  const validKey = 'e'.repeat(32);
  const f = fixture({
    state: { other: 1, herdrNavigation: { key: validKey, hash: 'courses' } },
  });
  f.scroll.position = 999;
  f.navigation.start();
  assert.equal(f.history.state.herdrNavigation.key, validKey);
  assert.equal(f.scroll.position, 0);
  const foreign = fixture({ state: { other: 1, herdrNavigation: { key: 'invalid', hash: 'courses' } } });
  foreign.navigation.start();
  assert.equal(foreign.history.state.other, 1);
  assert.match(foreign.history.state.herdrNavigation.key, /^[a-f0-9]{32}$/);
});

test('list memory is bounded with position memory and disposal is idempotent', () => {
  const f = fixture();
  f.navigation.start();
  f.scroll.position = 850;
  for (let index = 0; index < POSITION_LIMIT; index++) f.navigation.push(`learn/lesson-${index}`);
  f.navigation.push('courses');
  assert.equal(f.scroll.position, 0);
  assert.equal(f.rendered.at(-1).restore, false);
  f.navigation.dispose();
  f.navigation.dispose();
  assert.equal(f.history.scrollRestoration, 'auto');
  for (const callbacks of f.listeners.values()) assert.equal(callbacks.size, 0);
  const renders = f.rendered.length;
  f.history.go(-1);
  f.navigation.push('reference');
  f.navigation.replace('reference?q=x');
  f.navigation.start();
  assert.equal(f.rendered.length, renders);
});

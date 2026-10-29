import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollManager, POSITION_LIMIT } from '../src/scroll.js';

function style() {
  const values = new Map();
  return {
    getPropertyValue: property => values.get(property)?.value || '',
    getPropertyPriority: property => values.get(property)?.priority || '',
    setProperty: (property, value, priority = '') => values.set(property, { value, priority }),
    removeProperty: property => values.delete(property),
  };
}
function fixture(options = {}) {
  const listeners = new Map();
  const frames = new Map();
  const calls = [];
  let nextFrame = 0;
  const root = {
    style: style(), scrollTop: 0, scrollLeft: 0, clientTop: 2,
    getBoundingClientRect: () => ({ top: 40 }),
    scrollTo(value) {
      calls.push(value);
      this.scrollTop = value.top;
      this.scrollLeft = value.left;
    },
    addEventListener(type, callback, config) { listeners.set(type, { callback, config }); },
    removeEventListener(type, callback) {
      if (listeners.get(type)?.callback === callback) listeners.delete(type);
    },
  };
  const body = { style: style() };
  const scroll = createScrollManager({
    root, body,
    frame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelFrame(id) { frames.delete(id); },
    reducedMotion: () => false,
    ...options,
  });
  return { root, body, scroll, calls, listeners, frames };
}

test('root positions are memory-only, bounded, and refreshed when remembered again', () => {
  const { root, scroll } = fixture();
  root.scrollTop = 700;
  scroll.remember('old');
  for (let index = 0; index < POSITION_LIMIT - 1; index++) {
    root.scrollTop = index + 1;
    scroll.remember(`entry-${index}`);
  }
  root.scrollTop = 800;
  scroll.remember('old');
  root.scrollTop = 999;
  scroll.remember('new');
  scroll.restore('entry-0');
  assert.equal(root.scrollTop, 0);
  scroll.restore('old');
  assert.equal(root.scrollTop, 800);
  scroll.dispose();
  scroll.restore('old');
  assert.equal(root.scrollTop, 0);
});

test('synchronous rerenders preserve both root offsets and return or rethrow the update result', () => {
  const { root, scroll } = fixture();
  root.scrollTop = 840;
  root.scrollLeft = 7;
  const result = scroll.preserve(() => {
    root.scrollTop = 0;
    root.scrollLeft = 0;
    return 'rendered';
  });
  assert.equal(result, 'rendered');
  assert.equal(root.scrollTop, 840);
  assert.equal(root.scrollLeft, 7);
  assert.throws(() => scroll.preserve(() => {
    root.scrollTop = 0;
    throw new Error('render failed');
  }), /render failed/);
  assert.equal(root.scrollTop, 840);
});

test('overlay locking restores overflow declarations, priorities, and exact root position once', () => {
  const { root, body, scroll } = fixture();
  body.style.setProperty('overflow', 'clip', 'important');
  root.style.setProperty('overflow-x', 'hidden');
  root.style.setProperty('overflow-y', 'auto', 'important');
  root.scrollTop = 815;
  root.scrollLeft = 4;
  scroll.setOverlay(true);
  assert.equal(body.style.getPropertyValue('overflow'), 'hidden');
  assert.equal(root.style.getPropertyValue('overflow'), 'hidden');
  assert.equal(root.style.getPropertyPriority('overflow'), 'important');
  root.scrollTop = 20;
  root.scrollLeft = 0;
  root.style.setProperty('color', 'red');
  scroll.setOverlay(true);
  scroll.setOverlay(false);
  assert.equal(root.scrollTop, 815);
  assert.equal(root.scrollLeft, 4);
  assert.equal(body.style.getPropertyValue('overflow'), 'clip');
  assert.equal(body.style.getPropertyPriority('overflow'), 'important');
  assert.equal(root.style.getPropertyValue('overflow'), '');
  assert.equal(root.style.getPropertyValue('overflow-y'), 'auto');
  assert.equal(root.style.getPropertyPriority('overflow-y'), 'important');
  assert.equal(root.style.getPropertyValue('color'), 'red');
  root.scrollTop = 930;
  scroll.setOverlay(false);
  assert.equal(root.scrollTop, 930);
  scroll.setOverlay(true);
  root.scrollTop = 0;
  scroll.dispose();
  scroll.dispose();
  assert.equal(root.scrollTop, 930);
});

test('anchors use root coordinates and scroll margin without focus-induced scrolling', () => {
  const { root, scroll, calls } = fixture();
  root.scrollTop = 400;
  let focusOptions;
  const element = {
    ownerDocument: { defaultView: { getComputedStyle: () => ({ scrollMarginTop: '80px' }) } },
    getBoundingClientRect: () => ({ top: 250 }),
    focus: options => { focusOptions = options; },
  };
  scroll.scrollToAnchor(element, { focus: true });
  assert.deepEqual(calls.at(-1), { top: 528, left: 0, behavior: 'smooth' });
  assert.deepEqual(focusOptions, { preventScroll: true });
  scroll.top();
  assert.equal(calls.at(-1).behavior, 'instant');
  const reduced = fixture({ reducedMotion: () => true });
  reduced.scroll.top(true);
  assert.equal(reduced.calls.at(-1).behavior, 'instant');
  reduced.scroll.scrollToAnchor(element);
  assert.equal(reduced.calls.at(-1).behavior, 'instant');
});

test('passive observations coalesce per frame and cancel cleanly after disposal', () => {
  const { root, scroll, listeners, frames } = fixture();
  const seen = [];
  const cleanup = scroll.observe(root, top => seen.push(top));
  const listener = listeners.get('scroll');
  assert.deepEqual(listener.config, { passive: true });
  root.scrollTop = 10;
  listener.callback();
  root.scrollTop = 20;
  listener.callback();
  assert.equal(frames.size, 1);
  const [id, callback] = frames.entries().next().value;
  frames.delete(id);
  callback();
  assert.deepEqual(seen, [20]);
  listener.callback();
  const canceledCallback = frames.values().next().value;
  cleanup();
  cleanup();
  assert.equal(frames.size, 0);
  assert.equal(listeners.size, 0);
  canceledCallback();
  assert.deepEqual(seen, [20]);
  scroll.observe(root, () => assert.fail('disposed callback'));
  listeners.get('scroll').callback();
  scroll.dispose();
  assert.equal(frames.size, 0);
  assert.equal(listeners.size, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, applyAction, tab, workspace, panes, resolveKey } from '../src/engine.js';
import { PRACTICES, initialFor, advanceStep } from '../src/lessons.js';
import { loadProgress, saveProgress, exportConfig } from '../src/progress.js';

const act = (state, action, value) => applyAction(state, action, value).state;

test('nested directional navigation follows geometry, not leaf order', () => {
  let s = act(createSession(), 'split-right');
  s = act(s, 'split-down');
  const [left, upper, lower] = panes(tab(s).tree).map(p => p.id);
  assert.equal(tab(s).focusedPane, lower);
  s = act(s, 'focus-up');
  assert.equal(tab(s).focusedPane, upper);
  s = act(s, 'focus-left');
  assert.equal(tab(s).focusedPane, left);
  s = act(s, 'focus-right');
  assert.equal(tab(s).focusedPane, upper);
  s = act(s, 'focus-down');
  assert.equal(tab(s).focusedPane, lower);
  const blocked = applyAction(s, 'focus-down');
  assert.equal(blocked.changed, false);
  assert.equal(tab(blocked.state).focusedPane, lower);
});

test('closing a nested pane collapses only its split and preserves the surviving subtree', () => {
  let s = act(act(createSession(), 'split-right'), 'split-down');
  const [left, upper] = panes(tab(s).tree).map(p => p.id);
  s = act(s, 'close-pane');
  assert.deepEqual(panes(tab(s).tree).map(p => p.id), [left, upper]);
  assert.equal(tab(s).tree.axis, 'horizontal');
  assert.equal(tab(s).tree.second.id, upper);
  assert.ok(panes(tab(s).tree).some(p => p.id === tab(s).focusedPane));
  s = act(s, 'close-pane');
  assert.equal(panes(tab(s).tree).length, 1);
  assert.equal(applyAction(s, 'close-pane').changed, false);
});

test('detaching prevents edits and reconnecting retains exact workspace layouts and focus', () => {
  let s = act(act(createSession(), 'split-right'), 'new-tab');
  s = act(s, 'rename-tab', '日志');
  s = act(s, 'new-workspace', 'api');
  s = act(s, 'split-down');
  const before = structuredClone(s.workspaces);
  const focusedWorkspace = s.activeWorkspace;
  s = act(s, 'detach');
  const rejected = applyAction(s, 'new-tab');
  assert.equal(rejected.changed, false);
  assert.deepEqual(rejected.state.workspaces, before);
  s = act(s, 'reconnect');
  assert.deepEqual(s.workspaces, before);
  assert.equal(s.activeWorkspace, focusedWorkspace);
  assert.equal(s.connected, true);
});

test('tab switching wraps while each tab keeps its own layout and zoom state', () => {
  let s = act(createSession(), 'split-right');
  s = act(s, 'zoom');
  const first = tab(s).id;
  s = act(s, 'new-tab');
  const second = tab(s).id;
  assert.equal(panes(tab(s).tree).length, 1);
  assert.equal(tab(s).zoomed, false);
  s = act(s, 'next-tab');
  assert.equal(tab(s).id, first);
  assert.equal(panes(tab(s).tree).length, 2);
  assert.equal(tab(s).zoomed, true);
  s = act(s, 'previous-tab');
  assert.equal(tab(s).id, second);
  assert.equal(workspace(s).tabs.length, 2);
});

test('practice steps reject wrong actions and wrong labels rather than auto-completing', () => {
  const lesson = PRACTICES.find(l => l.id === 'rename');
  let s = initialFor(lesson);
  s = act(s, 'rename-tab', 'wrong');
  assert.equal(advanceStep(lesson, 0, 'rename-tab', s), 0);
  assert.equal(lesson.goal(s), false);
  s = act(s, 'rename-tab', 'logs');
  assert.equal(advanceStep(lesson, 0, 'select-tab', s), 0);
  assert.equal(advanceStep(lesson, 0, 'rename-tab', s), 1);
  assert.equal(lesson.goal(s), true);
});

test('custom prefix replaces old prefix and consumes only explicit action modes', () => {
  const s = createSession();
  const key = (key, extra = {}) => ({ key, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...extra });
  assert.equal(resolveKey(s, key('b', { ctrlKey: true }), 'ctrl+a'), null);
  assert.deepEqual(resolveKey(s, key('a', { ctrlKey: true }), 'ctrl+a'), { action: 'prefix' });
  assert.equal(resolveKey(s, key('c'), 'ctrl+a'), null);
  s.mode = 'prefix';
  for (const modifier of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']) {
    assert.equal(resolveKey(s, key(modifier), 'ctrl+a'), null);
  }
  assert.deepEqual(resolveKey(s, key('t', { shiftKey: true }), 'ctrl+a'), { action: 'rename-tab' });
  assert.deepEqual(resolveKey(s, key('N', { shiftKey: true }), 'ctrl+a'), { action: 'new-workspace' });
  assert.deepEqual(resolveKey(s, key('n'), 'ctrl+a'), { action: 'next-tab' });
  assert.equal(resolveKey(s, key('n', { isComposing: true }), 'ctrl+a'), null);
  assert.match(exportConfig('ctrl+a'), /prefix = "ctrl\+a"/);
  assert.throws(() => exportConfig('bad\n[keys]'));
});

test('saved progress survives roundtrip, filters obsolete IDs, and tolerates unavailable storage', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  saveProgress(storage, { completed: ['prefix', 'prefix', 'removed'], mastered: ['q-one', 'obsolete'], prefix: 'ctrl+s' });
  const restored = loadProgress(storage, ['prefix'], ['q-one']);
  assert.deepEqual(restored.completed, ['prefix']);
  assert.deepEqual(restored.mastered, ['q-one']);
  assert.equal(restored.prefix, 'ctrl+s');
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.match(loadProgress(denied, [], []).warning, /无法读取/);
  assert.match(saveProgress(denied, restored), /保存失败/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAction, createSession, panes, resolveKey, tab, workspace } from '../src/domain/engine.js';
import { advanceStep, initialFor, PRACTICES } from '../src/domain/lessons.js';
import { exportConfig, loadProgress, saveProgress } from '../src/domain/progress.js';

/**
 * 执行动作并取出会话，避免回归断言混入界面逻辑。
 * @param {import('../src/domain/types.js').Session} session 原会话。
 * @param {string} action 引擎动作。
 * @param {import('../src/domain/types.js').ActionValue} [value] 用户提供的明确参数。
 * @returns {import('../src/domain/types.js').Session} 操作后的会话。
 */
function act(session, action, value) { return applyAction(session, action, value).state; }

/**
 * 提取叶节点标识供几何与保留状态断言比较。
 * @param {import('../src/domain/types.js').Pane} pane 终端叶节点。
 * @returns {number} 会话内稳定标识。
 */
function paneId(pane) { return pane.id; }

/**
 * 验证方向导航依据几何邻接，而不是叶节点数组顺序。
 * @returns {void}
 */
function checkDirectionalNavigation() {
  /**
   * 当前操作中的布局状态。
   * @type {import('../src/domain/types.js').Session}
   */
  let session = act(createSession(), 'split-right');
  session = act(session, 'split-down');
  /**
   * 左侧、右上和右下终端的标识。
   * @type {number[]}
   */
  const [left, upper, lower] = panes(tab(session).tree).map(paneId);
  assert.equal(tab(session).focusedPane, lower);
  session = act(session, 'focus-up');
  assert.equal(tab(session).focusedPane, upper);
  session = act(session, 'focus-left');
  assert.equal(tab(session).focusedPane, left);
  session = act(session, 'focus-right');
  assert.equal(tab(session).focusedPane, upper);
  session = act(session, 'focus-down');
  assert.equal(tab(session).focusedPane, lower);
  /**
   * 缺少下方邻居时不能凭空改变焦点。
   * @type {import('../src/domain/types.js').ActionResult}
   */
  const blocked = applyAction(session, 'focus-down');
  assert.equal(blocked.changed, false);
  assert.equal(tab(blocked.state).focusedPane, lower);
}
test('nested directional navigation follows geometry, not leaf order', checkDirectionalNavigation);

/**
 * 验证关闭嵌套窗格只折叠空分割，保留其他子树与合法焦点。
 * @returns {void}
 */
function checkNestedClosure() {
  /**
   * 含左一右二布局的会话。
   * @type {import('../src/domain/types.js').Session}
   */
  let session = act(act(createSession(), 'split-right'), 'split-down');
  /**
   * 关闭右下终端后应保留的两个标识。
   * @type {number[]}
   */
  const [left, upper] = panes(tab(session).tree).map(paneId);
  session = act(session, 'close-pane');
  assert.deepEqual(panes(tab(session).tree).map(paneId), [left, upper]);
  assert.equal(tab(session).tree.axis, 'horizontal');
  assert.equal(tab(session).tree.second.id, upper);
  assert.ok(panes(tab(session).tree).some(
    /**
     * 确认焦点仍对应实际存在的终端。
     * @param {import('../src/domain/types.js').Pane} pane 候选终端。
     * @returns {boolean} 是否为当前焦点。
     */
    pane => pane.id === tab(session).focusedPane,
  ));
  session = act(session, 'close-pane');
  assert.equal(panes(tab(session).tree).length, 1);
  assert.equal(applyAction(session, 'close-pane').changed, false);
}
test('closing a nested pane collapses only its split and preserves the surviving subtree', checkNestedClosure);

/**
 * 验证分离阻止编辑，重连保留所有工作区布局和焦点。
 * @returns {void}
 */
function checkDetachReconnect() {
  /**
   * 含多个项目和视图的会话。
   * @type {import('../src/domain/types.js').Session}
   */
  let session = act(act(createSession(), 'split-right'), 'new-tab');
  session = act(session, 'rename-tab', '日志');
  session = act(session, 'new-workspace', 'api');
  session = act(session, 'split-down');
  /**
   * 分离前的全部项目布局快照。
   * @type {import('../src/domain/types.js').Workspace[]}
   */
  const before = structuredClone(session.workspaces);
  /**
   * 分离前的活动项目。
   * @type {number}
   */
  const focusedWorkspace = session.activeWorkspace;
  session = act(session, 'detach');
  /**
   * 分离状态下的新建操作应被拒绝。
   * @type {import('../src/domain/types.js').ActionResult}
   */
  const rejected = applyAction(session, 'new-tab');
  assert.equal(rejected.changed, false);
  assert.deepEqual(rejected.state.workspaces, before);
  session = act(session, 'reconnect');
  assert.deepEqual(session.workspaces, before);
  assert.equal(session.activeWorkspace, focusedWorkspace);
  assert.equal(session.connected, true);
}
test('detaching prevents edits and reconnecting retains exact workspace layouts and focus', checkDetachReconnect);

/**
 * 验证标签切换循环并保留每个视图的独立布局和缩放。
 * @returns {void}
 */
function checkTabIsolation() {
  /**
   * 第一个视图拥有两个窗格的会话。
   * @type {import('../src/domain/types.js').Session}
   */
  let session = act(createSession(), 'split-right');
  session = act(session, 'zoom');
  /**
   * 原视图标识。
   * @type {number}
   */
  const first = tab(session).id;
  session = act(session, 'new-tab');
  /**
   * 新视图标识。
   * @type {number}
   */
  const second = tab(session).id;
  assert.equal(panes(tab(session).tree).length, 1);
  assert.equal(tab(session).zoomed, false);
  session = act(session, 'next-tab');
  assert.equal(tab(session).id, first);
  assert.equal(panes(tab(session).tree).length, 2);
  assert.equal(tab(session).zoomed, true);
  session = act(session, 'previous-tab');
  assert.equal(tab(session).id, second);
  assert.equal(workspace(session).tabs.length, 2);
}
test('tab switching wraps while each tab keeps its own layout and zoom state', checkTabIsolation);

/**
 * 验证重命名课同时检查动作类型和真实名称，不能自动补全答案。
 * @returns {void}
 */
function checkWrongOperands() {
  /**
   * 需要用户输入 logs 的课程。
   * @type {import('../src/domain/types.js').Practice}
   */
  const lesson = PRACTICES.find(
    /**
     * 定位需要名称参数的既有课程。
     * @param {import('../src/domain/types.js').Practice} item 候选课程。
     * @returns {boolean} 是否为重命名课程。
     */
    item => item.id === 'rename',
  );
  /**
   * 本课当前布局。
   * @type {import('../src/domain/types.js').Session}
   */
  let session = initialFor(lesson);
  session = act(session, 'rename-tab', 'wrong');
  assert.equal(advanceStep(lesson, 0, 'rename-tab', session), 0);
  assert.equal(lesson.goal(session), false);
  session = act(session, 'rename-tab', 'logs');
  assert.equal(advanceStep(lesson, 0, 'select-tab', session), 0);
  assert.equal(advanceStep(lesson, 0, 'rename-tab', session), 1);
  assert.equal(lesson.goal(session), true);
}
test('practice steps reject wrong actions and wrong labels rather than auto-completing', checkWrongOperands);

/**
 * 构造最小键盘输入，不依赖浏览器 KeyboardEvent。
 * @param {string} key 逻辑按键。
 * @param {Partial<import('../src/domain/types.js').KeyboardInput>} [extra] 明确的修饰键覆盖。
 * @returns {import('../src/domain/types.js').KeyboardInput} 完整最小输入契约。
 */
function keyInput(key, extra = {}) { return { key, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...extra }; }

/**
 * 验证自定义前缀替换、修饰键忽略、Shift 区分和组合输入边界。
 * @returns {void}
 */
function checkConfiguredPrefix() {
  /**
   * 等待输入的独立会话。
   * @type {import('../src/domain/types.js').Session}
   */
  const session = createSession();
  assert.equal(resolveKey(session, keyInput('b', { ctrlKey: true }), 'ctrl+a'), null);
  assert.deepEqual(resolveKey(session, keyInput('a', { ctrlKey: true }), 'ctrl+a'), { action: 'prefix' });
  assert.equal(resolveKey(session, keyInput('c'), 'ctrl+a'), null);
  session.mode = 'prefix';
  /**
   * 不应消费前缀状态的修饰键。
   * @type {string}
   */
  for (const modifier of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']) assert.equal(resolveKey(session, keyInput(modifier), 'ctrl+a'), null);
  assert.deepEqual(resolveKey(session, keyInput('t', { shiftKey: true }), 'ctrl+a'), { action: 'rename-tab' });
  assert.deepEqual(resolveKey(session, keyInput('N', { shiftKey: true }), 'ctrl+a'), { action: 'new-workspace' });
  assert.deepEqual(resolveKey(session, keyInput('n'), 'ctrl+a'), { action: 'next-tab' });
  assert.equal(resolveKey(session, keyInput('n', { isComposing: true }), 'ctrl+a'), null);
  assert.match(exportConfig('ctrl+a'), /prefix = "ctrl\+a"/);
  assert.throws(
    /**
     * 检查不支持的前缀不能注入导出配置。
     * @returns {string} 错误参数不会产生配置，而是抛出异常。
     */
    () => exportConfig('bad\n[keys]'),
  );
}
test('custom prefix replaces old prefix and consumes only explicit action modes', checkConfiguredPrefix);

/**
 * 验证原有进度格式往返、旧标识过滤以及存储被拒绝时的反馈。
 * @returns {void}
 */
function checkProgressPersistence() {
  /**
   * 内存存储内容，用于检查真实序列化结果。
   * @type {Map<string, string>}
   */
  const store = new Map();
  /**
   * 符合同步存储契约的测试端口。
   * @type {import('../src/domain/types.js').StoragePort}
   */
  const storage = {
    /**
     * 读取测试中的原始记录。
     * @param {string} key 存储键。
     * @returns {string|undefined} 已保存记录。
     */
    getItem(key) { return store.get(key); },
    /**
     * 保存完整序列化记录。
     * @param {string} key 存储键。
     * @param {string} value 序列化记录。
     * @returns {void}
     */
    setItem(key, value) { store.set(key, value); },
  };
  saveProgress(storage, { completed: ['prefix', 'prefix', 'removed'], mastered: ['q-one', 'obsolete'], prefix: 'ctrl+s' });
  /**
   * 只允许现存课程和题目的恢复结果。
   * @type {import('../src/domain/types.js').Progress}
   */
  const restored = loadProgress(storage, ['prefix'], ['q-one']);
  assert.deepEqual(restored.completed, ['prefix']);
  assert.deepEqual(restored.mastered, ['q-one']);
  assert.equal(restored.prefix, 'ctrl+s');
  /**
   * 模拟读写权限均被拒绝的存储端口。
   * @type {import('../src/domain/types.js').StoragePort}
   */
  const denied = {
    /**
     * 模拟浏览器拒绝读取。
     * @returns {never} 此端口始终抛错。
     * @throws {Error} 拒绝访问存储。
     */
    getItem() { throw new Error('拒绝存储'); },
    /**
     * 模拟浏览器拒绝写入。
     * @returns {never} 此端口始终抛错。
     * @throws {Error} 拒绝访问存储。
     */
    setItem() { throw new Error('拒绝存储'); },
  };
  assert.match(loadProgress(denied, [], []).warning, /无法读取/);
  assert.match(saveProgress(denied, restored), /保存失败/);
}
test('saved progress survives roundtrip, filters obsolete IDs, and tolerates unavailable storage', checkProgressPersistence);

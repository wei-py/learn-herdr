// A bounded layout trainer, not a terminal emulator or Herdr API client.
export const ACTION_KEYS = {
  v: 'split-right', '-': 'split-down', h: 'focus-left', j: 'focus-down',
  k: 'focus-up', l: 'focus-right', c: 'new-tab', n: 'next-tab', p: 'previous-tab',
  T: 'rename-tab', N: 'new-workspace', W: 'rename-workspace', w: 'navigate',
  z: 'zoom', x: 'close-pane', b: 'toggle-sidebar', q: 'detach', '?': 'help',
};
export const ACTION_NAMES = {
  prefix: '进入前缀模式', escape: '返回终端模式', 'split-right': '向右分割',
  'split-down': '向下分割', 'focus-left': '聚焦左侧', 'focus-down': '聚焦下方',
  'focus-up': '聚焦上方', 'focus-right': '聚焦右侧', 'new-tab': '新建标签页',
  'next-tab': '下一个标签页', 'previous-tab': '上一个标签页',
  'rename-tab': '重命名标签页', 'new-workspace': '新建工作区',
  'rename-workspace': '重命名工作区', navigate: '工作区导航', zoom: '缩放窗格',
  'close-pane': '关闭窗格', 'toggle-sidebar': '切换侧边栏', detach: '分离客户端',
  reconnect: '重新连接', help: '打开快捷键帮助', 'select-workspace': '切换工作区',
  'select-tab': '切换标签页', 'select-pane': '聚焦窗格',
};

function pane(id) {
  return { id, title: 'shell', lines: [`终端窗格 ${id}`, '~/projects/field-notes', '', '$ ▍', '', '布局示例 · 不运行 shell / AI'] };
}
export function createSession() {
  return {
    workspaces: [{ id: 1, label: 'field-notes', activeTab: 2, tabs: [
      { id: 2, label: 'terminal', focusedPane: 3, tree: pane(3), zoomed: false },
    ] }],
    activeWorkspace: 1, nextId: 4, connected: true, mode: 'terminal', sidebar: true,
  };
}
export function workspace(state) { return state.workspaces.find(w => w.id === state.activeWorkspace); }
export function tab(state) { const w = workspace(state); return w.tabs.find(t => t.id === w.activeTab); }
export function panes(tree) { return tree.axis ? [...panes(tree.first), ...panes(tree.second)] : [tree]; }
export function paneRects(tree, box = { x: 0, y: 0, width: 1, height: 1 }) {
  if (!tree.axis) return [{ id: tree.id, ...box }];
  if (tree.axis === 'horizontal') {
    return [...paneRects(tree.first, { ...box, width: box.width / 2 }),
      ...paneRects(tree.second, { ...box, x: box.x + box.width / 2, width: box.width / 2 })];
  }
  return [...paneRects(tree.first, { ...box, height: box.height / 2 }),
    ...paneRects(tree.second, { ...box, y: box.y + box.height / 2, height: box.height / 2 })];
}
function replacePane(tree, id, replacement) {
  if (!tree.axis) return tree.id === id ? replacement : tree;
  return { ...tree, first: replacePane(tree.first, id, replacement), second: replacePane(tree.second, id, replacement) };
}
function removePane(tree, id) {
  if (!tree.axis) return tree.id === id ? null : tree;
  const first = removePane(tree.first, id), second = removePane(tree.second, id);
  return first && second ? { ...tree, first, second } : first || second;
}
function directionalPane(currentTab, direction) {
  const rects = paneRects(currentTab.tree);
  const from = rects.find(r => r.id === currentTab.focusedPane);
  const horizontal = direction === 'left' || direction === 'right';
  const negative = direction === 'left' || direction === 'up';
  const center = r => horizontal ? r.x + r.width / 2 : r.y + r.height / 2;
  const cross = r => horizontal ? [r.y, r.y + r.height] : [r.x, r.x + r.width];
  const [a, b] = cross(from);
  return rects.filter(r => {
    const [c, d] = cross(r);
    return r.id !== from.id && Math.min(b, d) - Math.max(a, c) > 0.0001 &&
      (negative ? center(r) < center(from) : center(r) > center(from));
  }).sort((r, s) => Math.abs(center(r) - center(from)) - Math.abs(center(s) - center(from)))[0]?.id;
}

export function applyAction(original, action, value) {
  const state = structuredClone(original);
  if (!state.connected && action !== 'reconnect') return { state: original, changed: false, message: '客户端已分离。请在下方输入 herdr 重新连接模拟会话。' };
  const w = workspace(state), t = tab(state);
  let message = ACTION_NAMES[action] || action;
  let changed = true;
  const reject = reason => ({ state: original, changed: false, message: reason });
  if (action === 'prefix') state.mode = 'prefix';
  else if (action === 'escape') state.mode = 'terminal';
  else if (action === 'help') state.mode = 'help';
  else if (action === 'navigate') state.mode = 'navigate';
  else if (action === 'split-right' || action === 'split-down') {
    if (panes(t.tree).length >= 8) return reject('练习区最多 8 个窗格。可先关闭一个，或重新练习。');
    const old = panes(t.tree).find(p => p.id === t.focusedPane), added = pane(state.nextId++);
    t.tree = replacePane(t.tree, old.id, { axis: action === 'split-right' ? 'horizontal' : 'vertical', first: old, second: added });
    t.focusedPane = added.id;
    t.zoomed = false;
    state.mode = 'terminal';
  } else if (action.startsWith('focus-')) {
    const id = directionalPane(t, action.slice(6));
    state.mode = 'terminal';
    if (id) t.focusedPane = id;
    else { changed = false; message = '这个方向没有相邻窗格；未移动焦点。'; }
  } else if (action === 'new-tab') {
    if (w.tabs.length >= 9) return reject('练习区最多 9 个标签页。请重新练习。');
    const id = state.nextId++, p = pane(state.nextId++);
    w.tabs.push({ id, label: `terminal-${w.tabs.length + 1}`, focusedPane: p.id, tree: p, zoomed: false });
    w.activeTab = id;
    state.mode = 'terminal';
  } else if (action === 'next-tab' || action === 'previous-tab') {
    const index = w.tabs.findIndex(item => item.id === w.activeTab);
    w.activeTab = w.tabs[(index + (action === 'next-tab' ? 1 : -1) + w.tabs.length) % w.tabs.length].id;
    state.mode = 'terminal';
    changed = w.tabs.length > 1;
  } else if (action === 'rename-tab' || action === 'rename-workspace') {
    const name = String(value || '').trim();
    if (!name || name.length > 40) return reject('名称须为 1–40 个字符。');
    if (action === 'rename-tab') t.label = name;
    else w.label = name;
    state.mode = 'terminal';
  } else if (action === 'new-workspace') {
    const name = String(value || '').trim();
    if (!name || name.length > 40) return reject('工作区名称须为 1–40 个字符。');
    if (state.workspaces.length >= 6) return reject('练习区最多 6 个工作区。请重新练习。');
    const id = state.nextId++, tabId = state.nextId++, p = pane(state.nextId++);
    state.workspaces.push({ id, label: name, activeTab: tabId, tabs: [{ id: tabId, label: 'terminal', focusedPane: p.id, tree: p, zoomed: false }] });
    state.activeWorkspace = id;
    state.mode = 'terminal';
  } else if (action === 'select-workspace') {
    if (!state.workspaces.some(item => item.id === Number(value))) return reject('工作区不存在。');
    state.activeWorkspace = Number(value);
    state.mode = 'terminal';
  } else if (action === 'select-tab') {
    if (!w.tabs.some(item => item.id === Number(value))) return reject('标签页不存在。');
    w.activeTab = Number(value);
    state.mode = 'terminal';
  } else if (action === 'select-pane') {
    if (!panes(t.tree).some(p => p.id === Number(value))) return reject('窗格不存在。');
    t.focusedPane = Number(value);
    state.mode = 'terminal';
  } else if (action === 'zoom') {
    t.zoomed = !t.zoomed;
    state.mode = 'terminal';
    message = t.zoomed ? '放大当前窗格；其余窗格仍保留。' : '已恢复分割布局。';
  } else if (action === 'close-pane') {
    if (!t.tree.axis) return reject('练习区保护最后一个窗格，避免丢失演示。真实 Herdr 中关闭末窗格会影响容器。');
    t.tree = removePane(t.tree, t.focusedPane);
    t.focusedPane = panes(t.tree)[0].id;
    t.zoomed = false;
    state.mode = 'terminal';
  } else if (action === 'toggle-sidebar') {
    state.sidebar = !state.sidebar;
    state.mode = 'terminal';
  } else if (action === 'detach') {
    state.connected = false;
    state.mode = 'terminal';
    message = '模拟客户端已分离。布局仍保存在本次练习内；真实 Herdr 由后台服务器继续运行进程。';
  } else if (action === 'reconnect') {
    if (state.connected) return reject('客户端已经连接。');
    state.connected = true;
    state.mode = 'terminal';
    message = '已回到同一个模拟会话，工作区、标签页与窗格保持不变。';
  } else return reject('此动作不在网页布局练习范围内。请查阅官方文档。');
  return { state, changed, message };
}

export function keyForAction(action) {
  const key = Object.keys(ACTION_KEYS).find(key => ACTION_KEYS[key] === action);
  if (!key) return action === 'escape' ? 'Esc' : action === 'reconnect' ? 'herdr' : action;
  return /[A-Z]/.test(key) ? `Shift+${key}` : key === '-' ? '−' : key;
}
export function resolveKey(state, event, prefix = 'ctrl+b') {
  if (event.isComposing || event.key === 'Process') return null;
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return null;
  if (event.key === 'Escape') return { action: 'escape' };
  const [modifier, letter] = prefix.split('+');
  const hasModifier = modifier === 'ctrl' ? event.ctrlKey && !event.altKey && !event.metaKey : event.altKey && !event.ctrlKey && !event.metaKey;
  if (hasModifier && !event.shiftKey && event.key.toLowerCase() === letter) return { action: 'prefix' };
  if (event.ctrlKey || event.altKey || event.metaKey) return null;
  if (state.mode === 'prefix') {
    const key = event.shiftKey && /^[a-z]$/.test(event.key) ? event.key.toUpperCase() : event.key;
    const action = ACTION_KEYS[key];
    if (action) return { action };
    if (/^[1-9]$/.test(event.key)) {
      const target = workspace(state).tabs[Number(event.key) - 1];
      return target ? { action: 'select-tab', value: target.id } : { action: 'invalid', message: '该序号没有标签页。' };
    }
    return { action: 'invalid', message: `未收录前缀动作 ${event.key}；已取消前缀。` };
  }
  if ((state.mode === 'help' || state.mode === 'navigate') && event.key === 'q') return { action: 'escape' };
  return null;
}

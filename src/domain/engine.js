// 有界布局教学引擎，不仿真终端，也不调用 Herdr API。
/**
 * 动作键到引擎动作的固定映射。
 * @type {Record<string, import('./types.js').Action>}
 */
export const ACTION_KEYS = {
  v: 'split-right', '-': 'split-down', h: 'focus-left', j: 'focus-down',
  k: 'focus-up', l: 'focus-right', c: 'new-tab', n: 'next-tab', p: 'previous-tab',
  T: 'rename-tab', N: 'new-workspace', W: 'rename-workspace', w: 'navigate',
  z: 'zoom', x: 'close-pane', b: 'toggle-sidebar', q: 'detach', '?': 'help',
};
/**
 * 动作的中文教学名称。
 * @type {Record<import('./types.js').Action, string>}
 */
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

/**
 * 创建只包含静态示例文本的终端叶节点。
 * @param {number} id 会话内标识。
 * @returns {import('./types.js').Pane} 新建的教学窗格。
 */
function pane(id) {
  return { id, title: 'shell', lines: [`终端窗格 ${id}`, '~/projects/field-notes', '', '$ ▍', '', '布局示例 · 不运行 shell / AI'] };
}
/**
 * 创建包含一个工作区、标签页和窗格的初始会话。
 * @returns {import('./types.js').Session} 尚未连接真实进程的教学状态。
 */
export function createSession() {
  return {
    workspaces: [{ id: 1, label: 'field-notes', activeTab: 2, tabs: [
      { id: 2, label: 'terminal', focusedPane: 3, tree: pane(3), zoomed: false },
    ] }],
    activeWorkspace: 1, nextId: 4, connected: true, mode: 'terminal', sidebar: true,
  };
}
/**
 * 查找当前工作区；合法会话始终保留一个活动工作区。
 * @param {import('./types.js').Session} state 教学会话。
 * @returns {import('./types.js').Workspace} 当前工作区。
 */
export function workspace(state) {
  return state.workspaces.find(
    /**
     * 匹配会话当前项目。
     * @param {import('./types.js').Workspace} item 待查项目。
     * @returns {boolean} 是否活动。
     */
    item => item.id === state.activeWorkspace,
  );
}
/**
 * 查找当前工作区的活动标签页。
 * @param {import('./types.js').Session} state 教学会话。
 * @returns {import('./types.js').Tab} 当前标签页。
 */
export function tab(state) {
  /**
   * 当前项目容器。
   * @type {import('./types.js').Workspace}
   */
  const current = workspace(state);
  return current.tabs.find(
    /**
     * 匹配活动视图。
     * @param {import('./types.js').Tab} item 待查视图。
     * @returns {boolean} 是否活动。
     */
    item => item.id === current.activeTab,
  );
}
/**
 * 按视觉顺序展开布局树中的全部终端叶节点。
 * @param {import('./types.js').PaneTree} tree 分割树。
 * @returns {import('./types.js').Pane[]} 终端叶节点。
 */
export function panes(tree) { return tree.axis ? [...panes(tree.first), ...panes(tree.second)] : [tree]; }
/**
 * 把分割树投影到归一化矩形，供方向焦点算法使用。
 * @param {import('./types.js').PaneTree} tree 分割树。
 * @param {import('./types.js').Rectangle} [box] 当前子树占据的区域。
 * @returns {import('./types.js').PaneRect[]} 所有终端的几何区域。
 */
export function paneRects(tree, box = { x: 0, y: 0, width: 1, height: 1 }) {
  if (!tree.axis) return [{ id: tree.id, ...box }];
  if (tree.axis === 'horizontal') {
    return [...paneRects(tree.first, { ...box, width: box.width / 2 }),
      ...paneRects(tree.second, { ...box, x: box.x + box.width / 2, width: box.width / 2 })];
  }
  return [...paneRects(tree.first, { ...box, height: box.height / 2 }),
    ...paneRects(tree.second, { ...box, y: box.y + box.height / 2, height: box.height / 2 })];
}
/**
 * 不改变其他子树地替换指定窗格。
 * @param {import('./types.js').PaneTree} tree 原分割树。
 * @param {number} id 待替换叶节点标识。
 * @param {import('./types.js').PaneTree} replacement 替换后的子树。
 * @returns {import('./types.js').PaneTree} 更新后的布局。
 */
function replacePane(tree, id, replacement) {
  if (!tree.axis) return tree.id === id ? replacement : tree;
  return { ...tree, first: replacePane(tree.first, id, replacement), second: replacePane(tree.second, id, replacement) };
}
/**
 * 删除一个叶节点并折叠空分割，不影响其余子树。
 * @param {import('./types.js').PaneTree} tree 原分割树。
 * @param {number} id 待移除终端标识。
 * @returns {import('./types.js').PaneTree|null} 剩余子树，或空。
 */
function removePane(tree, id) {
  if (!tree.axis) return tree.id === id ? null : tree;
  /**
   * 左侧或上方的剩余子树。
   * @type {import('./types.js').PaneTree|null}
   */
  const first = removePane(tree.first, id);
  /**
   * 右侧或下方的剩余子树。
   * @type {import('./types.js').PaneTree|null}
   */
  const second = removePane(tree.second, id);
  return first && second ? { ...tree, first, second } : first || second;
}
/**
 * 按真实几何邻接关系寻找指定方向最近的终端。
 * @param {import('./types.js').Tab} currentTab 当前标签页。
 * @param {string} direction left、right、up 或 down。
 * @returns {number|undefined} 相邻终端标识，没有邻居时为空。
 */
function directionalPane(currentTab, direction) {
  /**
   * 当前布局的叶节点矩形。
   * @type {import('./types.js').PaneRect[]}
   */
  const rects = paneRects(currentTab.tree);
  /**
   * 当前焦点对应的几何区域。
   * @type {import('./types.js').PaneRect}
   */
  const from = rects.find(
    /**
     * 定位活动叶节点。
     * @param {import('./types.js').PaneRect} item 待查区域。
     * @returns {boolean} 是否当前焦点。
     */
    item => item.id === currentTab.focusedPane,
  );
  /**
   * 当前方向是否沿水平轴。
   * @type {boolean}
   */
  const horizontal = direction === 'left' || direction === 'right';
  /**
   * 当前方向是否沿坐标负方向。
   * @type {boolean}
   */
  const negative = direction === 'left' || direction === 'up';
  /**
   * 提取当前搜索轴的中心坐标。
   * @type {(rect: import('./types.js').PaneRect) => number}
   * @param {import('./types.js').PaneRect} rect 叶节点矩形。
   * @returns {number} 搜索轴中心。
   */
  const center = rect => horizontal ? rect.x + rect.width / 2 : rect.y + rect.height / 2;
  /**
   * 提取垂直于搜索轴的覆盖区间。
   * @type {(rect: import('./types.js').PaneRect) => [number, number]}
   * @param {import('./types.js').PaneRect} rect 叶节点矩形。
   * @returns {[number, number]} 交叉轴上的起止坐标。
   */
  const cross = rect => horizontal ? [rect.y, rect.y + rect.height] : [rect.x, rect.x + rect.width];
  /**
   * 当前焦点的交叉轴区间。
   * @type {[number, number]}
   */
  const [a, b] = cross(from);
  return rects.filter(
    /**
     * 保留指定方向上确实共享边界区间的邻居。
     * @param {import('./types.js').PaneRect} rect 待检查区域。
     * @returns {boolean} 是否构成方向邻接。
     */
    rect => {
      /**
       * 候选区域的交叉轴区间。
       * @type {[number, number]}
       */
      const [c, d] = cross(rect);
      return rect.id !== from.id && Math.min(b, d) - Math.max(a, c) > 0.0001 &&
        (negative ? center(rect) < center(from) : center(rect) > center(from));
    },
  ).sort(
    /**
     * 优先选择搜索轴中心距离最短的邻居。
     * @param {import('./types.js').PaneRect} left 第一个候选。
     * @param {import('./types.js').PaneRect} right 第二个候选。
     * @returns {number} 距离排序结果。
     */
    (left, right) => Math.abs(center(left) - center(from)) - Math.abs(center(right) - center(from)),
  )[0]?.id;
}

/**
 * 在独立副本中执行用户动作；拒绝动作时保留原对象和全部上下文。
 * @param {import('./types.js').Session} original 非 Vue 代理的原会话。
 * @param {import('./types.js').Action} action 明确请求的动作。
 * @param {import('./types.js').ActionValue} [value] 名称或目标标识。
 * @returns {import('./types.js').ActionResult} 新状态及教学反馈。
 */
export function applyAction(original, action, value) {
  /**
   * 本次操作的可写副本。
   * @type {import('./types.js').Session}
   */
  const state = structuredClone(original);
  if (!state.connected && action !== 'reconnect') return { state: original, changed: false, message: '客户端已分离。请在下方输入 herdr 重新连接模拟会话。' };
  /**
   * 当前项目。
   * @type {import('./types.js').Workspace}
   */
  const w = workspace(state);
  /**
   * 当前视图。
   * @type {import('./types.js').Tab}
   */
  const t = tab(state);
  /**
   * 默认动作反馈，可被边界分支细化。
   * @type {string}
   */
  let message = ACTION_NAMES[action] || action;
  /**
   * 操作是否产生实际变化。
   * @type {boolean}
   */
  let changed = true;
  /**
   * 构造保留原状态的拒绝结果。
   * @type {(reason: string) => import('./types.js').ActionResult}
   * @param {string} reason 用户可读的拒绝原因。
   * @returns {import('./types.js').ActionResult} 未改变的状态。
   */
  const reject = reason => ({ state: original, changed: false, message: reason });
  if (action === 'prefix') state.mode = 'prefix';
  else if (action === 'escape') state.mode = 'terminal';
  else if (action === 'help') state.mode = 'help';
  else if (action === 'navigate') state.mode = 'navigate';
  else if (action === 'split-right' || action === 'split-down') {
    if (panes(t.tree).length >= 8) return reject('练习区最多 8 个窗格。可先关闭一个，或重新练习。');
    /**
     * 分割前保留的活动终端。
     * @type {import('./types.js').Pane}
     */
    const old = panes(t.tree).find(
      /**
       * 查找活动终端。
       * @param {import('./types.js').Pane} item 候选窗格。
       * @returns {boolean} 是否聚焦。
       */
      item => item.id === t.focusedPane,
    );
    /**
     * 分割产生的新终端。
     * @type {import('./types.js').Pane}
     */
    const added = pane(state.nextId++);
    t.tree = replacePane(t.tree, old.id, { axis: action === 'split-right' ? 'horizontal' : 'vertical', first: old, second: added });
    t.focusedPane = added.id;
    t.zoomed = false;
    state.mode = 'terminal';
  } else if (action.startsWith('focus-')) {
    /**
     * 几何搜索得到的邻居标识。
     * @type {number|undefined}
     */
    const id = directionalPane(t, action.slice(6));
    state.mode = 'terminal';
    if (id) t.focusedPane = id;
    else { changed = false; message = '这个方向没有相邻窗格；未移动焦点。'; }
  } else if (action === 'new-tab') {
    if (w.tabs.length >= 9) return reject('练习区最多 9 个标签页。请重新练习。');
    /**
     * 新标签页标识。
     * @type {number}
     */
    const id = state.nextId++;
    /**
     * 新标签页的初始终端。
     * @type {import('./types.js').Pane}
     */
    const p = pane(state.nextId++);
    w.tabs.push({ id, label: `terminal-${w.tabs.length + 1}`, focusedPane: p.id, tree: p, zoomed: false });
    w.activeTab = id;
    state.mode = 'terminal';
  } else if (action === 'next-tab' || action === 'previous-tab') {
    /**
     * 原活动标签页的数组位置。
     * @type {number}
     */
    const index = w.tabs.findIndex(
      /**
       * 查找活动视图。
       * @param {import('./types.js').Tab} item 候选视图。
       * @returns {boolean} 是否活动。
       */
      item => item.id === w.activeTab,
    );
    w.activeTab = w.tabs[(index + (action === 'next-tab' ? 1 : -1) + w.tabs.length) % w.tabs.length].id;
    state.mode = 'terminal';
    changed = w.tabs.length > 1;
  } else if (action === 'rename-tab' || action === 'rename-workspace') {
    /**
     * 去除首尾空白后的用户名称。
     * @type {string}
     */
    const name = String(value || '').trim();
    if (!name || name.length > 40) return reject('名称须为 1–40 个字符。');
    if (action === 'rename-tab') t.label = name;
    else w.label = name;
    state.mode = 'terminal';
  } else if (action === 'new-workspace') {
    /**
     * 新项目名称，仍需通过长度验证。
     * @type {string}
     */
    const name = String(value || '').trim();
    if (!name || name.length > 40) return reject('工作区名称须为 1–40 个字符。');
    if (state.workspaces.length >= 6) return reject('练习区最多 6 个工作区。请重新练习。');
    /**
     * 新工作区标识。
     * @type {number}
     */
    const id = state.nextId++;
    /**
     * 新项目的初始标签页标识。
     * @type {number}
     */
    const tabId = state.nextId++;
    /**
     * 新项目的初始终端。
     * @type {import('./types.js').Pane}
     */
    const p = pane(state.nextId++);
    state.workspaces.push({ id, label: name, activeTab: tabId, tabs: [{ id: tabId, label: 'terminal', focusedPane: p.id, tree: p, zoomed: false }] });
    state.activeWorkspace = id;
    state.mode = 'terminal';
  } else if (action === 'select-workspace') {
    if (!state.workspaces.some(
      /**
       * 校验工作区目标。
       * @param {import('./types.js').Workspace} item 候选项目。
       * @returns {boolean} 目标是否存在。
       */
      item => item.id === Number(value),
    )) return reject('工作区不存在。');
    state.activeWorkspace = Number(value);
    state.mode = 'terminal';
  } else if (action === 'select-tab') {
    if (!w.tabs.some(
      /**
       * 校验标签页目标。
       * @param {import('./types.js').Tab} item 候选视图。
       * @returns {boolean} 目标是否存在。
       */
      item => item.id === Number(value),
    )) return reject('标签页不存在。');
    w.activeTab = Number(value);
    state.mode = 'terminal';
  } else if (action === 'select-pane') {
    if (!panes(t.tree).some(
      /**
       * 校验窗格目标。
       * @param {import('./types.js').Pane} item 候选终端。
       * @returns {boolean} 目标是否存在。
       */
      item => item.id === Number(value),
    )) return reject('窗格不存在。');
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

/**
 * 返回用于教学提示的默认动作键写法。
 * @param {import('./types.js').Action} action 动作标识。
 * @returns {string} 保留大小写含义的可读按键。
 */
export function keyForAction(action) {
  /**
   * 对应动作的单个默认按键。
   * @type {string|undefined}
   */
  const key = Object.keys(ACTION_KEYS).find(
    /**
     * 反查动作映射。
     * @param {string} candidate 候选按键。
     * @returns {boolean} 是否对应目标动作。
     */
    candidate => ACTION_KEYS[candidate] === action,
  );
  if (!key) return action === 'escape' ? 'Esc' : action === 'reconnect' ? 'herdr' : action;
  return /[A-Z]/.test(key) ? `Shift+${key}` : key === '-' ? '−' : key;
}
/**
 * 解析教学区域内的物理按键，不拦截表单或网页 Tab 导航。
 * @param {import('./types.js').Session} state 当前会话。
 * @param {import('./types.js').KeyboardInput} event 最小键盘事件。
 * @param {string} [prefix] 当前已保存的练习前缀。
 * @returns {import('./types.js').KeyResolution|null} 可消费动作，或不属于练习的输入。
 */
export function resolveKey(state, event, prefix = 'ctrl+b') {
  if (event.isComposing || event.key === 'Process') return null;
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return null;
  if (event.key === 'Escape') return { action: 'escape' };
  /**
   * 配置前缀中的修饰键和字母。
   * @type {string[]}
   */
  const [modifier, letter] = prefix.split('+');
  /**
   * 只允许配置要求的独占修饰键组合。
   * @type {boolean}
   */
  const hasModifier = modifier === 'ctrl' ? event.ctrlKey && !event.altKey && !event.metaKey : event.altKey && !event.ctrlKey && !event.metaKey;
  if (hasModifier && !event.shiftKey && event.key.toLowerCase() === letter) return { action: 'prefix' };
  if (event.ctrlKey || event.altKey || event.metaKey) return null;
  if (state.mode === 'prefix') {
    /**
     * 将 Shift 字母归一化到区分大小写的动作键。
     * @type {string}
     */
    const key = event.shiftKey && /^[a-z]$/.test(event.key) ? event.key.toUpperCase() : event.key;
    /**
     * 前缀后识别到的动作。
     * @type {import('./types.js').Action|undefined}
     */
    const action = ACTION_KEYS[key];
    if (action) return { action };
    if (/^[1-9]$/.test(event.key)) {
      /**
       * 数字对应的实际标签页，超出范围时为空。
       * @type {import('./types.js').Tab|undefined}
       */
      const target = workspace(state).tabs[Number(event.key) - 1];
      return target ? { action: 'select-tab', value: target.id } : { action: 'invalid', message: '该序号没有标签页。' };
    }
    return { action: 'invalid', message: `未收录前缀动作 ${event.key}；已取消前缀。` };
  }
  if ((state.mode === 'help' || state.mode === 'navigate') && event.key === 'q') return { action: 'escape' };
  return null;
}

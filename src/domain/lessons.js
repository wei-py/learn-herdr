import { applyAction, createSession, panes, tab, workspace } from './engine.js';
/**
 * 默认按键说明的官方依据。
 * @type {string}
 */
const keyboard = 'https://herdr.dev/zh-cn/docs/keyboard/';
/**
 * 工作区与标签页关系的官方依据。
 * @type {string}
 */
const concepts = 'https://herdr.dev/zh-cn/docs/concepts/';
/**
 * 会话分离与恢复边界的官方依据。
 * @type {string}
 */
const session = 'https://herdr.dev/zh-cn/docs/session-state/';
/**
 * 构造带有真实状态判定的教学步骤，不隐式执行答案参数。
 * @type {(action: string, label: string, check?: (state: import('./types.js').Session) => boolean, value?: import('./types.js').ActionValue) => import('./types.js').PracticeStep}
 * @param {string} action 必须执行的动作。
 * @param {string} label 用户可见说明。
 * @param {(state: import('./types.js').Session) => boolean} [check] 操作后的状态谓词。
 * @param {import('./types.js').ActionValue} [value] 仅供答案展示的参数。
 * @returns {import('./types.js').PracticeStep} 完整步骤契约。
 */
const step = (action, label, check = /**
 * 默认步骤只检查显式动作顺序。
 * @returns {boolean} 无附加状态约束。
 */
() => true, value) => ({ action, label, check, value });
/**
 * 统计当前标签页实际保留的窗格，缩放不会改变数量。
 * @type {(state: import('./types.js').Session) => number}
 * @param {import('./types.js').Session} state 当前会话。
 * @returns {number} 叶节点数量。
 */
const count = state => panes(tab(state).tree).length;
/**
 * 检查焦点是否位于视觉顺序的首个窗格。
 * @type {(state: import('./types.js').Session) => boolean}
 * @param {import('./types.js').Session} state 操作后的会话。
 * @returns {boolean} 是否聚焦首个窗格。
 */
const isLeft = state => tab(state).focusedPane === panes(tab(state).tree)[0].id;
/**
 * 检查焦点是否位于视觉顺序的末个窗格。
 * @type {(state: import('./types.js').Session) => boolean}
 * @param {import('./types.js').Session} state 操作后的会话。
 * @returns {boolean} 是否聚焦末个窗格。
 */
const isRight = state => tab(state).focusedPane === panes(tab(state).tree).at(-1).id;
/**
 * 实操课程共用的分类、时长与来源字段。
 * @type {Pick<import('./types.js').Practice, 'type'|'group'|'minutes'|'source'>}
 */
const base = { type: 'practice', group: '窗格与前缀', minutes: 2, source: keyboard };
/**
 * 十四个独立实操任务；步骤和最终布局都满足才授予完成记录。
 * @type {import('./types.js').Practice[]}
 */
export const PRACTICES = [
  { ...base, id: 'prefix', title: '先按前缀，再做动作', intro: '把输入交给 Herdr，而不是交给窗格里的程序。',
    objective: '进入前缀模式，打开快捷键帮助，再用 Esc 回到终端模式。',
    explanation: 'Ctrl+B 不是一直按住：按下并松开，再按动作键。普通终端模式的字母会传给 shell 或智能体，本页不会执行它们。前缀只作用于下一次动作；每次操作通常都要重新按前缀。',
    steps: [step('prefix', '按下并松开前缀键', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.mode === 'prefix'), step('help', '按 ? 打开已收录的快捷键帮助', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.mode === 'help'), step('escape', '按 Esc 关闭帮助', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.mode === 'terminal')],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.mode === 'terminal' && count(s) === 1,
    takeaway: '忘记快捷键时，先用 prefix + ? 找帮助，而不是猜 tmux 的键。' },
  { ...base, id: 'split-right', title: '给项目多开一个终端', intro: '左边写代码，右边看日志。一个标签页可以有多个终端。',
    objective: '在当前标签页向右分割，得到两个并排的窗格。',
    explanation: 'prefix + v 向右分割。新窗格是独立终端，不是原终端的第二个视图。这里仅演示布局，焦点边框表示接收输入的窗格。',
    steps: [step('split-right', '使用 v 向右分割当前窗格', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 2 && tab(s).tree.axis === 'horizontal')],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 2 && tab(s).tree.axis === 'horizontal' && isRight(s), takeaway: 'v 是向右分割；不要套用 tmux 的 %。' },
  { ...base, id: 'split-down', title: '右侧再放一个日志窗格', intro: '分割只作用于聚焦窗格，不会平均重排整个标签页。',
    objective: '先向右分割，再把右侧窗格向下分割，得到左一右二的布局。',
    explanation: 'prefix + minus（减号 -）向下分割。每次动作后回到终端模式，下一次分割要先重新按前缀。',
    steps: [step('split-right', '先向右分割', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 2), step('split-down', '重新按前缀，用 − 向下分割右窗格', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 3 && tab(s).tree.second.axis === 'vertical')],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 3 && tab(s).tree.axis === 'horizontal' && tab(s).tree.second.axis === 'vertical', takeaway: '布局是一棵分割树：右窗格可以继续独立分割。' },
  { ...base, id: 'focus', title: '让键盘找到正确的窗格', intro: '输入前先确认焦点。h / j / k / l 对应左 / 下 / 上 / 右。',
    setup: [['split-right']], objective: '从右窗格移动到左边，再回到右边。',
    explanation: '用前缀加方向键字母移动焦点。鼠标点击也能聚焦；本课要求用键盘动作练习，点击本课动作按钮也会走相同逻辑。',
    steps: [step('focus-left', 'prefix + h 聚焦左窗格', isLeft), step('focus-right', 'prefix + l 返回右窗格', isRight)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 2 && isRight(s), takeaway: '左 h、下 j、上 k、右 l；每个动作都从前缀开始。' },
  { ...base, id: 'focus-vertical', title: '在上下窗格之间移动', intro: '把方向与真实的分割位置联系起来。', setup: [['split-down']],
    objective: '从下窗格向上移动，再回到下窗格。', explanation: 'k 向上、j 向下。没有相邻窗格时不会凭空创建或跳到其他标签页。',
    steps: [step('focus-up', 'prefix + k 聚焦上窗格', isLeft), step('focus-down', 'prefix + j 回到下窗格', isRight)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 2 && isRight(s), takeaway: '窗格焦点与标签页切换是两种不同操作。' },
  { ...base, id: 'zoom', title: '暂时只看一个窗格', intro: '需要专注时放大，而不是关闭其他终端。', setup: [['split-right']],
    objective: '放大右窗格，再恢复原来的双窗格布局。', explanation: 'prefix + z 切换缩放。隐藏的窗格没有被删除；真实 Herdr 中其中的进程仍会运行。本页只保留布局状态，不运行进程。',
    steps: [step('zoom', 'prefix + z 放大当前窗格', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => tab(s).zoomed), step('zoom', '再按 prefix + z 恢复布局', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => !tab(s).zoomed)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 2 && !tab(s).zoomed, takeaway: '缩放可逆；关闭窗格不是。' },
  { ...base, id: 'close-pane', title: '关闭，不等于分离', intro: '关闭窗格会结束对应终端；不要用它来“离开一下”。', setup: [['split-right']],
    objective: '关闭右侧演示窗格，保留左侧窗格。', explanation: 'prefix + x 关闭聚焦窗格。本练习额外提供确认，以免误操作；不是声称每个原生版本都使用相同确认流程。网页会保护最后一个窗格。',
    steps: [step('close-pane', 'prefix + x，然后确认关闭演示窗格', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 1)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 1 && !tab(s).tree.axis, takeaway: '要让进程继续工作，应该分离客户端，而不是关闭窗格。' },
  { ...base, group: '标签页与工作区', id: 'tabs', title: '不同视图，放进标签页', intro: '用一个视图放智能体，另一个视图放日志。',
    objective: '新建第二个标签页，切回第一个，再返回第二个。', explanation: 'c 新建标签页，p 上一个，n 下一个。标签页拥有独立的窗格布局；不会把原标签页的窗格复制过去。',
    steps: [step('new-tab', 'prefix + c 新建标签页', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => workspace(s).tabs.length === 2), step('previous-tab', 'prefix + p 切回第一个', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => workspace(s).activeTab === workspace(s).tabs[0].id), step('next-tab', 'prefix + n 回到第二个', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => workspace(s).activeTab === workspace(s).tabs[1]?.id)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => workspace(s).tabs.length === 2 && workspace(s).activeTab === workspace(s).tabs[1].id, takeaway: '一个项目用工作区，一个项目的不同布局用标签页。' },
  { ...base, group: '标签页与工作区', id: 'rename', title: '把标签页叫作 logs', intro: '有意义的名称，比一串 terminal 更好找。',
    objective: '把当前标签页重命名为 logs。', explanation: 'prefix + Shift+T 打开重命名输入框。输入名称，再按 Enter 确认。Shift+T 与小写 t 不是同一个动作。',
    steps: [step('rename-tab', '打开重命名输入框，输入 logs 并确认', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => tab(s).label === 'logs', 'logs')],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => tab(s).label === 'logs', takeaway: '标签页名描述视图用途，工作区名描述项目。' },
  { ...base, group: '标签页与工作区', id: 'workspace', title: '另一个项目，另一个工作区', intro: '不要把不同项目的智能体和终端混在一个布局里。', source: concepts,
    objective: '新建一个名为 api 的演示工作区。', explanation: 'prefix + Shift+N 创建工作区。网页把原生环境中的目录等选择简化成名称输入；只学习容器与切换关系，不创建目录或 Git worktree。',
    steps: [step('new-workspace', 'prefix + Shift+N，输入 api 并确认', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.workspaces.length === 2 && workspace(s).label === 'api', 'api')],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.workspaces.length === 2 && workspace(s).label === 'api' && workspace(s).tabs.length === 1 && count(s) === 1, takeaway: '工作区包含标签页，标签页包含窗格。普通项目隔离优先用工作区。' },
  { ...base, group: '标签页与工作区', id: 'navigate', title: '回到另一个项目', intro: '工作区切换不应该关掉另一个项目的终端。', setup: [['new-workspace', 'api']],
    objective: '打开工作区导航，选回 field-notes。', explanation: 'prefix + w 进入工作区导航。点击工作区或在本页导航列表中用 ↑ / ↓ 与 Enter 选择。Esc 取消导航。这里简化了原生的常驻导航视图。',
    steps: [step('navigate', 'prefix + w 打开工作区导航', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.mode === 'navigate'), step('select-workspace', '选择 field-notes 工作区', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => workspace(s).label === 'field-notes')],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.workspaces.length === 2 && workspace(s).label === 'field-notes' && s.mode === 'terminal', takeaway: '切换的是视图，不是终止另一个项目。' },
  { ...base, group: '会话与综合', id: 'sidebar', title: '为终端腾出一点空间', intro: '侧边栏可隐藏；工作区不会因此消失。',
    objective: '隐藏侧边栏，再把它恢复。', explanation: 'prefix + b 切换侧边栏。它只改变 UI 可见性，不删除工作区，也不改变会话。',
    steps: [step('toggle-sidebar', 'prefix + b 隐藏侧边栏', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => !s.sidebar), step('toggle-sidebar', '再按 prefix + b 显示侧边栏', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.sidebar)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.sidebar, takeaway: '不要把界面隐藏与资源关闭混为一谈。' },
  { ...base, group: '会话与综合', id: 'detach', title: '离开，让工作继续', intro: '理解 Herdr 的关键：客户端可以离开，服务器继续持有终端。', source: session,
    setup: [['split-right']], objective: '分离模拟客户端，再输入 herdr 重新连接，找回双窗格。',
    explanation: 'prefix + q 分离客户端。真实 Herdr 的后台服务器和智能体继续运行；重新运行 herdr 可连接同一个会话。重启电脑不是分离，不能保留运行中的进程。',
    steps: [step('detach', 'prefix + q 分离客户端', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => !s.connected), step('reconnect', '在下方输入 herdr，按 Enter 重新连接', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.connected)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.connected && count(s) === 2, takeaway: '本页的 herdr 输入框只连接模拟会话，不执行电脑上的命令。' },
  { ...base, group: '会话与综合', id: 'workflow', title: '搭一个自己的项目工作台', minutes: 4, intro: '串起来：命名、分割、标签页、返回、分离与重连。',
    objective: '把第一个标签页命名为 agents 并分割，创建 logs 标签页，最后带着原布局分离并重连。',
    explanation: '这个挑战不自动代做步骤。错误的受支持动作会改变实际演示布局；如果走偏，使用“重新练习”恢复。查看答案不会标记完成。',
    steps: [step('rename-tab', '把第一个标签页命名为 agents', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => tab(s).label === 'agents', 'agents'), step('split-right', '向右分割 agents 标签页', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => count(s) === 2), step('new-tab', '新建第二个标签页', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => workspace(s).tabs.length === 2), step('rename-tab', '把第二个标签页命名为 logs', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => tab(s).label === 'logs', 'logs'), step('previous-tab', '切回 agents 标签页', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => tab(s).label === 'agents'), step('detach', '分离客户端', /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => !s.connected), step('reconnect', '输入 herdr 重新连接', /**
 * 根据用户操作后的真实会话验证当前步骤或最终布局。
 * @param {import('./types.js').Session} s 操作后的模拟会话。
 * @returns {boolean} 当前目标是否已经满足。
 */
s => s.connected)],
    goal: /**
     * 根据用户操作后的真实会话验证当前步骤或最终布局。
     * @param {import('./types.js').Session} s 操作后的模拟会话。
     * @returns {boolean} 当前目标是否已经满足。
     */
    s => s.connected && workspace(s).tabs.length === 2 && tab(s).label === 'agents' && count(s) === 2 && workspace(s).tabs[1].label === 'logs', takeaway: '下一步在真实项目里复现。网页掌握的是操作模型，不是已运行的 agent 工作流。' },
];
/**
 * 仅执行预设的初始布局操作，不把预设动作算作用户完成步骤。
 * @param {import('./types.js').Practice} lesson 当前实操课程。
 * @returns {import('./types.js').Session} 本课独立的初始会话。
 */
export function initialFor(lesson) {
  /**
   * 依次应用布局预设的临时状态。
   * @type {import('./types.js').Session}
   */
  let state = createSession();
  for (
    /**
     * 课程预设的动作及明确参数。
     * @type {[import('./types.js').Action, import('./types.js').ActionValue?]}
     */
    const [action, value] of lesson.setup || []
  ) state = applyAction(state, action, value).state;
  return state;
}
/**
 * 同时检查动作顺序和操作后的真实状态，错误动作或参数不推进步骤。
 * @param {import('./types.js').Practice} lesson 当前实操课程。
 * @param {number} index 当前待完成的零起始步骤。
 * @param {import('./types.js').Action} action 用户刚执行的动作。
 * @param {import('./types.js').Session} state 操作后的会话。
 * @returns {number} 保持原位或推进一项后的步骤索引。
 */
export function advanceStep(lesson, index, action, state) {
  /**
   * 当前必须匹配的步骤；已完成全部步骤时为空。
   * @type {import('./types.js').PracticeStep|undefined}
   */
  const expected = lesson.steps[index];
  return expected && expected.action === action && expected.check(state) ? index + 1 : index;
}

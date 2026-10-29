/**
 * 有界教学布局中的终端叶节点，不代表真实终端进程。
 * @typedef {object} Pane
 * @property {number} id 会话内稳定标识。
 * @property {string} title 静态终端标题。
 * @property {string[]} lines 教学示例文本，不执行命令。
 * @property {undefined} [axis] 叶节点没有分割方向。
 */

/**
 * 二叉分割节点；horizontal 表示左右并排。
 * @typedef {object} SplitPane
 * @property {'horizontal'|'vertical'} axis 布局方向。
 * @property {PaneTree} first 视觉顺序中的第一个子节点。
 * @property {PaneTree} second 视觉顺序中的第二个子节点。
 * @property {undefined} [id] 只有叶节点包含终端标识。
 */

/** @typedef {Pane|SplitPane} PaneTree 递归布局树。 */

/**
 * 工作区内拥有独立分割树和终端焦点的标签页。
 * @typedef {object} Tab
 * @property {number} id 会话内稳定标识。
 * @property {string} label 用户输入的标签名，最长四十个字符。
 * @property {number} focusedPane 当前树中某个叶节点的标识。
 * @property {PaneTree} tree 终端布局。
 * @property {boolean} zoomed 是否仅显示当前聚焦窗格。
 */

/**
 * 项目容器；切换工作区不会销毁其中的标签页。
 * @typedef {object} Workspace
 * @property {number} id 会话内稳定标识。
 * @property {string} label 项目名称。
 * @property {number} activeTab 当前标签页标识。
 * @property {Tab[]} tabs 至少包含一个独立视图。
 */

/**
 * 仅在内存中运行的完整教学会话，不冒充真实 Herdr 状态。
 * @typedef {object} Session
 * @property {Workspace[]} workspaces 至少包含一个项目容器。
 * @property {number} activeWorkspace 当前项目标识。
 * @property {number} nextId 工作区、标签页和窗格共用的下一可用标识。
 * @property {boolean} connected 模拟客户端是否接受布局操作。
 * @property {'terminal'|'prefix'|'help'|'navigate'} mode 当前模拟输入模式。
 * @property {boolean} sidebar 模拟器内部工作区栏的可见性，不是网页左侧导航。
 */

/** @typedef {string} Action 引擎动作标识；未知动作进入统一拒绝分支。 */
/** @typedef {string|number|undefined} ActionValue 可选名称或目标标识参数。 */

/**
 * 一次明确用户操作的执行结果。
 * @typedef {object} ActionResult
 * @property {Session} state 操作后状态；拒绝操作时保留原状态。
 * @property {boolean} changed 是否实际改变了模拟布局。
 * @property {string} message 教学反馈，不冒充 shell 执行成功。
 */

/**
 * 浏览器事件与确定性引擎检查共用的最小键盘契约。
 * @typedef {object} KeyboardInput
 * @property {string} key 保留大小写的逻辑按键。
 * @property {boolean} ctrlKey Control 修饰键状态。
 * @property {boolean} altKey Alt/Option 修饰键状态。
 * @property {boolean} metaKey Command/Meta 修饰键状态。
 * @property {boolean} shiftKey Shift 修饰键状态。
 * @property {boolean} [isComposing] 是否仍在输入法组合输入过程中。
 */

/**
 * 已识别动作或需要消费的无效前缀序列。
 * @typedef {object} KeyResolution
 * @property {Action} action 动作标识；未知前缀动作使用 invalid。
 * @property {ActionValue} [value] 数字选中标签页时对应的明确标识。
 * @property {string} [message] 无效序列反馈。
 */

/**
 * 仅用于方向焦点选择的归一化几何矩形。
 * @typedef {object} PaneRect
 * @property {number} id 终端标识。
 * @property {number} x 左边缘坐标。
 * @property {number} y 上边缘坐标。
 * @property {number} width 水平长度。
 * @property {number} height 垂直长度。
 */
/** @typedef {Omit<PaneRect, 'id'>} Rectangle 不带终端标识的布局区域。 */

/**
 * 按顺序完成的单个操作步骤；状态谓词防止错误参数也被判定通过。
 * @typedef {object} PracticeStep
 * @property {Action} action 必须执行的动作标识。
 * @property {string} label 教学说明，不会自动执行。
 * @property {(session: Session) => boolean} check 根据真实模拟状态判定步骤。
 * @property {ActionValue} [value] 仅供答案展示的参数，不会隐式执行。
 */

/**
 * 同时具有步骤顺序检查和独立最终状态检查的实操课程。
 * @typedef {object} Practice
 * @property {string} id 持久化课程标识。
 * @property {'practice'} type 课程类型。
 * @property {string} group 课程地图分组。
 * @property {string} title 课程标题。
 * @property {number} minutes 预计阅读或练习分钟数。
 * @property {string} intro 课程地图简述。
 * @property {string} objective 可观察的完成目标。
 * @property {string} explanation 操作原理说明。
 * @property {PracticeStep[]} steps 必须完成的操作序列。
 * @property {(session: Session) => boolean} goal 独立的最终状态谓词。
 * @property {string} takeaway 便于后续回忆的要点。
 * @property {string} source 官方依据链接。
 * @property {[Action, ActionValue?][]} [setup] 初始布局操作，不计入完成步骤。
 */

/**
 * 阅读课程中的静态章节。
 * @typedef {object} ReadingSection
 * @property {string} title 章节标题。
 * @property {string} text 原理说明。
 * @property {string} [code] 仅用于展示的代码，不会由网站执行。
 * @property {string[]} [bullets] 补充教学要点。
 */

/**
 * 只有答对关联场景题才记为完成的阅读课程。
 * @typedef {object} Reading
 * @property {string} id 持久化课程标识。
 * @property {'reading'} type 课程类型。
 * @property {string} group 课程地图分组。
 * @property {string} title 阅读标题。
 * @property {number} minutes 预计阅读分钟数。
 * @property {string} intro 课程地图摘要。
 * @property {ReadingSection[]} sections 按顺序展示的静态内容。
 * @property {string} questionId 关联场景题标识。
 * @property {string} source 官方依据链接。
 */

/**
 * 明确的单选场景题；查看答案不会获得掌握记录。
 * @typedef {object} Question
 * @property {string} id 持久化场景题标识。
 * @property {string} group 教学主题。
 * @property {string} question 题目内容。
 * @property {string[]} options 按序排列的选项。
 * @property {number} answer 正确选项的零起始索引。
 * @property {string} explanation 正确推理的解释。
 * @property {string} source 官方依据链接。
 */

/**
 * 精选速查项，不声称完整覆盖原生 API。
 * @typedef {object} Reference
 * @property {string} id 稳定速查项标识。
 * @property {string} kind 快捷键、命令或配置分类。
 * @property {string} category 教学主题。
 * @property {string} title 条目标题。
 * @property {string} syntax 需要在原生工具中查阅的字面语法。
 * @property {string} description 适用范围和语义。
 * @property {string} source 官方依据链接。
 */

/**
 * 保留既有浏览器存储契约的第一版学习记录。
 * @typedef {object} Progress
 * @property {string[]} completed 已成功完成的课程标识。
 * @property {string[]} mastered 已正确回答的场景题标识。
 * @property {string} prefix 所选的受支持练习前缀。
 * @property {string} [warning] 仅展示、不写入存储的迁移或存储反馈。
 */

/**
 * 最小同步存储接口，也用于模拟存储权限被拒绝。
 * @typedef {object} StoragePort
 * @property {(key: string) => string|null|undefined} getItem 读取序列化值。
 * @property {(key: string, value: string) => void} setItem 写入序列化值，失败时抛错。
 */

export {};

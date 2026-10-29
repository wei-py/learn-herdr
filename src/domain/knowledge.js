/**
 * 官方中文文档根地址，内容链接统一由此派生。
 * @type {string}
 */
const DOCS = 'https://herdr.dev/zh-cn/docs/';
/**
 * 阅读、场景题和速查共用的官方依据地址。
 * @type {{quick: string, concepts: string, keyboard: string, config: string, cli: string, recovery: string, remote: string, machines: string}}
 */
const source = {
  quick: `${DOCS}quick-start/`,
  concepts: `${DOCS}concepts/`,
  keyboard: `${DOCS}keyboard/`,
  config: `${DOCS}configuration/`,
  cli: `${DOCS}cli-reference/`,
  recovery: `${DOCS}session-state/`,
  remote: `${DOCS}persistence-remote/`,
  machines: `${DOCS}connecting-machines/`,
};

/**
 * 七篇静态原理阅读，只有关联题答对才获得完成记录。
 * @type {import('./types.js').Reading[]}
 */
export const READINGS = [
  {
    id: 'reading-first-run', group: '入门与概念', type: 'reading',
    title: '安装之后，第一次走进 Herdr', minutes: 5,
    intro: '先认识真实工具的入口，再使用本课程的模拟器练习。网页不会安装 Herdr、启动终端进程或调用编程智能体。',
    sections: [
      {
        title: '安装交给官方指南',
        text: '不同系统与安装渠道有不同的安装和更新方式。请只按官方安装页 https://herdr.dev/zh-cn/docs/install/ 选择适合自己的方式；这里不提供未经核实的安装脚本。完成安装后，可在你自己的终端查看版本，再到项目目录启动。以下只是命令示例，本网页没有执行它们。',
        code: 'herdr --version\nherdr',
      },
      {
        title: '第一次启动不需要管理 socket',
        text: 'herdr 会启动或连接默认的后台会话。如果会话中还没有工作区，会自动打开一个。工作区用来容纳一个项目的标签页、窗格和智能体；不必为了第二个项目再建一个完全独立的服务器会话。',
        bullets: ['为每个活跃项目建独立工作区，侧边栏的状态更容易阅读。', 'Herdr 管理终端工作区，但不会替你安装所有编程智能体；真实使用前仍需准备对应工具。'],
      },
      {
        title: '先点击，再学前缀键',
        text: '可以点击窗格、标签页和工作区来聚焦，拖动分割边框调整大小，右键打开上下文菜单。键盘操作是可选的一层。默认按住 Ctrl 按 B，松开后再按 c，会新建标签页；这不是同时按住三个键。',
        bullets: ['Ctrl+B → ? 打开当前生效的快捷键帮助。', '拖选文本松开即可复制，不必用 Ctrl+C；在终端中 Ctrl+C 通常是中断程序。', '本课程展示的是本地模拟状态；真实 Herdr 中的窗格才是真实终端。'],
      },
    ],
    questionId: 'q-first-run', source: source.quick,
  },
  {
    id: 'reading-hierarchy', group: '入门与概念', type: 'reading',
    title: '从会话到窗格：谁拥有进程？', minutes: 6,
    intro: '把项目组织和进程所有权分开理解，才能知道新建、切换和分离到底改变了什么。',
    sections: [
      {
        title: '一层组织，一层布局，一个终端',
        text: '工作区是顶层项目容器；标签页是工作区内的一种布局，例如 agents、logs 或 review；窗格是布局里的真实终端。智能体是 Herdr 在窗格中识别出的进程，不是与窗格并列的一种布局容器。',
        code: '会话（服务器命名空间）\n└─ 工作区：一个项目\n   ├─ 标签页：agents\n   │  ├─ 窗格：编程智能体进程\n   │  └─ 窗格：shell\n   └─ 标签页：logs\n      └─ 窗格：日志命令',
      },
      {
        title: '客户端是窗口，服务器拥有进程',
        text: 'Herdr 默认由后台服务器和一个或多个终端 UI 客户端组成。服务器拥有窗格和进程状态；客户端负责展示并发送输入。所以断开客户端不等于结束进程。多个客户端可以独立查看同一服务器的不同工作区或标签页。',
        bullets: ['多个客户端查看不同标签页时，各标签页采用查看者的尺寸。', '查看同一标签页时，最后聚焦、选择或操作该标签页的客户端控制其中窗格的尺寸。'],
      },
      {
        title: '先用工作区，需要运行时隔离才用会话',
        text: '默认 herdr 连接默认会话。命名会话拥有独立的窗格、socket 和持久化运行时状态；它不是标签页的另一种名字。日常按项目分组优先用工作区，需要完全隔离时再使用命名会话。命名会话仍共享全局配置文件。',
        code: 'herdr session list\nherdr session attach work',
      },
    ],
    questionId: 'q-hierarchy', source: source.concepts,
  },
  {
    id: 'reading-agent-states', group: '智能体与持久化', type: 'reading',
    title: '读懂智能体状态，而不是猜结果', minutes: 6,
    intro: '状态回答的是“现在需要我关注什么”，不是对代码正确性、测试通过或任务成功的保证。',
    sections: [
      {
        title: '五种状态，五种下一步',
        text: 'Herdr 通过前台进程、屏幕检测清单和可选集成识别智能体。侧边栏会汇总工作区内的状态，但检测也可能存在不确定性。',
        bullets: ['working：智能体正在运行；先查看它正在做什么，别误当作等待审批。', 'blocked：需要输入、审批或决策；应阅读具体问题，再作回应。', 'done：已完成，但此完成状态尚未被查看。', 'idle：已完成或正在等待，且已被查看过；与 done 一样可以接受输入。', 'unknown：Herdr 无法有把握地分类；不代表成功、失败或进程不存在。'],
      },
      {
        title: '为什么两个窗口的 Done 不一样？',
        text: '每个客户端独立记录自己已经展示过的完成状态。在一个客户端查看 Done，不会清除另一个客户端的 Done。CLI/API 使用服务器的已查看状态，因此也可能与某个 UI 的标记不同。读取输出本身不会把服务器状态标记为已查看，显式聚焦目标才会。',
        code: 'herdr agent list\nherdr agent read w1:p1 --lines 40',
      },
      {
        title: '先读现场，再决定是否输入',
        text: '示例中的 w1:p1 只是占位目标，应先从实际列表获取 ID。智能体目标可以是唯一的实时名称，或承载它的窗格 ID；仅写 claude 或 codex 这样的种类名不够。遇到 blocked 时，应查看审批或提问，而不是重复发送普通任务提示。agent prompt 对 blocked 会拒绝发送输入。',
        bullets: ['unknown 时检查窗格内容与检测信息，不要自动宣布任务完成。', 'done 与 idle 描述可交互状态，不替代你对产出和测试结果的审阅。'],
      },
    ],
    questionId: 'q-unknown', source: source.concepts,
  },
  {
    id: 'reading-persistence', group: '智能体与持久化', type: 'reading',
    title: '分离、重启与恢复，是三件事', minutes: 7,
    intro: '布局回来了，不等于原来的测试、开发服务器或 shell 还活着。先确定是哪条恢复路径。',
    sections: [
      {
        title: '分离：原进程从未停止',
        text: '默认 Ctrl+B → q 仅分离客户端，直接关闭终端窗口也不会因此结束后台服务器。窗格、shell 和智能体继续运行。再次运行 herdr 会连接回来。这是最强的持久化路径，因为没有重建原进程。',
        code: 'herdr',
      },
      {
        title: '服务器重启：恢复的是会话形态',
        text: '服务器真正停止后，原窗格进程不再存在。快照可恢复工作区、标签页、窗格、目录、布局和焦点，但不能复活任意进程。没有更强恢复方式的窗格，会在保存目录中启动新 shell。保存目录不可用或 shell 无法启动时，窗格保留并显示错误，不会悄悄切到主目录。',
        bullets: ['herdr server stop 会停止会话及其中的窗格进程，不能当作“退出界面”。', '恢复快照之前要停止对应服务器并备份当前 session.json；不要把布局快照当成进程备份。'],
      },
      {
        title: '屏幕历史与智能体对话也要分开',
        text: '窗格屏幕历史默认关闭。开启后只能在布局匹配时回放最近终端内容，不会恢复运行进程；输出还可能包含令牌、密钥和提示词。智能体原生会话恢复默认开启，但必须有受支持、有效的会话引用及相应集成，它是重新启动智能体并恢复其会话，而不是保留原进程。',
        code: '[experimental]\npane_history = true',
        bullets: ['不支持、缺失、无效、重复或过期的智能体会话引用，会退回普通 shell 恢复。', '若适用智能体原生会话恢复，该窗格会恢复智能体会话，而不是回放保存的屏幕历史。'],
      },
      {
        title: '不要把实验性交接当作普通重启',
        text: '显式 --handoff 会尝试在受支持的服务器替换时保留实时窗格进程；它是实验性、尽力而为的路径，不是默认承诺。进行中的 CLI/API 请求和临时协调状态仍可能中断。普通分离无需使用它。',
      },
    ],
    questionId: 'q-detach', source: source.recovery,
  },
  {
    id: 'reading-remote', group: '智能体与持久化', type: 'reading',
    title: '连接远程机器，先辨认操作目标', minutes: 7,
    intro: '本地界面可以展示远程进程，但 UI 中选中了谁，不会自动重写终端里 CLI 的目标。',
    sections: [
      {
        title: '先让普通 SSH 可用',
        text: '先在自己的终端确认 ssh workbox 能连接正确机器，并处理正常的 SSH 认证和主机密钥确认。workbox 是你的 SSH 配置别名示例，不是 Herdr 自带的服务器。使用有口令的密钥且后台无法交互输入时，可先通过 ssh-add 加载密钥。不要为了连接而关闭主机密钥检查。',
        code: 'ssh workbox\nherdr --remote workbox',
        bullets: ['远程需要兼容的 Herdr 软件包和服务器能力，不要求两端版本号完全相同。', '需要安装、更新或替换远程服务器时，交互式设置会请求批准；后台连接不会自行安装或停止服务器。', '替换服务器可能结束窗格进程，应先看清提示，不要只因版本号不同就重启。'],
      },
      {
        title: '本地键位，远程进程',
        text: 'herdr --remote 的 UI 在本地绘制，窗格进程由远程服务器拥有，终端内容通过 SSH 传输。默认使用客户端本地按键绑定；要明确改用服务器绑定，才添加 --remote-keybindings server。本地自定义命令不会被复制到远程执行环境。',
        code: 'herdr --remote workbox --remote-keybindings server',
      },
      {
        title: '保存机器与一次连接各有用途',
        text: '希望在一个窗口中切换 Local 与多台机器时，可在交互式终端保存机器配置。每份机器配置对应明确的远程会话。禁用或移除配置只断开客户端连接，不停止远程会话。断线后变暗的工作区与状态是缓存，不应当成实时结果。',
        code: 'herdr machine add workbox --label "Build machine"\nherdr machine list',
      },
      {
        title: 'CLI 必须显式指定保存的机器',
        text: '不同服务器可能都有 w1:p1。在 UI 里切换机器，不会改变既有窗格 CLI 继承的会话和 socket。使用全局前缀 --machine，把支持的 API 命令发送到已启用的保存机器；选择器必须是配置 ID 或区分大小写的唯一标签，不是任意 SSH 主机名。先列出远程目标，再使用远程 ID。',
        code: 'herdr --machine "Build machine" agent list\nherdr --machine "Build machine" pane list',
        bullets: ['--machine 不能与 --session 或 --remote 混用；它使用保存的远程会话。', '远程命令失败不会回退到 Local，也不会自动重试可能产生副作用的请求。'],
      },
    ],
    questionId: 'q-remote-target', source: source.machines,
  },
  {
    id: 'reading-config', group: '配置与自动化', type: 'reading',
    title: '小步修改配置，保留你的习惯', minutes: 6,
    intro: 'Herdr 无需配置就能使用。需要定制时，先查当前默认值，再合并少量修改，避免整份覆盖。',
    sections: [
      {
        title: '找到配置，而不是猜位置',
        text: 'Linux 与 macOS 默认使用 ~/.config/herdr/config.toml。运行 herdr --help 可以查看系统解析后的路径；herdr --default-config 只打印完整默认配置。它们与真正修改配置是两回事。',
        code: 'herdr --help\nherdr --default-config',
        bullets: ['先备份已有 config.toml，再把需要的键合并进原有 TOML 表。', '不要直接把 --default-config 的输出重定向覆盖已有配置；那会丢失现有定制。', '同一个 [keys] 表中集中维护按键项，不要把多个示例原样拼成重复表。'],
      },
      {
        title: 'prefix+ 是顺序，不是普通按键',
        text: '默认前缀为 ctrl+b。prefix+n 表示先按已配置前缀、松开、再按 n；ctrl+alt+n 表示终端模式中的直接快捷键。直接绑定普通 n 会拦截 shell 或编辑器输入，不能随意使用。下面是要合并到已有 [keys] 表的示例，不是整份替换配置。',
        code: '[keys]\nprefix = "ctrl+b"\nnext_tab = "prefix+n"\nnew_tab = "prefix+c"',
      },
      {
        title: '重载，不等于重启窗格',
        text: '保存后，可运行 herdr server reload-config 重载服务器支持的设置，或在 UI 全局菜单选择 reload config。大多数 UI 设置无需重启窗格，仅启动时生效的设置仍需重启；不要承诺任何配置都能热重载。',
        code: 'herdr server reload-config',
      },
      {
        title: '远程查看时也有本地与服务器之分',
        text: '主题、侧边栏布局和复制行为等显示设置来自客户端本地配置；窗格默认值、worktree、集成和自定义命令属于运行窗格的服务器。UI 的 reload config 同时重载客户端本地设置和选中服务器配置；默认的本地按键绑定也会更新。显式使用服务器键位时遵循所选服务器的绑定。',
      },
    ],
    questionId: 'q-config-safe', source: source.config,
  },
  {
    id: 'reading-cli-api', group: '配置与自动化', type: 'reading',
    title: '从只读 CLI 开始，建立自动化边界', minutes: 8,
    intro: 'CLI 与集成使用同一套本地 socket API。先观察，再确定目标，最后才考虑发送输入或关闭资源。',
    sections: [
      {
        title: '先列出真实 ID，再读取',
        text: '大多数 CLI 命令返回 JSON；pane read 和 agent read 则直接打印终端文本。不要根据屏幕位置猜 ID，也不要把示例 w1:p1 当成你机器上的保证。下面都是示例，本网页不会执行；实际使用时先根据列表替换目标。',
        code: 'herdr status\nherdr workspace list\nherdr pane list\nherdr agent list\nherdr pane read w1:p1 --source recent --lines 40',
        bullets: ['pane read 默认去除 ANSI 转义；读取的是终端内容，不是文件或结构化的智能体答案。', 'recent 来源的 --lines 按已渲染的终端行选择；visible 来源对应当前可见快照。', '自动化应解析真实响应和错误，不应把“CLI 已返回”一律解释成任务完成。'],
      },
      {
        title: '真实协议以安装的二进制为准',
        text: 'herdr api schema 打印当前安装二进制内置的 socket 协议摘要，--json 才打印完整 JSON Schema。学习时先查看 schema 与官方 CLI 参考，而不是猜一个 HTTP 接口、端口或 JSON 字段。本课程没有自建真实 Herdr API，也不会向本地 socket 发请求。',
        code: 'herdr api schema\nherdr api schema --json',
      },
      {
        title: '提交输入不是只读操作',
        text: '普通 shell 命令需要带回车提交时，官方建议 pane run，而不是把 send-text 与 send-keys Enter 分成两次操作。pane run 会遵循当前 bracketed paste 模式并原子提交文本与 Enter。执行前必须确认目标是你准备操作的 shell，而不是正在运行的编辑器、审批界面或智能体。',
        code: 'herdr pane run w1:p1 "pwd"',
        bullets: ['agent prompt 不带 --wait 时，成功只说明输入写入完成，不证明一轮任务已开始或已完成。', 'agent wait 默认等待 idle、done 或 blocked；blocked 仍需要人处理，不是成功标志。'],
      },
      {
        title: '把停止与删除放在最后',
        text: 'herdr server stop 会结束目标会话及其中的窗格进程，不是分离快捷键。关闭标签页、工作区和窗格也会改变运行状态；不要期待 CLI/API 总有与 UI 一样的确认对话框。worktree remove 还会调用 Git 删除检出目录，不能与只关闭 Herdr 工作区混为一谈。',
        bullets: ['只想离开 UI 时，用 Ctrl+B → q。', '运行有副作用的命令前，核对会话、机器、对象 ID，并保存需要保留的工作。', '本页是精选入门路径，不是完整 CLI、API 或安全策略参考。'],
      },
    ],
    questionId: 'q-api-schema', source: source.cli,
  },
];

/**
 * 十八道场景回忆题，答案公开展示不会直接授予掌握记录。
 * @type {import('./types.js').Question[]}
 */
export const QUESTIONS = [
  {
    id: 'q-first-run', group: '入门与概念', question: '已安装 Herdr，想进入默认会话。最合适的入口是什么？',
    options: ['先手动创建并传入一个 socket 文件', '在自己的终端运行 herdr，由它启动或连接默认后台会话', '在本课程网页中输入真实服务器密码', '必须先启动至少一个编程智能体'],
    answer: 1, explanation: 'herdr 负责启动或连接默认后台会话，不需要你手动管理 socket。本课程的模拟器不会启动真实 Herdr 或替你安装工具。', source: source.quick,
  },
  {
    id: 'q-hierarchy', group: '入门与概念', question: '一个项目同时需要智能体视图和日志视图，怎样组织最符合 Herdr 的模型？',
    options: ['每个视图必须使用一个独立服务器', '把智能体当成标签页容器，再在其下创建项目', '创建一个窗格，把所有工作区放进窗格里', '项目使用一个工作区，内部用不同标签页组织窗格'],
    answer: 3, explanation: '工作区是项目容器，标签页表示布局，窗格是真实终端。智能体是窗格中被识别出的进程；日常项目分组不需要独立命名会话。', source: source.concepts,
  },
  {
    id: 'q-prefix', group: '入门与概念', question: '默认 Ctrl+B → c 应该怎样按，为什么不直接让 c 新建标签页？',
    options: ['按 Ctrl+B 后松开，再按 c，避免抢占终端程序的普通输入', '同时按住 Ctrl、B、C，因为 Herdr 没有模式', '先按 c，再按 Ctrl+B，确认新标签页', '只有在网页输入框输入 Ctrl+B c 才有效'],
    answer: 0, explanation: '前缀键把下一次按键交给 Herdr。正常终端模式下，普通字符需要继续进入 shell、编辑器或智能体，不能都作为工作区命令拦截。', source: source.keyboard,
  },
  {
    id: 'q-server-owner', group: '入门与概念', question: '关闭连接 Herdr 的终端窗口后，为什么窗格进程仍可能继续运行？',
    options: ['浏览器自动接管了所有进程', '客户端把每个进程复制了一份', '后台服务器拥有窗格与进程，终端窗口只是客户端', '所有进程已经暂停，等待下次播放历史'],
    answer: 2, explanation: '客户端负责终端 UI，服务器拥有窗格和进程状态。正常分离或关闭客户端不会停止服务器；这与服务器停止后的快照恢复不同。', source: source.concepts,
  },
  {
    id: 'q-unknown', group: '智能体与持久化', question: '侧边栏显示 unknown，最稳妥的判断是什么？',
    options: ['任务已经成功，可以自动合并代码', 'Herdr 无法可靠判断状态，应查看窗格与检测信息', '智能体一定没有启动', '它与 blocked 完全相同，直接批准即可'],
    answer: 1, explanation: 'unknown 表示分类不确定，不代表成功、失败或需要审批。状态只是观察线索，仍要检查真实输出和上下文。', source: source.concepts,
  },
  {
    id: 'q-blocked', group: '智能体与持久化', question: '智能体变成 blocked，此时最合理的下一步是什么？',
    options: ['重复发送原提示，直到它继续工作', '直接停止服务器以清除状态', '把它当成工作已完成，切换下一个项目', '查看它的提问或审批内容，再决定如何回应'],
    answer: 3, explanation: 'blocked 说明需要输入、审批或决策。agent prompt 对已 blocked 的智能体不会发送普通提示，而会返回 agent_blocked；应先理解它正在等待什么。', source: source.cli,
  },
  {
    id: 'q-done-client', group: '智能体与持久化', question: '同一智能体在两个客户端分别显示 done 与 idle，这一定是故障吗？',
    options: ['不一定，各客户端独立记录已展示的完成状态，CLI 又使用服务器记录', '一定，所有客户端必须共享同一个 Done 标记', '一定，idle 表示智能体进程已经被杀死', '不一定，因为 done 与 working 是同一个状态'],
    answer: 0, explanation: '每个客户端独立记录查看情况。在一个客户端看过完成状态，不会清掉另一个客户端的标记。idle 和 done 都可接受输入，但都不保证产出正确。', source: source.concepts,
  },
  {
    id: 'q-detach', group: '智能体与持久化', question: '正在跑测试，想暂时离开而不停止它，应选择什么？',
    options: ['运行 herdr server stop', '删除当前命名会话', '用 Ctrl+B → q 分离客户端，稍后运行 herdr 回来', '先关闭测试窗格，再依靠布局快照恢复测试进程'],
    answer: 2, explanation: '分离只断开客户端，原服务器和测试进程继续运行。停止服务器或关闭窗格会结束相应进程，布局快照无法复活任意测试进程。', source: source.recovery,
  },
  {
    id: 'q-restart-boundary', group: '智能体与持久化', question: '服务器完全停止再启动，工作区和分割布局恢复了。可以据此断言什么？',
    options: ['所有开发服务器和测试都在原进程里继续运行', '所有智能体一定恢复了原对话', '只要看到旧输出，就证明原进程未停止', '会话形态可恢复，但任意原进程并未因此复活'],
    answer: 3, explanation: '快照保存布局、目录与焦点等状态，不保存任意运行进程。屏幕历史只是回放；智能体恢复则要求受支持的原生会话引用与集成。', source: source.recovery,
  },
  {
    id: 'q-history-privacy', group: '智能体与持久化', question: '想开启 pane_history，哪项认识是正确的？',
    options: ['它默认关闭，可回放匹配布局的屏幕内容，但可能落盘保存敏感输出', '它能保存所有 shell 进程的内存状态', '开启后再也无需智能体的原生会话恢复', '历史文件可以作为公开截图素材随意分享'],
    answer: 0, explanation: '屏幕历史默认关闭，因为输出可能含密钥、令牌或提示词。它恢复可展示内容而非原进程，且只在与保存布局匹配时回放。', source: source.recovery,
  },
  {
    id: 'q-remote-target', group: '智能体与持久化', question: 'UI 已选中远程 Build machine，想确保 CLI 查询那台已保存机器的智能体，该怎么做？',
    options: ['直接运行 herdr agent list，UI 选择必然改变 CLI 目标', '运行 herdr --machine "Build machine" agent list，并核对保存的目标', '把本地 w1:p1 当作远程唯一 ID 使用', '同时添加 --machine、--remote 和 --session 以提高可靠性'],
    answer: 1, explanation: 'UI 选择不改写 CLI 的会话和 socket。--machine 必须放在命令前，使用已启用的保存配置 ID 或唯一标签；不能与 --remote、--session 混用。', source: source.cli,
  },
  {
    id: 'q-remote-keys', group: '智能体与持久化', question: '本地与远程配置了不同前缀。默认运行 herdr --remote workbox 后使用哪套键位？',
    options: ['永远使用远程服务器键位', '把两套所有普通字符键位自动合并', '使用本地客户端键位；显式 --remote-keybindings server 才改用服务器键位', '远程连接不能使用键盘，只能点击'],
    answer: 2, explanation: '默认保留本地的肌肉记忆。本地客户端绘制 UI，远程服务器运行窗格；键位选择与进程所在机器是两个问题。', source: source.remote,
  },
  {
    id: 'q-ssh-prerequisite', group: '智能体与持久化', question: '准备添加 SSH 机器，哪种做法符合连接边界？',
    options: ['先用普通 ssh 验证目标和认证，需要远程安装或替换时阅读交互式批准提示', '遇到主机密钥错误就永久关闭检查', '依赖后台重连自动安装与停止远程服务器', '认为移除保存机器会自动停止所有远程进程'],
    answer: 0, explanation: 'SSH 访问与认证是前提，主机密钥检查不应放宽。后台连接不会安装或重启服务器；移除或禁用保存机器只断开客户端，远程会话仍运行。', source: source.machines,
  },
  {
    id: 'q-config-safe', group: '配置与自动化', question: '已有自定义 config.toml，只想调整前缀，最安全的做法是什么？',
    options: ['用 herdr --default-config > config.toml 直接覆盖一切', '把每个示例的 [keys] 表原样重复粘贴', '把所有普通字母绑定成直接快捷键', '备份原文件，查看默认值，把所需键合并进已有 [keys] 表，再重载'],
    answer: 3, explanation: '默认配置输出是参考，不是无损合并工具。直接覆盖会丢失定制；应维护有效 TOML 并小步修改，必要时通过 --help 确认解析后的配置路径。', source: source.config,
  },
  {
    id: 'q-reload-config', group: '配置与自动化', question: '修改配置后，关于 reload config 哪项说法正确？',
    options: ['它一定先停止所有窗格', '可无重启应用大多数可重载设置，但仅启动时生效的设置仍需重启', '它保证每一个配置项都立即生效', '远程 UI 的主题永远只从远程服务器读取'],
    answer: 1, explanation: '服务器 reload-config 不重启窗格。UI 菜单的 reload config 还会重载本地客户端与选中服务器的配置，但并非所有设置都能热重载。', source: source.config,
  },
  {
    id: 'q-api-schema', group: '配置与自动化', question: '想确认本机安装版本实际支持的 socket 协议，应该从哪里开始？',
    options: ['猜测 localhost 的 HTTP 端口和请求路径', '把课程模拟器里的对象当作真实 API 响应', '运行 herdr api schema --json 查看二进制内置的完整 schema', '仅凭其他版本的截图推测字段'],
    answer: 2, explanation: 'CLI 使用本地 socket API。api schema 来自安装的二进制，默认打印摘要，加 --json 才是完整 JSON Schema；不应编造 HTTP 接口。', source: source.cli,
  },
  {
    id: 'q-prompt-write', group: '配置与自动化', question: 'agent prompt 不带 --wait 返回成功，究竟确认了什么？',
    options: ['输入已写入，不保证一轮任务已经开始或完成', '智能体的代码已通过全部测试', '智能体一定经历了 working 并回到 idle', '所有 blocked 审批都已被自动同意'],
    answer: 0, explanation: '不带 --wait 的成功只确认写入。即使等待返回，也要区分 idle、done 与 blocked；状态等待不是对业务结果的验证。', source: source.cli,
  },
  {
    id: 'q-destructive-stop', group: '配置与自动化', question: '同事建议用 herdr server stop “只退出界面”。应如何纠正？',
    options: ['同意，它与分离完全相同', '改用 worktree remove，因为它不改变任何文件', '只要设置了 UI 确认，所有 CLI 都不会立即关闭资源', 'server stop 会停止会话与窗格进程；只离开界面应分离客户端'],
    answer: 3, explanation: '停止服务器是有破坏性的运行状态操作，不能代替 Ctrl+B → q。CLI/API 的关闭操作不能一概依赖 UI 确认；worktree remove 还会删除 Git 检出。', source: source.quick,
  },
];

/**
 * 三十四项精选速查，不宣称完整覆盖原生命令或 API。
 * @type {import('./types.js').Reference[]}
 */
export const REFERENCES = [
  { id: 'ref-help', kind: '快捷键', category: '帮助与模式', title: '查看生效的快捷键', syntax: 'Ctrl+B → ?', description: '默认前缀后按 ? 打开帮助；帮助内按 / 筛选。自定义过键位时以应用内当前绑定为准。', source: source.keyboard },
  { id: 'ref-split-right', kind: '快捷键', category: '窗格', title: '向右分割窗格', syntax: 'Ctrl+B → v', description: '分割当前窗格，在右侧创建窗格；配置动作名为 split_vertical。', source: source.keyboard },
  { id: 'ref-split-down', kind: '快捷键', category: '窗格', title: '向下分割窗格', syntax: 'Ctrl+B → -', description: '分割当前窗格，在下方创建窗格；配置中标点写为 minus，动作名为 split_horizontal。', source: source.keyboard },
  { id: 'ref-new-tab', kind: '快捷键', category: '标签页', title: '新建标签页', syntax: 'Ctrl+B → c', description: '在工作区内创建另一种终端布局；不是创建独立服务器会话。', source: source.keyboard },
  { id: 'ref-next-tab', kind: '快捷键', category: '标签页', title: '下一个标签页', syntax: 'Ctrl+B → n', description: '切换到下一个标签页。先按前缀松开，再按 n。', source: source.keyboard },
  { id: 'ref-previous-tab', kind: '快捷键', category: '标签页', title: '上一个标签页', syntax: 'Ctrl+B → p', description: '切换到上一个标签页；普通终端模式的 p 仍应发给窗格程序。', source: source.keyboard },
  { id: 'ref-focus-left', kind: '快捷键', category: '窗格', title: '聚焦左侧窗格', syntax: 'Ctrl+B → h', description: '把输入焦点移向左侧窗格，不是交换窗格位置。', source: source.keyboard },
  { id: 'ref-focus-down', kind: '快捷键', category: '窗格', title: '聚焦下方窗格', syntax: 'Ctrl+B → j', description: '把输入焦点移向下方窗格；与导航模式内的导航按键设置分开。', source: source.keyboard },
  { id: 'ref-focus-up', kind: '快捷键', category: '窗格', title: '聚焦上方窗格', syntax: 'Ctrl+B → k', description: '把输入焦点移向上方窗格。', source: source.keyboard },
  { id: 'ref-focus-right', kind: '快捷键', category: '窗格', title: '聚焦右侧窗格', syntax: 'Ctrl+B → l', description: '把输入焦点移向右侧窗格。', source: source.keyboard },
  { id: 'ref-workspace-nav', kind: '快捷键', category: '工作区', title: '打开工作区导航', syntax: 'Ctrl+B → w', description: '进入常驻工作区导航；选中远程工作区时先按 Enter 确认切换，再进行其他操作。', source: source.keyboard },
  { id: 'ref-new-workspace', kind: '快捷键', category: '工作区', title: '新建工作区', syntax: 'Ctrl+B → Shift+N', description: '前缀后按 Shift+N（大写 N），新建项目级工作区；不是小写 n 的下一标签页。', source: source.keyboard },
  { id: 'ref-zoom', kind: '快捷键', category: '窗格', title: '缩放聚焦窗格', syntax: 'Ctrl+B → z', description: '切换聚焦窗格的缩放显示，不是结束其他窗格里的进程。', source: source.keyboard },
  { id: 'ref-copy', kind: '快捷键', category: '复制', title: '进入复制模式', syntax: 'Ctrl+B → [', description: '在聚焦窗格内查看、搜索和复制；不会暂停进程。v 或空格选择，y 或 Enter 复制，q 可不复制退出。', source: source.keyboard },
  { id: 'ref-detach', kind: '快捷键', category: '会话', title: '分离客户端', syntax: 'Ctrl+B → q', description: '离开客户端，后台服务器和智能体继续运行；再次运行 herdr 可重新连接。', source: source.keyboard },
  { id: 'ref-rename-tab', kind: '快捷键', category: '标签页', title: '重命名标签页', syntax: 'Ctrl+B → Shift+T', description: '前缀后按 Shift+T（大写 T）打开重命名标签页操作。', source: source.keyboard },
  { id: 'ref-launch', kind: '命令', category: '启动与观察', title: '启动或连接默认会话', syntax: 'herdr', description: '在自己的终端使用；启动或连接默认后台会话。本网站只模拟操作，不执行该命令。', source: source.quick },
  { id: 'ref-version', kind: '命令', category: '启动与观察', title: '查看安装版本', syntax: 'herdr --version', description: '打印当前二进制版本；不等于远程运行中服务器的版本。', source: source.cli },
  { id: 'ref-status', kind: '命令', category: '启动与观察', title: '查看状态', syntax: 'herdr status', description: '查询 Herdr 状态；还可用 status server 或 status client 查看相应状态。', source: source.cli },
  { id: 'ref-session-list', kind: '命令', category: '会话', title: '列出会话', syntax: 'herdr session list --json', description: '以 JSON 列出会话；恢复布局前可据此找到对应会话目录。', source: source.cli },
  { id: 'ref-workspace-list', kind: '命令', category: '只读查询', title: '列出工作区', syntax: 'herdr workspace list', description: '先读取实际工作区 ID，再对明确目标操作；不应根据名称猜 ID。', source: source.cli },
  { id: 'ref-pane-list', kind: '命令', category: '只读查询', title: '列出窗格', syntax: 'herdr pane list', description: '读取所属服务器的窗格列表。不同服务器的窗格 ID 可能相同。', source: source.cli },
  { id: 'ref-pane-read', kind: '命令', category: '只读查询', title: '读取最近终端输出', syntax: 'herdr pane read <pane_id> --source recent --lines 40', description: '将占位符替换成实际 ID；直接打印终端文本，默认去除 ANSI。recent 按渲染后的终端行计数，不是读取项目文件。', source: source.cli },
  { id: 'ref-agent-list', kind: '命令', category: '只读查询', title: '列出智能体', syntax: 'herdr agent list', description: '观察已检测到的智能体，再使用唯一实时名称或窗格 ID 定位。智能体种类名本身不是唯一目标。', source: source.cli },
  { id: 'ref-schema', kind: '命令', category: 'API', title: '查看实际 API schema', syntax: 'herdr api schema --json', description: '打印安装二进制内置的完整 socket 协议 JSON Schema；不带 --json 时仅打印摘要。', source: source.cli },
  { id: 'ref-reload', kind: '命令', category: '配置', title: '重载服务器配置', syntax: 'herdr server reload-config', description: '无须重启窗格即可应用可重载设置；仅启动时生效的设置不因此全部热更新。', source: source.config },
  { id: 'ref-stop', kind: '命令', category: '危险操作', title: '停止服务器与窗格', syntax: 'herdr server stop', description: '危险：会停止目标会话和其中的窗格进程，不是退出 UI。仅想暂时离开时使用分离，执行停止前先核对目标并保存工作。', source: source.quick },
  { id: 'ref-machine-list', kind: '命令', category: '远程机器', title: '列出保存的机器配置', syntax: 'herdr machine list --json', description: '读取真实配置 ID、标签与会话；不要根据 SSH 主机名推测不透明的配置 ID。', source: source.cli },
  { id: 'ref-machine-agents', kind: '命令', category: '远程机器', title: '显式查询远程智能体', syntax: 'herdr --machine "Build machine" agent list', description: 'Build machine 必须是已启用的保存配置的唯一标签。全局前缀指定远程目标；UI 中当前选择不会替代它。', source: source.cli },
  { id: 'ref-config-path', kind: '配置', category: '文件与路径', title: 'macOS 与 Linux 配置位置', syntax: '~/.config/herdr/config.toml', description: '默认 TOML 配置路径；用 herdr --help 查看系统解析后的路径。修改前备份，按需合并，勿覆盖已有定制。', source: source.config },
  { id: 'ref-config-prefix', kind: '配置', category: '按键绑定', title: '设置前缀键', syntax: '[keys]\nprefix = "ctrl+b"', description: '此处展示默认前缀；prefix+ 动作引用配置后的前缀。应合并进原有 [keys] 表，避免重复声明表。', source: source.config },
  { id: 'ref-config-next', kind: '配置', category: '按键绑定', title: '显式前缀绑定', syntax: '[keys]\nnext_tab = "prefix+n"', description: '前缀后按 n 才切换标签页。不要随意改成直接绑定普通 n，那会拦截窗格中的正常输入。', source: source.config },
  { id: 'ref-config-mouse', kind: '配置', category: '界面', title: '鼠标捕获', syntax: '[ui]\nmouse_capture = true', description: '默认启用 Herdr 鼠标操作；改成 false 会关闭点击标签页、拖动分割边框等 Herdr 鼠标交互。', source: source.quick },
  { id: 'ref-config-history', kind: '配置', category: '持久化与隐私', title: '开启窗格屏幕历史', syntax: '[experimental]\npane_history = true', description: '默认关闭。开启会保存可能含密钥、令牌或提示词的终端输出；仅回放匹配布局的内容，不保留原进程。', source: source.recovery },
];

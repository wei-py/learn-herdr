# Herdr 练习报

参照相邻 `learn-helix` 的报纸式阅读与实操体验制作的中文 Herdr 学习站。两个项目统一 Vue 3 JavaScript、暖纸色、本地字体、顶部导航、自由选课地图和共享组件；不再使用网站左侧课程栏。不是终端仿真器或 Herdr 管理客户端。

在线学习：**https://wei-py.github.io/learn-herdr/**

源码仓库：https://github.com/wei-py/learn-herdr

## 本地运行

需要 Node.js **24.15+（24.x）或 26+**，以及 **pnpm 12.5.1**。CI 固定使用 Node.js 24.15.0；不使用 TypeScript 源文件。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 **http://localhost:5175/**。开发服务器监听 `0.0.0.0`，同一局域网也可访问 Vite 打印的 Network 地址。端口被占用时明确报错，不会悄悄换端口。

```sh
pnpm lint
pnpm test
pnpm build
pnpm preview
```

生产预览为 http://localhost:4175/；静态产物在 `dist/`，资源使用相对路径，可部署到静态站点的根目录或子目录。应用无需后端、数据库、账号、Herdr 安装或 API 密钥。字体来自本地系统，不加载外部字体、统计脚本或网络课程数据。

## 统一技术栈与组件

- Vue 3 + JavaScript、Pinia；Vite+ 提供 `vp dev / build / preview`，pnpm 与锁文件固定依赖。
- TailwindCSS 负责原子样式；UnoCSS 只启用 `presetIcons`，使用 Carbon 的静态 `i-carbon-*` 类。
- 跨业务工具统一选用 xe-utils；DOM 事件和虚拟列表复用 vue-hooks-plus。日期统一使用 dayjs；当前课程没有日期计算，不添加无用日期功能。
- `src/shared/` 与 `learn-helix` 保持同源镜像，包括 BaseButton、BaseDialog、LearningShell、CourseMap、StudyGuide、VirtualList、类型及设计令牌。两仓库独立部署，不跨仓库引用文件；修改共享实现时必须同步另一份。
- 业务按 `features/` 组织，全局状态位于 `stores/`，可复用纯领域逻辑位于 `domain/`，业务 feature 不直接依赖另一个 feature。
- 字体统一为 14px / 1.65 系统无衬线正文、宋体标题、Georgia 英文报头和系统等宽代码。原生输入框、按钮、弹窗与选中卡片复用同一套纸色与边框。
- 全部 JavaScript / Vue 脚本声明与回调使用中文 JSDoc；ESLint + `@antfu/eslint-config`、`eslint-plugin-jsdoc` 和声明覆盖规则检查具体类型、参数、返回值、标签、类型语法、中文说明及导入顺序。CI 不跳过检查。

当前内容为本地同步数据，没有后端请求、表格、图片或异步课程加载；不生成空的 Axios/API SDK、虚假 Loading 或 Skeleton。引入这些实际场景时，再按请求、取消、错误态、占位尺寸与滚动规范实现。


## GitHub Pages 发布

使用 `.github/workflows/deploy.yml` 自动发布。仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。

推送到 `master` 后，工作流依次执行冻结依赖安装、`pnpm lint`、`pnpm test`、`pnpm build`，再上传 `dist/` 并部署。**不需要提交 git tag**；也可在 Actions 中手动运行工作流。Pull Request 只做检查，不发布。相对资源路径与 Hash 路由兼容 Pages 项目子目录和课程深链接。

发布状态：https://github.com/wei-py/learn-herdr/actions

本地与线上站点的浏览器记录彼此独立，不会把 localhost 的学习进度自动迁移到 Pages。

## 学什么

| 路径 | 范围 | 完成标准 |
| --- | --- | --- |
| 布局实操 | 14 课 | 按顺序完成目标动作，并且当前布局、名称、焦点等最终状态符合目标 |
| 原理阅读 | 7 篇 | 答对该课关联的场景题；仅阅读不标记完成 |
| 场景回忆 | 18 题 | 自己选择并检查答案；查看答案不记掌握 |
| 精选速查 | 34 项 | 查阅常用快捷键、CLI 和配置，不声称覆盖全部原生功能 |

实操包括：前缀与帮助、向右/向下分割、四向焦点、缩放与恢复、关闭窗格、标签页创建与切换、命名、工作区创建与导航、侧边栏、分离重连，以及完整项目工作台挑战。

阅读包括：安装入口、会话/工作区/标签页/窗格关系、客户端与服务器、五种智能体状态、分离与服务器重启的差异、恢复限制、SSH 与多机器目标、配置合并、CLI/API 的观察与操作边界。

## 怎么练

1. 首页是按 6 个专题分组的课程地图，21 课全部可选，不设前置关卡。点击课程块开始阅读或实操；“已掌握”只表示完成记录，不限制选课。课程页的“返回课程地图”会还原本次选课的滚动位置并聚焦刚才的课程。进入实操后点击演示终端。
2. 按下并松开默认前缀 `Ctrl+B`，再按动作键。不是一直按住三个键。
3. 也可以依次点“前缀”和屏幕动作按钮。屏幕按键与物理键盘使用相同的动作引擎。
4. 名称由自己输入，按 Enter 确认；工作区导航支持方向键和 Enter，Esc 取消。
5. 分离后在连接输入框键入 `herdr`，只会重新连接本次网页演示，不会执行电脑命令。
6. 查看答案只展示顺序与目标，不自动代做。走错的受支持动作会改变当前布局，可以“重新练习”。

只有演示区获得焦点时才捕获练习快捷键。Tab 保留网页焦点导航；表单不捕获前缀键，支持中文输入。单独按 Shift、Control 等修饰键不会取消前缀。小写 `n` 与大写 `N` 的动作不同。

网站没有左侧课程栏或课程抽屉。课程地图是选课入口；实操采用中央操作区与右侧指导栏，窄屏把指导移到操作区之后。模拟器内部的工作区栏仍保留，用于真实的侧栏切换教学，不是网站导航。

`LearningShell` 在固定视口应用壳中定义唯一 `#scroll-root`；`html/body` 锁定，`main` 和指导栏不创建第二个页面滚动视口。原生 BaseDialog 内部独立滚动，并锁定背景，Esc 关闭后恢复原位置、overflow 声明优先级与焦点。代码、演示终端和内部帮助面板有明确局部高度与边界。

`src/router/index.js` 保留原 Hash 地址并统一导航策略：普通进入置顶，课程地图/速查返回和浏览器前进后退恢复对应历史项，两个相同 URL 的历史项不会合并位置。共享 `src/shared/composables/useLearningScroll.js` 负责锚点、rAF 观察、覆盖层锁定与最多 80 条内存位置；业务组件不调用 `window.scrollTo` 或 `scrollIntoView`。

返回顶部在 320px 后出现，位于 `z-index: 200`；顶部导航为 300，弹窗为 1200。只有返回顶部与显式锚点可请求平滑滚动，并尊重减少动态效果偏好。完整规则适用性与验证边界见 [布局与滚动验收](docs/scroll-layout-qa.md)。

## 键位设置与导出

“键位与导出”支持把练习前缀设为 `ctrl+b`、`ctrl+a` 或 `ctrl+s`。保存后，实操提示、物理匹配和导出使用相同前缀；旧前缀不再触发实操。修改前缀会重置本课演示，不清除历史掌握。阅读与速查仍明确使用官方默认键位，不伪装成当前原生配置。

导出的 `herdr-keys.toml` **只是 `[keys]` 前缀片段**，不是完整配置：

```toml
[keys]
prefix = "ctrl+b"
```

真实路径通常为 `~/.config/herdr/config.toml`。先备份，再合并到已有 `[keys]` 表；不能整份覆盖已有配置或重复粘贴表头。网站不会修改真实配置。原生 UI 的 `reload config` 可重载客户端与选中服务器配置；CLI `herdr server reload-config` 重载服务器支持的设置。

## 记录与导航

- `localStorage['herdr-lab-v1']` 保存版本 1 的 `completed`、`mastered` 和 `prefix`。无账户或云同步。
- 21 课完成数与 18 题掌握数独立显示；同一道关联题答对也会标记相应阅读课完成。
- 刷新保留掌握记录，当前模拟布局、步骤与未提交答案重置。“重新练习”不删除已掌握记录。
- 答错和查看答案不记掌握；“重新作答”可以重新检查；下一题优先未掌握题，全部掌握后循环复习。
- Hash 路由支持直达课程和题目、浏览器前进/后退。目录搜索与类型筛选写入当前 URL，刷新可恢复筛选；它们不会每个字新增历史条目。
- 页面滚动位置不写入 localStorage；文档刷新后从顶部开始，不复用前一个文档的滚动缓存。离开页面会清理滚动观察、路由监听与缓存。
- 禁用浏览器存储时显示警告，仍可在当前页面练习。无效或旧 ID 不会算作掌握。

## 模拟范围

明确不运行 shell、PTY、AI agent、SSH、socket API、插件、Git worktree 或原生复制模式，也不会安装 Herdr。演示终端文字是静态示例，不是假造命令执行输出；侧栏不假造智能体状态。

教学简化包括：新建工作区只输入名称，导航使用简化选择面板，关闭窗格有额外确认，保护最后一个窗格。每个标签页最多 8 个窗格、每个工作区最多 9 个标签页、最多 6 个工作区。这些是网页练习上限，不是 Herdr 原生限制。原生更多操作通过官方链接学习。

网页的“分离”仅保留当前页面内的模拟状态。真实 Herdr 的后台服务器持有进程；停止服务器或重启机器后，布局恢复不能让任意进程复活。不要将 `herdr server stop` 当作退出 UI。

## 内容依据

学习内容基于官方 **0.9.5** 文档，每篇阅读、题目与速查项提供官方来源。官方在线页面会更新；真实安装版本与默认键位以本机 `herdr --version`、`herdr --default-config`、原生 `prefix + ?` 为准。中文官方文档注明译文由 LLM 生成。

- [快速开始](https://herdr.dev/zh-cn/docs/quick-start/)
- [核心概念](https://herdr.dev/zh-cn/docs/concepts/)
- [键盘](https://herdr.dev/zh-cn/docs/keyboard/)
- [会话状态与恢复](https://herdr.dev/zh-cn/docs/session-state/)
- [连接机器](https://herdr.dev/zh-cn/docs/connecting-machines/)
- [配置](https://herdr.dev/zh-cn/docs/configuration/)
- [CLI 参考](https://herdr.dev/zh-cn/docs/cli-reference/)
- [Herdr 源码](https://github.com/herdrdev/herdr)

## 源码结构

- `src/main.js`、`src/App.vue`：Vue/Pinia 入口和应用协调，不保留字符串渲染器。
- `src/features/`：地图、阅读、递归窗格实操、回忆、速查和配置业务组件。
- `src/stores/`：全局会话、进度、表单、对话框与业务类型。
- `src/domain/engine.js`：独立的分割树、几何焦点、会话与按键解析。
- `src/domain/lessons.js`、`knowledge.js`：14 课实操、7 篇阅读、18 题和 34 项速查。
- `src/domain/progress.js`、`types.js`：兼容存储、TOML 导出与领域契约。
- `src/router/index.js`：兼容 Hash 路由、历史标识、列表返回与页面滚动策略。
- `src/shared/`：Base / Layout / Business 组件、共享 hooks、字体、颜色和层级。
- `tooling/declaration-documentation.js`：全部声明及回调的中文 JSDoc 覆盖检查。
- `tests/engine.test.js`：布局几何、关闭、分离保护、标签隔离、错误参数、前缀修饰键和存储边界。旧 DOM 路由与滚动实现及其专属测试已删除，新界面交互通过实际浏览器验收。

## 已执行验证

- `pnpm lint`、`pnpm build`：通过；`pnpm test`：7 项通过，无失败或跳过。
- BrowserOS neo 在生产预览完成全部 14 个实操与 18 道回忆题；关联的 7 篇阅读也正确记录完成。
- 物理 Shift 命名、错误名称不推进、Ctrl+A 替换旧 Ctrl+B、只读答案、真实 TOML 下载与解析、错误/查看答案不记掌握均已检查。
- 地图 900px → 课程 0 → 返回 900px；同 URL 的旧/新历史项分别恢复 900px / 400px。速查搜索 `herdr` 的 16 项结果往返保留 800px 和查询，刷新保留查询但位置归零。
- 1440px、768px、390px 分别为三/二/一列课程地图；390px 实操完成分割，未出现页面横向溢出。PageDown 只滚动根，减少动态模式下返回顶部使用 instant。
- 局域网 HTTP 无 `crypto.randomUUID` 时仍生成独立历史标识；剪贴板不可用时显示手动复制/下载提示。验收记录与下载文件已清理，未修改原生 Herdr 配置或线上存储。

窄屏验证是桌面浏览器模拟，不代表真机触控、软键盘或所有终端快捷键兼容性。未连接真实 Herdr 服务；上述验证不声称已安装或运行原生工具。

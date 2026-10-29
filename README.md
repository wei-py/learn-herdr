# Herdr 练习报

参照相邻 `learn-helix` 的报纸式阅读与实操体验制作的中文 Herdr 学习站。暖纸色、衬线标题、课程索引、交互布局演示、精选速查与场景回忆；不是终端仿真器或 Herdr 管理客户端。

在线学习：**https://wei-py.github.io/learn-herdr/**

源码仓库：https://github.com/wei-py/learn-herdr

## 本地运行

需要 Node.js 20.19+ 或 22.12+，以及 npm。

```sh
npm install
npm run dev
```

打开 **http://localhost:5175/**。开发服务器监听 `0.0.0.0`，同一局域网也可访问 Vite 打印的 Network 地址。端口被占用时明确报错，不会悄悄换端口。

```sh
npm test
npm run build
npm run preview
```

生产预览为 http://localhost:4175/；静态产物在 `dist/`，资源使用相对路径，可部署到静态站点的根目录或子目录。应用无需后端、数据库、账号、Herdr 安装或 API 密钥。字体来自本地系统，不加载外部字体、统计脚本或网络课程数据。

## GitHub Pages 发布

使用 `.github/workflows/deploy.yml` 自动发布。仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。

推送到 `master` 后，工作流使用 Node.js 22 执行 `npm ci`、`npm test` 和 `npm run build`，然后上传 `dist/` 并部署。也可在 Actions → Deploy to GitHub Pages → Run workflow 手动发布。构建保留相对资源路径；Hash 路由不依赖服务器回退规则，课程深链接可直接打开与刷新。

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

1. 选一课，点击演示终端。
2. 按下并松开默认前缀 `Ctrl+B`，再按动作键。不是一直按住三个键。
3. 也可以依次点“前缀”和屏幕动作按钮。屏幕按键与物理键盘使用相同的动作引擎。
4. 名称由自己输入，按 Enter 确认；工作区导航支持方向键和 Enter，Esc 取消。
5. 分离后在连接输入框键入 `herdr`，只会重新连接本次网页演示，不会执行电脑命令。
6. 查看答案只展示顺序与目标，不自动代做。走错的受支持动作会改变当前布局，可以“重新练习”。

只有演示区获得焦点时才捕获练习快捷键。Tab 保留网页焦点导航；表单不捕获前缀键，支持中文输入。单独按 Shift、Control 等修饰键不会取消前缀。小写 `n` 与大写 `N` 的动作不同。

窄屏使用可展开课程索引和单列内容；模拟器的长代码在局部滚动，不将整页撑宽。顶部主导航固定于页面上方，页面保留一个主纵向滚动区。原生 Dialog 提供焦点约束与 Esc 关闭。

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

- `src/engine.js`：独立的分割树、布局焦点、会话与按键解析。
- `src/lessons.js`：14 课步骤检查与独立最终目标检查。
- `src/knowledge.js`：7 篇阅读、18 题和 34 项速查。
- `src/main.js`：DOM 界面、Hash 导航、表单、Dialog 与交互流程。
- `src/progress.js`：本地记录与 TOML 前缀片段导出。
- `src/style.css`：报纸式响应布局、状态、焦点和减少动态效果偏好。
- `tests/engine.test.js`：布局几何、分割删除、分离保护、标签隔离、错误步骤、前缀修饰键和存储边界。

## 已执行验证

- `npm test`：7 项通过。
- `npm run build`：生成静态产物。
- BrowserOS neo 真实页面：14 个实操全部完成；包含 Shift 命名、工作区导航、关闭确认、综合挑战与分离重连。
- 回忆流程：答错/查看答案不记掌握，正确答案同时记录题目与关联阅读课，刷新保留。
- 速查搜索、空结果、刷新恢复搜索；自定义前缀替换旧前缀，下载文件内容正确。
- 390px 浏览器窄屏：课程索引展开/收起、屏幕按键分割、无整页横向溢出。

窄屏验证是桌面浏览器模拟，不代表真机触控、软键盘或所有终端快捷键兼容性。未连接真实 Herdr 服务；上述验证不声称已安装或运行原生工具。

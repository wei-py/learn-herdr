# 双飞翼布局与滚动验收

## 范围

保持 Herdr 教学状态与自由选课，调整实操页为左索引 / 中央练习 / 右侧指导。以相邻 `learn-helix/src/style.css` 的字体和排版为依据：正文 14px / 1.65 系统无衬线，中文标题 Songti / STSong / Noto Serif CJK / SimSun，英文报头 Georgia，代码 SFMono / Consolas / Liberation Mono。代码正文桌面 15px / 28px，窄屏 14px。背景、墨色、边线与赭红采用相同基准色。

桌面三栏；901–1199px 保留左索引并把指导移到中央之后；≤900px 使用原生 Dialog 课程抽屉，避免三栏挤压。

## 29 条滚动规则

| 项目 | 实现 / 适用性 | 核验依据 |
| --- | --- | --- |
| 单一主滚动区域 | 已实现 | HTML/body 锁定，`scroll-root` 是唯一页面视口；实测 body 高度与视口相等，window/body scrollTop 为 0。 |
| Router 统一管理 | 已实现 | `navigation.js` 统一 push、replace、popstate、hashchange；业务层没有 window.scrollTo / scrollIntoView。 |
| 页面级恢复 | 已实现 | 地图 900px → 课程 0 → 地图 900px；后退/前进分别恢复 0 / 900px。 |
| 明确 scroll-root | 已实现 | `index.html` 持久容器包裹 app，重绘不替换滚动根。 |
| 局部 scroll-section | 已实现 | 代码具有显式最大高度和 contain 边界；三窗格实测右侧代码高度 141px、内容 198px，局部 overflow:auto。 |
| Modal / Drawer 独立滚动 | 已实现 | 390px 窄屏帮助 Dialog scrollTop 可到 98px，背景根位置仍为 0；抽屉高度 810px、有独立滚动。 |
| Overlay 背景锁定 | 已实现 | 原生 Modal/Drawer 打开锁定 body 与根 overflow；坐标点击固定导航打开设置，900px → 锁定 900px → 关闭 900px。演示终端内的小面板不是全屏遮罩，仅限制局部滚动。 |
| Sticky 滚动容器 | 已实现 | 顶栏位于 scroll-root 内；根滚动 900px 时顶栏 top 为 0。 |
| Table 横向滚动 | 当前不适用 | 应用没有 table，不新增空表格或无用封装。未来表格必须在局部有界区域内横向溢出。 |
| Table 固定头/列 | 当前不适用 | 没有表格或固定列，不手写定位假装组件能力。 |
| 大列表虚拟滚动 | 当前无需启用 | 约定超过 80 项必须使用共享虚拟列表；当前课程 21、速查 34、回忆 18、前缀选项 3，均低于阈值。 |
| 滚动事件统一封装 | 已实现 | 全站 scroll 事件只在 `scroll.js` 的 observe 中注册；业务订阅返回顶部状态。 |
| 监听节流 | 已实现 | passive + requestAnimationFrame 合并；测试验证一帧合并与清理待处理帧。 |
| 局部 smooth | 已实现 | 默认 instant；返回顶部显式 smooth；跳过导航锚点使用 instant，无全局 smooth CSS。 |
| 减少动画 | 已实现 | 模拟 prefers-reduced-motion:reduce 后点击返回顶部，实际 scrollTo 参数为 instant。 |
| 统一锚点接口 | 已实现 | skip-link 通过 scrollToAnchor；不使用业务组件 scrollIntoView。 |
| sticky 偏移 | 已实现 | scroll-margin-top 由 sticky-offset 管理；锚点定位后 main top 与导航 bottom 同为约 79.7px。 |
| z-200 返回顶部 | 已实现 | 600px 后显示，实际 computed z-index 为 200；点击后 rootTop 为 0。 |
| 禁止页面横向滚动 | 已实现 | root 横向隐藏，三栏/内部 flex min-width:0；390px 时 root clientWidth 与 scrollWidth 同为 390。 |
| 移动惯性滚动 | 已配置，真机未测 | 根、局部代码、Dialog/Drawer 设置 touch momentum 与 overscroll 边界；桌面模拟不等于 iOS/Android 真机验证。 |
| 动态内容高度稳定 | 已实现适用部分 | 演示终端固定有界高度、状态区 min-height、根 scrollbar-gutter:stable；没有 Skeleton 或网络加载内容。 |
| 数据刷新保留上下文 | 已实现 | preserve 包裹同步重绘；根位置 300px 下连续分割后仍 300px，展开答案保持打开；实际内容变短时自然钳制。 |
| 错误态保留上下文 | 已实现适用部分 | 无网络请求；模拟重连输入错误，根位置 494px 前后相同，输入文本保留，错误说明就地显示。 |
| 图片尺寸 | 当前不适用 | 应用没有图片；未添加占位图片。未来图片必须设置宽高或 aspect-ratio。 |
| 虚拟列表共享封装 | 当前不适用 | 无 >80 项列表，不创建未使用的虚拟滚动基础设施；需要时必须复用共享实现而非各业务重复实现。 |
| 滚动状态不随意持久化 | 已实现 | 位置只在内存 Map 保存最近 80 条；localStorage 仍仅学习进度和前缀；刷新不复用旧文档位置。 |
| 长任务性能 | 已观察，不作性能认证 | 浏览器 PerformanceObserver 覆盖一次搜索→课程→返回→前进后退样本，longtask 与无近期输入 layout-shift 均未记录；样本不能证明所有场景零长任务/零 CLS。 |
| 无障碍 | 已实现并检查 | 根可键盘访问；PageDown 令根位置变化而 windowTop=0；焦点可见，Tab 保留网页导航，抽屉 Esc 后焦点回到打开按钮。 |
| 恢复和监听清理 | 已实现 | 路由 beforeNavigate 关闭覆盖层；scroll/router.dispose 清理监听、帧和内存缓存；应用生命周期使用 AbortController，pagehide/HMR 清理。 |

## 其他实测

- 速查搜索 `herdr` 后 16 项，根位置 800px → 课程 0 → 速查 800px，保留查询和 URL；该条目滚到 400px 后浏览器前进/后退恢复 400px。
- 窄屏抽屉选择另一课后关闭、解除背景锁定，新课程从顶部开始。
- 两次分割后最终目标仍可完成；分离/输入错误/重新连接后仍保留双窗格。
- 原生 Dialog/Drawer 由浏览器提供模态焦点约束，不自行制作表格固定、图片加载或网络错误的虚假场景。

## 自动化与限制

`npm test`：20 项通过，其中原有引擎/进度 7 项，新滚动/路由 13 项。`npm run build`：成功。测试覆盖缓存边界、原始无 hash URL、配对历史事件去重、列表返回、query replace、文档刷新、Overlay 样式优先级与精确位置恢复、rAF 取消及 dispose。

未运行原生 Herdr、未做真机触控与软键盘验证。课程列表未来超过 80 项、引入表格/图片/异步请求时，必须重新实施和核验对应目前不适用条目。

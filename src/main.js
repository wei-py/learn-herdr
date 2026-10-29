import './style.css';
import { ACTION_KEYS, ACTION_NAMES, applyAction, workspace, tab, panes, keyForAction, resolveKey } from './engine.js';
import { PRACTICES, initialFor, advanceStep } from './lessons.js';
import { READINGS, QUESTIONS, REFERENCES } from './knowledge.js';
import { loadProgress, saveProgress, PREFIXES, exportConfig } from './progress.js';
import { createScrollManager } from './scroll.js';
import { createNavigation } from './navigation.js';

const root = document.querySelector('#app');
const dialog = document.querySelector('#app-dialog');
const scrollRoot = document.querySelector('#scroll-root');
const scroll = createScrollManager({ root: scrollRoot, body: document.body });
const drawer = document.querySelector('#index-drawer');
const backTop = document.querySelector('#back-to-top');
let navigation;
let drawerTrigger = null;
const lifecycle = new AbortController();
const listen = (target, event, handler) => target.addEventListener(event, handler, { signal: lifecycle.signal });
const lessons = [READINGS[0], READINGS[1], ...PRACTICES, ...READINGS.slice(2)];
const groups = [...new Set(lessons.map(l => l.group))];
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
let storage;
try { storage = window.localStorage; } catch { storage = { getItem() { throw Error(); }, setItem() { throw Error(); } }; }
const progress = loadProgress(storage, lessons.map(l => l.id), QUESTIONS.map(q => q.id));
let notice = progress.warning;
let current = PRACTICES[0];
let state = initialFor(current);
let stepIndex = 0;
let feedback = { kind: '', text: '点击演示终端，按前缀键开始；也可使用下面的屏幕按键。' };
let keyHistory = [];
let hints = true;
let route = 'learn';
let question = QUESTIONS[0];
let selected = null;
let quizResult = '';
let revealed = false;
let returnLesson = null;
let referenceQuery = '';
let referenceKind = '';
const narrow = matchMedia('(max-width: 900px)');
let openGroups = new Set(['入门与概念', '窗格与前缀']);
let navigationIndex = 0;
let modalSubmit = null;
let modalTrigger = null;

const prefixLabel = () => progress.prefix.replace('ctrl', 'Ctrl').toUpperCase().replace('CTRL', 'Ctrl');
const sequence = action => action === 'prefix' ? prefixLabel() : action === 'escape' ? 'Esc' : action === 'reconnect' ? 'herdr ↵' : `${prefixLabel()} → ${keyForAction(action)}`;
const sourceLink = url => `<a class="source-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">官方依据 ↗</a>`;
function persist() { const warning = saveProgress(storage, progress); if (warning) notice = warning; }
function markCompleted(id) { if (!progress.completed.includes(id)) { progress.completed.push(id); persist(); } }
function navigate(hash) {
  if (hash === 'reference') {
    const params = new URLSearchParams();
    if (referenceQuery) params.set('q', referenceQuery);
    if (referenceKind) params.set('kind', referenceKind);
    hash = `reference${params.size ? `?${params}` : ''}`;
  }
  navigation.push(hash);
}
function readRoute(hash, { restore = false } = {}) {
  const [path, query = ''] = hash.split('?');
  const [track, id] = path.split('/');
  if (!track || track === 'courses') {
    route = 'courses';
  } else if (track === 'reference') {
    route = 'reference';
    const params = new URLSearchParams(query);
    referenceQuery = params.get('q') || '';
    referenceKind = params.get('kind') || '';
  } else if (track === 'recall') {
    route = 'recall';
    question = QUESTIONS.find(q => q.id === id) || QUESTIONS.find(q => !progress.mastered.includes(q.id)) || QUESTIONS[0];
    selected = null; quizResult = ''; revealed = false;
    returnLesson = new URLSearchParams(query).get('from');
  } else {
    route = 'learn';
    current = lessons.find(l => l.id === id) || PRACTICES[0];
    openGroups.add(current.group);
    stepIndex = 0; keyHistory = [];
    state = current.type === 'practice' ? initialFor(current) : null;
    feedback = { kind: '', text: '点击演示终端，按前缀键开始；也可使用下面的屏幕按键。' };
  }
  render({ preserve: false });
  if (route === 'courses' && restore) {
    root.querySelector(`[data-lesson="${current.id}"]`)?.focus({ preventScroll: true });
  } else if (route === 'learn') {
    document.querySelector('#main').focus({ preventScroll: true });
  }
}
function sidebar(inDrawer = false) {
  return `<aside id="${inDrawer ? 'drawer-course-index' : 'course-index'}" class="course-index ${inDrawer ? 'in-drawer' : ''}" aria-label="课程索引">
    <div class="index-heading"><div class="eyebrow">THE LEARNING INDEX</div><h2>从这里开始</h2><p>阅读原理，再动手练习。可自由选课。</p></div>
    <div class="progress-label"><span>课程进度</span><strong>${progress.completed.length} / ${lessons.length}</strong></div>
    <progress value="${progress.completed.length}" max="${lessons.length}" aria-label="课程完成进度"></progress>
    ${groups.map(group => `<details class="course-group" data-group="${escape(group)}" ${openGroups.has(group) ? 'open' : ''}><summary>${escape(group)} <span>${lessons.filter(l => l.group === group && progress.completed.includes(l.id)).length}/${lessons.filter(l => l.group === group).length}</span></summary>${lessons.filter(l => l.group === group).map(l => `<button class="lesson-link ${route === 'learn' && current.id === l.id ? 'active' : ''} ${progress.completed.includes(l.id) ? 'complete' : ''}" data-lesson="${l.id}" ${route === 'learn' && current.id === l.id ? 'aria-current="page"' : ''}><span class="lesson-number">${progress.completed.includes(l.id) ? '✓' : String(lessons.indexOf(l) + 1).padStart(2, '0')}</span><span class="lesson-title">${escape(l.title)}</span><span class="lesson-type">${l.type === 'practice' ? '实操' : '阅读'}</span></button>`).join('')}</details>`).join('')}
    <p class="muted">进度仅保存在此浏览器。实操与回忆分别记录，不上传账户。</p>
  </aside>`;
}
function openIndexDrawer() {
  if (!narrow.matches || drawer.open) return;
  drawerTrigger = document.activeElement;
  drawer.innerHTML = `<div class="dialog-heading"><h2>课程索引</h2><button class="drawer-close" data-close-drawer aria-label="关闭课程索引">关闭 ×</button></div>${sidebar(true)}`;
  for (const group of drawer.querySelectorAll('[data-group]')) group.addEventListener('toggle', () => {
    group.open ? openGroups.add(group.dataset.group) : openGroups.delete(group.dataset.group);
  });
  drawer.showModal();
  scroll.setOverlay(true);
  root.querySelector('.mobile-index-toggle')?.setAttribute('aria-expanded', 'true');
}
function closeNarrowDrawer() { if (!narrow.matches && drawer.open) drawer.close(); }
listen(drawer, 'click', event => {
  const lesson = event.target.closest('[data-lesson]');
  if (lesson) navigate(`learn/${lesson.dataset.lesson}`);
  else if (event.target.closest('[data-close-drawer]')) drawer.close();
});
listen(drawer, 'close', () => {
  scroll.setOverlay(dialog.open);
  drawer.innerHTML = '';
  root.querySelector('.mobile-index-toggle')?.setAttribute('aria-expanded', 'false');
  if (drawerTrigger?.isConnected) drawerTrigger.focus({ preventScroll: true });
});
listen(narrow, 'change', closeNarrowDrawer);
function render({ preserve = true } = {}) {
  const active = document.activeElement;
  const restoreSimFocus = !!active?.closest('#simulator, [data-key]');
  const activeCommand = active?.getAttribute('data-command');
  const openPanels = [...root.querySelectorAll('details[data-panel][open]')].map(el => el.dataset.panel);
  const update = () => {
  root.innerHTML = `<header class="masthead">
    <div class="edition"><strong>中文交互学习 · 第 001 期</strong><span>终端工作区 / 智能体 / 持久化</span></div>
    <a class="brand" href="#courses"><h1><span class="brand-latin">Herdr</span> <span>练习报</span></h1><span class="latin">THE AGENT WORKSPACE GAZETTE</span></a>
    <div class="mast-meta"><strong>读一点，练一下。</strong><span>依据官方 0.9.5 文档 · 非官方学习站</span></div>
    </header>
    <nav class="topbar" aria-label="主导航"><div class="nav-tabs"><button data-route="courses" class="${route === 'courses' || route === 'learn' ? 'active' : ''}" ${route === 'courses' ? 'aria-current="page"' : ''}>课程地图</button><button data-route="reference" class="${route === 'reference' ? 'active' : ''}" ${route === 'reference' ? 'aria-current="page"' : ''}>速查目录</button><button data-route="recall" class="${route === 'recall' ? 'active' : ''}" ${route === 'recall' ? 'aria-current="page"' : ''}>场景回忆</button></div><div class="toolbar"><button data-modal="config">键位与导出</button><button data-modal="help">使用说明</button></div></nav>
    ${notice ? `<p class="notice" role="status">${escape(notice)}</p>` : ''}
    ${route !== 'courses' ? `<button class="mobile-index-toggle" data-command="index" aria-expanded="${drawer.open}" aria-controls="index-drawer">课程索引 · ${progress.completed.length}/${lessons.length}</button>` : ''}
    <div class="layout ${route === 'courses' ? 'map-layout' : route === 'learn' && current.type === 'practice' ? 'practice-layout' : ''}">${route !== 'courses' ? sidebar() : ''}<main id="main" class="main-column" tabindex="-1">${route === 'courses' ? courseMapMarkup() : route === 'learn' ? lessonMarkup() : route === 'reference' ? referenceMarkup() : quizMarkup()}</main>${route === 'learn' && current.type === 'practice' ? guideMarkup() : ''}</div>
    <footer class="page-footer"><span>HERDR 练习报 · 学习在此，执行在真实终端。</span><a href="https://herdr.dev/zh-cn/docs/" target="_blank" rel="noopener noreferrer">阅读官方文档 ↗</a></footer>`;
  for (const details of root.querySelectorAll('[data-group]')) details.addEventListener('toggle', () => {
    details.open ? openGroups.add(details.dataset.group) : openGroups.delete(details.dataset.group);
  });
  for (const panel of root.querySelectorAll('details[data-panel]')) panel.open = preserve && openPanels.includes(panel.dataset.panel);
  for (const code of root.querySelectorAll('pre')) { code.classList.add('scroll-section'); if (!code.closest('button')) code.tabIndex = 0; }
  if (restoreSimFocus) document.querySelector('#simulator')?.focus({ preventScroll: true });
  else if (activeCommand) root.querySelector(`[data-command="${CSS.escape(activeCommand)}"]`)?.focus({ preventScroll: true });
  };
  if (preserve) scroll.preserve(update);
  else update();
}
function heading(eyebrow, title, intro) {
  return `<header class="section-heading"><div class="eyebrow">${escape(eyebrow)}</div><h2>${escape(title)}</h2><p class="lead">${escape(intro)}</p></header>`;
}
function courseMapMarkup() {
  const descriptions = {
    '入门与概念': '先了解工具入口，以及会话、工作区、标签页与窗格的关系。',
    '窗格与前缀': '从前缀开始，动手分割、移动焦点与管理窗格。',
    '标签页与工作区': '把不同视图放进标签页，把不同项目放进工作区。',
    '会话与综合': '理解分离与重连，串起一套完整的工作台操作。',
    '智能体与持久化': '读懂智能体状态，分清进程持续运行与恢复的边界。',
    '配置与自动化': '安全修改配置，认识真实 CLI 与 API 的使用方式。',
  };
  return `${heading('CHOOSE YOUR NEXT LESSON', '课程地图', '从感兴趣的一课开始。全部课程开放，顺序只是建议，不必逐关完成。')}
    <div class="map-overview"><span>${groups.length} 个专题 · ${PRACTICES.length} 个实操 · ${READINGS.length} 篇阅读</span><span>已掌握 <strong>${progress.completed.length} / ${lessons.length}</strong></span></div>
    <div class="course-map">${groups.map((group, groupIndex) => {
      const items = lessons.filter(l => l.group === group);
      const done = items.filter(l => progress.completed.includes(l.id)).length;
      return `<section class="map-stage" aria-labelledby="stage-${groupIndex}"><header class="map-stage-heading"><span class="stage-number">${String(groupIndex + 1).padStart(2, '0')}</span><div><h3 id="stage-${groupIndex}">${escape(group)}</h3><p>${escape(descriptions[group])}</p></div><span class="stage-progress">${done} / ${items.length} 已掌握</span></header>
        <div class="course-grid">${items.map(l => {
          const completed = progress.completed.includes(l.id);
          return `<button class="course-choice ${completed ? 'is-complete' : ''}" data-lesson="${l.id}"><span class="choice-top"><span class="choice-number">${String(lessons.indexOf(l) + 1).padStart(2, '0')}</span><span>${l.type === 'practice' ? '实操' : '阅读'} · 约 ${l.minutes} 分钟</span></span><strong class="choice-title">${escape(l.title)}</strong><span class="choice-description">${escape(l.intro)}</span><span class="choice-bottom"><span>${completed ? '已掌握 ✓' : '待学习'}</span><span class="choice-action">${completed ? '再练一次' : l.type === 'practice' ? '开始练习' : '开始阅读'} →</span></span></button>`;
        }).join('')}</div></section>`;
    }).join('')}</div>`;
}
function lessonMarkup() {
  const done = progress.completed.includes(current.id);
  return `<div class="lesson-breadcrumb"><button class="text-button" data-route="courses">← 返回课程地图</button><span>所有课程均可自由选择</span></div>${heading(`${current.group} / LESSON ${String(lessons.indexOf(current) + 1).padStart(2, '0')}`, current.title, current.intro)}
    <div class="lesson-meta"><span class="tag">${current.type === 'practice' ? '布局实操' : '原理阅读'}</span><span>约 ${current.minutes} 分钟</span>${done ? '<span class="badge">已掌握 ✓</span>' : ''}${sourceLink(current.source)}</div>
    ${current.type === 'practice' ? practiceMarkup() : readingMarkup()}`;
}
function practiceMarkup() {
  const complete = stepIndex === current.steps.length && current.goal(state);
  const nextStep = current.steps[stepIndex];
  return `<div class="lesson-layout"><section class="practice-column" aria-label="交互练习">${simulatorMarkup()}
      <div class="sim-actions"><span class="section-label">屏幕按键</span><button class="key-button" data-key="prefix"><kbd>${escape(prefixLabel())}</kbd> 前缀</button><button class="key-button" data-key="escape"><kbd>Esc</kbd> 取消</button></div>
      <div class="key-controls">${[...new Set([...(nextStep && ACTION_KEYS[Object.keys(ACTION_KEYS).find(k => ACTION_KEYS[k] === nextStep.action)] ? [Object.keys(ACTION_KEYS).find(k => ACTION_KEYS[k] === nextStep.action)] : []), 'v', '-', 'h', 'j', 'k', 'l', 'c', 'n', 'p', 'z', 'w', '?', 'q', 'N', 'T', 'x', 'b'])].map(key => `<button class="key-button ${hints && nextStep?.action === ACTION_KEYS[key] ? 'suggested' : ''}" data-key="${escape(key)}" title="${escape(ACTION_NAMES[ACTION_KEYS[key]])}" ${!state.connected ? 'disabled' : ''}><kbd>${escape(keyForAction(ACTION_KEYS[key]))}</kbd><span>${escape(ACTION_NAMES[ACTION_KEYS[key]])}</span></button>`).join('')}</div>
      <p class="muted">先点前缀，再点动作。物理键盘只在演示区内生效；Tab 保留网页焦点导航。</p>
      ${!state.connected ? `<form class="command-form" id="reconnect-form"><label for="reconnect-input">在真实终端里会重新运行什么？</label><div><input id="reconnect-input" name="command" placeholder="输入连接命令" autocomplete="off" spellcheck="false" required><button class="primary" type="submit">连接模拟会话 ↵</button></div></form>` : ''}
      <p class="feedback ${feedback.kind}" role="status">${escape(feedback.text)}</p>
      ${complete ? '<div class="feedback success"><strong>本课完成 ✓</strong><br>步骤与当前布局均符合目标，进度已记录。</div>' : ''}
      <div class="lesson-footer"><button data-command="reset-practice">重新练习</button><span>${Math.min(stepIndex, current.steps.length)} / ${current.steps.length} 步</span><button class="${complete ? 'primary' : 'secondary'}" data-command="next-lesson">${complete ? '下一课 →' : '跳到下一课 →'}</button></div>
    </section></div>`;
}
function guideMarkup() {
  return `<aside class="lesson-guide" aria-label="本课指导"><header class="guide-heading"><h2>本课指导</h2></header><div class="section-label">本课目标</div><p class="objective">${escape(current.objective)}</p>
    <ol class="steps">${current.steps.map((s, index) => `<li class="${index < stepIndex ? 'done' : index === stepIndex ? 'current' : ''}"><span>${escape(s.label)}</span>${hints ? `<br><kbd>${escape(sequence(s.action))}</kbd>` : ''}</li>`).join('')}</ol>
    <button class="text-button" data-command="hints">${hints ? '隐藏按键提示' : '显示按键提示'}</button>
    <details class="answer" data-panel="explanation"><summary>为什么这样操作</summary><p>${escape(current.explanation)}</p></details>
    <details class="answer" data-panel="answer"><summary>查看答案（不代做）</summary><ol>${current.steps.map(s => `<li><code>${escape(sequence(s.action))}${s.value ? ` → ${escape(s.value)} → Enter` : ''}</code>${s.action === 'select-workspace' ? ' → 选择 field-notes' : ''}</li>`).join('')}</ol><p>${escape(current.objective)}</p></details>
    <p class="takeaway muted">${escape(current.takeaway)}</p></aside>`;
}
function treeMarkup(tree, focused, zoomed) {
  if (zoomed && tree.axis) return treeMarkup(panes(tree).find(p => p.id === focused), focused, false);
  if (tree.axis) return `<div class="split-tree ${tree.axis}">${treeMarkup(tree.first, focused, false)}${treeMarkup(tree.second, focused, false)}</div>`;
  return `<button class="pane ${tree.id === focused ? 'focused' : ''}" data-pane="${tree.id}" aria-label="窗格 ${tree.id}${tree.id === focused ? '，已聚焦' : ''}"><span class="pane-heading">${escape(tree.title)} <span>p${tree.id}${tree.id === focused ? ' · 当前焦点' : ''}</span></span><pre>${escape(tree.lines.join('\n'))}</pre></button>`;
}
function simulatorMarkup() {
  const w = workspace(state), t = tab(state);
  const modeNames = { terminal: '终端模式', prefix: 'PREFIX · 等待动作', help: '快捷键帮助', navigate: '工作区导航' };
  return `<div class="simulator" id="simulator" tabindex="0" role="group" aria-label="Herdr 布局模拟器；点击后接收练习按键" aria-describedby="simulation-disclaimer"><div class="sim-topline"><span>herdr / ${escape(w.label)}</span><span id="simulation-disclaimer">教学模拟 · 无真实进程</span></div><div class="sim-body">
    ${state.sidebar ? `<aside class="sim-sidebar" aria-label="模拟工作区"><div class="section-label">WORKSPACES</div>${state.workspaces.map(item => `<button class="workspace-link ${item.id === w.id ? 'active' : ''}" data-workspace="${item.id}" aria-current="${item.id === w.id ? 'true' : 'false'}"><span>${escape(item.label)}</span><small>${item.tabs.length} 个标签页</small></button>`).join('')}<div class="section-label">AGENTS</div><p class="muted">未运行智能体<br>真实状态在原生 Herdr 中查看</p></aside>` : ''}
    <div class="sim-main"><div class="sim-tabs" aria-label="模拟标签页">${w.tabs.map((item, i) => `<button class="${item.id === t.id ? 'active' : ''}" data-tab="${item.id}" aria-current="${item.id === t.id ? 'true' : 'false'}">${i + 1} ${escape(item.label)}</button>`).join('')}</div><div class="pane-area">${treeMarkup(t.tree, t.focusedPane, t.zoomed)}</div></div>
    ${!state.connected ? `<div class="sim-overlay"><section class="sim-panel"><div class="eyebrow">CLIENT DETACHED</div><h3>你离开了，工作不必结束。</h3><p>演示客户端已分离。下方输入 <code>herdr</code> 重新连接。</p><p class="muted">真实服务器可继续持有进程；本页只保留演示布局。</p></section></div>` : state.mode === 'help' ? `<div class="sim-overlay"><section class="sim-panel"><h3>快捷键帮助 · 本页实操范围</h3><p>每个动作前先按 <kbd>${escape(prefixLabel())}</kbd>。</p><div class="reference-list">${Object.entries(ACTION_KEYS).map(([key, action]) => `<div><kbd>${escape(keyForAction(action))}</kbd> ${escape(ACTION_NAMES[action])}</div>`).join('')}</div><p class="muted">这不是完整原生键表。更多动作请查看官方文档。</p><button data-key="escape">Esc 关闭帮助</button></section></div>` : state.mode === 'navigate' ? `<div class="sim-overlay"><section class="sim-panel"><h3>选择工作区</h3><p class="muted">↑ / ↓ 选择，Enter 确认，Esc 取消。</p>${state.workspaces.map((item, i) => `<button class="workspace-link ${i === navigationIndex ? 'active' : ''}" data-workspace="${item.id}">${escape(item.label)} <small>${item.tabs.length} 个标签页</small></button>`).join('')}<button data-key="escape">Esc 取消</button></section></div>` : ''}
    </div><div class="sim-status"><span class="mode-badge">${state.connected ? modeNames[state.mode] : '已分离'}</span><span class="key-history">${escape(keyHistory.slice(-5).join('  →  ') || '等待输入')}</span><span>${panes(t.tree).length} 个窗格${t.zoomed ? ' · 已缩放' : ''}</span></div></div>`;
}
function readingMarkup() {
  return `<article class="reading">${current.sections.map(section => `<section class="reading-section"><h3>${escape(section.title)}</h3><p>${escape(section.text)}</p>${section.code ? `<pre><code>${escape(section.code)}</code></pre>` : ''}${section.bullets ? `<ul>${section.bullets.map(b => `<li>${escape(b)}</li>`).join('')}</ul>` : ''}</section>`).join('')}<div class="feedback"><strong>读懂了，试着回忆一下。</strong><p>答对本课关联问题才会记录课程完成；仅展开内容或查看答案不计入。</p><button class="primary" data-route="recall/${current.questionId}?from=${current.id}">本课自测 →</button></div><div class="lesson-footer"><span>命令示例需在真实终端中执行</span><button data-command="next-lesson">下一课 →</button></div></article>`;
}
function referenceMarkup() {
  const query = referenceQuery.toLowerCase().trim();
  const filtered = REFERENCES.filter(item => (!referenceKind || item.kind === referenceKind) && `${item.title} ${item.syntax} ${item.description} ${item.category}`.toLowerCase().includes(query));
  return `${heading('THE DESK REFERENCE', '用到时，再来查。', '常用快捷键、CLI 与配置的精选速查；不是完整原生命令目录。快捷键按官方默认 Ctrl+B 展示。')}
    <form class="reference-tools" id="reference-search" role="search"><label><span class="section-label">搜索</span><input name="query" id="reference-query" type="search" value="${escape(referenceQuery)}" placeholder="搜索分割、会话、remote…" autocomplete="off"></label><label><span class="section-label">类型</span><select name="kind" id="reference-kind"><option value="">全部类型</option>${['快捷键', '命令', '配置'].map(k => `<option ${referenceKind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label></form>
    <p class="muted" id="reference-count">显示 ${filtered.length} / ${REFERENCES.length} 项 · 命令仅供查阅，不会在网页执行。</p><div class="reference-list" id="reference-results">${referenceRows(filtered)}</div>`;
}
function referenceRows(items) {
  return items.length ? items.map(item => `<article class="reference-row"><div class="reference-key"><span class="reference-category">${escape(item.kind)} / ${escape(item.category)}</span><h3>${escape(item.title)}</h3><code>${escape(item.syntax)}</code></div><div class="reference-description"><p>${escape(item.description)}</p>${sourceLink(item.source)}</div></article>`).join('') : '<p class="empty-state">没有匹配项。试试“窗格”“prefix”或清空搜索。</p>';
}
function quizMarkup() {
  const answered = quizResult === 'correct';
  return `${heading('RECALL, NOT REPEAT', '把操作，变成自己的判断。', '从具体场景中选择下一步。答对才记掌握，查看答案不会代你完成。')}
    <div class="quiz-counter"><span>第 ${QUESTIONS.indexOf(question) + 1} / ${QUESTIONS.length} 题 · ${escape(question.group)}</span><span>已掌握 ${progress.mastered.length} / ${QUESTIONS.length}</span></div>
    <section class="quiz-panel"><h3>${escape(question.question)}</h3><div class="quiz-options">${question.options.map((option, i) => `<button data-option="${i}" aria-pressed="${selected === i}" class="${selected === i ? 'selected' : ''} ${answered && i === question.answer ? 'correct' : quizResult === 'wrong' && selected === i ? 'incorrect' : ''}" ${answered || revealed ? 'disabled' : ''}><span class="mono">${String.fromCharCode(65 + i)}.</span> ${escape(option)}</button>`).join('')}</div>
    <div class="sim-actions"><button class="primary" data-command="check-answer" ${selected === null || answered || revealed ? 'disabled' : ''}>检查答案</button><button data-command="reveal-answer" ${answered || revealed ? 'disabled' : ''}>查看答案</button>${revealed ? '<button data-command="retry-question">重新作答</button>' : ''}</div>
    ${quizResult || revealed ? `<div class="explanation feedback ${answered ? 'success' : quizResult === 'wrong' ? 'error' : ''}" role="status"><strong>${answered ? '答对了，已记掌握 ✓' : revealed ? `答案：${String.fromCharCode(65 + question.answer)}（本次不记掌握）` : '还不对。读完解析，可以重新选择。'}</strong><p>${escape(question.explanation)}</p>${sourceLink(question.source)}</div>` : ''}
    <div class="lesson-footer">${returnLesson && lessons.some(l => l.id === returnLesson) ? `<button data-route="learn/${returnLesson}">← 返回本课</button>` : sourceLink(question.source)}<button data-command="next-question">${answered ? '下一道未掌握题 →' : '跳过，下一题 →'}</button></div></section>
    <details class="answer"><summary>选择其他问题</summary><div class="reference-list">${QUESTIONS.map((q, i) => `<button class="lesson-link" data-route="recall/${q.id}"><span class="lesson-number">${progress.mastered.includes(q.id) ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="lesson-title">${escape(q.question)}</span></button>`).join('')}</div></details>`;
}

function perform(action, value) {
  if (route !== 'learn' || current.type !== 'practice') return;
  const result = applyAction(state, action, value);
  state = result.state;
  const previous = stepIndex;
  if (result.changed) stepIndex = advanceStep(current, stepIndex, action, state);
  const complete = stepIndex === current.steps.length && current.goal(state);
  feedback = { kind: complete ? 'success' : !result.changed ? 'error' : '', text: result.message };
  if (stepIndex > previous && !complete) feedback.text += ` · 第 ${stepIndex} 步完成。`;
  if (complete) markCompleted(current.id);
  if (stepIndex === current.steps.length && !current.goal(state)) feedback = { kind: 'error', text: '步骤做过了，但当前状态不符合本课目标。请修正布局，或重新练习。' };
  render();
}
function sendKey(key, value) {
  if (!state || current.type !== 'practice') return;
  keyHistory.push(key === 'prefix' ? prefixLabel() : key === 'escape' ? 'Esc' : key);
  if (key === 'prefix' || key === 'escape') { perform(key); return; }
  if (!state.connected) { feedback = { kind: 'error', text: '请先输入 herdr 重新连接。' }; render(); return; }
  if (state.mode !== 'prefix') {
    feedback = { kind: 'error', text: `先按 ${prefixLabel()}，松开，再按动作键。终端模式下的普通按键属于窗格内程序；本页不执行它。` };
    render(); return;
  }
  const action = ACTION_KEYS[key];
  if (!action && !value) {
    state = applyAction(state, 'escape').state;
    feedback = { kind: 'error', text: `未收录动作 ${key}，已取消前缀。` }; render(); return;
  }
  requestAction(action || 'select-tab', value);
}
function requestAction(action, value) {
  if (['rename-tab', 'rename-workspace', 'new-workspace'].includes(action)) {
    state = applyAction(state, 'escape').state;
    const existing = action === 'rename-tab' ? tab(state).label : action === 'rename-workspace' ? workspace(state).label : '';
    showDialog(`<div class="dialog-heading"><h2>${escape(ACTION_NAMES[action])}</h2></div><form id="name-form"><label for="item-name">${action === 'new-workspace' ? '演示工作区名称' : '新名称'}</label><input id="item-name" name="name" maxlength="40" required value="${escape(existing)}" autocomplete="off"><p class="muted">教学简化输入，不创建真实目录、终端或 worktree。</p><div class="dialog-actions"><button type="button" data-close>取消</button><button type="submit" class="primary">确认 ↵</button></div></form>`, event => {
      if (event.target.id !== 'name-form') return;
      const name = new FormData(event.target).get('name').trim();
      if (!name) return;
      closeDialog(); perform(action, name); document.querySelector('#simulator')?.focus({ preventScroll: true });
    });
    document.querySelector('#item-name').select();
  } else if (action === 'close-pane') {
    state = applyAction(state, 'escape').state;
    showDialog('<div class="dialog-heading"><h2>关闭这个演示窗格？</h2></div><p>在真实 Herdr 中，关闭窗格会结束它的终端。要让工作继续，请改用分离客户端。</p><p class="muted">本页的确认是教学保护，不会终止电脑上的任何进程。</p><form id="close-pane-form"><div class="dialog-actions"><button type="button" data-close>取消</button><button class="primary" type="submit">关闭演示窗格</button></div></form>', event => {
      if (event.target.id !== 'close-pane-form') return;
      closeDialog(); perform(action); document.querySelector('#simulator')?.focus({ preventScroll: true });
    });
  } else {
    if (action === 'navigate') navigationIndex = state.workspaces.findIndex(w => w.id === state.activeWorkspace);
    perform(action, value);
  }
}
function showDialog(markup, onSubmit = null) {
  modalTrigger = document.activeElement;
  modalSubmit = onSubmit;
  dialog.innerHTML = markup;
  for (const code of dialog.querySelectorAll('pre')) { code.classList.add('scroll-section'); code.tabIndex = 0; }
  if (!dialog.open) dialog.showModal();
  scroll.setOverlay(true);
}
function closeDialog() { dialog.close(); }
listen(dialog, 'close', () => {
  scroll.setOverlay(drawer.open);
  modalSubmit = null;
  if (modalTrigger?.isConnected) modalTrigger.focus({ preventScroll: true });
  else document.querySelector('#simulator')?.focus({ preventScroll: true });
});
listen(dialog, 'click', event => { if (event.target.closest('[data-close]')) closeDialog(); });
listen(dialog, 'submit', event => { event.preventDefault(); modalSubmit?.(event); });
function openHelp() {
  showDialog(`<div class="dialog-heading"><h2>这是一份可以动手的学习报。</h2><button data-close aria-label="关闭使用说明">关闭 ×</button></div><div class="reading"><h3>三条学习路径</h3><ul><li>课程地图：${READINGS.length} 篇原理阅读、${PRACTICES.length} 个布局实操。全部开放，点击任意课程即可开始；完成记录只标记进度，不限制选课。</li><li>速查目录：${REFERENCES.length} 个精选快捷键、CLI 与配置条目；不是完整目录。</li><li>场景回忆：${QUESTIONS.length} 道独立问题，答对记录掌握；阅读课通过关联自测记完成。</li></ul><h3>如何实操</h3><p>点击演示终端后，按下并松开 <kbd>${escape(prefixLabel())}</kbd>，再按动作键。或者依次点屏幕前缀与动作按钮。仅演示区捕获快捷键，Tab 保留网页导航。命名输入框支持中文输入与 Enter。</p><h3>范围与限制</h3><p>这是非官方、基于官方 0.9.5 文档的学习应用，不是 Herdr 终端克隆。只模拟布局、焦点、标签页、工作区和分离状态。不运行 shell、AI、SSH、socket API、复制模式或 worktree。新建工作区、导航与关闭确认采用教学简化；资源数有练习上限。</p><p>“查看答案”不执行操作、不记完成。错误的受支持动作会真实改变本页状态。已掌握记录保留，重新练习不删除历史掌握。</p><h3>本地记录</h3><p>进度与练习前缀保存在此浏览器 localStorage。不保存真实终端内容、凭据或提示词，不与服务器同步。刷新重置当前模拟布局，不清除掌握记录。</p>${sourceLink('https://herdr.dev/zh-cn/docs/')}</div>`);
}
function openConfig() {
  showDialog(`<div class="dialog-heading"><h2>练习前缀与配置导出</h2><button data-close aria-label="关闭键位设置">关闭 ×</button></div><form id="config-form"><label for="prefix-choice">本页实操使用的前缀</label><select name="prefix" id="prefix-choice">${PREFIXES.map(p => `<option value="${p}" ${p === progress.prefix ? 'selected' : ''}>${p}</option>`).join('')}</select><p class="muted">只修改学习站的前缀；速查与阅读仍标注官方默认值。不会更改真实 Herdr。前缀改变会重置本课演示，不清除掌握记录。</p><div class="dialog-actions"><button type="submit" class="primary">保存练习前缀</button></div></form><h3>合并到真实配置</h3><p>路径：<code>~/.config/herdr/config.toml</code>。先备份，合并到已有 <code>[keys]</code>；不要覆盖整个文件，也不要重复表头。</p><div class="config-preview"><pre id="config-code">${escape(exportConfig(progress.prefix))}</pre></div><div class="dialog-actions"><button data-dialog-action="copy-config">复制片段</button><button data-dialog-action="download-config">下载 herdr-keys.toml</button></div><p id="config-status" role="status"></p><p>原生 Herdr 的 UI 全局菜单 <code>reload config</code> 可更新客户端与选中服务器的配置；CLI <code>herdr server reload-config</code> 重载服务器设置。</p>${sourceLink('https://herdr.dev/zh-cn/docs/configuration/')}`, event => {
    if (event.target.id !== 'config-form') return;
    const prefix = new FormData(event.target).get('prefix');
    if (!PREFIXES.includes(prefix)) return;
    progress.prefix = prefix; persist();
    if (current.type === 'practice') { state = initialFor(current); stepIndex = 0; keyHistory = []; feedback = { kind: '', text: `练习前缀已改为 ${prefixLabel()}。` }; }
    render(); document.querySelector('#config-code').textContent = exportConfig(prefix);
    document.querySelector('#config-status').textContent = '已保存。本页提示、按键匹配与导出使用同一前缀。';
  });
}
listen(dialog, 'click', async event => {
  const action = event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
  if (!action) return;
  if (action === 'download-config') {
    const url = URL.createObjectURL(new Blob([exportConfig(progress.prefix)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'herdr-keys.toml'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector('#config-status').textContent = '已请求下载；请在浏览器下载列表中查看。';
  } else {
    try { await navigator.clipboard.writeText(exportConfig(progress.prefix)); document.querySelector('#config-status').textContent = '已复制配置片段。'; }
    catch { document.querySelector('#config-status').textContent = '剪贴板不可用。请手动选择上方片段复制，或下载文件。'; }
  }
});
function checkAnswer() {
  if (selected === null || revealed || quizResult === 'correct') return;
  quizResult = selected === question.answer ? 'correct' : 'wrong';
  if (quizResult === 'correct') {
    if (!progress.mastered.includes(question.id)) progress.mastered.push(question.id);
    for (const lesson of READINGS) if (lesson.questionId === question.id) markCompleted(lesson.id);
    persist();
  }
  render();
}
function nextQuestion() {
  const index = QUESTIONS.indexOf(question);
  let next;
  for (let offset = 1; offset <= QUESTIONS.length; offset++) {
    const candidate = QUESTIONS[(index + offset) % QUESTIONS.length];
    if (!progress.mastered.includes(candidate.id)) { next = candidate; break; }
  }
  next ||= QUESTIONS[(index + 1) % QUESTIONS.length];
  navigate(`recall/${next.id}`);
}
function nextLesson() { navigate(`learn/${lessons[(lessons.indexOf(current) + 1) % lessons.length].id}`); }
listen(root, 'click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    navigate(anchor.hash.slice(1));
    return;
  }
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.lesson) { navigate(`learn/${target.dataset.lesson}`); return; }
  if (target.dataset.route) { navigate(target.dataset.route); return; }
  if (target.dataset.modal) { target.dataset.modal === 'config' ? openConfig() : openHelp(); return; }
  if (target.dataset.key) { sendKey(target.dataset.key); return; }
  if (target.dataset.workspace) { if (state.connected) perform('select-workspace', target.dataset.workspace); return; }
  if (target.dataset.tab) { if (state.connected) perform('select-tab', target.dataset.tab); return; }
  if (target.dataset.pane) { if (state.connected && state.mode !== 'help' && state.mode !== 'navigate') perform('select-pane', target.dataset.pane); return; }
  if (target.dataset.option !== undefined) {
    selected = Number(target.dataset.option); quizResult = ''; render();
    document.querySelector(`[data-option="${selected}"]`)?.focus({ preventScroll: true }); return;
  }
  switch (target.dataset.command) {
    case 'index': openIndexDrawer(); break;
    case 'hints': hints = !hints; render(); break;
    case 'reset-practice': state = initialFor(current); stepIndex = 0; keyHistory = []; feedback = { kind: '', text: '已恢复本课初始布局，历史掌握记录保留。' }; render(); break;
    case 'next-lesson': nextLesson(); break;
    case 'check-answer': checkAnswer(); break;
    case 'reveal-answer': revealed = true; quizResult = ''; render(); break;
    case 'retry-question': revealed = false; selected = null; quizResult = ''; render(); break;
    case 'next-question': nextQuestion(); break;
  }
});
listen(root, 'keydown', event => {
  if (event.key === 'Tab' || !event.target.closest('#simulator') || dialog.open) return;
  if (!state.connected) return;
  if (state.mode === 'navigate' && ['ArrowUp', 'ArrowDown', 'j', 'k', 'Enter'].includes(event.key)) {
    event.preventDefault();
    if (event.key === 'Enter') perform('select-workspace', state.workspaces[navigationIndex].id);
    else { navigationIndex = Math.max(0, Math.min(state.workspaces.length - 1, navigationIndex + (event.key === 'ArrowDown' || event.key === 'j' ? 1 : -1))); render(); }
    return;
  }
  const resolved = resolveKey(state, event, progress.prefix);
  if (!resolved) {
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); feedback = { kind: '', text: '终端模式的文字属于窗格内程序。本页不执行命令，请先按前缀键。' }; render(); }
    return;
  }
  event.preventDefault();
  if (resolved.action === 'prefix' || resolved.action === 'escape') sendKey(resolved.action);
  else if (resolved.action === 'invalid') { state = applyAction(state, 'escape').state; feedback = { kind: 'error', text: resolved.message }; render(); }
  else { keyHistory.push(event.key); requestAction(resolved.action, resolved.value); }
});
listen(root, 'submit', event => {
  event.preventDefault();
  if (event.target.id === 'reconnect-form') {
    if (new FormData(event.target).get('command').trim() === 'herdr') { keyHistory.push('herdr ↵'); perform('reconnect'); document.querySelector('#simulator')?.focus({ preventScroll: true }); }
    else { feedback = { kind: 'error', text: '这里只接受 herdr，用来连接同一个模拟会话。不会执行其他 shell 命令。' }; document.querySelector('.feedback[role="status"]').textContent = feedback.text; }
  }
});
function updateReference() {
  referenceQuery = document.querySelector('#reference-query').value;
  referenceKind = document.querySelector('#reference-kind').value;
  const query = referenceQuery.toLowerCase().trim();
  const filtered = REFERENCES.filter(item => (!referenceKind || item.kind === referenceKind) && `${item.title} ${item.syntax} ${item.description} ${item.category}`.toLowerCase().includes(query));
  document.querySelector('#reference-results').innerHTML = referenceRows(filtered);
  document.querySelector('#reference-count').textContent = `显示 ${filtered.length} / ${REFERENCES.length} 项 · 命令仅供查阅，不会在网页执行。`;
  const params = new URLSearchParams(); if (referenceQuery) params.set('q', referenceQuery); if (referenceKind) params.set('kind', referenceKind);
  navigation.replace(`reference${params.size ? `?${params}` : ''}`);
}
listen(root, 'input', event => { if (event.target.id === 'reference-query') updateReference(); });
listen(root, 'change', event => { if (event.target.id === 'reference-kind') updateReference(); });
listen(document.querySelector('.skip-link'), 'click', event => {
  event.preventDefault();
  scroll.scrollToAnchor(document.querySelector('#main'), { smooth: false, focus: true });
});
navigation = createNavigation({
  history, location, events: window, scroll, renderRoute: readRoute,
  beforeNavigate: () => {
    if (dialog.open) dialog.close();
    if (drawer.open) drawer.close();
    scroll.setOverlay(false);
  },
});
listen(backTop, 'click', () => scroll.top(true));
const stopObserving = scroll.observe(scrollRoot, top => { backTop.hidden = top <= 600; });
function dispose() {
  lifecycle.abort();
  stopObserving();
  navigation.dispose();
  scroll.dispose();
  narrow.removeEventListener('change', closeNarrowDrawer);
}
listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
if (import.meta.hot) import.meta.hot.dispose(dispose);
navigation.start();

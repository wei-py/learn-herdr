import { defineStore } from 'pinia';
import { toRaw } from 'vue';
import XEUtils from 'xe-utils';

import { ACTION_KEYS, ACTION_NAMES, applyAction, keyForAction, resolveKey, tab, workspace } from '../domain/engine.js';
import { QUESTIONS, READINGS, REFERENCES } from '../domain/knowledge.js';
import { advanceStep, initialFor, PRACTICES } from '../domain/lessons.js';
import { exportConfig, loadProgress, PREFIXES, saveProgress } from '../domain/progress.js';
import { navigate, replaceReference } from '../router/index.js';

/**
 * 保留原标识与顺序的课程目录。
 * @type {import('./types.js').Lesson[]}
 */
export const lessons = [READINGS[0], READINGS[1], ...PRACTICES, ...READINGS.slice(2)];
/**
 * 获取存储适配器，禁止存储时仍允许练习。
 * @returns {Pick<Storage,'getItem'|'setItem'>} 浏览器存储接口。
 */
function storage() {
  try { return window.localStorage; }
  catch { return { /**
   * 在浏览器禁止存储时向读取进度的领域逻辑报告失败。
   * @returns {never} 提示禁止读取。
   */ getItem() { throw new Error('无法访问本地存储'); }, /**
    * 在浏览器禁止存储时向保存进度的领域逻辑报告失败。
   * @returns {never} 提示禁止写入。
   */ setItem() { throw new Error('无法访问本地存储'); } }; }
}
/**
 * 提取课程持久化标识。
 * @param {import('./types.js').Lesson} lesson 课程条目。
 * @returns {string} 保存标识。
 */
function lessonId(lesson) { return lesson.id; }
/**
 * 提取问题持久化标识。
 * @param {import('./types.js').Question} question 问题条目。
 * @returns {string} 保存标识。
 */
function questionId(question) { return question.id; }
/**
 * 使用统一工具按持久化标识查询课程。
 * @param {string} id 课程标识。
 * @returns {import('./types.js').Lesson|undefined} 匹配课程。
 */
function lessonById(id) {
  return XEUtils.find(lessons, /**
   * 按持久化标识匹配目录中的条目。
   * @param {import('./types.js').Lesson} lesson 候选课程。
   * @returns {boolean} 标识是否匹配。
   */ (lesson) => lesson.id === id);
}
/**
 * 使用统一工具按持久化标识查询回忆题。
 * @param {string} id 问题标识。
 * @returns {import('./types.js').Question|undefined} 匹配问题。
 */
function questionById(id) {
  return XEUtils.find(QUESTIONS, /**
   * 按持久化标识匹配目录中的条目。
   * @param {import('./types.js').Question} question 候选问题。
   * @returns {boolean} 标识是否匹配。
   */ (question) => question.id === id);
}
/**
 * 从兼容存储格式初始化应用状态。
 * @returns {import('./types.js').LearningState} 初始应用状态。
 */
function initialState() {
  /**
   * 本地进度。
   * @type {import('./types.js').Progress}
   */
  const progress = loadProgress(storage(), lessons.map(lessonId), QUESTIONS.map(questionId));
  return { progress, notice: progress.warning, currentId: PRACTICES[0].id, session: initialFor(PRACTICES[0]), stepIndex: 0,
    feedback: { kind: '', text: '点击演示终端，按前缀键开始；也可使用下面的屏幕按键。' }, keyHistory: [], hints: true,
    route: 'courses', questionId: QUESTIONS[0].id, selected: null, quizResult: '', revealed: false, returnLesson: null,
    referenceQuery: '', referenceKind: '', navigationIndex: 0, dialog: '', pendingAction: '', name: '', reconnectCommand: '',
    prefixDraft: progress.prefix, configStatus: '', entry: { key: '', hash: '' }, routeRevision: 0, restoreKey: '', rememberedLists: {} };
}
/**
 * 全局学习会话、表单、路由与进度状态。
 * @type {ReturnType<typeof defineStore>}
 */
export const useLearningStore = defineStore('herdr-learning', {
  state: initialState,
  getters: {
    /**
     * 获取当前课程。
     * @param {import('./types.js').LearningState} state 应用状态。
     * @returns {import('./types.js').Lesson} 当前课程。
     */
    current(state) { return lessonById(state.currentId) || PRACTICES[0]; },
    /**
     * 获取当前回忆题。
     * @param {import('./types.js').LearningState} state 应用状态。
     * @returns {import('./types.js').Question} 当前问题。
     */
    question(state) { return questionById(state.questionId) || QUESTIONS[0]; },
    /**
     * 格式化选定前缀。
     * @param {import('./types.js').LearningState} state 应用状态。
     * @returns {string} 前缀标签。
     */
    prefixLabel(state) { return state.progress.prefix.replace('ctrl', 'Ctrl').toUpperCase().replace('CTRL', 'Ctrl'); },
    /**
     * 同步导出配置。
     * @param {import('./types.js').LearningState} state 应用状态。
     * @returns {string} 配置片段。
     */
    config(state) { return exportConfig(state.progress.prefix); },
    /**
     * 筛选原有速查数据。
     * @param {import('./types.js').LearningState} state 应用状态。
     * @returns {import('./types.js').Reference[]} 匹配条目。
     */
    filteredReferences(state) {
      /**
       * 搜索词去除首尾空白并忽略大小写后的匹配文本。
       * @type {string}
       */ const query = state.referenceQuery.toLowerCase().trim();
      return REFERENCES.filter(/**
       * 按当前类型和关键词筛选速查条目。
       * @param {import('./types.js').Reference} item 速查条目。
       * @returns {boolean} 是否匹配搜索。
       */ (item) => (!state.referenceKind || item.kind === state.referenceKind) && `${item.title} ${item.syntax} ${item.description} ${item.category}`.toLowerCase().includes(query));
    },
  },
  actions: {
    /**
     * 保存兼容格式并展示失败原因。
     * @returns {void}
     */
    persist() { /**
     * 本次保存失败时需要呈现的本地存储警告。
     * @type {string}
     */ const warning = saveProgress(storage(), this.progress); if (warning) this.notice = warning; },
    /**
     * 每课只记录一次完成。
     * @param {string} id 课程标识。
     * @returns {void}
     */
    markCompleted(id) { if (!this.progress.completed.includes(id)) { this.progress.completed.push(id); this.persist(); } },
    /**
     * 格式化动作教学按键。
     * @param {string} action 引擎动作。
     * @returns {string} 按键序列。
     */
    sequence(action) { return action === 'prefix' ? this.prefixLabel : action === 'escape' ? 'Esc' : action === 'reconnect' ? 'herdr ↵' : `${this.prefixLabel} → ${keyForAction(action)}`; },
    /**
     * 解析地址而不修改课程标识。
     * @param {string} hash 规范化路由片段。
     * @returns {void}
     */
    readRoute(hash) {
      /**
       * 将公开哈希拆为课程路径与查询字符串。
       * @type {string[]}
       */ const parts = hash.split('?');
      /**
       * 路径中的栏目及课程或问题标识。
       * @type {string[]}
       */ const path = parts[0].split('/');
      /**
       * 速查筛选及阅读课回忆来源的地址参数。
       * @type {URLSearchParams}
       */ const params = new URLSearchParams(parts[1] || '');
      this.dialog = '';
      if (path[0] === 'courses') this.route = 'courses';
      else if (path[0] === 'reference') { this.route = 'reference'; this.referenceQuery = params.get('q') || ''; this.referenceKind = params.get('kind') || ''; }
      else if (path[0] === 'recall') {
        this.route = 'recall';
        this.questionId = questionById(path[1])?.id || QUESTIONS.find(/**
         * 定位尚未掌握的回忆题。
         * @param {import('./types.js').Question} item 候选问题。
         * @returns {boolean} 尚未掌握。
         */ (item) => !this.progress.mastered.includes(item.id))?.id || QUESTIONS[0].id;
        this.retryQuestion(); this.returnLesson = params.get('from');
      } else { this.route = 'learn'; this.currentId = lessonById(path[1])?.id || PRACTICES[0].id; this.resetPractice(); }
      this.routeRevision++;
    },
    /**
     * 切换课程或列表并保留历史位置。
     * @param {string} hash 目标地址片段。
     * @returns {void}
     */
    navigate(hash) { navigate(this, hash); },
    /**
     * 将共享顶栏路由转为兼容地址。
     * @param {string} route 顶栏路由。
     * @returns {void}
     */
    navigateShell(route) { this.navigate(({ map: 'courses', practice: `learn/${this.currentId}`, library: 'reference', recall: 'recall' })[route] || 'courses'); },
    /**
     * 生成保留搜索语义的速查地址。
     * @returns {string} 速查路由。
     */
    referenceHash() { /**
     * 搜索参数。
     * @type {URLSearchParams}
     */ const params = new URLSearchParams(); if (this.referenceQuery) params.set('q', this.referenceQuery); if (this.referenceKind) params.set('kind', this.referenceKind); params.sort(); return `reference${params.size ? `?${params}` : ''}`; },
    /**
     * 更新搜索地址而不重置页面位置。
     * @returns {void}
     */
    updateReference() { replaceReference(this); },
    /**
     * 只重置本课演示，不清除历史掌握记录。
     * @returns {void}
     */
    resetPractice() { if (this.current.type === 'practice') this.session = initialFor(this.current); this.stepIndex = 0; this.keyHistory = []; this.reconnectCommand = ''; this.feedback = { kind: '', text: '已恢复本课初始布局，历史掌握记录保留。' }; },
    /**
     * 执行动作并检查步骤及最终目标。
     * @param {string} action 引擎动作。
     * @param {string|number} [value] 动作参数。
     * @returns {void}
     */
    perform(action, value) {
      if (this.route !== 'learn' || this.current.type !== 'practice') return;
      /**
       * 纯引擎结果。
       * @type {ReturnType<typeof applyAction>}
       */
      const result = applyAction(toRaw(this.session), action, value);
      /**
       * 动作前的步骤进度。
       * @type {number}
       */
      const previous = this.stepIndex;
      this.session = result.state;
      if (result.changed) this.stepIndex = advanceStep(this.current, this.stepIndex, action, this.session);
      /**
       * 步骤和当前状态均符合目标。
       * @type {boolean}
       */
      const complete = this.stepIndex === this.current.steps.length && this.current.goal(this.session);
      this.feedback = { kind: complete ? 'success' : !result.changed ? 'error' : '', text: result.message };
      if (this.stepIndex > previous && !complete) this.feedback.text += ` · 第 ${this.stepIndex} 步完成。`;
      if (complete) this.markCompleted(this.current.id);
      if (this.stepIndex === this.current.steps.length && !this.current.goal(this.session)) this.feedback = { kind: 'error', text: '步骤做过了，但当前状态不符合本课目标。请修正布局，或重新练习。' };
    },
    /**
     * 在命名和关闭动作前请求确认。
     * @param {string} action 引擎动作。
     * @param {string|number} [value] 动作参数。
     * @returns {void}
     */
    requestAction(action, value) {
      if (['rename-tab', 'rename-workspace', 'new-workspace', 'close-pane'].includes(action)) {
        this.session = applyAction(toRaw(this.session), 'escape').state;
        this.pendingAction = action; this.name = action === 'rename-tab' ? tab(this.session).label : action === 'rename-workspace' ? workspace(this.session).label : '';
        this.dialog = action === 'close-pane' ? 'close' : 'name';
      } else { if (action === 'navigate') this.navigationIndex = this.session.workspaces.findIndex(/**
       * 在模拟器工作区列表中定位当前工作区。
       * @param {import('../domain/types.js').Workspace} item 工作区。
       * @returns {boolean} 当前工作区。
       */ (item) => item.id === this.session.activeWorkspace); this.perform(action, value); }
    },
    /**
     * 确认受保护的演示动作。
     * @returns {void}
     */
    confirmAction() { if (this.dialog === 'name' && !this.name.trim()) return; this.perform(this.pendingAction, this.dialog === 'name' ? this.name.trim() : undefined); this.dialog = ''; },
    /**
     * 派发屏幕前缀或动作键。
     * @param {string} key 屏幕按键。
     * @returns {void}
     */
    sendKey(key) {
      this.keyHistory.push(key === 'prefix' ? this.prefixLabel : key === 'escape' ? 'Esc' : key);
      if (key === 'prefix' || key === 'escape') { this.perform(key); return; }
      if (!this.session.connected) { this.feedback = { kind: 'error', text: '请先输入 herdr 重新连接。' }; return; }
      if (this.session.mode !== 'prefix') { this.feedback = { kind: 'error', text: `先按 ${this.prefixLabel}，松开，再按动作键。终端模式下的普通按键属于窗格内程序；本页不执行它。` }; return; }
      /**
       * 当前屏幕按键映射到的受支持引擎动作。
       * @type {string|undefined}
       */ const action = ACTION_KEYS[key];
      if (!action) { this.perform('escape'); this.feedback = { kind: 'error', text: `未收录动作 ${key}，已取消前缀。` }; return; }
      this.requestAction(action);
    },
    /**
     * 只处理模拟器内部的物理键盘事件。
     * @param {KeyboardEvent} event 键盘事件。
     * @returns {void}
     */
    handleKeyboard(event) {
      if (event.key === 'Tab' || event.isComposing || this.dialog || !this.session.connected) return;
      if (this.session.mode === 'navigate' && ['ArrowUp', 'ArrowDown', 'j', 'k', 'Enter'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Enter') this.perform('select-workspace', this.session.workspaces[this.navigationIndex].id);
        else this.navigationIndex = Math.max(0, Math.min(this.session.workspaces.length - 1, this.navigationIndex + (event.key === 'ArrowDown' || event.key === 'j' ? 1 : -1)));
        return;
      }
      /**
       * 物理键盘在当前前缀及模拟器模式下的解析结果。
       * @type {ReturnType<typeof resolveKey>}
       */ const resolved = resolveKey(this.session, event, this.progress.prefix);
      if (!resolved) { if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); this.feedback = { kind: '', text: '终端模式的文字属于窗格内程序。本页不执行命令，请先按前缀键。' }; } return; }
      event.preventDefault();
      if (resolved.action === 'prefix' || resolved.action === 'escape') this.sendKey(resolved.action);
      else if (resolved.action === 'invalid') { this.perform('escape'); this.feedback = { kind: 'error', text: resolved.message }; }
      else { this.keyHistory.push(event.key); this.requestAction(resolved.action, resolved.value); }
    },
    /**
     * 只接受演示重连命令。
     * @returns {void}
     */
    reconnect() { if (this.reconnectCommand.trim() === 'herdr') { this.keyHistory.push('herdr ↵'); this.perform('reconnect'); this.reconnectCommand = ''; } else this.feedback = { kind: 'error', text: '这里只接受 herdr，用来连接同一个模拟会话。不会执行其他 shell 命令。' }; },
    /**
     * 打开原目录中的下一课。
     * @returns {void}
     */
    nextLesson() { this.navigate(`learn/${lessons[(lessons.indexOf(this.current) + 1) % lessons.length].id}`); },
    /**
     * 选择答案但不直接记录掌握。
     * @param {number} index 答案序号。
     * @returns {void}
     */
    selectAnswer(index) { this.selected = index; this.quizResult = ''; },
    /**
     * 重置本次作答，保留历史掌握记录。
     * @returns {void}
     */
    retryQuestion() { this.selected = null; this.quizResult = ''; this.revealed = false; },
    /**
     * 检查答案并同步关联阅读课的完成记录。
     * @returns {void}
     */
    checkAnswer() {
      if (this.selected === null || this.revealed || this.quizResult === 'correct') return;
      this.quizResult = this.selected === this.question.answer ? 'correct' : 'wrong';
      if (this.quizResult === 'correct') { if (!this.progress.mastered.includes(this.question.id)) this.progress.mastered.push(this.question.id);
        /**
         * 与问题关联的阅读课程。
         * @type {import('./types.js').Reading}
         */ for (const lesson of READINGS) if (lesson.questionId === this.question.id) this.markCompleted(lesson.id); this.persist(); }
    },
    /**
     * 循环查找下一道未掌握问题。
     * @returns {void}
     */
    nextQuestion() {
      /**
       * 当前回忆题在原问题目录中的位置，作为循环查找起点。
       * @type {number}
       */ const index = QUESTIONS.indexOf(this.question);
      /**
       * 下一题的循环偏移。
       * @type {number}
       */ for (let offset = 1; offset <= QUESTIONS.length; offset++) {
        /**
         * 循环查找时当前待判断掌握状态的候选问题。
         * @type {import('./types.js').Question}
         */ const candidate = QUESTIONS[(index + offset) % QUESTIONS.length];
        if (!this.progress.mastered.includes(candidate.id)) { this.navigate(`recall/${candidate.id}`); return; }
      }
      this.navigate(`recall/${QUESTIONS[(index + 1) % QUESTIONS.length].id}`);
    },
    /**
     * 保存前缀但不删除掌握记录。
     * @returns {void}
     */
    savePrefix() { if (!PREFIXES.includes(this.prefixDraft)) return; this.progress.prefix = this.prefixDraft; this.persist(); this.resetPractice(); this.feedback = { kind: '', text: `练习前缀已改为 ${this.prefixLabel}。` }; this.configStatus = '已保存。本页提示、按键匹配与导出使用同一前缀。'; },
    /**
     * 复制当前生成的真实配置片段。
     * @returns {Promise<void>}
     */
    async copyConfig() { try { await navigator.clipboard.writeText(this.config); this.configStatus = '已复制配置片段。'; } catch { this.configStatus = '剪贴板不可用。请手动选择上方片段复制，或下载文件。'; } },
    /**
     * 下载当前生成的真实配置片段。
     * @returns {void}
     */
    downloadConfig() { /**
     * 下载对象地址。
     * @type {string}
     */ const url = URL.createObjectURL(new Blob([this.config], { type: 'text/plain;charset=utf-8' })); /**
     * 下载触发链接。
     * @type {HTMLAnchorElement}
     */ const link = document.createElement('a'); link.href = url; link.download = 'herdr-keys.toml'; link.click(); setTimeout(/**
      * 下载请求发起后释放临时对象地址。
     * @returns {void} 释放下载对象地址。
     */ () => URL.revokeObjectURL(url), 1000); this.configStatus = '已请求下载；请在浏览器下载列表中查看。'; },
    /**
     * 同步前缀表单并打开顶栏对话框。
     * @param {'settings'|'help'} dialog 对话框类型。
     * @returns {void}
     */
    openDialog(dialog) { this.prefixDraft = this.progress.prefix; this.configStatus = ''; this.dialog = dialog; },
    /**
     * 获取受保护动作的标题。
     * @returns {string} 对话框标题。
     */
    actionTitle() { return ACTION_NAMES[this.pendingAction] || '练习操作'; },
  },
});

<script setup>
import { computed, nextTick, ref } from 'vue';

import { ACTION_KEYS, ACTION_NAMES, keyForAction, panes, tab, workspace } from '../../domain/engine.js';
import BaseButton from '../../shared/base/BaseButton.vue';
import { useLearningStore } from '../../stores/learning.js';
import PaneTree from './PaneTree.vue';
/**
 * Pinia 会话状态。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
/**
 * 物理键盘事件边界。
 * @type {import('vue').Ref<HTMLElement|null>}
 */
const simulator = ref(null);
/**
 * 当前工作区。
 * @type {import('vue').ComputedRef<import('../../domain/types.js').Workspace>}
 */
const currentWorkspace = computed(/**
 * 读取模拟器当前活跃工作区。
 * @returns {import('../../domain/types.js').Workspace} 活跃工作区。
 */ () => workspace(store.session));
/**
 * 当前标签页。
 * @type {import('vue').ComputedRef<import('../../domain/types.js').Tab>}
 */
const currentTab = computed(/**
 * 读取模拟器当前活跃标签页。
 * @returns {import('../../domain/types.js').Tab} 活跃标签页。
 */ () => tab(store.session));
/**
 * 引擎模式中文标签。
 * @type {Record<string,string>}
 */
const modeNames = { terminal: '终端模式', prefix: 'PREFIX · 等待动作', help: '快捷键帮助', navigate: '工作区导航' };
/**
 * 所有支持的屏幕按键，含重命名工作区。
 * @type {string[]}
 */
const screenKeys = Object.keys(ACTION_KEYS);
/**
 * 步骤与最终目标均已完成。
 * @type {import('vue').ComputedRef<boolean>}
 */
const complete = computed(/**
 * 判断有序步骤及最终布局是否均满足本课目标。
 * @returns {boolean} 本课实操完成状态。
 */ () => store.current.type === 'practice' && store.stepIndex === store.current.steps.length && store.current.goal(store.session));
/**
 * 重连后恢复模拟器键盘焦点。
 * @returns {Promise<void>}
 */
async function reconnect() { store.reconnect(); await nextTick(); if (store.session.connected) simulator.value?.focus({ preventScroll: true }); }
/**
 * 屏幕按键沿用模拟器焦点，确保随后可继续使用物理键盘。
 * @param {string} key 屏幕按键。
 * @returns {void}
 */
function sendKey(key) { simulator.value?.focus({ preventScroll: true }); store.sendKey(key); }
/**
 * 键盘动作可能替换布局子树，更新后恢复稳定的外层焦点。
 * @param {KeyboardEvent} event 物理键盘事件。
 * @returns {Promise<void>}
 */
async function handleKeyboard(event) {
  store.handleKeyboard(event);
  if (!event.defaultPrevented) return;
  if (store.dialog) simulator.value?.focus({ preventScroll: true });
  else { await nextTick(); simulator.value?.focus({ preventScroll: true }); }
}
/**
 * 切换工作区和标签页前保留稳定的键盘入口。
 * @param {string} action 选择动作。
 * @param {number} id 目标标识。
 * @returns {void}
 */
function performAction(action, id) { simulator.value?.focus({ preventScroll: true }); store.perform(action, id); }
</script>

<template>
  <section class="practice-column lesson-layout" aria-label="交互练习">
    <div id="simulator" ref="simulator" class="simulator" tabindex="0" role="group" aria-label="Herdr 布局模拟器；点击后接收练习按键" aria-describedby="simulation-disclaimer" @keydown="handleKeyboard">
      <div class="sim-topline"><span>herdr / {{ currentWorkspace.label }}</span><span id="simulation-disclaimer">教学模拟 · 无真实进程</span></div>
      <div class="sim-body">
        <aside v-if="store.session.sidebar" class="sim-sidebar scroll-section" tabindex="0" aria-label="模拟工作区">
          <div class="section-label">工作区</div>
          <button v-for="item in store.session.workspaces" :key="item.id" type="button" class="workspace-link" :class="{ active: item.id === currentWorkspace.id }" :disabled="!store.session.connected" :aria-current="item.id === currentWorkspace.id ? 'true' : 'false'" @click="performAction('select-workspace', item.id)">{{ item.label }} <small>{{ item.tabs.length }} 个标签页</small></button>
          <div class="section-label">智能体</div><p class="muted">未运行智能体</p>
        </aside>
        <div class="sim-main">
          <div class="sim-tabs" aria-label="模拟标签页"><button v-for="(item, index) in currentWorkspace.tabs" :key="item.id" type="button" :class="{ active: item.id === currentTab.id }" :disabled="!store.session.connected" :aria-current="item.id === currentTab.id ? 'true' : 'false'" @click="performAction('select-tab', item.id)">{{ index + 1 }} {{ item.label }}</button></div>
          <div class="pane-area"><PaneTree :tree="currentTab.tree" :focused="currentTab.focusedPane" :zoomed="currentTab.zoomed" /></div>
        </div>
        <div v-if="!store.session.connected" class="sim-overlay"><section class="sim-panel scroll-section" tabindex="0"><h3>客户端已分离</h3><p>下方输入 <code>herdr</code> 重新连接。</p><p class="muted">本页只保留演示布局，不运行真实进程。</p></section></div>
        <div v-else-if="store.session.mode === 'help'" class="sim-overlay"><section class="sim-panel scroll-section" tabindex="0"><h3>快捷键帮助 · 本页实操范围</h3><p>每个动作前先按 <kbd>{{ store.prefixLabel }}</kbd>。</p><div class="reference-list"><div v-for="(action, key) in ACTION_KEYS" :key="key"><kbd>{{ keyForAction(action) }}</kbd> {{ ACTION_NAMES[action] }}</div></div><p class="muted">这不是完整原生键表。更多动作请查看官方文档。</p><BaseButton @click="sendKey('escape')">Esc 关闭帮助</BaseButton></section></div>
        <div v-else-if="store.session.mode === 'navigate'" class="sim-overlay"><section class="sim-panel scroll-section" tabindex="0"><h3>选择工作区</h3><p class="muted">↑ / ↓ 选择，Enter 确认，Esc 取消。</p><button v-for="(item, index) in store.session.workspaces" :key="item.id" type="button" class="workspace-link" :class="{ active: index === store.navigationIndex }" @click="performAction('select-workspace', item.id)">{{ item.label }} <small>{{ item.tabs.length }} 个标签页</small></button><BaseButton @click="sendKey('escape')">Esc 取消</BaseButton></section></div>
      </div>
      <div class="sim-status"><span class="mode-badge">{{ store.session.connected ? modeNames[store.session.mode] : '已分离' }}</span><span class="key-history">{{ store.keyHistory.slice(-5).join(' → ') || '等待输入' }}</span><span>{{ panes(currentTab.tree).length }} 个窗格{{ currentTab.zoomed ? ' · 已缩放' : '' }}</span></div>
    </div>
    <div class="sim-actions"><span class="section-label">屏幕按键</span><BaseButton class="key-button" @click="sendKey('prefix')"><kbd>{{ store.prefixLabel }}</kbd> 前缀</BaseButton><BaseButton class="key-button" @click="sendKey('escape')"><kbd>Esc</kbd> 取消</BaseButton></div>
    <div class="key-controls"><BaseButton v-for="key in screenKeys" :key="key" class="key-button" :class="{ suggested: store.hints && store.current.steps[store.stepIndex]?.action === ACTION_KEYS[key] }" :title="ACTION_NAMES[ACTION_KEYS[key]]" :disabled="!store.session.connected" @click="sendKey(key)"><kbd>{{ keyForAction(ACTION_KEYS[key]) }}</kbd><span>{{ ACTION_NAMES[ACTION_KEYS[key]] }}</span></BaseButton></div>
    <p class="muted">先点前缀，再点动作。物理键盘只在演示区内生效；Tab 保留网页焦点导航。</p>
    <form v-if="!store.session.connected" class="command-form" @submit.prevent="reconnect"><label for="reconnect-input">在真实终端里会重新运行什么？</label><div><input id="reconnect-input" v-model="store.reconnectCommand" name="command" placeholder="输入连接命令" autocomplete="off" spellcheck="false" required><BaseButton variant="primary" type="submit">连接模拟会话</BaseButton></div></form>
    <p class="feedback" :class="store.feedback.kind" role="status">{{ store.feedback.text }}</p>
    <div v-if="complete" class="feedback success"><strong>本课完成</strong><br>步骤与当前布局均符合目标，进度已记录。</div>
    <div class="lesson-footer"><BaseButton @click="store.resetPractice">重新练习</BaseButton><span>{{ Math.min(store.stepIndex, store.current.steps.length) }} / {{ store.current.steps.length }} 步</span><BaseButton :variant="complete ? 'primary' : 'secondary'" icon="arrow" @click="store.nextLesson">{{ complete ? '下一课' : '跳到下一课' }}</BaseButton></div>
  </section>
</template>

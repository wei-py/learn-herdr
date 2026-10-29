<script setup>
import { computed } from 'vue';

import { panes } from '../../domain/engine.js';
import { useLearningStore } from '../../stores/learning.js';
/**
 * 递归布局树输入。
 * @type {{tree:import('../../domain/types.js').PaneTree,focused:number,zoomed?:boolean}}
 */
const props = defineProps({ tree: { type: Object, required: true }, focused: { type: Number, required: true }, zoomed: Boolean });
/**
 * 共享会话状态。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
/**
 * 包含缩放选择的可见布局树。
 * @type {import('vue').ComputedRef<import('../../domain/types.js').PaneTree>}
 */
const visible = computed(/**
 * 根据缩放状态计算实际显示的布局子树。
 * @returns {import('../../domain/types.js').PaneTree} 可见子树。
 */ () => props.zoomed && props.tree.axis ? panes(props.tree).find(/**
  * 从布局叶节点中匹配已聚焦窗格。
 * @param {import('../../domain/types.js').Pane} pane 候选窗格。
 * @returns {boolean} 已聚焦窗格。
 */ (pane) => pane.id === props.focused) || props.tree : props.tree);
/**
 * 仅在正常模拟模式允许鼠标选择窗格。
 * @returns {void}
 */
function focusPane() { if (store.session.connected && !['help', 'navigate'].includes(store.session.mode)) store.perform('select-pane', visible.value.id); }
</script>

<template>
  <div v-if="visible.axis" class="split-tree" :class="visible.axis">
    <PaneTree :tree="visible.first" :focused="focused" />
    <PaneTree :tree="visible.second" :focused="focused" />
  </div>
  <button v-else type="button" class="pane" :class="{ focused: visible.id === focused }" :aria-label="`窗格 ${visible.id}${visible.id === focused ? '，已聚焦' : ''}`" @click="focusPane">
    <span class="pane-heading">{{ visible.title }} <span>p{{ visible.id }}{{ visible.id === focused ? ' · 当前焦点' : '' }}</span></span>
    <pre class="scroll-section">{{ visible.lines.join('\n') }}</pre>
  </button>
</template>

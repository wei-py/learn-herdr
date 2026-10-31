<script setup>
import { computed } from 'vue';

import LearningPage from './features/LearningPage.vue';
import PracticeGuide from './features/practice/PracticeGuide.vue';
import LearningDialogs from './features/settings/LearningDialogs.vue';
import LearningShell from './shared/layout/LearningShell.vue';
import { lessons, useLearningStore } from './stores/learning.js';
/**
 * 全局学习状态。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
/**
 * 共享顶栏当前栏目。
 * @type {import('vue').ComputedRef<string>}
 */
const active = computed(/**
 * 将应用路由映射为共享顶栏栏目。
 * @returns {string} 当前顶栏路由。
 */ () => ({ courses: 'map', learn: 'practice', reference: 'library', recall: 'recall' })[store.route]);
/**
 * 打开设置对话框。
 * @returns {void}
 */
function settings() { store.openDialog('settings'); }
/**
 * 打开帮助对话框。
 * @returns {void}
 */
function help() { store.openDialog('help'); }
</script>

<template>
  <LearningShell brand="Herdr" subtitle="非官方学习站 · 0.9.5" :active="active" :progress-label="`课程 ${store.progress.completed.length} / ${lessons.length} · 回忆 ${store.progress.mastered.length} / 18`" @navigate="store.navigateShell" @settings="settings" @help="help" @export="settings">
    <template v-if="store.notice" #notice><p class="notice" role="status">{{ store.notice }}</p></template>
    <LearningPage />
    <LearningDialogs />
    <template v-if="store.route === 'learn' && store.current.type === 'practice'" #guide><PracticeGuide /></template>
  </LearningShell>
</template>

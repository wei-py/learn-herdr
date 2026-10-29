<script setup>
import { createLearningRouter } from '../router/index.js';
import { useLearningScroll } from '../shared/composables/useLearningScroll.js';
import { useLearningStore } from '../stores/learning.js';
import CoursesView from './courses/CoursesView.vue';
import LessonView from './LessonView.vue';
import RecallView from './recall/RecallView.vue';
import ReferenceView from './reference/ReferenceView.vue';
/**
 * 课程路由状态。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
/**
 * 共享外壳提供的单一滚动根。
 * @type {ReturnType<typeof useLearningScroll>}
 */
const scroll = useLearningScroll();
createLearningRouter(store, scroll);
</script>

<template>
  <CoursesView v-if="store.route === 'courses'" />
  <LessonView v-else-if="store.route === 'learn'" />
  <ReferenceView v-else-if="store.route === 'reference'" />
  <RecallView v-else />
  <footer class="page-footer"><span>HERDR 练习报 · 学习在此，执行在真实终端。</span><a href="https://herdr.dev/zh-cn/docs/" target="_blank" rel="noopener noreferrer">阅读官方文档</a></footer>
</template>

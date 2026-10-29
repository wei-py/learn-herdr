<script setup>
import BaseButton from '../shared/base/BaseButton.vue';
import { lessons, useLearningStore } from '../stores/learning.js';
import PracticeView from './practice/PracticeView.vue';
/**
 * 当前课程与学习动作。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
</script>

<template>
  <div class="lesson-breadcrumb"><BaseButton variant="text" icon="map" @click="store.navigate('courses')">返回课程地图</BaseButton><span>所有课程均可自由选择</span></div>
  <header class="section-heading"><div class="eyebrow">{{ store.current.group }} / LESSON {{ String(lessons.indexOf(store.current) + 1).padStart(2, '0') }}</div><h2>{{ store.current.title }}</h2><p class="lead">{{ store.current.intro }}</p></header>
  <div class="lesson-meta"><span class="tag">{{ store.current.type === 'practice' ? '布局实操' : '原理阅读' }}</span><span>约 {{ store.current.minutes }} 分钟</span><span v-if="store.progress.completed.includes(store.current.id)" class="badge">已掌握</span><a class="source-link" :href="store.current.source" target="_blank" rel="noopener noreferrer">官方依据</a></div>
  <PracticeView v-if="store.current.type === 'practice'" :key="store.current.id" />
  <article v-else class="reading">
    <section v-for="section in store.current.sections" :key="section.title" class="reading-section"><h3>{{ section.title }}</h3><p>{{ section.text }}</p><pre v-if="section.code" class="scroll-section" tabindex="0"><code>{{ section.code }}</code></pre><ul v-if="section.bullets"><li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li></ul></section>
    <div class="feedback"><strong>读懂了，试着回忆一下。</strong><p>答对本课关联问题才会记录课程完成；仅展开内容或查看答案不计入。</p><BaseButton variant="primary" icon="recall" @click="store.navigate(`recall/${store.current.questionId}?from=${store.current.id}`)">本课自测</BaseButton></div>
    <div class="lesson-footer"><span>命令示例需在真实终端中执行</span><BaseButton icon="arrow" @click="store.nextLesson">下一课</BaseButton></div>
  </article>
</template>

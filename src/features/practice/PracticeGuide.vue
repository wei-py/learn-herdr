<script setup>
import BaseButton from '../../shared/base/BaseButton.vue';
import StudyGuide from '../../shared/business/StudyGuide.vue';
import { useLearningStore } from '../../stores/learning.js';
/**
 * 本课状态与提示。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
</script>

<template>
  <StudyGuide title="本课指导">
    <div class="section-label">本课目标</div><p class="objective">{{ store.current.objective }}</p>
    <ol class="steps"><li v-for="(step, index) in store.current.steps" :key="index" :class="{ done: index < store.stepIndex, current: index === store.stepIndex }"><span>{{ step.label }}</span><template v-if="store.hints"><br><kbd>{{ store.sequence(step.action) }}</kbd></template></li></ol>
    <BaseButton variant="text" @click="store.hints = !store.hints">{{ store.hints ? '隐藏按键提示' : '显示按键提示' }}</BaseButton>
    <details class="answer"><summary>为什么这样操作</summary><p>{{ store.current.explanation }}</p></details>
    <details class="answer"><summary>查看答案（不代做）</summary><ol><li v-for="(step, index) in store.current.steps" :key="index"><code>{{ store.sequence(step.action) }}{{ step.value ? ` → ${step.value} → Enter` : '' }}</code>{{ step.action === 'select-workspace' ? ' → 选择 field-notes' : '' }}</li></ol><p>{{ store.current.objective }}</p></details>
    <p class="takeaway muted">{{ store.current.takeaway }}</p>
  </StudyGuide>
</template>

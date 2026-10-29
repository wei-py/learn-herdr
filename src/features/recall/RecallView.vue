<script setup>
import { QUESTIONS } from '../../domain/knowledge.js';
import BaseButton from '../../shared/base/BaseButton.vue';
import { lessons, useLearningStore } from '../../stores/learning.js';
/**
 * 回忆题及掌握记录。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
/**
 * 确定返回课程是否存在。
 * @param {import('../../stores/types.js').Lesson} lesson 候选课程。
 * @returns {boolean} 是否为来源课程。
 */
function isReturnLesson(lesson) { return lesson.id === store.returnLesson; }
</script>

<template>
  <header class="section-heading"><div class="eyebrow">RECALL, NOT REPEAT</div><h2>把操作，变成自己的判断。</h2><p class="lead">从具体场景中选择下一步。答对才记掌握，查看答案不会代你完成。</p></header>
  <div class="quiz-counter"><span>第 {{ QUESTIONS.indexOf(store.question) + 1 }} / {{ QUESTIONS.length }} 题 · {{ store.question.group }}</span><span>已掌握 {{ store.progress.mastered.length }} / {{ QUESTIONS.length }}</span></div>
  <section class="quiz-panel">
    <h3>{{ store.question.question }}</h3>
    <div class="quiz-options"><button v-for="(option, index) in store.question.options" :key="index" type="button" :aria-pressed="store.selected === index" :class="{ selected: store.selected === index, correct: store.quizResult === 'correct' && index === store.question.answer, incorrect: store.quizResult === 'wrong' && store.selected === index }" :disabled="store.quizResult === 'correct' || store.revealed" @click="store.selectAnswer(index)"><span class="mono">{{ String.fromCharCode(65 + index) }}.</span> {{ option }}</button></div>
    <div class="sim-actions"><BaseButton variant="primary" :disabled="store.selected === null || store.quizResult === 'correct' || store.revealed" @click="store.checkAnswer">检查答案</BaseButton><BaseButton :disabled="store.quizResult === 'correct' || store.revealed" @click="store.revealed = true; store.quizResult = ''">查看答案</BaseButton><BaseButton v-if="store.revealed" @click="store.retryQuestion">重新作答</BaseButton></div>
    <div v-if="store.quizResult || store.revealed" class="explanation feedback" :class="{ success: store.quizResult === 'correct', error: store.quizResult === 'wrong' }" role="status"><strong>{{ store.quizResult === 'correct' ? '答对了，已记掌握' : store.revealed ? `答案：${String.fromCharCode(65 + store.question.answer)}（本次不记掌握）` : '还不对。读完解析，可以重新选择。' }}</strong><p>{{ store.question.explanation }}</p><a class="source-link" :href="store.question.source" target="_blank" rel="noopener noreferrer">官方依据</a></div>
    <div class="lesson-footer"><BaseButton v-if="store.returnLesson && lessons.some(isReturnLesson)" @click="store.navigate(`learn/${store.returnLesson}`)">返回本课</BaseButton><a v-else class="source-link" :href="store.question.source" target="_blank" rel="noopener noreferrer">官方依据</a><BaseButton icon="arrow" @click="store.nextQuestion">{{ store.quizResult === 'correct' ? '下一道未掌握题' : '跳过，下一题' }}</BaseButton></div>
  </section>
  <details class="answer"><summary>选择其他问题</summary><div class="reference-list"><button v-for="(question, index) in QUESTIONS" :key="question.id" type="button" class="lesson-link" @click="store.navigate(`recall/${question.id}`)"><span class="lesson-number"><span v-if="store.progress.mastered.includes(question.id)" class="i-carbon-checkmark" aria-label="已掌握" /><template v-else>{{ String(index + 1).padStart(2, '0') }}</template></span><span class="lesson-title">{{ question.question }}</span></button></div></details>
</template>

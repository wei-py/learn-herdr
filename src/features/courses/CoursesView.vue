<script setup>
import { computed } from 'vue';

import CourseMap from '../../shared/business/CourseMap.vue';
import { lessons, useLearningStore } from '../../stores/learning.js';
/**
 * 课程完成记录。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
/**
 * 取出专题名称。
 * @param {import('../../stores/types.js').Lesson} lesson 课程。
 * @returns {string} 专题名称。
 */
function groupName(lesson) { return lesson.group; }
/**
 * 共享地图所需的课程分组和完成记录。
 * @type {import('vue').ComputedRef<import('../../shared/types.js').CourseGroup[]>}
 */
const groups = computed(/**
 * 构造全部开放的专题及其课程列表。
 * @returns {import('../../shared/types.js').CourseGroup[]} 开放课程专题。
 */ () => [...new Set(lessons.map(groupName))].map(/**
 * 为单个专题构造共享地图数据。
 * @param {string} group 专题名。
 * @returns {import('../../shared/types.js').CourseGroup} 专题条目。
 */ (group) => ({ id: group, title: group, lessons: lessons.filter(/**
 * 筛选属于当前专题的课程。
 * @param {import('../../stores/types.js').Lesson} lesson 课程。
 * @returns {boolean} 属于当前专题。
 */ (lesson) => lesson.group === group).map(/**
 * 转换课程元数据与本地完成记录。
 * @param {import('../../stores/types.js').Lesson} lesson 课程。
 * @returns {import('../../shared/types.js').CourseLesson} 地图课程。
 */ (lesson) => ({ id: lesson.id, title: lesson.title, description: lesson.intro, type: lesson.type, minutes: lesson.minutes, completed: store.progress.completed.includes(lesson.id) })) })));
/**
 * 打开选中课程。
 * @param {string} id 课程标识。
 * @returns {void}
 */
function selectLesson(id) { store.navigate(`learn/${id}`); }
</script>

<template>
  <CourseMap title="课程" :description="`6 个专题 · 14 个实操 · 7 篇阅读 · 已掌握 ${store.progress.completed.length} / ${lessons.length}`" :groups="groups" :current-id="store.currentId" @select="selectLesson" />
</template>

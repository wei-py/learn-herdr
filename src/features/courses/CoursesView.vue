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
 * 专题原有说明。
 * @type {Record<string,string>}
 */
const descriptions = { '入门与概念': '先了解工具入口，以及会话、工作区、标签页与窗格的关系。', '窗格与前缀': '从前缀开始，动手分割、移动焦点与管理窗格。', '标签页与工作区': '把不同视图放进标签页，把不同项目放进工作区。', '会话与综合': '理解分离与重连，串起一套完整的工作台操作。', '智能体与持久化': '读懂智能体状态，分清进程持续运行与恢复的边界。', '配置与自动化': '安全修改配置，认识真实 CLI 与 API 的使用方式。' };
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
 */ (group) => ({ id: group, title: group, description: descriptions[group], lessons: lessons.filter(/**
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
  <p class="map-overview">6 个专题 · 14 个实操 · 7 篇阅读 · 已掌握 {{ store.progress.completed.length }} / {{ lessons.length }}</p>
  <CourseMap title="课程地图" description="从感兴趣的一课开始。全部课程开放，顺序只是建议，不必逐关完成。" :groups="groups" :current-id="store.currentId" @select="selectLesson" />
</template>

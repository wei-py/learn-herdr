<script setup>
import { REFERENCES } from '../../domain/knowledge.js';
import { useLearningStore } from '../../stores/learning.js';
/**
 * 搜索表单和匹配结果。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
</script>

<template>
  <header class="section-heading"><h2>速查</h2><p class="lead">精选快捷键、CLI 与配置；快捷键使用默认 Ctrl+B。</p></header>
  <form class="reference-tools" role="search" @submit.prevent="store.updateReference"><label><span class="section-label">搜索</span><input id="reference-query" v-model="store.referenceQuery" name="query" type="search" placeholder="搜索分割、会话、remote…" autocomplete="off" @input="store.updateReference"></label><label><span class="section-label">类型</span><select id="reference-kind" v-model="store.referenceKind" name="kind" @change="store.updateReference"><option value="">全部类型</option><option>快捷键</option><option>命令</option><option>配置</option></select></label></form>
  <p id="reference-count" class="muted" role="status">显示 {{ store.filteredReferences.length }} / {{ REFERENCES.length }} 项 · 命令仅供查阅，不会在网页执行。</p>
  <div id="reference-results" class="reference-list"><article v-for="item in store.filteredReferences" :key="`${item.kind}:${item.title}`" class="reference-row"><div class="reference-key"><span class="reference-category">{{ item.kind }} / {{ item.category }}</span><h3>{{ item.title }}</h3><code>{{ item.syntax }}</code></div><div class="reference-description"><p>{{ item.description }}</p><a class="source-link" :href="item.source" target="_blank" rel="noopener noreferrer">官方依据</a></div></article><p v-if="!store.filteredReferences.length" class="empty-state">没有匹配项。试试“窗格”“prefix”或清空搜索。</p></div>
</template>

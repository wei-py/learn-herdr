<script setup>
import { computed, nextTick, ref, watch } from 'vue';

import { QUESTIONS, READINGS, REFERENCES } from '../../domain/knowledge.js';
import { PRACTICES } from '../../domain/lessons.js';
import { PREFIXES } from '../../domain/progress.js';
import BaseButton from '../../shared/base/BaseButton.vue';
import BaseDialog from '../../shared/base/BaseDialog.vue';
import { useLearningStore } from '../../stores/learning.js';
/**
 * 对话框与表单全局状态。
 * @type {ReturnType<typeof useLearningStore>}
 */
const store = useLearningStore();
/**
 * 命名输入焦点。
 * @type {import('vue').Ref<HTMLInputElement|null>}
 */
const nameInput = ref(null);
/**
 * 原生对话框标题。
 * @type {import('vue').ComputedRef<string>}
 */
const title = computed(/**
 * 根据对话框类型生成当前标题。
 * @returns {string} 当前对话框标题。
 */ () => ({ settings: '设置与导出', help: '使用帮助', name: store.actionTitle(), close: '关闭这个演示窗格？' })[store.dialog] || '练习操作');
watch(/**
 * 观察当前打开的对话框类型。
 * @returns {string} 当前对话框类型。
 */ () => store.dialog, /**
  * 在命名对话框打开后选中已有名称，支持直接重新输入。
 * @param {string} dialog 新对话框类型。
 * @returns {Promise<void>}
 */ async (dialog) => { if (dialog === 'name') { await nextTick(); nameInput.value?.select(); } });
/**
 * 关闭对话框，由基础组件恢复原触发点焦点。
 * @returns {void}
 */
function closeDialog() { store.dialog = ''; }
</script>

<template>
  <BaseDialog :open="Boolean(store.dialog)" :title="title" @close="closeDialog">
    <template v-if="store.dialog === 'settings'">
      <form @submit.prevent="store.savePrefix"><label for="prefix-choice">本页实操使用的前缀<select id="prefix-choice" v-model="store.prefixDraft" name="prefix"><option v-for="prefix in PREFIXES" :key="prefix" :value="prefix">{{ prefix }}</option></select></label><p class="muted">只修改学习站的前缀；速查与阅读仍标注官方默认值。不会更改真实 Herdr。前缀改变会重置本课演示，不清除掌握记录。</p><BaseButton type="submit" variant="primary">保存练习前缀</BaseButton></form>
      <h3>合并到真实配置</h3><p>路径：<code>~/.config/herdr/config.toml</code>。先备份，合并到已有 <code>[keys]</code>；不要覆盖整个文件，也不要重复表头。</p><div class="config-preview"><pre id="config-code" class="scroll-section" tabindex="0">{{ store.config }}</pre></div><div class="dialog-actions"><BaseButton @click="store.copyConfig">复制片段</BaseButton><BaseButton icon="export" @click="store.downloadConfig">下载 herdr-keys.toml</BaseButton></div><p id="config-status" role="status">{{ store.configStatus }}</p><p>原生 Herdr 的 UI 全局菜单 <code>reload config</code> 可更新客户端与选中服务器的配置；CLI <code>herdr server reload-config</code> 重载服务器设置。</p><a class="source-link" href="https://herdr.dev/zh-cn/docs/configuration/" target="_blank" rel="noopener noreferrer">官方依据</a>
    </template>
    <div v-else-if="store.dialog === 'help'" class="reading">
      <h3>三条学习路径</h3><ul><li>课程地图：{{ READINGS.length }} 篇原理阅读、{{ PRACTICES.length }} 个布局实操。全部开放，点击任意课程即可开始；完成记录只标记进度，不限制选课。</li><li>速查目录：{{ REFERENCES.length }} 个精选快捷键、CLI 与配置条目；不是完整目录。</li><li>场景回忆：{{ QUESTIONS.length }} 道独立问题，答对记录掌握；阅读课通过关联自测记完成。</li></ul>
      <h3>如何实操</h3><p>点击演示终端后，按下并松开 <kbd>{{ store.prefixLabel }}</kbd>，再按动作键。或者依次点屏幕前缀与动作按钮。仅演示区捕获快捷键，Tab 保留网页导航。命名输入框支持中文输入与 Enter。</p>
      <h3>范围与限制</h3><p>这是非官方、基于官方 0.9.5 文档的学习应用，不是 Herdr 终端克隆。只模拟布局、焦点、标签页、工作区和分离状态。不运行 shell、AI、SSH、socket API、复制模式或 worktree。新建工作区、导航与关闭确认采用教学简化；资源数有练习上限。</p><p>“查看答案”不执行操作、不记完成。错误的受支持动作会真实改变本页状态。已掌握记录保留，重新练习不删除历史掌握。</p><h3>本地记录</h3><p>进度与练习前缀保存在此浏览器 localStorage。不保存真实终端内容、凭据或提示词，不与服务器同步。刷新重置当前模拟布局，不清除掌握记录。</p><a class="source-link" href="https://herdr.dev/zh-cn/docs/" target="_blank" rel="noopener noreferrer">官方依据</a>
    </div>
    <form v-else-if="store.dialog === 'name'" id="name-form" @submit.prevent="store.confirmAction"><label for="item-name">{{ store.pendingAction === 'new-workspace' ? '演示工作区名称' : '新名称' }}<input id="item-name" ref="nameInput" v-model="store.name" name="name" maxlength="40" required autocomplete="off"></label><p class="muted">教学简化输入，不创建真实目录、终端或 worktree。</p><div class="dialog-actions"><BaseButton @click="closeDialog">取消</BaseButton><BaseButton type="submit" variant="primary">确认</BaseButton></div></form>
    <template v-else-if="store.dialog === 'close'"><p>在真实 Herdr 中，关闭窗格会结束它的终端。要让工作继续，请改用分离客户端。</p><p class="muted">本页的确认是教学保护，不会终止电脑上的任何进程。</p><form id="close-pane-form" @submit.prevent="store.confirmAction"><div class="dialog-actions"><BaseButton @click="closeDialog">取消</BaseButton><BaseButton type="submit" variant="primary">关闭演示窗格</BaseButton></div></form></template>
  </BaseDialog>
</template>

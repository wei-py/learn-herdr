import { readonly, ref } from 'vue';

/** 本站独立的主题存储键。 @type {string} */
const storageKey = 'learn-herdr-theme';
/** 首屏脚本已恢复的主题偏好。 @type {import('vue').Ref<string>} */
const preference = ref(document.documentElement.dataset.theme || 'auto');

/**
 * 应用明确主题或恢复由 CSS 自动响应的系统主题。
 * @param {string|null} value 外部主题值。
 * @returns {void}
 */
function applyTheme(value) {
  /** 归一化后的主题。 @type {string} */
  const theme = value === 'light' || value === 'dark' ? value : 'auto';
  preference.value = theme;
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="color-scheme"]').content = theme === 'auto' ? 'light dark' : theme;
}

/**
 * 立即切换主题；存储被禁用时保留当前页面的选择。
 * @param {string} value 主题偏好。
 * @returns {void}
 */
function setTheme(value) {
  applyTheme(value);
  try {
    if (preference.value === 'auto') localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, preference.value);
  } catch { /* 主题切换不依赖存储权限。 */ }
}

window.addEventListener('storage', /**
 * 同步其他标签页的偏好，包括清空本地存储。
 * @param {StorageEvent} event 存储更新事件。
 * @returns {void}
 */ (event) => {
  if (event.key === storageKey || event.key === null) applyTheme(event.newValue);
});

/**
 * 提供全站共享的只读主题和显式更新入口。
 * @returns {{ theme: import('vue').DeepReadonly<import('vue').Ref<string>>, setTheme: typeof setTheme }} 主题控制器。
 */
export function useTheme() {
  return { theme: readonly(preference), setTheme };
}

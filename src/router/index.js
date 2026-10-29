import { onBeforeUnmount, watch } from 'vue';
import { useEventListener } from 'vue-hooks-plus';

/**
 * 规范化兼容旧地址的无斜线哈希。
 * @param {string} hash 地址片段。
 * @returns {string} 规范化路由。
 */
function canonical(hash) {
  /**
   * 兼容旧哈希格式并补全默认课程地图的地址片段。
   * @type {string}
   */ const value = hash.replace(/^#\/?/, '') || 'courses';
  /**
   * 路径与查询参数的分段，避免修改既有公开地址格式。
   * @type {string[]}
   */ const parts = value.split('?');
  /**
   * 需要排序的查询参数，用于稳定识别同一筛选列表。
   * @type {URLSearchParams}
   */ const params = new URLSearchParams(parts[1] || '');
  params.sort();
  return `${parts[0]}${params.size ? `?${params}` : ''}`;
}
/**
 * 为每个浏览器历史项分配独立滚动标识。
 * @returns {string} 历史项标识。
 */
function entryKey() {
  /**
   * 分配与原路由器相同的 128 位加密随机标识，兼容局域网 HTTP。
   * @type {Uint32Array}
   */
  const words = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(words, /**
   * 将每个随机整数固定编码为八位十六进制，保留前导零。
   * @param {number} word 随机整数。
   * @returns {string} 固定长度的十六进制片段。
   */ (word) => word.toString(16).padStart(8, '0')).join('');
}
/**
 * 生成保留部署目录的地址。
 * @param {string} hash 地址片段。
 * @returns {string} 完整站内地址。
 */
function routeURL(hash) { return `${location.pathname}${location.search}#${hash}`; }
/**
 * 接管首次访问或历史遍历；重复事件不重复重置课程。
 * @param {ReturnType<import('../stores/learning.js').useLearningStore>} store 应用状态。
 * @returns {void}
 */
export function adoptHistory(store) {
  /**
   * 浏览器当前地址对应的规范化路由。
   * @type {string}
   */ const hash = canonical(location.hash);
  /**
   * 已写入当前历史项的应用路由标记。
   * @type {import('../stores/types.js').RouteEntry|undefined}
   */ const saved = history.state?.herdrVue;
  if (saved?.key === store.entry.key && hash === store.entry.hash) return;
  /**
   * 本次接管的历史项；外部哈希访问分配独立标识。
   * @type {import('../stores/types.js').RouteEntry}
   */ const next = saved?.hash === hash ? saved : { key: entryKey(), hash };
  history.replaceState({ ...history.state, herdrVue: next }, '', routeURL(hash));
  store.restoreKey = store.entry.key ? next.key : '';
  store.entry = next;
  store.readRoute(hash);
}
/**
 * 推入新路由；返回列表时沿用同筛选条件最近一次位置。
 * @param {ReturnType<import('../stores/learning.js').useLearningStore>} store 应用状态。
 * @param {string} hash 目标地址片段。
 * @returns {void}
 */
export function navigate(store, hash) {
  if (hash === 'reference') hash = store.referenceHash();
  hash = canonical(hash);
  if (hash === store.entry.hash) return;
  if (store.route === 'courses' || store.route === 'reference') {
    store.rememberedLists[store.entry.hash] = store.entry.key;
    if (Object.keys(store.rememberedLists).length > 80) delete store.rememberedLists[Object.keys(store.rememberedLists)[0]];
  }
  store.restoreKey = store.rememberedLists[hash] || '';
  store.entry = { key: entryKey(), hash };
  history.pushState({ herdrVue: { ...store.entry } }, '', routeURL(hash));
  store.readRoute(hash);
}
/**
 * 只替换筛选地址，保持输入焦点与当前滚动位置。
 * @param {ReturnType<import('../stores/learning.js').useLearningStore>} store 应用状态。
 * @returns {void}
 */
export function replaceReference(store) {
  store.entry.hash = store.referenceHash();
  history.replaceState({ ...history.state, herdrVue: { ...store.entry } }, '', routeURL(store.entry.hash));
}
/**
 * 将路由生命期接入共享滚动控制器和浏览器事件。
 * @param {ReturnType<import('../stores/learning.js').useLearningStore>} store 应用状态。
 * @param {ReturnType<import('../shared/composables/useLearningScroll.js').useLearningScroll>} scroll 单一滚动根控制器。
 * @returns {void}
 */
export function createLearningRouter(store, scroll) {
  /**
   * 当前已显示页面的位置缓存标识，用于离开前保存滚动。
   * @type {string}
   */ let activeKey = '';
  /**
   * 阻止已卸载路由器的异步恢复流程操作新页面焦点。
   * @type {boolean}
   */
  let disposed = false;
  /**
   * 路由器接管前的浏览器滚动恢复策略，卸载时归还。
   * @type {ScrollRestoration}
   */ const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  /**
   * 在 Vue 更新内容前记录旧页面；更新后恢复目标历史位置。
   * @returns {Promise<void>}
   */
  async function onRoute() {
    if (activeKey) scroll.beforeNavigation(activeKey);
    activeKey = store.entry.key;
    /**
     * 本次导航目标，防止快速连续切换后旧任务抢回焦点。
     * @type {string}
     */
    const targetKey = activeKey;
    /**
     * 标识本次切换顺序，即使快速返回同一个历史项也不会复用旧任务。
     * @type {number}
     */
    const targetRevision = store.routeRevision;
    await scroll.afterNavigation(store.restoreKey || activeKey, { restore: Boolean(store.restoreKey) });
    if (disposed || targetKey !== store.entry.key || targetRevision !== store.routeRevision) return;
    if (store.restoreKey && store.restoreKey !== activeKey) scroll.beforeNavigation(activeKey);
    /**
     * 返回课程地图时恢复上次选课入口，其他页面聚焦主内容而不改变恢复位置。
     * @type {HTMLElement|null}
     */
    const focusTarget = store.route === 'courses' && store.restoreKey
      ? document.querySelector(`[data-course-id="${CSS.escape(store.currentId)}"]`) || document.querySelector('#main-content')
      : document.querySelector('#main-content');
    focusTarget?.focus({ preventScroll: true });
  }
  /**
   * 读取路由修订序号以触发滚动位置切换。
   * @returns {number} 路由更新序号。
   */
  function routeRevision() { return store.routeRevision; }
  /**
   * 接收浏览器返回、前进和外部哈希变化。
   * @returns {void}
   */
  function onHistory() { adoptHistory(store); }
  /**
   * 卸载后归还浏览器滚动策略。
   * @returns {void}
   */
  function dispose() { disposed = true; history.scrollRestoration = previousRestoration; }
  watch(routeRevision, onRoute, { flush: 'sync' });
  useEventListener('popstate', onHistory, { target: window });
  useEventListener('hashchange', onHistory, { target: window });
  onBeforeUnmount(dispose);
  adoptHistory(store);
}

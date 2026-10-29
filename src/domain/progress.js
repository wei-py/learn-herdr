/**
 * 既有学习记录的存储键，技术栈迁移不能重置用户进度。
 * @type {string}
 */
export const STORAGE_KEY = 'herdr-lab-v1';
/**
 * 原生教学配置允许选择的三个前缀。
 * @type {string[]}
 */
export const PREFIXES = ['ctrl+b', 'ctrl+a', 'ctrl+s'];
/**
 * 读取旧版本兼容的学习记录，过滤已移除标识且不主动清空原数据。
 * @param {import('./types.js').StoragePort} storage 浏览器存储或测试替身。
 * @param {string[]} lessonIds 当前有效课程标识。
 * @param {string[]} questionIds 当前有效题目标识。
 * @returns {import('./types.js').Progress} 可用于本次练习的记录及存储反馈。
 */
export function loadProgress(storage, lessonIds, questionIds) {
  /**
   * 新用户或不可读存储的默认学习状态。
   * @type {import('./types.js').Progress}
   */
  const empty = { completed: [], mastered: [], prefix: 'ctrl+b', warning: '' };
  try {
    /**
     * 原始序列化记录，不在读取前主动覆盖。
     * @type {string|null|undefined}
     */
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    /**
     * 尚未经过字段校验的持久化记录候选。
     * @type {{version?: unknown, completed?: unknown, mastered?: unknown, prefix?: unknown}|null}
     */
    const value = JSON.parse(raw);
    if (!value || value.version !== 1) return { ...empty, warning: '学习记录格式无法读取。原记录没有被主动删除；新的学习操作将保存为当前格式。' };
    /**
     * 从不可信列表中提取仍存在的课程或题目标识。
     * @type {(list: unknown, ids: string[]) => string[]}
     * @param {unknown} list 未校验的存储字段。
     * @param {string[]} ids 当前允许的标识集合。
     * @returns {string[]} 去重后的有效标识。
     */
    const allowed = (list, ids) => Array.isArray(list) ? [...new Set(list.filter(
      /**
       * 仅保留当前课程或题库中存在的条目。
       * @param {unknown} id 未校验的条目标识。
       * @returns {boolean} 是否属于当前允许集合。
       */
      id => ids.includes(id),
    ))] : [];
    return { completed: allowed(value.completed, lessonIds), mastered: allowed(value.mastered, questionIds), prefix: PREFIXES.includes(value.prefix) ? value.prefix : 'ctrl+b', warning: '' };
  } catch {
    return { ...empty, warning: '无法读取本地学习记录。本次仍可练习，但浏览器可能禁止保存。' };
  }
}
/**
 * 写入原有第一版格式；权限失败只反馈错误，不中断当前学习。
 * @param {import('./types.js').StoragePort} storage 浏览器存储或测试替身。
 * @param {import('./types.js').Progress} progress 当前学习记录。
 * @returns {string} 成功时为空，失败时返回中文提示。
 */
export function saveProgress(storage, progress) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: progress.completed, mastered: progress.mastered, prefix: progress.prefix }));
    return '';
  } catch { return '本地保存失败。本次进度仅在当前页面中保留，请检查浏览器的存储权限。'; }
}
/**
 * 导出可合并到原生配置的前缀片段，而不是伪造完整配置。
 * @param {string} prefix 所选的受支持前缀。
 * @returns {string} TOML 键位片段。
 * @throws {Error} 前缀不在受支持列表时拒绝导出。
 */
export function exportConfig(prefix) {
  if (!PREFIXES.includes(prefix)) throw new Error('不支持的练习前缀');
  return `# Herdr 0.9.5 学习用键位片段\n# 先备份，再合并到已有 [keys]；不要覆盖整个配置文件。\n[keys]\nprefix = "${prefix}"\n`;
}

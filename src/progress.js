export const STORAGE_KEY = 'herdr-lab-v1';
export const PREFIXES = ['ctrl+b', 'ctrl+a', 'ctrl+s'];
export function loadProgress(storage, lessonIds, questionIds) {
  const empty = { completed: [], mastered: [], prefix: 'ctrl+b', warning: '' };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1) return { ...empty, warning: '学习记录格式无法读取。原记录没有被主动删除；新的学习操作将保存为当前格式。' };
    const allowed = (list, ids) => Array.isArray(list) ? [...new Set(list.filter(id => ids.includes(id)))] : [];
    return { completed: allowed(value.completed, lessonIds), mastered: allowed(value.mastered, questionIds), prefix: PREFIXES.includes(value.prefix) ? value.prefix : 'ctrl+b', warning: '' };
  } catch {
    return { ...empty, warning: '无法读取本地学习记录。本次仍可练习，但浏览器可能禁止保存。' };
  }
}
export function saveProgress(storage, progress) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: progress.completed, mastered: progress.mastered, prefix: progress.prefix }));
    return '';
  } catch { return '本地保存失败。本次进度仅在当前页面中保留，请检查浏览器的存储权限。'; }
}
export function exportConfig(prefix) {
  if (!PREFIXES.includes(prefix)) throw new Error('Unsupported prefix');
  return `# Herdr 0.9.5 学习用键位片段\n# 先备份，再合并到已有 [keys]；不要覆盖整个配置文件。\n[keys]\nprefix = "${prefix}"\n`;
}

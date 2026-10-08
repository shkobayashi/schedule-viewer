import type { Category, Task } from "./types";
import { forEachTask } from "./tasks";

/** 保存用にタグを整形する。空白のみは捨て、重複は先のものを残す。0 件なら undefined。 */
export function normalizeTaskTags(
  tags: string[] | undefined,
): string[] | undefined {
  if (tags == null) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.length > 0 ? out : undefined;
}

export function applyTaskTags<T extends { tags?: string[] }>(
  task: T,
  raw: string[] | undefined,
): T {
  const tags = normalizeTaskTags(raw);
  if (tags === undefined) {
    const next = { ...task };
    delete next.tags;
    return next;
  }
  return { ...task, tags };
}

export function taskHasAnySelectedTag(
  task: Task,
  selectedTags: readonly string[],
): boolean {
  if (selectedTags.length === 0) return true;
  const taskTags = task.tags;
  if (!taskTags || taskTags.length === 0) return false;
  for (const tag of selectedTags) {
    if (taskTags.includes(tag)) return true;
  }
  return false;
}

/** 文書の初出順のうち、まだ選ばれているタグだけを返す。 */
export function pruneSelectedTags(
  selected: readonly string[],
  tagsInDocumentOrder: readonly string[],
): string[] {
  const selectedSet = new Set(selected);
  return tagsInDocumentOrder.filter((tag) => selectedSet.has(tag));
}

export function removeSelectedTag(
  selected: readonly string[],
  tag: string,
): string[] {
  return selected.filter((item) => item !== tag);
}

/** 文書を前から見て、タグの初出順で一覧する。 */
export function collectTagsInDocumentOrder(categories: Category[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  forEachTask(categories, (task) => {
    for (const tag of task.tags ?? []) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  });
  return out;
}

export function taskTagsEqualForDiff(a: Task, b: Task): boolean {
  const tagsA = a.tags ?? [];
  const tagsB = b.tags ?? [];
  if (tagsA.length !== tagsB.length) return false;
  for (let i = 0; i < tagsA.length; i += 1) {
    if (tagsA[i] !== tagsB[i]) return false;
  }
  return true;
}

export function formatTaskTagsForDiff(task: Task): string {
  const tags = task.tags;
  if (!tags || tags.length === 0) return "（なし）";
  return tags.map((tag) => JSON.stringify(tag)).join(", ");
}

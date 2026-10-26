import type { TaskRef } from "./dependencies";
import {
  SCHEDULE_SCHEMA_VERSION,
  type Category,
  type HierarchyRowKind,
  type OutlineBranch,
  type OutlineChild,
  type OutlineRoot,
  type ScheduleDocument,
  type ScheduleId,
  type ScheduleLevelDef,
  type Task,
  type TaskGroup,
} from "./types";

export type { HierarchyRowKind, OutlineBranch, OutlineChild, OutlineRoot, ScheduleLevelDef };

export const HIERARCHY_MISMATCH_MESSAGE =
  "階層の定義と入れ子の数が違います。";

/** `levels` が無い文書の暗黙の3段定義（画面の見出し追加用。JSONには書かない）。 */
export const LEGACY_THREE_LEVEL_DEFS: ScheduleLevelDef[] = [
  { name: "カテゴリ", meaning: "最上段の見出し。" },
  { name: "グループ", meaning: "タスクの一つ上の見出し。" },
  { name: "タスク", meaning: "最下段。" },
];

export const LEGACY_THREE_LEVEL_COUNT = LEGACY_THREE_LEVEL_DEFS.length;

export type HierarchyLayoutContext = {
  levelCount: number;
  levels: ScheduleLevelDef[] | null;
  aligned: boolean;
  /** 定義が無く categories だけのときは true */
  useLegacyCategoryRows: boolean;
};

export function isOutlineBranch(node: OutlineChild): node is OutlineBranch {
  return "children" in node && Array.isArray(node.children);
}

export function isTaskNode(node: OutlineChild): node is Task {
  return "start" in node && "end" in node;
}

export function documentHasLevels(
  doc: Pick<ScheduleDocument, "levels">,
): boolean {
  return doc.levels != null && doc.levels.length > 0;
}

export function documentUsesOutlineStorage(
  doc: Pick<ScheduleDocument, "outline" | "categories">,
): boolean {
  return doc.outline != null && doc.outline.length > 0;
}

/** 定義が無いときは 3 段のレガシーとして扱う。 */
export function hierarchyLayoutContext(
  doc: ScheduleDocument,
): HierarchyLayoutContext {
  const levels = doc.levels ?? null;
  const levelCount = levels?.length ?? 3;
  const aligned = levels == null
    ? true
    : assessHierarchyAlignment(doc, levels.length).aligned;
  const categoryCount = doc.categories?.length ?? 0;
  const useLegacyCategoryRows = levels == null && categoryCount > 0;
  return { levelCount, levels, aligned, useLegacyCategoryRows };
}

export type HierarchyAlignment = {
  aligned: boolean;
  reason?: string;
};

export function assessHierarchyAlignment(
  doc: ScheduleDocument,
  levelCount: number,
): HierarchyAlignment {
  const hasCategories = (doc.categories?.length ?? 0) > 0;
  const hasOutline = doc.outline != null && doc.outline.length > 0;
  if (hasCategories && hasOutline) {
    return { aligned: false, reason: "both" };
  }
  if (!hasCategories && !hasOutline) {
    return { aligned: false, reason: "neither" };
  }
  if (hasCategories) {
    return { aligned: false, reason: "storage" };
  }
  if (hasOutline && doc.outline != null) {
    return outlineMatchesLevelCount(doc.outline, levelCount);
  }
  return { aligned: false, reason: "storage" };
}

function outlineMatchesLevelCount(
  nodes: OutlineRoot,
  levelCount: number,
): HierarchyAlignment {
  if (levelCount === 1) {
    if (!nodes.every((node) => isTaskNode(node))) {
      return { aligned: false, reason: "outline-depth" };
    }
    return { aligned: true };
  }
  for (const node of nodes) {
    const result = branchDepthMatches(node, 1, levelCount);
    if (!result.aligned) return result;
  }
  return { aligned: true };
}

function branchDepthMatches(
  node: OutlineChild,
  depth: number,
  levelCount: number,
): HierarchyAlignment {
  if (depth === levelCount) {
    return isTaskNode(node)
      ? { aligned: true }
      : { aligned: false, reason: "outline-depth" };
  }
  if (!isOutlineBranch(node)) {
    return { aligned: false, reason: "outline-depth" };
  }
  if (node.children.length === 0) {
    if (depth === levelCount - 1) {
      return { aligned: true };
    }
    return { aligned: false, reason: "empty-branch" };
  }
  for (const child of node.children) {
    const result = branchDepthMatches(child, depth + 1, levelCount);
    if (!result.aligned) return result;
  }
  return { aligned: true };
}

export function hierarchyRowKind(
  levelIndex: number,
  levelCount: number,
): HierarchyRowKind {
  if (levelCount <= 1) return "middle";
  if (levelIndex === 0) return "top";
  if (levelIndex === levelCount - 2) return "taskParent";
  return "middle";
}

export function hierarchyLevelLabel(
  levels: ScheduleLevelDef[] | null,
  levelIndex: number,
): string {
  if (levels == null) {
    if (levelIndex === 0) return "カテゴリ";
    if (levelIndex === 1) return "グループ";
    return "タスク";
  }
  const item = levels[levelIndex];
  return item?.name ?? "";
}

export function levelBannerText(levels: ScheduleLevelDef[]): string {
  return levels.map((level) => level.name).join(" / ");
}

/** ツールバー「追加」プルダウンの見出し追加ラベル。 */
export function legacyCategoryParentSelectOptions(
  categories: Category[],
): { id: ScheduleId; label: string }[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
  }));
}

export function addTopLevelMenuLabel(
  layout: Pick<HierarchyLayoutContext, "aligned" | "levels">,
): string | null {
  if (!layout.aligned) return null;
  const levels = layout.levels;
  if (levels == null) return "見出しを追加";
  if (levels.length <= 1) return null;
  return "見出しを追加";
}

/** 全タスクを文書から集める。 */
/** MCP と詳細の先行候補用。階層ラベルは `taskHierarchyLabels` に合わせる。 */
export function listTaskRefsFromDocument(doc: ScheduleDocument): TaskRef[] {
  return collectTasksFromDocument(doc).map((task) => {
    const labels = taskHierarchyLabels(doc, task.id);
    return {
      id: task.id,
      name: task.name,
      category: labels.category,
      group: labels.group,
    };
  });
}

export function collectTasksFromDocument(doc: ScheduleDocument): Task[] {
  const tasks: Task[] = [];
  if (documentUsesOutlineStorage(doc) && doc.outline != null) {
    walkOutlineTasks(doc.outline, tasks);
    return tasks;
  }
  for (const category of doc.categories) {
    for (const group of category.groups) {
      tasks.push(...group.tasks);
    }
  }
  return tasks;
}

function walkOutlineTasks(nodes: OutlineRoot, out: Task[]): void {
  for (const node of nodes) {
    if (isTaskNode(node)) {
      out.push(node);
    } else {
      walkOutlineTasks(node.children, out);
    }
  }
}

/** 差分や MCP 用。3 段以外ではルート名とタスクの親名を返す。 */
export function taskHierarchyLabels(
  doc: ScheduleDocument,
  taskId: ScheduleId,
): { category: string; group: string } {
  const ctx = hierarchyLayoutContext(doc);
  if (ctx.useLegacyCategoryRows && ctx.aligned) {
    for (const category of doc.categories) {
      for (const group of category.groups) {
        if (group.tasks.some((task) => task.id === taskId)) {
          return { category: category.name, group: group.name };
        }
      }
    }
    return { category: "", group: "" };
  }
  const path = findTaskPathInOutline(doc, taskId);
  if (path == null) return { category: "", group: "" };
  if (ctx.levelCount === 1) return { category: "", group: "" };
  const names = path.filter((entry) => entry.type === "branch").map((e) => e.name);
  if (names.length === 0) return { category: "", group: "" };
  return {
    category: names[0] ?? "",
    group: names[names.length - 1] ?? "",
  };
}

type PathEntry =
  | { type: "branch"; name: string }
  | { type: "task"; name: string };

function findTaskPathInOutline(
  doc: ScheduleDocument,
  taskId: ScheduleId,
): PathEntry[] | null {
  if (doc.outline == null) return null;
  const stack: PathEntry[] = [];
  const found = searchOutlinePath(doc.outline, taskId, stack);
  return found ? [...stack] : null;
}

function searchOutlinePath(
  nodes: OutlineRoot,
  taskId: ScheduleId,
  stack: PathEntry[],
): boolean {
  for (const node of nodes) {
    if (isTaskNode(node)) {
      if (node.id === taskId) {
        stack.push({ type: "task", name: node.name });
        return true;
      }
      continue;
    }
    stack.push({ type: "branch", name: node.name });
    if (searchOutlinePath(node.children, taskId, stack)) return true;
    stack.pop();
  }
  return false;
}

export function categoriesForSemantics(
  doc: ScheduleDocument,
): Category[] {
  if ((doc.categories?.length ?? 0) > 0) return doc.categories;
  return [];
}

export function cloneOutlineRoot(nodes: OutlineRoot): OutlineRoot {
  return nodes.map((node) => {
    if (isTaskNode(node)) return { ...node, predecessors: [...node.predecessors] };
    return {
      id: node.id,
      name: node.name,
      children: cloneOutlineRoot(node.children),
    };
  });
}

export function cloneOutlineBranches(branches: OutlineBranch[]): OutlineBranch[] {
  return branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    children: cloneOutlineRoot(branch.children),
  }));
}

/** 3 段 outline を categories 形へ（表示・一部編集の共用）。 */
export function outlineToCategories(outline: OutlineRoot): Category[] {
  const categories: Category[] = [];
  for (const node of outline) {
    if (!isOutlineBranch(node)) continue;
    const groups: TaskGroup[] = [];
    for (const child of node.children) {
      if (!isOutlineBranch(child)) continue;
      const tasks = child.children.filter(isTaskNode);
      groups.push({ id: child.id, name: child.name, tasks });
    }
    if (groups.length > 0) {
      categories.push({ id: node.id, name: node.name, groups });
    }
  }
  return categories;
}

/** 編集用に categories または outline からカテゴリ形を得る。 */
export function categoriesForEditing(doc: ScheduleDocument): Category[] {
  if ((doc.categories?.length ?? 0) > 0) return doc.categories;
  const ctx = hierarchyLayoutContext(doc);
  if (doc.outline != null && ctx.levelCount === 3) {
    return outlineToCategories(doc.outline);
  }
  return [];
}

export function tasksUnderOutlineBranch(branch: OutlineBranch): Task[] {
  const tasks: Task[] = [];
  const walk = (children: OutlineChild[]) => {
    for (const child of children) {
      if (isTaskNode(child)) tasks.push(child);
      else walk(child.children);
    }
  };
  walk(branch.children);
  return tasks;
}

export function findTaskInDocument(
  categories: Category[],
  outline: OutlineRoot | undefined,
  id: ScheduleId | null,
): Task | null {
  if (id == null) return null;
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === id) return task;
      }
    }
  }
  if (outline == null) return null;
  for (const node of outline) {
    const found = findTaskInOutlineNode(node, id);
    if (found) return found;
  }
  return null;
}

function findTaskInOutlineNode(node: OutlineChild, id: ScheduleId): Task | null {
  if (isTaskNode(node)) return node.id === id ? node : null;
  for (const child of node.children) {
    const found = findTaskInOutlineNode(child, id);
    if (found) return found;
  }
  return null;
}

/** タスクの保存先が outline である（categories ではない）。 */
export function scheduleStoresTasksInOutline(
  doc: Pick<ScheduleDocument, "levels" | "categories" | "outline">,
): boolean {
  const ctx = hierarchyLayoutContext({
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "",
    milestoneGroups: [],
    milestones: [],
    categories: doc.categories ?? [],
    levels: doc.levels,
    outline: doc.outline,
  });
  return (
    doc.outline != null &&
    doc.outline.length > 0 &&
    !ctx.useLegacyCategoryRows
  );
}

export type TaskParentBranchOption = {
  id: ScheduleId;
  name: string;
};

/** タスク追加先として選べる、タスクの一つ上の段の枝。 */
export function taskParentBranchesInOutline(
  outline: OutlineRoot,
  levelCount: number,
): TaskParentBranchOption[] {
  if (levelCount <= 1) return [];
  const targetDepth = levelCount - 2;
  const result: TaskParentBranchOption[] = [];
  const walk = (nodes: OutlineRoot, depth: number) => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      if (depth === targetDepth) {
        result.push({ id: node.id, name: node.name });
      }
      walk(node.children, depth + 1);
    }
  };
  walk(outline, 0);
  return result;
}

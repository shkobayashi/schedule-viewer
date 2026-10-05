import { clamp, isIsoDateString } from "./dates";
import type { MemberId } from "./memberTypes";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
} from "./scheduleSemantics";
import { applyTaskNote } from "./taskNote";
import {
  SCHEDULE_SCHEMA_VERSION,
  type Category,
  type Milestone,
  type ScheduleDocument,
  type ScheduleId,
  type Task,
  type TaskConfidence,
  type TaskStatus,
} from "./types";
import { formatValidationErrors } from "./validateSchedule";

export function createScheduleId(): ScheduleId {
  return crypto.randomUUID();
}

export function collectScheduleIds(
  categories: Category[],
  milestones: Milestone[],
): Set<ScheduleId> {
  const ids = new Set<ScheduleId>();
  for (const category of categories) {
    ids.add(category.id);
    for (const group of category.groups) {
      ids.add(group.id);
    }
  }
  forEachTask(categories, (task) => {
    ids.add(task.id);
  });
  for (const milestone of milestones) {
    ids.add(milestone.id);
  }
  return ids;
}

export function uniqueScheduleId(
  taken: ReadonlySet<string>,
  createId: () => string = createScheduleId,
): ScheduleId {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const id = createId();
    if (!taken.has(id)) return id;
  }
  throw new Error("スケジュール ID を作れませんでした");
}

export function forEachTask(
  categories: Category[],
  visit: (task: Task, place: { category: string; group: string }) => void,
): void {
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        visit(task, { category: category.name, group: group.name });
      }
    }
  }
}

export function mapTasks(
  categories: Category[],
  update: (task: Task) => Task,
): Category[] {
  return categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map(update),
    })),
  }));
}

export function findTaskPlace(
  categories: Category[],
  taskId: ScheduleId,
): { category: string; group: string } | null {
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === taskId) {
          return { category: category.name, group: group.name };
        }
      }
    }
  }
  return null;
}

export function validateNewTask(
  input: {
    name: string;
    start: string;
    end: string;
    category: string;
    group: string;
  },
  categories: Category[],
): string | null {
  if (!input.name.trim()) return "タスク名を入力してください";
  if (!isIsoDateString(input.start)) return "開始日を入力してください";
  if (!isIsoDateString(input.end)) return "終了日を入力してください";
  if (input.end < input.start) return "終了日は開始日以降にしてください";
  const category = categories.find((item) => item.name === input.category);
  if (!category) return "カテゴリを選択してください";
  if (!category.groups.some((item) => item.name === input.group)) {
    return "グループを選択してください";
  }
  return null;
}


/** 指定タスクの直後へ足す。元が無ければ null。入力は変えない。 */
export function insertTaskAfter(
  categories: Category[],
  task: Task,
  afterId: ScheduleId,
): Category[] | null {
  const cloned = cloneCategories(categories);
  for (const category of cloned) {
    for (const group of category.groups) {
      const index = group.tasks.findIndex((item) => item.id === afterId);
      if (index < 0) continue;
      group.tasks.splice(index + 1, 0, {
        ...task,
        predecessors: [...task.predecessors],
      });
      return cloned;
    }
  }
  return null;
}

export function findTaskOwner(
  categories: Category[],
  taskId: ScheduleId,
): { categoryId: ScheduleId; groupId: ScheduleId } | null {
  for (const category of categories) {
    for (const group of category.groups) {
      if (group.tasks.some((task) => task.id === taskId)) {
        return { categoryId: category.id, groupId: group.id };
      }
    }
  }
  return null;
}

/** 指定したカテゴリとグループの末尾に足す。置き場が無ければ変えない。 */
export function insertTask(
  categories: Category[],
  task: Task,
  place: { category: string; group: string },
): Category[] {
  const cloned = cloneCategories(categories);
  const category = cloned.find((item) => item.name === place.category);
  const group = category?.groups.find((item) => item.name === place.group);
  if (!group) return categories;
  group.tasks.push(task);
  return cloned;
}

/** categories 配列の中で、1件を動かす。見つからない、または位置が同じときは元を返す。 */
export function reorderCategories(
  categories: Category[],
  categoryId: ScheduleId,
  newIndex: number,
): Category[] {
  const fromIndex = categories.findIndex((category) => category.id === categoryId);
  if (fromIndex < 0 || fromIndex === newIndex) return categories;
  const cloned = cloneCategories(categories);
  const [moved] = cloned.splice(fromIndex, 1);
  if (!moved) return categories;
  const toIndex = Math.max(0, Math.min(newIndex, cloned.length));
  cloned.splice(toIndex, 0, moved);
  return cloned;
}

/** 同じカテゴリの groups 配列の中で、1件を動かす。見つからない、または位置が同じときは元を返す。 */
export function reorderGroups(
  categories: Category[],
  groupId: ScheduleId,
  newIndex: number,
): Category[] {
  const cloned = cloneCategories(categories);
  for (const category of cloned) {
    const fromIndex = category.groups.findIndex((group) => group.id === groupId);
    if (fromIndex < 0) continue;
    if (fromIndex === newIndex) return categories;
    const [moved] = category.groups.splice(fromIndex, 1);
    if (!moved) return categories;
    const toIndex = Math.max(0, Math.min(newIndex, category.groups.length));
    category.groups.splice(toIndex, 0, moved);
    return cloned;
  }
  return categories;
}

/** 同じグループの tasks 配列の中で、1件を動かす。見つからない、または位置が同じときは元を返す。 */
export function reorderTaskInGroup(
  categories: Category[],
  taskId: ScheduleId,
  newIndex: number,
): Category[] {
  const cloned = cloneCategories(categories);
  for (const category of cloned) {
    for (const group of category.groups) {
      const fromIndex = group.tasks.findIndex((task) => task.id === taskId);
      if (fromIndex < 0) continue;
      if (fromIndex === newIndex) return categories;
      const tasks = group.tasks;
      const [moved] = tasks.splice(fromIndex, 1);
      const toIndex = Math.max(0, Math.min(newIndex, tasks.length));
      tasks.splice(toIndex, 0, moved);
      return cloned;
    }
  }
  return categories;
}

/** タスクを消し、他タスクの先行からその ID を外す。空のグループとカテゴリは残す。 */
export function removeTask(categories: Category[], taskId: ScheduleId): Category[] {
  return cloneCategories(categories).map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks
        .filter((task) => task.id !== taskId)
        .map((task) => ({
          ...task,
          predecessors: task.predecessors.filter((id) => id !== taskId),
        })),
    })),
  }));
}

export function validateTaskEdit(
  input: {
    name: string;
    start: string;
    end: string;
    progress: number;
  },
): string | null {
  if (!input.name.trim()) return "タスク名を入力してください";
  if (!isIsoDateString(input.start)) return "開始日を入力してください";
  if (!isIsoDateString(input.end)) return "終了日を入力してください";
  if (input.end < input.start) return "終了日は開始日以降にしてください";
  if (
    !Number.isInteger(input.progress) ||
    input.progress < 0 ||
    input.progress > 100
  ) {
    return "進捗率は 0〜100 の整数にしてください";
  }
  return null;
}

export type TaskEditPatch = {
  name: string;
  start: string;
  end: string;
  assigneeId: MemberId | null;
  status: TaskStatus;
  progress: number;
  confidence: TaskConfidence;
  predecessors: ScheduleId[];
  successors: ScheduleId[];
  milestoneId: ScheduleId | null;
  note: string;
};

export type TaskGraphResult =
  | { ok: true; categories: Category[] }
  | { ok: false; message: string };

/** 既存タスクの項目と、他タスクから見た後続を一度に反映する。 */
export function applyTaskEdit(
  categories: Category[],
  taskId: ScheduleId,
  patch: TaskEditPatch,
  milestoneIds: ReadonlySet<ScheduleId>,
): Category[] {
  const progress = clamp(Math.round(patch.progress), 0, 100);
  const predecessors = [
    ...new Set(patch.predecessors.filter((id) => id !== taskId)),
  ];
  const successors = new Set(
    patch.successors.filter((id) => id !== taskId),
  );
  return mapTasks(categories, (task) => {
    if (task.id === taskId) {
      return applyTaskNote(
        {
          ...task,
          name: patch.name.trim(),
          start: patch.start,
          end: patch.end,
          assigneeId: patch.assigneeId,
          status: patch.status,
          progress,
          confidence: patch.confidence,
          predecessors,
          milestoneId:
            patch.milestoneId != null && milestoneIds.has(patch.milestoneId)
              ? patch.milestoneId
              : null,
        },
        patch.note,
      );
    }
    const withoutSelf = task.predecessors.filter((id) => id !== taskId);
    if (!successors.has(task.id)) {
      return { ...task, predecessors: withoutSelf };
    }
    const prevIndex = task.predecessors.indexOf(taskId);
    if (prevIndex >= 0) {
      const nextPreds = [...withoutSelf];
      nextPreds.splice(Math.min(prevIndex, nextPreds.length), 0, taskId);
      return { ...task, predecessors: nextPreds };
    }
    return { ...task, predecessors: [...withoutSelf, taskId] };
  });
}

function rejectTaskGraph(
  categories: Category[],
  milestones: Milestone[],
  title: string,
): string | null {
  const candidate: ScheduleDocument = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    categories,
    milestones,
  };
  const issues = [
    ...validateDependencyCycles(candidate),
    ...validatePredecessorRefs(candidate),
  ];
  if (issues.length === 0) return null;
  return formatValidationErrors(issues);
}

/** 編集ダイアログの保存後のカテゴリ。循環と欠けた先行は拒む。 */
export function categoriesAfterTaskEdit(
  categories: Category[],
  milestones: Milestone[],
  title: string,
  taskId: ScheduleId,
  patch: TaskEditPatch,
): TaskGraphResult {
  const next = applyTaskEdit(
    categories,
    taskId,
    patch,
    new Set(milestones.map((milestone) => milestone.id)),
  );
  const message = rejectTaskGraph(next, milestones, title);
  if (message) return { ok: false, message };
  return { ok: true, categories: next };
}

/** 元タスクの直後に複製を足す。後続は patch にあるときだけ相手へ入る。 */
export function categoriesAfterDuplicate(
  categories: Category[],
  milestones: Milestone[],
  title: string,
  sourceId: ScheduleId,
  newId: ScheduleId,
  patch: TaskEditPatch,
): TaskGraphResult {
  const inserted = insertTaskAfter(
    categories,
    {
      id: newId,
      name: patch.name.trim(),
      start: patch.start,
      end: patch.end,
      assigneeId: patch.assigneeId,
      status: patch.status,
      progress: patch.progress,
      confidence: patch.confidence,
      predecessors: [],
      milestoneId: null,
    },
    sourceId,
  );
  if (!inserted) {
    return { ok: false, message: "複製元のタスクがありません。" };
  }
  return categoriesAfterTaskEdit(
    inserted,
    milestones,
    title,
    newId,
    patch,
  );
}

export function cloneCategories(categories: Category[]): Category[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    groups: category.groups.map((group) => ({
      id: group.id,
      name: group.name,
      tasks: group.tasks.map((task) => ({
        ...task,
        predecessors: [...task.predecessors],
      })),
    })),
  }));
}

export type HierarchyRenameResult = {
  categories: Category[];
  error: string | null;
  changed: boolean;
};

/** 空白だけなら変えない。重複する名前は保存しない。 */
export function renameCategory(
  categories: Category[],
  categoryId: ScheduleId,
  rawName: string,
): HierarchyRenameResult {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) {
    return { categories, error: "カテゴリが見つかりません", changed: false };
  }
  const name = rawName.trim();
  if (!name || name === category.name) {
    return { categories, error: null, changed: false };
  }
  if (categories.some((item) => item.id !== categoryId && item.name === name)) {
    return { categories, error: "カテゴリ名が重複しています", changed: false };
  }
  return {
    categories: categories.map((item) =>
      item.id === categoryId ? { ...item, name } : item,
    ),
    error: null,
    changed: true,
  };
}

/** 空白だけなら変えない。同じカテゴリ内の重複は保存しない。 */
export function renameGroup(
  categories: Category[],
  groupId: ScheduleId,
  rawName: string,
): HierarchyRenameResult {
  const parent = categories.find((category) =>
    category.groups.some((group) => group.id === groupId),
  );
  const group = parent?.groups.find((item) => item.id === groupId);
  if (!parent || !group) {
    return { categories, error: "グループが見つかりません", changed: false };
  }
  const name = rawName.trim();
  if (!name || name === group.name) {
    return { categories, error: null, changed: false };
  }
  if (parent.groups.some((item) => item.id !== groupId && item.name === name)) {
    return {
      categories,
      error: "同じカテゴリ内でグループ名が重複しています",
      changed: false,
    };
  }
  return {
    categories: categories.map((category) =>
      category.id !== parent.id
        ? category
        : {
            ...category,
            groups: category.groups.map((item) =>
              item.id === groupId ? { ...item, name } : item,
            ),
          },
    ),
    error: null,
    changed: true,
  };
}

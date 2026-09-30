import { isIsoDateString } from "./dates";
import type { ScheduleDocument, ScheduleId, Task } from "./types";

export type ValidationIssue = {
  path: string;
  message: string;
};

function nonEmptyName(value: string, label: string, path: string): ValidationIssue | null {
  if (value.trim().length === 0) {
    return { path, message: `${label}は空白にできません` };
  }
  return null;
}

export function validateScheduleSemantics(
  doc: ScheduleDocument,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const titleIssue = nonEmptyName(doc.title, "title", "/title");
  if (titleIssue) issues.push(titleIssue);

  const milestoneIds = new Set<ScheduleId>();
  for (let i = 0; i < doc.milestones.length; i += 1) {
    const milestone = doc.milestones[i];
    const base = `/milestones/${i}`;
    const nameIssue = nonEmptyName(milestone.name, "マイルストン名", `${base}/name`);
    if (nameIssue) issues.push(nameIssue);
    if (!isIsoDateString(milestone.date)) {
      issues.push({ path: `${base}/date`, message: "有効な日付ではありません" });
    }
    if (milestoneIds.has(milestone.id)) {
      issues.push({
        path: `${base}/id`,
        message: "マイルストン ID が重複しています",
      });
    }
    milestoneIds.add(milestone.id);
  }

  const taskIds = new Set<ScheduleId>();
  const categoryIds = new Set<ScheduleId>();
  const groupIds = new Set<ScheduleId>();
  const categoryNames = new Set<string>();

  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci];
    const catPath = `/categories/${ci}`;
    const catNameIssue = nonEmptyName(category.name, "カテゴリ名", `${catPath}/name`);
    if (catNameIssue) issues.push(catNameIssue);
    if (categoryNames.has(category.name)) {
      issues.push({
        path: `${catPath}/name`,
        message: "カテゴリ名が重複しています",
      });
    }
    categoryNames.add(category.name);
    const categoryIdIssue = hierarchyIdConflict(
      "カテゴリ",
      category.id,
      categoryIds,
      milestoneIds,
      categoryIds,
      groupIds,
      taskIds,
    );
    if (categoryIdIssue) {
      issues.push({ path: `${catPath}/id`, message: categoryIdIssue });
    }
    categoryIds.add(category.id);

    const groupNames = new Set<string>();
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi];
      const groupPath = `${catPath}/groups/${gi}`;
      const groupNameIssue = nonEmptyName(group.name, "グループ名", `${groupPath}/name`);
      if (groupNameIssue) issues.push(groupNameIssue);
      if (groupNames.has(group.name)) {
        issues.push({
          path: `${groupPath}/name`,
          message: "同じカテゴリ内でグループ名が重複しています",
        });
      }
      groupNames.add(group.name);
      const groupIdIssue = hierarchyIdConflict(
        "グループ",
        group.id,
        groupIds,
        milestoneIds,
        categoryIds,
        groupIds,
        taskIds,
      );
      if (groupIdIssue) {
        issues.push({ path: `${groupPath}/id`, message: groupIdIssue });
      }
      groupIds.add(group.id);

      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        const taskPath = `${groupPath}/tasks/${ti}`;
        issues.push(
          ...validateTaskSemantics(
            task,
            taskPath,
            taskIds,
            milestoneIds,
            categoryIds,
            groupIds,
          ),
        );
      }
    }
  }

  return issues;
}

function hierarchyIdConflict(
  kind: "カテゴリ" | "グループ",
  id: ScheduleId,
  sameKind: Set<ScheduleId>,
  milestoneIds: Set<ScheduleId>,
  categoryIds: Set<ScheduleId>,
  groupIds: Set<ScheduleId>,
  taskIds: Set<ScheduleId>,
): string | null {
  if (milestoneIds.has(id)) return `${kind} ID がマイルストン ID と重複しています`;
  if (sameKind.has(id)) return `${kind} ID が重複しています`;
  if (categoryIds.has(id)) return `${kind} ID がカテゴリ ID と重複しています`;
  if (groupIds.has(id)) return `${kind} ID がグループ ID と重複しています`;
  if (taskIds.has(id)) return `${kind} ID がタスク ID と重複しています`;
  return null;
}

function validateTaskSemantics(
  task: Task,
  taskPath: string,
  taskIds: Set<ScheduleId>,
  milestoneIds: Set<ScheduleId>,
  categoryIds: Set<ScheduleId>,
  groupIds: Set<ScheduleId>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const nameIssue = nonEmptyName(task.name, "タスク名", `${taskPath}/name`);
  if (nameIssue) issues.push(nameIssue);

  if (!isIsoDateString(task.start)) {
    issues.push({ path: `${taskPath}/start`, message: "有効な開始日ではありません" });
  }
  if (!isIsoDateString(task.end)) {
    issues.push({ path: `${taskPath}/end`, message: "有効な終了日ではありません" });
  }
  if (
    isIsoDateString(task.start) &&
    isIsoDateString(task.end) &&
    task.end < task.start
  ) {
    issues.push({
      path: `${taskPath}/end`,
      message: "終了日は開始日以降である必要があります",
    });
  }

  if (taskIds.has(task.id)) {
    issues.push({ path: `${taskPath}/id`, message: "タスク ID が重複しています" });
  }
  if (milestoneIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "タスク ID がマイルストン ID と重複しています",
    });
  } else if (categoryIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "タスク ID がカテゴリ ID と重複しています",
    });
  } else if (groupIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "タスク ID がグループ ID と重複しています",
    });
  }
  taskIds.add(task.id);

  if (task.milestoneId != null && !milestoneIds.has(task.milestoneId)) {
    issues.push({
      path: `${taskPath}/milestoneId`,
      message: "存在しないマイルストン ID です",
    });
  }

  const predSeen = new Set<ScheduleId>();
  for (let pi = 0; pi < task.predecessors.length; pi += 1) {
    const predId = task.predecessors[pi];
    const predPath = `${taskPath}/predecessors/${pi}`;
    if (predId === task.id) {
      issues.push({ path: predPath, message: "自分自身を先行に指定できません" });
    }
    if (predSeen.has(predId)) {
      issues.push({ path: predPath, message: "先行 ID が重複しています" });
    }
    predSeen.add(predId);
  }

  return issues;
}

/** 先行関係に循環がないか。 */
export function validateDependencyCycles(doc: ScheduleDocument): ValidationIssue[] {
  const byId = new Map<ScheduleId, ScheduleId[]>();
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        byId.set(task.id, task.predecessors);
      }
    }
  }

  const issues: ValidationIssue[] = [];
  const visiting = new Set<ScheduleId>();
  const visited = new Set<ScheduleId>();

  const visit = (id: ScheduleId, stack: ScheduleId[]): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const cycleStart = stack.indexOf(id);
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart) : [id];
      issues.push({
        path: "/categories",
        message: `先行関係に循環があります: ${cycle.join(" → ")}`,
      });
      return;
    }
    visiting.add(id);
    stack.push(id);
    for (const pred of byId.get(id) ?? []) {
      visit(pred, stack);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of byId.keys()) {
    visit(id, []);
  }
  return issues;
}

/** predecessors が実在タスクを指しているか（taskIds 収集後に呼ぶ）。 */
export function validatePredecessorRefs(doc: ScheduleDocument): ValidationIssue[] {
  const taskIds = new Set<ScheduleId>();
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        taskIds.add(task.id);
      }
    }
  }

  const issues: ValidationIssue[] = [];
  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci];
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi];
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        const taskPath = `/categories/${ci}/groups/${gi}/tasks/${ti}`;
        for (let pi = 0; pi < task.predecessors.length; pi += 1) {
          const predId = task.predecessors[pi];
          if (!taskIds.has(predId)) {
            issues.push({
              path: `${taskPath}/predecessors/${pi}`,
              message: "存在しないタスク ID です",
            });
          }
        }
      }
    }
  }
  return issues;
}

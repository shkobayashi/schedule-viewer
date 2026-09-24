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

      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        const taskPath = `${groupPath}/tasks/${ti}`;
        issues.push(...validateTaskSemantics(task, taskPath, taskIds, milestoneIds));
      }
    }
  }

  return issues;
}

function validateTaskSemantics(
  task: Task,
  taskPath: string,
  taskIds: Set<ScheduleId>,
  milestoneIds: Set<ScheduleId>,
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
    task.end <= task.start
  ) {
    issues.push({
      path: `${taskPath}/end`,
      message: "終了日は開始日より後である必要があります",
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

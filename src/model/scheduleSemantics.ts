import { isIsoDateString } from "./dates";
import { collectTasksFromDocument, isOutlineBranch, isTaskNode } from "./hierarchy";
import type { OutlineRoot, ScheduleDocument, ScheduleId, Task } from "./types";

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
  const milestoneGroupIds = new Set<ScheduleId>();
  const milestoneGroupNames = new Set<string>();

  for (let gi = 0; gi < doc.milestoneGroups.length; gi += 1) {
    const group = doc.milestoneGroups[gi];
    const base = `/milestoneGroups/${gi}`;
    const nameIssue = nonEmptyName(
      group.name,
      "マイルストングループ名",
      `${base}/name`,
    );
    if (nameIssue) issues.push(nameIssue);
    if (milestoneGroupNames.has(group.name)) {
      issues.push({
        path: `${base}/name`,
        message: "マイルストングループ名が重複しています",
      });
    }
    milestoneGroupNames.add(group.name);
    const groupIdIssue = hierarchyIdConflict(
      "マイルストングループ",
      group.id,
      milestoneGroupIds,
      new Set(
        doc.milestones.map((item) => item.id),
      ),
      milestoneGroupIds,
      new Set<ScheduleId>(),
      new Set<ScheduleId>(),
      new Set<ScheduleId>(),
    );
    if (groupIdIssue) {
      issues.push({ path: `${base}/id`, message: groupIdIssue });
    }
    milestoneGroupIds.add(group.id);
  }

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
    if (milestoneGroupIds.has(milestone.id)) {
      issues.push({
        path: `${base}/id`,
        message: "マイルストン ID がマイルストングループ ID と重複しています",
      });
    }
    milestoneIds.add(milestone.id);
    if (!milestoneGroupIds.has(milestone.groupId)) {
      issues.push({
        path: `${base}/groupId`,
        message: "存在しないマイルストングループ ID です",
      });
    }
  }

  if (doc.levels != null) {
    if (doc.levels.length < 1 || doc.levels.length > 5) {
      issues.push({
        path: "/levels",
        message: "階層の数は1から5までです",
      });
    }
    for (let li = 0; li < doc.levels.length; li += 1) {
      const level = doc.levels[li];
      const base = `/levels/${li}`;
      const nameIssue = nonEmptyName(level.name, "階層名", `${base}/name`);
      if (nameIssue) issues.push(nameIssue);
      const meaningIssue = nonEmptyName(level.meaning, "階層の意味", `${base}/meaning`);
      if (meaningIssue) issues.push(meaningIssue);
    }
  }

  const hasCategories = doc.categories.length > 0;
  const hasOutline = doc.outline != null && doc.outline.length > 0;
  if (doc.levels == null && !hasCategories) {
    issues.push({
      path: "/categories",
      message: "categories が1件以上必要です",
    });
  }
  if (hasCategories && hasOutline) {
    issues.push({
      path: "/outline",
      message: "categories と outline は同時に書けません",
    });
  }
  if (doc.levels != null && !hasCategories && !hasOutline) {
    issues.push({
      path: "/categories",
      message: "入れ子の categories または outline が必要です",
    });
  }

  const taskIds = new Set<ScheduleId>();
  const categoryIds = new Set<ScheduleId>();
  const groupIds = new Set<ScheduleId>();
  const categoryNames = new Set<string>();
  const branchIds = new Set<ScheduleId>();

  if (hasOutline && doc.outline != null) {
    issues.push(
      ...validateOutlineSemantics(
        doc.outline,
        "/outline",
        0,
        doc.levels?.length ?? 0,
        taskIds,
        milestoneIds,
        milestoneGroupIds,
        categoryIds,
        groupIds,
        branchIds,
      ),
    );
  }

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
      milestoneGroupIds,
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
        milestoneGroupIds,
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
            milestoneGroupIds,
            categoryIds,
            groupIds,
          ),
        );
      }
    }
  }

  return issues;
}

function validateOutlineSemantics(
  nodes: OutlineRoot,
  basePath: string,
  levelIndex: number,
  levelCount: number,
  taskIds: Set<ScheduleId>,
  milestoneIds: Set<ScheduleId>,
  milestoneGroupIds: Set<ScheduleId>,
  categoryIds: Set<ScheduleId>,
  groupIds: Set<ScheduleId>,
  branchIds: Set<ScheduleId>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const siblingNames = new Set<string>();
  const taskParentIndex =
    levelCount <= 1 ? -1 : Math.max(0, levelCount - 2);
  const expectedTaskLevelIndex =
    levelCount === 1 ? 0 : taskParentIndex + 1;

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const nodePath = `${basePath}/${i}`;
    if (isTaskNode(node)) {
      if (levelCount > 0 && levelIndex !== expectedTaskLevelIndex) {
        issues.push({
          path: nodePath,
          message: "タスクの階層が定義と一致しません",
        });
      }
      issues.push(
        ...validateTaskSemantics(
          node,
          nodePath,
          taskIds,
          milestoneIds,
          milestoneGroupIds,
          categoryIds,
          groupIds,
        ),
      );
      continue;
    }
    if (!isOutlineBranch(node)) continue;
    if (levelCount > 0 && levelIndex > taskParentIndex) {
      issues.push({
        path: nodePath,
        message: "階層の深さが定義と一致しません",
      });
    }
    const nameIssue = nonEmptyName(node.name, "階層の名前", `${nodePath}/name`);
    if (nameIssue) issues.push(nameIssue);
    if (siblingNames.has(node.name)) {
      issues.push({
        path: `${nodePath}/name`,
        message: "同じ階層内で名前が重複しています",
      });
    }
    siblingNames.add(node.name);
    const branchConflict = hierarchyIdConflict(
      "グループ",
      node.id,
      branchIds,
      milestoneIds,
      milestoneGroupIds,
      categoryIds,
      groupIds,
      taskIds,
    );
    if (branchConflict) {
      issues.push({ path: `${nodePath}/id`, message: branchConflict });
    }
    branchIds.add(node.id);
    categoryIds.add(node.id);
    if (levelCount > 0) {
      if (levelIndex === taskParentIndex) {
        if (node.children.some((child) => !isTaskNode(child))) {
          issues.push({
            path: `${nodePath}/children`,
            message: "タスクの一つ上の階層の下にはタスクだけを置けます",
          });
        }
      } else if (levelIndex < taskParentIndex) {
        if (node.children.length === 0) {
          issues.push({
            path: `${nodePath}/children`,
            message: "子の階層が必要です",
          });
        }
        if (node.children.some((child) => isTaskNode(child))) {
          issues.push({
            path: `${nodePath}/children`,
            message: "この階層の下には見出しだけを置けます",
          });
        }
      }
    }
    issues.push(
      ...validateOutlineSemantics(
        node.children,
        `${nodePath}/children`,
        levelIndex + 1,
        levelCount,
        taskIds,
        milestoneIds,
        milestoneGroupIds,
        categoryIds,
        groupIds,
        branchIds,
      ),
    );
  }
  return issues;
}

function hierarchyIdConflict(
  kind: "カテゴリ" | "グループ" | "マイルストングループ",
  id: ScheduleId,
  sameKind: Set<ScheduleId>,
  milestoneIds: Set<ScheduleId>,
  milestoneGroupIds: Set<ScheduleId>,
  categoryIds: Set<ScheduleId>,
  groupIds: Set<ScheduleId>,
  taskIds: Set<ScheduleId>,
): string | null {
  if (milestoneIds.has(id)) return `${kind} ID がマイルストン ID と重複しています`;
  if (milestoneGroupIds.has(id)) {
    return `${kind} ID がマイルストングループ ID と重複しています`;
  }
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
  milestoneGroupIds: Set<ScheduleId>,
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
  } else if (milestoneGroupIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "タスク ID がマイルストングループ ID と重複しています",
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

  if (task.note != null && task.note.trim().length === 0) {
    issues.push({ path: `${taskPath}/note`, message: "ノートは空白にできません" });
  }

  if (task.todos != null) {
    for (let ti = 0; ti < task.todos.length; ti += 1) {
      const item = task.todos[ti];
      const itemPath = `${taskPath}/todos/${ti}`;
      const trimmed = item.text.trim();
      if (trimmed.length === 0) {
        issues.push({ path: `${itemPath}/text`, message: "項目の文は空白にできません" });
        continue;
      }
      if (item.text !== trimmed) {
        issues.push({
          path: `${itemPath}/text`,
          message: "項目の文の前後に空白は書けません",
        });
      }
      if (/[\r\n]/.test(item.text)) {
        issues.push({
          path: `${itemPath}/text`,
          message: "項目の文に改行は書けません",
        });
      }
    }
  }

  if (task.tags != null) {
    const tagSeen = new Set<string>();
    for (let ti = 0; ti < task.tags.length; ti += 1) {
      const tag = task.tags[ti];
      const tagPath = `${taskPath}/tags/${ti}`;
      const trimmed = tag.trim();
      if (trimmed.length === 0) {
        issues.push({ path: tagPath, message: "タグは空白にできません" });
        continue;
      }
      if (tag !== trimmed) {
        issues.push({
          path: tagPath,
          message: "タグの前後に空白は書けません",
        });
      }
      if (tagSeen.has(trimmed)) {
        issues.push({ path: tagPath, message: "タグが重複しています" });
      }
      tagSeen.add(trimmed);
    }
  }

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

type TaskLocation = {
  path: string;
  label: string;
};

function taskLocations(doc: ScheduleDocument): Map<ScheduleId, TaskLocation> {
  const locations = new Map<ScheduleId, TaskLocation>();
  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci]!;
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi]!;
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti]!;
        locations.set(task.id, {
          path: `/categories/${ci}/groups/${gi}/tasks/${ti}`,
          label: `${category.name} / ${group.name} / ${task.name}`,
        });
      }
    }
  }
  return locations;
}

/** 先行関係に循環がないか。 */
export function validateDependencyCycles(doc: ScheduleDocument): ValidationIssue[] {
  const byId = new Map<ScheduleId, ScheduleId[]>();
  const locations = taskLocations(doc);
  for (const task of collectTasksFromDocument(doc)) {
    byId.set(task.id, task.predecessors);
  }

  const issues: ValidationIssue[] = [];
  const visiting = new Set<ScheduleId>();
  const visited = new Set<ScheduleId>();

  const visit = (id: ScheduleId, stack: ScheduleId[]): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const cycleStart = stack.indexOf(id);
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart) : [id];
      const first = cycle[0] ?? id;
      const route = cycle
        .map((taskId) => locations.get(taskId)?.label ?? taskId)
        .join(" → ");
      issues.push({
        path: locations.get(first)?.path ?? "/categories",
        message: `先行関係に循環があります: ${route}`,
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
  for (const task of collectTasksFromDocument(doc)) {
    taskIds.add(task.id);
  }

  const issues: ValidationIssue[] = [];
  const walkOutline = (
    nodes: OutlineRoot,
    basePath: string,
  ): void => {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i]!;
      const path = `${basePath}/${i}`;
      if (isTaskNode(node)) {
        for (let pi = 0; pi < node.predecessors.length; pi += 1) {
          const predId = node.predecessors[pi];
          if (!taskIds.has(predId)) {
            issues.push({
              path: `${path}/predecessors/${pi}`,
              message: "存在しないタスク ID です",
            });
          }
        }
        continue;
      }
      walkOutline(node.children, `${path}/children`);
    }
  };

  if (doc.outline != null && doc.outline.length > 0) {
    walkOutline(doc.outline, "/outline");
    return issues;
  }

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

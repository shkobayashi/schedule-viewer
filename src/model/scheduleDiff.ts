import { daysBetween, parseDate } from "./dates";
import { assigneeIdsEqual, formatAssigneeIdsForDiff, taskAssigneeIds } from "./assigneeIds";
import {
  documentUsesOutlineStorage,
  isOutlineBranch,
  isTaskNode,
} from "./hierarchy";
import {
  levelDefsEqual,
  normalizeLevelDefinition,
} from "./hierarchyLevelEdit";
import {
  buildScheduleDiffEntryDisplay,
  type DiffNavTarget,
  type ScheduleDiffEntry,
} from "./scheduleDiffEntry";
import {
  fieldValueChangeLinesForDiff,
  fieldValueSnapshotLinesForDiff,
} from "./fieldValuesDiff";
import { normalizeTaskNote } from "./taskNote";
import { formatTaskTagsForDiff, taskTagsEqualForDiff } from "./taskTags";
import {
  formatTaskTodosForDiff,
  taskTodosEqualForDiff,
} from "./taskTodos";
import type {
  Category,
  Milestone,
  OutlineChild,
  OutlineRoot,
  ScheduleDocument,
  ScheduleFieldDef,
  ScheduleId,
  ScheduleLevelDef,
  Task,
  TaskGroup,
} from "./types";

export const NO_OPEN_SCHEDULE_FILE_MESSAGE = "比べるファイルがありません";

export const SCHEDULE_DIFF_NO_CHANGES = "差はありません";

const HEADER = "差分（今の画面 − 開いているファイル）";

type TaskPlace = {
  categoryId: ScheduleId;
  groupId: ScheduleId;
  category: string;
  group: string;
  task: Task;
};

export function formatScheduleDiff(
  screen: ScheduleDocument,
  file: ScheduleDocument,
  filename: string,
  fields?: readonly ScheduleFieldDef[],
): string {
  const header = `${HEADER}\nファイル: ${filename}`;
  const body = formatScheduleDocumentDiffBody(screen, file, fields);
  if (body === SCHEDULE_DIFF_NO_CHANGES) {
    return `${header}\n${SCHEDULE_DIFF_NO_CHANGES}`;
  }
  return `${header}\n\n${body}`;
}

/** 第一引数が右辺、第二引数が左辺（FILE-07 の → の向き） */
export function formatScheduleDocumentDiffBody(
  right: ScheduleDocument,
  left: ScheduleDocument,
  fields?: readonly ScheduleFieldDef[],
): string {
  const blocks = collectScheduleDiffBlocks(right, left, fields);
  if (blocks.length === 0) {
    return SCHEDULE_DIFF_NO_CHANGES;
  }
  return blocks.join("\n\n");
}

/** 第一引数が右辺、第二引数が左辺（FILE-07 の → の向き） */
export function collectScheduleDiffBlocks(
  right: ScheduleDocument,
  left: ScheduleDocument,
  fields?: readonly ScheduleFieldDef[],
): string[] {
  return collectScheduleDiffEntries(right, left, fields).map((entry) => entry.text);
}

/** 第一引数が右辺、第二引数が左辺（FILE-07 の → の向き） */
export function collectScheduleDiffEntries(
  right: ScheduleDocument,
  left: ScheduleDocument,
  fields?: readonly ScheduleFieldDef[],
): ScheduleDiffEntry[] {
  return diffBlocks(right, left, fields);
}

function diffBlocks(
  screen: ScheduleDocument,
  file: ScheduleDocument,
  fields?: readonly ScheduleFieldDef[],
): ScheduleDiffEntry[] {
  const blocks: ScheduleDiffEntry[] = [];
  const push = (text: string, nav: DiffNavTarget) => {
    const display = buildScheduleDiffEntryDisplay(text);
    blocks.push({ text, nav, ...display });
  };
  const screenTasks = indexTasks(screen);
  const fileTasks = indexTasks(file);
  const screenTaskNames = nameMap(screenTasks);
  const fileTaskNames = nameMap(fileTasks);
  const screenMilestones = indexMilestones(screen);
  const fileMilestones = indexMilestones(file);
  const screenMilestoneNames = milestoneNameMap(screen);
  const fileMilestoneNames = milestoneNameMap(file);
  const screenCategories = new Map(screen.categories.map((category) => [category.id, category]));
  const fileCategories = new Map(file.categories.map((category) => [category.id, category]));
  const screenGroups = indexGroups(screen);
  const fileGroups = indexGroups(file);

  if (screen.title !== file.title) {
    push(`title: ${file.title} → ${screen.title}`, { kind: "title" });
  }

  const screenUsesOutline = documentUsesOutlineStorage(screen);
  const fileUsesOutline = documentUsesOutlineStorage(file);

  if (screenUsesOutline || fileUsesOutline) {
    appendOutlineStorageDiff(
      push,
      screen,
      file,
      screenTasks,
      fileTasks,
      screenTaskNames,
      fileTaskNames,
      screenMilestoneNames,
      fileMilestoneNames,
      fields,
    );
  } else {
    appendCategoriesStorageDiff(
      push,
      screen,
      file,
      fileTasks,
      screenTaskNames,
      fileTaskNames,
      screenMilestoneNames,
      fileMilestoneNames,
      screenCategories,
      fileCategories,
      fileGroups,
      fields,
    );
  }

  const screenMilestoneGroups = new Map(
    screen.milestoneGroups.map((group) => [group.id, group]),
  );
  const fileMilestoneGroups = new Map(
    file.milestoneGroups.map((group) => [group.id, group]),
  );
  const screenMilestoneGroupNames = new Map(
    screen.milestoneGroups.map((group) => [group.id, group.name]),
  );
  const fileMilestoneGroupNames = new Map(
    file.milestoneGroups.map((group) => [group.id, group.name]),
  );

  const milestoneGroupOrder = orderBlock(
    "並び マイルストングループ",
    file.milestoneGroups.map((group) => group.id),
    screen.milestoneGroups.map((group) => group.id),
    (id) => namedId(fileMilestoneGroups.get(id)?.name, id),
    (id) => namedId(screenMilestoneGroups.get(id)?.name, id),
  );
  if (milestoneGroupOrder) push(milestoneGroupOrder, { kind: "order" });

  for (const group of screen.milestoneGroups) {
    const fileGroup = fileMilestoneGroups.get(group.id);
    if (!fileGroup) {
      push(`追加 マイルストングループ ${group.name} (${group.id})`, {
        kind: "milestoneGroup",
        milestoneGroupId: group.id,
      });
      continue;
    }
    if (fileGroup.name !== group.name) {
      push(
        `変更 マイルストングループ ${group.name} (${group.id})\n  name: ${fileGroup.name} → ${group.name}`,
        { kind: "milestoneGroup", milestoneGroupId: group.id },
      );
    }
  }

  const milestoneOrder = orderBlock(
    "並び マイルストン",
    file.milestones.map((milestone) => milestone.id),
    screen.milestones.map((milestone) => milestone.id),
    (id) => namedId(fileMilestones.get(id)?.name, id),
    (id) => namedId(screenMilestones.get(id)?.name, id),
  );
  if (milestoneOrder) push(milestoneOrder, { kind: "order" });

  for (const milestone of screen.milestones) {
    const fileMilestone = fileMilestones.get(milestone.id);
    if (!fileMilestone) {
      push(addedMilestoneBlock(milestone, screenMilestoneGroupNames), {
        kind: "milestone",
        milestoneId: milestone.id,
      });
      continue;
    }
    const changed = changedMilestoneBlock(
      fileMilestone,
      milestone,
      fileMilestoneGroupNames,
      screenMilestoneGroupNames,
    );
    if (changed) push(changed, { kind: "milestone", milestoneId: milestone.id });
  }

  if (!screenUsesOutline && !fileUsesOutline) {
    for (const category of file.categories) {
      const screenCategory = screenCategories.get(category.id);
      if (!screenCategory) {
        push(`削除 カテゴリ ${namedId(category.name, category.id)}`, {
          kind: "deleteCategory",
        });
      }
      for (const group of category.groups) {
        if (!screenGroups.has(group.id)) {
          push(`削除 グループ ${place(category.name, group.name)} (${group.id})`, {
            kind: "deleteGroup",
            categoryId: category.id,
          });
        }
        for (const task of group.tasks) {
          if (!screenTasks.has(task.id)) {
            push(
              deletedTaskBlock(
                category.name,
                group.name,
                task,
                fileTaskNames,
                fileMilestoneNames,
                fields,
              ),
              { kind: "deleteTask", groupId: group.id },
            );
          }
        }
      }
    }
  } else {
    appendOutlineStorageDeletions(
      push,
      screen,
      file,
      screenTasks,
      fileTasks,
      fileTaskNames,
      fileMilestoneNames,
      fields,
    );
  }

  for (const group of file.milestoneGroups) {
    if (!screenMilestoneGroups.has(group.id)) {
      push(`削除 マイルストングループ ${group.name} (${group.id})`, {
        kind: "deleteMilestoneGroup",
      });
    }
  }

  for (const milestone of file.milestones) {
    if (!screenMilestones.has(milestone.id)) {
      push(deletedMilestoneBlock(milestone, fileMilestoneGroupNames), {
        kind: "deleteMilestone",
        milestoneId: milestone.id,
        date: milestone.date,
        groupId: milestone.groupId,
      });
    }
  }

  return blocks;
}

type DiffPush = (text: string, nav: DiffNavTarget) => void;

function appendCategoriesStorageDiff(
  push: DiffPush,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  fileTasks: Map<ScheduleId, TaskPlace>,
  screenTaskNames: Map<ScheduleId, string>,
  fileTaskNames: Map<ScheduleId, string>,
  screenMilestoneNames: Map<ScheduleId, string>,
  fileMilestoneNames: Map<ScheduleId, string>,
  screenCategories: Map<ScheduleId, Category>,
  fileCategories: Map<ScheduleId, Category>,
  fileGroups: Map<ScheduleId, { category: Category; group: TaskGroup }>,
  fields?: readonly ScheduleFieldDef[],
): void {
  const categoryOrder = orderBlock(
    "並び カテゴリ",
    file.categories.map((category) => category.id),
    screen.categories.map((category) => category.id),
    (id) => namedId(fileCategories.get(id)?.name, id),
    (id) => namedId(screenCategories.get(id)?.name, id),
  );
  if (categoryOrder) push(categoryOrder, { kind: "order" });

  for (const category of screen.categories) {
    const fileCategory = fileCategories.get(category.id);
    if (!fileCategory) {
      push(`追加 カテゴリ ${namedId(category.name, category.id)}`, {
        kind: "category",
        categoryId: category.id,
      });
    } else if (fileCategory.name !== category.name) {
      push(
        [
          `変更 カテゴリ ${namedId(category.name, category.id)}`,
          `  name: ${fileCategory.name} → ${category.name}`,
        ].join("\n"),
        { kind: "category", categoryId: category.id },
      );
    }
    if (fileCategory) {
      const groupOrder = orderBlock(
        `並び グループ ${category.name}`,
        fileCategory.groups.map((group) => group.id),
        category.groups.map((group) => group.id),
        (id) => namedId(fileCategory.groups.find((group) => group.id === id)?.name, id),
        (id) => namedId(category.groups.find((group) => group.id === id)?.name, id),
      );
      if (groupOrder) push(groupOrder, { kind: "order" });
    }

    for (const group of category.groups) {
      const fileGroupPlace = fileGroups.get(group.id);
      if (!fileGroupPlace) {
        push(`追加 グループ ${place(category.name, group.name)} (${group.id})`, {
          kind: "group",
          groupId: group.id,
        });
      } else {
        const fileGroup = fileGroupPlace.group;
        const parentChanged = fileGroupPlace.category.id !== category.id;
        const nameChanged = fileGroup.name !== group.name;
        if (parentChanged || nameChanged) {
          const lines = [
            `変更 グループ ${place(category.name, group.name)} (${group.id})`,
          ];
          if (parentChanged) {
            lines.push(
              `  場所: ${place(fileGroupPlace.category.name, fileGroup.name)} → ${place(category.name, group.name)}`,
            );
          }
          if (nameChanged) {
            lines.push(`  name: ${fileGroup.name} → ${group.name}`);
          }
          push(lines.join("\n"), { kind: "group", groupId: group.id });
        }
        const taskOrder = taskOrderBlock(
          `並び タスク ${category.name} / ${group.name}`,
          fileGroup.tasks.map((task) => task.id),
          group.tasks.map((task) => task.id),
          (id) => namedId(taskNameIn(fileGroup.tasks, id), id),
          (id) => namedId(taskNameIn(group.tasks, id), id),
        );
        if (taskOrder) push(taskOrder, { kind: "order" });
      }

      for (const task of group.tasks) {
        const filePlace = fileTasks.get(task.id);
        if (!filePlace) {
          push(
            addedTaskBlock(
              category.name,
              group.name,
              task,
              screenTaskNames,
              screenMilestoneNames,
              fields,
            ),
            { kind: "task", taskId: task.id },
          );
          continue;
        }
        const changed = changedTaskBlock(
          filePlace,
          {
            categoryId: category.id,
            groupId: group.id,
            category: category.name,
            group: group.name,
            task,
          },
          fileTaskNames,
          screenTaskNames,
          fileMilestoneNames,
          screenMilestoneNames,
          fields,
        );
        if (changed) push(changed, { kind: "task", taskId: task.id });
      }
    }
  }
}

type OutlineBranchMeta = {
  name: string;
  parentId: ScheduleId | null;
};

function outlineBranchMetaMap(
  doc: ScheduleDocument,
): Map<ScheduleId, OutlineBranchMeta> {
  const map = new Map<ScheduleId, OutlineBranchMeta>();
  if (!doc.outline) return map;
  const walk = (nodes: OutlineChild[], parentId: ScheduleId | null) => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      map.set(node.id, { name: node.name, parentId });
      walk(node.children, node.id);
    }
  };
  walk(doc.outline, null);
  return map;
}

function unionScheduleIds(...lists: ScheduleId[][]): ScheduleId[] {
  const seen = new Set<ScheduleId>();
  const result: ScheduleId[] = [];
  for (const list of lists) {
    for (const id of list) {
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function directTaskIdsByBranch(outline: OutlineRoot | undefined): Map<ScheduleId, ScheduleId[]> {
  const map = new Map<ScheduleId, ScheduleId[]>();
  if (!outline) return map;
  const walk = (nodes: OutlineChild[]) => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      const taskIds = node.children.filter(isTaskNode).map((task) => task.id);
      if (taskIds.length > 0) {
        map.set(node.id, taskIds);
      }
      walk(node.children);
    }
  };
  walk(outline);
  return map;
}

function levelsDiffBlock(
  fileLevels: ScheduleLevelDef[],
  screenLevels: ScheduleLevelDef[],
): string | null {
  if (levelDefsEqual(fileLevels, screenLevels)) return null;
  const lines: string[] = ["階層の定義"];
  const maxLen = Math.max(fileLevels.length, screenLevels.length);
  for (let index = 0; index < maxLen; index += 1) {
    const fileLevel = fileLevels[index];
    const screenLevel = screenLevels[index];
    if (!fileLevel && screenLevel) {
      lines.push(
        `  [${index + 1}] 追加: ${screenLevel.name} / ${screenLevel.meaning}`,
      );
      continue;
    }
    if (fileLevel && !screenLevel) {
      lines.push(`  [${index + 1}] 削除: ${fileLevel.name}`);
      continue;
    }
    if (!fileLevel || !screenLevel) continue;
    const normalizedFile = normalizeLevelDefinition(fileLevel);
    const normalizedScreen = normalizeLevelDefinition(screenLevel);
    if (normalizedFile.name !== normalizedScreen.name) {
      lines.push(
        `  [${index + 1}] name: ${normalizedFile.name} → ${normalizedScreen.name}`,
      );
    }
    if (normalizedFile.meaning !== normalizedScreen.meaning) {
      lines.push(
        `  [${index + 1}] meaning: ${normalizedFile.meaning} → ${normalizedScreen.meaning}`,
      );
    }
    const fileInstruction = normalizedFile.instruction ?? "（なし）";
    const screenInstruction = normalizedScreen.instruction ?? "（なし）";
    if (fileInstruction !== screenInstruction) {
      lines.push(
        `  [${index + 1}] instruction: ${fileInstruction} → ${screenInstruction}`,
      );
    }
  }
  if (lines.length === 1) return null;
  return lines.join("\n");
}

function appendOutlineStorageDiff(
  push: DiffPush,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  screenTasks: Map<ScheduleId, TaskPlace>,
  fileTasks: Map<ScheduleId, TaskPlace>,
  screenTaskNames: Map<ScheduleId, string>,
  fileTaskNames: Map<ScheduleId, string>,
  screenMilestoneNames: Map<ScheduleId, string>,
  fileMilestoneNames: Map<ScheduleId, string>,
  fields?: readonly ScheduleFieldDef[],
): void {
  const fileLevels = (file.levels ?? []).map((level) => normalizeLevelDefinition(level));
  const screenLevels = (screen.levels ?? []).map((level) =>
    normalizeLevelDefinition(level),
  );
  const levelsBlock = levelsDiffBlock(fileLevels, screenLevels);
  if (levelsBlock) {
    push(levelsBlock, { kind: "order" });
  }

  const screenBranches = outlineBranchMetaMap(screen);
  const fileBranches = outlineBranchMetaMap(file);
  const branchIds = unionScheduleIds(
    [...screenBranches.keys()],
    [...fileBranches.keys()],
  );

  for (const branchId of branchIds) {
    const inScreen = screenBranches.has(branchId);
    const inFile = fileBranches.has(branchId);
    const displayName =
      screenBranches.get(branchId)?.name ??
      fileBranches.get(branchId)?.name ??
      branchId;
    if (!inFile && inScreen) {
      push(`追加 見出し ${displayName}`, { kind: "group", groupId: branchId });
      continue;
    }
    if (inFile && !inScreen) {
      continue;
    }
    const fileName = fileBranches.get(branchId)?.name;
    const screenName = screenBranches.get(branchId)?.name;
    if (fileName !== screenName && fileName != null && screenName != null) {
      push(
        `変更 見出し ${displayName}: ${fileName} → ${screenName}`,
        { kind: "group", groupId: branchId },
      );
    }
  }

  const screenTaskOrder = directTaskIdsByBranch(screen.outline);
  const fileTaskOrder = directTaskIdsByBranch(file.outline);
  const parentIds = unionScheduleIds(
    [...screenTaskOrder.keys()],
    [...fileTaskOrder.keys()],
  );
  for (const parentId of parentIds) {
    const screenIds = screenTaskOrder.get(parentId) ?? [];
    const fileIds = fileTaskOrder.get(parentId) ?? [];
    const samplePlace = screenTasks.get(screenIds[0] ?? "") ?? fileTasks.get(fileIds[0] ?? "");
    if (!samplePlace) continue;
    const orderTitle = `並び タスク ${samplePlace.category} / ${samplePlace.group}`;
    const order = taskOrderBlock(
      orderTitle,
      fileIds,
      screenIds,
      (id) => namedId(fileTaskNames.get(id), id),
      (id) => namedId(screenTaskNames.get(id), id),
    );
    if (order) push(order, { kind: "order" });
  }

  for (const [taskId, screenPlace] of screenTasks) {
    const filePlace = fileTasks.get(taskId);
    if (!filePlace) {
      push(
        addedTaskBlock(
          screenPlace.category,
          screenPlace.group,
          screenPlace.task,
          screenTaskNames,
          screenMilestoneNames,
          fields,
        ),
        { kind: "task", taskId },
      );
      continue;
    }
    const changed = changedTaskBlock(
      filePlace,
      screenPlace,
      fileTaskNames,
      screenTaskNames,
      fileMilestoneNames,
      screenMilestoneNames,
      fields,
    );
    if (changed) push(changed, { kind: "task", taskId });
  }
}

function appendOutlineStorageDeletions(
  push: DiffPush,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  screenTasks: Map<ScheduleId, TaskPlace>,
  fileTasks: Map<ScheduleId, TaskPlace>,
  fileTaskNames: Map<ScheduleId, string>,
  fileMilestoneNames: Map<ScheduleId, string>,
  fields?: readonly ScheduleFieldDef[],
): void {
  const screenBranches = outlineBranchMetaMap(screen);
  const fileBranches = outlineBranchMetaMap(file);
  for (const [branchId, meta] of fileBranches) {
    if (!screenBranches.has(branchId)) {
      push(`削除 見出し ${meta.name}`, { kind: "deleteGroup", categoryId: branchId });
    }
  }

  for (const [taskId, filePlace] of fileTasks) {
    if (screenTasks.has(taskId)) continue;
    push(
      deletedTaskBlock(
        filePlace.category,
        filePlace.group,
        filePlace.task,
        fileTaskNames,
        fileMilestoneNames,
        fields,
      ),
      { kind: "deleteTask", groupId: filePlace.groupId },
    );
  }
}

function addedTaskBlock(
  category: string,
  group: string,
  task: Task,
  taskNames: Map<ScheduleId, string>,
  milestoneNames: Map<ScheduleId, string>,
  fields?: readonly ScheduleFieldDef[],
): string {
  return [
    `追加 ${task.name} (${task.id})`,
    `  場所: ${place(category, group)}`,
    ...taskFieldLines(task, taskNames, milestoneNames, fields),
  ].join("\n");
}

function deletedTaskBlock(
  category: string,
  group: string,
  task: Task,
  taskNames: Map<ScheduleId, string>,
  milestoneNames: Map<ScheduleId, string>,
  fields?: readonly ScheduleFieldDef[],
): string {
  return [
    `削除 ${task.name} (${task.id})`,
    `  場所: ${place(category, group)}`,
    ...taskFieldLines(task, taskNames, milestoneNames, fields),
  ].join("\n");
}

function taskFieldLines(
  task: Task,
  taskNames: Map<ScheduleId, string>,
  milestoneNames: Map<ScheduleId, string>,
  fields?: readonly ScheduleFieldDef[],
): string[] {
  return [
    `  name: ${task.name}`,
    `  start: ${task.start}`,
    `  end: ${task.end}`,
    `  assigneeId: ${formatAssigneeIdsForDiff(taskAssigneeIds(task))}`,
    `  status: ${task.status}`,
    ...(task.colorId != null ? [`  colorId: ${task.colorId}`] : []),
    `  progress: ${task.progress}`,
    `  confidence: ${task.confidence}`,
    `  predecessors: ${formatPredecessorList(task.predecessors, taskNames)}`,
    `  milestoneId: ${formatMilestoneRef(task.milestoneId, milestoneNames)}`,
    `  todos: ${formatTaskTodosForDiff(task)}`,
    `  tags: ${formatTaskTagsForDiff(task)}`,
    ...fieldValueSnapshotLinesForDiff(task, fields),
    `  note: ${noteOf(task) ?? "（なし）"}`,
  ];
}

function changedTaskBlock(
  filePlace: TaskPlace,
  screenPlace: TaskPlace,
  fileTaskNames: Map<ScheduleId, string>,
  screenTaskNames: Map<ScheduleId, string>,
  fileMilestoneNames: Map<ScheduleId, string>,
  screenMilestoneNames: Map<ScheduleId, string>,
  fields?: readonly ScheduleFieldDef[],
): string | null {
  const fileTask = filePlace.task;
  const screenTask = screenPlace.task;
  const lines: string[] = [];
  const locationChanged =
    filePlace.categoryId !== screenPlace.categoryId ||
    filePlace.groupId !== screenPlace.groupId;
  if (fileTask.name !== screenTask.name) {
    lines.push(`  name: ${fileTask.name} → ${screenTask.name}`);
  }
  if (fileTask.start !== screenTask.start) {
    lines.push(`  start: ${formatDayDelta(fileTask.start, screenTask.start)}`);
  }
  if (fileTask.end !== screenTask.end) {
    lines.push(`  end: ${formatDayDelta(fileTask.end, screenTask.end)}`);
  }
  if (!assigneeIdsEqual(taskAssigneeIds(fileTask), taskAssigneeIds(screenTask))) {
    lines.push(
      `  assigneeId: ${formatAssigneeIdsForDiff(taskAssigneeIds(fileTask))} → ${formatAssigneeIdsForDiff(taskAssigneeIds(screenTask))}`,
    );
  }
  if (fileTask.status !== screenTask.status) {
    lines.push(`  status: ${fileTask.status} → ${screenTask.status}`);
  }
  if (fileTask.colorId !== screenTask.colorId) {
    lines.push(
      `  colorId: ${fileTask.colorId ?? "（なし）"} → ${screenTask.colorId ?? "（なし）"}`,
    );
  }
  if (fileTask.progress !== screenTask.progress) {
    lines.push(`  progress: ${fileTask.progress} → ${screenTask.progress}`);
  }
  if (fileTask.confidence !== screenTask.confidence) {
    lines.push(
      `  confidence: ${fileTask.confidence} → ${screenTask.confidence}`,
    );
  }
  const predecessors = formatPredecessorDelta(
    fileTask.predecessors,
    screenTask.predecessors,
    fileTaskNames,
    screenTaskNames,
  );
  if (predecessors) lines.push(`  ${predecessors}`);
  if (fileTask.milestoneId !== screenTask.milestoneId) {
    lines.push(
      `  milestoneId: ${formatMilestoneRef(fileTask.milestoneId, fileMilestoneNames)} → ${formatMilestoneRef(screenTask.milestoneId, screenMilestoneNames)}`,
    );
  }
  if (!taskTodosEqualForDiff(fileTask, screenTask)) {
    lines.push(
      `  todos: ${formatTaskTodosForDiff(fileTask)} → ${formatTaskTodosForDiff(screenTask)}`,
    );
  }
  if (!taskTagsEqualForDiff(fileTask, screenTask)) {
    lines.push(
      `  tags: ${formatTaskTagsForDiff(fileTask)} → ${formatTaskTagsForDiff(screenTask)}`,
    );
  }
  lines.push(...fieldValueChangeLinesForDiff(fileTask, screenTask, fields));
  const fileNote = noteOf(fileTask);
  const screenNote = noteOf(screenTask);
  if (fileNote !== screenNote) {
    lines.push(`  note: ${fileNote ?? "（なし）"} → ${screenNote ?? "（なし）"}`);
  }
  if (!locationChanged && lines.length === 0) return null;
  const location = locationChanged
    ? `${place(filePlace.category, filePlace.group)} → ${place(screenPlace.category, screenPlace.group)}`
    : place(screenPlace.category, screenPlace.group);
  return [`変更 ${screenTask.name} (${screenTask.id})`, `  場所: ${location}`, ...lines].join("\n");
}

function addedMilestoneBlock(
  milestone: Milestone,
  groupNames: Map<ScheduleId, string>,
): string {
  return [
    `追加 ${milestone.name} (${milestone.id})`,
    ...milestoneFieldLines(milestone, groupNames),
  ].join("\n");
}

function deletedMilestoneBlock(
  milestone: Milestone,
  groupNames: Map<ScheduleId, string>,
): string {
  return [
    `削除 ${milestone.name} (${milestone.id})`,
    ...milestoneFieldLines(milestone, groupNames),
  ].join("\n");
}

function milestoneFieldLines(
  milestone: Milestone,
  groupNames: Map<ScheduleId, string>,
): string[] {
  return [
    `  name: ${milestone.name}`,
    `  date: ${milestone.date}`,
    `  confidence: ${milestone.confidence}`,
    `  groupId: ${groupNames.get(milestone.groupId) ?? milestone.groupId}`,
  ];
}

function changedMilestoneBlock(
  fileMilestone: Milestone,
  screenMilestone: Milestone,
  fileGroupNames: Map<ScheduleId, string>,
  screenGroupNames: Map<ScheduleId, string>,
): string | null {
  const lines: string[] = [];
  if (fileMilestone.name !== screenMilestone.name) {
    lines.push(`  name: ${fileMilestone.name} → ${screenMilestone.name}`);
  }
  if (fileMilestone.date !== screenMilestone.date) {
    lines.push(`  date: ${formatDayDelta(fileMilestone.date, screenMilestone.date)}`);
  }
  if (fileMilestone.confidence !== screenMilestone.confidence) {
    lines.push(
      `  confidence: ${fileMilestone.confidence} → ${screenMilestone.confidence}`,
    );
  }
  if (fileMilestone.groupId !== screenMilestone.groupId) {
    lines.push(
      `  groupId: ${fileGroupNames.get(fileMilestone.groupId) ?? fileMilestone.groupId} → ${screenGroupNames.get(screenMilestone.groupId) ?? screenMilestone.groupId}`,
    );
  }
  if (lines.length === 0) return null;
  return [`変更 ${screenMilestone.name} (${screenMilestone.id})`, ...lines].join("\n");
}

function taskOrderBlock(
  title: string,
  fileTaskIds: string[],
  screenTaskIds: string[],
  formatFile: (key: string) => string,
  formatScreen: (key: string) => string,
): string | null {
  const fileSet = new Set(fileTaskIds);
  const addedIds = screenTaskIds.filter((id) => !fileSet.has(id));

  let trailingAddedCount = 0;
  for (let index = screenTaskIds.length - 1; index >= 0; index -= 1) {
    if (!fileSet.has(screenTaskIds[index])) trailingAddedCount += 1;
    else break;
  }

  const existingInScreen = screenTaskIds.filter((id) => fileSet.has(id));
  const left = fileTaskIds.filter((id) => screenTaskIds.includes(id));
  const reorderAmongExisting = left.join("\0") !== existingInScreen.join("\0");
  const midInsert = addedIds.some(
    (id) => screenTaskIds.indexOf(id) < screenTaskIds.length - trailingAddedCount,
  );
  if (!reorderAmongExisting && !midInsert) return null;

  const rightIds = screenTaskIds.slice(
    0,
    screenTaskIds.length - trailingAddedCount,
  );
  const leftText = left.map(formatFile).join(", ");
  const rightText = rightIds.map(formatScreen).join(", ");
  return `${title}\n  ${leftText} → ${rightText}`;
}

function orderBlock(
  title: string,
  fileKeys: string[],
  screenKeys: string[],
  formatFile: (key: string) => string,
  formatScreen: (key: string) => string = formatFile,
): string | null {
  const screenSet = new Set(screenKeys);
  const fileSet = new Set(fileKeys);
  const fileRemaining = fileKeys.filter((key) => screenSet.has(key));
  const screenRemaining = screenKeys.filter((key) => fileSet.has(key));
  if (fileRemaining.join("\0") === screenRemaining.join("\0")) return null;
  const left = fileRemaining.map(formatFile).join(", ");
  const right = screenRemaining.map(formatScreen).join(", ");
  return `${title}\n  ${left} → ${right}`;
}

function formatPredecessorDelta(
  fileIds: ScheduleId[],
  screenIds: ScheduleId[],
  fileNames: Map<ScheduleId, string>,
  screenNames: Map<ScheduleId, string>,
): string | null {
  const fileSet = new Set(fileIds);
  const screenSet = new Set(screenIds);
  const added = screenIds.filter((id) => !fileSet.has(id));
  const removed = fileIds.filter((id) => !screenSet.has(id));
  if (added.length === 0 && removed.length === 0) return null;
  const parts = [
    ...added.map((id) => `+${namedId(screenNames.get(id), id)}`),
    ...removed.map((id) => `-${namedId(fileNames.get(id), id)}`),
  ];
  return `predecessors: ${parts.join(", ")}`;
}

function formatPredecessorList(ids: ScheduleId[], names: Map<ScheduleId, string>): string {
  if (ids.length === 0) return "（なし）";
  return ids.map((id) => namedId(names.get(id), id)).join(", ");
}

function formatMilestoneRef(
  id: ScheduleId | null,
  names: Map<ScheduleId, string>,
): string {
  if (id == null) return "（なし）";
  return namedId(names.get(id), id);
}

function formatDayDelta(from: string, to: string): string {
  const days = daysBetween(parseDate(from), parseDate(to));
  const signed = days > 0 ? `+${days}` : String(days);
  return `${from} → ${to}（${signed}日）`;
}

function noteOf(task: Task): string | undefined {
  return normalizeTaskNote(task.note);
}

function place(category: string, group: string): string {
  return `${category} / ${group}`;
}

function namedId(name: string | undefined, id: string): string {
  return name ? `${name} (${id})` : `(${id})`;
}

function taskNameIn(tasks: Task[], id: string): string | undefined {
  return tasks.find((task) => task.id === id)?.name;
}

function indexGroups(
  doc: ScheduleDocument,
): Map<ScheduleId, { category: Category; group: TaskGroup }> {
  const map = new Map<ScheduleId, { category: Category; group: TaskGroup }>();
  for (const category of doc.categories) {
    for (const group of category.groups) {
      map.set(group.id, { category, group });
    }
  }
  return map;
}

function indexTasks(doc: ScheduleDocument): Map<ScheduleId, TaskPlace> {
  const map = new Map<ScheduleId, TaskPlace>();
  if (doc.outline != null && doc.outline.length > 0) {
    const walk = (
      nodes: import("./types").OutlineChild[],
      ancestors: { category: string; group: string; categoryId: ScheduleId; groupId: ScheduleId }[],
    ) => {
      for (const node of nodes) {
        if ("start" in node && "end" in node) {
          const parent = ancestors[ancestors.length - 1];
          const root = ancestors[0];
          map.set(node.id, {
            categoryId: root?.categoryId ?? parent?.categoryId ?? node.id,
            groupId: parent?.groupId ?? root?.groupId ?? node.id,
            category: root?.category ?? parent?.category ?? "",
            group: parent?.group ?? root?.group ?? "",
            task: node,
          });
        } else {
          const nextAncestors = [
            ...ancestors,
            {
              categoryId: ancestors[0]?.categoryId ?? node.id,
              groupId: node.id,
              category: ancestors[0]?.category ?? node.name,
              group: node.name,
            },
          ];
          walk(node.children, nextAncestors);
        }
      }
    };
    walk(doc.outline, []);
    return map;
  }
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        map.set(task.id, {
          categoryId: category.id,
          groupId: group.id,
          category: category.name,
          group: group.name,
          task,
        });
      }
    }
  }
  return map;
}

function indexMilestones(doc: ScheduleDocument): Map<ScheduleId, Milestone> {
  return new Map(doc.milestones.map((milestone) => [milestone.id, milestone]));
}

function nameMap(tasks: Map<ScheduleId, TaskPlace>): Map<ScheduleId, string> {
  return new Map([...tasks].map(([id, place]) => [id, place.task.name]));
}

function milestoneNameMap(doc: ScheduleDocument): Map<ScheduleId, string> {
  return new Map(doc.milestones.map((milestone) => [milestone.id, milestone.name]));
}

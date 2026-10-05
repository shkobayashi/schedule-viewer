import { daysBetween, parseDate } from "./dates";
import { normalizeTaskNote } from "./taskNote";
import type {
  Category,
  Milestone,
  ScheduleDocument,
  ScheduleId,
  Task,
  TaskGroup,
} from "./types";

export const NO_OPEN_SCHEDULE_FILE_MESSAGE = "比べるファイルがありません";

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
): string {
  const header = `${HEADER}\nファイル: ${filename}`;
  const blocks = diffBlocks(screen, file);
  if (blocks.length === 0) {
    return `${header}\n差はありません`;
  }
  return `${header}\n\n${blocks.join("\n\n")}`;
}

function diffBlocks(screen: ScheduleDocument, file: ScheduleDocument): string[] {
  const blocks: string[] = [];
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
    blocks.push(`title: ${file.title} → ${screen.title}`);
  }

  const categoryOrder = orderBlock(
    "並び カテゴリ",
    file.categories.map((category) => category.id),
    screen.categories.map((category) => category.id),
    (id) => namedId(fileCategories.get(id)?.name, id),
    (id) => namedId(screenCategories.get(id)?.name, id),
  );
  if (categoryOrder) blocks.push(categoryOrder);

  for (const category of screen.categories) {
    const fileCategory = fileCategories.get(category.id);
    if (!fileCategory) {
      blocks.push(`追加 カテゴリ ${namedId(category.name, category.id)}`);
    } else if (fileCategory.name !== category.name) {
      blocks.push(
        [
          `変更 カテゴリ ${namedId(category.name, category.id)}`,
          `  name: ${fileCategory.name} → ${category.name}`,
        ].join("\n"),
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
      if (groupOrder) blocks.push(groupOrder);
    }

    for (const group of category.groups) {
      const fileGroupPlace = fileGroups.get(group.id);
      if (!fileGroupPlace) {
        blocks.push(`追加 グループ ${place(category.name, group.name)} (${group.id})`);
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
          blocks.push(lines.join("\n"));
        }
        const taskOrder = taskOrderBlock(
          `並び タスク ${category.name} / ${group.name}`,
          fileGroup.tasks.map((task) => task.id),
          group.tasks.map((task) => task.id),
          (id) => namedId(taskNameIn(fileGroup.tasks, id), id),
          (id) => namedId(taskNameIn(group.tasks, id), id),
        );
        if (taskOrder) blocks.push(taskOrder);
      }

      for (const task of group.tasks) {
        const filePlace = fileTasks.get(task.id);
        if (!filePlace) {
          blocks.push(
            addedTaskBlock(category.name, group.name, task, screenTaskNames, screenMilestoneNames),
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
        );
        if (changed) blocks.push(changed);
      }
    }
  }

  const milestoneOrder = orderBlock(
    "並び マイルストン",
    file.milestones.map((milestone) => milestone.id),
    screen.milestones.map((milestone) => milestone.id),
    (id) => namedId(fileMilestones.get(id)?.name, id),
    (id) => namedId(screenMilestones.get(id)?.name, id),
  );
  if (milestoneOrder) blocks.push(milestoneOrder);

  for (const milestone of screen.milestones) {
    const fileMilestone = fileMilestones.get(milestone.id);
    if (!fileMilestone) {
      blocks.push(addedMilestoneBlock(milestone));
      continue;
    }
    const changed = changedMilestoneBlock(fileMilestone, milestone);
    if (changed) blocks.push(changed);
  }

  for (const category of file.categories) {
    const screenCategory = screenCategories.get(category.id);
    if (!screenCategory) {
      blocks.push(`削除 カテゴリ ${namedId(category.name, category.id)}`);
    }
    for (const group of category.groups) {
      if (!screenGroups.has(group.id)) {
        blocks.push(`削除 グループ ${place(category.name, group.name)} (${group.id})`);
      }
      for (const task of group.tasks) {
        if (!screenTasks.has(task.id)) {
          blocks.push(
            deletedTaskBlock(category.name, group.name, task, fileTaskNames, fileMilestoneNames),
          );
        }
      }
    }
  }

  for (const milestone of file.milestones) {
    if (!screenMilestones.has(milestone.id)) {
      blocks.push(deletedMilestoneBlock(milestone));
    }
  }

  return blocks;
}

function addedTaskBlock(
  category: string,
  group: string,
  task: Task,
  taskNames: Map<ScheduleId, string>,
  milestoneNames: Map<ScheduleId, string>,
): string {
  return [
    `追加 ${task.name} (${task.id})`,
    `  場所: ${place(category, group)}`,
    ...taskFieldLines(task, taskNames, milestoneNames),
  ].join("\n");
}

function deletedTaskBlock(
  category: string,
  group: string,
  task: Task,
  taskNames: Map<ScheduleId, string>,
  milestoneNames: Map<ScheduleId, string>,
): string {
  return [
    `削除 ${task.name} (${task.id})`,
    `  場所: ${place(category, group)}`,
    ...taskFieldLines(task, taskNames, milestoneNames),
  ].join("\n");
}

function taskFieldLines(
  task: Task,
  taskNames: Map<ScheduleId, string>,
  milestoneNames: Map<ScheduleId, string>,
): string[] {
  return [
    `  name: ${task.name}`,
    `  start: ${task.start}`,
    `  end: ${task.end}`,
    `  assigneeId: ${formatAssignee(task.assigneeId)}`,
    `  status: ${task.status}`,
    `  progress: ${task.progress}`,
    `  confidence: ${task.confidence}`,
    `  predecessors: ${formatPredecessorList(task.predecessors, taskNames)}`,
    `  milestoneId: ${formatMilestoneRef(task.milestoneId, milestoneNames)}`,
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
  if (fileTask.assigneeId !== screenTask.assigneeId) {
    lines.push(
      `  assigneeId: ${formatAssignee(fileTask.assigneeId)} → ${formatAssignee(screenTask.assigneeId)}`,
    );
  }
  if (fileTask.status !== screenTask.status) {
    lines.push(`  status: ${fileTask.status} → ${screenTask.status}`);
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

function addedMilestoneBlock(milestone: Milestone): string {
  return [`追加 ${milestone.name} (${milestone.id})`, ...milestoneFieldLines(milestone)].join("\n");
}

function deletedMilestoneBlock(milestone: Milestone): string {
  return [`削除 ${milestone.name} (${milestone.id})`, ...milestoneFieldLines(milestone)].join("\n");
}

function milestoneFieldLines(milestone: Milestone): string[] {
  return [
    `  name: ${milestone.name}`,
    `  date: ${milestone.date}`,
    `  confidence: ${milestone.confidence}`,
  ];
}

function changedMilestoneBlock(fileMilestone: Milestone, screenMilestone: Milestone): string | null {
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

function formatAssignee(id: string | null): string {
  return id == null ? "null" : id;
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

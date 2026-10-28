import {
  anyUsesOutlineBaseline,
  appendOutlineHierarchyClassification,
  buildOutlineNonConflictingMergedDocument,
  outlineTaskPlaceMap,
} from "./baselineDiffsOutline";
import { documentUsesOutlineStorage } from "./hierarchy";
import { normalizeTaskNote } from "./taskNote";
import { fieldValuesEqualForDiff } from "./fieldValuesDiff";
import { taskTagsEqualForDiff } from "./taskTags";
import { taskTodosEqualForDiff } from "./taskTodos";
import {
  SCHEDULE_DIFF_NO_CHANGES,
  formatScheduleDocumentDiffBody,
} from "./scheduleDiff";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  ScheduleDocument,
  ScheduleId,
  ScheduleFieldDef,
  Task,
  TaskGroup,
} from "./types";

export type BaselineDiffClassification =
  | "画面のみ"
  | "ファイルのみ"
  | "同じ"
  | "異なる"
  | "削除と変更"
  | "追加と削除";

export type BaselineClassificationLine = {
  label: BaselineDiffClassification;
  headline: string;
};

type ClassificationLine = BaselineClassificationLine;

export function isBaselineConflictLabel(
  label: BaselineDiffClassification,
): boolean {
  return (
    label === "異なる" ||
    label === "削除と変更" ||
    label === "追加と削除"
  );
}

export function collectBaselineClassificationLines(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): BaselineClassificationLine[] {
  return buildClassificationLines(baseline, screen, file);
}

type TaskPlace = {
  categoryId: ScheduleId;
  groupId: ScheduleId;
  task: Task;
};

export function formatBaselineDiffsText(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  filename: string,
  fields?: readonly ScheduleFieldDef[],
): string {
  const screenBody = formatScheduleDocumentDiffBody(screen, baseline, fields);
  const fileBody = formatScheduleDocumentDiffBody(file, baseline, fields);
  const classificationLines = buildClassificationLines(baseline, screen, file);

  const parts = [
    "画面:",
    "",
    screenBody,
    "",
    `ファイル: ${filename}`,
    "",
    fileBody,
    "",
    "分類:",
    classificationLines.length === 0
      ? SCHEDULE_DIFF_NO_CHANGES
      : classificationLines
          .map((line) => `${line.label} ${line.headline}`)
          .join("\n"),
  ];
  return parts.join("\n");
}

function buildClassificationLines(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): ClassificationLine[] {
  const lines: ClassificationLine[] = [];

  const titleLabel = classifyScalar(
    baseline.title,
    screen.title,
    file.title,
  );
  if (titleLabel) {
    const rightTitle =
      titleLabel === "ファイルのみ" ? file.title : screen.title;
    lines.push({
      label: titleLabel,
      headline: `title: ${baseline.title} → ${rightTitle}`,
    });
  }

  const outlinePath = anyUsesOutlineBaseline(baseline, screen, file);
  if (outlinePath) {
    appendOutlineHierarchyClassification(lines, baseline, screen, file);
  } else {
  pushOrderLine(
    lines,
    "並び カテゴリ",
    baseline.categories.map((c) => c.id),
    screen.categories.map((c) => c.id),
    file.categories.map((c) => c.id),
  );

  const baselineCategories = categoryMap(baseline);
  const screenCategories = categoryMap(screen);
  const fileCategories = categoryMap(file);
  const categoryIds = unionIds([
    ...baselineCategories.keys(),
    ...screenCategories.keys(),
    ...fileCategories.keys(),
  ]);

  for (const categoryId of categoryIds) {
    const inB = baselineCategories.has(categoryId);
    const inS = screenCategories.has(categoryId);
    const inF = fileCategories.has(categoryId);
    const label = classifyPresence(
      inB,
      inS,
      inF,
      inB && inS
        ? categoryEquals(baselineCategories.get(categoryId)!, screenCategories.get(categoryId)!)
        : true,
      inB && inF
        ? categoryEquals(baselineCategories.get(categoryId)!, fileCategories.get(categoryId)!)
        : true,
      inS && inF
        ? categoryEquals(screenCategories.get(categoryId)!, fileCategories.get(categoryId)!)
        : true,
    );
    if (!label) continue;
    const headline = categoryHeadline(label, baseline, screen, file, categoryId, inB, inS, inF);
    if (headline) lines.push({ label, headline });
  }

  for (const categoryId of categoryIds) {
    const bCat = baselineCategories.get(categoryId);
    const sCat = screenCategories.get(categoryId);
    const fCat = fileCategories.get(categoryId);
    const catName =
      sCat?.name ?? fCat?.name ?? bCat?.name ?? categoryId;
    pushOrderLine(
      lines,
      `並び グループ ${catName}`,
      bCat?.groups.map((g) => g.id) ?? [],
      sCat?.groups.map((g) => g.id) ?? [],
      fCat?.groups.map((g) => g.id) ?? [],
    );
  }

  const baselineGroups = groupMap(baseline);
  const screenGroups = groupMap(screen);
  const fileGroups = groupMap(file);
  const groupIds = unionIds([
    ...baselineGroups.keys(),
    ...screenGroups.keys(),
    ...fileGroups.keys(),
  ]);

  for (const groupId of groupIds) {
    const inB = baselineGroups.has(groupId);
    const inS = screenGroups.has(groupId);
    const inF = fileGroups.has(groupId);
    const label = classifyPresence(
      inB,
      inS,
      inF,
      inB && inS
        ? groupEquals(baselineGroups.get(groupId)!, screenGroups.get(groupId)!)
        : true,
      inB && inF
        ? groupEquals(baselineGroups.get(groupId)!, fileGroups.get(groupId)!)
        : true,
      inS && inF
        ? groupEquals(screenGroups.get(groupId)!, fileGroups.get(groupId)!)
        : true,
    );
    if (!label) continue;
    const headline = groupHeadline(
      label,
      baseline,
      screen,
      file,
      groupId,
      inB,
      inS,
      inF,
    );
    if (headline) lines.push({ label, headline });
  }

  for (const groupId of groupIds) {
    const bGroup = baselineGroups.get(groupId);
    const sGroup = screenGroups.get(groupId);
    const fGroup = fileGroups.get(groupId);
    const place = groupPlaceLabel(baseline, screen, file, groupId);
    pushOrderLine(
      lines,
      `並び タスク ${place}`,
      bGroup?.group.tasks.map((t) => t.id) ?? [],
      sGroup?.group.tasks.map((t) => t.id) ?? [],
      fGroup?.group.tasks.map((t) => t.id) ?? [],
    );
  }
  }

  const baselineTasks = taskMap(baseline);
  const screenTasks = taskMap(screen);
  const fileTasks = taskMap(file);
  const taskIds = unionIds([
    ...baselineTasks.keys(),
    ...screenTasks.keys(),
    ...fileTasks.keys(),
  ]);

  for (const taskId of taskIds) {
    const inB = baselineTasks.has(taskId);
    const inS = screenTasks.has(taskId);
    const inF = fileTasks.has(taskId);
    const label = classifyPresence(
      inB,
      inS,
      inF,
      inB && inS
        ? taskPlaceEquals(baselineTasks.get(taskId)!, screenTasks.get(taskId)!)
        : true,
      inB && inF
        ? taskPlaceEquals(baselineTasks.get(taskId)!, fileTasks.get(taskId)!)
        : true,
      inS && inF
        ? taskPlaceEquals(screenTasks.get(taskId)!, fileTasks.get(taskId)!)
        : true,
    );
    if (!label) continue;
    const headline = taskHeadline(
      label,
      baseline,
      screen,
      file,
      taskId,
      inB,
      inS,
      inF,
    );
    if (headline) lines.push({ label, headline });
  }

  pushOrderLine(
    lines,
    "並び マイルストングループ",
    baseline.milestoneGroups.map((g) => g.id),
    screen.milestoneGroups.map((g) => g.id),
    file.milestoneGroups.map((g) => g.id),
  );

  const baselineMsGroups = milestoneGroupMap(baseline);
  const screenMsGroups = milestoneGroupMap(screen);
  const fileMsGroups = milestoneGroupMap(file);
  const msGroupIds = unionIds([
    ...baselineMsGroups.keys(),
    ...screenMsGroups.keys(),
    ...fileMsGroups.keys(),
  ]);

  for (const groupId of msGroupIds) {
    const inB = baselineMsGroups.has(groupId);
    const inS = screenMsGroups.has(groupId);
    const inF = fileMsGroups.has(groupId);
    const label = classifyPresence(
      inB,
      inS,
      inF,
      inB && inS
        ? milestoneGroupEquals(
            baselineMsGroups.get(groupId)!,
            screenMsGroups.get(groupId)!,
          )
        : true,
      inB && inF
        ? milestoneGroupEquals(
            baselineMsGroups.get(groupId)!,
            fileMsGroups.get(groupId)!,
          )
        : true,
      inS && inF
        ? milestoneGroupEquals(
            screenMsGroups.get(groupId)!,
            fileMsGroups.get(groupId)!,
          )
        : true,
    );
    if (!label) continue;
    const headline = milestoneGroupHeadline(
      label,
      baseline,
      screen,
      file,
      groupId,
      inB,
      inS,
      inF,
    );
    if (headline) lines.push({ label, headline });
  }

  pushOrderLine(
    lines,
    "並び マイルストン",
    baseline.milestones.map((m) => m.id),
    screen.milestones.map((m) => m.id),
    file.milestones.map((m) => m.id),
  );

  const baselineMs = milestoneMap(baseline);
  const screenMs = milestoneMap(screen);
  const fileMs = milestoneMap(file);
  const msIds = unionIds([
    ...baselineMs.keys(),
    ...screenMs.keys(),
    ...fileMs.keys(),
  ]);

  for (const milestoneId of msIds) {
    const inB = baselineMs.has(milestoneId);
    const inS = screenMs.has(milestoneId);
    const inF = fileMs.has(milestoneId);
    const label = classifyPresence(
      inB,
      inS,
      inF,
      inB && inS
        ? milestoneEquals(baselineMs.get(milestoneId)!, screenMs.get(milestoneId)!)
        : true,
      inB && inF
        ? milestoneEquals(baselineMs.get(milestoneId)!, fileMs.get(milestoneId)!)
        : true,
      inS && inF
        ? milestoneEquals(screenMs.get(milestoneId)!, fileMs.get(milestoneId)!)
        : true,
    );
    if (!label) continue;
    const headline = milestoneHeadline(
      label,
      baseline,
      screen,
      file,
      milestoneId,
      inB,
      inS,
      inF,
    );
    if (headline) lines.push({ label, headline });
  }

  return lines;
}

function pushOrderLine(
  lines: ClassificationLine[],
  headline: string,
  baselineOrder: ScheduleId[],
  screenOrder: ScheduleId[],
  fileOrder: ScheduleId[],
): void {
  const label = classifyOrder(baselineOrder, screenOrder, fileOrder);
  if (label) {
    lines.push({ label, headline });
  }
}

function classifyOrder(
  baselineOrder: ScheduleId[],
  screenOrder: ScheduleId[],
  fileOrder: ScheduleId[],
): BaselineDiffClassification | null {
  const bEqS = orderEqual(baselineOrder, screenOrder);
  const bEqF = orderEqual(baselineOrder, fileOrder);
  if (bEqS && bEqF) return null;
  if (!bEqS && bEqF) return "画面のみ";
  if (bEqS && !bEqF) return "ファイルのみ";
  if (!bEqS && !bEqF && orderEqual(screenOrder, fileOrder)) return "同じ";
  return "異なる";
}

function classifyScalar(
  baseline: string,
  screen: string,
  file: string,
): BaselineDiffClassification | null {
  const bEqS = baseline === screen;
  const bEqF = baseline === file;
  if (bEqS && bEqF) return null;
  if (!bEqS && bEqF) return "画面のみ";
  if (bEqS && !bEqF) return "ファイルのみ";
  if (!bEqS && !bEqF && screen === file) return "同じ";
  return "異なる";
}

function classifyPresence(
  inBaseline: boolean,
  inScreen: boolean,
  inFile: boolean,
  baselineEqualsScreen: boolean,
  baselineEqualsFile: boolean,
  screenEqualsFile: boolean,
): BaselineDiffClassification | null {
  if (!inBaseline && inScreen && inFile) {
    return screenEqualsFile ? "同じ" : "異なる";
  }
  if (inBaseline && !inScreen && !inFile) {
    return "同じ";
  }
  if (inBaseline && inScreen && inFile) {
    if (baselineEqualsScreen && baselineEqualsFile) return null;
    if (!baselineEqualsScreen && baselineEqualsFile) return "画面のみ";
    if (baselineEqualsScreen && !baselineEqualsFile) return "ファイルのみ";
    if (!baselineEqualsScreen && !baselineEqualsFile && screenEqualsFile) {
      return "同じ";
    }
    if (!baselineEqualsScreen && !baselineEqualsFile && !screenEqualsFile) {
      return "異なる";
    }
    return null;
  }
  if (inBaseline && !inScreen && inFile) {
    if (baselineEqualsFile) return "画面のみ";
    return "削除と変更";
  }
  if (inBaseline && inScreen && !inFile) {
    if (baselineEqualsScreen) return "ファイルのみ";
    return "削除と変更";
  }
  if (!inBaseline && inScreen && !inFile) return "画面のみ";
  if (!inBaseline && !inScreen && inFile) return "ファイルのみ";
  return null;
}

function categoryHeadline(
  label: BaselineDiffClassification,
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  categoryId: ScheduleId,
  inB: boolean,
  inS: boolean,
  inF: boolean,
): string | null {
  const named = (doc: ScheduleDocument, id: ScheduleId) =>
    categoryMap(doc).get(id)?.name ?? id;
  if (!inB && inS) {
    return `追加 カテゴリ ${namedId(named(screen, categoryId), categoryId)}`;
  }
  if (!inB && inF) {
    return `追加 カテゴリ ${namedId(named(file, categoryId), categoryId)}`;
  }
  if (inB && !inS && !inF) {
    return `削除 カテゴリ ${namedId(named(baseline, categoryId), categoryId)}`;
  }
  if (inB && inS && !inF && label === "ファイルのみ") {
    return `削除 カテゴリ ${namedId(named(baseline, categoryId), categoryId)}`;
  }
  if (inB && !inS && inF && label === "画面のみ") {
    return `削除 カテゴリ ${namedId(named(baseline, categoryId), categoryId)}`;
  }
  if (label === "削除と変更") {
    const side = inS ? screen : file;
    const cat = categoryMap(side).get(categoryId);
    if (!cat) return null;
    return `変更 カテゴリ ${namedId(cat.name, categoryId)}`;
  }
  const cat = categoryMap(screen).get(categoryId) ?? categoryMap(file).get(categoryId);
  if (!cat) return null;
  return `変更 カテゴリ ${namedId(cat.name, categoryId)}`;
}

function groupHeadline(
  label: BaselineDiffClassification,
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  groupId: ScheduleId,
  inB: boolean,
  inS: boolean,
  inF: boolean,
): string | null {
  const placeOf = (doc: ScheduleDocument, id: ScheduleId) => {
    const entry = groupMap(doc).get(id);
    if (!entry) return null;
    return `${entry.category.name} / ${entry.group.name}`;
  };
  if (!inB && inS) {
    const p = placeOf(screen, groupId);
    return p ? `追加 グループ ${p} (${groupId})` : null;
  }
  if (!inB && inF) {
    const p = placeOf(file, groupId);
    return p ? `追加 グループ ${p} (${groupId})` : null;
  }
  if (inB && !inS && !inF) {
    const p = placeOf(baseline, groupId);
    return p ? `削除 グループ ${p} (${groupId})` : null;
  }
  if (inB && inS && !inF && label === "ファイルのみ") {
    const p = placeOf(baseline, groupId);
    return p ? `削除 グループ ${p} (${groupId})` : null;
  }
  if (inB && !inS && inF && label === "画面のみ") {
    const p = placeOf(baseline, groupId);
    return p ? `削除 グループ ${p} (${groupId})` : null;
  }
  const side = inS ? screen : file;
  const entry = groupMap(side).get(groupId) ?? groupMap(screen).get(groupId);
  if (!entry) return null;
  const place = `${entry.category.name} / ${entry.group.name}`;
  if (label === "削除と変更") {
    return `変更 グループ ${place} (${groupId})`;
  }
  return `変更 グループ ${place} (${groupId})`;
}

function taskHeadline(
  label: BaselineDiffClassification,
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  taskId: ScheduleId,
  inB: boolean,
  inS: boolean,
  inF: boolean,
): string | null {
  const placeOf = (doc: ScheduleDocument, id: ScheduleId) => {
    const entry = taskMap(doc).get(id);
    if (!entry) return null;
    const cat = categoryMap(doc).get(entry.categoryId)?.name ?? "";
    const grp = groupMap(doc).get(entry.groupId)?.group.name ?? "";
    return `${cat} / ${grp}`;
  };
  if (!inB && inS) {
    const task = taskMap(screen).get(taskId)!.task;
    const p = placeOf(screen, taskId);
    return p ? `追加 ${task.name} (${taskId})` : null;
  }
  if (!inB && inF) {
    const task = taskMap(file).get(taskId)!.task;
    const p = placeOf(file, taskId);
    return p ? `追加 ${task.name} (${taskId})` : null;
  }
  if (inB && !inS && !inF) {
    const task = taskMap(baseline).get(taskId)!.task;
    const p = placeOf(baseline, taskId);
    return p ? `削除 ${task.name} (${taskId})` : null;
  }
  if (inB && inS && !inF && label === "ファイルのみ") {
    const task = taskMap(baseline).get(taskId)!.task;
    const p = placeOf(baseline, taskId);
    return p ? `削除 ${task.name} (${taskId})` : null;
  }
  if (inB && !inS && inF && label === "画面のみ") {
    const task = taskMap(baseline).get(taskId)!.task;
    const p = placeOf(baseline, taskId);
    return p ? `削除 ${task.name} (${taskId})` : null;
  }
  const task =
    taskMap(screen).get(taskId)?.task ?? taskMap(file).get(taskId)?.task;
  if (!task) return null;
  if (label === "削除と変更") {
    const side = inS ? screen : file;
    const t = taskMap(side).get(taskId)!.task;
    return `変更 ${t.name} (${taskId})`;
  }
  return `変更 ${task.name} (${taskId})`;
}

function milestoneGroupHeadline(
  label: BaselineDiffClassification,
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  groupId: ScheduleId,
  inB: boolean,
  inS: boolean,
  inF: boolean,
): string | null {
  const named = (doc: ScheduleDocument, id: ScheduleId) =>
    milestoneGroupMap(doc).get(id)?.name ?? id;
  if (!inB && inS) {
    return `追加 マイルストングループ ${named(screen, groupId)} (${groupId})`;
  }
  if (!inB && inF) {
    return `追加 マイルストングループ ${named(file, groupId)} (${groupId})`;
  }
  if (inB && !inS && !inF) {
    return `削除 マイルストングループ ${named(baseline, groupId)} (${groupId})`;
  }
  if (inB && inS && !inF && label === "ファイルのみ") {
    return `削除 マイルストングループ ${named(baseline, groupId)} (${groupId})`;
  }
  if (inB && !inS && inF && label === "画面のみ") {
    return `削除 マイルストングループ ${named(baseline, groupId)} (${groupId})`;
  }
  const name =
    milestoneGroupMap(screen).get(groupId)?.name ??
    milestoneGroupMap(file).get(groupId)?.name ??
    groupId;
  return `変更 マイルストングループ ${name} (${groupId})`;
}

function milestoneHeadline(
  label: BaselineDiffClassification,
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  milestoneId: ScheduleId,
  inB: boolean,
  inS: boolean,
  inF: boolean,
): string | null {
  if (!inB && inS) {
    const m = milestoneMap(screen).get(milestoneId)!;
    return `追加 ${m.name} (${milestoneId})`;
  }
  if (!inB && inF) {
    const m = milestoneMap(file).get(milestoneId)!;
    return `追加 ${m.name} (${milestoneId})`;
  }
  if (inB && !inS && !inF) {
    const m = milestoneMap(baseline).get(milestoneId)!;
    return `削除 ${m.name} (${milestoneId})`;
  }
  if (inB && inS && !inF && label === "ファイルのみ") {
    const m = milestoneMap(baseline).get(milestoneId)!;
    return `削除 ${m.name} (${milestoneId})`;
  }
  if (inB && !inS && inF && label === "画面のみ") {
    const m = milestoneMap(baseline).get(milestoneId)!;
    return `削除 ${m.name} (${milestoneId})`;
  }
  const m =
    milestoneMap(screen).get(milestoneId) ?? milestoneMap(file).get(milestoneId);
  if (!m) return null;
  return `変更 ${m.name} (${milestoneId})`;
}

function groupPlaceLabel(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  groupId: ScheduleId,
): string {
  const entry =
    groupMap(screen).get(groupId) ??
    groupMap(file).get(groupId) ??
    groupMap(baseline).get(groupId);
  if (!entry) return groupId;
  return `${entry.category.name} / ${entry.group.name}`;
}

function categoryEquals(a: Category, b: Category): boolean {
  return a.name === b.name;
}

function groupEquals(
  a: { category: Category; group: TaskGroup },
  b: { category: Category; group: TaskGroup },
): boolean {
  return a.category.id === b.category.id && a.group.name === b.group.name;
}

function milestoneGroupEquals(a: MilestoneGroup, b: MilestoneGroup): boolean {
  return a.name === b.name;
}

function milestoneEquals(a: Milestone, b: Milestone): boolean {
  return (
    a.name === b.name &&
    a.date === b.date &&
    a.confidence === b.confidence &&
    a.groupId === b.groupId
  );
}

function taskPlaceEquals(a: TaskPlace, b: TaskPlace): boolean {
  return (
    a.categoryId === b.categoryId &&
    a.groupId === b.groupId &&
    taskContentEquals(a.task, b.task)
  );
}

function taskContentEquals(a: Task, b: Task): boolean {
  return (
    a.name === b.name &&
    a.start === b.start &&
    a.end === b.end &&
    a.assigneeId === b.assigneeId &&
    a.status === b.status &&
    a.progress === b.progress &&
    a.confidence === b.confidence &&
    predecessorSetEqual(a.predecessors, b.predecessors) &&
    a.milestoneId === b.milestoneId &&
    taskTodosEqualForDiff(a, b) &&
    taskTagsEqualForDiff(a, b) &&
    normalizeTaskNote(a.note) === normalizeTaskNote(b.note) &&
    fieldValuesEqualForDiff(a, b)
  );
}

function predecessorSetEqual(a: ScheduleId[], b: ScheduleId[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

function orderEqual(a: ScheduleId[], b: ScheduleId[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function namedId(name: string, id: string): string {
  return `${name} (${id})`;
}

function unionIds(ids: ScheduleId[]): ScheduleId[] {
  const seen = new Set<ScheduleId>();
  const result: ScheduleId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function categoryMap(doc: ScheduleDocument): Map<ScheduleId, Category> {
  return new Map(doc.categories.map((c) => [c.id, c]));
}

function milestoneGroupMap(doc: ScheduleDocument): Map<ScheduleId, MilestoneGroup> {
  return new Map(doc.milestoneGroups.map((g) => [g.id, g]));
}

function milestoneMap(doc: ScheduleDocument): Map<ScheduleId, Milestone> {
  return new Map(doc.milestones.map((m) => [m.id, m]));
}

function groupMap(
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

function taskMap(doc: ScheduleDocument): Map<ScheduleId, TaskPlace> {
  if (documentUsesOutlineStorage(doc)) {
    return outlineTaskPlaceMap(doc);
  }
  const map = new Map<ScheduleId, TaskPlace>();
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        map.set(task.id, {
          categoryId: category.id,
          groupId: group.id,
          task,
        });
      }
    }
  }
  return map;
}

function pickMergeSide(
  label: BaselineDiffClassification | null,
): "baseline" | "screen" | "file" {
  if (label === "ファイルのみ") return "file";
  if (label === "画面のみ" || label === "同じ") return "screen";
  return "baseline";
}

function cloneTask(task: Task): Task {
  return {
    ...task,
    predecessors: [...task.predecessors],
    tags: task.tags ? [...task.tags] : undefined,
  };
}

function orderedIds(
  label: BaselineDiffClassification | null,
  baselineOrder: ScheduleId[],
  screenOrder: ScheduleId[],
  fileOrder: ScheduleId[],
): ScheduleId[] {
  const side = pickMergeSide(label);
  if (side === "screen") return [...screenOrder];
  if (side === "file") return [...fileOrder];
  return [...baselineOrder];
}

function mergeTaskPlace(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  taskId: ScheduleId,
): TaskPlace | null {
  const baselineTasks = taskMap(baseline);
  const screenTasks = taskMap(screen);
  const fileTasks = taskMap(file);
  const inB = baselineTasks.has(taskId);
  const inS = screenTasks.has(taskId);
  const inF = fileTasks.has(taskId);
  const label = classifyPresence(
    inB,
    inS,
    inF,
    inB && inS
      ? taskPlaceEquals(baselineTasks.get(taskId)!, screenTasks.get(taskId)!)
      : true,
    inB && inF
      ? taskPlaceEquals(baselineTasks.get(taskId)!, fileTasks.get(taskId)!)
      : true,
    inS && inF
      ? taskPlaceEquals(screenTasks.get(taskId)!, fileTasks.get(taskId)!)
      : true,
  );
  if (label != null && isBaselineConflictLabel(label)) {
    return null;
  }
  if (!inS && !inF) return null;
  const side = pickMergeSide(label);
  const source =
    side === "screen"
      ? screenTasks.get(taskId)
      : side === "file"
        ? fileTasks.get(taskId)
        : baselineTasks.get(taskId);
  if (!source) return null;
  return {
    categoryId: source.categoryId,
    groupId: source.groupId,
    task: cloneTask(source.task),
  };
}

function mergeGroup(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  groupId: ScheduleId,
): { categoryId: ScheduleId; group: TaskGroup } | null {
  const baselineGroups = groupMap(baseline);
  const screenGroups = groupMap(screen);
  const fileGroups = groupMap(file);
  const inB = baselineGroups.has(groupId);
  const inS = screenGroups.has(groupId);
  const inF = fileGroups.has(groupId);
  const label = classifyPresence(
    inB,
    inS,
    inF,
    inB && inS
      ? groupEquals(baselineGroups.get(groupId)!, screenGroups.get(groupId)!)
      : true,
    inB && inF
      ? groupEquals(baselineGroups.get(groupId)!, fileGroups.get(groupId)!)
      : true,
    inS && inF
      ? groupEquals(screenGroups.get(groupId)!, fileGroups.get(groupId)!)
      : true,
  );
  if (label != null && isBaselineConflictLabel(label)) {
    return null;
  }
  if (!inS && !inF) return null;
  const side = pickMergeSide(label);
  const entry =
    side === "screen"
      ? screenGroups.get(groupId)
      : side === "file"
        ? fileGroups.get(groupId)
        : baselineGroups.get(groupId);
  if (!entry) return null;

  const bGroup = baselineGroups.get(groupId);
  const sGroup = screenGroups.get(groupId);
  const fGroup = fileGroups.get(groupId);
  const taskOrderLabel = classifyOrder(
    bGroup?.group.tasks.map((t) => t.id) ?? [],
    sGroup?.group.tasks.map((t) => t.id) ?? [],
    fGroup?.group.tasks.map((t) => t.id) ?? [],
  );
  if (taskOrderLabel != null && isBaselineConflictLabel(taskOrderLabel)) {
    return null;
  }
  const taskIds = orderedIds(
    taskOrderLabel,
    bGroup?.group.tasks.map((t) => t.id) ?? [],
    sGroup?.group.tasks.map((t) => t.id) ?? [],
    fGroup?.group.tasks.map((t) => t.id) ?? [],
  );
  const tasks: Task[] = [];
  for (const taskId of taskIds) {
    const place = mergeTaskPlace(baseline, screen, file, taskId);
    if (!place || place.groupId !== groupId) continue;
    tasks.push(place.task);
  }
  return {
    categoryId: entry.category.id,
    group: { id: groupId, name: entry.group.name, tasks },
  };
}

function mergeCategory(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  categoryId: ScheduleId,
): Category | null {
  const baselineCategories = categoryMap(baseline);
  const screenCategories = categoryMap(screen);
  const fileCategories = categoryMap(file);
  const inB = baselineCategories.has(categoryId);
  const inS = screenCategories.has(categoryId);
  const inF = fileCategories.has(categoryId);
  const label = classifyPresence(
    inB,
    inS,
    inF,
    inB && inS
      ? categoryEquals(
          baselineCategories.get(categoryId)!,
          screenCategories.get(categoryId)!,
        )
      : true,
    inB && inF
      ? categoryEquals(
          baselineCategories.get(categoryId)!,
          fileCategories.get(categoryId)!,
        )
      : true,
    inS && inF
      ? categoryEquals(
          screenCategories.get(categoryId)!,
          fileCategories.get(categoryId)!,
        )
      : true,
  );
  if (label != null && isBaselineConflictLabel(label)) {
    return null;
  }
  if (!inS && !inF) return null;
  const side = pickMergeSide(label);
  const sourceCategory =
    side === "screen"
      ? screenCategories.get(categoryId)
      : side === "file"
        ? fileCategories.get(categoryId)
        : baselineCategories.get(categoryId);
  if (!sourceCategory) return null;

  const bCat = baselineCategories.get(categoryId);
  const sCat = screenCategories.get(categoryId);
  const fCat = fileCategories.get(categoryId);
  const groupOrderLabel = classifyOrder(
    bCat?.groups.map((g) => g.id) ?? [],
    sCat?.groups.map((g) => g.id) ?? [],
    fCat?.groups.map((g) => g.id) ?? [],
  );
  if (groupOrderLabel != null && isBaselineConflictLabel(groupOrderLabel)) {
    return null;
  }
  const groupIds = orderedIds(
    groupOrderLabel,
    bCat?.groups.map((g) => g.id) ?? [],
    sCat?.groups.map((g) => g.id) ?? [],
    fCat?.groups.map((g) => g.id) ?? [],
  );
  const groups: TaskGroup[] = [];
  for (const groupId of groupIds) {
    const merged = mergeGroup(baseline, screen, file, groupId);
    if (!merged || merged.categoryId !== categoryId) continue;
    groups.push(merged.group);
  }
  return {
    id: categoryId,
    name: sourceCategory.name,
    groups,
  };
}

function mergeMilestone(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  milestoneId: ScheduleId,
): Milestone | null {
  const baselineMs = milestoneMap(baseline);
  const screenMs = milestoneMap(screen);
  const fileMs = milestoneMap(file);
  const inB = baselineMs.has(milestoneId);
  const inS = screenMs.has(milestoneId);
  const inF = fileMs.has(milestoneId);
  const label = classifyPresence(
    inB,
    inS,
    inF,
    inB && inS
      ? milestoneEquals(baselineMs.get(milestoneId)!, screenMs.get(milestoneId)!)
      : true,
    inB && inF
      ? milestoneEquals(baselineMs.get(milestoneId)!, fileMs.get(milestoneId)!)
      : true,
    inS && inF
      ? milestoneEquals(screenMs.get(milestoneId)!, fileMs.get(milestoneId)!)
      : true,
  );
  if (label != null && isBaselineConflictLabel(label)) {
    return null;
  }
  if (!inS && !inF) return null;
  const side = pickMergeSide(label);
  const source =
    side === "screen"
      ? screenMs.get(milestoneId)
      : side === "file"
        ? fileMs.get(milestoneId)
        : baselineMs.get(milestoneId);
  if (!source) return null;
  return { ...source };
}

function mergeMilestoneGroup(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  groupId: ScheduleId,
): MilestoneGroup | null {
  const baselineMsGroups = milestoneGroupMap(baseline);
  const screenMsGroups = milestoneGroupMap(screen);
  const fileMsGroups = milestoneGroupMap(file);
  const inB = baselineMsGroups.has(groupId);
  const inS = screenMsGroups.has(groupId);
  const inF = fileMsGroups.has(groupId);
  const label = classifyPresence(
    inB,
    inS,
    inF,
    inB && inS
      ? milestoneGroupEquals(
          baselineMsGroups.get(groupId)!,
          screenMsGroups.get(groupId)!,
        )
      : true,
    inB && inF
      ? milestoneGroupEquals(
          baselineMsGroups.get(groupId)!,
          fileMsGroups.get(groupId)!,
        )
      : true,
    inS && inF
      ? milestoneGroupEquals(
          screenMsGroups.get(groupId)!,
          fileMsGroups.get(groupId)!,
        )
      : true,
  );
  if (label != null && isBaselineConflictLabel(label)) {
    return null;
  }
  if (!inS && !inF) return null;
  const side = pickMergeSide(label);
  const source =
    side === "screen"
      ? screenMsGroups.get(groupId)
      : side === "file"
        ? fileMsGroups.get(groupId)
        : baselineMsGroups.get(groupId);
  if (!source) return null;
  return { ...source };
}

/** 分類に衝突が無いときだけ、起点から合成した文書を返す。衝突があるときは null。 */
export function buildNonConflictingMergedDocument(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): ScheduleDocument | null {
  const lines = buildClassificationLines(baseline, screen, file);
  if (lines.some((line) => isBaselineConflictLabel(line.label))) {
    return null;
  }

  const titleLabel = classifyScalar(baseline.title, screen.title, file.title);
  if (titleLabel != null && isBaselineConflictLabel(titleLabel)) {
    return null;
  }
  const title =
    titleLabel === "ファイルのみ"
      ? file.title
      : titleLabel != null
        ? screen.title
        : baseline.title;

  const msGroupOrderLabel = classifyOrder(
    baseline.milestoneGroups.map((g) => g.id),
    screen.milestoneGroups.map((g) => g.id),
    file.milestoneGroups.map((g) => g.id),
  );
  if (msGroupOrderLabel != null && isBaselineConflictLabel(msGroupOrderLabel)) {
    return null;
  }
  const msGroupIds = orderedIds(
    msGroupOrderLabel,
    baseline.milestoneGroups.map((g) => g.id),
    screen.milestoneGroups.map((g) => g.id),
    file.milestoneGroups.map((g) => g.id),
  );
  const milestoneGroups: MilestoneGroup[] = [];
  for (const groupId of msGroupIds) {
    const merged = mergeMilestoneGroup(baseline, screen, file, groupId);
    if (merged) milestoneGroups.push(merged);
  }

  const msOrderLabel = classifyOrder(
    baseline.milestones.map((m) => m.id),
    screen.milestones.map((m) => m.id),
    file.milestones.map((m) => m.id),
  );
  if (msOrderLabel != null && isBaselineConflictLabel(msOrderLabel)) {
    return null;
  }
  const msIds = orderedIds(
    msOrderLabel,
    baseline.milestones.map((m) => m.id),
    screen.milestones.map((m) => m.id),
    file.milestones.map((m) => m.id),
  );
  const milestones: Milestone[] = [];
  for (const milestoneId of msIds) {
    const merged = mergeMilestone(baseline, screen, file, milestoneId);
    if (merged) milestones.push(merged);
  }

  if (anyUsesOutlineBaseline(baseline, screen, file)) {
    return buildOutlineNonConflictingMergedDocument(
      baseline,
      screen,
      file,
      milestoneGroups,
      milestones,
    );
  }

  const categoryOrderLabel = classifyOrder(
    baseline.categories.map((c) => c.id),
    screen.categories.map((c) => c.id),
    file.categories.map((c) => c.id),
  );
  if (categoryOrderLabel != null && isBaselineConflictLabel(categoryOrderLabel)) {
    return null;
  }
  const categoryIds = orderedIds(
    categoryOrderLabel,
    baseline.categories.map((c) => c.id),
    screen.categories.map((c) => c.id),
    file.categories.map((c) => c.id),
  );
  const categories: Category[] = [];
  for (const categoryId of categoryIds) {
    const merged = mergeCategory(baseline, screen, file, categoryId);
    if (merged) categories.push(merged);
  }

  if (categories.length === 0) {
    return null;
  }

  return {
    schemaVersion: baseline.schemaVersion,
    title,
    milestoneGroups,
    milestones,
    categories,
  };
}

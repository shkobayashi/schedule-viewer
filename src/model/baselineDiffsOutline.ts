import {
  documentHasLevels,
  documentUsesOutlineStorage,
  isOutlineBranch,
  isTaskNode,
} from "./hierarchy";
import { normalizeLevelDefinition } from "./hierarchyLevelEdit";
import type {
  BaselineClassificationLine,
  BaselineDiffClassification,
} from "./baselineDiffs";
import { normalizeTaskNote } from "./taskNote";
import { taskTagsEqualForDiff } from "./taskTags";
import { taskTodosEqualForDiff } from "./taskTodos";
import type {
  Milestone,
  MilestoneGroup,
  OutlineChild,
  OutlineRoot,
  ScheduleDocument,
  ScheduleId,
  ScheduleLevelDef,
  Task,
} from "./types";

type BranchMeta = {
  name: string;
  parentId: ScheduleId | null;
};

export function anyUsesOutlineBaseline(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): boolean {
  return [baseline, screen, file].some(
    (doc) =>
      documentUsesOutlineStorage(doc) ||
      (documentHasLevels(doc) && (doc.outline?.length ?? 0) > 0),
  );
}

export function outlineScreenFileStructureConflict(
  screen: ScheduleDocument,
  file: ScheduleDocument,
): boolean {
  const screenOutline = documentUsesOutlineStorage(screen);
  const fileOutline = documentUsesOutlineStorage(file);
  if (screenOutline !== fileOutline) {
    return true;
  }
  const screenLevels = screen.levels?.length ?? 0;
  const fileLevels = file.levels?.length ?? 0;
  if (screenLevels > 0 || fileLevels > 0) {
    if (screenLevels !== fileLevels) {
      return true;
    }
  }
  if (!screenOutline) {
    return false;
  }
  const screenBranches = branchMetaMap(screen);
  const fileBranches = branchMetaMap(file);
  const ids = unionBranchIds(screenBranches, fileBranches);
  for (const id of ids) {
    const left = screenBranches.get(id);
    const right = fileBranches.get(id);
    if (!left || !right) {
      return true;
    }
    if (left.parentId !== right.parentId) {
      return true;
    }
  }
  return false;
}

export function appendOutlineHierarchyClassification(
  lines: BaselineClassificationLine[],
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): void {
  if (outlineScreenFileStructureConflict(screen, file)) {
    lines.push({
      label: "異なる",
      headline: "階層の入れ子が画面とファイルで違う",
    });
  }

  const levelsLabel = classifyLevelsTriple(baseline, screen, file);
  if (levelsLabel) {
    lines.push({
      label: levelsLabel,
      headline: "階層の定義",
    });
  }

  const baselineBranches = branchMetaMap(baseline);
  const screenBranches = branchMetaMap(screen);
  const fileBranches = branchMetaMap(file);
  const branchIds = unionBranchIds(
    baselineBranches,
    screenBranches,
    fileBranches,
  );
  for (const branchId of branchIds) {
    const inB = baselineBranches.has(branchId);
    const inS = screenBranches.has(branchId);
    const inF = fileBranches.has(branchId);
    const label = classifyPresence(
      inB,
      inS,
      inF,
      inB && inS
        ? branchMetaEquals(
            baselineBranches.get(branchId)!,
            screenBranches.get(branchId)!,
          )
        : true,
      inB && inF
        ? branchMetaEquals(
            baselineBranches.get(branchId)!,
            fileBranches.get(branchId)!,
          )
        : true,
      inS && inF
        ? branchMetaEquals(
            screenBranches.get(branchId)!,
            fileBranches.get(branchId)!,
          )
        : true,
    );
    if (!label) continue;
    const name =
      screenBranches.get(branchId)?.name ??
      fileBranches.get(branchId)?.name ??
      baselineBranches.get(branchId)?.name ??
      branchId;
    if (!inB && inS) {
      lines.push({ label, headline: `追加 見出し ${name}` });
      continue;
    }
    if (!inB && inF) {
      lines.push({ label, headline: `追加 見出し ${name}` });
      continue;
    }
    if (inB && !inS && !inF) {
      lines.push({ label, headline: `削除 見出し ${name}` });
      continue;
    }
    const bName = baselineBranches.get(branchId)?.name;
    const sName = screenBranches.get(branchId)?.name;
    const fName = fileBranches.get(branchId)?.name;
    if (label === "画面のみ" && bName !== sName) {
      lines.push({
        label,
        headline: `変更 見出し ${name}: ${bName} → ${sName}`,
      });
    } else if (label === "ファイルのみ" && bName !== fName) {
      lines.push({
        label,
        headline: `変更 見出し ${name}: ${bName} → ${fName}`,
      });
    } else if (label === "異なる" && sName !== fName) {
      lines.push({
        label,
        headline: `変更 見出し ${name}: ${sName} / ${fName}`,
      });
    }
  }
}

export function buildOutlineNonConflictingMergedDocument(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  milestoneGroups: MilestoneGroup[],
  milestones: Milestone[],
): ScheduleDocument | null {
  if (outlineScreenFileStructureConflict(screen, file)) {
    return null;
  }

  const titleLabel = classifyScalar(baseline.title, screen.title, file.title);
  const title =
    titleLabel === "ファイルのみ"
      ? file.title
      : titleLabel != null
        ? screen.title
        : baseline.title;

  const levels = mergedLevelsDocument(baseline, screen, file);
  const outlineSource = documentUsesOutlineStorage(screen)
    ? screen.outline!
    : documentUsesOutlineStorage(file)
      ? file.outline!
      : screen.outline ?? file.outline ?? baseline.outline;
  if (!outlineSource || outlineSource.length === 0) {
    return null;
  }
  const outline = cloneOutlineRoot(outlineSource);
  applyMergedTasksToOutline(outline, baseline, screen, file);
  applyMergedBranchNamesToOutline(outline, baseline, screen, file);

  return {
    schemaVersion: baseline.schemaVersion,
    title,
    levels,
    outline,
    categories: [],
    milestoneGroups,
    milestones,
  };
}

function mergedLevelsDocument(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): ScheduleLevelDef[] | undefined {
  const label = classifyLevelsTriple(baseline, screen, file);
  if (label === "ファイルのみ" && file.levels) {
    return file.levels.map((level) => normalizeLevelDefinition(level));
  }
  if (
    (label === "画面のみ" || label === "同じ" || label === null) &&
    screen.levels
  ) {
    return screen.levels.map((level) => normalizeLevelDefinition(level));
  }
  if (baseline.levels) {
    return baseline.levels.map((level) => normalizeLevelDefinition(level));
  }
  return screen.levels ?? file.levels;
}

function classifyLevelsTriple(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): BaselineDiffClassification | null {
  const norm = (doc: ScheduleDocument) =>
    JSON.stringify(
      (doc.levels ?? []).map((level) => normalizeLevelDefinition(level)),
    );
  return classifyScalar(norm(baseline), norm(screen), norm(file));
}

function applyMergedTasksToOutline(
  outline: OutlineRoot,
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): void {
  const walk = (nodes: OutlineChild[]) => {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (isTaskNode(node)) {
        const merged = mergeOutlineTask(baseline, screen, file, node.id);
        if (merged) {
          nodes[index] = cloneTask(merged);
        }
      } else {
        walk(node.children);
      }
    }
  };
  walk(outline);
}

function applyMergedBranchNamesToOutline(
  outline: OutlineRoot,
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): void {
  const walk = (nodes: OutlineChild[]) => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      const label = classifyBranchName(baseline, screen, file, node.id);
      if (label === "ファイルのみ") {
        const name = branchMetaMap(file).get(node.id)?.name;
        if (name) node.name = name;
      } else if (label === "画面のみ" || label === "同じ") {
        const name = branchMetaMap(screen).get(node.id)?.name;
        if (name) node.name = name;
      }
      walk(node.children);
    }
  };
  walk(outline);
}

function classifyBranchName(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  branchId: ScheduleId,
): BaselineDiffClassification | null {
  const b = branchMetaMap(baseline).get(branchId)?.name ?? "";
  const s = branchMetaMap(screen).get(branchId)?.name ?? "";
  const f = branchMetaMap(file).get(branchId)?.name ?? "";
  const inB = branchMetaMap(baseline).has(branchId);
  const inS = branchMetaMap(screen).has(branchId);
  const inF = branchMetaMap(file).has(branchId);
  return classifyPresence(inB, inS, inF, b === s, b === f, s === f);
}

function mergeOutlineTask(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  taskId: ScheduleId,
): Task | null {
  const baselineTasks = outlineTaskContentMap(baseline);
  const screenTasks = outlineTaskContentMap(screen);
  const fileTasks = outlineTaskContentMap(file);
  const inB = baselineTasks.has(taskId);
  const inS = screenTasks.has(taskId);
  const inF = fileTasks.has(taskId);
  const label = classifyPresence(
    inB,
    inS,
    inF,
    inB && inS
      ? taskContentEquals(baselineTasks.get(taskId)!, screenTasks.get(taskId)!)
      : true,
    inB && inF
      ? taskContentEquals(baselineTasks.get(taskId)!, fileTasks.get(taskId)!)
      : true,
    inS && inF
      ? taskContentEquals(screenTasks.get(taskId)!, fileTasks.get(taskId)!)
      : true,
  );
  if (label != null && isBaselineConflictLabel(label)) {
    return null;
  }
  if (!inS && !inF) return null;
  if (label === "ファイルのみ") {
    return cloneTask(fileTasks.get(taskId)!);
  }
  if (label === "画面のみ" || label === "同じ") {
    return cloneTask(screenTasks.get(taskId)!);
  }
  return cloneTask(baselineTasks.get(taskId)!);
}

export function outlineTaskPlaceMap(
  doc: ScheduleDocument,
): Map<
  ScheduleId,
  { categoryId: ScheduleId; groupId: ScheduleId; task: Task }
> {
  const map = new Map<
    ScheduleId,
    { categoryId: ScheduleId; groupId: ScheduleId; task: Task }
  >();
  if (!doc.outline) return map;
  const walk = (nodes: OutlineChild[], ancestors: ScheduleId[]) => {
    for (const node of nodes) {
      if (isTaskNode(node)) {
        const parentId = ancestors[ancestors.length - 1] ?? node.id;
        const rootId = ancestors[0] ?? parentId;
        map.set(node.id, {
          categoryId: rootId,
          groupId: parentId,
          task: node,
        });
      } else {
        walk(node.children, [...ancestors, node.id]);
      }
    }
  };
  walk(doc.outline, []);
  return map;
}

function outlineTaskContentMap(doc: ScheduleDocument): Map<ScheduleId, Task> {
  const map = new Map<ScheduleId, Task>();
  for (const [id, place] of outlineTaskPlaceMap(doc)) {
    map.set(id, place.task);
  }
  return map;
}

function branchMetaMap(doc: ScheduleDocument): Map<ScheduleId, BranchMeta> {
  const map = new Map<ScheduleId, BranchMeta>();
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

function unionBranchIds(
  ...maps: Map<ScheduleId, BranchMeta>[]
): ScheduleId[] {
  const seen = new Set<ScheduleId>();
  const result: ScheduleId[] = [];
  for (const map of maps) {
    for (const id of map.keys()) {
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function branchMetaEquals(a: BranchMeta, b: BranchMeta): boolean {
  return a.name === b.name && a.parentId === b.parentId;
}

function cloneOutlineRoot(nodes: OutlineRoot): OutlineRoot {
  return nodes.map((node) => {
    if (isTaskNode(node)) {
      return cloneTask(node);
    }
    return {
      id: node.id,
      name: node.name,
      children: cloneOutlineRoot(node.children),
    };
  });
}

function cloneTask(task: Task): Task {
  return {
    ...task,
    predecessors: [...task.predecessors],
    tags: task.tags ? [...task.tags] : undefined,
  };
}

function classifyScalar(
  baseline: string,
  screen: string,
  file: string,
): BaselineDiffClassification | null {
  if (baseline === screen && baseline === file) return null;
  if (screen === file) return "同じ";
  if (baseline === screen && baseline !== file) return "ファイルのみ";
  if (baseline === file && baseline !== screen) return "画面のみ";
  if (screen !== file) return "異なる";
  return "画面のみ";
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
  if (inBaseline && inScreen && inFile) return null;
  return null;
}

function isBaselineConflictLabel(label: BaselineDiffClassification): boolean {
  return (
    label === "異なる" ||
    label === "削除と変更" ||
    label === "追加と削除"
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
    a.predecessors.length === b.predecessors.length &&
    a.predecessors.every((id) => b.predecessors.includes(id)) &&
    a.milestoneId === b.milestoneId &&
    taskTodosEqualForDiff(a, b) &&
    taskTagsEqualForDiff(a, b) &&
    normalizeTaskNote(a.note) === normalizeTaskNote(b.note)
  );
}

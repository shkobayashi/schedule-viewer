import { daysBetween, isIsoDateString, parseDate } from "./dates";
import { findTaskInDocument, isTaskNode } from "./hierarchy";
import {
  findTaskRowInVisible,
  taskHiddenByCollapsedAncestors,
} from "./mcpVisible";
import { parseExplanationMarkColor } from "./explanationMarkColor";
import { computeTimelineRange } from "./timeline";
import {
  clipTaskBarRectToDate,
  taskBarAnchorInBody,
  taskBarRectInBody,
  type TaskBarBodyRect,
} from "./taskBarLayout";
import type { TaskBarAnchor } from "./connections";
import type {
  Category,
  Milestone,
  OutlineRoot,
  ScheduleId,
  Task,
  VisibleRow,
} from "./types";
import type { ExplainOverlayValidationContext } from "./explainOverlay";

export const EXPLAIN_OVERLAY_PATTERNS_REJECT =
  "試しの計画に使えない項目があります。";

export const MAX_EXPLANATION_PATTERNS = 4;
export const MAX_EXPLANATION_TRIAL_TASKS = 20;

export type ExplanationTrialNewTask = {
  id: ScheduleId;
  name: string;
  start: string;
  end: string;
  afterTaskId: ScheduleId;
};

export type ExplanationTrialChange = {
  taskId: ScheduleId;
  start: string;
  end: string;
  predecessors?: ScheduleId[];
};

export type ExplanationPattern = {
  id: string;
  name: string;
  color: string;
  tasks: ExplanationTrialNewTask[];
  changes: ExplanationTrialChange[];
};

const ALLOWED_PATTERN_KEYS = new Set([
  "id",
  "name",
  "color",
  "tasks",
  "changes",
]);

const ALLOWED_TRIAL_TASK_KEYS = new Set([
  "id",
  "name",
  "start",
  "end",
  "afterTaskId",
]);

const ALLOWED_CHANGE_KEYS = new Set([
  "taskId",
  "start",
  "end",
  "predecessors",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectPatterns(): { ok: false; message: string } {
  return { ok: false, message: EXPLAIN_OVERLAY_PATTERNS_REJECT };
}

function collectDocumentTaskIds(
  categories: Category[],
  outline: OutlineRoot | undefined,
): Set<ScheduleId> {
  const ids = new Set<ScheduleId>();
  const visit = (task: Task) => {
    ids.add(task.id);
  };
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) visit(task);
    }
  }
  if (outline != null) {
    const walk = (nodes: OutlineRoot) => {
      for (const node of nodes) {
        if (isTaskNode(node)) visit(node);
        else walk(node.children);
      }
    };
    walk(outline);
  }
  return ids;
}

function validateIsoInTimeline(
  iso: string,
  range: ReturnType<typeof computeTimelineRange>,
): boolean {
  if (!isIsoDateString(iso)) return false;
  let parsed: Date;
  try {
    parsed = parseDate(iso);
  } catch {
    return false;
  }
  const dayIdx = daysBetween(range.timelineStart, parsed);
  return dayIdx >= 0 && dayIdx < range.totalDays;
}

function validateTaskSpan(
  start: string,
  end: string,
  range: ReturnType<typeof computeTimelineRange>,
): boolean {
  if (!validateIsoInTimeline(start, range) || !validateIsoInTimeline(end, range)) {
    return false;
  }
  return start <= end;
}

function afterTaskVisible(
  afterTaskId: ScheduleId,
  context: ExplainOverlayValidationContext,
): boolean {
  const task = findTaskInDocument(
    context.categories,
    context.outline,
    afterTaskId,
  );
  if (task == null) return false;
  if (
    taskHiddenByCollapsedAncestors(
      afterTaskId,
      context.categories,
      context.outline,
      context.collapsed,
    )
  ) {
    return false;
  }
  return findTaskRowInVisible(context.visibleRows, afterTaskId) != null;
}

export type ParseExplanationPatternsResult =
  | { ok: true; patterns: ExplanationPattern[] }
  | { ok: false; message: string };

export function parseExplanationPatterns(
  raw: unknown,
  context: ExplainOverlayValidationContext,
): ParseExplanationPatternsResult {
  if (raw === undefined) {
    return { ok: true, patterns: [] };
  }
  if (!Array.isArray(raw)) {
    return rejectPatterns();
  }
  if (raw.length === 0) {
    return { ok: true, patterns: [] };
  }
  if (raw.length > MAX_EXPLANATION_PATTERNS) {
    return rejectPatterns();
  }

  const documentIds = collectDocumentTaskIds(
    context.categories,
    context.outline,
  );
  const range = computeTimelineRange(
    context.categories,
    context.milestones,
    undefined,
    context.outline,
  );

  const patterns: ExplanationPattern[] = [];
  const patternIds = new Set<string>();
  const allTrialIds = new Set<ScheduleId>();
  let trialCount = 0;

  for (const item of raw) {
    if (!isRecord(item)) return rejectPatterns();
    const extra = Object.keys(item).filter((k) => !ALLOWED_PATTERN_KEYS.has(k));
    if (extra.length > 0) return rejectPatterns();

    if (typeof item.id !== "string" || item.id.length === 0) {
      return rejectPatterns();
    }
    if (typeof item.name !== "string" || item.name.length === 0) {
      return rejectPatterns();
    }
    if (patternIds.has(item.id) || documentIds.has(item.id)) {
      return rejectPatterns();
    }
    patternIds.add(item.id);

    const normalizedColor = parseExplanationMarkColor(item.color);
    if (normalizedColor == null) return rejectPatterns();

    const tasksRaw = item.tasks ?? [];
    const changesRaw = item.changes ?? [];
    if (!Array.isArray(tasksRaw) || !Array.isArray(changesRaw)) {
      return rejectPatterns();
    }

    const trialTasks: ExplanationTrialNewTask[] = [];
    const trialIdsInPattern = new Set<ScheduleId>();

    for (const taskItem of tasksRaw) {
      if (!isRecord(taskItem)) return rejectPatterns();
      const taskExtra = Object.keys(taskItem).filter(
        (k) => !ALLOWED_TRIAL_TASK_KEYS.has(k),
      );
      if (taskExtra.length > 0) return rejectPatterns();
      if (
        typeof taskItem.id !== "string" ||
        typeof taskItem.name !== "string" ||
        typeof taskItem.start !== "string" ||
        typeof taskItem.end !== "string" ||
        typeof taskItem.afterTaskId !== "string"
      ) {
        return rejectPatterns();
      }
      if (taskItem.name.length === 0) return rejectPatterns();
      if (
        documentIds.has(taskItem.id) ||
        allTrialIds.has(taskItem.id) ||
        trialIdsInPattern.has(taskItem.id)
      ) {
        return rejectPatterns();
      }
      if (!validateTaskSpan(taskItem.start, taskItem.end, range)) {
        return rejectPatterns();
      }
      if (!afterTaskVisible(taskItem.afterTaskId, context)) {
        return rejectPatterns();
      }
      trialIdsInPattern.add(taskItem.id);
      allTrialIds.add(taskItem.id);
      trialCount += 1;
      if (trialCount > MAX_EXPLANATION_TRIAL_TASKS) {
        return rejectPatterns();
      }
      trialTasks.push({
        id: taskItem.id,
        name: taskItem.name,
        start: taskItem.start,
        end: taskItem.end,
        afterTaskId: taskItem.afterTaskId,
      });
    }

    const changes: ExplanationTrialChange[] = [];
    for (const changeItem of changesRaw) {
      if (!isRecord(changeItem)) return rejectPatterns();
      const changeExtra = Object.keys(changeItem).filter(
        (k) => !ALLOWED_CHANGE_KEYS.has(k),
      );
      if (changeExtra.length > 0) return rejectPatterns();
      if (typeof changeItem.taskId !== "string") return rejectPatterns();
      const taskId = changeItem.taskId;
      const inDocument = documentIds.has(taskId);
      const inPatternTrials = trialIdsInPattern.has(taskId);
      if (!inDocument && !inPatternTrials) return rejectPatterns();

      if (
        changeItem.start !== undefined &&
        typeof changeItem.start !== "string"
      ) {
        return rejectPatterns();
      }
      if (changeItem.end !== undefined && typeof changeItem.end !== "string") {
        return rejectPatterns();
      }
      const hasStart = changeItem.start !== undefined;
      const hasEnd = changeItem.end !== undefined;
      if (hasStart !== hasEnd) return rejectPatterns();
      if (hasStart) {
        if (
          !validateTaskSpan(
            changeItem.start as string,
            changeItem.end as string,
            range,
          )
        ) {
          return rejectPatterns();
        }
        if (inDocument) {
          const real = findTaskInDocument(
            context.categories,
            context.outline,
            taskId,
          )!;
          if (
            taskHiddenByCollapsedAncestors(
              taskId,
              context.categories,
              context.outline,
              context.collapsed,
            ) ||
            findTaskRowInVisible(context.visibleRows, taskId) == null
          ) {
            return rejectPatterns();
          }
        }
      }

      let predecessors: ScheduleId[] | undefined;
      if (changeItem.predecessors !== undefined) {
        if (!Array.isArray(changeItem.predecessors)) return rejectPatterns();
        predecessors = [];
        for (const pred of changeItem.predecessors) {
          if (typeof pred !== "string") return rejectPatterns();
          if (pred === taskId) return rejectPatterns();
          const predInDoc = documentIds.has(pred);
          const predInTrial = trialIdsInPattern.has(pred);
          if (!predInDoc && !predInTrial) return rejectPatterns();
          if (!predInDoc && allTrialIds.has(pred) && !predInTrial) {
            return rejectPatterns();
          }
          if (predInDoc) {
            const real = findTaskInDocument(
              context.categories,
              context.outline,
              pred,
            );
            if (real == null) return rejectPatterns();
          }
          predecessors.push(pred);
        }
      }

      const entry: ExplanationTrialChange = { taskId };
      if (hasStart) {
        entry.start = changeItem.start as string;
        entry.end = changeItem.end as string;
      }
      if (predecessors != null) entry.predecessors = predecessors;
      if (entry.start == null && entry.predecessors == null) {
        return rejectPatterns();
      }
      changes.push(entry);
    }

    patterns.push({
      id: item.id,
      name: item.name,
      color: normalizedColor,
      tasks: trialTasks,
      changes,
    });
  }

  return { ok: true, patterns };
}

export function trialTaskIdsInPatterns(
  patterns: readonly ExplanationPattern[],
): Set<ScheduleId> {
  const ids = new Set<ScheduleId>();
  for (const pattern of patterns) {
    for (const task of pattern.tasks) {
      ids.add(task.id);
    }
  }
  return ids;
}

export function isTrialTaskId(
  taskId: ScheduleId,
  patterns: readonly ExplanationPattern[],
): boolean {
  return trialTaskIdsInPatterns(patterns).has(taskId);
}

export function findTrialNewTask(
  taskId: ScheduleId,
  patterns: readonly ExplanationPattern[],
): ExplanationTrialNewTask | null {
  for (const pattern of patterns) {
    for (const task of pattern.tasks) {
      if (task.id === taskId) return task;
    }
  }
  return null;
}

export function syntheticTaskForTrialBar(input: {
  taskId: ScheduleId;
  patterns: readonly ExplanationPattern[];
  categories: Category[];
  outline: OutlineRoot | undefined;
}): { task: Task; anchorTaskId: ScheduleId } | null {
  const trial = findTrialNewTask(input.taskId, input.patterns);
  if (trial != null) {
    return {
      anchorTaskId: trial.afterTaskId,
      task: {
        id: trial.id,
        name: trial.name,
        start: trial.start,
        end: trial.end,
        assigneeIds: [],
        status: "not-started",
        progress: 0,
        confidence: "tentative",
        predecessors: [],
        milestoneId: null,
        tags: [],
      },
    };
  }
  for (const pattern of input.patterns) {
    for (const change of pattern.changes) {
      if (change.taskId !== input.taskId || change.start == null) continue;
      const real = findTaskInDocument(
        input.categories,
        input.outline,
        change.taskId,
      );
      if (real == null) continue;
      return {
        anchorTaskId: change.taskId,
        task: {
          ...real,
          start: change.start,
          end: change.end,
        },
      };
    }
  }
  return null;
}

export type ExplanationTrialBarLayout = {
  patternId: string;
  trialTaskId: ScheduleId;
  color: string;
  rect: TaskBarBodyRect;
};

export function buildExplanationTrialBarLayouts(input: {
  patterns: readonly ExplanationPattern[];
  visibleRows: readonly VisibleRow[];
  categories: Category[];
  outline: OutlineRoot | undefined;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>;
}): ExplanationTrialBarLayout[] {
  const layouts: ExplanationTrialBarLayout[] = [];
  const seen = new Set<ScheduleId>();

  for (const pattern of input.patterns) {
    for (const trial of pattern.tasks) {
      if (seen.has(trial.id)) continue;
      seen.add(trial.id);
      const row = findTaskRowInVisible(input.visibleRows, trial.afterTaskId);
      if (row == null) continue;
      const synthetic: Task = {
        id: trial.id,
        name: trial.name,
        start: trial.start,
        end: trial.end,
        assigneeIds: [],
        status: "not-started",
        progress: 0,
        confidence: "tentative",
        predecessors: [],
        milestoneId: null,
        tags: [],
      };
      layouts.push({
        patternId: pattern.id,
        trialTaskId: trial.id,
        color: pattern.color,
        rect: taskBarRectInBody({
          task: synthetic,
          viewportRowTop: row.y - input.scrollY,
          rowHeight: input.rowHeight,
          barHeight: input.barHeight,
          pxPerDay: input.pxPerDay,
          dateToX: input.dateToX,
        }),
      });
    }

    for (const change of pattern.changes) {
      if (change.start == null) continue;
      if (seen.has(change.taskId)) continue;
      const real = findTaskInDocument(
        input.categories,
        input.outline,
        change.taskId,
      );
      if (real == null) continue;
      const row = findTaskRowInVisible(input.visibleRows, change.taskId);
      if (row == null) continue;
      seen.add(change.taskId);
      const synthetic: Task = {
        ...real,
        start: change.start,
        end: change.end,
      };
      layouts.push({
        patternId: pattern.id,
        trialTaskId: change.taskId,
        color: pattern.color,
        rect: taskBarRectInBody({
          task: synthetic,
          viewportRowTop: row.y - input.scrollY,
          rowHeight: input.rowHeight,
          barHeight: input.barHeight,
          pxPerDay: input.pxPerDay,
          dateToX: input.dateToX,
          anchor: input.liveAnchors.get(change.taskId),
        }),
      });
    }
  }

  return layouts;
}

export type ExplanationTrialSidebarLabel = {
  trialTaskId: ScheduleId;
  name: string;
  color: string;
  viewportTop: number;
  rowHeight: number;
};

export function explanationTrialSidebarLabels(input: {
  patterns: readonly ExplanationPattern[];
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
}): ExplanationTrialSidebarLabel[] {
  const labels: ExplanationTrialSidebarLabel[] = [];
  for (const pattern of input.patterns) {
    for (const trial of pattern.tasks) {
      const row = findTaskRowInVisible(input.visibleRows, trial.afterTaskId);
      if (row == null) continue;
      labels.push({
        trialTaskId: trial.id,
        name: trial.name,
        color: pattern.color,
        viewportTop: row.y - input.scrollY,
        rowHeight: input.rowHeight,
      });
    }
  }
  return labels;
}

export function trialMarkBarRect(input: {
  taskId: ScheduleId;
  date: string | undefined;
  patterns: readonly ExplanationPattern[];
  visibleRows: readonly VisibleRow[];
  categories: Category[];
  outline: OutlineRoot | undefined;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>;
}): TaskBarBodyRect | null {
  const synthetic = syntheticTaskForTrialBar({
    taskId: input.taskId,
    patterns: input.patterns,
    categories: input.categories,
    outline: input.outline,
  });
  if (synthetic == null) return null;
  const row = findTaskRowInVisible(input.visibleRows, synthetic.anchorTaskId);
  if (row == null) return null;
  let bar = taskBarRectInBody({
    task: synthetic.task,
    viewportRowTop: row.y - input.scrollY,
    rowHeight: input.rowHeight,
    barHeight: input.barHeight,
    pxPerDay: input.pxPerDay,
    dateToX: input.dateToX,
    anchor: input.liveAnchors.get(synthetic.anchorTaskId),
  });
  if (input.date != null) {
    bar = clipTaskBarRectToDate(
      bar,
      input.date,
      input.dateToX,
      input.pxPerDay,
    );
  }
  return bar;
}

export type McpExplanationPatternTask = {
  id: ScheduleId;
  name: string;
  start: string;
  end: string;
  afterTaskId: ScheduleId;
  trial: true;
};

export type McpExplanationPatternPayload = {
  id: string;
  name: string;
  color: string;
  tasks: McpExplanationPatternTask[];
  changes: ExplanationTrialChange[];
};

export function buildMcpExplanationPatterns(
  patterns: readonly ExplanationPattern[],
): McpExplanationPatternPayload[] {
  return patterns.map((pattern) => ({
    id: pattern.id,
    name: pattern.name,
    color: pattern.color,
    tasks: pattern.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start: task.start,
      end: task.end,
      afterTaskId: task.afterTaskId,
      trial: true as const,
    })),
    changes: pattern.changes.map((change) => ({
      taskId: change.taskId,
      ...(change.start != null ? { start: change.start, end: change.end } : {}),
      ...(change.predecessors != null
        ? { predecessors: [...change.predecessors] }
        : {}),
    })),
  }));
}

export function trialTaskAnchorInBody(input: {
  taskId: ScheduleId;
  patterns: readonly ExplanationPattern[];
  visibleRows: readonly VisibleRow[];
  categories: Category[];
  outline: OutlineRoot | undefined;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>;
}): TaskBarAnchor | null {
  const synthetic = syntheticTaskForTrialBar({
    taskId: input.taskId,
    patterns: input.patterns,
    categories: input.categories,
    outline: input.outline,
  });
  if (synthetic == null) return null;
  const row = findTaskRowInVisible(input.visibleRows, synthetic.anchorTaskId);
  if (row == null) return null;
  return taskBarAnchorInBody({
    task: synthetic.task,
    viewportRowTop: row.y - input.scrollY,
    rowHeight: input.rowHeight,
    barHeight: input.barHeight,
    pxPerDay: input.pxPerDay,
    dateToX: input.dateToX,
    anchor: input.liveAnchors.get(synthetic.anchorTaskId),
  });
}

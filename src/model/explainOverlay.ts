import { daysBetween, parseDate } from "./dates";
import { findTaskInDocument } from "./hierarchy";
import {
  findTaskRowInVisible,
  taskHiddenByCollapsedAncestors,
} from "./mcpVisible";
import { computeTimelineRange } from "./timeline";
import {
  explanationMarkVisibleInViewport,
  type PlanExplanationScrollInput,
} from "./explainOverlayLayout";
import { parseExplanationMarkColor } from "./explanationMarkColor";
import {
  buildMcpExplanationPatterns,
  parseExplanationPatterns,
  syntheticTaskForTrialBar,
  trialTaskIdsInPatterns,
  type ExplanationPattern,
  type McpExplanationPatternPayload,
} from "./explainOverlayPatterns";
import {
  resolveExplanationMilestoneBand,
} from "./explainView";
import type {
  Milestone,
  ScheduleId,
  VisibleRow,
} from "./types";

import type {
  ExplanationMark,
  ExplanationMarkKind,
  ExplainOverlayValidationContext,
} from "./explainOverlayTypes";
export type {
  ExplanationMark,
  ExplanationMarkKind,
  ExplainOverlayValidationContext,
} from "./explainOverlayTypes";

export type ExplanationOverlayState = {
  translucent: true;
  summary?: string;
  marks: ExplanationMark[];
  patterns: ExplanationPattern[];
};

const ALLOWED_TOP_KEYS = new Set([
  "translucent",
  "discardInProgress",
  "summary",
  "marks",
  "patterns",
]);

const ALLOWED_MARK_KEYS = new Set([
  "taskId",
  "date",
  "milestoneId",
  "milestoneGroupId",
  "kind",
  "label",
  "number",
  "color",
]);

export function explanationOverlayActive(
  state: ExplanationOverlayState | null,
): state is ExplanationOverlayState {
  return state?.translucent === true;
}

export function explanationSessionActive(
  explanationViewActive: boolean,
  overlay: ExplanationOverlayState | null,
): boolean {
  return explanationViewActive || explanationOverlayActive(overlay);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownTopKeys(envelope: Record<string, unknown>): string[] {
  return Object.keys(envelope).filter((key) => !ALLOWED_TOP_KEYS.has(key));
}

export type ParseExplainOverlayResult =
  | { ok: true; kind: "hide" }
  | { ok: true; kind: "show"; state: ExplanationOverlayState }
  | { ok: false; message: string };

export function parseExplainOverlayRequest(
  envelope: Record<string, unknown>,
  context: ExplainOverlayValidationContext,
): ParseExplainOverlayResult {
  const extra = unknownTopKeys(envelope).filter((k) => k !== "discardInProgress");
  if (extra.length > 0) {
    return { ok: false, message: "半透明に使えない項目があります。" };
  }

  if (envelope.translucent === undefined) {
    return { ok: false, message: "半透明の指定がありません。" };
  }

  if (envelope.translucent === false) {
    if (
      envelope.summary !== undefined ||
      envelope.marks !== undefined ||
      envelope.patterns !== undefined
    ) {
      return {
        ok: false,
        message:
          "translucent が false のときは summary、marks、patterns を渡せません。",
      };
    }
    return { ok: true, kind: "hide" };
  }

  if (envelope.translucent !== true) {
    return { ok: false, message: "translucent は true か false にしてください。" };
  }

  let summary: string | undefined;
  if (envelope.summary !== undefined) {
    if (typeof envelope.summary !== "string") {
      return { ok: false, message: "summary は文字列にしてください。" };
    }
    summary = envelope.summary;
  }

  const parsedPatterns = parseExplanationPatterns(
    envelope.patterns,
    context,
  );
  if (!parsedPatterns.ok) return parsedPatterns;
  const patterns = parsedPatterns.patterns;
  const trialIds = trialTaskIdsInPatterns(patterns);

  let marks: ExplanationMark[] = [];
  if (envelope.marks !== undefined) {
    if (!Array.isArray(envelope.marks)) {
      return { ok: false, message: "marks は配列にしてください。" };
    }
    const parsedMarks: ExplanationMark[] = [];
    for (const item of envelope.marks) {
      if (!isRecord(item)) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      const markExtra = Object.keys(item).filter((k) => !ALLOWED_MARK_KEYS.has(k));
      if (markExtra.length > 0) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      const hasTaskId = item.taskId !== undefined;
      const hasDate = item.date !== undefined;
      const hasMilestoneId = item.milestoneId !== undefined;
      const hasMilestoneGroupId = item.milestoneGroupId !== undefined;
      if (hasMilestoneId && hasMilestoneGroupId) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasTaskId && (hasMilestoneId || hasMilestoneGroupId)) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasDate && (hasMilestoneId || hasMilestoneGroupId)) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (!hasTaskId && !hasDate && !hasMilestoneId && !hasMilestoneGroupId) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasTaskId && typeof item.taskId !== "string") {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasDate && typeof item.date !== "string") {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasMilestoneId && typeof item.milestoneId !== "string") {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasMilestoneGroupId && typeof item.milestoneGroupId !== "string") {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (item.kind !== "change" && item.kind !== "ask") {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (typeof item.label !== "string" || item.label.trim().length === 0) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (item.number !== undefined && typeof item.number !== "number") {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (item.color !== undefined) {
        const normalized = parseExplanationMarkColor(item.color);
        if (normalized == null) {
          return { ok: false, message: "説明の印に使えない項目があります。" };
        }
      }
      const mark: ExplanationMark = {
        kind: item.kind,
        label: item.label,
      };
      if (hasTaskId) mark.taskId = item.taskId as string;
      if (hasDate) mark.date = item.date as string;
      if (hasMilestoneId) mark.milestoneId = item.milestoneId as string;
      if (hasMilestoneGroupId) {
        mark.milestoneGroupId = item.milestoneGroupId as string;
      }
      if (item.number !== undefined) mark.number = item.number;
      if (item.color !== undefined) {
        mark.color = parseExplanationMarkColor(item.color)!;
      }
      parsedMarks.push(mark);
    }
    marks = parsedMarks;
  }

  const range = computeTimelineRange(
    context.categories,
    context.milestones,
    undefined,
    context.outline,
  );

  const hiddenMilestoneGroups = new Set(context.hiddenMilestoneGroupIds);
  const bandForMarks = resolveExplanationMilestoneBand(
    {
      milestoneGroups: context.milestoneGroups,
      milestones: context.milestones,
    },
    context.explanationView ?? null,
    hiddenMilestoneGroups,
  );
  const visibleMilestoneIds = new Set(
    bandForMarks.milestones.map((milestone) => milestone.id),
  );
  const visibleMilestoneGroupIds = bandForMarks.visibleGroupIds;
  const milestoneById = new Map(
    context.milestones.map((milestone) => [milestone.id, milestone]),
  );
  const milestoneGroupIds = new Set(
    context.milestoneGroups.map((group) => group.id),
  );

  for (const mark of marks) {
    if (mark.taskId != null && trialIds.has(mark.taskId)) {
      const synthetic = syntheticTaskForTrialBar({
        taskId: mark.taskId,
        patterns,
        categories: context.categories,
        outline: context.outline,
      });
      if (synthetic == null) {
        return { ok: false, message: "説明に指定したタスクが見つかりません。" };
      }
      if (
        taskHiddenByCollapsedAncestors(
          synthetic.anchorTaskId,
          context.categories,
          context.outline,
          context.collapsed,
        )
      ) {
        return {
          ok: false,
          message: "説明で示すタスクが、絞り込みか折りたたみで隠れています。",
        };
      }
      if (
        findTaskRowInVisible(context.visibleRows, synthetic.anchorTaskId) ==
        null
      ) {
        return {
          ok: false,
          message: "説明で示すタスクが、絞り込みか折りたたみで隠れています。",
        };
      }
      if (mark.date != null) {
        let parsed: Date;
        try {
          parsed = parseDate(mark.date);
        } catch {
          return { ok: false, message: "説明の印に使えない項目があります。" };
        }
        const task = synthetic.task;
        if (mark.date < task.start || mark.date > task.end) {
          return {
            ok: false,
            message: "説明で示す日付が、そのタスクの期間の外です。",
          };
        }
        const dayIdx = daysBetween(range.timelineStart, parsed);
        if (dayIdx < 0 || dayIdx >= range.totalDays) {
          return { ok: false, message: "説明で示す日付が、計画の期間の外です。" };
        }
      }
      continue;
    }

    if (mark.taskId != null) {
      const task = findTaskInDocument(
        context.categories,
        context.outline,
        mark.taskId,
      );
      if (task == null) {
        return { ok: false, message: "説明に指定したタスクが見つかりません。" };
      }
      if (
        taskHiddenByCollapsedAncestors(
          mark.taskId,
          context.categories,
          context.outline,
          context.collapsed,
        )
      ) {
        return {
          ok: false,
          message: "説明で示すタスクが、絞り込みか折りたたみで隠れています。",
        };
      }
      if (findTaskRowInVisible(context.visibleRows, mark.taskId) == null) {
        return {
          ok: false,
          message: "説明で示すタスクが、絞り込みか折りたたみで隠れています。",
        };
      }
      if (mark.date != null) {
        let parsed: Date;
        try {
          parsed = parseDate(mark.date);
        } catch {
          return { ok: false, message: "説明の印に使えない項目があります。" };
        }
        if (
          mark.date < task.start ||
          mark.date > task.end
        ) {
          return {
            ok: false,
            message: "説明で示す日付が、そのタスクの期間の外です。",
          };
        }
        const dayIdx = daysBetween(range.timelineStart, parsed);
        if (dayIdx < 0 || dayIdx >= range.totalDays) {
          return { ok: false, message: "説明で示す日付が、計画の期間の外です。" };
        }
      }
    } else if (mark.date != null) {
      let parsed: Date;
      try {
        parsed = parseDate(mark.date);
      } catch {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      const dayIdx = daysBetween(range.timelineStart, parsed);
      if (dayIdx < 0 || dayIdx >= range.totalDays) {
        return { ok: false, message: "説明で示す日付が、計画の期間の外です。" };
      }
    } else if (mark.milestoneId != null) {
      const milestone = milestoneById.get(mark.milestoneId);
      if (milestone == null) {
        return { ok: false, message: "説明に指定したマイルストンが見つかりません。" };
      }
      if (hiddenMilestoneGroups.has(milestone.groupId)) {
        return {
          ok: false,
          message:
            "説明で示すマイルストンが、帯の線をオフにして見えていません。",
        };
      }
      if (!visibleMilestoneIds.has(mark.milestoneId)) {
        return {
          ok: false,
          message:
            "説明で示すマイルストンが、絞り込みか折りたたみで隠れています。",
        };
      }
      let parsed: Date;
      try {
        parsed = parseDate(milestone.date);
      } catch {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      const dayIdx = daysBetween(range.timelineStart, parsed);
      if (dayIdx < 0 || dayIdx >= range.totalDays) {
        return { ok: false, message: "説明で示す日付が、計画の期間の外です。" };
      }
    } else if (mark.milestoneGroupId != null) {
      if (!milestoneGroupIds.has(mark.milestoneGroupId)) {
        return {
          ok: false,
          message: "説明に指定したマイルストンの帯の行が見つかりません。",
        };
      }
      if (hiddenMilestoneGroups.has(mark.milestoneGroupId)) {
        return {
          ok: false,
          message:
            "説明で示すマイルストンの帯の行が、帯の線をオフにして見えていません。",
        };
      }
      if (!visibleMilestoneGroupIds.has(mark.milestoneGroupId)) {
        return {
          ok: false,
          message:
            "説明で示すマイルストンの帯の行が、絞り込みか折りたたみで隠れています。",
        };
      }
    }
  }

  const state: ExplanationOverlayState = {
    translucent: true,
    marks,
    patterns,
  };
  if (summary !== undefined) state.summary = summary;
  return { ok: true, kind: "show", state };
}

export function explainOverlayShowSuccessText(): string {
  return "半透明を重ねました。";
}

export function explainOverlayHideSuccessText(wasActive: boolean): string {
  return wasActive ? "半透明を消しました。" : "半透明は出ていません。";
}

export type McpExplanationMarkPayload = {
  taskId?: ScheduleId;
  date?: string;
  milestoneId?: ScheduleId;
  milestoneGroupId?: ScheduleId;
  kind: ExplanationMarkKind;
  label: string;
  number?: number;
  visible: boolean;
  color?: string;
};

export type McpExplanationOverlayPayload = {
  translucent: true;
  summary?: string;
  marks: McpExplanationMarkPayload[];
  patterns?: McpExplanationPatternPayload[];
};

export type BuildMcpExplanationOverlayInput = {
  overlay: ExplanationOverlayState | null;
  visibleRows: readonly VisibleRow[];
  milestones?: readonly Milestone[];
  pxPerDay: number;
  scrollX: number;
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  chartWidth: number;
  timelineStart: Date;
  liveAnchors: ReadonlyMap<
    ScheduleId,
    { x: number; right: number; y: number }
  >;
};

export function buildMcpExplanationOverlay(
  input: BuildMcpExplanationOverlayInput,
): McpExplanationOverlayPayload | undefined {
  if (!explanationOverlayActive(input.overlay)) return undefined;
  const marks: McpExplanationMarkPayload[] = (input.overlay.marks ?? []).map(
    (mark) => {
    const payload: McpExplanationMarkPayload = {
      kind: mark.kind,
      label: mark.label,
      visible: explanationMarkVisibleInViewport({
        mark,
        visibleRows: input.visibleRows,
        milestones: input.milestones,
        pxPerDay: input.pxPerDay,
        scrollX: input.scrollX,
        scrollY: input.scrollY,
        rowHeight: input.rowHeight,
        bodyHeight: input.bodyHeight,
        chartWidth: input.chartWidth,
        timelineStart: input.timelineStart,
        liveAnchors: input.liveAnchors,
      }),
    };
    if (mark.taskId != null) payload.taskId = mark.taskId;
    if (mark.date != null) payload.date = mark.date;
    if (mark.milestoneId != null) payload.milestoneId = mark.milestoneId;
    if (mark.milestoneGroupId != null) {
      payload.milestoneGroupId = mark.milestoneGroupId;
    }
    if (mark.number !== undefined) payload.number = mark.number;
    if (mark.color != null) payload.color = mark.color;
    return payload;
    },
  );
  const result: McpExplanationOverlayPayload = {
    translucent: true,
    marks,
  };
  if (input.overlay.summary !== undefined) {
    result.summary = input.overlay.summary;
  }
  if ((input.overlay.patterns ?? []).length > 0) {
    result.patterns = buildMcpExplanationPatterns(input.overlay.patterns);
  }
  return result;
}

export type { PlanExplanationScrollInput };

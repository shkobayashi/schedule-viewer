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
import type { Category, OutlineRoot, ScheduleId, VisibleRow } from "./types";

export type ExplanationMarkKind = "change" | "ask";

export type ExplanationMark = {
  taskId?: ScheduleId;
  date?: string;
  kind: ExplanationMarkKind;
  label: string;
  number?: number;
};

export type ExplanationOverlayState = {
  translucent: true;
  summary?: string;
  marks: ExplanationMark[];
};

const ALLOWED_TOP_KEYS = new Set([
  "translucent",
  "discardInProgress",
  "summary",
  "marks",
]);

const ALLOWED_MARK_KEYS = new Set([
  "taskId",
  "date",
  "kind",
  "label",
  "number",
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

export type ExplainOverlayValidationContext = {
  categories: Category[];
  outline: OutlineRoot | undefined;
  collapsed: ReadonlySet<string>;
  visibleRows: readonly VisibleRow[];
};

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
    if (envelope.summary !== undefined || envelope.marks !== undefined) {
      return {
        ok: false,
        message: "translucent が false のときは summary と marks を渡せません。",
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
      if (!hasTaskId && !hasDate) {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasTaskId && typeof item.taskId !== "string") {
        return { ok: false, message: "説明の印に使えない項目があります。" };
      }
      if (hasDate && typeof item.date !== "string") {
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
      const mark: ExplanationMark = {
        kind: item.kind,
        label: item.label,
      };
      if (hasTaskId) mark.taskId = item.taskId as string;
      if (hasDate) mark.date = item.date as string;
      if (item.number !== undefined) mark.number = item.number;
      parsedMarks.push(mark);
    }
    marks = parsedMarks;
  }

  const range = computeTimelineRange(
    context.categories,
    [],
    undefined,
    context.outline,
  );

  for (const mark of marks) {
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
    }
  }

  const state: ExplanationOverlayState = {
    translucent: true,
    marks,
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
  kind: ExplanationMarkKind;
  label: string;
  number?: number;
  visible: boolean;
};

export type McpExplanationOverlayPayload = {
  translucent: true;
  summary?: string;
  marks: McpExplanationMarkPayload[];
};

export type BuildMcpExplanationOverlayInput = {
  overlay: ExplanationOverlayState | null;
  visibleRows: readonly VisibleRow[];
  dateToX: (d: Date) => number;
  pxPerDay: number;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  chartWidth: number;
  headerHeight: number;
  milestoneBandHeight: number;
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
        dateToX: input.dateToX,
        pxPerDay: input.pxPerDay,
        scrollY: input.scrollY,
        rowHeight: input.rowHeight,
        bodyHeight: input.bodyHeight,
        chartWidth: input.chartWidth,
        headerHeight: input.headerHeight,
        milestoneBandHeight: input.milestoneBandHeight,
        liveAnchors: input.liveAnchors,
      }),
    };
    if (mark.taskId != null) payload.taskId = mark.taskId;
    if (mark.date != null) payload.date = mark.date;
    if (mark.number !== undefined) payload.number = mark.number;
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
  return result;
}

export type { PlanExplanationScrollInput };

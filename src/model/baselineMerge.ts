import {
  type BaselineClassificationLine,
  type BaselineDiffClassification,
  buildNonConflictingMergedDocument,
  collectBaselineClassificationLines,
  isBaselineConflictLabel,
} from "./baselineDiffs";
import { formatValidationErrors, validateSchedule } from "./validateSchedule";
import { scheduleToJson } from "./serialize";
import type { ScheduleDocument } from "./types";

export const BASELINE_MERGE_LLM_PROMPT = `schedule-viewer の MCP または read-screen スキルを使って、baseline_diffs を読んでください。
分類が画面のみ、ファイルのみ、同じの箇所は、起点からその結果を書いてください。
分類が異なる、削除と変更、追加と削除の箇所は、起点のまま残して、どれを採るか聞いてください。
先行は和集合にしないでください。
日付と担当は、差分に無い値を作らないでください。
ファイルへ保存するのは、聞いたあとにしてください。`;

export type BaselineMergeCounts = {
  screenOnly: number;
  fileOnly: number;
  same: number;
  conflicts: number;
};

export type BaselineMergeAssessment =
  | {
      kind: "sameOnly";
      lines: BaselineClassificationLine[];
      counts: BaselineMergeCounts;
    }
  | {
      kind: "mergeable";
      lines: BaselineClassificationLine[];
      counts: BaselineMergeCounts;
      document: ScheduleDocument;
    }
  | {
      kind: "blocked";
      lines: BaselineClassificationLine[];
      counts: BaselineMergeCounts;
      conflictLines: BaselineClassificationLine[];
      nonConflictCount: number;
      validationMessage?: string;
    };

export function countBaselineMergeLabels(
  lines: BaselineClassificationLine[],
): BaselineMergeCounts {
  let screenOnly = 0;
  let fileOnly = 0;
  let same = 0;
  let conflicts = 0;
  for (const line of lines) {
    if (line.label === "画面のみ") screenOnly += 1;
    else if (line.label === "ファイルのみ") fileOnly += 1;
    else if (line.label === "同じ") same += 1;
    else if (isBaselineConflictLabel(line.label)) conflicts += 1;
  }
  return { screenOnly, fileOnly, same, conflicts };
}

export function headlineForDisplay(headline: string): string {
  return headline.replace(/\s+\([0-9a-f-]{36}\)/gi, "");
}

export function assessBaselineMerge(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
): BaselineMergeAssessment {
  const lines = collectBaselineClassificationLines(baseline, screen, file);
  const counts = countBaselineMergeLabels(lines);
  const conflictLines = lines.filter((line) =>
    isBaselineConflictLabel(line.label),
  );
  const nonConflictCount =
    counts.screenOnly + counts.fileOnly + counts.same;

  if (conflictLines.length > 0) {
    return {
      kind: "blocked",
      lines,
      counts,
      conflictLines,
      nonConflictCount,
    };
  }

  if (lines.length > 0 && lines.every((line) => line.label === "同じ")) {
    return { kind: "sameOnly", lines, counts };
  }

  const merged = buildNonConflictingMergedDocument(baseline, screen, file);
  if (!merged) {
    return {
      kind: "blocked",
      lines,
      counts,
      conflictLines: [],
      nonConflictCount,
      validationMessage: "変更を画面へ反映できません。",
    };
  }

  const validation = validateSchedule(
    scheduleToJson(
      merged.title,
      merged.categories,
      merged.milestoneGroups,
      merged.milestones,
    ),
  );
  if (!validation.ok) {
    return {
      kind: "blocked",
      lines,
      counts,
      conflictLines: [],
      nonConflictCount,
      validationMessage: formatValidationErrors(validation.errors),
    };
  }

  return {
    kind: "mergeable",
    lines,
    counts,
    document: validation.document,
  };
}

export function isNonConflictLabel(
  label: BaselineDiffClassification,
): boolean {
  return (
    label === "画面のみ" ||
    label === "ファイルのみ" ||
    label === "同じ"
  );
}

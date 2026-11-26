import type { BaselineClassificationLine } from "./baselineDiffs";
import { headlineForDisplay } from "./baselineMerge";
import { fieldValueChangeLinesForDiff } from "./fieldValuesDiff";
import { collectTasksFromDocument } from "./hierarchy";
import { collectScheduleDiffBlocks } from "./scheduleDiff";
import {
  SCHEDULE_SCHEMA_VERSION,
  type ScheduleDocument,
  type ScheduleFieldDef,
  type ScheduleId,
  type Task,
} from "./types";

export type BaselineMergeReviewField = {
  label: string;
  visible: string;
  title: string;
};

export type BaselineMergeReviewBlock =
  | {
      kind: "headline";
      visibleHeadline: string;
      accessibleHeadline: string;
    }
  | {
      kind: "title";
      visibleHeadline: string;
      accessibleHeadline: string;
    }
  | {
      kind: "change";
      visibleHeadline: string;
      accessibleHeadline: string;
      locationSubheading?: { visible: string; title: string };
      fields: BaselineMergeReviewField[];
      noteDetails?: BaselineMergeReviewField[];
    }
  | {
      kind: "add" | "delete";
      visibleHeadline: string;
      accessibleHeadline: string;
      locationSubheading?: { visible: string; title: string };
      detailLines: BaselineMergeReviewField[];
    }
  | {
      kind: "order";
      visibleHeadline: string;
      accessibleHeadline: string;
      preview?: string;
      previewTitle?: string;
    };

export type BaselineMergeReviewSection = {
  side: "screen" | "file";
  count: number;
  blocks: BaselineMergeReviewBlock[];
};

export type BaselineMergeReviewSame = {
  count: number;
  headlines: string[];
  accessibleHeadlines: string[];
};

export type BaselineMergeReviewView = {
  screen?: BaselineMergeReviewSection;
  file?: BaselineMergeReviewSection;
  same?: BaselineMergeReviewSame;
};

const STATUS_LABELS: Record<string, string> = {
  "not-started": "未着手",
  "in-progress": "進行中",
  done: "完了",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  tentative: "未確定",
  committed: "確定",
};

const FIELD_LABELS: Record<string, string> = {
  場所: "場所",
  name: "名前",
  start: "開始",
  end: "終了",
  assigneeId: "担当者",
  status: "ステータス",
  progress: "進捗",
  confidence: "確度",
  predecessors: "先行",
  milestoneId: "対応マイルストン",
  todos: "TODO",
  tags: "タグ",
  note: "ノート",
  date: "日付",
  groupId: "グループ",
};

export type BaselineMergeConflictItem = {
  visibleHeadline: string;
  accessibleHeadline: string;
  fields: BaselineMergeReviewField[];
};

export function buildBaselineMergeReview(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
  lines: BaselineClassificationLine[],
  fields: readonly ScheduleFieldDef[] = [],
): BaselineMergeReviewView {
  const screenBlocks = collectScheduleDiffBlocks(screen, baseline, fields);
  const fileBlocks = collectScheduleDiffBlocks(file, baseline, fields);

  const screenLines = lines.filter((line) => line.label === "画面のみ");
  const fileLines = lines.filter((line) => line.label === "ファイルのみ");
  const sameLines = lines.filter((line) => line.label === "同じ");

  const view: BaselineMergeReviewView = {};

  if (screenLines.length > 0) {
    view.screen = {
      side: "screen",
      count: screenLines.length,
      blocks: buildSectionBlocks(screenLines, screenBlocks),
    };
  }
  if (fileLines.length > 0) {
    view.file = {
      side: "file",
      count: fileLines.length,
      blocks: buildSectionBlocks(fileLines, fileBlocks),
    };
  }
  if (sameLines.length > 0) {
    view.same = {
      count: sameLines.length,
      headlines: sameLines.map((line) => headlineForDisplay(line.headline)),
      accessibleHeadlines: sameLines.map((line) => line.headline),
    };
  }

  return view;
}

export function buildBaselineMergeConflictReview(
  screen: ScheduleDocument,
  file: ScheduleDocument,
  conflictLines: BaselineClassificationLine[],
  fields: readonly ScheduleFieldDef[] = [],
): BaselineMergeConflictItem[] {
  const screenTasks = tasksById(screen);
  const fileTasks = tasksById(file);
  const items: BaselineMergeConflictItem[] = [];
  for (const line of conflictLines) {
    const visibleHeadline = `${line.label} ${headlineForDisplay(line.headline)}`;
    const accessibleHeadline = `${line.label} ${line.headline}`;
    const taskId = extractUuid(line.headline);
    const reviewFields: BaselineMergeReviewField[] = [];
    if (taskId && line.headline.startsWith("変更 ")) {
      const screenTask = screenTasks.get(taskId);
      const fileTask = fileTasks.get(taskId);
      if (screenTask && fileTask) {
        for (const raw of fieldValueChangeLinesForDiff(
          fileTask,
          screenTask,
          fields,
        )) {
          reviewFields.push(formatFieldLine(raw));
        }
      }
    }
    items.push({
      visibleHeadline,
      accessibleHeadline,
      fields: reviewFields,
    });
  }
  return items;
}

function tasksById(doc: ScheduleDocument): Map<ScheduleId, Task> {
  const tasks = collectTasksFromDocument({
    ...doc,
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
  });
  return new Map(tasks.map((task) => [task.id, task]));
}

function buildSectionBlocks(
  classificationLines: BaselineClassificationLine[],
  diffBlocks: string[],
): BaselineMergeReviewBlock[] {
  const blocks: BaselineMergeReviewBlock[] = [];
  let lastPlainLocation: string | null = null;

  for (const line of classificationLines) {
    const block = findDiffBlock(line.headline, diffBlocks);
    const built = buildReviewBlock(line.headline, block, lastPlainLocation);
    if (built.locationKey != null) {
      lastPlainLocation = built.locationKey;
    }
    blocks.push(built.block);
  }

  return blocks;
}

function findDiffBlock(
  headline: string,
  diffBlocks: string[],
): string | null {
  if (headline.startsWith("title:")) {
    return diffBlocks.find((block) => block.startsWith("title:")) ?? null;
  }
  if (headline.startsWith("並び ")) {
    return (
      diffBlocks.find((block) => block.split("\n")[0] === headline) ?? null
    );
  }

  const id = extractUuid(headline);
  const op = headline.split(" ")[0];
  if (id && (op === "追加" || op === "削除" || op === "変更")) {
    return (
      diffBlocks.find((block) => {
        const first = block.split("\n")[0] ?? "";
        return first.startsWith(op) && first.includes(`(${id})`);
      }) ?? null
    );
  }

  return (
    diffBlocks.find((block) => block.split("\n")[0] === headline) ?? null
  );
}

function buildReviewBlock(
  headline: string,
  diffBlock: string | null,
  lastPlainLocation: string | null,
): { block: BaselineMergeReviewBlock; locationKey: string | null } {
  const visibleHeadline = headlineForDisplay(headline);
  const accessibleHeadline = headline;

  if (!diffBlock) {
    return {
      block: {
        kind: "headline",
        visibleHeadline,
        accessibleHeadline,
      },
      locationKey: null,
    };
  }

  if (headline.startsWith("title:")) {
    return {
      block: {
        kind: "title",
        visibleHeadline,
        accessibleHeadline,
      },
      locationKey: null,
    };
  }

  if (headline.startsWith("並び ")) {
    const parts = diffBlock.split("\n");
    const orderLine = parts[1]?.trim();
    return {
      block: {
        kind: "order",
        visibleHeadline,
        accessibleHeadline,
        preview: orderLine ? displayDiffValue(orderLine) : undefined,
        previewTitle: orderLine ?? undefined,
      },
      locationKey: null,
    };
  }

  const bodyLines = diffBlock.split("\n").slice(1);
  let locationSubheading: { visible: string; title: string } | undefined;
  let locationKey: string | null = null;
  let startIndex = 0;

  if (bodyLines[0]?.startsWith("  場所:")) {
    const locationRaw = bodyLines[0].slice("  場所:".length).trim();
    startIndex = 1;
    if (locationRaw.includes("→")) {
      // shown as a field on change blocks
    } else {
      const visible = displayDiffValue(locationRaw);
      if (visible !== lastPlainLocation) {
        locationSubheading = { visible, title: locationRaw };
        locationKey = visible;
      }
    }
  }

  const fieldLines = bodyLines.slice(startIndex);

  if (headline.startsWith("追加 ") || headline.startsWith("削除 ")) {
    const detailLines = fieldLines.map((raw) => formatFieldLine(raw));
    if (bodyLines[0]?.startsWith("  場所:") && bodyLines[0].includes("→")) {
      detailLines.unshift(formatFieldLine(bodyLines[0]));
    }
    return {
      block: {
        kind: headline.startsWith("追加 ") ? "add" : "delete",
        visibleHeadline,
        accessibleHeadline,
        locationSubheading,
        detailLines,
      },
      locationKey,
    };
  }

  if (headline.startsWith("変更 ")) {
    const fields: BaselineMergeReviewField[] = [];
    const noteDetails: BaselineMergeReviewField[] = [];

    if (bodyLines[0]?.startsWith("  場所:") && bodyLines[0].includes("→")) {
      fields.push(formatFieldLine(bodyLines[0]));
    }

    for (const raw of fieldLines) {
      const formatted = formatFieldLine(raw);
      if (formatted.label === "ノート") {
        noteDetails.push(formatted);
      } else {
        fields.push(formatted);
      }
    }

    return {
      block: {
        kind: "change",
        visibleHeadline,
        accessibleHeadline,
        locationSubheading,
        fields,
        noteDetails: noteDetails.length > 0 ? noteDetails : undefined,
      },
      locationKey,
    };
  }

  return {
    block: {
      kind: "headline",
      visibleHeadline,
      accessibleHeadline,
    },
    locationKey: null,
  };
}

function formatFieldLine(raw: string): BaselineMergeReviewField {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("場所:")) {
    const rest = trimmed.slice("場所:".length).trim();
    const visible = displayDiffValue(rest);
    return { label: "場所", visible, title: rest };
  }

  const colon = trimmed.indexOf(":");
  if (colon === -1) {
    return { label: "", visible: displayDiffValue(trimmed), title: trimmed };
  }

  const key = trimmed.slice(0, colon).trim();
  const rest = trimmed.slice(colon + 1).trim();
  const label = FIELD_LABELS[key] ?? key;
  const localized = localizeFieldValue(key, rest);
  const visible = displayDiffValue(localized);
  return { label, visible, title: localized };
}

function localizeFieldValue(key: string, rest: string): string {
  if (key === "assigneeId") {
    return rest.replace(/\bnull\b/g, "割り当てなし");
  }
  if (key === "status") {
    return localizeTokens(rest, STATUS_LABELS);
  }
  if (key === "confidence") {
    return localizeTokens(rest, CONFIDENCE_LABELS);
  }
  return rest;
}

function localizeTokens(text: string, map: Record<string, string>): string {
  return text
    .split(" → ")
    .map((part) => map[part.trim()] ?? part.trim())
    .join(" → ");
}

function displayDiffValue(text: string): string {
  return text.replace(/\s+\([0-9a-f-]{36}\)/gi, "");
}

function extractUuid(headline: string): string | null {
  const match = headline.match(/\(([0-9a-f-]{36})\)/i);
  return match ? match[1] : null;
}

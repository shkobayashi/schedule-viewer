import {
  collectTasksFromDocument,
  findTaskInDocument,
  isOutlineBranch,
} from "./hierarchy";
import {
  categoryCollapseKey,
  groupCollapseKey,
  hierarchyCollapseKey,
} from "./rows";
import type { Category, OutlineRoot, ScheduleDocument, ScheduleId } from "./types";

export type ExplanationViewState = {
  taskIds: ReadonlySet<ScheduleId> | null;
  collapseOverride: ReadonlySet<string> | null;
};

const ALLOWED_KEYS = new Set([
  "clear",
  "taskIds",
  "collapsedCategoryIds",
  "collapsedGroupIds",
  "collapsedOutlineHeadingIds",
  "discardInProgress",
]);

export function explanationViewActive(
  state: ExplanationViewState | null,
): state is ExplanationViewState {
  if (state == null) return false;
  return state.taskIds != null || state.collapseOverride != null;
}

export function displayedCollapsedSet(
  userCollapsed: ReadonlySet<string>,
  explanation: ExplanationViewState | null,
): ReadonlySet<string> {
  if (explanation?.collapseOverride != null) {
    return explanation.collapseOverride;
  }
  return userCollapsed;
}

export function explainTaskIdsForFilter(
  explanation: ExplanationViewState | null,
): ReadonlySet<ScheduleId> | null {
  return explanation?.taskIds ?? null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}

function unknownKeys(envelope: Record<string, unknown>): string[] {
  return Object.keys(envelope).filter((key) => !ALLOWED_KEYS.has(key));
}

function buildCollapseOverrideFromPatch(patch: {
  collapsedCategoryIds?: ScheduleId[];
  collapsedGroupIds?: ScheduleId[];
  collapsedOutlineHeadingIds?: ScheduleId[];
}): Set<string> | null {
  const hasCategory = patch.collapsedCategoryIds !== undefined;
  const hasGroup = patch.collapsedGroupIds !== undefined;
  const hasHeading = patch.collapsedOutlineHeadingIds !== undefined;
  if (!hasCategory && !hasGroup && !hasHeading) {
    return null;
  }
  const next = new Set<string>();
  if (patch.collapsedCategoryIds) {
    for (const id of patch.collapsedCategoryIds) {
      next.add(categoryCollapseKey(id));
    }
  }
  if (patch.collapsedGroupIds) {
    for (const id of patch.collapsedGroupIds) {
      next.add(groupCollapseKey(id));
    }
  }
  if (patch.collapsedOutlineHeadingIds) {
    for (const id of patch.collapsedOutlineHeadingIds) {
      next.add(hierarchyCollapseKey(id));
    }
  }
  return next;
}

function validateCollapseIds(
  collapseOverride: ReadonlySet<string>,
  categories: Category[],
  outline: OutlineRoot | undefined,
): boolean {
  const categoryIds = new Set(categories.map((c) => c.id));
  const groupIds = new Set(
    categories.flatMap((c) => c.groups.map((g) => g.id)),
  );
  const headingIds = new Set<string>();
  const walk = (nodes: OutlineRoot) => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      headingIds.add(node.id);
      walk(node.children);
    }
  };
  if (outline != null) walk(outline);

  for (const key of collapseOverride) {
    if (key.startsWith("category:")) {
      const id = key.slice("category:".length);
      if (!categoryIds.has(id)) return false;
    } else if (key.startsWith("group:")) {
      const id = key.slice("group:".length);
      if (!groupIds.has(id)) return false;
    } else if (key.startsWith("hierarchy:")) {
      const id = key.slice("hierarchy:".length);
      if (!headingIds.has(id)) return false;
    } else {
      return false;
    }
  }
  return true;
}

function taskIdsInDocumentOrder(
  document: Pick<ScheduleDocument, "categories" | "outline">,
  ids: ReadonlySet<ScheduleId>,
): ScheduleId[] {
  const tasks = collectTasksFromDocument({
    schemaVersion: 8,
    title: " ",
    milestoneGroups: [],
    milestones: [],
    categories: document.categories,
    outline: document.outline,
  });
  const ordered: ScheduleId[] = [];
  for (const task of tasks) {
    if (ids.has(task.id)) ordered.push(task.id);
  }
  return ordered;
}

function taskIdsChanged(
  previous: ExplanationViewState | null,
  nextTaskIds: ReadonlySet<ScheduleId> | null,
): boolean {
  if (nextTaskIds == null) {
    return previous?.taskIds != null;
  }
  if (previous?.taskIds == null) return true;
  if (previous.taskIds.size !== nextTaskIds.size) return true;
  for (const id of nextTaskIds) {
    if (!previous.taskIds.has(id)) return true;
  }
  return false;
}

export type ParseExplainViewResult =
  | { ok: true; kind: "clear" }
  | {
      ok: true;
      kind: "apply";
      state: ExplanationViewState;
      clearSelection: boolean;
    }
  | { ok: false; message: string };

export function parseExplainViewRequest(
  envelope: Record<string, unknown>,
  document: Pick<ScheduleDocument, "categories" | "outline">,
  previous: ExplanationViewState | null,
): ParseExplainViewResult {
  const extra = unknownKeys(envelope).filter((k) => k !== "discardInProgress");
  if (extra.length > 0) {
    return { ok: false, message: "説明に使えない項目があります。" };
  }

  if (envelope.clear === true) {
    if (
      envelope.taskIds !== undefined ||
      envelope.collapsedCategoryIds !== undefined ||
      envelope.collapsedGroupIds !== undefined ||
      envelope.collapsedOutlineHeadingIds !== undefined
    ) {
      return { ok: false, message: "clear と他の項目は同時に渡せません。" };
    }
    return { ok: true, kind: "clear" };
  }

  if (envelope.clear === false) {
    return { ok: false, message: "説明に使えない項目があります。" };
  }

  const hasTaskIds = envelope.taskIds !== undefined;

  if (hasTaskIds) {
    const rawTaskIds = envelope.taskIds;
    if (!isStringArray(rawTaskIds)) {
      return { ok: false, message: "taskIds は文字列の配列にしてください。" };
    }
    if (rawTaskIds.length === 0) {
      return {
        ok: false,
        message: "説明のための絞り込みに、タスクを 1 件以上指定してください。",
      };
    }
  }

  if (
    envelope.collapsedCategoryIds !== undefined &&
    !isStringArray(envelope.collapsedCategoryIds)
  ) {
    return {
      ok: false,
      message: "collapsedCategoryIds は文字列の配列にしてください。",
    };
  }
  if (
    envelope.collapsedGroupIds !== undefined &&
    !isStringArray(envelope.collapsedGroupIds)
  ) {
    return {
      ok: false,
      message: "collapsedGroupIds は文字列の配列にしてください。",
    };
  }
  if (
    envelope.collapsedOutlineHeadingIds !== undefined &&
    !isStringArray(envelope.collapsedOutlineHeadingIds)
  ) {
    return {
      ok: false,
      message: "collapsedOutlineHeadingIds は文字列の配列にしてください。",
    };
  }

  let taskIdSet: ReadonlySet<ScheduleId> | null = null;
  if (hasTaskIds) {
    taskIdSet = new Set(envelope.taskIds as string[]);
    for (const id of taskIdSet) {
      if (findTaskInDocument(document.categories, document.outline, id) == null) {
        return { ok: false, message: "説明に指定したタスクが見つかりません。" };
      }
    }
  }

  const finalCollapse = buildCollapseOverrideFromPatch({
    collapsedCategoryIds: envelope.collapsedCategoryIds as ScheduleId[] | undefined,
    collapsedGroupIds: envelope.collapsedGroupIds as ScheduleId[] | undefined,
    collapsedOutlineHeadingIds:
      envelope.collapsedOutlineHeadingIds as ScheduleId[] | undefined,
  });

  if (
    finalCollapse != null &&
    !validateCollapseIds(finalCollapse, document.categories, document.outline)
  ) {
    return { ok: false, message: "説明に指定した折りたたみが見つかりません。" };
  }

  if (taskIdSet == null && finalCollapse == null) {
    return { ok: false, message: "説明の指定がありません。" };
  }

  const state: ExplanationViewState = {
    taskIds: taskIdSet,
    collapseOverride: finalCollapse,
  };

  return {
    ok: true,
    kind: "apply",
    state,
    clearSelection: taskIdsChanged(previous, taskIdSet),
  };
}

export function explainViewClearSuccessText(active: boolean): string {
  return active ? "説明を消しました。" : "説明は掛かっていません。";
}

export function explainViewApplySuccessText(): string {
  return "説明のための見え方にしました。";
}

export function orderedExplainTaskIdsForRead(
  document: Pick<ScheduleDocument, "categories" | "outline">,
  taskIds: ReadonlySet<ScheduleId>,
): ScheduleId[] {
  return taskIdsInDocumentOrder(document, taskIds);
}

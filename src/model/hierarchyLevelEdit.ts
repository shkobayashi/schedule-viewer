import {
  assessHierarchyAlignment,
  LEGACY_THREE_LEVEL_COUNT,
} from "./hierarchy";
import type { DocumentSnapshot } from "./history";
import type { Category, OutlineRoot, ScheduleDocument, ScheduleLevelDef } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

/** 定義が無いファイルを階層ダイアログで開いたときの初期値。 */
export const EDITOR_LEGACY_THREE_LEVEL_DEFS: ScheduleLevelDef[] = [
  { name: "カテゴリ", meaning: "上のまとまり" },
  { name: "グループ", meaning: "その中のまとまり" },
  { name: "タスク", meaning: "日付を持つ一つの作業" },
];

export const HIERARCHY_SAVE_MISMATCH_MESSAGE =
  "入れ子の数が階層の定義と違うので、保存できません。";

export const HIERARCHY_DIALOG_SAVE_MISMATCH_MESSAGE =
  "入れ子の数が違うので、この段数はまだ保存できません。";

export const REPLACE_SCHEDULE_HIERARCHY_DEPTH_MISMATCH =
  "入れ子の数が、開いている階層の段数と違うので、置き換えられません。";

export const REPLACE_SCHEDULE_HIERARCHY_MISMATCH =
  "渡したスケジュールの段数と入れ子が揃っていないので、置き換えられません。";

export const MIN_LEVEL_COUNT = 1;
export const MAX_LEVEL_COUNT = 5;

export type McpLevelEntry = {
  name: string;
  meaning: string;
  instruction?: string;
  task?: boolean;
};

/** 空白だけの `instruction` を外す。 */
export function normalizeLevelDefinition(level: ScheduleLevelDef): ScheduleLevelDef {
  const instruction = level.instruction?.trim();
  const base: ScheduleLevelDef = {
    name: level.name.trim(),
    meaning: level.meaning.trim(),
  };
  if (!instruction) {
    return base;
  }
  return { ...base, instruction };
}

export function documentHasExplicitLevels(
  doc: Pick<ScheduleDocument, "levels">,
): boolean {
  return doc.levels != null && doc.levels.length > 0;
}

export function nominalLevelCount(
  doc: Pick<ScheduleDocument, "levels">,
): number {
  return doc.levels?.length ?? LEGACY_THREE_LEVEL_COUNT;
}

export function levelDefsForEditor(
  doc: Pick<ScheduleDocument, "levels">,
): ScheduleLevelDef[] {
  if (documentHasExplicitLevels(doc)) {
    return doc.levels!.map((level) => ({ ...level }));
  }
  return EDITOR_LEGACY_THREE_LEVEL_DEFS.map((level) => ({ ...level }));
}

export function normalizeLevelDraft(
  draft: readonly ScheduleLevelDef[],
): ScheduleLevelDef[] {
  return draft.map((level) => normalizeLevelDefinition(level));
}

function levelDefEqual(a: ScheduleLevelDef, b: ScheduleLevelDef): boolean {
  const left = normalizeLevelDefinition(a);
  const right = normalizeLevelDefinition(b);
  if (left.name !== right.name || left.meaning !== right.meaning) {
    return false;
  }
  const leftInstruction = left.instruction ?? undefined;
  const rightInstruction = right.instruction ?? undefined;
  return leftInstruction === rightInstruction;
}

export function levelDefsEqual(
  a: readonly ScheduleLevelDef[],
  b: readonly ScheduleLevelDef[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((level, index) => levelDefEqual(level, b[index]!));
}

/** 見出しの段だけ、タスク段とは入れ替えない。 */
export function reorderLevelDraft(
  draft: readonly ScheduleLevelDef[],
  index: number,
  direction: -1 | 1,
): ScheduleLevelDef[] | null {
  const lastHeadingIndex = draft.length - 2;
  if (lastHeadingIndex < 0) return null;
  if (index < 0 || index > lastHeadingIndex) return null;
  const target = index + direction;
  if (target < 0 || target > lastHeadingIndex) return null;
  const next = draft.map((level) => ({ ...level }));
  const current = next[index]!;
  next[index] = next[target]!;
  next[target] = current;
  return next;
}

export function isLevelDraftComplete(
  draft: readonly ScheduleLevelDef[],
): boolean {
  if (draft.length < MIN_LEVEL_COUNT || draft.length > MAX_LEVEL_COUNT) {
    return false;
  }
  return draft.every(
    (level) => level.name.trim().length > 0 && level.meaning.trim().length > 0,
  );
}

export function categoriesToOutlineRoot(categories: Category[]): OutlineRoot {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    children: category.groups.map((group) => ({
      id: group.id,
      name: group.name,
      children: group.tasks.map((task) => ({
        ...task,
        predecessors: [...task.predecessors],
        ...(task.tags != null ? { tags: [...task.tags] } : {}),
      })),
    })),
  }));
}

function snapshotAsDocument(
  snapshot: DocumentSnapshot,
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: snapshot.title,
    milestoneGroups: snapshot.milestoneGroups,
    milestones: snapshot.milestones,
    categories: snapshot.categories,
    levels: snapshot.levels,
    outline: snapshot.outline,
  };
}

export function hierarchyAlignmentForSnapshot(
  snapshot: DocumentSnapshot,
  levelCount: number,
) {
  return assessHierarchyAlignment(snapshotAsDocument(snapshot), levelCount);
}

export function shouldSkipLevelEditorCommit(
  hadDocumentLevels: boolean,
  draft: readonly ScheduleLevelDef[],
): boolean {
  if (hadDocumentLevels) return false;
  return levelDefsEqual(
    normalizeLevelDraft(draft),
    EDITOR_LEGACY_THREE_LEVEL_DEFS,
  );
}

export type ApplyLevelEditorCommitResult = {
  next: DocumentSnapshot;
  countChanged: boolean;
  editorRelaxedMismatch: boolean;
  showDialogMismatchAlert: boolean;
};

export function applyLevelEditorCommit(
  snapshot: DocumentSnapshot,
  draft: readonly ScheduleLevelDef[],
  hadDocumentLevels: boolean,
): ApplyLevelEditorCommitResult {
  if (shouldSkipLevelEditorCommit(hadDocumentLevels, draft)) {
    return {
      next: snapshot,
      countChanged: false,
      editorRelaxedMismatch: false,
      showDialogMismatchAlert: false,
    };
  }

  const levels = normalizeLevelDraft(draft);
  const previousCount = hadDocumentLevels
    ? snapshot.levels!.length
    : LEGACY_THREE_LEVEL_COUNT;
  const countChanged = levels.length !== previousCount;

  const wasAlignedBefore = hierarchyAlignmentForSnapshot(
    snapshot,
    previousCount,
  ).aligned;

  let categories = snapshot.categories;
  let outline = snapshot.outline;
  const usesCategoriesOnly =
    (categories?.length ?? 0) > 0 &&
    (outline == null || outline.length === 0);

  if (usesCategoriesOnly) {
    outline = categoriesToOutlineRoot(categories);
    categories = [];
  }

  const next: DocumentSnapshot = {
    ...snapshot,
    levels,
    categories,
    outline,
  };

  const alignedAfter = hierarchyAlignmentForSnapshot(next, levels.length).aligned;
  const editorRelaxedMismatch =
    countChanged && wasAlignedBefore && !alignedAfter;
  const showDialogMismatchAlert = countChanged && !alignedAfter;

  return {
    next,
    countChanged,
    editorRelaxedMismatch,
    showDialogMismatchAlert,
  };
}

export function assessHierarchySave(
  doc: ScheduleDocument,
): { ok: true } | { ok: false; message: string } {
  if (!documentHasExplicitLevels(doc)) {
    return { ok: true };
  }
  const levelCount = doc.levels!.length;
  const hasOutline = doc.outline != null && doc.outline.length > 0;
  const hasCategories = (doc.categories?.length ?? 0) > 0;
  if (!hasOutline && !hasCategories) {
    return { ok: false, message: HIERARCHY_SAVE_MISMATCH_MESSAGE };
  }
  if (hasCategories && hasOutline) {
    return { ok: false, message: HIERARCHY_SAVE_MISMATCH_MESSAGE };
  }
  if (hasCategories) {
    return { ok: false, message: HIERARCHY_SAVE_MISMATCH_MESSAGE };
  }
  if (!hierarchyAlignmentForSnapshot(
    {
      title: doc.title,
      categories: doc.categories,
      milestoneGroups: doc.milestoneGroups,
      milestones: doc.milestones,
      levels: doc.levels,
      outline: doc.outline,
    },
    levelCount,
  ).aligned) {
    return { ok: false, message: HIERARCHY_SAVE_MISMATCH_MESSAGE };
  }
  return { ok: true };
}

export function mcpLevelsFromDocument(
  doc: Pick<ScheduleDocument, "levels">,
): McpLevelEntry[] {
  const defs = documentHasExplicitLevels(doc)
    ? doc.levels!
    : EDITOR_LEGACY_THREE_LEVEL_DEFS;
  return defs.map((level, index) => {
    const normalized = normalizeLevelDefinition(level);
    const entry: McpLevelEntry = {
      name: normalized.name,
      meaning: normalized.meaning,
      ...(index === defs.length - 1 ? { task: true } : {}),
    };
    if (normalized.instruction) {
      entry.instruction = normalized.instruction;
    }
    return entry;
  });
}

export function assessReplaceScheduleLevelCount(
  screen: Pick<ScheduleDocument, "levels">,
  incoming: ScheduleDocument,
): { ok: true } | { ok: false; message: string } {
  const screenCount = nominalLevelCount(screen);
  const incomingCount = nominalLevelCount(incoming);
  if (screenCount === incomingCount) {
    return { ok: true };
  }
  if (!documentHasExplicitLevels(incoming)) {
    if (screenCount !== LEGACY_THREE_LEVEL_COUNT) {
      return { ok: false, message: REPLACE_SCHEDULE_HIERARCHY_DEPTH_MISMATCH };
    }
    return { ok: true };
  }
  const hierarchyGate = assessHierarchySave(incoming);
  if (!hierarchyGate.ok) {
    return { ok: false, message: REPLACE_SCHEDULE_HIERARCHY_MISMATCH };
  }
  return { ok: true };
}

export function levelEditorMismatchAlertVisible(
  draft: readonly ScheduleLevelDef[],
  snapshot: DocumentSnapshot,
  hadDocumentLevels: boolean,
): boolean {
  if (shouldSkipLevelEditorCommit(hadDocumentLevels, draft)) return false;
  const normalized = normalizeLevelDraft(draft);
  const previousCount = hadDocumentLevels
    ? snapshot.levels!.length
    : LEGACY_THREE_LEVEL_COUNT;
  if (normalized.length === previousCount) return false;
  const preview = applyLevelEditorCommit(snapshot, draft, hadDocumentLevels);
  return preview.showDialogMismatchAlert;
}

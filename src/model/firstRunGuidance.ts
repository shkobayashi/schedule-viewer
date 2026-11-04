const LS_HINT_DISMISSED = "schedule-viewer/first-run/hint-dismissed";
const LS_SAVE_HINT_COMPLETED = "schedule-viewer/first-run/save-hint-completed";
const LS_CHECKLIST = "schedule-viewer/first-run/checklist";

export const RECENT_FILES_EMPTY_HINT = "ファイルを開くとここに並びます";

export type FirstRunChecklistId = "prepareSchedule" | "guide" | "mcp";

export type FirstRunChecklistState = Record<FirstRunChecklistId, boolean>;

export const FIRST_RUN_PREPARE_SCHEDULE_TITLE = "スケジュールを用意する";

export const FIRST_RUN_CHECKLIST_ORDER: FirstRunChecklistId[] = [
  "prepareSchedule",
  "guide",
  "mcp",
];

export const FIRST_RUN_CHECKLIST_LABELS: Record<FirstRunChecklistId, string> = {
  prepareSchedule: FIRST_RUN_PREPARE_SCHEDULE_TITLE,
  guide: "操作の案内を読む",
  mcp: "LLM（MCP）とつなぐ",
};

const EMPTY_CHECKLIST: FirstRunChecklistState = {
  prepareSchedule: false,
  guide: false,
  mcp: false,
};

function parseChecklist(raw: string | null): FirstRunChecklistState {
  if (!raw) return { ...EMPTY_CHECKLIST };
  try {
    const parsed = JSON.parse(raw) as Partial<
      FirstRunChecklistState & { openFile?: boolean }
    >;
    const legacyOpenFile = parsed.openFile === true;
    return {
      prepareSchedule:
        parsed.prepareSchedule === true || legacyOpenFile,
      guide: parsed.guide === true,
      mcp: parsed.mcp === true,
    };
  } catch {
    return { ...EMPTY_CHECKLIST };
  }
}

export function readFirstRunChecklist(): FirstRunChecklistState {
  try {
    return parseChecklist(localStorage.getItem(LS_CHECKLIST));
  } catch {
    return { ...EMPTY_CHECKLIST };
  }
}

function writeFirstRunChecklist(state: FirstRunChecklistState): void {
  try {
    localStorage.setItem(LS_CHECKLIST, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function isFirstRunChecklistComplete(
  state: FirstRunChecklistState = readFirstRunChecklist(),
): boolean {
  return FIRST_RUN_CHECKLIST_ORDER.every((id) => state[id]);
}

export function markFirstRunChecklistItem(id: FirstRunChecklistId): FirstRunChecklistState {
  const next = { ...readFirstRunChecklist(), [id]: true };
  writeFirstRunChecklist(next);
  if (isFirstRunChecklistComplete(next)) {
    dismissFirstRunHint();
  }
  return next;
}

export function isFirstRunHintDismissed(): boolean {
  try {
    return localStorage.getItem(LS_HINT_DISMISSED) === "1";
  } catch {
    return false;
  }
}

export function dismissFirstRunHint(): void {
  try {
    localStorage.setItem(LS_HINT_DISMISSED, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function isSaveHintCompleted(): boolean {
  try {
    return localStorage.getItem(LS_SAVE_HINT_COMPLETED) === "1";
  } catch {
    return false;
  }
}

export function markSaveHintCompleted(): void {
  try {
    localStorage.setItem(LS_SAVE_HINT_COMPLETED, "1");
  } catch {
    /* ignore */
  }
}

export function saveHintLabel(commandKey: boolean): string {
  return commandKey
    ? "保存は ☰ または ⌘S"
    : "保存は ☰ または Ctrl+S";
}

export function firstRunHintSaveFootnote(commandKey: boolean): string {
  return commandKey
    ? "保存は ☰ メニューまたは ⌘S です。"
    : "保存は ☰ メニューまたは Ctrl+S です。";
}

export function shouldShowFirstRunHintCard(options: {
  dismissed: boolean;
  startupSettled: boolean;
  checklist: FirstRunChecklistState;
}): boolean {
  if (options.dismissed || !options.startupSettled) {
    return false;
  }
  if (isFirstRunChecklistComplete(options.checklist)) {
    return false;
  }
  return true;
}

export function shouldShowSaveHintPill(options: {
  completed: boolean;
  startupSettled: boolean;
  isDirty: boolean;
}): boolean {
  if (options.completed || !options.startupSettled || !options.isDirty) {
    return false;
  }
  return true;
}

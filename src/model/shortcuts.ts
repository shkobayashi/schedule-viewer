import type { ScheduleId } from "./types";

export type AppShortcut =
  | "save"
  | "saveAs"
  | "open"
  | "openNew"
  | "find"
  | "edit"
  | "delete"
  | "link"
  | "note";

export type ShortcutKeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export type ShortcutContext = {
  dialogOpen: boolean;
  blocksEditKeys: boolean;
  /** 検索欄、入力欄、選択欄。ボタンは線を引くキーとノートのキーを止めない。 */
  blocksLinkKeys: boolean;
};

export type ChartScrollDirection = "up" | "down" | "left" | "right";

export type ChartScrollOffset = {
  x: number;
  y: number;
};

const EDIT_BLOCK_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);
const LINK_BLOCK_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function shortcutKey(event: ShortcutKeyEvent): string {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

export function blocksEditShortcut(target: {
  tagName: string;
  isContentEditable: boolean;
}): boolean {
  if (target.isContentEditable) return true;
  return EDIT_BLOCK_TAGS.has(target.tagName);
}

/** 線を引くキーとノートのキーは、検索欄・入力欄・選択欄と編集可能領域では効かない。 */
export function blocksLinkShortcut(target: {
  tagName: string;
  isContentEditable: boolean;
}): boolean {
  if (target.isContentEditable) return true;
  return LINK_BLOCK_TAGS.has(target.tagName);
}

export function blocksBrowserShortcut(event: ShortcutKeyEvent): boolean {
  if (event.altKey) return false;
  const key = shortcutKey(event);
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return false;
  if (key === "s") return true;
  if (key === "n") return !event.shiftKey;
  if (key === "d" && event.shiftKey) return true;
  if (key === "k" && !event.shiftKey) return true;
  if (key === "o") return true;
  if (key === "f" && !event.shiftKey) return true;
  if (key === ",") return true;
  if (!event.shiftKey && key >= "1" && key <= "4") return true;
  return false;
}

export function commandPaletteShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘K" : "Ctrl+K";
}

/** ダイアログが開いているあいだは開かない。コマンドパレット自身は別処理。 */
export function matchOpenCommandPalette(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen"> & { commandPaletteOpen: boolean },
): "open" | "close" | null {
  if (event.altKey || event.shiftKey) return null;
  if (!(event.ctrlKey || event.metaKey)) return null;
  if (shortcutKey(event) !== "k") return null;
  if (context.commandPaletteOpen) return "close";
  if (context.dialogOpen) return null;
  return "open";
}

/** macOS の ⌘Q。Tauri のウィンドウ close へ渡し、未保存確認は onCloseRequested が行う。 */
export function matchMacAppQuit(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen"> & { commandPaletteOpen: boolean },
): boolean {
  if (context.dialogOpen || context.commandPaletteOpen || event.altKey || event.shiftKey) {
    return false;
  }
  if (!(event.ctrlKey || event.metaKey)) return false;
  return shortcutKey(event) === "q";
}

export function matchAppShortcut(
  event: ShortcutKeyEvent,
  context: ShortcutContext,
): AppShortcut | null {
  if (context.dialogOpen || event.altKey) return null;
  const key = shortcutKey(event);

  if (blocksBrowserShortcut(event) && key !== "n") {
    if (key === "s" && event.shiftKey) return "saveAs";
    if (key === "s") return "save";
    if (key === "o" && event.shiftKey) return "openNew";
    if (key === "o") return "open";
    return "find";
  }

  if (
    (key === "l" || key === "n") &&
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey
  ) {
    if (context.blocksLinkKeys) return null;
    return key === "l" ? "link" : "note";
  }

  if (event.ctrlKey || event.metaKey || event.shiftKey || context.blocksEditKeys) {
    return null;
  }
  if (key === "Enter") return "edit";
  if (key === "Delete" || key === "Backspace") return "delete";
  return null;
}

export type DisplayScaleDirection = "in" | "out";

/** ⌘ または Ctrl と + / = で拡大、- で縮小。Alt と、文字が `_` の押し方は対象外。 */
export function matchDisplayScale(
  event: ShortcutKeyEvent,
): DisplayScaleDirection | null {
  if (event.altKey) return null;
  if (!(event.ctrlKey || event.metaKey)) return null;
  if (event.key === "+" || event.key === "=") return "in";
  if (event.key === "-") return "out";
  return null;
}

export function matchChartScroll(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen">,
): ChartScrollDirection | null {
  if (context.dialogOpen || event.altKey || event.shiftKey) return null;
  if (!(event.ctrlKey || event.metaKey)) return null;
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  if (event.key === "ArrowLeft") return "left";
  if (event.key === "ArrowRight") return "right";
  return null;
}

export function chartScrollOffset(
  direction: ChartScrollDirection,
  stepPx: number,
): ChartScrollOffset {
  if (direction === "up") return { x: 0, y: -stepPx };
  if (direction === "down") return { x: 0, y: stepPx };
  if (direction === "left") return { x: -stepPx, y: 0 };
  return { x: stepPx, y: 0 };
}

export function usesCommandKey(platform: string): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function linkShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘L" : "Ctrl+L";
}

export function noteShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘N" : "Ctrl+N";
}

export function fileShortcutHint(
  action: "open" | "openNew" | "save" | "saveAs",
  commandKey: boolean,
): string {
  if (commandKey) {
    if (action === "open") return "⌘O";
    if (action === "openNew") return "⌘⇧O";
    if (action === "save") return "⌘S";
    return "⌘⇧S";
  }
  if (action === "open") return "Ctrl+O";
  if (action === "openNew") return "Ctrl+Shift+O";
  if (action === "save") return "Ctrl+S";
  return "Ctrl+Shift+S";
}

export function editShortcutHint(): string {
  return "Enter";
}

export function deleteShortcutHint(): string {
  return "Delete";
}

export function diffCopyShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧D" : "Ctrl+Shift+D";
}

export function matchDiffCopy(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen"> & { fileBusy: boolean },
): boolean {
  if (context.dialogOpen || context.fileBusy || event.altKey) return false;
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return false;
  return shortcutKey(event) === "d";
}

export function undoShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘Z" : "Ctrl+Z";
}

export function redoShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧Z" : "Ctrl+Shift+Z（Ctrl+Y も可）";
}

/** ツールバー tooltip 用（括弧を二重にしない） */
export function redoToolbarTitle(commandKey: boolean): string {
  return commandKey
    ? "やり直し（⌘⇧Z）"
    : "やり直し（Ctrl+Shift+Z、Ctrl+Y も可）";
}

export function findShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘F" : "Ctrl+F";
}

export function displayScaleShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘+ / ⌘−" : "Ctrl+ / Ctrl−";
}

export function chartScrollShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘矢印" : "Ctrl+矢印";
}

export type ViewTierShortcut = "day" | "week" | "month" | "fit";

export type ModNavigationShortcutContext = Pick<
  ShortcutContext,
  "dialogOpen" | "blocksLinkKeys"
> & {
  linkSourceId?: ScheduleId | null;
  selectedTaskCount?: number;
};

type EditNavigationShortcutContext = Pick<
  ShortcutContext,
  "dialogOpen" | "blocksEditKeys"
> & {
  selectedTaskCount?: number;
  commandPaletteOpen?: boolean;
};

export function settingsShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘," : "Ctrl+,";
}

export function matchOpenSettings(
  event: ShortcutKeyEvent,
  context: ModNavigationShortcutContext,
): boolean {
  if (context.dialogOpen || context.blocksLinkKeys || event.altKey || event.shiftKey) {
    return false;
  }
  if (!(event.ctrlKey || event.metaKey)) return false;
  return event.key === ",";
}

export function goTodayShortcutHint(): string {
  return "T";
}

export function matchGoToday(
  event: ShortcutKeyEvent,
  context: EditNavigationShortcutContext,
): boolean {
  if (
    context.dialogOpen ||
    context.blocksEditKeys ||
    context.commandPaletteOpen
  ) {
    return false;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  return shortcutKey(event) === "t";
}

export function viewTierShortcutHint(
  tier: ViewTierShortcut,
  commandKey: boolean,
): string {
  const mod = commandKey ? "⌘" : "Ctrl";
  if (tier === "day") return `${mod}+1`;
  if (tier === "week") return `${mod}+2`;
  if (tier === "month") return `${mod}+3`;
  return `${mod}+4`;
}

export function matchViewTier(
  event: ShortcutKeyEvent,
  context: ModNavigationShortcutContext,
): ViewTierShortcut | null {
  if (context.dialogOpen || context.blocksLinkKeys || event.altKey || event.shiftKey) {
    return null;
  }
  if (!(event.ctrlKey || event.metaKey)) return null;
  const key = shortcutKey(event);
  if (key === "1") return "day";
  if (key === "2") return "week";
  if (key === "3") return "month";
  if (key === "4") return "fit";
  return null;
}

export function lineageToggleShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧L" : "Ctrl+Shift+L";
}

export function matchToggleLineage(
  event: ShortcutKeyEvent,
  context: ModNavigationShortcutContext,
): boolean {
  if (
    context.dialogOpen ||
    context.blocksLinkKeys ||
    context.linkSourceId != null ||
    (context.selectedTaskCount ?? 0) < 1
  ) {
    return false;
  }
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) return false;
  return shortcutKey(event) === "l";
}

export function filterPanelShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧F" : "Ctrl+Shift+F";
}

export function matchToggleFilterPanel(
  event: ShortcutKeyEvent,
  context: ModNavigationShortcutContext,
): boolean {
  if (context.dialogOpen || context.blocksLinkKeys || event.altKey) return false;
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return false;
  return shortcutKey(event) === "f";
}

export function confidenceToggleShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧U" : "Ctrl+Shift+U";
}

export function matchToggleConfidence(
  event: ShortcutKeyEvent,
  context: ModNavigationShortcutContext,
): boolean {
  if (
    context.dialogOpen ||
    context.blocksLinkKeys ||
    (context.selectedTaskCount ?? 0) < 1
  ) {
    return false;
  }
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) return false;
  return shortcutKey(event) === "u";
}

export function renameShortcutHint(): string {
  return "F2";
}

export function matchRenameF2(
  event: ShortcutKeyEvent,
  context: EditNavigationShortcutContext,
): boolean {
  if (context.dialogOpen || context.blocksEditKeys) return false;
  if (event.key !== "F2") return false;
  return (context.selectedTaskCount ?? 0) === 1;
}

export type TaskWorkflowShortcutContext = Pick<
  ShortcutContext,
  "dialogOpen" | "blocksLinkKeys"
>;

function taskWorkflowBlocked(context: TaskWorkflowShortcutContext): boolean {
  return context.dialogOpen || context.blocksLinkKeys;
}

export function matchAddTaskShortcut(
  event: ShortcutKeyEvent,
  context: TaskWorkflowShortcutContext,
): boolean {
  if (taskWorkflowBlocked(context)) return false;
  if (event.altKey) return false;
  const key = event.key;
  if (key === "Insert" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    return true;
  }
  if (key !== "Enter") return false;
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey) return false;
  return true;
}

export function matchAddMilestoneShortcut(
  event: ShortcutKeyEvent,
  context: TaskWorkflowShortcutContext,
): boolean {
  if (taskWorkflowBlocked(context)) return false;
  if (event.altKey) return false;
  if (event.key !== "Enter") return false;
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return false;
  return true;
}

export function matchDuplicateTaskShortcut(
  event: ShortcutKeyEvent,
  context: TaskWorkflowShortcutContext,
): boolean {
  if (taskWorkflowBlocked(context)) return false;
  if (!event.altKey || !event.shiftKey) return false;
  if (event.ctrlKey || event.metaKey) return false;
  return event.key === "ArrowDown";
}

export type ReorderTaskDirection = "up" | "down";

export function matchReorderTaskShortcut(
  event: ShortcutKeyEvent,
  context: TaskWorkflowShortcutContext,
): ReorderTaskDirection | null {
  if (taskWorkflowBlocked(context)) return null;
  if (!event.altKey || event.shiftKey) return null;
  if (event.ctrlKey || event.metaKey) return null;
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  return null;
}

export function addTaskShortcutHint(commandKey: boolean): string {
  const mod = commandKey ? "⌘" : "Ctrl";
  return `${mod}+Enter / Insert`;
}

export function addMilestoneShortcutHint(commandKey: boolean): string {
  return commandKey ? "⌘⇧Enter" : "Ctrl+Shift+Enter";
}

export function duplicateTaskShortcutHint(): string {
  return "Alt+Shift+↓";
}

export function reorderTaskShortcutHint(): string {
  return "Alt+↑ / Alt+↓";
}

export type ShortcutReferenceRow = {
  action: string;
  keys: string;
  /** 操作名の下。キー欄を短く保つための補足 */
  actionNote?: string;
};

export type ShortcutReferenceGroup = {
  title: string;
  rows: ShortcutReferenceRow[];
};

export type ShortcutReferenceColumns = {
  start: ShortcutReferenceGroup[];
  end: ShortcutReferenceGroup[];
};

export function shortcutReferenceColumnGroups(
  commandKey: boolean,
): ShortcutReferenceColumns {
  const mod = commandKey ? "⌘" : "Ctrl";
  return {
    start: [
      {
        title: "ファイルとウィンドウ",
        rows: [
          { action: "開く", keys: fileShortcutHint("open", commandKey) },
          {
            action: "新しいウィンドウで開く",
            keys: fileShortcutHint("openNew", commandKey),
          },
          { action: "保存", keys: fileShortcutHint("save", commandKey) },
          { action: "別名保存", keys: fileShortcutHint("saveAs", commandKey) },
          { action: "差分をコピー", keys: diffCopyShortcutHint(commandKey) },
        ],
      },
      {
        title: "表示とナビゲーション",
        rows: [
          { action: "今日", keys: goTodayShortcutHint() },
          { action: "日表示", keys: viewTierShortcutHint("day", commandKey) },
          { action: "週表示", keys: viewTierShortcutHint("week", commandKey) },
          { action: "月表示", keys: viewTierShortcutHint("month", commandKey) },
          { action: "全体表示", keys: viewTierShortcutHint("fit", commandKey) },
          {
            action: "系統を表示／解除",
            keys: lineageToggleShortcutHint(commandKey),
          },
          { action: "絞り込みパネル", keys: filterPanelShortcutHint(commandKey) },
          { action: "表示サイズ", keys: displayScaleShortcutHint(commandKey) },
          {
            action: "チャートのスクロール",
            keys: chartScrollShortcutHint(commandKey),
          },
          {
            action: "ズーム",
            keys: `${mod}+ホイール`,
            actionNote: "一覧の上では左端の日付を保つ",
          },
          { action: "横スクロール", keys: "Shift+ホイール" },
        ],
      },
      {
        title: "検索と設定",
        rows: [
          { action: "検索", keys: findShortcutHint(commandKey) },
          { action: "設定", keys: settingsShortcutHint(commandKey) },
        ],
      },
    ],
    end: [
      {
        title: "編集",
        rows: [
          {
            action: "確定／未確定（選択中のタスク）",
            keys: confidenceToggleShortcutHint(commandKey),
          },
          { action: "名前を変更（タスク）", keys: renameShortcutHint() },
          { action: "編集", keys: editShortcutHint() },
          { action: "削除", keys: deleteShortcutHint() },
          { action: "線を引く", keys: linkShortcutHint(commandKey) },
          { action: "ノート", keys: noteShortcutHint(commandKey) },
          { action: "タスクを追加", keys: addTaskShortcutHint(commandKey) },
          {
            action: "マイルストンを追加",
            keys: addMilestoneShortcutHint(commandKey),
          },
          {
            action: "同じグループで上下に移動",
            keys: reorderTaskShortcutHint(),
          },
          { action: "タスクを複製", keys: duplicateTaskShortcutHint() },
          { action: "取り消し", keys: undoShortcutHint(commandKey) },
          { action: "やり直し", keys: redoShortcutHint(commandKey) },
        ],
      },
      {
        title: "選択とマウス",
        rows: [
          {
            action: "タスクを追加選択",
            keys: commandKey ? "⌘+クリック" : "Ctrl+クリック",
          },
          { action: "タスクを範囲選択", keys: "Shift+クリック" },
          { action: "選択を伸ばす", keys: "Shift+↑↓" },
        ],
      },
      {
        title: "ヘルプ",
        rows: [
          { action: "ショートカット一覧", keys: "? / F1" },
          { action: "コマンドパレット", keys: commandPaletteShortcutHint(commandKey) },
        ],
      },
    ],
  };
}

export function shortcutReferenceRows(commandKey: boolean): ShortcutReferenceRow[] {
  const { start, end } = shortcutReferenceColumnGroups(commandKey);
  return [...start, ...end].flatMap((group) => group.rows);
}

/** 入力欄・選択欄・ボタン・ダイアログのあいだは効かない。? と F1。 */
export function matchOpenShortcutsHelp(
  event: ShortcutKeyEvent,
  context: Pick<ShortcutContext, "dialogOpen" | "blocksEditKeys">,
): boolean {
  if (context.dialogOpen || context.blocksEditKeys) return false;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false;
  }
  return event.key === "?" || event.key === "？" || event.key === "F1";
}

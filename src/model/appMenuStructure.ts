import { OPERATION_FORMAL } from "./operationLabels";
import {
  goTodayShortcutHint,
  settingsShortcutHint,
  viewTierShortcutHint,
  type ViewTierShortcut,
} from "./shortcuts";

/** macOS メニューと ☰ で同じショートカット文字列に揃える ID。 */
export type SharedMenuShortcutId =
  | "settings"
  | "goToday"
  | "tierDay"
  | "tierWeek"
  | "tierMonth"
  | "fit";

export function sharedMenuShortcutHint(
  id: SharedMenuShortcutId,
  commandKey: boolean,
): string {
  if (id === "settings") return settingsShortcutHint(commandKey);
  if (id === "goToday") return goTodayShortcutHint();
  if (id === "tierDay") return viewTierShortcutHint("day", commandKey);
  if (id === "tierWeek") return viewTierShortcutHint("week", commandKey);
  if (id === "tierMonth") return viewTierShortcutHint("month", commandKey);
  return viewTierShortcutHint("fit", commandKey);
}

const VIEW_TIER_BY_SHORTCUT: Record<
  Exclude<SharedMenuShortcutId, "settings" | "goToday">,
  ViewTierShortcut
> = {
  tierDay: "day",
  tierWeek: "week",
  tierMonth: "month",
  fit: "fit",
};

export function macSharedMenuAccelerator(
  id: SharedMenuShortcutId,
): string | undefined {
  if (id === "settings") return "Command+,";
  if (id === "goToday") return "T";
  const tier = VIEW_TIER_BY_SHORTCUT[id as keyof typeof VIEW_TIER_BY_SHORTCUT];
  if (tier === "day") return "Command+1";
  if (tier === "week") return "Command+2";
  if (tier === "month") return "Command+3";
  if (tier === "fit") return "Command+4";
  return undefined;
}

/** ☰ と macOS ファイルメニューで同じ順・同じ正式名に並べる項目。 */
export type SharedFileMenuActionId =
  | "open"
  | "openNewWindow"
  | "save"
  | "saveAs"
  | "exportHtml"
  | "exportWorkspace"
  | "showJson"
  | "showDiff"
  | "copyDiff";

export type SharedFileMenuRow =
  | { kind: "separator" }
  | { kind: "recentSubmenu" }
  | {
      kind: "action";
      id: SharedFileMenuActionId;
      label: string;
      /** 開く・保存系は fileBusy / 起動復旧でロック */
      locksWithFileIdle: boolean;
      /** menu-shortcut に出す fileShortcutHint の種類 */
      fileShortcut?:
        | "open"
        | "openNew"
        | "save"
        | "saveAs";
      /** diffCopy 用（fileShortcutHint 以外） */
      diffCopyShortcut?: true;
    };

export const SHARED_FILE_MENU_ROWS: readonly SharedFileMenuRow[] = [
  {
    kind: "action",
    id: "open",
    label: OPERATION_FORMAL.open,
    locksWithFileIdle: true,
    fileShortcut: "open",
  },
  { kind: "recentSubmenu" },
  {
    kind: "action",
    id: "openNewWindow",
    label: OPERATION_FORMAL.openNewWindow,
    locksWithFileIdle: true,
    fileShortcut: "openNew",
  },
  { kind: "separator" },
  {
    kind: "action",
    id: "save",
    label: OPERATION_FORMAL.save,
    locksWithFileIdle: true,
    fileShortcut: "save",
  },
  {
    kind: "action",
    id: "saveAs",
    label: OPERATION_FORMAL.saveAs,
    locksWithFileIdle: true,
    fileShortcut: "saveAs",
  },
  {
    kind: "action",
    id: "exportHtml",
    label: OPERATION_FORMAL.export,
    locksWithFileIdle: false,
  },
  {
    kind: "action",
    id: "exportWorkspace",
    label: OPERATION_FORMAL.exportWorkspace,
    locksWithFileIdle: true,
  },
  {
    kind: "action",
    id: "showJson",
    label: OPERATION_FORMAL.showJson,
    locksWithFileIdle: false,
  },
  {
    kind: "action",
    id: "showDiff",
    label: OPERATION_FORMAL.showDiff,
    locksWithFileIdle: true,
  },
  {
    kind: "action",
    id: "copyDiff",
    label: OPERATION_FORMAL.copyDiff,
    locksWithFileIdle: false,
    diffCopyShortcut: true,
  },
];

/** ☰ メニュー末尾（macOS では表示メニューとアプリメニューに分ける）。 */
export type HamburgerTailActionId =
  | "guide"
  | "shortcuts"
  | "checkForUpdates"
  | "settings";

export type HamburgerTailRow = {
  kind: "action";
  id: HamburgerTailActionId;
  label: string;
  menuShortcut?: SharedMenuShortcutId;
};

export function macMenuAccelerator(
  row: Extract<SharedFileMenuRow, { kind: "action" }>,
): string | undefined {
  if (row.fileShortcut === "open") return "Command+O";
  if (row.fileShortcut === "openNew") return "Command+Shift+O";
  if (row.fileShortcut === "save") return "Command+S";
  if (row.fileShortcut === "saveAs") return "Command+Shift+S";
  if (row.diffCopyShortcut) return "Command+Shift+D";
  return undefined;
}

export const HAMBURGER_MENU_TAIL_ROWS: readonly HamburgerTailRow[] = [
  { kind: "action", id: "guide", label: OPERATION_FORMAL.guide },
  { kind: "action", id: "shortcuts", label: OPERATION_FORMAL.shortcuts },
  { kind: "action", id: "checkForUpdates", label: OPERATION_FORMAL.checkForUpdates },
  { kind: "action", id: "settings", label: OPERATION_FORMAL.settings, menuShortcut: "settings" },
];

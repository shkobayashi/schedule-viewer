import type { CommandPaletteCommandId, CommandPaletteRunTarget } from "../model/commandPalette";
import type {
  HamburgerTailActionId,
  SharedFileMenuActionId,
} from "../model/appMenuStructure";
import type { GridTier } from "../model/timeline";

/** ☰ / macOS ファイルメニューで共有する dispatch 先。 */
export type FileMenuDispatchHandlers = {
  onOpen: () => void;
  onOpenInNewWindow: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onExportWorkspace?: () => void;
  onShowJson: () => void;
  onShowDiff: () => void;
  onCopyDiff: () => void;
};

/** ☰ 末尾（案内・ショートカット・更新・設定）。 */
export type HamburgerTailDispatchHandlers = {
  onOpenGuide: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onCheckForUpdates?: () => void;
};

/** コマンドパレットの dispatch 先（実行は App / hooks が提供）。 */
export type PaletteCommandDispatchHandlers = FileMenuDispatchHandlers &
  HamburgerTailDispatchHandlers & {
    onClearRecentHistory: () => void;
    onOpenRecent: (path: string) => void;
    onEditTitle: () => void;
    onFocusSearch: () => void;
    onToggleFilterPanel: () => void;
    onGoToday: () => void;
    onSetTier: (tier: GridTier) => void;
    onFit: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onAdjustDisplayScale: (direction: "in" | "out") => void;
    onFocusEditTask: () => void;
    onDeleteTask: () => void;
    onToggleLinkMode: () => void;
    onOpenTaskNote: (taskId: string) => void;
    onToggleLineage: () => void;
    onAddTask: () => void;
    onAddMilestone: () => void;
    onDuplicateTask: (taskId: string) => void;
    selectedTaskId: string | null;
  };

export function dispatchSharedFileMenuAction(
  id: SharedFileMenuActionId,
  handlers: FileMenuDispatchHandlers,
): void {
  switch (id) {
    case "open":
      handlers.onOpen();
      break;
    case "openNewWindow":
      handlers.onOpenInNewWindow();
      break;
    case "save":
      handlers.onSave();
      break;
    case "saveAs":
      handlers.onSaveAs();
      break;
    case "exportHtml":
      handlers.onExportHtml();
      break;
    case "exportWorkspace":
      handlers.onExportWorkspace?.();
      break;
    case "showJson":
      handlers.onShowJson();
      break;
    case "showDiff":
      handlers.onShowDiff();
      break;
    case "copyDiff":
      handlers.onCopyDiff();
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function dispatchHamburgerTailAction(
  id: HamburgerTailActionId,
  handlers: HamburgerTailDispatchHandlers,
): void {
  switch (id) {
    case "guide":
      handlers.onOpenGuide();
      break;
    case "shortcuts":
      handlers.onOpenShortcuts();
      break;
    case "settings":
      handlers.onOpenSettings();
      break;
    case "checkForUpdates":
      handlers.onCheckForUpdates?.();
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function dispatchCommandPaletteRunTarget(
  target: CommandPaletteRunTarget,
  handlers: PaletteCommandDispatchHandlers,
): void {
  if (target.type === "openRecent") {
    handlers.onOpenRecent(target.path);
    return;
  }
  dispatchPaletteCommandId(target.id, handlers);
}

export function dispatchPaletteCommandId(
  id: CommandPaletteCommandId,
  handlers: PaletteCommandDispatchHandlers,
): void {
  switch (id) {
    case "clearRecentHistory":
      handlers.onClearRecentHistory();
      break;
    case "editTitle":
      handlers.onEditTitle();
      break;
    case "open":
      handlers.onOpen();
      break;
    case "openNewWindow":
      handlers.onOpenInNewWindow();
      break;
    case "save":
      handlers.onSave();
      break;
    case "saveAs":
      handlers.onSaveAs();
      break;
    case "find":
      handlers.onFocusSearch();
      break;
    case "toggleFilterPanel":
      handlers.onToggleFilterPanel();
      break;
    case "showDiff":
      handlers.onShowDiff();
      break;
    case "copyDiff":
      handlers.onCopyDiff();
      break;
    case "showJson":
      handlers.onShowJson();
      break;
    case "export":
      handlers.onExportHtml();
      break;
    case "settings":
      handlers.onOpenSettings();
      break;
    case "guide":
      handlers.onOpenGuide();
      break;
    case "shortcuts":
      handlers.onOpenShortcuts();
      break;
    case "goToday":
      handlers.onGoToday();
      break;
    case "tierDay":
      handlers.onSetTier("day");
      break;
    case "tierWeek":
      handlers.onSetTier("week");
      break;
    case "tierMonth":
      handlers.onSetTier("month");
      break;
    case "fit":
      handlers.onFit();
      break;
    case "undo":
      handlers.onUndo();
      break;
    case "redo":
      handlers.onRedo();
      break;
    case "displayScaleIn":
      handlers.onAdjustDisplayScale("in");
      break;
    case "displayScaleOut":
      handlers.onAdjustDisplayScale("out");
      break;
    case "editTask":
      if (handlers.selectedTaskId == null) break;
      handlers.onFocusEditTask();
      break;
    case "deleteTask":
      handlers.onDeleteTask();
      break;
    case "link":
      handlers.onToggleLinkMode();
      break;
    case "note":
      if (handlers.selectedTaskId != null) {
        handlers.onOpenTaskNote(handlers.selectedTaskId);
      }
      break;
    case "lineage":
      handlers.onToggleLineage();
      break;
    case "addTask":
      handlers.onAddTask();
      break;
    case "addMilestone":
      handlers.onAddMilestone();
      break;
    case "duplicateTask":
      if (handlers.selectedTaskId != null) {
        handlers.onDuplicateTask(handlers.selectedTaskId);
      }
      break;
    case "checkForUpdates":
      handlers.onCheckForUpdates?.();
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** パレット ID が file メニュー action と同じ意味を持つ対応（export ↔ exportHtml）。 */
export const PALETTE_TO_FILE_MENU: Partial<
  Record<CommandPaletteCommandId, SharedFileMenuActionId>
> = {
  open: "open",
  openNewWindow: "openNewWindow",
  save: "save",
  saveAs: "saveAs",
  export: "exportHtml",
  showJson: "showJson",
  showDiff: "showDiff",
  copyDiff: "copyDiff",
};

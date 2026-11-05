import { describe, expect, it, vi } from "vitest";
import type { CommandPaletteCommandId } from "../model/commandPalette";
import { SHARED_FILE_MENU_ROWS, type SharedFileMenuActionId } from "../model/appMenuStructure";
import {
  dispatchPaletteCommandId,
  dispatchSharedFileMenuAction,
} from "./dispatchPaletteCommand";

const PALETTE_COMMAND_IDS: CommandPaletteCommandId[] = [
  "open",
  "clearRecentHistory",
  "openNewWindow",
  "save",
  "saveAs",
  "find",
  "toggleFilterPanel",
  "editTitle",
  "showDiff",
  "copyDiff",
  "showJson",
  "export",
  "settings",
  "guide",
  "shortcuts",
  "goToday",
  "tierDay",
  "tierWeek",
  "tierMonth",
  "fit",
  "undo",
  "redo",
  "displayScaleIn",
  "displayScaleOut",
  "editTask",
  "deleteTask",
  "link",
  "note",
  "lineage",
  "addTask",
  "addMilestone",
  "duplicateTask",
  "checkForUpdates",
];

function mockPaletteHandlers() {
  return {
    onOpen: vi.fn(),
    onOpenInNewWindow: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onExportHtml: vi.fn(),
    onExportWorkspace: vi.fn(),
    onShowJson: vi.fn(),
    onShowDiff: vi.fn(),
    onCopyDiff: vi.fn(),
    onClearRecentHistory: vi.fn(),
    onOpenRecent: vi.fn(),
    onEditTitle: vi.fn(),
    onFocusSearch: vi.fn(),
    onToggleFilterPanel: vi.fn(),
    onOpenGuide: vi.fn(),
    onOpenShortcuts: vi.fn(),
    onOpenSettings: vi.fn(),
    onCheckForUpdates: vi.fn(),
    onGoToday: vi.fn(),
    onSetTier: vi.fn(),
    onFit: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onAdjustDisplayScale: vi.fn(),
    onFocusEditTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onToggleLinkMode: vi.fn(),
    onOpenTaskNote: vi.fn(),
    onToggleLineage: vi.fn(),
    onAddTask: vi.fn(),
    onAddMilestone: vi.fn(),
    onDuplicateTask: vi.fn(),
    selectedTaskId: "task-1",
  };
}

describe("dispatchPaletteCommand", () => {
  it("dispatches every command palette id without throwing", () => {
    for (const id of PALETTE_COMMAND_IDS) {
      const handlers = mockPaletteHandlers();
      expect(() => dispatchPaletteCommandId(id, handlers)).not.toThrow();
    }
  });

  it("routes export palette command and exportHtml menu action the same way", () => {
    const paletteHandlers = mockPaletteHandlers();
    const fileHandlers = mockPaletteHandlers();
    dispatchPaletteCommandId("export", paletteHandlers);
    dispatchSharedFileMenuAction("exportHtml", fileHandlers);
    expect(paletteHandlers.onExportHtml).toHaveBeenCalledTimes(1);
    expect(fileHandlers.onExportHtml).toHaveBeenCalledTimes(1);
  });

  it("covers every shared file menu action id", () => {
    const ids = new Set<SharedFileMenuActionId>();
    for (const row of SHARED_FILE_MENU_ROWS) {
      if (row.kind === "action") ids.add(row.id);
    }
    for (const id of ids) {
      const handlers = mockPaletteHandlers();
      expect(() => dispatchSharedFileMenuAction(id, handlers)).not.toThrow();
    }
  });
});

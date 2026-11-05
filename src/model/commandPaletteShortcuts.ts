import type { CommandPaletteCommandId } from "./commandPalette";
import {
  addMilestoneShortcutHint,
  addTaskShortcutHint,
  deleteShortcutHint,
  diffCopyShortcutHint,
  editShortcutHint,
  fileShortcutHint,
  findShortcutHint,
  linkShortcutHint,
  noteShortcutHint,
  redoShortcutHint,
  undoShortcutHint,
} from "./shortcuts";

/** コマンドパレットの行右に出すショートカット（無いときは null）。 */
export function commandPaletteCommandShortcut(
  id: CommandPaletteCommandId,
  commandKey: boolean,
): string | null {
  switch (id) {
    case "open":
      return fileShortcutHint("open", commandKey);
    case "openNewWindow":
      return fileShortcutHint("openNew", commandKey);
    case "save":
      return fileShortcutHint("save", commandKey);
    case "saveAs":
      return fileShortcutHint("saveAs", commandKey);
    case "find":
      return findShortcutHint(commandKey);
    case "copyDiff":
      return diffCopyShortcutHint(commandKey);
    case "undo":
      return undoShortcutHint(commandKey);
    case "redo":
      return redoShortcutHint(commandKey);
    case "link":
      return linkShortcutHint(commandKey);
    case "note":
      return noteShortcutHint(commandKey);
    case "editTask":
      return editShortcutHint();
    case "deleteTask":
      return deleteShortcutHint();
    case "addTask":
      return addTaskShortcutHint(commandKey);
    case "addMilestone":
      return addMilestoneShortcutHint(commandKey);
    default:
      return null;
  }
}

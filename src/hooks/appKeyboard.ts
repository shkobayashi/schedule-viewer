import type { ChartPointer } from "../model/chartHitTest";
import {
  blocksBrowserShortcut,
  blocksEditShortcut,
  blocksLinkShortcut,
  chartScrollOffset,
  matchAppShortcut,
  matchChartScroll,
  matchDisplayScale,
  matchDiffCopy,
  matchMacAppQuit,
  matchOpenCommandPalette,
  matchOpenShortcutsHelp,
  type DisplayScaleDirection,
  type ShortcutKeyEvent,
} from "../model/shortcuts";
import type { ScheduleId } from "../model/types";

export type AppKeyTarget = {
  tagName: string;
  isContentEditable: boolean;
} | null;

export type AppKeyAction =
  | { type: "scroll"; x: number; y: number }
  | { type: "clearLink" }
  | { type: "toggleLink" }
  | { type: "note" }
  | { type: "edit" }
  | { type: "focusDetailName" }
  | { type: "selectTaskPrev" }
  | { type: "selectTaskNext" }
  | { type: "shiftTaskDates"; deltaDays: number }
  | { type: "shiftTaskEnd"; deltaDays: number }
  | { type: "deleteLink"; fromId: ScheduleId; toId: ScheduleId }
  | { type: "deleteTask" }
  | { type: "save" }
  | { type: "saveAs" }
  | { type: "open" }
  | { type: "find" }
  | { type: "openDiffCopy" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "displayScale"; direction: DisplayScaleDirection }
  | { type: "openShortcuts" }
  | { type: "openCommandPalette" }
  | { type: "closeCommandPalette" }
  | { type: "closeWindow" }
  | { type: "none" };

export type AppKeyDecision = {
  preventDefault: boolean;
  closeMenu: boolean;
  action: AppKeyAction;
};

export function allowsDocumentUndo(input: {
  dialogOpen: boolean;
  target: AppKeyTarget;
}): boolean {
  if (input.dialogOpen) return false;
  if (input.target == null) return true;
  if (input.target.isContentEditable) return false;
  const tag = input.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  return true;
}

export function decideAppKey(input: {
  event: ShortcutKeyEvent & { repeat: boolean };
  dialogOpen: boolean;
  commandPaletteOpen: boolean;
  macAppQuit: boolean;
  menuOpen: boolean;
  target: AppKeyTarget;
  linkSourceId: ScheduleId | null;
  fileBusy: boolean;
  pointer: ChartPointer;
  selectedTaskId: ScheduleId | null;
  rowHeight: number;
  findTargetsName: boolean;
}): AppKeyDecision {
  const { event } = input;
  const targetFields = input.target ?? {
    tagName: "",
    isContentEditable: false,
  };
  const blocksEditKeys = input.target != null && blocksEditShortcut(targetFields);
  const blocksLinkKeys = input.target != null && blocksLinkShortcut(targetFields);
  const paletteToggle = matchOpenCommandPalette(event, {
    dialogOpen: input.dialogOpen,
    commandPaletteOpen: input.commandPaletteOpen,
  });
  if (paletteToggle === "open") {
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "openCommandPalette" },
    };
  }
  if (paletteToggle === "close") {
    return {
      preventDefault: true,
      closeMenu: false,
      action: { type: "closeCommandPalette" },
    };
  }
  if (input.commandPaletteOpen) {
    return { preventDefault: false, closeMenu: false, action: { type: "none" } };
  }
  if (
    input.macAppQuit &&
    matchMacAppQuit(event, {
      dialogOpen: input.dialogOpen,
      commandPaletteOpen: input.commandPaletteOpen,
    })
  ) {
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "closeWindow" },
    };
  }
  if (
    matchOpenShortcutsHelp(event, {
      dialogOpen: input.dialogOpen,
      blocksEditKeys,
    })
  ) {
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "openShortcuts" },
    };
  }
  if (
    !input.dialogOpen &&
    !event.ctrlKey &&
    !event.metaKey &&
    !blocksEditShortcut(
      input.target ?? { tagName: "", isContentEditable: false },
    )
  ) {
    if (event.altKey && !event.repeat) {
      const delta =
        event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (delta !== 0 && input.selectedTaskId != null) {
        if (event.shiftKey) {
          return {
            preventDefault: true,
            closeMenu: true,
            action: { type: "shiftTaskEnd", deltaDays: delta },
          };
        }
        return {
          preventDefault: true,
          closeMenu: true,
          action: { type: "shiftTaskDates", deltaDays: delta },
        };
      }
    }
    if (
      !event.altKey &&
      !event.shiftKey &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      return {
        preventDefault: true,
        closeMenu: true,
        action: {
          type: event.key === "ArrowUp" ? "selectTaskPrev" : "selectTaskNext",
        },
      };
    }
  }

  const chartScroll = matchChartScroll(event, { dialogOpen: input.dialogOpen });
  if (chartScroll) {
    const offset = chartScrollOffset(chartScroll, input.rowHeight);
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "scroll", x: offset.x, y: offset.y },
    };
  }

  if (matchDiffCopy(event, { dialogOpen: input.dialogOpen, fileBusy: input.fileBusy })) {
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "openDiffCopy" },
    };
  }

  const displayScale = matchDisplayScale(event);
  if (displayScale) {
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "displayScale", direction: displayScale },
    };
  }

  let preventDefault = blocksBrowserShortcut(event);
  if (
    event.key === "Escape" &&
    !input.dialogOpen &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  ) {
    if (input.menuOpen) {
      return { preventDefault, closeMenu: false, action: { type: "none" } };
    }
    if (input.linkSourceId != null) {
      return {
        preventDefault: true,
        closeMenu: false,
        action: { type: "clearLink" },
      };
    }
    return { preventDefault, closeMenu: false, action: { type: "none" } };
  }

  const shortcut = matchAppShortcut(event, {
    dialogOpen: input.dialogOpen,
    blocksEditKeys,
    blocksLinkKeys,
  });
  if (shortcut === "find" && !input.findTargetsName) {
    return { preventDefault: false, closeMenu: false, action: { type: "none" } };
  }
  if (shortcut) {
    preventDefault = true;
    if (event.repeat) {
      return { preventDefault, closeMenu: true, action: { type: "none" } };
    }
    if (shortcut === "note") {
      if (input.linkSourceId != null || input.selectedTaskId == null) {
        return { preventDefault, closeMenu: true, action: { type: "none" } };
      }
      return { preventDefault, closeMenu: true, action: { type: "note" } };
    }
    if (shortcut === "link") {
      return { preventDefault, closeMenu: true, action: { type: "toggleLink" } };
    }
    if (shortcut === "edit") {
      if (input.linkSourceId != null) {
        return { preventDefault, closeMenu: true, action: { type: "none" } };
      }
      return {
        preventDefault,
        closeMenu: true,
        action: { type: "focusDetailName" },
      };
    }
    if (shortcut === "delete") {
      const hovered = input.pointer.link;
      if (hovered && !input.pointer.overTask && !input.pointer.overMilestone) {
        return {
          preventDefault,
          closeMenu: true,
          action: {
            type: "deleteLink",
            fromId: hovered.fromId,
            toId: hovered.toId,
          },
        };
      }
      if (input.selectedTaskId != null) {
        return { preventDefault, closeMenu: true, action: { type: "deleteTask" } };
      }
      return { preventDefault, closeMenu: true, action: { type: "none" } };
    }
    if (input.fileBusy && shortcut !== "find") {
      return { preventDefault, closeMenu: true, action: { type: "none" } };
    }
    if (shortcut === "save") {
      return { preventDefault, closeMenu: true, action: { type: "save" } };
    }
    if (shortcut === "saveAs") {
      return { preventDefault, closeMenu: true, action: { type: "saveAs" } };
    }
    if (shortcut === "open") {
      return { preventDefault, closeMenu: true, action: { type: "open" } };
    }
    return { preventDefault, closeMenu: true, action: { type: "find" } };
  }

  if (!allowsDocumentUndo({ dialogOpen: input.dialogOpen, target: input.target })) {
    return { preventDefault, closeMenu: false, action: { type: "none" } };
  }
  const mod = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  if (key === "z" && mod && !event.altKey) {
    return {
      preventDefault: true,
      closeMenu: false,
      action: { type: event.shiftKey ? "redo" : "undo" },
    };
  }
  if (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    return { preventDefault: true, closeMenu: false, action: { type: "redo" } };
  }
  return { preventDefault, closeMenu: false, action: { type: "none" } };
}

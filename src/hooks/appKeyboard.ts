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
  matchAddMilestoneShortcut,
  matchAddTaskShortcut,
  matchDuplicateTaskShortcut,
  matchOpenCommandPalette,
  matchOpenShortcutsHelp,
  matchReorderTaskShortcut,
  type DisplayScaleDirection,
  type ReorderTaskDirection,
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
  | { type: "selectTaskPrevExtend" }
  | { type: "selectTaskNextExtend" }
  | { type: "shiftTaskDates"; deltaDays: number }
  | { type: "shiftTaskEnd"; deltaDays: number }
  | { type: "deleteLink"; fromId: ScheduleId; toId: ScheduleId }
  | { type: "deleteTask" }
  | { type: "save" }
  | { type: "saveAs" }
  | { type: "open" }
  | { type: "openNewWindow" }
  | { type: "find" }
  | { type: "openDiffCopy" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "displayScale"; direction: DisplayScaleDirection }
  | { type: "openShortcuts" }
  | { type: "openCommandPalette" }
  | { type: "closeCommandPalette" }
  | { type: "closeWindow" }
  | { type: "quitApplication" }
  | { type: "addTask" }
  | { type: "addMilestone" }
  | { type: "duplicateTask" }
  | { type: "reorderTaskInGroup"; direction: ReorderTaskDirection; insertIndex: number }
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
  isTauriDesktop: boolean;
  menuOpen: boolean;
  target: AppKeyTarget;
  linkSourceId: ScheduleId | null;
  fileBusy: boolean;
  pointer: ChartPointer;
  selectedTaskId: ScheduleId | null;
  selectedTaskCount: number;
  rowHeight: number;
  startupSettled: boolean;
  canReorderInGroup: boolean;
  taskIndexInGroup: number | null;
  groupTaskCount: number;
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
      action: { type: "quitApplication" },
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
      if (delta !== 0 && input.selectedTaskCount > 0) {
        if (event.shiftKey) {
          if (input.selectedTaskId == null) {
            return { preventDefault: true, closeMenu: true, action: { type: "none" } };
          }
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
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      const extend = event.shiftKey;
      const up = event.key === "ArrowUp";
      return {
        preventDefault: true,
        closeMenu: true,
        action: {
          type: extend
            ? up
              ? "selectTaskPrevExtend"
              : "selectTaskNextExtend"
            : up
              ? "selectTaskPrev"
              : "selectTaskNext",
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

  const workflowContext = {
    dialogOpen: input.dialogOpen,
    blocksLinkKeys,
  };
  const workflowKeyContext = {
    dialogOpen: false,
    blocksLinkKeys,
  };
  const reorderKey = matchReorderTaskShortcut(event, workflowKeyContext);
  const isWorkflowShortcutKey =
    reorderKey != null ||
    matchAddTaskShortcut(event, workflowKeyContext) ||
    matchAddMilestoneShortcut(event, workflowKeyContext) ||
    matchDuplicateTaskShortcut(event, workflowKeyContext);
  if (
    isWorkflowShortcutKey &&
    !blocksLinkKeys &&
    (input.dialogOpen || input.linkSourceId != null)
  ) {
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "none" },
    };
  }
  if (!input.dialogOpen && input.linkSourceId == null) {
    const reorderDir = matchReorderTaskShortcut(event, workflowContext);
    if (reorderDir != null) {
      const preventReorder = true;
      if (event.repeat) {
        return {
          preventDefault: preventReorder,
          closeMenu: true,
          action: { type: "none" },
        };
      }
      if (
        !input.startupSettled ||
        input.selectedTaskId == null ||
        !input.canReorderInGroup ||
        input.taskIndexInGroup == null
      ) {
        return {
          preventDefault: preventReorder,
          closeMenu: true,
          action: { type: "none" },
        };
      }
      const current = input.taskIndexInGroup;
      const insertIndex =
        reorderDir === "up" ? current - 1 : current + 1;
      if (insertIndex < 0 || insertIndex >= input.groupTaskCount) {
        return {
          preventDefault: preventReorder,
          closeMenu: true,
          action: { type: "none" },
        };
      }
      return {
        preventDefault: preventReorder,
        closeMenu: true,
        action: {
          type: "reorderTaskInGroup",
          direction: reorderDir,
          insertIndex,
        },
      };
    }

    const opensDialog =
      matchAddTaskShortcut(event, workflowContext) ||
      matchAddMilestoneShortcut(event, workflowContext) ||
      matchDuplicateTaskShortcut(event, workflowContext);
    if (opensDialog) {
      const preventDialog = true;
      if (event.repeat) {
        return {
          preventDefault: preventDialog,
          closeMenu: true,
          action: { type: "none" },
        };
      }
      if (matchAddTaskShortcut(event, workflowContext)) {
        return {
          preventDefault: preventDialog,
          closeMenu: true,
          action: { type: "addTask" },
        };
      }
      if (matchAddMilestoneShortcut(event, workflowContext)) {
        return {
          preventDefault: preventDialog,
          closeMenu: true,
          action: { type: "addMilestone" },
        };
      }
      if (input.selectedTaskId == null) {
        return {
          preventDefault: preventDialog,
          closeMenu: true,
          action: { type: "none" },
        };
      }
      return {
        preventDefault: preventDialog,
        closeMenu: true,
        action: { type: "duplicateTask" },
      };
    }
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
      if (input.selectedTaskCount > 0) {
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
    if (shortcut === "openNew") {
      if (!input.isTauriDesktop) {
        return { preventDefault: false, closeMenu: true, action: { type: "none" } };
      }
      return { preventDefault, closeMenu: true, action: { type: "openNewWindow" } };
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

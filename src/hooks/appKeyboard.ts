import type { ChartPointer } from "../model/chartHitTest";
import {
  blocksBrowserShortcut,
  blocksEditShortcut,
  blocksLinkShortcut,
  chartScrollOffset,
  matchAppShortcut,
  matchChartScroll,
  matchDisplayScale,
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
  | { type: "deleteLink"; fromId: ScheduleId; toId: ScheduleId }
  | { type: "deleteTask" }
  | { type: "save" }
  | { type: "saveAs" }
  | { type: "open" }
  | { type: "find" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "displayScale"; direction: DisplayScaleDirection }
  | { type: "openShortcuts" }
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
  const chartScroll = matchChartScroll(event, { dialogOpen: input.dialogOpen });
  if (chartScroll) {
    const offset = chartScrollOffset(chartScroll, input.rowHeight);
    return {
      preventDefault: true,
      closeMenu: true,
      action: { type: "scroll", x: offset.x, y: offset.y },
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
      return { preventDefault, closeMenu: true, action: { type: "edit" } };
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

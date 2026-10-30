import { useEffect, type MutableRefObject } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { requestApplicationQuitViaTauri } from "../model/windowSession";
import { decideAppKey, type AppKeyTarget } from "./appKeyboard";
import type { ChartPointer } from "../model/chartHitTest";
import { canReorderTaskInGroup, taskIndexInGroup } from "../model/taskOrder";
import { findTaskOwner } from "../model/tasks";
import type { Category, ScheduleId, VisibleRow } from "../model/types";
import {
  resolveUiScale,
  stepDisplayScale,
  writeDisplayScalePreference,
  type DisplayScalePreference,
} from "../model/uiScale";

type UseAppKeyboardOptions = {
  rowHeight: number;
  scrollBy: (x: number, y: number) => void;
  fileBusy: boolean;
  save: (saveAs: boolean) => void;
  requestOpen: () => void;
  requestOpenInNewWindow: () => void;
  categories: Category[];
  selectedTaskId: ScheduleId | null;
  selectedTaskIds: readonly ScheduleId[];
  linkSourceId: ScheduleId | null;
  startupSettled: boolean;
  toggleLinkMode: () => void;
  openTaskNote: (taskId: ScheduleId) => void;
  clearLinkMode: () => void;
  removePredecessorLink: (fromId: ScheduleId, toId: ScheduleId) => void;
  removeTaskConnection: (a: ScheduleId, b: ScheduleId) => void;
  chartPointerRef: { current: ChartPointer };
  closeFloatingMenus: () => void;
  requestDeleteTask: () => void;
  undo: () => void;
  redo: () => void;
  taskSearchRef: { current: HTMLInputElement | null };
  displayScalePreferenceRef: MutableRefObject<DisplayScalePreference>;
  uiScaleRef: MutableRefObject<number>;
  onDisplayScaleChange: (preference: DisplayScalePreference) => void;
  onOpenShortcuts: () => void;
  visibleRows: VisibleRow[];
  selectTask: (taskId: ScheduleId) => void;
  navigateTaskSelection: (
    rows: VisibleRow[],
    direction: "prev" | "next",
    extend: boolean,
    onAfter?: (activeId: ScheduleId | null) => void,
  ) => void;
  moveTaskByDays: (taskId: ScheduleId, deltaDays: number) => void;
  moveSelectedTasksByDays: (taskIds: readonly ScheduleId[], deltaDays: number) => void;
  shiftTaskEndByDays: (taskId: ScheduleId, deltaDays: number) => void;
  focusDetailName: () => void;
  revealTaskRow: (taskId: ScheduleId) => void;
  copyScheduleDiff: () => void;
  commandPaletteOpen: boolean;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
  onAddTask: () => void;
  onAddMilestone: () => void;
  onDuplicateTask: (taskId: ScheduleId) => void;
  commitTaskReorder: (
    taskId: ScheduleId,
    targetGroupId: ScheduleId,
    insertIndex: number,
  ) => void;
};

function groupTaskCount(categories: Category[], groupId: ScheduleId): number {
  for (const category of categories) {
    for (const group of category.groups) {
      if (group.id === groupId) return group.tasks.length;
    }
  }
  return 0;
}

export function useAppKeyboard({
  rowHeight,
  scrollBy,
  fileBusy,
  save,
  requestOpen,
  requestOpenInNewWindow,
  categories,
  selectedTaskId,
  selectedTaskIds,
  linkSourceId,
  startupSettled,
  toggleLinkMode,
  openTaskNote,
  clearLinkMode,
  removePredecessorLink,
  removeTaskConnection,
  chartPointerRef,
  closeFloatingMenus,
  requestDeleteTask,
  undo,
  redo,
  taskSearchRef,
  displayScalePreferenceRef,
  uiScaleRef,
  onDisplayScaleChange,
  onOpenShortcuts,
  commandPaletteOpen,
  onOpenCommandPalette,
  onCloseCommandPalette,
  visibleRows,
  selectTask,
  navigateTaskSelection,
  moveTaskByDays,
  moveSelectedTasksByDays,
  shiftTaskEndByDays,
  focusDetailName,
  revealTaskRow,
  copyScheduleDiff,
  onAddTask,
  onAddMilestone,
  onDuplicateTask,
  commitTaskReorder,
}: UseAppKeyboardOptions) {
  useEffect(() => {
    const macAppQuit =
      isTauri() && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    const onKeyDown = (event: KeyboardEvent) => {
      const targetElement =
        event.target instanceof HTMLElement ? event.target : null;
      const target: AppKeyTarget =
        targetElement != null
          ? {
              tagName: targetElement.tagName,
              isContentEditable: targetElement.isContentEditable,
            }
          : null;
      const diffStripListFocused =
        targetElement?.closest(".diff-strip-list") != null;
      const owner =
        selectedTaskId != null
          ? findTaskOwner(categories, selectedTaskId)
          : null;
      const taskIndex =
        selectedTaskId != null
          ? taskIndexInGroup(categories, selectedTaskId)
          : null;
      const groupCount =
        owner != null ? groupTaskCount(categories, owner.groupId) : 0;
      const canReorderInGroup =
        selectedTaskId != null &&
        canReorderTaskInGroup(categories, selectedTaskId, visibleRows);
      const decision = decideAppKey({
        event: {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          repeat: event.repeat,
        },
        dialogOpen: document.querySelector('[role="dialog"]') != null,
        commandPaletteOpen,
        macAppQuit,
        isTauriDesktop: isTauri(),
        menuOpen: document.querySelector('[role="menu"]') != null,
        target,
        linkSourceId,
        fileBusy,
        pointer: chartPointerRef.current,
        selectedTaskId,
        selectedTaskCount: selectedTaskIds.length,
        rowHeight,
        startupSettled,
        canReorderInGroup,
        taskIndexInGroup: taskIndex,
        groupTaskCount: groupCount,
        diffStripListFocused,
      });
      if (decision.preventDefault) event.preventDefault();
      if (decision.closeMenu) closeFloatingMenus();
      const action = decision.action;
      if (action.type === "scroll") {
        scrollBy(action.x, action.y);
        return;
      }
      if (action.type === "displayScale") {
        const next = stepDisplayScale(
          displayScalePreferenceRef.current,
          uiScaleRef.current,
          action.direction,
        );
        if (next != null) {
          displayScalePreferenceRef.current = next;
          uiScaleRef.current = resolveUiScale(
            window.innerWidth,
            window.innerHeight,
            next,
          );
          writeDisplayScalePreference(next);
          onDisplayScaleChange(next);
        }
        return;
      }
      if (action.type === "clearLink") {
        clearLinkMode();
        return;
      }
      if (action.type === "toggleLink") {
        toggleLinkMode();
        return;
      }
      if (action.type === "note") {
        if (selectedTaskId != null) openTaskNote(selectedTaskId);
        return;
      }
      if (action.type === "focusDetailName") {
        if (selectedTaskId == null) return;
        focusDetailName();
        return;
      }
      if (action.type === "selectTaskPrev" || action.type === "selectTaskNext") {
        const direction = action.type === "selectTaskPrev" ? "prev" : "next";
        navigateTaskSelection(visibleRows, direction, false, (activeId) => {
          if (activeId != null) revealTaskRow(activeId);
        });
        return;
      }
      if (
        action.type === "selectTaskPrevExtend" ||
        action.type === "selectTaskNextExtend"
      ) {
        const direction =
          action.type === "selectTaskPrevExtend" ? "prev" : "next";
        navigateTaskSelection(visibleRows, direction, true, (activeId) => {
          if (activeId != null) revealTaskRow(activeId);
        });
        return;
      }
      if (action.type === "shiftTaskDates") {
        if (selectedTaskIds.length > 1) {
          moveSelectedTasksByDays(selectedTaskIds, action.deltaDays);
        } else if (selectedTaskId != null) {
          moveTaskByDays(selectedTaskId, action.deltaDays);
        }
        return;
      }
      if (action.type === "shiftTaskEnd") {
        if (selectedTaskId != null) {
          shiftTaskEndByDays(selectedTaskId, action.deltaDays);
        }
        return;
      }
      if (action.type === "deleteLink") {
        if (action.kind === "connection") {
          removeTaskConnection(action.fromId, action.toId);
        } else {
          removePredecessorLink(action.fromId, action.toId);
        }
        return;
      }
      if (action.type === "deleteTask") {
        requestDeleteTask();
        return;
      }
      if (action.type === "addTask") {
        onAddTask();
        return;
      }
      if (action.type === "addMilestone") {
        onAddMilestone();
        return;
      }
      if (action.type === "duplicateTask") {
        if (selectedTaskId != null) onDuplicateTask(selectedTaskId);
        return;
      }
      if (action.type === "reorderTaskInGroup") {
        if (selectedTaskId == null || owner == null) return;
        commitTaskReorder(
          selectedTaskId,
          owner.groupId,
          action.insertIndex,
        );
        return;
      }
      if (action.type === "save") void save(false);
      else if (action.type === "saveAs") void save(true);
      else if (action.type === "open") requestOpen();
      else if (action.type === "openNewWindow") requestOpenInNewWindow();
      else if (action.type === "find") {
        taskSearchRef.current?.focus();
        taskSearchRef.current?.select();
      } else if (action.type === "undo") undo();
      else if (action.type === "redo") redo();
      else if (action.type === "openShortcuts") onOpenShortcuts();
      else if (action.type === "openCommandPalette") onOpenCommandPalette();
      else if (action.type === "closeCommandPalette") onCloseCommandPalette();
      else if (action.type === "closeWindow") void getCurrentWindow().close();
      else if (action.type === "quitApplication") {
        void requestApplicationQuitViaTauri();
      } else if (action.type === "openDiffCopy") copyScheduleDiff();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    categories,
    chartPointerRef,
    clearLinkMode,
    closeFloatingMenus,
    commitTaskReorder,
    fileBusy,
    linkSourceId,
    onAddMilestone,
    onAddTask,
    onDuplicateTask,
    redo,
    removePredecessorLink,
    removeTaskConnection,
    requestDeleteTask,
    requestOpen,
    requestOpenInNewWindow,
    rowHeight,
    save,
    scrollBy,
    selectedTaskId,
    selectedTaskIds,
    startupSettled,
    taskSearchRef,
    openTaskNote,
    toggleLinkMode,
    undo,
    displayScalePreferenceRef,
    uiScaleRef,
    onDisplayScaleChange,
    onOpenShortcuts,
    commandPaletteOpen,
    onOpenCommandPalette,
    onCloseCommandPalette,
    visibleRows,
    selectTask,
    navigateTaskSelection,
    moveTaskByDays,
    moveSelectedTasksByDays,
    shiftTaskEndByDays,
    focusDetailName,
    revealTaskRow,
    copyScheduleDiff,
  ]);
}

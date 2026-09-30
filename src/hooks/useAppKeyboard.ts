import { useEffect } from "react";
import { decideAppKey, type AppKeyTarget } from "./appKeyboard";
import type { ChartPointer } from "../model/chartHitTest";
import { findTaskById } from "../model/rows";
import type { Category, ScheduleId, Task } from "../model/types";

type UseAppKeyboardOptions = {
  rowHeight: number;
  scrollBy: (x: number, y: number) => void;
  fileBusy: boolean;
  save: (saveAs: boolean) => void;
  requestOpen: () => void;
  categories: Category[];
  selectedTaskId: ScheduleId | null;
  openEditDialog: (task: Task) => void;
  linkSourceId: ScheduleId | null;
  toggleLinkMode: () => void;
  clearLinkMode: () => void;
  removePredecessorLink: (fromId: ScheduleId, toId: ScheduleId) => void;
  chartPointerRef: { current: ChartPointer };
  closeContextMenu: () => void;
  requestDeleteTask: () => void;
  undo: () => void;
  redo: () => void;
  taskSearchRef: { current: HTMLInputElement | null };
};

export function useAppKeyboard({
  rowHeight,
  scrollBy,
  fileBusy,
  save,
  requestOpen,
  categories,
  selectedTaskId,
  openEditDialog,
  linkSourceId,
  toggleLinkMode,
  clearLinkMode,
  removePredecessorLink,
  chartPointerRef,
  closeContextMenu,
  requestDeleteTask,
  undo,
  redo,
  taskSearchRef,
}: UseAppKeyboardOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target: AppKeyTarget =
        event.target instanceof HTMLElement
          ? {
              tagName: event.target.tagName,
              isContentEditable: event.target.isContentEditable,
            }
          : null;
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
        menuOpen: document.querySelector('[role="menu"]') != null,
        target,
        linkSourceId,
        fileBusy,
        pointer: chartPointerRef.current,
        selectedTaskId,
        rowHeight,
      });
      if (decision.preventDefault) event.preventDefault();
      if (decision.closeMenu) closeContextMenu();
      const action = decision.action;
      if (action.type === "scroll") {
        scrollBy(action.x, action.y);
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
      if (action.type === "edit") {
        const task =
          selectedTaskId == null ? null : findTaskById(categories, selectedTaskId);
        if (task) openEditDialog(task);
        return;
      }
      if (action.type === "deleteLink") {
        removePredecessorLink(action.fromId, action.toId);
        return;
      }
      if (action.type === "deleteTask") {
        requestDeleteTask();
        return;
      }
      if (action.type === "save") void save(false);
      else if (action.type === "saveAs") void save(true);
      else if (action.type === "open") requestOpen();
      else if (action.type === "find") {
        taskSearchRef.current?.focus();
        taskSearchRef.current?.select();
      } else if (action.type === "undo") undo();
      else if (action.type === "redo") redo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    categories,
    chartPointerRef,
    clearLinkMode,
    closeContextMenu,
    fileBusy,
    linkSourceId,
    openEditDialog,
    redo,
    removePredecessorLink,
    requestDeleteTask,
    requestOpen,
    rowHeight,
    save,
    scrollBy,
    selectedTaskId,
    taskSearchRef,
    toggleLinkMode,
    undo,
  ]);
}

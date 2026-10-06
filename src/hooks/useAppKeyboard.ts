import { useEffect, type MutableRefObject } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { requestApplicationQuitViaTauri } from "../model/windowSession";
import { decideAppKey, type AppKeyTarget } from "./appKeyboard";
import type { ChartPointer } from "../model/chartHitTest";
import { adjacentVisibleTaskId } from "../model/taskSelection";
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
  linkSourceId: ScheduleId | null;
  toggleLinkMode: () => void;
  openTaskNote: (taskId: ScheduleId) => void;
  clearLinkMode: () => void;
  removePredecessorLink: (fromId: ScheduleId, toId: ScheduleId) => void;
  chartPointerRef: { current: ChartPointer };
  closeContextMenu: () => void;
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
  moveTaskByDays: (taskId: ScheduleId, deltaDays: number) => void;
  shiftTaskEndByDays: (taskId: ScheduleId, deltaDays: number) => void;
  focusDetailName: () => void;
  copyScheduleDiff: () => void;
  commandPaletteOpen: boolean;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
};

export function useAppKeyboard({
  rowHeight,
  scrollBy,
  fileBusy,
  save,
  requestOpen,
  requestOpenInNewWindow,
  categories,
  selectedTaskId,
  linkSourceId,
  toggleLinkMode,
  openTaskNote,
  clearLinkMode,
  removePredecessorLink,
  chartPointerRef,
  closeContextMenu,
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
  moveTaskByDays,
  shiftTaskEndByDays,
  focusDetailName,
  copyScheduleDiff,
}: UseAppKeyboardOptions) {
  useEffect(() => {
    const macAppQuit =
      isTauri() && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
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
        commandPaletteOpen,
        macAppQuit,
        isTauriDesktop: isTauri(),
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
        const next = adjacentVisibleTaskId(
          visibleRows,
          selectedTaskId,
          action.type === "selectTaskPrev" ? "prev" : "next",
        );
        if (next != null) selectTask(next);
        return;
      }
      if (action.type === "shiftTaskDates") {
        if (selectedTaskId != null) {
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
      }
      else if (action.type === "openDiffCopy") copyScheduleDiff();
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
    redo,
    removePredecessorLink,
    requestDeleteTask,
    requestOpen,
    requestOpenInNewWindow,
    rowHeight,
    save,
    scrollBy,
    selectedTaskId,
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
    moveTaskByDays,
    shiftTaskEndByDays,
    focusDetailName,
    copyScheduleDiff,
  ]);
}

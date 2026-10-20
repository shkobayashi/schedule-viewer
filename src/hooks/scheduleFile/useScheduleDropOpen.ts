import { useCallback, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "../../model/scheduleFile";
import {
  canAcceptScheduleDrop,
  type ScheduleDropGateInput,
} from "../../model/droppedScheduleOpenGate";
import {
  DROP_SCHEDULE_INVALID_SELECTION,
  DROP_SCHEDULE_UI_BUSY,
} from "../../model/droppedScheduleMessages";
import { resolveScheduleExternalDrop } from "../../model/droppedScheduleExternalDispatch";
import { classifyDroppedSchedulePaths } from "../../model/droppedSchedulePaths";
import { routeExternalScheduleDrop } from "../../model/droppedScheduleOpenRoute";
import {
  ackExternalScheduleDropViaTauri,
  focusScheduleWindowViaTauri,
  forwardScheduleExternalDropViaTauri,
  readOpenWindowsSnapshotViaTauri,
} from "../../model/windowSession";

export type ScheduleDropOpenHandlers = {
  beginOpenFromDroppedPath: (path: string) => void;
  openDroppedScheduleInNewWindow: (path: string, contents: string) => Promise<void>;
  setDropErrorMessage: (message: string) => void;
  readAndValidateDroppedPath: (
    path: string,
  ) => Promise<{ ok: true; contents: string } | { ok: false; message: string }>;
};

export type UseScheduleDropOpenOptions = {
  dropGate: ScheduleDropGateInput;
  handlers: ScheduleDropOpenHandlers;
};

function domModalDialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') != null;
}

function effectiveDropGate(gate: ScheduleDropGateInput): ScheduleDropGateInput {
  return {
    ...gate,
    dialogOpen: gate.dialogOpen || domModalDialogOpen(),
  };
}

export function useScheduleDropOpen({
  dropGate,
  handlers,
}: UseScheduleDropOpenOptions) {
  const dropGateRef = useRef(dropGate);
  dropGateRef.current = dropGate;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const processingExternalRef = useRef(false);

  const processExternalPaths = useCallback(
    async (
      paths: string[],
      options: { directOpenInThisWindow: boolean; shouldAck: boolean },
    ) => {
      if (processingExternalRef.current) return;
      processingExternalRef.current = true;
      try {
        const resolution = resolveScheduleExternalDrop(
          dropGateRef.current,
          paths,
          domModalDialogOpen(),
        );
        if (resolution.action === "blocked") {
          handlersRef.current.setDropErrorMessage(resolution.message);
          if (options.shouldAck) {
            await ackExternalScheduleDropViaTauri();
          }
          return;
        }
        if (resolution.action === "invalid") {
          handlersRef.current.setDropErrorMessage(resolution.message);
          if (options.shouldAck) {
            await ackExternalScheduleDropViaTauri();
          }
          return;
        }

        const readResult = await handlersRef.current.readAndValidateDroppedPath(
          resolution.path,
        );
        if (!readResult.ok) {
          handlersRef.current.setDropErrorMessage(readResult.message);
          if (options.shouldAck) {
            await ackExternalScheduleDropViaTauri();
          }
          return;
        }

        if (options.directOpenInThisWindow) {
          handlersRef.current.beginOpenFromDroppedPath(resolution.path);
          return;
        }

        const snapshot = await readOpenWindowsSnapshotViaTauri();
        const selfLabel = getCurrentWindow().label;
        const route = routeExternalScheduleDrop(
          resolution.path,
          snapshot.windows,
          snapshot.focusOrder,
        );

        if (route.action === "focusExisting") {
          await focusScheduleWindowViaTauri(route.label);
          if (options.shouldAck) {
            await ackExternalScheduleDropViaTauri();
          }
          return;
        }

        if (route.action === "openNewWindow") {
          await handlersRef.current.openDroppedScheduleInNewWindow(
            resolution.path,
            readResult.contents,
          );
          if (options.shouldAck) {
            await ackExternalScheduleDropViaTauri();
          }
          return;
        }

        if (route.label === selfLabel) {
          handlersRef.current.beginOpenFromDroppedPath(resolution.path);
        } else {
          await forwardScheduleExternalDropViaTauri(route.label, paths);
        }
        if (options.shouldAck) {
          await ackExternalScheduleDropViaTauri();
        }
      } finally {
        processingExternalRef.current = false;
      }
    },
    [],
  );

  const handleWindowDrop = useCallback(async (paths: string[]) => {
    const gate = effectiveDropGate(dropGateRef.current);
    if (!canAcceptScheduleDrop(gate)) {
      handlersRef.current.setDropErrorMessage(DROP_SCHEDULE_UI_BUSY);
      return;
    }
    const classification = classifyDroppedSchedulePaths(paths);
    if (classification.kind === "invalidSelection") {
      handlersRef.current.setDropErrorMessage(DROP_SCHEDULE_INVALID_SELECTION);
      return;
    }
    handlersRef.current.beginOpenFromDroppedPath(classification.path);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenDrop: (() => void) | undefined;
    let unlistenExternal: (() => void) | undefined;
    let unlistenTarget: (() => void) | undefined;
    let cancelled = false;
    void getCurrentWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          void handleWindowDrop(event.payload.paths);
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlistenDrop = fn;
      });
    void listen<string[]>("schedule-external-drop", (event) => {
      void processExternalPaths(event.payload, {
        directOpenInThisWindow: false,
        shouldAck: true,
      });
    }).then((fn) => {
      if (cancelled) fn();
      else unlistenExternal = fn;
    });
    void listen<string[]>("schedule-external-drop-target", (event) => {
      void processExternalPaths(event.payload, {
        directOpenInThisWindow: true,
        shouldAck: false,
      });
    }).then((fn) => {
      if (cancelled) fn();
      else unlistenTarget = fn;
    });
    return () => {
      cancelled = true;
      unlistenDrop?.();
      unlistenExternal?.();
      unlistenTarget?.();
    };
  }, [handleWindowDrop, processExternalPaths]);
}

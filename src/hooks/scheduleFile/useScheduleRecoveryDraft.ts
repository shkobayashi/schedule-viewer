import { useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { errorMessage } from "../../model/errors";
import {
  deleteScheduleRecoveryViaTauri,
  isTauri,
  parseScheduleText,
  writeScheduleRecoveryViaTauri,
} from "../../model/scheduleFile";
import { recoveryLiveActionViaTauri } from "../../model/windowSession";
import { RECOVERY_DEBOUNCE_MS } from "./constants";

type UseScheduleRecoveryDraftOptions = {
  filePath: string | null;
  isDirty: boolean;
  currentJson: string;
  setErrorMessageText: (message: string | null) => void;
  filePathRef: { current: string | null };
  isDirtyRef: { current: boolean };
  currentJsonRef: { current: string };
  baselineJsonRef: { current: string };
};

export function useScheduleRecoveryDraft({
  filePath,
  isDirty,
  currentJson,
  setErrorMessageText,
  filePathRef,
  isDirtyRef,
  currentJsonRef,
  baselineJsonRef,
}: UseScheduleRecoveryDraftOptions) {
  const recoveryQueueRef = useRef(Promise.resolve());
  const recoveryEpochRef = useRef(0);

  const enqueueRecoveryIo = useCallback((task: () => Promise<void>) => {
    const run = recoveryQueueRef.current.then(task, task);
    recoveryQueueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const clearRecoveryDraft = useCallback(async () => {
    if (!isTauri()) return;
    const path = filePathRef.current;
    if (!path) return;
    recoveryEpochRef.current += 1;
    const epoch = recoveryEpochRef.current;
    await enqueueRecoveryIo(async () => {
      if (recoveryEpochRef.current !== epoch) return;
      await deleteScheduleRecoveryViaTauri(path);
    });
  }, [enqueueRecoveryIo, filePathRef]);

  const writeRecoveryDraftNow = useCallback(async () => {
    if (!isTauri()) return;
    const epoch = recoveryEpochRef.current;
    await enqueueRecoveryIo(async () => {
      if (recoveryEpochRef.current !== epoch) return;
      const path = filePathRef.current;
      if (!path || !isDirtyRef.current) return;
      const parsed = parseScheduleText(currentJsonRef.current);
      if (!parsed.ok) return;
      const baseline = baselineJsonRef.current;
      const documentJson = parsed.canonicalJson;
      if (
        recoveryEpochRef.current !== epoch ||
        filePathRef.current !== path ||
        !isDirtyRef.current
      ) {
        return;
      }
      await writeScheduleRecoveryViaTauri({
        path,
        baselineJson: baseline,
        documentJson,
      });
      if (recoveryEpochRef.current !== epoch) {
        await deleteScheduleRecoveryViaTauri(path);
      }
    });
  }, [baselineJsonRef, currentJsonRef, enqueueRecoveryIo, filePathRef, isDirtyRef]);

  const syncLiveRecovery = useCallback(async () => {
    if (!isTauri() || !filePathRef.current) return;
    const action = await recoveryLiveActionViaTauri(isDirtyRef.current);
    if (action === "write") await writeRecoveryDraftNow();
    else if (action === "delete") await clearRecoveryDraft();
  }, [clearRecoveryDraft, filePathRef, isDirtyRef, writeRecoveryDraftNow]);

  useEffect(() => {
    if (!isTauri() || !filePath || !isDirty) return;
    const id = window.setTimeout(() => {
      void syncLiveRecovery().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "復旧用の控えを保存できませんでした。"),
        );
      });
    }, RECOVERY_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [currentJson, filePath, isDirty, setErrorMessageText, syncLiveRecovery]);

  useEffect(() => {
    if (!isTauri() || !filePath || isDirty) return;
    void syncLiveRecovery().catch((error) => {
      setErrorMessageText(
        errorMessage(error, "復旧用の控えを削除できませんでした。"),
      );
    });
  }, [filePath, isDirty, setErrorMessageText, syncLiveRecovery]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void listen<{ path: string }>("schedule-recovery-reconcile", (event) => {
      if (event.payload.path !== filePathRef.current) return;
      void syncLiveRecovery().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "復旧用の控えを保存できませんでした。"),
        );
      });
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [filePathRef, setErrorMessageText, syncLiveRecovery]);

  return { clearRecoveryDraft, writeRecoveryDraftNow, syncLiveRecovery };
}

import { useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { errorMessage } from "../../model/errors";
import {
  deleteScheduleFilterViaTauri,
  readScheduleFilterViaTauri,
  writeScheduleFilterViaTauri,
} from "../../model/scheduleFilterFile";
import {
  defaultScheduleFilterViewState,
  isDefaultScheduleFilterViewState,
  parseScheduleFilterPersistence,
  pruneContextFromScheduleDocument,
  pruneScheduleFilterViewState,
  serializeScheduleFilterPersistence,
  viewStateFromPersistence,
  type PruneFiltersContext,
  type ScheduleFilterViewState,
} from "../../model/scheduleFilterPersistence";
import type { ScheduleDocument } from "../../model/types";
import { isTauri } from "../../model/scheduleFile";
import { recoveryCloseActionViaTauri, recoveryLiveActionViaTauri } from "../../model/windowSession";
import { RECOVERY_DEBOUNCE_MS } from "./constants";

type UseScheduleFilterPersistenceOptions = {
  filePath: string | null;
  startupSettled: boolean;
  memberCatalogSettled: boolean;
  pruneContext: PruneFiltersContext;
  getFilterViewState: () => ScheduleFilterViewState;
  setFilterViewState: (state: ScheduleFilterViewState) => void;
  setErrorMessageText: (message: string | null) => void;
  filePathRef: { current: string | null };
  persistSuppressedRef: { current: boolean };
};

export function useScheduleFilterPersistence({
  filePath,
  startupSettled,
  memberCatalogSettled,
  pruneContext,
  getFilterViewState,
  setFilterViewState,
  setErrorMessageText,
  filePathRef,
  persistSuppressedRef,
}: UseScheduleFilterPersistenceOptions) {
  const filterQueueRef = useRef(Promise.resolve());
  const filterEpochRef = useRef(0);
  const filterViewSnapshotRef = useRef("");

  const enqueueFilterIo = useCallback((task: () => Promise<void>) => {
    const run = filterQueueRef.current.then(task, task);
    filterQueueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const clearFilterFile = useCallback(async () => {
    if (!isTauri()) return;
    const path = filePathRef.current;
    if (!path) return;
    filterEpochRef.current += 1;
    const epoch = filterEpochRef.current;
    await enqueueFilterIo(async () => {
      if (filterEpochRef.current !== epoch) return;
      await deleteScheduleFilterViaTauri(path);
    });
  }, [enqueueFilterIo, filePathRef]);

  const writeFilterNow = useCallback(async (viewOverride?: ScheduleFilterViewState) => {
    if (!isTauri()) return;
    const epoch = filterEpochRef.current;
    await enqueueFilterIo(async () => {
      if (filterEpochRef.current !== epoch) return;
      const path = filePathRef.current;
      if (!path) return;
      const view = viewOverride ?? getFilterViewState();
      if (isDefaultScheduleFilterViewState(view)) {
        await deleteScheduleFilterViaTauri(path);
        return;
      }
      const contents = serializeScheduleFilterPersistence(path, view);
      if (
        filterEpochRef.current !== epoch ||
        filePathRef.current !== path
      ) {
        return;
      }
      await writeScheduleFilterViaTauri(contents);
    });
  }, [enqueueFilterIo, filePathRef, getFilterViewState]);

  const syncLiveFilter = useCallback(async (viewOverride?: ScheduleFilterViewState) => {
    if (!isTauri() || !filePathRef.current) return;
    const view = viewOverride ?? getFilterViewState();
    const nonDefault = !isDefaultScheduleFilterViewState(view);
    const action = await recoveryLiveActionViaTauri(nonDefault);
    if (action === "write") await writeFilterNow(view);
    else if (action === "delete") await clearFilterFile();
  }, [clearFilterFile, filePathRef, getFilterViewState, writeFilterNow]);

  const syncLiveFilterRef = useRef(syncLiveFilter);
  syncLiveFilterRef.current = syncLiveFilter;

  const beginPersistSuppress = useCallback(() => {
    persistSuppressedRef.current = true;
    filterEpochRef.current += 1;
  }, [persistSuppressedRef]);

  const endPersistSuppress = useCallback(
    (restoredView?: ScheduleFilterViewState) => {
      persistSuppressedRef.current = false;
      void syncLiveFilterRef.current(restoredView).catch((error) => {
        setErrorMessageText(
          errorMessage(error, "絞り込みの記録を保存できませんでした。"),
        );
      });
    },
    [persistSuppressedRef, setErrorMessageText],
  );

  const restoreFiltersForPath = useCallback(
    async (path: string, document: ScheduleDocument): Promise<void> => {
      if (!isTauri()) return;
      beginPersistSuppress();
      let restoredView: ScheduleFilterViewState | undefined;
      try {
        const text = await readScheduleFilterViaTauri(path);
        if (filePathRef.current !== path) return;
        let view: ScheduleFilterViewState;
        if (text == null || text.length === 0) {
          view = defaultScheduleFilterViewState();
        } else {
          const parsed = parseScheduleFilterPersistence(text, path);
          if (!parsed.ok) {
            view = defaultScheduleFilterViewState();
          } else {
            view = viewStateFromPersistence(parsed.data);
          }
        }
        const restoreContext = pruneContextFromScheduleDocument(
          document,
          memberCatalogSettled ? pruneContext.knownMemberIds : new Set(),
        );
        const pruned = pruneScheduleFilterViewState(view, restoreContext, {
          pruneAssignee: memberCatalogSettled,
        });
        restoredView = pruned;
        filterViewSnapshotRef.current = JSON.stringify(pruned);
        setFilterViewState(pruned);
      } finally {
        endPersistSuppress(restoredView);
      }
    },
    [
      beginPersistSuppress,
      endPersistSuppress,
      filePathRef,
      memberCatalogSettled,
      pruneContext,
      setFilterViewState,
    ],
  );

  useEffect(() => {
    if (!isTauri() || !filePath || !startupSettled) return;
    const snapshot = JSON.stringify(getFilterViewState());
    if (snapshot === filterViewSnapshotRef.current) return;
    filterViewSnapshotRef.current = snapshot;
    if (persistSuppressedRef.current) return;
    const id = window.setTimeout(() => {
      void syncLiveFilter().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "絞り込みの記録を保存できませんでした。"),
        );
      });
    }, RECOVERY_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [
    filePath,
    getFilterViewState,
    persistSuppressedRef,
    setErrorMessageText,
    startupSettled,
    syncLiveFilter,
  ]);

  useEffect(() => {
    if (!isTauri() || !memberCatalogSettled || !startupSettled || !filePath) {
      return;
    }
    const before = getFilterViewState();
    const pruned = pruneScheduleFilterViewState(before, pruneContext, {
      pruneCollapse: false,
    });
    if (JSON.stringify(before) === JSON.stringify(pruned)) return;
    setFilterViewState(pruned);
  }, [
    filePath,
    getFilterViewState,
    memberCatalogSettled,
    pruneContext,
    setFilterViewState,
    startupSettled,
  ]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void listen<{ path: string }>("schedule-filter-reconcile", (event) => {
      if (event.payload.path !== filePathRef.current) return;
      void syncLiveFilterRef.current().catch((error) => {
        setErrorMessageText(
          errorMessage(error, "絞り込みの記録を保存できませんでした。"),
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
  }, [filePathRef, setErrorMessageText]);

  const flushFilterOnClose = useCallback(async () => {
    if (!isTauri() || !filePathRef.current) return;
    const view = getFilterViewState();
    const nonDefault = !isDefaultScheduleFilterViewState(view);
    const action = await recoveryCloseActionViaTauri(nonDefault);
    if (action === "write") await writeFilterNow();
    else if (action === "delete") await clearFilterFile();
  }, [clearFilterFile, filePathRef, getFilterViewState, writeFilterNow]);

  return {
    restoreFiltersForPath,
    writeFilterNow,
    clearFilterFile,
    syncLiveFilter,
    flushFilterOnClose,
    beginPersistSuppress,
    endPersistSuppress,
  };
}

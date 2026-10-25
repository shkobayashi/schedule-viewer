import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../model/scheduleFile";
import type { RecentFilesStore } from "../model/recentFiles";
import {
  clearRecentFilesViaTauri,
  readRecentFilesViaTauri,
} from "../model/recentFilesAppData";

const EMPTY_STORE: RecentFilesStore = { schedules: [], workspaces: [] };

export function useRecentFiles(onClearError: (message: string) => void) {
  const [recentFilesStore, setRecentFilesStore] =
    useState<RecentFilesStore>(EMPTY_STORE);

  const refreshRecentFiles = useCallback(async () => {
    if (!isTauri()) {
      setRecentFilesStore(EMPTY_STORE);
      return;
    }
    try {
      setRecentFilesStore(await readRecentFilesViaTauri());
    } catch {
      setRecentFilesStore(EMPTY_STORE);
    }
  }, []);

  useEffect(() => {
    void refreshRecentFiles();
  }, [refreshRecentFiles]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) void refreshRecentFiles();
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => {
      unlisten?.();
    };
  }, [refreshRecentFiles]);

  const clearRecentHistory = useCallback(async () => {
    if (!isTauri()) return;
    try {
      setRecentFilesStore(await clearRecentFilesViaTauri());
    } catch (error) {
      onClearError(
        error instanceof Error
          ? error.message
          : "履歴を消せませんでした。",
      );
    }
  }, [onClearError]);

  return {
    recentFilesStore,
    setRecentFilesStore,
    refreshRecentFiles,
    clearRecentHistory,
  };
}

import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../model/scheduleFile";
import {
  clearRecentFilesViaTauri,
  readRecentFilesViaTauri,
} from "../model/recentFilesAppData";

export function useRecentFiles(onClearError: (message: string) => void) {
  const [recentFilePaths, setRecentFilePaths] = useState<string[]>([]);

  const refreshRecentFiles = useCallback(async () => {
    if (!isTauri()) {
      setRecentFilePaths([]);
      return;
    }
    try {
      setRecentFilePaths(await readRecentFilesViaTauri());
    } catch {
      setRecentFilePaths([]);
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
      setRecentFilePaths(await clearRecentFilesViaTauri());
    } catch (error) {
      onClearError(
        error instanceof Error
          ? error.message
          : "履歴を消せませんでした。",
      );
    }
  }, [onClearError]);

  return {
    recentFilePaths,
    setRecentFilePaths,
    refreshRecentFiles,
    clearRecentHistory,
  };
}

import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { formatWindowTitle } from "../model/windowTitle";

export function useWindowTitle(displayName: string, dirty: boolean): void {
  useEffect(() => {
    const title = formatWindowTitle(displayName, dirty);
    document.title = title;
    if (!isTauri()) return;
    void getCurrentWindow().setTitle(title).catch(() => {
      // ignore
    });
  }, [displayName, dirty]);
}

import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const APP_NAME = "schedule-viewer";

export function useWindowTitle(
  displayName: string,
  dirty: boolean,
  startupContentPending: boolean,
): void {
  useEffect(() => {
    const title = startupContentPending
      ? APP_NAME
      : (() => {
          const name = displayName.trim() || "サンプルデータ";
          const prefix = dirty ? "* " : "";
          return `${prefix}${name} - ${APP_NAME}`;
        })();
    document.title = title;
    if (!isTauri()) return;
    void getCurrentWindow().setTitle(title).catch(() => {
      // ignore
    });
  }, [displayName, dirty, startupContentPending]);
}

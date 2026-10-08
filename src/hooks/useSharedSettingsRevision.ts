import { useEffect } from "react";
import { AUTO_UPDATE_LS_KEY } from "../model/autoUpdate";
import { COLOR_SCHEME_LS_KEY } from "../model/colorScheme";
import { SETTINGS_REVISION_KEY } from "../model/sharedSettingsRevision";
import { SIDEBAR_WIDTH_LS_KEY } from "../model/sidebarWidth";
import { DISPLAY_SCALE_LS_KEY } from "../model/uiScale";
import {
  ROW_DENSITY_LS_KEY,
  SHOW_LIGHTNING_LS_KEY,
  SIDEBAR_COLUMNS_LS_KEY,
} from "../model/viewPreferences";

const SHARED_STORAGE_KEYS = new Set([
  SETTINGS_REVISION_KEY,
  DISPLAY_SCALE_LS_KEY,
  COLOR_SCHEME_LS_KEY,
  SIDEBAR_WIDTH_LS_KEY,
  ROW_DENSITY_LS_KEY,
  SHOW_LIGHTNING_LS_KEY,
  SIDEBAR_COLUMNS_LS_KEY,
  AUTO_UPDATE_LS_KEY,
]);

export function useSharedSettingsRevision(
  onRevision: (key: string | null) => void,
): void {
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key == null || SHARED_STORAGE_KEYS.has(event.key)) {
        onRevision(event.key);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [onRevision]);
}

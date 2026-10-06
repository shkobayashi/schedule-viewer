export const SETTINGS_REVISION_KEY = "schedule-viewer/settings-revision";

export function bumpSharedSettingsRevision(): void {
  try {
    localStorage.setItem(SETTINGS_REVISION_KEY, String(Date.now()));
  } catch {
    // ignore quota errors
  }
}

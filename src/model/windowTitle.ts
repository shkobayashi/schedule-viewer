const APP_NAME = "schedule-viewer";

export function formatWindowTitle(displayName: string, dirty: boolean): string {
  const name = displayName.trim() || "サンプルデータ";
  const prefix = dirty ? "* " : "";
  return `${prefix}${name} - ${APP_NAME}`;
}

import { scheduleJsonFilename, scheduleParentDirectory } from "./scheduleFile";

/** 設定画面などで、設定ファイルをファイル名（親フォルダ）で示す。 */
export function workspaceFileDisplayLabel(workspacePath: string): string {
  const filename = scheduleJsonFilename(workspacePath) ?? workspacePath;
  const parent = scheduleParentDirectory(workspacePath);
  if (!parent) return filename;
  const parentName = scheduleJsonFilename(parent);
  if (
    !parentName ||
    parentName.includes("/") ||
    parentName.includes("\\")
  ) {
    return filename;
  }
  return `${filename}（${parentName}）`;
}

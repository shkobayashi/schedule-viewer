import { scheduleParentDirectory } from "./scheduleFile";

export function isAbsoluteFilesystemPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("\\\\")) return true;
  return /^[A-Za-z]:[\\/]/.test(trimmed);
}

/** 設定ファイルに書ける相対パス。空・絶対・ドライブ付きは不可。 */
export function isWorkspaceRelativePath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (isAbsoluteFilesystemPath(trimmed)) return false;
  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) return false;
  return true;
}

/**
 * 設定ファイルの親ディレクトリと相対パスを結合する。`..` を許可する。
 * テストと表示用。実際の読み込みは Tauri 側でも解決する。
 */
export function resolveWorkspaceRelativePath(
  workspaceFilePath: string,
  relative: string,
): string | null {
  const parent = scheduleParentDirectory(workspaceFilePath);
  if (!parent) return null;
  const sep = workspaceFilePath.includes("\\") ? "\\" : "/";
  const parentParts = parent.split(/[/\\]/).filter((part) => part.length > 0);
  const relativeParts = relative.split(/[/\\]/).filter((part) => part.length > 0);
  const stack = [...parentParts];
  for (const part of relativeParts) {
    if (part === ".") continue;
    if (part === "..") {
      if (stack.length === 0) return null;
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  if (stack.length === 0) return null;
  const driveMatch = /^([A-Za-z]:)(.*)$/.exec(parent);
  if (driveMatch) {
    const rest = stack.slice(1).join(sep);
    return rest.length > 0 ? `${driveMatch[1]}${sep}${rest}` : `${driveMatch[1]}${sep}`;
  }
  if (parent.startsWith("/")) {
    return `/${stack.join("/")}`;
  }
  return stack.join(sep);
}

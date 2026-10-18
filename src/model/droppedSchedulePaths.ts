export type DroppedPathClassification =
  | { kind: "singleJson"; path: string }
  | { kind: "invalidSelection" };

function isJsonExtension(path: string): boolean {
  const base = path.replace(/\\/g, "/").split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return false;
  return base.slice(dot + 1).toLowerCase() === "json";
}

/** OS から渡されたパス一覧を、開く候補かどうかに仕分ける。 */
export function classifyDroppedSchedulePaths(
  paths: readonly string[],
): DroppedPathClassification {
  const jsonFiles = paths.filter((path) => path.length > 0 && isJsonExtension(path));
  if (jsonFiles.length === 1 && paths.length === 1) {
    return { kind: "singleJson", path: jsonFiles[0] };
  }
  return { kind: "invalidSelection" };
}

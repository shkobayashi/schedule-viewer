/** 同じファイルを別表記で開いているウィンドウを突き合わせる。 */
export function schedulePathKey(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/");
  const last = segments[segments.length - 1] ?? normalized;
  const lowerLast = last.toLowerCase();
  if (segments.length > 0) {
    segments[segments.length - 1] = lowerLast;
  }
  return segments.join("/");
}

/** ブラウザではファイルの監視もドロップの購読も始めない。 */
export function shouldAttachDesktopFileBridge(tauri: boolean): boolean {
  return tauri;
}

export function scheduleFilePoll(
  tauri: boolean,
  filePath: string | null,
  tick: () => void,
  intervalMs: number,
): () => void {
  if (!shouldAttachDesktopFileBridge(tauri) || filePath == null) {
    return () => undefined;
  }
  const id = window.setInterval(tick, intervalMs);
  return () => window.clearInterval(id);
}

export function scheduleFilterWrite(
  tauri: boolean,
  filePath: string | null,
  write: () => void,
  delayMs: number,
): () => void {
  if (!shouldAttachDesktopFileBridge(tauri) || filePath == null) {
    return () => undefined;
  }
  const id = window.setTimeout(write, delayMs);
  return () => window.clearTimeout(id);
}

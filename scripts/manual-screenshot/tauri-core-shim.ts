export {
  Channel,
  PluginListener,
  Resource,
  SERIALIZE_TO_IPC_FN,
  addPluginListener,
  checkPermissions,
  convertFileSrc,
  requestPermissions,
  transformCallback,
} from "@tauri-apps/api/core-original";

import {
  manualScreenshotInvoke,
  setManualScreenshotDiskContents,
  setManualScreenshotOpenPick,
} from "./tauri-invoke";

declare global {
  interface Window {
    __manualScreenshotPrepareOpen?: (pick: { path: string; contents: string }) => void;
  }
}

if (typeof window !== "undefined") {
  window.__manualScreenshotPrepareOpen = (pick) => {
    setManualScreenshotOpenPick(pick);
    setManualScreenshotDiskContents(pick.contents);
  };
}

export function isTauri(): boolean {
  return true;
}

export async function invoke(
  cmd: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return manualScreenshotInvoke(cmd, args);
}

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

import { manualScreenshotInvoke } from "./tauri-invoke";

export function isTauri(): boolean {
  return true;
}

export async function invoke(
  cmd: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return manualScreenshotInvoke(cmd, args);
}

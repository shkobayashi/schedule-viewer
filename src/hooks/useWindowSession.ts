import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { unregisterWindowSessionViaTauri } from "../model/windowSession";

export async function finalizeWindowClose(): Promise<void> {
  if (!isTauri()) return;
  await unregisterWindowSessionViaTauri();
  await getCurrentWindow().close();
}

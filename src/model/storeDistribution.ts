import { invoke, isTauri } from "@tauri-apps/api/core";

let cached: boolean | null = null;

/** Microsoft Store の MSIX として動いている Windows 版。 */
export async function readStoreDistribution(): Promise<boolean> {
  if (!isTauri()) return false;
  if (cached !== null) return cached;
  try {
    cached = await invoke<boolean>("is_store_distribution");
  } catch {
    cached = false;
  }
  return cached;
}

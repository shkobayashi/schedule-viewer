import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./scheduleFile";

export function quoteExecutableForShell(path: string): string {
  if (/[\s"'\\$`]/.test(path)) {
    return `"${path.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return path;
}

export async function fetchMcpRegistrationCommand(): Promise<string | null> {
  if (!isTauri()) return null;
  const exe = await invoke<string>("get_executable_path");
  return `${quoteExecutableForShell(exe)} --mcp`;
}

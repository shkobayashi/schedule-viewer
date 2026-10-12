import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./scheduleFile";

/** Cursor と Claude の mcp.json に、そのまま貼れる登録用 JSON。 */
export function mcpConfigJson(executablePath: string): string {
  return `${JSON.stringify(
    {
      mcpServers: {
        "schedule-viewer": {
          command: executablePath,
          args: ["--mcp"],
        },
      },
    },
    null,
    2,
  )}\n`;
}

export async function fetchMcpConfigJson(): Promise<string | null> {
  if (!isTauri() && import.meta.env.MODE !== "manual-screenshot") return null;
  const exe =
    import.meta.env.MODE === "manual-screenshot"
      ? (await (
          await import("../../scripts/manual-screenshot/tauri-invoke")
        ).manualScreenshotInvoke("get_executable_path")) as string
      : await invoke<string>("get_executable_path");
  return mcpConfigJson(exe);
}

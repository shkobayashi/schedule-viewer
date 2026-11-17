import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(srcRoot, "..");
const permissionsDir = path.join(repoRoot, "src-tauri", "permissions");

function allowedCommands(): Set<string> {
  const allowed = new Set<string>();
  for (const name of readdirSync(permissionsDir)) {
    if (!name.endsWith(".toml")) continue;
    const text = readFileSync(path.join(permissionsDir, name), "utf8");
    for (const block of text.matchAll(/commands\.allow\s*=\s*\[([\s\S]*?)\]/g)) {
      for (const item of block[1].matchAll(/"([a-z0-9_]+)"/g)) {
        allowed.add(item[1]);
      }
    }
  }
  return allowed;
}

function isProductSource(file: string): boolean {
  if (!/\.(ts|tsx)$/.test(file)) return false;
  if (/\.test\.tsx?$/.test(file)) return false;
  return !file.split(path.sep).includes("test");
}

function invokedCommands(): Map<string, string> {
  const used = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!isProductSource(full)) continue;
      const text = readFileSync(full, "utf8");
      for (const call of text.matchAll(
        /\binvoke(?:<[^>()]*(?:<[^>]*>)?[^>()]*>)?\(\s*"([a-z0-9_]+)"/g,
      )) {
        used.set(call[1], path.relative(repoRoot, full));
      }
    }
  };
  walk(srcRoot);
  return used;
}

describe("Tauri 命令の許可", () => {
  it("フロントが invoke する命令は、すべて src-tauri/permissions の commands.allow にある", () => {
    const allowed = allowedCommands();
    const used = invokedCommands();
    expect(used.has("mcp_reply")).toBe(true);
    expect(used.has("mcp_screen_listener_ready")).toBe(true);
    const missing = [...used]
      .filter(([command]) => !allowed.has(command))
      .map(([command, file]) => `${command}（${file}）`);
    expect(missing).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import {
  MCP_ALL_TOOL_NAMES,
  MCP_FRONT_ONLY_TOOL_NAMES,
  MCP_READ_TOOL_NAMES,
  MCP_STDIN_ACTION_TOOL_NAMES,
  MCP_WINDOW_TARGET_TOOL_NAMES,
} from "../src/model/mcpToolNames.ts";

function extractRustStrArray(source: string, constName: string): string[] {
  const re = new RegExp(
    `pub const ${constName}(?:\\s*:\\s*\\[\\&str;\\s*\\d+\\])?\\s*=\\s*\\[([\\s\\S]*?)\\];`,
  );
  const match = source.match(re);
  if (!match) {
    throw new Error(`Rust array not found: ${constName}`);
  }
  const inner = match[1];
  const names: string[] = [];
  for (const line of inner.split("\n")) {
    const m = line.match(/"([^"]+)"/);
    if (m) names.push(m[1]);
    const ident = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*,?\s*(?:\/\/.*)?$/);
    if (ident && !line.includes('"')) {
      if (ident[1] === "OPEN_WINDOWS_TOOL_NAME") {
        names.push("open_windows");
      } else if (ident[1] === "SCREEN_REPLACE_TOOL_NAME") {
        names.push("replace_schedule");
      }
    }
  }
  return names;
}

function sameSet(label: string, a: readonly string[], b: readonly string[]): string | null {
  const sa = [...a].sort();
  const sb = [...b].sort();
  if (sa.length !== sb.length || sa.some((v, i) => v !== sb[i])) {
    return `${label} mismatch\n  TS: ${sa.join(", ")}\n  RS: ${sb.join(", ")}`;
  }
  return null;
}

const rust = readFileSync("src-tauri/src/mcp_tool_names.rs", "utf8");

const pairs: [string, readonly string[], string][] = [
  ["MCP_ALL vs SCREEN_TOOL_NAMES", MCP_ALL_TOOL_NAMES, "SCREEN_TOOL_NAMES"],
  ["MCP_READ vs SCREEN_READ_TOOLS_WITH_WINDOW", MCP_READ_TOOL_NAMES, "SCREEN_READ_TOOLS_WITH_WINDOW"],
  ["MCP_WINDOW_TARGET", MCP_WINDOW_TARGET_TOOL_NAMES, "MCP_WINDOW_TARGET_TOOL_NAMES"],
  ["MCP_FRONT_ONLY", MCP_FRONT_ONLY_TOOL_NAMES, "MCP_FRONT_ONLY_TOOL_NAMES"],
  ["MCP_STDIN_ACTION", MCP_STDIN_ACTION_TOOL_NAMES, "MCP_STDIN_ACTION_TOOL_NAMES"],
];

const errors: string[] = [];
for (const [label, tsNames, rustConst] of pairs) {
  const rsNames = extractRustStrArray(rust, rustConst);
  const err = sameSet(label, tsNames, rsNames);
  if (err) errors.push(err);
}

if (errors.length > 0) {
  console.error("check-mcp-tool-names failed:");
  for (const e of errors) console.error(e);
  process.exit(1);
}

console.log("MCP tool names match between src/model/mcpToolNames.ts and mcp_tool_names.rs");

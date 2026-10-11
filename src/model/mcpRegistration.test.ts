import { describe, expect, it } from "vitest";
import { mcpConfigJson } from "./mcpRegistration";

describe("mcpConfigJson", () => {
  it("writes a Windows path as the mcp.json command", () => {
    const path = "C:\\Apps\\schedule-viewer\\schedule-viewer.exe";
    const text = mcpConfigJson(path);
    const parsed = JSON.parse(text) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(parsed.mcpServers["schedule-viewer"]?.command).toBe(path);
    expect(parsed.mcpServers["schedule-viewer"]?.args).toEqual(["--mcp"]);
    expect(text).toContain(`"command": ${JSON.stringify(path)}`);
  });

  it("keeps spaces and quotes inside the JSON command string", () => {
    const path = 'C:\\Program Files\\schedule-viewer\\app "v1"\\schedule-viewer.exe';
    const text = mcpConfigJson(path);
    const parsed = JSON.parse(text) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(parsed.mcpServers["schedule-viewer"]?.command).toBe(path);
    expect(text.startsWith("{")).toBe(true);
    expect(text).not.toContain(`"${path}" --mcp`);
  });

  it("keeps a macOS path with spaces as the command string", () => {
    const path = "/Applications/My App/schedule-viewer";
    const parsed = JSON.parse(mcpConfigJson(path)) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(parsed.mcpServers["schedule-viewer"]?.command).toBe(path);
    expect(parsed.mcpServers["schedule-viewer"]?.args).toEqual(["--mcp"]);
  });
});

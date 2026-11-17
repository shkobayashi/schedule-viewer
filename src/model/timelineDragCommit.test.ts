import { describe, expect, it } from "vitest";
import { setMcpInProgressGeneration } from "./mcpInProgressInvalidation";
import { shouldApplyTimelineDragCommit } from "./timelineDragCommit";

describe("timelineDragCommit", () => {
  it("allows commit when MCP generation is unchanged", () => {
    setMcpInProgressGeneration(2);
    expect(shouldApplyTimelineDragCommit(true, 2)).toBe(true);
  });

  it("rejects commit after MCP generation advanced", () => {
    setMcpInProgressGeneration(2);
    setMcpInProgressGeneration(3);
    expect(shouldApplyTimelineDragCommit(true, 2)).toBe(false);
  });

  it("rejects when caller already cancelled commit", () => {
    setMcpInProgressGeneration(0);
    expect(shouldApplyTimelineDragCommit(false, 0)).toBe(false);
  });
});

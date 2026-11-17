import { describe, expect, it } from "vitest";
import {
  bumpMcpInProgressGenerationLocal,
  captureMcpInProgressGeneration,
  isMcpInProgressCommitStale,
  mcpInProgressGeneration,
  setMcpInProgressGeneration,
} from "./mcpInProgressInvalidation";

describe("mcpInProgressInvalidation", () => {
  it("treats a captured generation as stale after MCP progress bumps", () => {
    setMcpInProgressGeneration(0);
    const captured = captureMcpInProgressGeneration();
    expect(isMcpInProgressCommitStale(captured)).toBe(false);
    bumpMcpInProgressGenerationLocal();
    expect(isMcpInProgressCommitStale(captured)).toBe(true);
    expect(mcpInProgressGeneration()).toBe(1);
  });

  it("does not mark stale when generation matches", () => {
    setMcpInProgressGeneration(4);
    const captured = captureMcpInProgressGeneration();
    expect(isMcpInProgressCommitStale(captured)).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  executeMcpActionTool,
  type McpActionExecutorContext,
} from "./mcpActionExecutor";
import { MCP_TOOL_APPLY_EXPLANATION_PATTERN } from "../model/mcpToolNames";
import {
  APPLY_EXPLANATION_PATTERN_NO_OVERLAY,
  APPLY_EXPLANATION_PATTERN_UNKNOWN,
} from "../model/explainOverlayPatterns";
import type { ExplanationOverlayState } from "../model/explainOverlay";
import type { ScheduleDocument } from "../model/types";
import { SCHEDULE_SCHEMA_VERSION } from "../model/types";

const documentFixture = (): ScheduleDocument => ({
  schemaVersion: SCHEDULE_SCHEMA_VERSION,
  title: "T",
  categories: [],
  milestoneGroups: [],
  milestones: [],
  outline: undefined,
  connections: undefined,
});

const overlayWithPattern = (): ExplanationOverlayState => ({
  translucent: true,
  marks: [],
  patterns: [
    {
      id: "p-a",
      name: "A",
      color: "#2563eb",
      tasks: [],
      changes: [],
      milestoneChanges: [],
    },
  ],
});

function baseContext(input: {
  overlay: ExplanationOverlayState | null;
  applyEditPlan: McpActionExecutorContext["applyEditPlan"];
}): McpActionExecutorContext {
  return {
    levels: null,
    visibleRows: [],
    getDocument: () => documentFixture(),
    applySetView: async () => ({ ok: true as const, text: "" }),
    applyExplainView: async () => ({ ok: true as const, text: "" }),
    applyExplainOverlay: async () => ({ ok: true as const, text: "" }),
    getExplanationOverlay: () => input.overlay,
    applyEditPlan: input.applyEditPlan,
    runFileAction: async () => ({ ok: true as const, text: "" }),
    runCatalogAction: async () => ({ ok: true as const, text: "" }),
    runSetPreferences: async () => ({ ok: true as const, text: "" }),
    runHistory: async () => ({ ok: true as const, text: "" }),
    runFocusWindow: async () => ({ ok: true as const, text: "" }),
    runOpenNewWindow: async () => ({ ok: true as const, text: "" }),
    runCloseWindow: async () => ({ ok: true as const, text: "" }),
    runMinimizeWindow: async () => ({ ok: true as const, text: "" }),
  };
}

describe("executeMcpActionTool apply_explanation_pattern", () => {
  it("executeMcpActionTool_applyExplanationPattern_rejectsWithoutOverlay", async () => {
    const applyEditPlan = vi.fn<
      McpActionExecutorContext["applyEditPlan"]
    >();
    const result = await executeMcpActionTool(
      MCP_TOOL_APPLY_EXPLANATION_PATTERN,
      { patternId: "p-a" },
      baseContext({ overlay: null, applyEditPlan }),
    );
    expect(result).toEqual({
      ok: false,
      message: APPLY_EXPLANATION_PATTERN_NO_OVERLAY,
    });
    expect(applyEditPlan).not.toHaveBeenCalled();
  });

  it("executeMcpActionTool_applyExplanationPattern_rejectsUnknownPatternId", async () => {
    const applyEditPlan = vi.fn<
      McpActionExecutorContext["applyEditPlan"]
    >();
    const result = await executeMcpActionTool(
      MCP_TOOL_APPLY_EXPLANATION_PATTERN,
      { patternId: "missing" },
      baseContext({ overlay: overlayWithPattern(), applyEditPlan }),
    );
    expect(result).toEqual({
      ok: false,
      message: APPLY_EXPLANATION_PATTERN_UNKNOWN,
    });
    expect(applyEditPlan).not.toHaveBeenCalled();
  });
});

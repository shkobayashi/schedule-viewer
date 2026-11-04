import type { McpActionEnvelope } from "../model/mcpOperationGate";
import {
  applyMcpEditPlanOps,
  parseMcpEditPlanOps,
} from "../model/mcpEditPlan";
import { parseMcpSetViewPatch, type McpSetViewPatch } from "../model/mcpSetView";
import {
  MCP_TOOL_CATALOG_ACTION,
  MCP_TOOL_CLOSE_WINDOW,
  MCP_TOOL_EDIT_PLAN,
  MCP_TOOL_APPLY_EXPLANATION_PATTERN,
  MCP_TOOL_EXPLAIN_VIEW,
  MCP_TOOL_EXPLAIN_OVERLAY,
  MCP_TOOL_FILE_ACTION,
  MCP_TOOL_FOCUS_WINDOW,
  MCP_TOOL_HISTORY,
  MCP_TOOL_MINIMIZE_WINDOW,
  MCP_TOOL_OPEN_NEW_WINDOW,
  MCP_TOOL_SET_PREFERENCES,
  MCP_TOOL_SET_VIEW,
} from "../model/mcpToolNames";
import {
  applyExplanationPatternToDocument,
  APPLY_EXPLANATION_PATTERN_NO_OVERLAY,
  APPLY_EXPLANATION_PATTERN_UNKNOWN,
  parseApplyExplanationPatternRequest,
} from "../model/explainOverlayPatterns";
import { explanationOverlayActive } from "../model/explainOverlay";
import type { ExplanationOverlayState } from "../model/explainOverlay";

export type McpActionResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

export type McpActionExecutorContext = {
  levels: readonly ScheduleLevelDef[] | null | undefined;
  visibleRows: readonly VisibleRow[];
  getDocument: () => ScheduleDocument;
  applySetView: (patch: McpSetViewPatch) => McpActionResult | Promise<McpActionResult>;
  applyExplainView: (
    envelope: Record<string, unknown>,
  ) => McpActionResult | Promise<McpActionResult>;
  applyExplainOverlay: (
    envelope: Record<string, unknown>,
  ) => McpActionResult | Promise<McpActionResult>;
  getExplanationOverlay: () => ExplanationOverlayState | null;
  applyEditPlan: (
    document: ScheduleDocument,
    movedTo?: string,
  ) => McpActionResult | Promise<McpActionResult>;
  runFileAction: (envelope: McpActionEnvelope) => McpActionResult | Promise<McpActionResult>;
  runCatalogAction: (
    envelope: McpActionEnvelope,
  ) => McpActionResult | Promise<McpActionResult>;
  runSetPreferences: (
    envelope: McpActionEnvelope,
  ) => McpActionResult | Promise<McpActionResult>;
  runHistory: (envelope: McpActionEnvelope) => McpActionResult | Promise<McpActionResult>;
  runFocusWindow: (label: string | null) => McpActionResult | Promise<McpActionResult>;
  runOpenNewWindow: (
    envelope: McpActionEnvelope,
  ) => McpActionResult | Promise<McpActionResult>;
  runCloseWindow: (
    label: string | null,
    envelope: McpActionEnvelope,
  ) => McpActionResult | Promise<McpActionResult>;
  runMinimizeWindow: (label: string | null) => McpActionResult | Promise<McpActionResult>;
};

function windowLabelFromEnvelope(envelope: McpActionEnvelope): string | null {
  const value = envelope.window;
  if (value == null) return null;
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }
  return value;
}

export async function executeMcpActionTool(
  tool: string,
  envelope: McpActionEnvelope,
  ctx: McpActionExecutorContext,
): Promise<McpActionResult> {
  switch (tool) {
    case MCP_TOOL_SET_VIEW: {
      const parsed = parseMcpSetViewPatch(envelope);
      if (!parsed.ok) return parsed;
      return ctx.applySetView(parsed.patch);
    }
    case MCP_TOOL_EXPLAIN_VIEW:
      return ctx.applyExplainView(envelope);
    case MCP_TOOL_EXPLAIN_OVERLAY:
      return ctx.applyExplainOverlay(envelope);
    case MCP_TOOL_APPLY_EXPLANATION_PATTERN: {
      const parsed = parseApplyExplanationPatternRequest(envelope);
      if (!parsed.ok) return parsed;
      const overlay = ctx.getExplanationOverlay();
      if (
        !explanationOverlayActive(overlay) ||
        overlay.patterns.length === 0
      ) {
        return { ok: false, message: APPLY_EXPLANATION_PATTERN_NO_OVERLAY };
      }
      const pattern = overlay.patterns.find((p) => p.id === parsed.patternId);
      if (pattern == null) {
        return { ok: false, message: APPLY_EXPLANATION_PATTERN_UNKNOWN };
      }
      const applied = applyExplanationPatternToDocument(
        ctx.getDocument(),
        pattern,
      );
      if (!applied.ok) return applied;
      return ctx.applyEditPlan(applied.document);
    }
    case MCP_TOOL_EDIT_PLAN: {
      const parsed = parseMcpEditPlanOps(envelope);
      if (!parsed.ok) return parsed;
      const applied = applyMcpEditPlanOps(
        ctx.getDocument(),
        parsed.ops,
        ctx.visibleRows,
      );
      if (!applied.ok) return applied;
      return ctx.applyEditPlan(applied.document, applied.movedTo);
    }
    case MCP_TOOL_FILE_ACTION:
      return ctx.runFileAction(envelope);
    case MCP_TOOL_CATALOG_ACTION:
      return ctx.runCatalogAction(envelope);
    case MCP_TOOL_SET_PREFERENCES:
      return ctx.runSetPreferences(envelope);
    case MCP_TOOL_HISTORY:
      return ctx.runHistory(envelope);
    case MCP_TOOL_FOCUS_WINDOW: {
      const label = windowLabelFromEnvelope(envelope);
      if (label === "") {
        return { ok: false, message: "window は空にできません。" };
      }
      return ctx.runFocusWindow(label);
    }
    case MCP_TOOL_OPEN_NEW_WINDOW:
      return ctx.runOpenNewWindow(envelope);
    case MCP_TOOL_CLOSE_WINDOW: {
      const label = windowLabelFromEnvelope(envelope);
      if (label === "") {
        return { ok: false, message: "window は空にできません。" };
      }
      return ctx.runCloseWindow(label, envelope);
    }
    case MCP_TOOL_MINIMIZE_WINDOW: {
      const label = windowLabelFromEnvelope(envelope);
      if (label === "") {
        return { ok: false, message: "window は空にできません。" };
      }
      return ctx.runMinimizeWindow(label);
    }
    default:
      return { ok: false, message: `未知のツールです: ${tool}` };
  }
}

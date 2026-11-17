import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { executeMcpActionTool } from "./mcpActionExecutor";
import { useMcpActionExecutor, type UseMcpActionExecutorInput } from "./useMcpActionExecutor";
import { MCP_TOOL_SET_VIEW } from "../model/mcpToolNames";
import { DEFAULT_FILTERS } from "../model/filterChips";
import { loadRegressionSchedule } from "../test/searchErrorKeysFixtures";
import type { ScheduleDocument } from "../model/types";

const sampleDocument = (): ScheduleDocument =>
  structuredClone(loadRegressionSchedule("smoke.schedule.json"));

function baseInput(
  overrides: Partial<UseMcpActionExecutorInput> = {},
): UseMcpActionExecutorInput {
  return {
    getDocument: () => sampleDocument(),
    visibleRows: [],
    levels: null,
    replaceScheduleDocument: () => ({
      outcome: "unchanged",
      screenJson: "{}",
    }),
    scheduleFilePath: null,
    getScheduleFilePath: () => null,
    fields: [],
    getCanonicalJson: () => "{}",
    documentTitle: "T",
    setBaselineAfterSave: vi.fn(),
    isDirty: false,
    getIsDirty: () => false,
    openPathWithoutDialog: async () => ({ ok: true, text: "" }),
    getCollapsed: () => new Set(),
    getFilterViewState: () => ({
      filters: DEFAULT_FILTERS,
      searchField: "name",
      hiddenMilestoneGroupIds: [],
      hiddenMilestoneIds: ["old-mark"],
      collapsedCategoryIds: [],
      collapsedGroupIds: [],
    }),
    applyPartialFilterViewState: vi.fn(),
    applyMcpSetViewLineage: vi.fn(),
    clearExplanationOnSetView: vi.fn(),
    runExplainViewAction: () => ({ ok: true, text: "" }),
    runExplainOverlayAction: () => ({ ok: true, text: "" }),
    getExplanationOverlay: () => null,
    applySetViewPreferences: vi.fn(),
    applySetViewTimeline: vi.fn(),
    applyCalendarAction: async () => ({ ok: true, text: "" }),
    runExport: async () => ({ ok: true, text: "" }),
    undo: () => false,
    redo: () => false,
    memberCatalogSave: async () => ({ ok: true, text: "" }),
    colorCatalogSave: async () => ({ ok: true, text: "" }),
    statusCatalogSave: async () => ({ ok: true, text: "" }),
    fieldCatalogSave: async () => ({ ok: true, text: "" }),
    exportWorkspaceToFolder: async () => ({ ok: true, text: "" }),
    mcpUiBlocking: () => false,
    ...overrides,
  };
}

describe("useMcpActionExecutor set_view lineage and hidden marks", () => {
  it("applySetView clears explanation for lineage but not for hiddenMilestoneIds", async () => {
    const clearExplanationOnSetView = vi.fn();
    const applyMcpSetViewLineage = vi.fn();
    const applyPartialFilterViewState = vi.fn();
    const { result } = renderHook(() =>
      useMcpActionExecutor(
        baseInput({
          clearExplanationOnSetView,
          applyMcpSetViewLineage,
          applyPartialFilterViewState,
        }),
      ),
    );

    const taskId = "e1000001-0000-4000-8000-000000000001";
    const lineageResult = await result.current.applySetView({
      lineage: { taskId, includesConnections: false },
    });
    expect(lineageResult).toEqual({ ok: true, text: "見方を変えました。" });
    expect(clearExplanationOnSetView).toHaveBeenCalledOnce();
    expect(applyMcpSetViewLineage).toHaveBeenCalledWith({
      taskId,
      includesConnections: false,
    });

    clearExplanationOnSetView.mockClear();
    const marksResult = await result.current.applySetView({
      hiddenMilestoneIds: [],
    });
    expect(marksResult).toEqual({ ok: true, text: "見方を変えました。" });
    expect(clearExplanationOnSetView).not.toHaveBeenCalled();
    expect(applyPartialFilterViewState).toHaveBeenCalledWith({
      hiddenMilestoneIds: [],
    });
  });

  it("applySetView rejects unknown lineage task without touching filters", async () => {
    const applyPartialFilterViewState = vi.fn();
    const applyMcpSetViewLineage = vi.fn();
    const { result } = renderHook(() =>
      useMcpActionExecutor(
        baseInput({ applyPartialFilterViewState, applyMcpSetViewLineage }),
      ),
    );

    const response = await result.current.applySetView({
      lineage: {
        taskId: "00000000-0000-4000-8000-000000000099",
        includesConnections: false,
      },
      filters: { ...DEFAULT_FILTERS, status: "done" },
    });
    expect(response).toEqual({
      ok: false,
      message: "系統の起点のタスクが見つかりません。",
    });
    expect(applyMcpSetViewLineage).not.toHaveBeenCalled();
    expect(applyPartialFilterViewState).not.toHaveBeenCalled();
  });

  it("executeMcpActionTool_set_view passes parsed lineage with connections", async () => {
    const applyMcpSetViewLineage = vi.fn();
    const { result } = renderHook(() =>
      useMcpActionExecutor(baseInput({ applyMcpSetViewLineage })),
    );
    const taskId = "e1000001-0000-4000-8000-000000000001";
    await executeMcpActionTool(
      MCP_TOOL_SET_VIEW,
      {
        lineage: { taskId, includesConnections: true },
      },
      result.current,
    );
    expect(applyMcpSetViewLineage).toHaveBeenCalledWith({
      taskId,
      includesConnections: true,
    });
  });
});

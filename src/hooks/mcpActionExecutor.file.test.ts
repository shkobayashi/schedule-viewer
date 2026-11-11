import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeMcpActionTool } from "./mcpActionExecutor";
import { useMcpActionExecutor, type UseMcpActionExecutorInput } from "./useMcpActionExecutor";
import {
  MCP_TOOL_CATALOG_ACTION,
  MCP_TOOL_FILE_ACTION,
  MCP_TOOL_SET_PREFERENCES,
} from "../model/mcpToolNames";
import {
  catalogContentsFromEnvelope,
  validateMcpCatalogContents,
} from "../model/mcpCatalogAction";
import type { McpActionResult } from "./mcpActionExecutor";
import type { McpActionEnvelope } from "../model/mcpOperationGate";
import { DEFAULT_FILTERS } from "../model/filterChips";
import {
  checkScheduleFileChangedViaTauri,
  DISK_HASH_MISMATCH,
  resolveScheduleComparisonPath,
  saveScheduleAtPathViaTauri,
} from "../model/scheduleFile";
import { AUTO_UPDATE_LS_KEY, readAutoUpdateEnabled } from "../model/autoUpdate";
import { importMemberCatalog, readMemberCatalog } from "../model/memberAppData";
import { documentToJsonString } from "../model/serialize";
import { loadRegressionSchedule } from "../test/searchErrorKeysFixtures";
import type { ScheduleDocument, ScheduleFieldDef } from "../model/types";
import {
  EXCEL_EXPORT_COLUMNS_LS_KEY,
  DEFAULT_EXCEL_EXPORT_COLUMNS,
  writeExcelExportColumns,
} from "../model/excelExportColumns";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ setFocus: vi.fn(), label: "main" }),
}));

vi.mock("../model/scheduleFile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../model/scheduleFile")>();
  return {
    ...actual,
    resolveScheduleComparisonPath: vi.fn(),
    checkScheduleFileChangedViaTauri: vi.fn(),
    saveScheduleAtPathViaTauri: vi.fn(),
  };
});

const memory = new Map<string, string>();

function installLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
}

const savedDocument = (): ScheduleDocument =>
  structuredClone(loadRegressionSchedule("smoke.schedule.json"));

const canonicalJson = documentToJsonString(savedDocument());

function baseInput(
  overrides: Partial<UseMcpActionExecutorInput> = {},
): UseMcpActionExecutorInput {
  return {
    getDocument: () => savedDocument(),
    visibleRows: [],
    levels: null,
    replaceScheduleDocument: () => ({
      outcome: "unchanged",
      screenJson: canonicalJson,
    }),
    scheduleFilePath: null,
    getScheduleFilePath: () => null,
    fields: [],
    getCanonicalJson: () => canonicalJson,
    documentTitle: "T",
    setBaselineAfterSave: vi.fn(),
    isDirty: false,
    getIsDirty: () => false,
    openPathWithoutDialog: async () => ({ ok: true, text: "" }),
    getCollapsed: () => new Set(),
    getFilterViewState: () => ({
      filters: DEFAULT_FILTERS,
      searchField: "name" as const,
      hiddenMilestoneGroupIds: [],
      hiddenMilestoneIds: [],
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

async function memberCatalogSaveLikeApp(
  envelope: McpActionEnvelope,
): Promise<McpActionResult> {
  const contents = catalogContentsFromEnvelope(envelope);
  if (!contents.ok) return contents;
  const validated = validateMcpCatalogContents("members", contents.text);
  if (!validated.ok) return validated;
  if (envelope.save !== true) {
    return { ok: true, text: "内容を確認しました。ファイルは変えていません。" };
  }
  const catalogId =
    typeof envelope.catalogId === "string" ? envelope.catalogId : "team";
  await importMemberCatalog(catalogId, validated.canonical, envelope.overwrite === true);
  return { ok: true, text: catalogId };
}

const SAMPLE_FIELDS: ScheduleFieldDef[] = [
  { key: "score", name: "点数", type: "number" },
];

describe("useMcpActionExecutor file_action export", () => {
  beforeEach(() => {
    memory.clear();
    installLocalStorage();
  });

  afterEach(() => {
    memory.clear();
    vi.unstubAllGlobals();
  });

  it("file_action export passes resolved boolean excelColumns to runExport", async () => {
    writeExcelExportColumns({
      ...DEFAULT_EXCEL_EXPORT_COLUMNS,
      assignee: false,
    });
    const runExportMock = vi.fn(
      async () => ({ ok: true as const, text: "/tmp/out.xlsx" }),
    );
    const runExport = runExportMock as UseMcpActionExecutorInput["runExport"];
    const { result } = renderHook(() =>
      useMcpActionExecutor(
        baseInput({
          fields: SAMPLE_FIELDS,
          runExport,
        }),
      ),
    );
    const response = await executeMcpActionTool(
      MCP_TOOL_FILE_ACTION,
      {
        action: "export",
        format: "xlsx",
        path: "/tmp/out.xlsx",
        excelColumns: { assignee: true, progress: true },
      },
      result.current,
    );
    expect(response.ok).toBe(true);
    expect(runExportMock).toHaveBeenCalledWith(
      "xlsx",
      "/tmp/out.xlsx",
      {
        ...DEFAULT_EXCEL_EXPORT_COLUMNS,
        assignee: true,
        progress: true,
      },
      { score: false },
    );
    expect(memory.get(EXCEL_EXPORT_COLUMNS_LS_KEY)).toBe(
      JSON.stringify({ ...DEFAULT_EXCEL_EXPORT_COLUMNS, assignee: false }),
    );
  });

  it("file_action html export rejects excelColumns without calling runExport", async () => {
    const runExport = vi.fn(async () => ({ ok: true as const, text: "" }));
    const { result } = renderHook(() =>
      useMcpActionExecutor(baseInput({ runExport })),
    );
    const response = await executeMcpActionTool(
      MCP_TOOL_FILE_ACTION,
      {
        action: "export",
        format: "html",
        path: "/tmp/out.html",
        excelColumns: { note: true },
      },
      result.current,
    );
    expect(response.ok).toBe(false);
    expect(runExport).not.toHaveBeenCalled();
  });
});

describe("useMcpActionExecutor file_action", () => {
  beforeEach(() => {
    vi.mocked(resolveScheduleComparisonPath).mockReset();
    vi.mocked(checkScheduleFileChangedViaTauri).mockReset();
    vi.mocked(saveScheduleAtPathViaTauri).mockReset();
  });

  it("TC-MCP-425h: file_action save without a path returns 保存先がありません。", async () => {
    const { result } = renderHook(() => useMcpActionExecutor(baseInput()));
    vi.mocked(resolveScheduleComparisonPath).mockResolvedValue(null);
    const response = await executeMcpActionTool(
      MCP_TOOL_FILE_ACTION,
      { action: "save" },
      result.current,
    );
    expect(response).toEqual({ ok: false, message: "保存先がありません。" });
    expect(saveScheduleAtPathViaTauri).not.toHaveBeenCalled();
  });

  it("TC-MCP-425i: file_action save without overwrite or saveAs returns DISK_HASH_MISMATCH", async () => {
    const { result } = renderHook(() =>
      useMcpActionExecutor(
        baseInput({
          getScheduleFilePath: () => "/tmp/plan.schedule.json",
        }),
      ),
    );
    vi.mocked(resolveScheduleComparisonPath).mockResolvedValue("/tmp/plan.schedule.json");
    vi.mocked(checkScheduleFileChangedViaTauri).mockResolvedValue(true);
    const response = await executeMcpActionTool(
      MCP_TOOL_FILE_ACTION,
      { action: "save", path: "/tmp/plan.schedule.json" },
      result.current,
    );
    expect(response).toEqual({ ok: false, message: DISK_HASH_MISMATCH });
    expect(saveScheduleAtPathViaTauri).not.toHaveBeenCalled();
  });
});

describe("useMcpActionExecutor catalog_action", () => {
  beforeEach(() => {
    memory.clear();
    installLocalStorage();
  });

  afterEach(() => {
    memory.clear();
    vi.unstubAllGlobals();
  });

  it("TC-MCP-425e: catalog_action without save leaves the members file bytes", async () => {
    const original =
      '{"schemaVersion":1,"members":[{"id":"a","name":"田中"}]}';
    await importMemberCatalog("team", original, false);
    const { result } = renderHook(() =>
      useMcpActionExecutor(
        baseInput({
          memberCatalogSave: memberCatalogSaveLikeApp,
        }),
      ),
    );
    const response = await executeMcpActionTool(
      MCP_TOOL_CATALOG_ACTION,
      {
        catalog: "members",
        contents: {
          schemaVersion: 1,
          members: [{ id: "a", name: "別名" }],
        },
      },
      result.current,
    );
    expect(response.ok).toBe(true);
    expect((await readMemberCatalog("team"))?.members[0]?.name).toBe("田中");
    expect((await readMemberCatalog("team"))?.members[0]?.name).not.toBe("別名");
  });
});

describe("useMcpActionExecutor set_preferences", () => {
  beforeEach(() => {
    memory.clear();
    installLocalStorage();
    vi.mocked(checkScheduleFileChangedViaTauri).mockReset();
  });

  afterEach(() => {
    memory.clear();
    vi.unstubAllGlobals();
  });

  it("set_preferences on writes the auto update key and does not call check", async () => {
    const { result } = renderHook(() => useMcpActionExecutor(baseInput()));
    const response = await executeMcpActionTool(
      MCP_TOOL_SET_PREFERENCES,
      { autoUpdateEnabled: true },
      result.current,
    );
    expect(response.ok).toBe(true);
    expect(memory.get(AUTO_UPDATE_LS_KEY)).toBe("on");
    expect(readAutoUpdateEnabled()).toBe(true);
    expect(checkScheduleFileChangedViaTauri).not.toHaveBeenCalled();
  });
});

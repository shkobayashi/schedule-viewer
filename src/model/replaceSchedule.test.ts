import { describe, expect, it } from "vitest";
import { MCP_SCREEN_CONTEXT_MAX_BYTES } from "./screenContext";
import {
  REPLACE_SCHEDULE_DIFF_TOO_LARGE,
  REPLACE_SCHEDULE_INVALID_JSON,
  REPLACE_SCHEDULE_STARTUP_NOT_SETTLED,
  REPLACE_SCHEDULE_TOO_LARGE,
  REPLACE_SCHEDULE_UI_BUSY,
  assessMcpReplaceUiBlocking,
  assessReplaceScheduleGate,
  capReplaceScheduleDiffText,
  canonicalJsonEqual,
  parseReplaceScheduleArguments,
  parseReplaceScheduleText,
  replaceScheduleByteLength,
} from "./replaceSchedule";
import { MAX_SCHEDULE_BYTES, serializeScheduleDocument } from "./scheduleFile";

const validScheduleJson = JSON.stringify({
  schemaVersion: 8,
  title: "テスト",
  milestoneGroups: [{ id: "e1000001-0000-4000-8000-000000000011", name: "M" }],
  milestones: [
    {
      id: "a1000001-0000-4000-8000-000000000011",
      name: "MS",
      date: "2026-01-01",
      confidence: "committed",
      groupId: "e1000001-0000-4000-8000-000000000011",
    },
  ],
  categories: [
    {
      id: "c1000001-0000-4000-8000-000000000001",
      name: "C",
      groups: [
        {
          id: "d1000001-0000-4000-8000-000000000001",
          name: "G",
          tasks: [
            {
              id: "00000000-0000-4000-8000-000000000001",
              name: "T",
              start: "2026-01-01",
              end: "2026-01-02",
              assigneeId: null,
              status: "not-started",
              progress: 0,
              confidence: "committed",
              predecessors: [],
              milestoneId: null,
            },
          ],
        },
      ],
    },
  ],
});

describe("assessMcpReplaceUiBlocking", () => {
  const idle = {
    fileBusy: false,
    titleEditing: false,
    detailPanelEditing: false,
    scheduleInlineEditing: false,
    reorderDragging: false,
    sidebarReorderDragging: false,
    modalDialogOpen: false,
    externalReloadConflictDialogOpen: false,
  };

  it("blocks when a modal dialog is open", () => {
    expect(
      assessMcpReplaceUiBlocking({ ...idle, modalDialogOpen: true }),
    ).toBe(true);
  });

  it("does not block for modal when only external reload conflict dialog is open", () => {
    expect(
      assessMcpReplaceUiBlocking({
        ...idle,
        modalDialogOpen: true,
        externalReloadConflictDialogOpen: true,
      }),
    ).toBe(false);
  });

  it("still blocks other editing while external reload conflict dialog is open", () => {
    expect(
      assessMcpReplaceUiBlocking({
        ...idle,
        modalDialogOpen: true,
        externalReloadConflictDialogOpen: true,
        detailPanelEditing: true,
      }),
    ).toBe(true);
  });
});

describe("assessReplaceScheduleGate", () => {
  it("rejects before startup recovery settles", () => {
    expect(
      assessReplaceScheduleGate({
        startupSettled: false,
        startupRecoveryDialogOpen: false,
        uiBlocking: false,
      }),
    ).toEqual({ ok: false, message: REPLACE_SCHEDULE_STARTUP_NOT_SETTLED });
  });

  it("rejects when startup recovery dialog is open even if startup settled", () => {
    expect(
      assessReplaceScheduleGate({
        startupSettled: true,
        startupRecoveryDialogOpen: true,
        uiBlocking: false,
      }),
    ).toEqual({ ok: false, message: REPLACE_SCHEDULE_STARTUP_NOT_SETTLED });
  });

  it("rejects when UI is blocking even if startup settled", () => {
    expect(
      assessReplaceScheduleGate({
        startupSettled: true,
        startupRecoveryDialogOpen: false,
        uiBlocking: true,
      }),
    ).toEqual({ ok: false, message: REPLACE_SCHEDULE_UI_BUSY });
  });

  it("allows when startup settled and UI is not blocking", () => {
    expect(
      assessReplaceScheduleGate({
        startupSettled: true,
        startupRecoveryDialogOpen: false,
        uiBlocking: false,
      }),
    ).toEqual({ ok: true });
  });
});

describe("parseReplaceScheduleText", () => {
  it("rejects invalid JSON with replace-specific message", () => {
    expect(parseReplaceScheduleText("{")).toEqual({
      ok: false,
      message: REPLACE_SCHEDULE_INVALID_JSON,
    });
  });

  it("rejects payloads over MAX_SCHEDULE_BYTES", () => {
    const big = "x".repeat(MAX_SCHEDULE_BYTES + 1);
    expect(parseReplaceScheduleText(JSON.stringify({ x: big }))).toEqual({
      ok: false,
      message: REPLACE_SCHEDULE_TOO_LARGE,
    });
  });

  it("accepts valid schedule JSON from fixture", () => {
    const result = parseReplaceScheduleText(validScheduleJson);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("テスト");
    expect(result.canonicalJson.length).toBeGreaterThan(0);
  });

  it("returns open-file validation errors for semantic failures", () => {
    const broken = JSON.parse(validScheduleJson) as Record<string, unknown>;
    delete broken.title;
    const result = parseReplaceScheduleText(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).not.toBe(REPLACE_SCHEDULE_INVALID_JSON);
  });
});

describe("parseReplaceScheduleArguments", () => {
  it("parses object arguments as schedule document", () => {
    const data = JSON.parse(validScheduleJson) as Record<string, unknown>;
    const result = parseReplaceScheduleArguments(data);
    expect(result.ok).toBe(true);
  });

  it("rejects null arguments", () => {
    expect(parseReplaceScheduleArguments(null)).toEqual({
      ok: false,
      message: REPLACE_SCHEDULE_INVALID_JSON,
    });
  });
});

describe("canonicalJsonEqual", () => {
  it("treats identical canonical strings as same content", () => {
    const parsed = parseReplaceScheduleText(validScheduleJson);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(canonicalJsonEqual(parsed.canonicalJson, parsed.canonicalJson)).toBe(
      true,
    );
  });
});

describe("capReplaceScheduleDiffText", () => {
  it("returns diff text when within byte limit", () => {
    expect(capReplaceScheduleDiffText("hello", 10)).toEqual({
      text: "hello",
      diffOmitted: false,
    });
  });

  it("returns omission message without failing when over limit", () => {
    const huge = "あ".repeat(MCP_SCREEN_CONTEXT_MAX_BYTES);
    expect(replaceScheduleByteLength(huge)).toBeGreaterThan(
      MCP_SCREEN_CONTEXT_MAX_BYTES - 10,
    );
    const capped = capReplaceScheduleDiffText(huge);
    expect(capped.diffOmitted).toBe(true);
    expect(capped.text).toBe(REPLACE_SCHEDULE_DIFF_TOO_LARGE);
  });
});

describe("serialize round-trip", () => {
  it("canonical form ignores pretty-print differences", () => {
    const parsed = parseReplaceScheduleText(validScheduleJson);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const compact = serializeScheduleDocument(
      parsed.document.title,
      parsed.document.categories,
      parsed.document.milestoneGroups,
      parsed.document.milestones,
    );
    expect(canonicalJsonEqual(parsed.canonicalJson, compact)).toBe(true);
  });

  it("treats indent-only differences as the same schedule content", () => {
    const pretty = JSON.stringify(JSON.parse(validScheduleJson), null, 2);
    const compact = parseReplaceScheduleText(validScheduleJson);
    const indented = parseReplaceScheduleText(pretty);
    expect(compact.ok).toBe(true);
    expect(indented.ok).toBe(true);
    if (!compact.ok || !indented.ok) return;
    expect(canonicalJsonEqual(compact.canonicalJson, indented.canonicalJson)).toBe(
      true,
    );
  });
});

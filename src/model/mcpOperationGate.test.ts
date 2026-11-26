import { describe, expect, it } from "vitest";
import {
  MCP_OPERATION_FILE_BUSY,
  MCP_OPERATION_UI_BUSY,
  assessMcpOperationGate,
  assessMcpReplaceUiBlocking,
  assessMcpUiBlocking,
  parseMcpActionEnvelope,
  parseMcpActionStdinText,
} from "./mcpOperationGate";
import { REPLACE_SCHEDULE_STARTUP_NOT_SETTLED } from "./replaceSchedule";

describe("assessMcpUiBlocking", () => {
  const idle = {
    fileBusy: false,
    titleEditing: false,
    detailPanelEditing: false,
    scheduleInlineEditing: false,
    reorderDragging: false,
    sidebarReorderDragging: false,
    chartBarDragging: false,
    modalDialogOpen: false,
    externalReloadConflictDialogOpen: false,
  };

  it("blocks when chart bar is dragging", () => {
    expect(assessMcpUiBlocking({ ...idle, chartBarDragging: true })).toBe(true);
  });

  it("does not block replace when only external reload conflict dialog is open", () => {
    expect(
      assessMcpReplaceUiBlocking({
        ...idle,
        modalDialogOpen: true,
        externalReloadConflictDialogOpen: true,
      }),
    ).toBe(false);
  });

  it("blocks new operations when external reload conflict dialog is open", () => {
    expect(
      assessMcpUiBlocking({
        ...idle,
        modalDialogOpen: true,
        externalReloadConflictDialogOpen: true,
      }),
    ).toBe(true);
  });
});

describe("assessMcpOperationGate", () => {
  const settledIdle = {
    startupSettled: true,
    startupRecoveryDialogOpen: false,
    uiBlocking: false,
    discardInProgress: false,
    fileBusy: false,
  };

  it("rejects when startup is not settled", () => {
    expect(
      assessMcpOperationGate({
        ...settledIdle,
        startupSettled: false,
      }),
    ).toEqual({ ok: false, message: REPLACE_SCHEDULE_STARTUP_NOT_SETTLED });
  });

  it("rejects file busy even with discardInProgress", () => {
    expect(
      assessMcpOperationGate({
        ...settledIdle,
        fileBusy: true,
        discardInProgress: true,
      }),
    ).toEqual({ ok: false, message: MCP_OPERATION_FILE_BUSY });
  });

  it("rejects ui blocking without discardInProgress", () => {
    expect(
      assessMcpOperationGate({
        ...settledIdle,
        uiBlocking: true,
      }),
    ).toEqual({ ok: false, message: MCP_OPERATION_UI_BUSY });
  });

  it("allows ui blocking with discardInProgress", () => {
    expect(
      assessMcpOperationGate({
        ...settledIdle,
        uiBlocking: true,
        discardInProgress: true,
      }),
    ).toEqual({ ok: true, discardInProgress: true });
  });
});

describe("parseMcpActionEnvelope", () => {
  it("reads discardInProgress", () => {
    expect(
      parseMcpActionStdinText(
        JSON.stringify({ discardInProgress: true, action: "undo" }),
      ),
    ).toEqual({
      ok: true,
      envelope: { discardInProgress: true, action: "undo" },
    });
  });

  it("rejects non-boolean discardInProgress", () => {
    expect(
      parseMcpActionEnvelope({ discardInProgress: "yes" }).ok,
    ).toBe(false);
  });
});

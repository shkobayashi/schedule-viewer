import { describe, expect, it } from "vitest";
import {
  MCP_OPEN_NEW_WINDOW_DIAGNOSTIC_PHASES,
  validateMcpOpenNewWindowDiagnosticRecord,
  validateMcpOpenNewWindowWindowLabel,
} from "./mcpOpenNewWindowDiagnostic";

describe("mcpOpenNewWindowDiagnostic", () => {
  const requestId = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts allowlisted phases and rejects secrets or paths", () => {
    expect(
      validateMcpOpenNewWindowDiagnosticRecord({
        requestId,
        phase: "frontend-created",
        origin: "frontend",
        windowLabel: "schedule-3",
        handlerLabel: "main",
      }),
    ).toBe(true);
    expect(
      validateMcpOpenNewWindowDiagnosticRecord({
        requestId,
        phase: "frontend-created",
        origin: "frontend",
        windowLabel: "/tmp/plan.json",
      }),
    ).toBe(false);
    expect(
      validateMcpOpenNewWindowDiagnosticRecord({
        requestId,
        phase: "custom-phase" as (typeof MCP_OPEN_NEW_WINDOW_DIAGNOSTIC_PHASES)[number],
        origin: "frontend",
      }),
    ).toBe(false);
  });

  it("keeps window labels on the main and schedule-N pattern", () => {
    expect(validateMcpOpenNewWindowWindowLabel("main")).toBe(true);
    expect(validateMcpOpenNewWindowWindowLabel("schedule-12")).toBe(true);
    expect(validateMcpOpenNewWindowWindowLabel("schedule-x")).toBe(false);
  });
});

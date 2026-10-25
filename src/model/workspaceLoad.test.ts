import { describe, expect, it } from "vitest";
import { workspaceBindingSummary } from "./workspaceLoad";
import type { WorkspaceWindowBinding } from "./workspaceTypes";

function binding(
  partial: Partial<WorkspaceWindowBinding>,
): WorkspaceWindowBinding {
  return {
    workspacePath: "/proj/client/workspace.json",
    document: { schemaVersion: 1, schedule: "plan.json" },
    resolved: {
      schedulePath: "/proj/client/plan.json",
      membersPath: null,
      calendarPath: null,
    },
    members: { kind: "unset" },
    calendar: { kind: "unset" },
    ...partial,
  };
}

describe("workspaceBindingSummary", () => {
  it("shows 未選択 when members path is omitted", () => {
    const summary = workspaceBindingSummary(binding({}));
    expect(summary.membersLabel).toBe("未選択");
    expect(summary.calendarLabel).toBe("未設定（土日を塗る）");
  });
});

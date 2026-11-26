import { describe, expect, it } from "vitest";
import {
  workspaceBindingSummary,
  workspaceMergedFieldExtensionsForDisplay,
} from "./workspaceLoad";
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
      statusesPath: null,
      colorsPath: null,
      fieldExtensionPaths: [],
      editableFieldExtensionPath: null,
    },
    members: { kind: "unset" },
    calendar: { kind: "unset" },
    statuses: { kind: "unset" },
    colors: { kind: "unset" },
    fieldExtensions: { kind: "unset" },
    editableFieldExtension: { kind: "unset" },
    ...partial,
  };
}

describe("workspaceBindingSummary", () => {
  it("shows 未選択 when members path is omitted", () => {
    const summary = workspaceBindingSummary(binding({}));
    expect(summary.membersLabel).toBe("未選択");
    expect(summary.calendarLabel).toBe("未設定（土日を塗る）");
    expect(summary.statusesLabel).toBe("組み込みの三件");
  });
});

describe("workspaceMergedFieldExtensionsForDisplay", () => {
  const pinnedDoc = {
    schemaVersion: 1 as const,
    id: "risk",
    name: "リスク",
    fields: [{ id: "score", name: "点数", type: "number" as const }],
  };
  const editableDoc = {
    schemaVersion: 1 as const,
    id: "custom",
    name: "編集用",
    fields: [{ id: "note", name: "メモ", type: "text" as const }],
  };

  it("returns pinned only when editable is unset", () => {
    const merged = workspaceMergedFieldExtensionsForDisplay(
      {
        kind: "loaded",
        documents: [pinnedDoc],
        paths: ["/proj/client/risk.fields.json"],
      },
      { kind: "unset" },
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("risk");
  });

  it("appends editable after pinned when loaded", () => {
    const merged = workspaceMergedFieldExtensionsForDisplay(
      {
        kind: "loaded",
        documents: [pinnedDoc],
        paths: ["/proj/client/risk.fields.json"],
      },
      {
        kind: "loaded",
        document: editableDoc,
        path: "/proj/client/custom.fields.json",
        relativePath: "custom.fields.json",
      },
    );
    expect(merged.map((d) => d.id)).toEqual(["risk", "custom"]);
  });

  it("keeps pinned when editable failed to load", () => {
    const merged = workspaceMergedFieldExtensionsForDisplay(
      {
        kind: "loaded",
        documents: [pinnedDoc],
        paths: ["/proj/client/risk.fields.json"],
      },
      { kind: "error", message: "読み込めません" },
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("risk");
  });
});

import { describe, expect, it } from "vitest";
import {
  classifyOpenedJson,
  parseWorkspaceText,
  resolveWorkspacePaths,
} from "./workspaceJson";

describe("workspaceJson", () => {
  it("classifies workspace without categories", () => {
    expect(
      classifyOpenedJson({
        schemaVersion: 1,
        schedule: "plan.json",
      }),
    ).toBe("workspace");
    expect(
      classifyOpenedJson({
        schemaVersion: 7,
        title: "t",
        categories: [],
        milestones: [],
        milestoneGroups: [],
      }),
    ).toBe("schedule");
  });

  it("parses valid workspace", () => {
    const result = parseWorkspaceText(
      JSON.stringify({ schemaVersion: 1, schedule: "plan.json" }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects absolute schedule path", () => {
    const result = parseWorkspaceText(
      JSON.stringify({ schemaVersion: 1, schedule: "/abs/plan.json" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects schedule path ending with a separator", () => {
    const result = parseWorkspaceText(
      JSON.stringify({ schemaVersion: 1, schedule: "plan.json/" }),
    );
    expect(result.ok).toBe(false);
  });

  it("resolves optional members and calendar", () => {
    const doc = {
      schemaVersion: 1 as const,
      schedule: "plan.json",
      members: "team.json",
    };
    const resolved = resolveWorkspacePaths("/data/ws/workspace.json", doc);
    expect(resolved).toEqual({
      schedulePath: "/data/ws/plan.json",
      membersPath: "/data/ws/team.json",
      colorsPath: null,
      calendarPath: null,
      statusesPath: null,
      fieldExtensionPaths: [],
      editableFieldExtensionPath: null,
    });
  });

  it("rejects editable path duplicated in fieldExtensions", () => {
    const result = parseWorkspaceText(
      JSON.stringify({
        schemaVersion: 1,
        schedule: "plan.json",
        fieldExtensions: ["a.fields.json"],
        editableFieldExtension: "a.fields.json",
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("resolves optional statuses path", () => {
    const doc = {
      schemaVersion: 1 as const,
      schedule: "plan.json",
      statuses: "team.statuses.json",
    };
    const resolved = resolveWorkspacePaths("/data/ws/workspace.json", doc);
    expect(resolved?.statusesPath).toBe("/data/ws/team.statuses.json");
  });
});

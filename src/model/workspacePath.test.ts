import { describe, expect, it } from "vitest";
import {
  isWorkspaceRelativePath,
  resolveWorkspaceRelativePath,
} from "./workspacePath";

describe("workspacePath", () => {
  it("rejects absolute paths", () => {
    expect(isWorkspaceRelativePath("/tmp/a.json")).toBe(false);
    expect(isWorkspaceRelativePath("C:\\proj\\a.json")).toBe(false);
  });

  it("rejects trailing directory separators", () => {
    expect(isWorkspaceRelativePath("plan.json/")).toBe(false);
    expect(isWorkspaceRelativePath("plan.json\\")).toBe(false);
  });

  it("resolves relative paths with parent segments", () => {
    expect(
      resolveWorkspaceRelativePath("/proj/workspace.json", "sched/plan.json"),
    ).toBe("/proj/sched/plan.json");
    expect(
      resolveWorkspaceRelativePath("/proj/ws/workspace.json", "../shared/m.json"),
    ).toBe("/proj/shared/m.json");
  });
});

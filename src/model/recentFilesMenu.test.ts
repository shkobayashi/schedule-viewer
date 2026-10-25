import { describe, expect, it } from "vitest";
import {
  hasRecentMenuItems,
  recentMenuCommandPalettePrefix,
  recentMenuItemAriaLabel,
  recentMenuSections,
} from "./recentFilesMenu";

describe("recentFilesMenu", () => {
  it("returns sections only for non-empty lists", () => {
    expect(
      recentMenuSections({
        schedules: ["/a/plan.json"],
        workspaces: [],
      }),
    ).toEqual([
      {
        heading: "スケジュール",
        items: [{ path: "/a/plan.json", label: "plan.json", kind: "schedule" }],
      },
    ]);
    expect(
      recentMenuSections({
        schedules: [],
        workspaces: ["/b/workspace.json"],
      }),
    ).toEqual([
      {
        heading: "設定ファイル",
        items: [
          {
            path: "/b/workspace.json",
            label: "workspace.json",
            kind: "workspace",
          },
        ],
      },
    ]);
  });

  it("orders schedule before workspace", () => {
    const sections = recentMenuSections({
      schedules: ["/a/s.json"],
      workspaces: ["/b/w.json"],
    });
    expect(sections.map((s) => s.heading)).toEqual([
      "スケジュール",
      "設定ファイル",
    ]);
  });

  it("builds aria and palette prefixes", () => {
    expect(
      recentMenuItemAriaLabel({
        path: "/a.json",
        label: "a.json",
        kind: "workspace",
      }),
    ).toBe("設定ファイル a.json");
    expect(recentMenuCommandPalettePrefix("schedule")).toBe("スケジュール ");
    expect(recentMenuCommandPalettePrefix("workspace")).toBe("設定ファイル ");
  });

  it("detects empty store", () => {
    expect(
      hasRecentMenuItems({ schedules: [], workspaces: [] }),
    ).toBe(false);
  });
});

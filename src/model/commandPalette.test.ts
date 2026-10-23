import { describe, expect, it } from "vitest";
import {
  buildCommandPaletteItems,
  filterCommandPaletteItems,
  moveCommandPaletteHighlight,
} from "./commandPalette";

const idle = {
  fileBusy: false,
  isTauriDesktop: false,
  recentFilePaths: [],
  storeDistribution: false,
  canUndo: true,
  canRedo: false,
  selectedTaskId: "t1",
  selectedTaskCount: 1,
  linkSourceId: null,
  lineageActive: false,
};

describe("filterCommandPaletteItems", () => {
  it("returns all items for empty query", () => {
    const items = buildCommandPaletteItems(idle);
    expect(filterCommandPaletteItems(items, "").length).toBe(items.length);
  });

  it("matches label substring", () => {
    const items = buildCommandPaletteItems(idle);
    const filtered = filterCommandPaletteItems(items, "差分");
    expect(
      filtered
        .filter((item) => item.kind === "command")
        .map((item) => item.id),
    ).toEqual(["showDiff", "copyDiff"]);
  });
});

describe("moveCommandPaletteHighlight", () => {
  it("wraps at ends", () => {
    expect(moveCommandPaletteHighlight(0, -1, 3)).toBe(2);
    expect(moveCommandPaletteHighlight(2, 1, 3)).toBe(0);
  });
});

describe("buildCommandPaletteItems", () => {
  it("hides open in a new window outside the desktop app", () => {
    const commandId = (item: { kind: string; id?: string }) =>
      item.kind === "command" ? item.id : null;
    expect(
      buildCommandPaletteItems(idle).some(
        (item) => commandId(item) === "openNewWindow",
      ),
    ).toBe(false);
    expect(
      buildCommandPaletteItems({ ...idle, isTauriDesktop: true }).some(
        (item) => commandId(item) === "openNewWindow",
      ),
    ).toBe(true);
  });

  it("disables file commands when busy", () => {
    const items = buildCommandPaletteItems({ ...idle, fileBusy: true });
    expect(
      items.find((item) => item.kind === "command" && item.id === "open")?.enabled,
    ).toBe(false);
    expect(
      items.find((item) => item.kind === "command" && item.id === "editTitle")
        ?.enabled,
    ).toBe(false);
    expect(
      items.find((item) => item.kind === "command" && item.id === "find")?.enabled,
    ).toBe(true);
  });

  it("includes edit title command", () => {
    const items = buildCommandPaletteItems(idle);
    expect(
      items.find((item) => item.kind === "command" && item.id === "editTitle")
        ?.label,
    ).toBe("タイトルを変更");
  });

  it("disables add and duplicate commands in link mode without selection", () => {
    const linked = buildCommandPaletteItems({ ...idle, linkSourceId: "t1" });
    expect(
      linked.find((item) => item.kind === "command" && item.id === "addTask")
        ?.enabled,
    ).toBe(false);
    expect(
      linked.find(
        (item) => item.kind === "command" && item.id === "addMilestone",
      )?.enabled,
    ).toBe(false);
    expect(
      linked.find(
        (item) => item.kind === "command" && item.id === "duplicateTask",
      )?.enabled,
    ).toBe(false);
    const noSelection = buildCommandPaletteItems({
      ...idle,
      selectedTaskId: null,
      selectedTaskCount: 0,
    });
    expect(
      noSelection.find(
        (item) => item.kind === "command" && item.id === "duplicateTask",
      )?.enabled,
    ).toBe(false);
    expect(
      noSelection.find((item) => item.kind === "command" && item.id === "addTask")
        ?.enabled,
    ).toBe(true);
  });

  it("inserts recent files after open on desktop", () => {
    const items = buildCommandPaletteItems({
      ...idle,
      isTauriDesktop: true,
      recentFilePaths: ["/x/a.json", "/y/b.json"],
    });
    const labels = items.map((item) => item.label);
    expect(labels.slice(0, 4)).toEqual([
      "開く",
      "最近開いたファイル a.json",
      "最近開いたファイル b.json",
      "履歴を消す",
    ]);
    expect(labels[4]).toBe("新しいウィンドウで開く");
  });

  it("keeps recent open enabled while busy but disables open from history", () => {
    const items = buildCommandPaletteItems({
      ...idle,
      isTauriDesktop: true,
      fileBusy: true,
      recentFilePaths: ["/x/a.json"],
    });
    expect(
      items.find((item) => item.kind === "openRecent")?.enabled,
    ).toBe(false);
    expect(
      items.find(
        (item) => item.kind === "command" && item.id === "clearRecentHistory",
      )?.enabled,
    ).toBe(true);
  });

  it("omits recent entries when empty or not desktop", () => {
    expect(
      buildCommandPaletteItems({
        ...idle,
        isTauriDesktop: true,
        recentFilePaths: [],
      }).some((item) => item.kind === "openRecent"),
    ).toBe(false);
    expect(
      buildCommandPaletteItems({
        ...idle,
        recentFilePaths: ["/a.json"],
      }).some((item) => item.kind === "openRecent"),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  appendRecentFile,
  appendRecentWorkspace,
  parseRecentFilesJson,
  parseRecentFilesStore,
  recentFileMenuEntries,
} from "./recentFiles";

describe("appendRecentFile", () => {
  it("prepends a new path", () => {
    expect(appendRecentFile(["/a/x.json", "/b/y.json"], "/c/z.json")).toEqual([
      "/c/z.json",
      "/a/x.json",
      "/b/y.json",
    ]);
  });

  it("dedupes by schedulePathKey and keeps the opened path string", () => {
    expect(
      appendRecentFile(["C:\\proj\\Schedule.JSON"], "C:\\proj\\schedule.json"),
    ).toEqual(["C:\\proj\\schedule.json"]);
  });

  it("keeps different directory casing as separate entries", () => {
    expect(
      appendRecentFile([], "/Users/foo/a.json"),
    ).toEqual(["/Users/foo/a.json"]);
    expect(
      appendRecentFile(["/Users/foo/a.json"], "/users/foo/b.json"),
    ).toEqual(["/users/foo/b.json", "/Users/foo/a.json"]);
  });

  it("drops the oldest on the sixth add", () => {
    const five = ["/0.json", "/1.json", "/2.json", "/3.json", "/4.json"];
    expect(appendRecentFile(five, "/5.json")).toEqual([
      "/5.json",
      "/0.json",
      "/1.json",
      "/2.json",
      "/3.json",
    ]);
  });

  it("ignores empty and relative paths", () => {
    expect(appendRecentFile(["/a.json"], "")).toEqual(["/a.json"]);
    expect(appendRecentFile(["/a.json"], "relative.json")).toEqual(["/a.json"]);
  });
});

describe("parseRecentFilesStore", () => {
  it("reads legacy array as schedules only", () => {
    expect(parseRecentFilesStore('["/a.json"]')).toEqual({
      schedules: ["/a.json"],
      workspaces: [],
    });
  });

  it("reads split object", () => {
    expect(
      parseRecentFilesStore(
        '{"schedules":["/a.json"],"workspaces":["/w.json"]}',
      ),
    ).toEqual({
      schedules: ["/a.json"],
      workspaces: ["/w.json"],
    });
  });

  it("tracks workspaces separately", () => {
    const store = appendRecentWorkspace(
      { schedules: [], workspaces: ["/old.json"] },
      "/new.json",
    );
    expect(store.workspaces).toEqual(["/new.json", "/old.json"]);
  });
});

describe("parseRecentFilesJson", () => {
  it("returns empty for non-array, bad elements, and more than five items", () => {
    expect(parseRecentFilesJson("{}")).toEqual([]);
    expect(parseRecentFilesJson('["/a.json", 1]')).toEqual([]);
    expect(
      parseRecentFilesJson(
        '["/1.json","/2.json","/3.json","/4.json","/5.json","/6.json"]',
      ),
    ).toEqual([]);
  });

  it("accepts up to five absolute paths", () => {
    expect(parseRecentFilesJson('["/a.json","C:\\\\b.json"]')).toEqual([
      "/a.json",
      "C:\\b.json",
    ]);
  });
});

describe("recentFileMenuEntries", () => {
  it("uses filenames only when all differ", () => {
    expect(
      recentFileMenuEntries(["/x/a.json", "/y/b.json"]).map((e) => e.label),
    ).toEqual(["a.json", "b.json"]);
  });

  it("adds parent folder only for duplicate filenames", () => {
    expect(
      recentFileMenuEntries([
        "/projects/foo/schedule.json",
        "/work/archive/schedule.json",
        "/only/one.json",
      ]).map((e) => e.label),
    ).toEqual([
      "schedule.json（foo）",
      "schedule.json（archive）",
      "one.json",
    ]);
  });

  it("keeps filename when parent folder cannot be derived", () => {
    expect(recentFileMenuEntries(["schedule.json"]).map((e) => e.label)).toEqual([
      "schedule.json",
    ]);
  });
});

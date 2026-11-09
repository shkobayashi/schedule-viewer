import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  appendOutlineChildBranch,
  appendOutlineHeadingAtLevel,
  renameOutlineBranch,
} from "../model/outlineCrud";
import { parseScheduleText } from "../model/scheduleFile";
import { validateSchedule } from "../model/validateSchedule";
import type { ScheduleDocument } from "../model/types";
import { openHeadlessSchedule, type HeadlessSchedule } from "./headlessScheduleSession";
import { commitDocument } from "./headlessScheduleSessionTestUtil";

const HIERARCHY_DIR = `${import.meta.dirname}/../../examples/hierarchy`;

type HierarchyFixture = {
  file: string;
  levelIndex: number;
  parentBranchId: string | null;
  headingName: string;
  expectNoCategoriesKey?: boolean;
};

const FIXTURES: HierarchyFixture[] = [
  {
    file: "levels-2.schedule.json",
    levelIndex: 0,
    parentBranchId: null,
    headingName: "回帰・南ブロック",
  },
  {
    file: "levels-3.schedule.json",
    levelIndex: 0,
    parentBranchId: null,
    headingName: "回帰・追加工程",
    expectNoCategoriesKey: true,
  },
  {
    file: "levels-4.schedule.json",
    levelIndex: 0,
    parentBranchId: null,
    headingName: "回帰・事業乙",
  },
  {
    file: "levels-5.schedule.json",
    levelIndex: 0,
    parentBranchId: null,
    headingName: "回帰・事業丙",
  },
];

function openHierarchy(file: string): HeadlessSchedule {
  return openHeadlessSchedule(readFileSync(`${HIERARCHY_DIR}/${file}`, "utf8"));
}

function allocateOutlineId(): () => string {
  let seq = 0;
  return () =>
    `a1000001-0000-4000-8000-${(0x9000 + ++seq).toString(16).padStart(12, "0")}`;
}

function outlineHasName(
  outline: NonNullable<ScheduleDocument["outline"]>,
  name: string,
): boolean {
  const walk = (nodes: typeof outline): boolean => {
    for (const node of nodes) {
      if ("children" in node) {
        if (node.name === name) return true;
        if (walk(node.children)) return true;
      }
    }
    return false;
  };
  return walk(outline);
}

const APPEND_HEADING_COMMIT_TITLES: readonly [string, HierarchyFixture][] = [
  [
    "appendOutlineHeadingAtLevel on levels-2.schedule.json commits, saves, and parses",
    FIXTURES[0]!,
  ],
  [
    "appendOutlineHeadingAtLevel on levels-3.schedule.json commits, saves, and parses",
    FIXTURES[1]!,
  ],
  [
    "appendOutlineHeadingAtLevel on levels-4.schedule.json commits, saves, and parses",
    FIXTURES[2]!,
  ],
  [
    "appendOutlineHeadingAtLevel on levels-5.schedule.json commits, saves, and parses",
    FIXTURES[3]!,
  ],
];

describe("headlessScheduleSession hierarchy regression", () => {
  it.each(APPEND_HEADING_COMMIT_TITLES)("%s", async (_title, fixture) => {
      const session = openHierarchy(fixture.file);
      const document = session.getDocument();
      const levels = document.levels ?? [];
      const outline = document.outline ?? [];
      const allocateId = allocateOutlineId();
      const result = appendOutlineHeadingAtLevel(
        outline,
        levels.length,
        levels,
        fixture.levelIndex,
        fixture.parentBranchId,
        fixture.headingName,
        allocateId(),
        allocateId,
      );
      expect(result.error).toBeNull();
      await commitDocument(session, { ...document, outline: result.outline });
      const saved = await session.run({ tool: "save" });
      expect(saved.ok).toBe(true);
      const parsed = parseScheduleText(saved.savedJson);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(
        parsed.document.outline?.some((node) => node.name === fixture.headingName),
      ).toBe(true);
      if (fixture.expectNoCategoriesKey) {
        expect(saved.savedJson).not.toContain('"categories"');
        expect(parsed.document.categories).toEqual([]);
      }
  });

  it("TC-HIER-06: levels-2 empty heading children still validates after save", async () => {
    const session = openHierarchy("levels-2.schedule.json");
    const document = session.getDocument();
    const levels = document.levels ?? [];
    const outline = document.outline ?? [];
    const allocateId = allocateOutlineId();
    const result = appendOutlineHeadingAtLevel(
      outline,
      levels.length,
      levels,
      0,
      null,
      "空の枝",
      allocateId(),
      allocateId,
    );
    expect(result.error).toBeNull();
    const added = result.outline.find((node) => node.name === "空の枝");
    expect(added).toBeDefined();
    await commitDocument(session, { ...document, outline: result.outline });
    const saved = await session.run({ tool: "save" });
    const parsed = parseScheduleText(saved.savedJson);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(validateSchedule(parsed.document).ok).toBe(true);
  });

  it("MX-O-97: appendOutlineChildBranch and undo", async () => {
    const session = openHierarchy("levels-3.schedule.json");
    const document = session.getDocument();
    const levels = document.levels ?? [];
    const outline = document.outline ?? [];
    const parentId = outline[0]!.id;
    const allocateId = allocateOutlineId();
    const result = appendOutlineChildBranch(
      outline,
      parentId,
      levels.length,
      levels,
      "回帰子枝",
      allocateId(),
      allocateId,
    );
    expect(result.error).toBeNull();
    await commitDocument(session, { ...document, outline: result.outline });
    expect(outlineHasName(session.getDocument().outline ?? [], "回帰子枝")).toBe(
      true,
    );
    const undone = await session.run({ tool: "history", action: "undo" });
    expect(undone.ok).toBe(true);
    expect(outlineHasName(session.getDocument().outline ?? [], "回帰子枝")).toBe(
      false,
    );
  });

  it("MX-O-95: renameOutlineBranch and undo", async () => {
    const session = openHierarchy("levels-2.schedule.json");
    const document = session.getDocument();
    const outline = document.outline ?? [];
    const branchId = outline[0]!.id;
    const renamed = renameOutlineBranch(outline, branchId, "  改めた北  ");
    expect(renamed.changed).toBe(true);
    await commitDocument(session, { ...document, outline: renamed.outline });
    expect(session.getDocument().outline?.[0]?.name).toBe("改めた北");
    const undone = await session.run({ tool: "history", action: "undo" });
    expect(undone.ok).toBe(true);
    expect(session.getDocument().outline?.[0]?.name).toBe("北ブロック");
  });
});

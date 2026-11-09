import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DocumentSnapshot } from "../model/history";
import {
  applyLevelEditorCommit,
  assessHierarchySave,
  HIERARCHY_SAVE_MISMATCH_MESSAGE,
  isLevelDraftComplete,
  levelDefsForEditor,
} from "../model/hierarchyLevelEdit";
import type { ScheduleDocument } from "../model/types";
import { openHeadlessSchedule } from "./headlessScheduleSession";
import { commitDocument } from "./headlessScheduleSessionTestUtil";

const LEVELS_3 = `${import.meta.dirname}/../../examples/hierarchy/levels-3.schedule.json`;
const LEVELS_3_ORIGINAL = readFileSync(LEVELS_3, "utf8");

function snapshotFromDoc(doc: ScheduleDocument): DocumentSnapshot {
  return {
    title: doc.title,
    categories: doc.categories,
    milestoneGroups: doc.milestoneGroups,
    milestones: doc.milestones,
    connections: doc.connections,
    levels: doc.levels,
    outline: doc.outline,
  };
}

describe("headlessScheduleSession levels regression", () => {
  it("isLevelDraftComplete rejects empty meaning", () => {
    expect(isLevelDraftComplete([{ name: "工程", meaning: " " }])).toBe(false);
    expect(
      isLevelDraftComplete([{ name: "工程", meaning: "意味", instruction: "" }]),
    ).toBe(true);
  });

  it("assessHierarchySave rejects level count mismatch", () => {
    const session = openHeadlessSchedule(LEVELS_3_ORIGINAL);
    const document = session.getDocument();
    const draft = [
      ...levelDefsForEditor(document),
      { name: "余分", meaning: "多い段" },
    ];
    const { next } = applyLevelEditorCommit(snapshotFromDoc(document), draft, true);
    const gate = assessHierarchySave({
      ...document,
      levels: next.levels,
      outline: next.outline,
      categories: next.categories,
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.message).toBe(HIERARCHY_SAVE_MISMATCH_MESSAGE);
    }
  });

  it("applyLevelEditorCommit keeps 回帰の指示 in saved file but not in example source", async () => {
    expect(LEVELS_3_ORIGINAL).not.toContain("回帰の指示");
    const session = openHeadlessSchedule(LEVELS_3_ORIGINAL);
    const document = session.getDocument();
    const draft = levelDefsForEditor(document).map((level, index) =>
      index === 0 ? { ...level, instruction: "回帰の指示" } : level,
    );
    const { next } = applyLevelEditorCommit(snapshotFromDoc(document), draft, true);
    await commitDocument(session, {
      ...document,
      levels: next.levels,
      outline: next.outline,
      categories: next.categories,
    });
    const saved = await session.run({ tool: "save" });
    expect(saved.savedJson).toContain("回帰の指示");
    expect(LEVELS_3_ORIGINAL).not.toContain("回帰の指示");
    expect(session.getDocument().levels?.[0]?.instruction).toBe("回帰の指示");
  });
});

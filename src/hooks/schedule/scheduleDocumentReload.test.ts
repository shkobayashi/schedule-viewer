import { describe, expect, it } from "vitest";
import type { DocumentSnapshot } from "../../model/history";
import {
  hiddenMilestoneGroupsAfterReload,
  hiddenMilestoneMarksAfterReload,
} from "./scheduleDocumentReload";

const emptySnap = (): DocumentSnapshot => ({
  title: "T",
  categories: [],
  milestoneGroups: [{ id: "g1", name: "G1" }],
  milestones: [{ id: "m1", groupId: "g1", name: "M1", date: "2026-01-01", confidence: "committed" }],
});

describe("scheduleDocumentReload", () => {
  it("drops hidden milestone groups that are gone after reload", () => {
    const snap = emptySnap();
    expect(hiddenMilestoneGroupsAfterReload(["g1", "gone"], snap)).toEqual(["g1"]);
  });

  it("drops hidden milestone marks that are gone after reload", () => {
    const snap = emptySnap();
    expect(hiddenMilestoneMarksAfterReload(["m1", "gone"], snap)).toEqual(["m1"]);
  });
});

import { describe, expect, it } from "vitest";
import { cloneSnapshot, type DocumentSnapshot } from "./documentSnapshot";
import { documentToJson } from "./serialize";
import { snapshotsEqual } from "./history";

const snapshot: DocumentSnapshot = {
  title: "t",
  categories: [],
  milestoneGroups: [],
  milestones: [],
};

describe("documentSnapshot", () => {
  it("cloneSnapshot preserves documentToJson equality", () => {
    const cloned = cloneSnapshot(snapshot);
    expect(snapshotsEqual(snapshot, cloned)).toBe(true);
    expect(documentToJson(snapshot)).toEqual(documentToJson(cloned));
  });
});

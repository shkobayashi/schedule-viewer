import { describe, expect, it } from "vitest";
import { applyTaskColorId } from "./taskColorId";
import type { Task } from "./types";

const base: Task = {
  id: "t1",
  name: "作業",
  start: "2026-01-01",
  end: "2026-01-02",
  assigneeIds: [],
  status: "not-started",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
  colorId: "focus",
};

describe("applyTaskColorId", () => {
  it("keeps colorId when patch omits the key", () => {
    expect(applyTaskColorId(base, {})).toEqual(base);
  });

  it("sets colorId from patch", () => {
    expect(applyTaskColorId(base, { colorId: "wait" }).colorId).toBe("wait");
  });

  it("removes colorId when patch is null", () => {
    const next = applyTaskColorId(base, { colorId: null });
    expect("colorId" in next).toBe(false);
  });
});

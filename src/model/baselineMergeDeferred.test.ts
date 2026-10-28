import { describe, expect, it } from "vitest";
import {
  createBaselineMergeDeferredTracking,
  shouldClearExternalReloadBanner,
  shouldRestoreExternalReloadBanner,
} from "./baselineMergeDeferred";
import type { DocumentSnapshot } from "./history";

function snapshot(name: string): DocumentSnapshot {
  const task = {
    id: "00000000-0000-4000-8000-000000000001",
    name,
    start: "2026-01-01",
    end: "2026-01-02",
    assigneeIds: [],
    status: "not-started" as const,
    progress: 0,
    confidence: "committed" as const,
    predecessors: [] as string[],
    milestoneId: null,
  };
  return {
    title: "計画",
    categories: [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "G",
            tasks: [task],
          },
        ],
      },
    ],
    milestoneGroups: [],
    milestones: [],
  };
}

describe("baselineMergeDeferred", () => {
  it("restores the banner only when undo lands on the pre-merge document", () => {
    const before = snapshot("Alpha");
    const after = snapshot("Beta");
    const tracking = createBaselineMergeDeferredTracking(
      before,
      after,
      '{"disk":true}',
    );
    expect(shouldRestoreExternalReloadBanner(tracking, before)).toBe(true);
    expect(shouldRestoreExternalReloadBanner(tracking, after)).toBe(false);
    expect(shouldRestoreExternalReloadBanner(tracking, snapshot("Gamma"))).toBe(
      false,
    );
  });

  it("clears the banner only when redo lands on the post-merge document", () => {
    const before = snapshot("Alpha");
    const after = snapshot("Beta");
    const tracking = createBaselineMergeDeferredTracking(
      before,
      after,
      '{"disk":true}',
    );
    expect(shouldClearExternalReloadBanner(tracking, after)).toBe(true);
    expect(shouldClearExternalReloadBanner(tracking, before)).toBe(false);
    expect(shouldClearExternalReloadBanner(tracking, snapshot("Gamma"))).toBe(
      false,
    );
  });
});

import { describe, expect, it } from "vitest";
import { assignExplainOverlayLiveAnchorsRef } from "./timelineExplainLiveAnchorsRef";
import type { ScheduleId } from "./types";

describe("assignExplainOverlayLiveAnchorsRef", () => {
  it("replaces the ref map with live anchors", () => {
    const id = "00000000-0000-4000-8000-000000000001" as ScheduleId;
    const live = new Map([
      [id, { x: 1, right: 10, y: 5, linkRight: 10 }],
    ]);
    const ref = { current: new Map() };
    assignExplainOverlayLiveAnchorsRef(ref, live);
    expect(ref.current.get(id)?.x).toBe(1);
  });
});

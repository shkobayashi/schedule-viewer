import { describe, expect, it } from "vitest";
import { buildTimelineLinkPreviewPoints } from "./timelineLinkPreviewPoints";
import type { TimelineLiveAnchor } from "./timelineLiveAnchors";
import type { ScheduleId } from "./types";

describe("buildTimelineLinkPreviewPoints", () => {
  it("returns null without source or preview end", () => {
    const anchors = new Map<ScheduleId, TimelineLiveAnchor>();
    expect(
      buildTimelineLinkPreviewPoints({
        linkSourceId: null,
        previewEnd: { x: 1, y: 2 },
        liveAnchors: anchors,
        barHeight: 16,
      }),
    ).toBeNull();
  });

  it("builds polyline points from linkRight to preview", () => {
    const id = "00000000-0000-4000-8000-000000000001" as ScheduleId;
    const anchors = new Map<ScheduleId, TimelineLiveAnchor>([
      [id, { x: 10, right: 40, y: 20, linkRight: 40 }],
    ]);
    const points = buildTimelineLinkPreviewPoints({
      linkSourceId: id,
      previewEnd: { x: 100, y: 30 },
      liveAnchors: anchors,
      barHeight: 16,
    });
    expect(points).not.toBeNull();
    expect(points!.length).toBeGreaterThanOrEqual(4);
    expect(points![0]).toBe(40);
  });
});

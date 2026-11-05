import { describe, expect, it } from "vitest";
import { TimelineConnectionArcs } from "./TimelineConnectionArcs";
import { TimelineDragDateLabels } from "./TimelineDragDateLabels";
import {
  TimelineLinkPreviewArrow,
  TimelinePredecessorLinks,
} from "./TimelineConnectionLinks";

describe("timeline pointer and link modules", () => {
  it("exports drag-date and link Konva components", () => {
    expect(typeof TimelineDragDateLabels).toBe("function");
    expect(typeof TimelinePredecessorLinks).toBe("function");
    expect(typeof TimelineLinkPreviewArrow).toBe("function");
    expect(typeof TimelineConnectionArcs).toBe("function");
  });
});

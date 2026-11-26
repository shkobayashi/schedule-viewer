import { describe, expect, it } from "vitest";
import { TimelineSummaryBar } from "./TimelineSummaryBar";
import { TimelineTaskBar } from "./TimelineTaskBar";
import { TimelineResizeHandles } from "./TimelineResizeHandles";
import {
  TASK_BAR_HANDLE_WIDTH,
  exclusiveResizeHit,
  swallowResizeClick,
} from "./timelineBarResizeHit";

describe("timeline task bar modules", () => {
  it("exports Konva bar components and shared resize helpers", () => {
    expect(typeof TimelineSummaryBar).toBe("function");
    expect(typeof TimelineTaskBar).toBe("function");
    expect(typeof TimelineResizeHandles).toBe("function");
    expect(TASK_BAR_HANDLE_WIDTH).toBeGreaterThan(0);
    expect(typeof exclusiveResizeHit).toBe("function");
    expect(typeof swallowResizeClick).toBe("function");
  });
});

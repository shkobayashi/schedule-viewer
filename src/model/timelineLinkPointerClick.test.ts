import { describe, expect, it } from "vitest";
import {
  shouldFireTimelineLinkPointerClick,
  TIMELINE_LINK_DOUBLE_CLICK_MS,
} from "./timelineLinkPointerClick";

describe("timelineLinkPointerClick", () => {
  it("rejects browser double-click detail", () => {
    expect(
      shouldFireTimelineLinkPointerClick({
        taskId: "t1",
        eventClickDetail: 2,
        lastFire: null,
        now: 1000,
      }),
    ).toBe(false);
  });

  it("allows pointerup detail zero and single click detail one", () => {
    expect(
      shouldFireTimelineLinkPointerClick({
        taskId: "t1",
        eventClickDetail: 0,
        lastFire: null,
        now: 1000,
      }),
    ).toBe(true);
    expect(
      shouldFireTimelineLinkPointerClick({
        taskId: "t1",
        eventClickDetail: 1,
        lastFire: null,
        now: 1000,
      }),
    ).toBe(true);
  });

  it("rejects a second fire on the same task inside the window", () => {
    expect(
      shouldFireTimelineLinkPointerClick({
        taskId: "t1",
        eventClickDetail: 1,
        lastFire: { taskId: "t1", at: 1000 },
        now: 1000 + TIMELINE_LINK_DOUBLE_CLICK_MS - 1,
      }),
    ).toBe(false);
  });

  it("allows fire after the window or on a different task", () => {
    expect(
      shouldFireTimelineLinkPointerClick({
        taskId: "t1",
        eventClickDetail: 1,
        lastFire: { taskId: "t1", at: 1000 },
        now: 1000 + TIMELINE_LINK_DOUBLE_CLICK_MS,
      }),
    ).toBe(true);
    expect(
      shouldFireTimelineLinkPointerClick({
        taskId: "t2",
        eventClickDetail: 1,
        lastFire: { taskId: "t1", at: 1000 },
        now: 1001,
      }),
    ).toBe(true);
  });
});

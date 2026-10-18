import { describe, expect, it } from "vitest";
import {
  canAcceptScheduleDrop,
  scheduleDropBlockedReason,
} from "./droppedScheduleOpenGate";
import { DROP_SCHEDULE_UI_BUSY } from "./droppedScheduleMessages";

const ready = {
  startupSettled: true,
  startupRecoveryDialogOpen: false,
  fileBusy: false,
  dialogOpen: false,
  reorderDragging: false,
};

describe("scheduleDropBlockedReason", () => {
  it("returns busy when reordering", () => {
    expect(
      scheduleDropBlockedReason({ ...ready, reorderDragging: true }),
    ).toBe(DROP_SCHEDULE_UI_BUSY);
  });

  it("returns null when ready", () => {
    expect(scheduleDropBlockedReason(ready)).toBeNull();
    expect(canAcceptScheduleDrop(ready)).toBe(true);
  });
});

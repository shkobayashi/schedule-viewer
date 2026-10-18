import { describe, expect, it } from "vitest";
import { resolveScheduleExternalDrop } from "./droppedScheduleExternalDispatch";
import { DROP_SCHEDULE_INVALID_SELECTION, DROP_SCHEDULE_UI_BUSY } from "./droppedScheduleMessages";

const ready = {
  startupSettled: true,
  startupRecoveryDialogOpen: false,
  fileBusy: false,
  dialogOpen: false,
  reorderDragging: false,
};

describe("resolveScheduleExternalDrop", () => {
  it("returns busy before invalid selection", () => {
    const result = resolveScheduleExternalDrop(
      { ...ready, reorderDragging: true },
      ["/a.json", "/b.json"],
      false,
    );
    expect(result).toEqual({ action: "blocked", message: DROP_SCHEDULE_UI_BUSY });
  });

  it("returns invalid for a folder path only", () => {
    const result = resolveScheduleExternalDrop(ready, ["/tmp/folder"], false);
    expect(result).toEqual({
      action: "invalid",
      message: DROP_SCHEDULE_INVALID_SELECTION,
    });
  });
});

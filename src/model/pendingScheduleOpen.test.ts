import { describe, expect, it } from "vitest";
import type { PendingScheduleWindowOpen } from "./windowSession";

/** useScheduleStartupRecovery と同じ判定。 */
function shouldApplyPendingScheduleOpen(
  pending: PendingScheduleWindowOpen,
  windowLabel: string,
  alreadyApplied: boolean,
): boolean {
  if (alreadyApplied) return false;
  return pending.label === windowLabel;
}

describe("schedule-pending-open target label", () => {
  const payload: PendingScheduleWindowOpen = {
    label: "schedule-3",
    path: "/tmp/playground.schedule.json",
    contents: "{}",
  };

  it("applies only on the window that matches payload label", () => {
    expect(shouldApplyPendingScheduleOpen(payload, "schedule-3", false)).toBe(true);
    expect(shouldApplyPendingScheduleOpen(payload, "schedule-2", false)).toBe(false);
  });

  it("does not apply twice on the same window", () => {
    expect(shouldApplyPendingScheduleOpen(payload, "schedule-3", true)).toBe(false);
  });
});

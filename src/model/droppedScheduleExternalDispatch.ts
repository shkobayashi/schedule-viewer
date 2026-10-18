import { classifyDroppedSchedulePaths } from "./droppedSchedulePaths";
import {
  scheduleDropBlockedReason,
  type ScheduleDropGateInput,
} from "./droppedScheduleOpenGate";
import { DROP_SCHEDULE_INVALID_SELECTION } from "./droppedScheduleMessages";

export type ScheduleExternalDropResolution =
  | { action: "blocked"; message: string }
  | { action: "invalid"; message: string }
  | { action: "open"; path: string };

export function resolveScheduleExternalDrop(
  gate: ScheduleDropGateInput,
  paths: readonly string[],
  domDialogOpen: boolean,
): ScheduleExternalDropResolution {
  const effectiveGate: ScheduleDropGateInput = {
    ...gate,
    dialogOpen: gate.dialogOpen || domDialogOpen,
  };
  const blockedReason = scheduleDropBlockedReason(effectiveGate);
  if (blockedReason != null) {
    return { action: "blocked", message: blockedReason };
  }
  const classification = classifyDroppedSchedulePaths(paths);
  if (classification.kind === "invalidSelection") {
    return { action: "invalid", message: DROP_SCHEDULE_INVALID_SELECTION };
  }
  return { action: "open", path: classification.path };
}

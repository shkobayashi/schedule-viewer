import { DROP_SCHEDULE_UI_BUSY } from "./droppedScheduleMessages";

export type ScheduleDropGateInput = {
  startupSettled: boolean;
  startupRecoveryDialogOpen: boolean;
  fileBusy: boolean;
  dialogOpen: boolean;
  reorderDragging: boolean;
};

export function scheduleDropBlockedReason(
  input: ScheduleDropGateInput,
): string | null {
  if (!input.startupSettled) return DROP_SCHEDULE_UI_BUSY;
  if (input.startupRecoveryDialogOpen) return DROP_SCHEDULE_UI_BUSY;
  if (input.fileBusy) return DROP_SCHEDULE_UI_BUSY;
  if (input.dialogOpen) return DROP_SCHEDULE_UI_BUSY;
  if (input.reorderDragging) return DROP_SCHEDULE_UI_BUSY;
  return null;
}

export function canAcceptScheduleDrop(input: ScheduleDropGateInput): boolean {
  return scheduleDropBlockedReason(input) == null;
}

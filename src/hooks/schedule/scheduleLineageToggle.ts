import type { ScheduleId } from "../../model/types";

export type LineageToggleState = {
  lineageTaskId: ScheduleId | null;
  lineageIncludesConnections: boolean;
};

export function nextLineageToggleState(
  lineageTaskId: ScheduleId | null,
  lineageIncludesConnections: boolean,
  selectedTaskId: ScheduleId | null,
): LineageToggleState {
  if (lineageTaskId != null && lineageIncludesConnections) {
    return { lineageTaskId: null, lineageIncludesConnections: false };
  }
  if (lineageTaskId != null) {
    return { lineageTaskId: null, lineageIncludesConnections };
  }
  return {
    lineageTaskId: selectedTaskId,
    lineageIncludesConnections: false,
  };
}

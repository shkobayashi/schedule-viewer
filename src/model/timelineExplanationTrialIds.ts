import type { ExplanationTrialMilestoneLayout } from "./explainOverlayPatterns";
import type { ScheduleId } from "./types";

/** 試し移動パターンで動かすマイルストン id の集合。 */
export function milestoneIdsWithTrialMoveFromLayouts(
  layouts: readonly ExplanationTrialMilestoneLayout[],
): Set<ScheduleId> {
  const ids = new Set<ScheduleId>();
  for (const layout of layouts) {
    ids.add(layout.milestoneId);
  }
  return ids;
}

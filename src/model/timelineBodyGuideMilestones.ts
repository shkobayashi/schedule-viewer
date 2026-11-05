import type { Milestone, ScheduleId } from "./types";

/** チャート本体に縦ガイドを描くマイルストン一覧。 */
export function filterTimelineBodyGuideLineMilestones(input: {
  milestones: readonly Milestone[];
  milestoneGuideLineIds: ReadonlySet<ScheduleId>;
  milestoneCenterYById: ReadonlyMap<ScheduleId, number>;
}): Milestone[] {
  return input.milestones.filter(
    (milestone) =>
      input.milestoneGuideLineIds.has(milestone.id) &&
      input.milestoneCenterYById.has(milestone.id),
  );
}

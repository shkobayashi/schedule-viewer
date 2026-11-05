import type { ExplanationMarkHole } from "./explainOverlayLayout";
import type { ExplanationTrialMilestoneLayout } from "./explainOverlayPatterns";
import type { ResolvedColorScheme } from "./palette";
import type { ScheduleId } from "./types";

export type TimelineMilestoneBandExplanationProps = {
  explanationVeilHoles: readonly ExplanationMarkHole[] | undefined;
  explanationColorScheme: ResolvedColorScheme | undefined;
  explanationTrialMilestones: ExplanationTrialMilestoneLayout[] | undefined;
  milestoneIdsWithTrialMove: Set<ScheduleId> | undefined;
};

/** MilestoneBand に渡す説明オーバーレイ用 props（非アクティブ時は undefined）。 */
export function buildTimelineMilestoneBandExplanationProps(input: {
  active: boolean;
  milestoneHoles: readonly ExplanationMarkHole[] | undefined;
  colorScheme: ResolvedColorScheme;
  trialMilestones: ExplanationTrialMilestoneLayout[];
  milestoneIdsWithTrialMove: Set<ScheduleId>;
}): TimelineMilestoneBandExplanationProps {
  if (!input.active) {
    return {
      explanationVeilHoles: undefined,
      explanationColorScheme: undefined,
      explanationTrialMilestones: undefined,
      milestoneIdsWithTrialMove: undefined,
    };
  }
  return {
    explanationVeilHoles: input.milestoneHoles ?? [],
    explanationColorScheme: input.colorScheme,
    explanationTrialMilestones: input.trialMilestones,
    milestoneIdsWithTrialMove: input.milestoneIdsWithTrialMove,
  };
}

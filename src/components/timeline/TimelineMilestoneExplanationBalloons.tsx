import {
  milestoneExplanationBalloonOverlayHeight,
  type ExplanationOverlayGeometry,
} from "../../model/explainOverlayLayout";
import { TimelineExplanationBalloons } from "../TimelineExplanationBalloons";

export function TimelineMilestoneExplanationBalloons({
  active,
  milestoneBandHeight,
  headerHeight,
  width,
  uiScale,
  geometry,
}: {
  active: boolean;
  milestoneBandHeight: number;
  headerHeight: number;
  width: number;
  uiScale: number;
  geometry: ExplanationOverlayGeometry | null;
}) {
  if (
    !active ||
    milestoneBandHeight <= 0 ||
    (geometry?.milestoneBalloons?.length ?? 0) === 0
  ) {
    return null;
  }
  return (
    <div
      className="milestone-explanation-balloons-layer"
      style={{
        top: headerHeight,
        width,
        height: milestoneExplanationBalloonOverlayHeight(
          milestoneBandHeight,
          uiScale,
        ),
      }}
    >
      <TimelineExplanationBalloons
        balloons={geometry?.milestoneBalloons ?? []}
      />
    </div>
  );
}

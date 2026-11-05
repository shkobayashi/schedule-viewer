import type { ExplanationOverlayGeometry } from "../../model/explainOverlayLayout";
import type {
  ExplanationTrialBarLayout,
  ExplanationTrialPredecessorArc,
} from "../../model/explainOverlayPatterns";
import type { ResolvedColorScheme } from "../../model/palette";
import { ExplanationKonvaVeilLayer } from "../ExplanationKonvaVeil";
import { ExplanationTrialBarsLayer } from "../ExplanationTrialBarsLayer";
import { TimelineExplanationBalloons } from "../TimelineExplanationBalloons";

export function TimelineStageExplanationLayers({
  active,
  width,
  bodyHeight,
  colorScheme,
  clipTop,
  clipHeight,
  geometry,
  trialBars,
  predecessorArcs,
  connectionArcColor,
  connectionArcHaloColor,
}: {
  active: boolean;
  width: number;
  bodyHeight: number;
  colorScheme: ResolvedColorScheme;
  clipTop: number;
  clipHeight: number;
  geometry: ExplanationOverlayGeometry | null;
  trialBars: ExplanationTrialBarLayout[];
  predecessorArcs: ExplanationTrialPredecessorArc[];
  connectionArcColor: string;
  connectionArcHaloColor: string;
}) {
  if (!active) return null;
  return (
    <>
      <ExplanationKonvaVeilLayer
        width={width}
        height={bodyHeight}
        holes={geometry?.bodyHoles ?? []}
        colorScheme={colorScheme}
        clipTop={clipTop}
        clipHeight={clipHeight}
      />
      <ExplanationTrialBarsLayer
        width={width}
        height={bodyHeight}
        bars={trialBars}
        predecessorArcs={predecessorArcs}
        connectionArcColor={connectionArcColor}
        connectionArcHaloColor={connectionArcHaloColor}
        clipTop={clipTop}
        clipHeight={clipHeight}
      />
    </>
  );
}

export function TimelineBodyExplanationBalloons({
  active,
  geometry,
}: {
  active: boolean;
  geometry: ExplanationOverlayGeometry | null;
}) {
  if (!active) return null;
  return (
    <TimelineExplanationBalloons
      balloons={geometry?.bodyBalloons ?? []}
    />
  );
}

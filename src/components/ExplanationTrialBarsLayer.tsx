import { useEffect, useRef } from "react";
import { Group, Layer, Line, Rect } from "react-konva";
import type Konva from "konva";
import {
  EXPLANATION_TRIAL_KONVA_DASH,
  EXPLANATION_TRIAL_STROKE_WIDTH,
} from "../design/uiTokens";
import {
  CONNECTION_HALO_STROKE_WIDTH,
  CONNECTION_STROKE_WIDTH,
} from "../model/connections";
import { registerExplanationKonvaCapture } from "../model/explanationKonvaCapture";
import type {
  ExplanationTrialBarLayout,
  ExplanationTrialPredecessorArc,
} from "../model/explainOverlayPatterns";

type ExplanationTrialBarsLayerProps = {
  width: number;
  height: number;
  bars: readonly ExplanationTrialBarLayout[];
  predecessorArcs?: readonly ExplanationTrialPredecessorArc[];
  connectionArcColor?: string;
  connectionArcHaloColor: string;
  clipTop?: number;
  clipHeight?: number;
};

function trialBarFill(color: string): string {
  if (color.length === 7) {
    return `${color}66`;
  }
  return color;
}

export function ExplanationTrialBarsLayer({
  width,
  height,
  bars,
  predecessorArcs = [],
  connectionArcHaloColor,
  clipTop,
  clipHeight,
}: ExplanationTrialBarsLayerProps) {
  const layerRef = useRef<Konva.Layer>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (layer == null) return;
    return registerExplanationKonvaCapture({
      hide: () => {
        layer.visible(false);
        layer.getLayer()?.batchDraw();
      },
      show: () => {
        layer.visible(true);
        layer.getLayer()?.batchDraw();
      },
    });
  }, []);

  if (
    width <= 0 ||
    height <= 0 ||
    (bars.length === 0 && predecessorArcs.length === 0)
  ) {
    return null;
  }

  const barContent = bars.map((bar, index) => (
    <Rect
      key={`trial-bar-${bar.patternId}-${bar.trialTaskId}-${index}`}
      x={bar.rect.x}
      y={bar.rect.y}
      width={bar.rect.width}
      height={bar.rect.height}
      fill={trialBarFill(bar.color)}
      stroke={bar.color}
      strokeWidth={EXPLANATION_TRIAL_STROKE_WIDTH}
      dash={[...EXPLANATION_TRIAL_KONVA_DASH]}
      listening={false}
    />
  ));

  const arcContent = predecessorArcs.map((arc, index) => (
    <Group
      key={`trial-pred-${arc.patternId}-${index}`}
      listening={false}
    >
      <Line
        points={arc.points}
        stroke={connectionArcHaloColor}
        strokeWidth={CONNECTION_HALO_STROKE_WIDTH}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      <Line
        points={arc.points}
        stroke={arc.color}
        strokeWidth={CONNECTION_STROKE_WIDTH}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    </Group>
  ));

  const content = (
    <>
      {arcContent}
      {barContent}
    </>
  );

  return (
    <Layer ref={layerRef} listening={false}>
      {clipTop != null && clipHeight != null && clipHeight > 0 ? (
        <Group
          clipX={0}
          clipY={clipTop}
          clipWidth={width}
          clipHeight={clipHeight}
          listening={false}
        >
          {content}
        </Group>
      ) : (
        content
      )}
    </Layer>
  );
}

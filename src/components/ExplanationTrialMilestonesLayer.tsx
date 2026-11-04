import { useEffect, useRef } from "react";
import { Layer, RegularPolygon } from "react-konva";
import type Konva from "konva";
import { registerExplanationKonvaCapture } from "../model/explanationKonvaCapture";
import type { ExplanationTrialMilestoneLayout } from "../model/explainOverlayPatterns";

type ExplanationTrialMilestonesLayerProps = {
  width: number;
  height: number;
  diamonds: readonly ExplanationTrialMilestoneLayout[];
  diamondSize: number;
};

export function ExplanationTrialMilestonesLayer({
  width,
  height,
  diamonds,
  diamondSize,
}: ExplanationTrialMilestonesLayerProps) {
  const layerRef = useRef<Konva.Layer>(null);
  const radius = diamondSize / 2;

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

  if (width <= 0 || height <= 0 || diamonds.length === 0) {
    return null;
  }

  return (
    <Layer ref={layerRef} listening={false}>
      {diamonds.map((item, index) => (
        <RegularPolygon
          key={`trial-ms-${item.patternId}-${item.milestoneId}-${index}`}
          x={item.rect.x + item.rect.width / 2}
          y={item.rect.y + item.rect.height / 2}
          sides={4}
          radius={radius}
          fill={undefined}
          stroke={item.color}
          strokeWidth={2}
          dash={[4, 3]}
          rotation={45}
          listening={false}
        />
      ))}
    </Layer>
  );
}

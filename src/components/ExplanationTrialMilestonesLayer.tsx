import { useEffect, useRef } from "react";
import { Layer, Line, RegularPolygon } from "react-konva";
import type Konva from "konva";
import { registerExplanationKonvaCapture } from "../model/explanationKonvaCapture";
import { milestoneDiamondOutlineWidth } from "../model/milestones";
import type { ExplanationTrialMilestoneLayout } from "../model/explainOverlayPatterns";

type ExplanationTrialMilestonesLayerProps = {
  width: number;
  height: number;
  diamonds: readonly ExplanationTrialMilestoneLayout[];
  diamondSize: number;
};

function rectCenter(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function trialDiamondFill(color: string): string {
  if (color.length === 7) {
    return `${color}66`;
  }
  return color;
}

export function ExplanationTrialMilestonesLayer({
  width,
  height,
  diamonds,
  diamondSize,
}: ExplanationTrialMilestonesLayerProps) {
  const layerRef = useRef<Konva.Layer>(null);
  const radius = diamondSize / 2;
  const outlineWidth = milestoneDiamondOutlineWidth(diamondSize);

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
      {diamonds.map((item, index) => {
        const from = rectCenter(item.originRect);
        const to = rectCenter(item.rect);
        if (from.x !== to.x || from.y !== to.y) {
          return (
            <Line
              key={`trial-ms-line-${item.patternId}-${item.milestoneId}-${index}`}
              points={[from.x, from.y, to.x, to.y]}
              stroke={item.color}
              strokeWidth={outlineWidth}
              dash={[6, 4]}
              listening={false}
            />
          );
        }
        return null;
      })}
      {diamonds.map((item, index) => (
        <RegularPolygon
          key={`trial-ms-${item.patternId}-${item.milestoneId}-${index}`}
          x={item.rect.x + item.rect.width / 2}
          y={item.rect.y + item.rect.height / 2}
          sides={4}
          radius={radius}
          fill={trialDiamondFill(item.color)}
          stroke={item.color}
          strokeWidth={outlineWidth}
          dash={[6, 4]}
          listening={false}
        />
      ))}
    </Layer>
  );
}

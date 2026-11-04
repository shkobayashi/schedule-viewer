import { useEffect, useRef } from "react";
import { Group, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { registerExplanationKonvaCapture } from "../model/explanationKonvaCapture";
import type { ExplanationTrialBarLayout } from "../model/explainOverlayPatterns";

type ExplanationTrialBarsLayerProps = {
  width: number;
  height: number;
  bars: readonly ExplanationTrialBarLayout[];
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

  if (width <= 0 || height <= 0 || bars.length === 0) return null;

  const content = bars.map((bar, index) => (
    <Rect
      key={`trial-bar-${bar.trialTaskId}-${index}`}
      x={bar.rect.x}
      y={bar.rect.y}
      width={bar.rect.width}
      height={bar.rect.height}
      fill={trialBarFill(bar.color)}
      stroke={bar.color}
      strokeWidth={2}
      dash={[6, 4]}
      listening={false}
    />
  ));

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

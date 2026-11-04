import { useEffect, useRef } from "react";
import { Group, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { registerExplanationKonvaCapture } from "../model/explanationKonvaCapture";
import { paletteFor, type ResolvedColorScheme } from "../model/palette";
import type { ExplanationMarkHole } from "../model/explainOverlayLayout";

type ExplanationKonvaVeilLayerProps = {
  width: number;
  height: number;
  holes: readonly ExplanationMarkHole[];
  colorScheme: ResolvedColorScheme;
  clipTop?: number;
  clipHeight?: number;
};

function kindStrokeDash(kind: ExplanationMarkHole["kind"]): number[] | undefined {
  return kind === "ask" ? [4, 3] : undefined;
}

export function ExplanationKonvaVeilLayer({
  width,
  height,
  holes,
  colorScheme,
  clipTop,
  clipHeight,
}: ExplanationKonvaVeilLayerProps) {
  const layerRef = useRef<Konva.Layer>(null);
  const palette = paletteFor(colorScheme);
  const veil = palette.css.explanationVeil;
  const changeRing = palette.css.explanationMarkChangeRing;
  const askRing = palette.css.explanationMarkAskRing;

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

  if (width <= 0 || height <= 0) return null;

  const veilContent = (
    <>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={veil}
        listening={false}
      />
      {holes.map((hole, index) => (
        <Rect
          key={`hole-cut-${index}`}
          x={hole.x}
          y={hole.y}
          width={hole.width}
          height={hole.height}
          fill="#000"
          globalCompositeOperation="destination-out"
          listening={false}
        />
      ))}
      {holes.map((hole, index) => (
        <Rect
          key={`hole-ring-${index}`}
          x={hole.x}
          y={hole.y}
          width={hole.width}
          height={hole.height}
          fill="transparent"
          stroke={hole.kind === "change" ? changeRing : askRing}
          strokeWidth={2}
          dash={kindStrokeDash(hole.kind)}
          listening={false}
        />
      ))}
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
          {veilContent}
        </Group>
      ) : (
        veilContent
      )}
    </Layer>
  );
}

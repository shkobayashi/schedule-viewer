import { useId, useMemo } from "react";
import type { CSSProperties } from "react";
import type { ResolvedColorScheme } from "../model/palette";
import { paletteFor } from "../model/palette";
import type {
  ExplanationBalloonLayout,
  ExplanationMarkHole,
} from "../model/explainOverlayLayout";

type ExplanationOverlayProps = {
  width: number;
  height: number;
  colorScheme: ResolvedColorScheme;
  style?: CSSProperties;
  holes?: readonly ExplanationMarkHole[];
  balloons?: readonly ExplanationBalloonLayout[];
};

function kindStrokeDash(kind: ExplanationMarkHole["kind"]): string | undefined {
  return kind === "ask" ? "4 3" : undefined;
}

export function ExplanationOverlay({
  width,
  height,
  colorScheme,
  style,
  holes = [],
  balloons = [],
}: ExplanationOverlayProps) {
  const maskId = useId();
  if (width <= 0 || height <= 0) return null;
  const palette = paletteFor(colorScheme);
  const veil = palette.css.explanationVeil;
  const changeRing = palette.css.explanationMarkChangeRing;
  const askRing = palette.css.explanationMarkAskRing;

  const visibleBalloons = useMemo(
    () => balloons.filter((b) => b.visible),
    [balloons],
  );

  return (
    <div
      className="explanation-overlay-host"
      data-explanation-overlay=""
      style={style}
      aria-hidden
    >
      <svg className="explanation-overlay" width={width} height={height}>
        <defs>
          <mask id={maskId}>
            <rect x={0} y={0} width={width} height={height} fill="white" />
            {holes.map((hole, index) => (
              <rect
                key={`hole-${index}`}
                x={hole.x}
                y={hole.y}
                width={hole.width}
                height={hole.height}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <g className="explanation-overlay-veil">
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={veil}
            mask={`url(#${maskId})`}
          />
        </g>
        {holes.map((hole, index) => (
          <rect
            key={`ring-${index}`}
            x={hole.x}
            y={hole.y}
            width={hole.width}
            height={hole.height}
            fill="none"
            stroke={hole.kind === "change" ? changeRing : askRing}
            strokeWidth={2}
            strokeDasharray={kindStrokeDash(hole.kind)}
            pointerEvents="none"
          />
        ))}
      </svg>
      {visibleBalloons.map((balloon) => (
        <div
          key={`balloon-${balloon.markIndex}`}
          className={`explanation-balloon explanation-balloon--${balloon.placement}`}
          data-explanation-overlay=""
          style={{
            left: balloon.left,
            top: balloon.top,
            maxWidth: balloon.maxWidth,
          }}
        >
          {balloon.number != null ? (
            <span className="explanation-balloon-number">{balloon.number}</span>
          ) : null}
          <span className="explanation-balloon-label">{balloon.label}</span>
        </div>
      ))}
    </div>
  );
}

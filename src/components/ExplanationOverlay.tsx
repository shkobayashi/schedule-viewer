import type { CSSProperties } from "react";
import type { ResolvedColorScheme } from "../model/palette";
import { paletteFor } from "../model/palette";

type ExplanationOverlayProps = {
  width: number;
  height: number;
  colorScheme: ResolvedColorScheme;
  style?: CSSProperties;
};

export function ExplanationOverlay({
  width,
  height,
  colorScheme,
  style,
}: ExplanationOverlayProps) {
  if (width <= 0 || height <= 0) return null;
  const veil = paletteFor(colorScheme).css.explanationVeil;
  return (
    <div
      className="explanation-overlay-host"
      data-explanation-overlay=""
      style={style}
      aria-hidden
    >
      <svg className="explanation-overlay" width={width} height={height}>
        <g className="explanation-overlay-veil">
          <rect x={0} y={0} width={width} height={height} fill={veil} />
        </g>
      </svg>
    </div>
  );
}

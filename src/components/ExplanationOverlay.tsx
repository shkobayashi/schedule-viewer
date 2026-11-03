import type { ResolvedColorScheme } from "../model/palette";
import { paletteFor } from "../model/palette";

type ExplanationOverlayProps = {
  width: number;
  height: number;
  colorScheme: ResolvedColorScheme;
};

export function ExplanationOverlay({
  width,
  height,
  colorScheme,
}: ExplanationOverlayProps) {
  if (width <= 0 || height <= 0) return null;
  const veil = paletteFor(colorScheme).css.explanationVeil;
  return (
    <svg
      className="explanation-overlay"
      data-explanation-overlay=""
      width={width}
      height={height}
      aria-hidden
    >
      <g className="explanation-overlay-veil">
        <rect x={0} y={0} width={width} height={height} fill={veil} />
      </g>
    </svg>
  );
}

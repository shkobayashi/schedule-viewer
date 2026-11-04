import type { ExplanationBalloonLayout } from "../model/explainOverlayLayout";
import { explanationMarkHaloStroke } from "../model/explanationMarkColor";

type TimelineExplanationBalloonsProps = {
  balloons: readonly ExplanationBalloonLayout[];
};

export function TimelineExplanationBalloons({
  balloons,
}: TimelineExplanationBalloonsProps) {
  const visible = balloons.filter((b) => b.visible);
  if (visible.length === 0) return null;

  return (
    <div className="explanation-balloons-host" data-explanation-overlay="" aria-hidden>
      {visible.map((balloon) => {
        const halo =
          balloon.color != null
            ? explanationMarkHaloStroke(balloon.color)
            : null;
        const accentStyle =
          balloon.color != null
            ? {
                borderColor: balloon.color,
                boxShadow: `0 0 0 1px ${halo}, var(--menu-shadow)`,
              }
            : undefined;
        const numberStyle =
          balloon.color != null && balloon.number != null
            ? {
                color: balloon.color,
                textShadow: `0 0 1px ${halo}, 0 0 1px ${halo}`,
              }
            : undefined;
        return (
          <div
            key={`balloon-${balloon.markIndex}`}
            className={`explanation-balloon explanation-balloon--${balloon.placement}`}
            data-explanation-overlay=""
            style={{
              left: balloon.left,
              top: balloon.top,
              maxWidth: balloon.maxWidth,
              ...accentStyle,
            }}
          >
            {balloon.number != null ? (
              <span
                className="explanation-balloon-number"
                style={numberStyle}
              >
                {balloon.number}
              </span>
            ) : null}
            <span className="explanation-balloon-label">{balloon.label}</span>
          </div>
        );
      })}
    </div>
  );
}

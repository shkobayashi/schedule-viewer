import type { ExplanationBalloonLayout } from "../model/explainOverlayLayout";

type TimelineExplanationBalloonsProps = {
  balloons: readonly ExplanationBalloonLayout[];
  displayScale?: number;
};

export function TimelineExplanationBalloons({
  balloons,
  displayScale = 1,
}: TimelineExplanationBalloonsProps) {
  const visible = balloons.filter((b) => b.visible);
  if (visible.length === 0) return null;

  return (
    <div className="explanation-balloons-host" data-explanation-overlay="" aria-hidden>
      {visible.map((balloon) => (
        <div
          key={`balloon-${balloon.markIndex}`}
          className={`explanation-balloon explanation-balloon--${balloon.placement}`}
          data-explanation-overlay=""
          style={{
            left: balloon.left,
            top: balloon.top,
            maxWidth: balloon.maxWidth * displayScale,
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

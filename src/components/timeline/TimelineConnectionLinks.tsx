import { Arrow } from "react-konva";
import { LINK_POINTER_LENGTH } from "../../model/dependencies";
import type { ChartHover } from "../../model/chartHitTest";
import type { ChartPalette } from "../../model/palette";
import type { TimelineLinkPolyline } from "../../model/timelineLinkPolylines";

export function TimelinePredecessorLinks({
  linkPolylines,
  hover,
  chart,
}: {
  linkPolylines: readonly TimelineLinkPolyline[];
  hover: ChartHover;
  chart: ChartPalette;
}) {
  return linkPolylines.flatMap((link) => {
    if ((link.kind ?? "predecessor") !== "predecessor") return [];
    const hovered =
      hover.link?.fromId === link.fromId &&
      hover.link.toId === link.toId &&
      (hover.link.kind ?? "predecessor") === (link.kind ?? "predecessor");
    const color = link.broken ? chart.linkBroken : chart.linkOk;
    const strokeWidth = link.broken ? 1.75 : 1.25;
    return [
      <Arrow
        key={`${link.fromId}-${link.toId}`}
        points={link.points}
        stroke={color}
        fill={color}
        strokeWidth={hovered ? strokeWidth + 1.5 : strokeWidth}
        pointerLength={LINK_POINTER_LENGTH}
        pointerWidth={LINK_POINTER_LENGTH}
        listening={false}
      />,
    ];
  });
}

export function TimelineLinkPreviewArrow({
  previewPoints,
  chart,
}: {
  previewPoints: number[] | null;
  chart: ChartPalette;
}) {
  if (previewPoints == null) return null;
  return (
    <Arrow
      points={previewPoints}
      stroke={chart.linkOk}
      fill={chart.linkOk}
      strokeWidth={1.25}
      pointerLength={LINK_POINTER_LENGTH}
      pointerWidth={LINK_POINTER_LENGTH}
      listening={false}
    />
  );
}

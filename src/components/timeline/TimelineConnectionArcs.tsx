import { Group, Line, Text } from "react-konva";
import type { ChartHover } from "../../model/chartHitTest";
import {
  collectTaskBarLabelObstacles,
  CONNECTION_HALO_STROKE_WIDTH,
  CONNECTION_STROKE_WIDTH,
  layoutConnectionArcLabelsInOrder,
} from "../../model/connections";
import { connectionArcLabelFontSize } from "../../model/connectionArcLabelFontSize";
import { duplicateMemberNamesFromCatalog } from "../../model/assigneeDisplay";
import { KONVA_FONT_FAMILY } from "../../model/fontStack";
import type { ChartPalette } from "../../model/palette";
import type { PreparedTimelineConnectionArc } from "../../model/timelinePreparedConnectionArcs";
import type { TimelineLiveAnchor } from "../../model/timelineLiveAnchors";
import type { Member, MemberId } from "../../model/memberTypes";
import type { ScheduleId, VisibleRow } from "../../model/types";

export function TimelineConnectionArcs({
  preparedConnectionArcs,
  hover,
  chart,
  visibleRows,
  scrollY,
  rowHeight,
  barHeight,
  bodyHeight,
  dateToX,
  pxPerDay,
  tier,
  memberCatalog,
  liveAnchors,
}: {
  preparedConnectionArcs: readonly PreparedTimelineConnectionArc[];
  hover: ChartHover;
  chart: ChartPalette;
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  dateToX: (d: Date) => number;
  pxPerDay: number;
  tier: "day" | "week" | "month";
  memberCatalog: Map<MemberId, Member> | null;
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
}) {
  if (preparedConnectionArcs.length === 0) return null;
  const labelFontSize = connectionArcLabelFontSize(barHeight);
  const assigneeDuplicateNames = duplicateMemberNamesFromCatalog(memberCatalog);
  const barLabelObstacles = collectTaskBarLabelObstacles(
    visibleRows,
    scrollY,
    rowHeight,
    barHeight,
    bodyHeight,
    dateToX,
    pxPerDay,
    tier,
    memberCatalog,
    assigneeDuplicateNames,
    liveAnchors,
  );

  const labelLayouts = layoutConnectionArcLabelsInOrder(
    preparedConnectionArcs.map((item) => ({
      labelX: item.geom.labelX,
      labelY: item.geom.labelY,
      label: item.connection.label,
    })),
    barLabelObstacles,
    labelFontSize,
    0,
  );

  return preparedConnectionArcs.map((item, index) => {
    const layout = labelLayouts[index]!;
    const hovered =
      hover.link?.kind === "connection" &&
      hover.link.fromId === item.taskA &&
      hover.link.toId === item.taskB;
    const strokeBoost = hovered ? 1.5 : 0;
    const key = `${item.taskA}-${item.taskB}-${item.connection.label}`;
    return (
      <Group key={key} listening={false}>
        <Line
          points={item.geom.points}
          stroke={chart.connectionArcHalo}
          strokeWidth={CONNECTION_HALO_STROKE_WIDTH + strokeBoost}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
        <Line
          points={item.geom.points}
          stroke={chart.connectionArc}
          strokeWidth={CONNECTION_STROKE_WIDTH + strokeBoost}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
        <Text
          x={layout.x}
          y={layout.y}
          text={item.connection.label}
          fontSize={labelFontSize}
          fontFamily={KONVA_FONT_FAMILY}
          fill={chart.connectionArcLabel}
          align="center"
          offsetX={layout.offsetX}
          listening={false}
        />
      </Group>
    );
  });
}

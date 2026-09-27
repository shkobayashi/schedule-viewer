import { useRef } from "react";
import { Group, Layer, Line, RegularPolygon, Stage, Text } from "react-konva";
import type Konva from "konva";
import { parseDate } from "../model/dates";
import type { Milestone, ScheduleId } from "../model/types";

import type { ChartPalette } from "../model/palette";

type MilestoneBandProps = {
  milestones: Milestone[];
  lanes: Map<ScheduleId, number>;
  width: number;
  height: number;
  laneHeight: number;
  diamondSize: number;
  fontSize: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  onMove: (id: ScheduleId, deltaDays: number) => void;
  onOpenEdit: (id: ScheduleId) => void;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  chart: ChartPalette;
};

export function MilestoneBand({
  milestones,
  lanes,
  width,
  height,
  laneHeight,
  diamondSize,
  fontSize,
  pxPerDay,
  dateToX,
  onMove,
  onOpenEdit,
  onWheel,
  chart,
}: MilestoneBandProps) {
  return (
    <div className="milestone-band" style={{ height }}>
      <Stage width={width} height={height} onWheel={onWheel}>
        <Layer>
          <Line
            points={[0, height - 0.5, width, height - 0.5]}
            stroke={chart.milestoneBandBorder}
            strokeWidth={1}
            listening={false}
          />
          {milestones.map((milestone) => {
            const lane = lanes.get(milestone.id) ?? 0;
            const x = dateToX(parseDate(milestone.date));
            const y = lane * laneHeight + laneHeight / 2;
            if (x < -180 || x > width + 40) return null;
            return (
              <MilestoneMark
                key={milestone.id}
                milestone={milestone}
                x={x}
                y={y}
                diamondSize={diamondSize}
                fontSize={fontSize}
                pxPerDay={pxPerDay}
                onMove={(delta) => onMove(milestone.id, delta)}
                onOpenEdit={() => onOpenEdit(milestone.id)}
                chart={chart}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

function MilestoneMark({
  milestone,
  x,
  y,
  diamondSize,
  fontSize,
  pxPerDay,
  onMove,
  onOpenEdit,
  chart,
}: {
  milestone: Milestone;
  x: number;
  y: number;
  diamondSize: number;
  fontSize: number;
  pxPerDay: number;
  onMove: (deltaDays: number) => void;
  onOpenEdit: () => void;
  chart: ChartPalette;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const originX = useRef(x);
  const radius = diamondSize / 2;

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable
      dragBoundFunc={(pos) => ({ x: pos.x, y })}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "ew-resize";
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "";
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onOpenEdit();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        onOpenEdit();
      }}
      onDragStart={(e) => {
        originX.current = e.target.x();
      }}
      onDragEnd={(e) => {
        const node = e.target;
        const delta = Math.round((node.x() - originX.current) / pxPerDay);
        node.position({ x: originX.current, y });
        onMove(delta);
      }}
    >
      <RegularPolygon
        sides={4}
        radius={radius}
        fill={chart.milestoneDiamond}
        stroke={chart.milestoneDiamondStroke}
        strokeWidth={1}
      />
      <Text
        x={radius + 5}
        y={-fontSize / 2}
        text={milestone.name}
        fontSize={fontSize}
        fontStyle="bold"
        fill={chart.milestoneDiamond}
        listening={false}
      />
    </Group>
  );
}

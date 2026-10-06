import { useRef, type Ref } from "react";
import { Group, Layer, Line, RegularPolygon, Shape, Stage, Text } from "react-konva";
import type Konva from "konva";
import { milestoneMarkHit } from "../model/chartHitTest";
import { parseDate } from "../model/dates";
import { hatchCanvas } from "../model/hatch";
import { KONVA_FONT_FAMILY } from "../model/fontStack";
import type { ChartPalette, ResolvedColorScheme } from "../model/palette";
import type { Milestone, ScheduleId } from "../model/types";

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
  onContextMenu: (id: ScheduleId, x: number, y: number) => void;
  onEmptyContextMenu: (chartX: number, clientX: number, clientY: number) => void;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  linkMode?: boolean;
  chart: ChartPalette;
  colorScheme: ResolvedColorScheme;
  containerRef?: Ref<HTMLDivElement>;
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
  onContextMenu,
  onEmptyContextMenu,
  onWheel,
  linkMode = false,
  chart,
  colorScheme,
  containerRef,
}: MilestoneBandProps) {
  return (
    <div className="milestone-band" style={{ height }} ref={containerRef}>
      <Stage
        width={width}
        height={height}
        onWheel={onWheel}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (linkMode) return;
          const pos = e.target.getStage()?.getPointerPosition();
          if (!pos) return;
          onEmptyContextMenu(pos.x, e.evt.clientX, e.evt.clientY);
        }}
      >
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
                onContextMenu={(x, y) => onContextMenu(milestone.id, x, y)}
                linkMode={linkMode}
                chart={chart}
                colorScheme={colorScheme}
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
  onContextMenu,
  linkMode,
  chart,
  colorScheme,
}: {
  milestone: Milestone;
  x: number;
  y: number;
  diamondSize: number;
  fontSize: number;
  pxPerDay: number;
  onMove: (deltaDays: number) => void;
  onOpenEdit: () => void;
  onContextMenu: (x: number, y: number) => void;
  linkMode: boolean;
  chart: ChartPalette;
  colorScheme: ResolvedColorScheme;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const originX = useRef(x);
  const radius = diamondSize / 2;
  const hatch =
    milestone.confidence === "tentative"
      ? hatchCanvas(chart.milestoneDiamond, colorScheme)
      : null;

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={!linkMode}
      dragBoundFunc={(pos) => ({ x: pos.x, y })}
      onMouseEnter={(e) => {
        if (linkMode) return;
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "ew-resize";
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "";
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        if (linkMode) return;
        onContextMenu(e.evt.clientX, e.evt.clientY);
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (linkMode) return;
        onOpenEdit();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        if (linkMode) return;
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
      <Shape
        fill="black"
        listening
        sceneFunc={() => {}}
        hitFunc={(context, shape) => {
          const hit = milestoneMarkHit(diamondSize, fontSize, milestone.name);
          context.beginPath();
          context.arc(0, 0, hit.radius, 0, Math.PI * 2, false);
          if (hit.label) {
            context.rect(
              hit.label.x,
              hit.label.y,
              hit.label.width,
              hit.label.height,
            );
          }
          context.closePath();
          context.fillStrokeShape(shape);
        }}
      />
      <RegularPolygon
        sides={4}
        radius={radius}
        fill={hatch ? undefined : chart.milestoneDiamond}
        fillPriority={hatch ? "pattern" : "color"}
        fillPatternImage={
          hatch ? (hatch as unknown as HTMLImageElement) : undefined
        }
        fillPatternRepeat="repeat"
        stroke={chart.milestoneDiamondStroke}
        strokeWidth={1}
        listening={false}
      />
      <Text
        x={radius + 5}
        y={-fontSize / 2}
        text={milestone.name}
        fontSize={fontSize}
        fontStyle="bold"
        fontFamily={KONVA_FONT_FAMILY}
        fill={chart.milestoneDiamond}
        listening={false}
      />
    </Group>
  );
}

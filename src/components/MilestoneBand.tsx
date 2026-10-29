import { useEffect, useRef, type Ref } from "react";
import { Group, Layer, Line, RegularPolygon, Shape, Stage, Text } from "react-konva";
import type Konva from "konva";
import { milestoneMarkHit } from "../model/chartHitTest";
import { parseDate } from "../model/dates";
import { KONVA_FONT_FAMILY } from "../model/fontStack";
import {
  MILESTONE_GUIDE_DASH,
  MILESTONE_LABEL_GAP,
  milestoneDiamondOutlineWidth,
  milestoneMarkGuideGeometry,
  type MilestoneBandLayout,
} from "../model/milestones";
import type { ChartPalette } from "../model/palette";
import type { Milestone, ScheduleId } from "../model/types";
import type { MilestoneHoverState } from "./MilestoneHoverOverlay";

/** Konva の dblClickWindow と同じ。 */
const MILESTONE_GUIDE_CLICK_DELAY_MS = 400;

type MilestoneBandProps = {
  bandLayout: MilestoneBandLayout;
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
  onToggleGuideLine: (id: ScheduleId) => void;
  onEmptyContextMenu: (
    chartX: number,
    clientX: number,
    clientY: number,
    bandY: number,
  ) => void;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  linkMode?: boolean;
  chart: ChartPalette;
  containerRef?: Ref<HTMLDivElement>;
  onHoverMilestone: (hover: MilestoneHoverState | null) => void;
  milestoneGuideLineIds: ReadonlySet<ScheduleId>;
  diffMarkedMilestoneId?: ScheduleId | null;
  diffMarkStrokeWidth?: number;
};

export function MilestoneBand({
  bandLayout,
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
  onToggleGuideLine,
  onEmptyContextMenu,
  onWheel,
  linkMode = false,
  chart,
  containerRef,
  onHoverMilestone,
  milestoneGuideLineIds,
  diffMarkedMilestoneId = null,
  diffMarkStrokeWidth = 3,
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
          onEmptyContextMenu(pos.x, e.evt.clientX, e.evt.clientY, pos.y);
        }}
      >
        <Layer>
          <Line
            points={[0, height - 0.5, width, height - 0.5]}
            stroke={chart.milestoneBandBorder}
            strokeWidth={1}
            listening={false}
          />
          {bandLayout.blocks.map((block, blockIndex) => (
            <Group key={block.group.id} y={block.offsetY}>
              {blockIndex > 0 ? (
                <Line
                  points={[0, 0, width, 0]}
                  stroke={chart.milestoneBandBorder}
                  strokeWidth={1}
                  listening={false}
                />
              ) : null}
              {block.milestones.map((milestone) => {
                const lane = block.lanes.get(milestone.id) ?? 0;
                const x = dateToX(parseDate(milestone.date));
                const y = lane * laneHeight + laneHeight / 2;
                if (x < -180 || x > width + 40) return null;
                const displayName =
                  bandLayout.displayLabels.get(milestone.id) ?? milestone.name;
                const showHover = displayName !== milestone.name;
                const guideOn = milestoneGuideLineIds.has(milestone.id);
                return (
                  <MilestoneMark
                    key={milestone.id}
                    milestone={milestone}
                    displayName={displayName}
                    x={x}
                    y={y}
                    blockOffsetY={block.offsetY}
                    milestoneBandTotalHeight={height}
                    diamondSize={diamondSize}
                    fontSize={fontSize}
                    pxPerDay={pxPerDay}
                    guideOn={guideOn}
                    diffMarked={diffMarkedMilestoneId === milestone.id}
                    diffMarkStrokeWidth={diffMarkStrokeWidth}
                    onMove={(delta) => onMove(milestone.id, delta)}
                    onOpenEdit={() => onOpenEdit(milestone.id)}
                    onToggleGuideLine={() => onToggleGuideLine(milestone.id)}
                    onContextMenu={(clientX, clientY) =>
                      onContextMenu(milestone.id, clientX, clientY)
                    }
                    onHoverChange={(active) => {
                      if (!showHover) {
                        onHoverMilestone(null);
                        return;
                      }
                      onHoverMilestone(active ? { id: milestone.id } : null);
                    }}
                    linkMode={linkMode}
                    chart={chart}
                  />
                );
              })}
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function MilestoneMark({
  milestone,
  displayName,
  x,
  y,
  blockOffsetY,
  milestoneBandTotalHeight,
  diamondSize,
  fontSize,
  pxPerDay,
  guideOn,
  onMove,
  onOpenEdit,
  onToggleGuideLine,
  onContextMenu,
  onHoverChange,
  linkMode,
  chart,
  diffMarked,
  diffMarkStrokeWidth,
}: {
  milestone: Milestone;
  displayName: string;
  x: number;
  y: number;
  blockOffsetY: number;
  milestoneBandTotalHeight: number;
  diamondSize: number;
  fontSize: number;
  pxPerDay: number;
  guideOn: boolean;
  diffMarked: boolean;
  diffMarkStrokeWidth: number;
  onMove: (deltaDays: number) => void;
  onOpenEdit: () => void;
  onToggleGuideLine: () => void;
  onContextMenu: (x: number, y: number) => void;
  onHoverChange: (active: boolean) => void;
  linkMode: boolean;
  chart: ChartPalette;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const originX = useRef(x);
  const dragMovedRef = useRef(false);
  const guideClickDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radius = diamondSize / 2;
  const tentative = milestone.confidence === "tentative";
  const outlineWidth = milestoneDiamondOutlineWidth(diamondSize);
  const guide = milestoneMarkGuideGeometry(
    diamondSize,
    fontSize,
    displayName,
    y,
    blockOffsetY,
    milestoneBandTotalHeight,
  );

  const clearGuideClickDelay = () => {
    if (guideClickDelayRef.current != null) {
      clearTimeout(guideClickDelayRef.current);
      guideClickDelayRef.current = null;
    }
  };

  const scheduleGuideToggle = () => {
    clearGuideClickDelay();
    guideClickDelayRef.current = setTimeout(() => {
      guideClickDelayRef.current = null;
      onToggleGuideLine();
    }, MILESTONE_GUIDE_CLICK_DELAY_MS);
  };

  useEffect(() => clearGuideClickDelay, []);

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={!linkMode}
      dragBoundFunc={(pos) => ({ x: pos.x, y })}
      onMouseEnter={() => {
        if (linkMode) return;
        onHoverChange(true);
      }}
      onMouseLeave={() => {
        onHoverChange(false);
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        if (linkMode) return;
        onContextMenu(e.evt.clientX, e.evt.clientY);
      }}
      onClick={(e) => {
        if (linkMode) return;
        if (e.evt.button !== 0) return;
        if (dragMovedRef.current) {
          dragMovedRef.current = false;
          return;
        }
        scheduleGuideToggle();
      }}
      onTap={() => {
        if (linkMode) return;
        if (dragMovedRef.current) {
          dragMovedRef.current = false;
          return;
        }
        scheduleGuideToggle();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (linkMode) return;
        clearGuideClickDelay();
        onOpenEdit();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        if (linkMode) return;
        clearGuideClickDelay();
        onOpenEdit();
      }}
      onDragStart={(e) => {
        clearGuideClickDelay();
        dragMovedRef.current = false;
        originX.current = e.target.x();
      }}
      onDragEnd={(e) => {
        const node = e.target;
        const deltaPx = node.x() - originX.current;
        const delta = Math.round(deltaPx / pxPerDay);
        node.position({ x: originX.current, y });
        if (delta !== 0) {
          clearGuideClickDelay();
          dragMovedRef.current = true;
          onMove(delta);
        }
      }}
    >
      {guideOn ? (
        <>
          <Line
            points={[0, 0, 0, guide.bandVerticalY2]}
            stroke={chart.milestoneGuideLine}
            strokeWidth={1}
            dash={[...MILESTONE_GUIDE_DASH]}
            listening={false}
          />
          <Line
            points={[
              guide.underlineX1,
              guide.underlineY,
              guide.underlineX2,
              guide.underlineY,
            ]}
            stroke={chart.milestoneGuideLine}
            strokeWidth={1}
            dash={[...MILESTONE_GUIDE_DASH]}
            listening={false}
          />
        </>
      ) : null}
      <Shape
        fill="black"
        listening
        sceneFunc={() => {}}
        hitFunc={(context, shape) => {
          const hit = milestoneMarkHit(diamondSize, fontSize, displayName);
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
        fill={tentative ? undefined : chart.milestoneDiamond}
        stroke={
          tentative ? chart.milestoneDiamond : chart.milestoneDiamondStroke
        }
        strokeWidth={
          diffMarked
            ? diffMarkStrokeWidth
            : tentative
              ? outlineWidth
              : 1
        }
        listening={false}
      />
      <Text
        x={radius + MILESTONE_LABEL_GAP}
        y={-fontSize / 2}
        text={displayName}
        fontSize={fontSize}
        fontStyle="bold"
        fontFamily={KONVA_FONT_FAMILY}
        fill={chart.milestoneDiamond}
        listening={false}
      />
    </Group>
  );
}

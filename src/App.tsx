import {
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Layer, Line, Rect, Stage } from "react-konva";
import type Konva from "konva";

const TOTAL_DAYS = 10;
const MIN_PX_PER_DAY = 4;
const MAX_PX_PER_DAY = 80;
const STAGE_WIDTH = 720;
const STAGE_HEIGHT = 280;
const BAR_ROW_Y = 120;
const BAR_HEIGHT = 28;
const BAR_START_DAY = 2;
const BAR_DURATION_DAYS = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gridTier(pxPerDay: number) {
  if (pxPerDay >= 40) return "day";
  if (pxPerDay >= 10) return "week";
  return "month";
}

function tierLabel(tier: ReturnType<typeof gridTier>) {
  if (tier === "day") return "日表示";
  if (tier === "week") return "週表示";
  return "月表示";
}

function App() {
  const [pxPerDay, setPxPerDay] = useState(16);
  const [scrollX, setScrollX] = useState(0);
  const stageRef = useRef<Konva.Stage>(null);

  const setZoom = useCallback(
    (newPxPerDay: number, pointerX: number) => {
      const clampedPx = clamp(newPxPerDay, MIN_PX_PER_DAY, MAX_PX_PER_DAY);
      const anchorDayIndex = (pointerX + scrollX) / pxPerDay;
      const maxScroll = Math.max(0, TOTAL_DAYS * clampedPx - STAGE_WIDTH);
      const nextScrollX = clamp(
        anchorDayIndex * clampedPx - pointerX,
        0,
        maxScroll,
      );
      setPxPerDay(clampedPx);
      setScrollX(nextScrollX);
    },
    [pxPerDay, scrollX],
  );

  const onWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      if (!event.evt.ctrlKey && !event.evt.metaKey) return;
      event.evt.preventDefault();
      const pointerX =
        stageRef.current?.getPointerPosition()?.x ?? STAGE_WIDTH / 2;
      const factor = event.evt.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom(pxPerDay * factor, pointerX);
    },
    [pxPerDay, setZoom],
  );

  const tier = gridTier(pxPerDay);

  const canvasContent = useMemo(() => {
    const elements: ReactNode[] = [];

    for (let day = 0; day <= TOTAL_DAYS; day += 1) {
      const x = day * pxPerDay - scrollX;
      if (x < -pxPerDay || x > STAGE_WIDTH + pxPerDay) continue;
      const isMajor =
        tier === "day" || (tier === "week" && day % 7 === 0) || day === 0;
      elements.push(
        <Line
          key={`grid-${day}`}
          points={[x, 0, x, STAGE_HEIGHT]}
          stroke={isMajor ? "#C5CAD3" : "#E8EAEE"}
          strokeWidth={1}
          listening={false}
        />,
      );
    }

    const barX = BAR_START_DAY * pxPerDay - scrollX;
    const barWidth = BAR_DURATION_DAYS * pxPerDay;
    elements.push(
      <Rect
        key="sample-bar"
        x={barX}
        y={BAR_ROW_Y}
        width={barWidth}
        height={BAR_HEIGHT}
        fill="#4C5FD5"
        cornerRadius={4}
        listening={false}
      />,
    );

    return elements;
  }, [pxPerDay, scrollX, tier]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, margin: "0 0 8px" }}>
        schedule-viewer — Konva 動作確認
      </h1>
      <p style={{ fontSize: 12, color: "#697586", margin: "0 0 12px" }}>
        Ctrl(⌘)+ホイールでズーム（ポインタ基準） · 現在: {tierLabel(tier)} ·{" "}
        {pxPerDay.toFixed(1)} px/日
      </p>
      <div
        style={{
          border: "1px solid #E3E6EB",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Stage
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          ref={stageRef}
          onWheel={onWheel}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              fill="#ffffff"
              listening={false}
            />
            {canvasContent}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

export default App;

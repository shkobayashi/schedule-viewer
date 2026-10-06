import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, clamp, daysBetween } from "../model/dates";
import { scrollXForToday, scrollXToRevealTask } from "../model/chartScroll";
import {
  DEFAULT_PX_PER_DAY,
  gridTier,
  type GridTier,
  MAX_PX_PER_DAY,
  MIN_PX_PER_DAY,
  pxPerDayForTier,
  tierLabel,
} from "../model/timeline";

type TimelineRange = {
  timelineStart: Date;
  totalDays: number;
};

export function useTimelineView(
  range: TimelineRange,
  viewportWidth: number,
  maxScrollYFor: (pxPerDay: number) => number,
  todayIso: string,
) {
  const [pxPerDay, setPxPerDay] = useState(DEFAULT_PX_PER_DAY);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const { timelineStart, totalDays } = range;
  const maxScrollY = maxScrollYFor(pxPerDay);

  const maxScrollX = Math.max(0, totalDays * pxPerDay - viewportWidth);
  const prevTimelineStartRef = useRef(timelineStart);

  useEffect(() => {
    setScrollY((sy) => clamp(sy, 0, maxScrollY));
  }, [maxScrollY]);

  useEffect(() => {
    setScrollX((sx) => clamp(sx, 0, maxScrollX));
  }, [maxScrollX]);

  useEffect(() => {
    const prev = prevTimelineStartRef.current;
    if (prev.getTime() === timelineStart.getTime()) return;
    const deltaDays = daysBetween(prev, timelineStart);
    const deltaPx = deltaDays * pxPerDay;
    setScrollX((sx) => clamp(sx - deltaPx, 0, maxScrollX));
    prevTimelineStartRef.current = timelineStart;
  }, [maxScrollX, pxPerDay, timelineStart]);

  const dateToX = useCallback(
    (d: Date) => daysBetween(timelineStart, d) * pxPerDay - scrollX,
    [timelineStart, pxPerDay, scrollX],
  );

  const xToDate = useCallback(
    (x: number) => addDays(timelineStart, (x + scrollX) / pxPerDay),
    [timelineStart, scrollX, pxPerDay],
  );

  const setZoom = useCallback(
    (newPx: number, anchorX: number) => {
      const clamped = clamp(newPx, MIN_PX_PER_DAY, MAX_PX_PER_DAY);
      const anchorDate = xToDate(anchorX);
      const anchorDayIdx = daysBetween(timelineStart, anchorDate);
      const nextMaxScroll = Math.max(0, totalDays * clamped - viewportWidth);
      setPxPerDay(clamped);
      setScrollX(
        clamp(anchorDayIdx * clamped - anchorX, 0, nextMaxScroll),
      );
    },
    [timelineStart, totalDays, viewportWidth, xToDate],
  );

  const zoomIn = useCallback(() => {
    setZoom(pxPerDay * 1.4, viewportWidth / 2);
  }, [pxPerDay, setZoom, viewportWidth]);

  const zoomOut = useCallback(() => {
    setZoom(pxPerDay / 1.4, viewportWidth / 2);
  }, [pxPerDay, setZoom, viewportWidth]);

  const fitToWidth = useCallback(() => {
    if (viewportWidth <= 0) return;
    const nextPx = clamp(viewportWidth / totalDays, MIN_PX_PER_DAY, MAX_PX_PER_DAY);
    setPxPerDay(nextPx);
    setScrollX(0);
  }, [totalDays, viewportWidth]);

  const setTierZoom = useCallback(
    (tier: GridTier) => {
      setZoom(pxPerDayForTier(tier), viewportWidth / 2);
    },
    [setZoom, viewportWidth],
  );

  const scrollToToday = useCallback(() => {
    setScrollX(
      scrollXForToday(
        todayIso,
        timelineStart,
        totalDays,
        pxPerDay,
        viewportWidth,
      ),
    );
  }, [pxPerDay, todayIso, timelineStart, totalDays, viewportWidth]);

  const reveal = useCallback(
    (date: Date, y: number, barWidthPx?: number) => {
      const nextX =
        barWidthPx != null
          ? scrollXToRevealTask(
              date,
              barWidthPx,
              scrollX,
              timelineStart,
              totalDays,
              pxPerDay,
              viewportWidth,
            )
          : clamp(
              daysBetween(timelineStart, date) * pxPerDay - 40,
              0,
              Math.max(0, totalDays * pxPerDay - viewportWidth),
            );
      setScrollX(nextX);
      setScrollY(clamp(y, 0, maxScrollY));
    },
    [maxScrollY, pxPerDay, scrollX, timelineStart, totalDays, viewportWidth],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setScrollX((sx) => clamp(sx - dx, 0, maxScrollX));
      setScrollY((sy) => clamp(sy - dy, 0, maxScrollY));
    },
    [maxScrollX, maxScrollY],
  );

  const scrollBy = useCallback(
    (dx: number, dy: number) => {
      setScrollX((sx) => clamp(sx + dx, 0, maxScrollX));
      setScrollY((sy) => clamp(sy + dy, 0, maxScrollY));
    },
    [maxScrollX, maxScrollY],
  );

  const handleWheel = useCallback(
    (
      e: WheelEvent,
      pointerX: number,
      mode: "body" | "header",
    ) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        setZoom(pxPerDay * factor, pointerX);
      } else if (e.shiftKey || mode === "header") {
        setScrollX((sx) => clamp(sx + e.deltaY, 0, maxScrollX));
      } else {
        setScrollY((sy) => clamp(sy + e.deltaY, 0, maxScrollY));
      }
    },
    [maxScrollX, maxScrollY, pxPerDay, setZoom],
  );

  const tier = gridTier(pxPerDay);

  return {
    pxPerDay,
    scrollX,
    scrollY,
    tier,
    tierLabel: tierLabel(tier),
    dateToX,
    xToDate,
    setZoom,
    zoomIn,
    zoomOut,
    fitToWidth,
    setTierZoom,
    scrollToToday,
    panBy,
    scrollBy,
    reveal,
    handleWheel,
    timelineStart,
    totalDays,
  };
}

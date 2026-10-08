import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { addDays, clamp, daysBetween } from "../model/dates";
import { scrollXForToday, scrollXToRevealTask } from "../model/chartScroll";
import { resolveWheelScroll } from "../model/wheelScroll";
import {
  DEFAULT_PX_PER_DAY,
  fitPxPerDayToViewport,
  gridTier,
  type GridTier,
  MAX_PX_PER_DAY,
  MIN_PX_PER_DAY,
  pxPerDayForTier,
  resolveTimelineOrigin,
  tierLabel,
} from "../model/timeline";

type TimelineRange = {
  timelineStart: Date;
  baseTotalDays: number;
};

export function useTimelineView(
  range: TimelineRange,
  viewportWidth: number,
  maxScrollYFor: (pxPerDay: number) => number,
  todayIso: string,
  resetKey: string | number = 0,
  extraDaysForPxPerDay: (px: number) => number = () => 0,
) {
  const [pxPerDay, setPxPerDay] = useState(DEFAULT_PX_PER_DAY);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const { timelineStart: dataStart, baseTotalDays } = range;
  const extraDays = extraDaysForPxPerDay(pxPerDay);
  const dataTotalDays = baseTotalDays + extraDays;
  const [pinnedStart, setPinnedStart] = useState(dataStart);
  const pinnedRef = useRef(dataStart);
  const resetRef = useRef(resetKey);
  const drawStart =
    dataStart.getTime() < pinnedStart.getTime() ? dataStart : pinnedStart;
  const dataEnd = addDays(dataStart, dataTotalDays);
  const totalDays = daysBetween(drawStart, dataEnd);
  const maxScrollY = maxScrollYFor(pxPerDay);

  const maxScrollX = Math.max(0, totalDays * pxPerDay - viewportWidth);

  useEffect(() => {
    setScrollY((sy) => clamp(sy, 0, maxScrollY));
  }, [maxScrollY]);

  useEffect(() => {
    setScrollX((sx) => clamp(sx, 0, maxScrollX));
  }, [maxScrollX]);

  useLayoutEffect(() => {
    if (resetRef.current !== resetKey) {
      resetRef.current = resetKey;
      pinnedRef.current = dataStart;
      setPinnedStart(dataStart);
      return;
    }
    const dataEndInEffect = addDays(dataStart, dataTotalDays);
    setScrollX((sx) => {
      const next = resolveTimelineOrigin({
        pinnedStart: pinnedRef.current,
        dataStart,
        scrollX: sx,
        pxPerDay,
      });
      if (next.pinnedStart.getTime() !== pinnedRef.current.getTime()) {
        pinnedRef.current = next.pinnedStart;
        setPinnedStart(next.pinnedStart);
      }
      const nextTotal = daysBetween(next.pinnedStart, dataEndInEffect);
      const nextMax = Math.max(0, nextTotal * pxPerDay - viewportWidth);
      return clamp(next.scrollX, 0, nextMax);
    });
  }, [dataStart, dataTotalDays, pxPerDay, resetKey, viewportWidth]);

  const dateToX = useCallback(
    (d: Date) => daysBetween(drawStart, d) * pxPerDay - scrollX,
    [drawStart, pxPerDay, scrollX],
  );

  const xToDate = useCallback(
    (x: number) => addDays(drawStart, (x + scrollX) / pxPerDay),
    [drawStart, scrollX, pxPerDay],
  );

  const prefixDays = daysBetween(drawStart, dataStart);

  const setZoom = useCallback(
    (newPx: number, anchorX: number) => {
      const clamped = clamp(newPx, MIN_PX_PER_DAY, MAX_PX_PER_DAY);
      const anchorDate = xToDate(anchorX);
      const anchorDayIdx = daysBetween(drawStart, anchorDate);
      const nextExtra = extraDaysForPxPerDay(clamped);
      const nextTotal = prefixDays + baseTotalDays + nextExtra;
      const nextMaxScroll = Math.max(0, nextTotal * clamped - viewportWidth);
      setPxPerDay(clamped);
      setScrollX(
        clamp(anchorDayIdx * clamped - anchorX, 0, nextMaxScroll),
      );
    },
    [
      baseTotalDays,
      drawStart,
      extraDaysForPxPerDay,
      prefixDays,
      viewportWidth,
      xToDate,
    ],
  );

  const zoomIn = useCallback(() => {
    setZoom(pxPerDay * 1.4, viewportWidth / 2);
  }, [pxPerDay, setZoom, viewportWidth]);

  const zoomOut = useCallback(() => {
    setZoom(pxPerDay / 1.4, viewportWidth / 2);
  }, [pxPerDay, setZoom, viewportWidth]);

  const fitToWidth = useCallback(() => {
    if (viewportWidth <= 0) return;
    const nextPx = fitPxPerDayToViewport(
      viewportWidth,
      prefixDays,
      baseTotalDays,
      extraDaysForPxPerDay,
    );
    setPxPerDay(nextPx);
    setScrollX(0);
  }, [baseTotalDays, extraDaysForPxPerDay, prefixDays, viewportWidth]);

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
        drawStart,
        totalDays,
        pxPerDay,
        viewportWidth,
      ),
    );
  }, [pxPerDay, todayIso, drawStart, totalDays, viewportWidth]);

  const reveal = useCallback(
    (date: Date, y: number, barWidthPx?: number) => {
      const nextX =
        barWidthPx != null
          ? scrollXToRevealTask(
              date,
              barWidthPx,
              scrollX,
              drawStart,
              totalDays,
              pxPerDay,
              viewportWidth,
            )
          : clamp(
              daysBetween(drawStart, date) * pxPerDay - 40,
              0,
              Math.max(0, totalDays * pxPerDay - viewportWidth),
            );
      setScrollX(nextX);
      setScrollY(clamp(y, 0, maxScrollY));
    },
    [maxScrollY, pxPerDay, scrollX, drawStart, totalDays, viewportWidth],
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
      const effect = resolveWheelScroll({
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        zone: mode,
      });
      if (effect.type === "zoom") {
        setZoom(pxPerDay * effect.factor, pointerX);
        return;
      }
      const { deltaScrollX, deltaScrollY } = effect;
      if (deltaScrollX !== 0) {
        setScrollX((sx) => clamp(sx + deltaScrollX, 0, maxScrollX));
      }
      if (deltaScrollY !== 0) {
        setScrollY((sy) => clamp(sy + deltaScrollY, 0, maxScrollY));
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
    timelineStart: drawStart,
    totalDays,
    timelineEnd: dataEnd,
  };
}

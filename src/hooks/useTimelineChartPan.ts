import { useCallback, useEffect, useRef, useState } from "react";
import { CHART_PAN_THRESHOLD_PX } from "../model/chartHitTest";

type UseTimelineChartPanOptions = {
  onPan: (dx: number, dy: number) => void;
};

export function useTimelineChartPan({ onPan }: UseTimelineChartPanOptions): {
  panSession: boolean;
  panning: boolean;
  suppressClickRef: React.MutableRefObject<boolean>;
  beginPan: (clientX: number, clientY: number) => void;
  endPan: () => void;
  commitLinkScrollPan: (
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
  ) => void;
} {
  const [panSession, setPanSession] = useState(false);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{
    x: number;
    y: number;
    active: boolean;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const panDeltaRef = useRef({ dx: 0, dy: 0 });
  const panRafRef = useRef<number | null>(null);

  const endPan = useCallback(() => {
    const pan = panRef.current;
    panRef.current = null;
    setPanning(false);
    setPanSession(false);
    if (pan?.moved) suppressClickRef.current = true;
  }, []);

  const beginPan = useCallback((clientX: number, clientY: number) => {
    suppressClickRef.current = false;
    panRef.current = {
      x: clientX,
      y: clientY,
      active: true,
      moved: false,
    };
    setPanSession(true);
  }, []);

  const commitLinkScrollPan = useCallback(
    (startX: number, startY: number, currentX: number, currentY: number) => {
      suppressClickRef.current = true;
      panRef.current = {
        x: currentX,
        y: currentY,
        active: true,
        moved: true,
      };
      setPanSession(true);
      setPanning(true);
      onPan(currentX - startX, currentY - startY);
    },
    [onPan],
  );

  useEffect(() => {
    if (!panSession) return;
    const flushPan = () => {
      panRafRef.current = null;
      const { dx, dy } = panDeltaRef.current;
      if (dx === 0 && dy === 0) return;
      panDeltaRef.current = { dx: 0, dy: 0 };
      onPan(dx, dy);
    };
    const onMove = (evt: MouseEvent) => {
      const pan = panRef.current;
      if (!pan?.active) return;
      const dx = evt.clientX - pan.x;
      const dy = evt.clientY - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < CHART_PAN_THRESHOLD_PX) return;
      pan.moved = true;
      pan.x = evt.clientX;
      pan.y = evt.clientY;
      setPanning(true);
      panDeltaRef.current.dx += dx;
      panDeltaRef.current.dy += dy;
      if (panRafRef.current == null) {
        panRafRef.current = window.requestAnimationFrame(flushPan);
      }
    };
    const onUp = () => {
      if (panRafRef.current != null) {
        window.cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
        flushPan();
      }
      endPan();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (panRafRef.current != null) {
        window.cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
    };
  }, [endPan, onPan, panSession]);

  return {
    panSession,
    panning,
    suppressClickRef,
    beginPan,
    endPan,
    commitLinkScrollPan,
  };
}

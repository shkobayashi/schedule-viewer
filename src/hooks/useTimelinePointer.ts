import { useEffect, useRef, useState, type RefObject } from "react";
import {
  chartHoverEquals,
  hitMilestoneDiamond,
  previewEndEquals,
  resolveChartHover,
  type ChartHover,
  type ChartPointer,
  type ChartTaskAnchor,
} from "../model/chartHitTest";
import type { LinkPolyline } from "../model/dependencies";
import type { ScheduleId } from "../model/types";

const EMPTY_HOVER: ChartHover = {
  overTask: false,
  overMilestone: false,
  link: null,
  hoverTaskId: null,
};

type UseTimelinePointerOptions = {
  linkMode: boolean;
  milestones: readonly { id: ScheduleId; date: string; name: string }[];
  milestoneLanes: ReadonlyMap<ScheduleId, number>;
  dateToX: (date: Date) => number;
  milestoneDiamondSize: number;
  milestoneLaneHeight: number;
  milestoneFontSize: number;
  liveAnchors: ReadonlyMap<ScheduleId, ChartTaskAnchor>;
  linkPolylines: readonly LinkPolyline[];
  barHeight: number;
  selectedTaskId: ScheduleId | null;
  clipTop: number;
  onChartPointer: (pointer: ChartPointer) => void;
};

export function useTimelinePointer({
  linkMode,
  milestones,
  milestoneLanes,
  dateToX,
  milestoneDiamondSize,
  milestoneLaneHeight,
  milestoneFontSize,
  liveAnchors,
  linkPolylines,
  barHeight,
  selectedTaskId,
  clipTop,
  onChartPointer,
}: UseTimelinePointerOptions): {
  bodyRef: RefObject<HTMLDivElement | null>;
  bandRef: RefObject<HTMLDivElement | null>;
  hover: ChartHover;
  previewEnd: { x: number; y: number } | null;
} {
  const bodyRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{
    x: number;
    y: number;
    sidebar: boolean;
  } | null>(null);
  const [hover, setHover] = useState<ChartHover>(EMPTY_HOVER);
  const [previewEnd, setPreviewEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const evaluatePointerRef = useRef(() => {});
  evaluatePointerRef.current = () => {
    const clientPointer = pointerRef.current;
    if (clientPointer == null) {
      setHover((prev) =>
        prev.overTask || prev.overMilestone || prev.link || prev.hoverTaskId
          ? EMPTY_HOVER
          : prev,
      );
      setPreviewEnd((prev) => (prev == null ? prev : null));
      return;
    }

    let overMilestone = false;
    const band = bandRef.current?.getBoundingClientRect();
    if (
      band &&
      clientPointer.x >= band.left &&
      clientPointer.x <= band.right &&
      clientPointer.y >= band.top &&
      clientPointer.y <= band.bottom
    ) {
      overMilestone = hitMilestoneDiamond(
        {
          x: clientPointer.x - band.left,
          y: clientPointer.y - band.top,
        },
        milestones,
        milestoneLanes,
        dateToX,
        milestoneDiamondSize,
        milestoneLaneHeight,
        milestoneFontSize,
      );
    }

    const body = bodyRef.current?.getBoundingClientRect();
    const local = body
      ? {
          x: clientPointer.x - body.left,
          y: clientPointer.y - body.top,
        }
      : null;
    const insideBody =
      body != null &&
      local != null &&
      clientPointer.x >= body.left &&
      clientPointer.x <= body.right &&
      clientPointer.y >= body.top &&
      clientPointer.y <= body.bottom;
    const resolved = resolveChartHover({
      insideBody,
      local,
      overMilestone,
      anchors: liveAnchors,
      linkPolylines,
      barHeight,
      linkMode,
      selectedTaskId,
      sidebar: clientPointer.sidebar,
      clipTop,
    });
    setHover((prev) => (chartHoverEquals(prev, resolved.hover) ? prev : resolved.hover));
    setPreviewEnd((prev) =>
      previewEndEquals(prev, resolved.previewEnd) ? prev : resolved.previewEnd,
    );
  };

  useEffect(() => {
    let frame: number | null = null;
    const schedule = () => {
      if (frame != null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        evaluatePointerRef.current();
      });
    };
    const onMove = (event: Event) => {
      if (!(event instanceof globalThis.MouseEvent)) return;
      const sidebar =
        event.currentTarget instanceof Element &&
        event.currentTarget.closest(".sidebar") != null;
      pointerRef.current = { x: event.clientX, y: event.clientY, sidebar };
      schedule();
    };
    const onLeave = (event: Event) => {
      if (!(event instanceof globalThis.MouseEvent)) return;
      const next = event.relatedTarget;
      const band = bandRef.current;
      const body = bodyRef.current;
      const sidebar = document.querySelector(".sidebar");
      if (
        next instanceof Node &&
        (band?.contains(next) ||
          body?.contains(next) ||
          (linkMode && sidebar?.contains(next)))
      ) {
        return;
      }
      pointerRef.current = null;
      schedule();
    };
    const targets: EventTarget[] = [];
    const add = (node: EventTarget | null) => {
      if (!node) return;
      node.addEventListener("mousemove", onMove);
      node.addEventListener("mouseleave", onLeave);
      targets.push(node);
    };
    add(bandRef.current);
    add(bodyRef.current);
    if (linkMode) add(document.querySelector(".sidebar"));
    return () => {
      for (const node of targets) {
        node.removeEventListener("mousemove", onMove);
        node.removeEventListener("mouseleave", onLeave);
      }
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, [linkMode]);

  const onChartPointerRef = useRef(onChartPointer);
  onChartPointerRef.current = onChartPointer;
  useEffect(() => {
    onChartPointerRef.current({
      overTask: hover.overTask,
      overMilestone: hover.overMilestone,
      link: hover.link,
      hoverTaskId: hover.hoverTaskId,
    });
  }, [hover.hoverTaskId, hover.link, hover.overMilestone, hover.overTask]);

  return { bodyRef, bandRef, hover, previewEnd };
}

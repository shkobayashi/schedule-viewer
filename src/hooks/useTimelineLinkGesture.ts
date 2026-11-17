import { useCallback, useEffect, useRef, type RefObject } from "react";
import type Konva from "konva";
import {
  clientOffsetInRect,
  hitTaskAnchor,
  type LinkModePointerButton,
  type LinkModePressSurface,
  resolveLinkModeGesture,
} from "../model/chartHitTest";
import type { TimelineLiveAnchor } from "../model/timelineLiveAnchors";
import {
  shouldFireTimelineLinkPointerClick,
  TIMELINE_LINK_DOUBLE_CLICK_MS,
} from "../model/timelineLinkPointerClick";
import type { ScheduleId } from "../model/types";

const LINK_DOUBLE_CLICK_MS = TIMELINE_LINK_DOUBLE_CLICK_MS;

type UseTimelineLinkGestureOptions = {
  linkMode: boolean;
  bodyRef: RefObject<HTMLDivElement | null>;
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
  barHeight: number;
  selectedTaskId: ScheduleId | null;
  spacePanArmed: boolean;
  onLinkTargetClick: (taskId: ScheduleId) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
  beginPan: (clientX: number, clientY: number) => void;
  endPan: () => void;
  commitLinkScrollPan: (
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
  ) => void;
  resizeHitAt: (pos: { x: number; y: number }) => unknown;
};

export function useTimelineLinkGesture({
  linkMode,
  bodyRef,
  liveAnchors,
  barHeight,
  selectedTaskId,
  spacePanArmed,
  onLinkTargetClick,
  suppressClickRef,
  beginPan,
  endPan,
  commitLinkScrollPan,
  resizeHitAt,
}: UseTimelineLinkGestureOptions): {
  linkBarPointerDown: (
    e: Konva.KonvaEventObject<PointerEvent>,
    taskId: ScheduleId,
  ) => void;
  onBodyMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  linkPressRef: React.MutableRefObject<boolean>;
} {
  const linkClickAtRef = useRef(0);
  const linkPointerFireRef = useRef<{
    taskId: ScheduleId;
    at: number;
  } | null>(null);
  const linkPressRef = useRef(false);
  const linkPressTimerRef = useRef<number | null>(null);
  const armLinkPress = useCallback(() => {
    linkPressRef.current = true;
    if (linkPressTimerRef.current != null) {
      window.clearTimeout(linkPressTimerRef.current);
    }
    linkPressTimerRef.current = window.setTimeout(() => {
      linkPressRef.current = false;
      linkPressTimerRef.current = null;
    }, LINK_DOUBLE_CLICK_MS + 100);
  }, []);
  useEffect(() => {
    return () => {
      if (linkPressTimerRef.current != null) {
        window.clearTimeout(linkPressTimerRef.current);
      }
    };
  }, []);

  const linkGestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    surface: LinkModePressSurface;
    taskId: ScheduleId | null;
    button: LinkModePointerButton;
    scrollCommitted: boolean;
    useMouse: boolean;
  } | null>(null);
  const endLinkGestureListenersRef = useRef<(() => void) | null>(null);

  const clearLinkGesture = useCallback(() => {
    endLinkGestureListenersRef.current?.();
    endLinkGestureListenersRef.current = null;
    linkGestureRef.current = null;
  }, []);

  const taskIdAtChartClient = useCallback(
    (clientX: number, clientY: number): ScheduleId | null => {
      const body = bodyRef.current?.getBoundingClientRect();
      if (!body) return null;
      const pos = clientOffsetInRect(clientX, clientY, body);
      const hit = hitTaskAnchor(pos, liveAnchors, barHeight, {
        linkMode: true,
        selectedTaskId,
      });
      return hit?.taskId ?? null;
    },
    [barHeight, bodyRef, liveAnchors, selectedTaskId],
  );

  const fireLinkTargetClick = useCallback(
    (taskId: ScheduleId) => {
      armLinkPress();
      const now = performance.now();
      if (now - linkClickAtRef.current < 50) return;
      linkClickAtRef.current = now;
      linkPointerFireRef.current = { taskId, at: now };
      suppressClickRef.current = true;
      onLinkTargetClick(taskId);
    },
    [armLinkPress, onLinkTargetClick, suppressClickRef],
  );

  const shouldFireLinkPointerClick = useCallback(
    (taskId: ScheduleId, evt: MouseEvent | PointerEvent) => {
      const detail = evt instanceof MouseEvent ? evt.detail : 1;
      return shouldFireTimelineLinkPointerClick({
        taskId,
        eventClickDetail: detail,
        lastFire: linkPointerFireRef.current,
        now: performance.now(),
        doubleClickWindowMs: LINK_DOUBLE_CLICK_MS,
      });
    },
    [],
  );

  const beginLinkGesture = useCallback(
    (params: {
      pointerId: number | null;
      clientX: number;
      clientY: number;
      surface: LinkModePressSurface;
      taskId: ScheduleId | null;
      button: LinkModePointerButton;
      useMouse: boolean;
    }) => {
      clearLinkGesture();
      if (params.surface === "taskBar") {
        armLinkPress();
      }
      linkGestureRef.current = {
        pointerId: params.pointerId,
        startX: params.clientX,
        startY: params.clientY,
        surface: params.surface,
        taskId: params.taskId,
        button: params.button,
        scrollCommitted: false,
        useMouse: params.useMouse,
      };

      const finishGesture = (
        clientX: number,
        clientY: number,
        phase: "move" | "release",
        evt?: MouseEvent | PointerEvent,
      ) => {
        const g = linkGestureRef.current;
        if (!g) return;
        const distance = Math.hypot(clientX - g.startX, clientY - g.startY);
        const releaseOnSameTaskBar =
          g.taskId != null && taskIdAtChartClient(clientX, clientY) === g.taskId;
        const resolution = resolveLinkModeGesture({
          phase,
          distancePx: distance,
          surface: g.surface,
          button: g.button,
          releaseOnSameTaskBar,
          scrollCommitted: g.scrollCommitted,
        });
        if (phase === "move") {
          if (resolution.kind === "scroll" && !g.scrollCommitted) {
            g.scrollCommitted = true;
            commitLinkScrollPan(g.startX, g.startY, clientX, clientY);
          }
          return;
        }
        const scrollCommitted = g.scrollCommitted;
        const taskId = g.taskId;
        clearLinkGesture();
        if (scrollCommitted) {
          endPan();
          return;
        }
        if (
          resolution.kind === "linkClick" &&
          taskId != null &&
          evt != null &&
          shouldFireLinkPointerClick(taskId, evt)
        ) {
          fireLinkTargetClick(taskId);
        }
      };

      const onPointerMove = (evt: PointerEvent) => {
        const g = linkGestureRef.current;
        if (!g || g.useMouse || evt.pointerId !== g.pointerId) return;
        finishGesture(evt.clientX, evt.clientY, "move");
      };
      const onPointerUp = (evt: PointerEvent) => {
        const g = linkGestureRef.current;
        if (!g || g.useMouse || evt.pointerId !== g.pointerId) return;
        finishGesture(evt.clientX, evt.clientY, "release", evt);
      };
      const onPointerCancel = (evt: PointerEvent) => {
        const g = linkGestureRef.current;
        if (!g || g.useMouse || evt.pointerId !== g.pointerId) return;
        const scrollCommitted = g.scrollCommitted;
        clearLinkGesture();
        if (scrollCommitted) endPan();
      };
      const onMouseMove = (evt: MouseEvent) => {
        const g = linkGestureRef.current;
        if (!g || !g.useMouse) return;
        finishGesture(evt.clientX, evt.clientY, "move");
      };
      const onMouseUp = (evt: MouseEvent) => {
        const g = linkGestureRef.current;
        if (!g || !g.useMouse) return;
        finishGesture(evt.clientX, evt.clientY, "release", evt);
      };

      if (params.useMouse) {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        endLinkGestureListenersRef.current = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };
      } else {
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerCancel);
        endLinkGestureListenersRef.current = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerCancel);
        };
      }
    },
    [
      armLinkPress,
      clearLinkGesture,
      commitLinkScrollPan,
      endPan,
      fireLinkTargetClick,
      shouldFireLinkPointerClick,
      taskIdAtChartClient,
    ],
  );

  const linkBarPointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, taskId: ScheduleId) => {
      if (!linkMode) return;
      const panOnly = e.evt.button === 1 || spacePanArmed;
      if (e.evt.button !== 0 && e.evt.button !== 1) return;
      e.cancelBubble = true;
      const button: LinkModePointerButton = panOnly
        ? e.evt.button === 1
          ? "middle"
          : "spacePan"
        : "primary";
      beginLinkGesture({
        pointerId: e.evt.pointerId,
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
        surface: "taskBar",
        taskId,
        button,
        useMouse: false,
      });
    },
    [beginLinkGesture, linkMode, spacePanArmed],
  );

  const onBodyMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const panOnly = e.evt.button === 1 || spacePanArmed;
      if (e.evt.button !== 0 && e.evt.button !== 1) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos != null && resizeHitAt(pos) != null && !linkMode) return;
      const target = e.target;
      const overTaskBar =
        target.name() === "task-bar" || target.findAncestor(".task-bar");
      if (linkMode && overTaskBar) {
        return;
      }
      if (!panOnly && overTaskBar) {
        return;
      }
      if (!panOnly && (e.evt.metaKey || e.evt.ctrlKey)) return;
      if (linkMode) {
        const button: LinkModePointerButton = panOnly
          ? e.evt.button === 1
            ? "middle"
            : "spacePan"
          : "primary";
        beginLinkGesture({
          pointerId: null,
          clientX: e.evt.clientX,
          clientY: e.evt.clientY,
          surface: "chartEmpty",
          taskId: null,
          button,
          useMouse: true,
        });
        return;
      }
      suppressClickRef.current = false;
      beginPan(e.evt.clientX, e.evt.clientY);
    },
    [
      beginLinkGesture,
      beginPan,
      linkMode,
      resizeHitAt,
      spacePanArmed,
      suppressClickRef,
    ],
  );

  useEffect(() => {
    if (!linkMode) {
      clearLinkGesture();
      endPan();
    }
  }, [clearLinkGesture, endPan, linkMode]);

  return { linkBarPointerDown, onBodyMouseDown, linkPressRef };
}

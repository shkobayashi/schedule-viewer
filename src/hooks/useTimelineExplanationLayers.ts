import { useMemo, type MutableRefObject } from "react";
import { duplicateMemberNamesFromCatalog } from "../model/assigneeDisplay";
import {
  explanationOverlayActive,
  type ExplanationOverlayState,
} from "../model/explainOverlay";
import {
  buildExplanationOverlayGeometry,
  type ExplanationOverlayGeometry,
} from "../model/explainOverlayLayout";
import {
  buildExplanationTrialBarLayouts,
  buildExplanationTrialMilestoneLayouts,
  buildExplanationTrialPredecessorArcs,
  type ExplanationTrialBarLayout,
  type ExplanationTrialMilestoneLayout,
  type ExplanationTrialPredecessorArc,
} from "../model/explainOverlayPatterns";
import type { MilestoneBandLayout } from "../model/milestones";
import type { TaskBarAnchor } from "../model/connections";
import type { TimelineLiveAnchor } from "../model/timelineLiveAnchors";
import { milestoneIdsWithTrialMoveFromLayouts } from "../model/timelineExplanationTrialIds";
import type { Member, MemberId } from "../model/memberTypes";
import type {
  Category,
  Milestone,
  OutlineRoot,
  ScheduleId,
  VisibleRow,
} from "../model/types";

type UseTimelineExplanationLayersOptions = {
  explanationOverlay?: ExplanationOverlayState | null;
  explainOverlayCategories?: Category[];
  explainOverlayOutline?: OutlineRoot;
  explainOverlayLiveAnchorsRef?: MutableRefObject<
    Map<ScheduleId, TaskBarAnchor>
  > | null;
  visibleRows: readonly VisibleRow[];
  dateToX: (d: Date) => number;
  pxPerDay: number;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  headerHeight: number;
  width: number;
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
  milestones: Milestone[];
  milestoneBandLayout: MilestoneBandLayout;
  milestoneDiamondSize: number;
  tier: "day" | "week" | "month";
  memberCatalog: Map<MemberId, Member> | null;
  uiScale?: number;
};

export function useTimelineExplanationLayers({
  explanationOverlay = null,
  explainOverlayCategories = [],
  explainOverlayOutline,
  explainOverlayLiveAnchorsRef,
  visibleRows,
  dateToX,
  pxPerDay,
  scrollY,
  rowHeight,
  barHeight,
  bodyHeight,
  headerHeight,
  width,
  liveAnchors,
  milestones,
  milestoneBandLayout,
  milestoneDiamondSize,
  tier,
  memberCatalog,
  uiScale = 1,
}: UseTimelineExplanationLayersOptions): {
  explanationActive: boolean;
  explanationOverlayGeometry: ExplanationOverlayGeometry | null;
  explanationTrialMilestones: ExplanationTrialMilestoneLayout[];
  milestoneIdsWithTrialMove: Set<ScheduleId>;
  explanationTrialBars: ExplanationTrialBarLayout[];
  explanationTrialPredecessorArcs: ExplanationTrialPredecessorArc[];
} {
  if (explainOverlayLiveAnchorsRef != null) {
    explainOverlayLiveAnchorsRef.current =
      liveAnchors as unknown as Map<ScheduleId, TaskBarAnchor>;
  }

  const explanationOverlayGeometry = useMemo(() => {
    if (!explanationOverlayActive(explanationOverlay)) return null;
    return buildExplanationOverlayGeometry({
      marks: explanationOverlay.marks,
      patterns: explanationOverlay.patterns,
      categories: explainOverlayCategories,
      outline: explainOverlayOutline,
      visibleRows,
      dateToX,
      pxPerDay,
      scrollY,
      rowHeight,
      barHeight,
      bodyHeight,
      headerHeight,
      timelineWidth: width,
      liveAnchors,
      milestones,
      milestoneCenterYById: milestoneBandLayout.centerYById,
      milestoneBandLayout,
      milestoneDiamondSize,
      tier,
      memberCatalog,
      assigneeDuplicateNames: duplicateMemberNamesFromCatalog(memberCatalog),
      displayScale: uiScale,
    });
  }, [
    barHeight,
    bodyHeight,
    dateToX,
    explanationOverlay,
    explainOverlayCategories,
    explainOverlayOutline,
    headerHeight,
    liveAnchors,
    milestoneBandLayout,
    milestoneDiamondSize,
    milestones,
    memberCatalog,
    pxPerDay,
    rowHeight,
    scrollY,
    tier,
    uiScale,
    visibleRows,
    width,
  ]);

  const explanationTrialMilestones = useMemo(() => {
    if (!explanationOverlayActive(explanationOverlay)) return [];
    if (explanationOverlay.patterns.length === 0) return [];
    return buildExplanationTrialMilestoneLayouts({
      patterns: explanationOverlay.patterns,
      milestones,
      milestoneCenterYById: milestoneBandLayout.centerYById,
      diamondSize: milestoneDiamondSize,
      dateToX,
    });
  }, [
    dateToX,
    explanationOverlay,
    milestoneBandLayout.centerYById,
    milestoneDiamondSize,
    milestones,
  ]);

  const milestoneIdsWithTrialMove = useMemo(
    () => milestoneIdsWithTrialMoveFromLayouts(explanationTrialMilestones),
    [explanationTrialMilestones],
  );

  const explanationTrialBars = useMemo(() => {
    if (!explanationOverlayActive(explanationOverlay)) return [];
    if (explanationOverlay.patterns.length === 0) return [];
    return buildExplanationTrialBarLayouts({
      patterns: explanationOverlay.patterns,
      visibleRows,
      categories: explainOverlayCategories,
      outline: explainOverlayOutline,
      scrollY,
      rowHeight,
      barHeight,
      pxPerDay,
      dateToX,
    });
  }, [
    barHeight,
    dateToX,
    explainOverlayCategories,
    explainOverlayOutline,
    explanationOverlay,
    pxPerDay,
    rowHeight,
    scrollY,
    visibleRows,
  ]);

  const explanationTrialPredecessorArcs = useMemo(() => {
    if (!explanationOverlayActive(explanationOverlay)) return [];
    if (explanationOverlay.patterns.length === 0) return [];
    return buildExplanationTrialPredecessorArcs({
      patterns: explanationOverlay.patterns,
      visibleRows,
      categories: explainOverlayCategories,
      outline: explainOverlayOutline,
      scrollY,
      rowHeight,
      barHeight,
      pxPerDay,
      dateToX,
      liveAnchors,
    });
  }, [
    barHeight,
    dateToX,
    explainOverlayCategories,
    explainOverlayOutline,
    explanationOverlay,
    liveAnchors,
    pxPerDay,
    rowHeight,
    scrollY,
    visibleRows,
  ]);

  const explanationActive = explanationOverlayActive(explanationOverlay);

  return {
    explanationActive,
    explanationOverlayGeometry,
    explanationTrialMilestones,
    milestoneIdsWithTrialMove,
    explanationTrialBars,
    explanationTrialPredecessorArcs,
  };
}

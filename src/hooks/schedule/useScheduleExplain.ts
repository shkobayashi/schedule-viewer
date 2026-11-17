import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  explainViewApplySuccessText,
  explainViewClearSuccessText,
  parseExplainViewRequest,
  type ExplainViewDocumentContext,
  type ExplanationViewState,
} from "../../model/explainView";
import {
  explainOverlayHideSuccessText,
  explainOverlayShowSuccessText,
  parseExplainOverlayRequest,
  type ExplanationOverlayState,
} from "../../model/explainOverlay";
import {
  planExplanationOverlayScroll,
  type PlanExplanationScrollInput,
  type ExplanationScrollPlan,
} from "../../model/explainOverlayLayout";
import { emptyTaskSelection } from "../../model/taskSelection";
import type { DocumentSnapshot } from "../../model/history";
import type { ScheduleId, VisibleRow } from "../../model/types";
import { shouldClearExplanationOnHumanViewChange } from "./scheduleExplainSession";

export type UseScheduleExplainParams = {
  documentRef: MutableRefObject<DocumentSnapshot>;
  prunedHiddenMilestoneGroupIdsRef: MutableRefObject<ScheduleId[]>;
  setTaskSelection: Dispatch<SetStateAction<import("../../model/taskSelection").TaskSelectionState>>;
  displayedCollapsedRef: MutableRefObject<ReadonlySet<string>>;
  visibleRowsRef: MutableRefObject<VisibleRow[]>;
  explainOverlayRuntime?: MutableRefObject<{
    getPlanInput: () => PlanExplanationScrollInput | null;
    applyScroll: (plan: ExplanationScrollPlan) => void;
  } | null>;
};

export function useScheduleExplain({
  documentRef,
  prunedHiddenMilestoneGroupIdsRef,
  setTaskSelection,
  displayedCollapsedRef,
  visibleRowsRef,
  explainOverlayRuntime,
}: UseScheduleExplainParams) {
  const [explanationView, setExplanationView] = useState<ExplanationViewState | null>(
    null,
  );
  const explanationViewRef = useRef(explanationView);
  explanationViewRef.current = explanationView;
  const [explanationOverlay, setExplanationOverlay] =
    useState<ExplanationOverlayState | null>(null);
  const explanationOverlayRef = useRef(explanationOverlay);
  explanationOverlayRef.current = explanationOverlay;

  useEffect(() => {
    if (import.meta.env.MODE !== "manual-screenshot") return;
    window.__manualScreenshotShowExplainOverlay = () => {
      setExplanationOverlay({
        translucent: true,
        summary: "並行案の説明（見本）",
        marks: [
          {
            taskId: "b1000001-0000-4000-8000-000000000002",
            kind: "change",
            label: "期間をずらす",
            number: 1,
            color: "#2563eb",
          },
          {
            milestoneId: "a1000001-0000-4000-8000-000000000001",
            kind: "ask",
            label: "要件確定の位置",
            number: 2,
            color: "#ca8a04",
          },
        ],
        patterns: [
          {
            id: "p-demo",
            name: "案A",
            color: "#2563eb",
            tasks: [],
            changes: [
              {
                taskId: "b1000001-0000-4000-8000-000000000002",
                start: "2026-10-08",
                end: "2026-10-18",
              },
            ],
            milestoneChanges: [],
          },
        ],
      });
    };
    return () => {
      delete window.__manualScreenshotShowExplainOverlay;
    };
  }, []);

  const clearExplanationSession = useCallback(() => {
    setExplanationView(null);
    setExplanationOverlay(null);
  }, []);

  const clearExplanationView = clearExplanationSession;

  const clearExplanationOnHumanViewChange = useCallback(() => {
    if (
      shouldClearExplanationOnHumanViewChange(
        explanationViewRef.current,
        explanationOverlayRef.current,
      )
    ) {
      clearExplanationSession();
    }
  }, [clearExplanationSession]);

  const runExplainViewAction = useCallback(
    (
      envelope: Record<string, unknown>,
    ): { ok: true; text: string } | { ok: false; message: string } => {
      const doc = documentRef.current;
      const explainContext: ExplainViewDocumentContext = {
        categories: doc.categories,
        outline: doc.outline,
        milestoneGroups: doc.milestoneGroups,
        milestones: doc.milestones,
        hiddenMilestoneGroupIds: prunedHiddenMilestoneGroupIdsRef.current,
      };
      const parsed = parseExplainViewRequest(
        envelope,
        explainContext,
        explanationViewRef.current,
      );
      if (!parsed.ok) return parsed;
      if (parsed.kind === "clear") {
        const wasActive =
          explanationViewRef.current != null ||
          explanationOverlayRef.current?.translucent === true;
        clearExplanationSession();
        return { ok: true, text: explainViewClearSuccessText(wasActive) };
      }
      if (parsed.clearSelection) {
        setTaskSelection(emptyTaskSelection());
      }
      setExplanationView(parsed.state);
      return { ok: true, text: explainViewApplySuccessText() };
    },
    [clearExplanationSession, documentRef, prunedHiddenMilestoneGroupIdsRef, setTaskSelection],
  );

  const runExplainOverlayAction = useCallback(
    (
      envelope: Record<string, unknown>,
    ): { ok: true; text: string } | { ok: false; message: string } => {
      const doc = documentRef.current;
      const parsed = parseExplainOverlayRequest(envelope, {
        categories: doc.categories,
        outline: doc.outline,
        milestones: doc.milestones,
        milestoneGroups: doc.milestoneGroups,
        hiddenMilestoneGroupIds: prunedHiddenMilestoneGroupIdsRef.current,
        explanationView: explanationViewRef.current,
        collapsed: displayedCollapsedRef.current,
        visibleRows: visibleRowsRef.current,
      });
      if (!parsed.ok) return parsed;
      if (parsed.kind === "hide") {
        const wasActive = explanationOverlayRef.current?.translucent === true;
        setExplanationOverlay(null);
        return { ok: true, text: explainOverlayHideSuccessText(wasActive) };
      }
      setExplanationOverlay(parsed.state);
      if (explainOverlayRuntime != null) {
        const planInput = explainOverlayRuntime.current?.getPlanInput();
        if (planInput != null && parsed.state.marks.length > 0) {
          const plan = planExplanationOverlayScroll({
            ...planInput,
            marks: parsed.state.marks,
          });
          if (plan != null) explainOverlayRuntime.current?.applyScroll(plan);
        }
      }
      return { ok: true, text: explainOverlayShowSuccessText() };
    },
    [
      documentRef,
      displayedCollapsedRef,
      explainOverlayRuntime,
      prunedHiddenMilestoneGroupIdsRef,
      visibleRowsRef,
    ],
  );

  return {
    explanationView,
    setExplanationView,
    explanationViewRef,
    explanationOverlay,
    setExplanationOverlay,
    explanationOverlayRef,
    clearExplanationSession,
    clearExplanationView,
    clearExplanationOnHumanViewChange,
    runExplainViewAction,
    runExplainOverlayAction,
  };
}

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  cloneSnapshot,
  createDocumentHistory,
  pushDocumentHistory,
  redoDocumentHistory,
  undoDocumentHistory,
  type DocumentHistory,
  type DocumentSnapshot,
} from "../../model/history";
import { coerceOutlineStorageDocument } from "../../model/mcpEditPlan";
import type { ReplaceScheduleDocumentResult } from "../../model/replaceSchedule";
import { serializeScheduleDocument } from "../../model/scheduleFile";
import { defaultScheduleFilterViewState } from "../../model/scheduleFilterPersistence";
import {
  emptyTaskSelection,
  pruneTaskSelection,
  type TaskSelectionState,
} from "../../model/taskSelection";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  ScheduleDocument,
  ScheduleFieldDef,
  ScheduleFilters,
  ScheduleId,
} from "../../model/types";
import type { SearchField } from "../../model/scheduleFilterPersistence";
import type { ExplanationOverlayState } from "../../model/explainOverlay";
import type { ExplanationViewState } from "../../model/explainView";
import {
  snapshotFromDocument,
} from "./documentSnapshot";
import {
  pruneHiddenMilestoneGroupIds,
  pruneHiddenMilestoneIds,
} from "../../model/filterChips";

export type ScheduleDocumentCommitBridge = {
  setTitle: (title: string) => void;
  setCategories: (categories: Category[]) => void;
  setMilestoneGroups: (groups: MilestoneGroup[]) => void;
  setMilestones: (milestones: Milestone[]) => void;
  setLevels: (levels: DocumentSnapshot["levels"]) => void;
  setOutline: (outline: DocumentSnapshot["outline"]) => void;
  setConnections: (connections: DocumentSnapshot["connections"]) => void;
  setHiddenMilestoneGroupIds: Dispatch<SetStateAction<ScheduleId[]>>;
  setHiddenMilestoneIds: Dispatch<SetStateAction<ScheduleId[]>>;
  setTaskSelection: Dispatch<SetStateAction<TaskSelectionState>>;
  setLineageTaskId: (id: ScheduleId | null) => void;
  setDuplicatingTaskId: (id: ScheduleId | null) => void;
  setEditingNoteTaskId: (id: ScheduleId | null) => void;
  setEditingMilestoneId: (id: ScheduleId | null) => void;
  setEditingHierarchy: (value: unknown) => void;
  setAddingHierarchy: (value: unknown) => void;
  setDeletingHierarchy: (value: unknown) => void;
  setCollapsed: (value: ReadonlySet<string>) => void;
  setFilters: Dispatch<SetStateAction<ScheduleFilters>>;
  setSearchField: (field: SearchField) => void;
  setExplanationView: (value: ExplanationViewState | null) => void;
  setExplanationOverlay: (value: ExplanationOverlayState | null) => void;
  setDiskEpoch: Dispatch<SetStateAction<number>>;
  setReorderPreview: (value: unknown) => void;
  pruneUiForDocument: (snapshot: DocumentSnapshot) => void;
  clearExplanationSession: () => void;
  explanationViewRef: MutableRefObject<ExplanationViewState | null>;
  explanationOverlayRef: MutableRefObject<ExplanationOverlayState | null>;
};

export type UseScheduleDocumentCommitParams = {
  initialTitle: string;
  initialCategories: Category[];
  initialMilestoneGroups: MilestoneGroup[];
  initialMilestones: Milestone[];
  effectiveFieldDefs: readonly ScheduleFieldDef[];
  documentRef: MutableRefObject<DocumentSnapshot>;
  bridgeRef: MutableRefObject<ScheduleDocumentCommitBridge>;
  blockDocumentEditsRef?: { current: boolean };
  onHistoryUndoApplied?: (landed: DocumentSnapshot) => void;
  onHistoryRedoApplied?: (landed: DocumentSnapshot) => void;
};

function applySnapshotFields(
  bridge: ScheduleDocumentCommitBridge,
  snapshot: DocumentSnapshot,
): void {
  bridge.setTitle(snapshot.title);
  bridge.setCategories(snapshot.categories);
  bridge.setMilestoneGroups(snapshot.milestoneGroups);
  bridge.setMilestones(snapshot.milestones);
  bridge.setLevels(snapshot.levels);
  bridge.setOutline(snapshot.outline);
  bridge.setConnections(snapshot.connections);
  bridge.setReorderPreview(null);
  bridge.pruneUiForDocument(snapshot);
  if (
    bridge.explanationViewRef.current != null ||
    bridge.explanationOverlayRef.current?.translucent === true
  ) {
    bridge.clearExplanationSession();
  }
}

export function useScheduleDocumentCommit({
  effectiveFieldDefs,
  documentRef,
  bridgeRef,
  blockDocumentEditsRef,
  onHistoryUndoApplied,
  onHistoryRedoApplied,
}: UseScheduleDocumentCommitParams) {
  const historyRef = useRef<DocumentHistory>(createDocumentHistory());
  const [historyUi, setHistoryUi] = useState({ canUndo: false, canRedo: false });

  const syncHistoryUi = useCallback(() => {
    setHistoryUi({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    });
  }, []);

  const snapshotCanonicalJson = useCallback(
    (snap: DocumentSnapshot) =>
      serializeScheduleDocument(
        snap.title,
        snap.categories,
        snap.milestoneGroups,
        snap.milestones,
        snap.levels,
        snap.outline,
        effectiveFieldDefs.length > 0 ? [...effectiveFieldDefs] : undefined,
        snap.connections,
      ),
    [effectiveFieldDefs],
  );

  const commitDocument = useCallback(
    (buildNext: (current: DocumentSnapshot) => DocumentSnapshot) => {
      if (blockDocumentEditsRef?.current) return;
      const bridge = bridgeRef.current;
      const current = documentRef.current;
      const next = buildNext(current);
      const pushed = pushDocumentHistory(historyRef.current, current, next);
      if (!pushed) return;
      historyRef.current = pushed.history;
      syncHistoryUi();
      if (!pushed.applied) return;
      if (
        bridge.explanationViewRef.current != null ||
        bridge.explanationOverlayRef.current?.translucent === true
      ) {
        bridge.clearExplanationSession();
      }
      documentRef.current = pushed.applied;
      bridge.setCategories(pushed.applied.categories);
      bridge.setMilestoneGroups(pushed.applied.milestoneGroups);
      bridge.setMilestones(pushed.applied.milestones);
      bridge.setLevels(pushed.applied.levels);
      bridge.setOutline(pushed.applied.outline);
      bridge.setConnections(pushed.applied.connections);
    },
    [blockDocumentEditsRef, bridgeRef, syncHistoryUi],
  );

  const commitCategories = useCallback(
    (update: (prev: Category[]) => Category[]) => {
      commitDocument((current) => ({
        ...current,
        categories: update(current.categories),
      }));
    },
    [commitDocument],
  );

  const commitMilestones = useCallback(
    (update: (prev: Milestone[]) => Milestone[]) => {
      commitDocument((current) => ({
        ...current,
        milestones: update(current.milestones),
      }));
    },
    [commitDocument],
  );

  const getDocumentSnapshot = useCallback(
    (): DocumentSnapshot => documentRef.current,
    [],
  );

  const applySnapshot = useCallback(
    (snapshot: DocumentSnapshot) => {
      const cloned = cloneSnapshot(snapshot);
      documentRef.current = cloned;
      applySnapshotFields(bridgeRef.current, cloned);
    },
    [bridgeRef],
  );

  const replaceScheduleDocument = useCallback(
    (document: ScheduleDocument): ReplaceScheduleDocumentResult => {
      const bridge = bridgeRef.current;
      const current = documentRef.current;
      const currentJson = snapshotCanonicalJson(current);
      if (blockDocumentEditsRef?.current) {
        return { outcome: "rejected" };
      }
      const next = snapshotFromDocument(coerceOutlineStorageDocument(document));
      const pushed = pushDocumentHistory(historyRef.current, current, next);
      if (!pushed) {
        return { outcome: "unchanged", screenJson: currentJson };
      }
      historyRef.current = pushed.history;
      syncHistoryUi();
      if (!pushed.applied) {
        return { outcome: "unchanged", screenJson: currentJson };
      }
      documentRef.current = pushed.applied;
      bridge.setTitle(pushed.applied.title);
      bridge.setCategories(pushed.applied.categories);
      bridge.setMilestoneGroups(pushed.applied.milestoneGroups);
      bridge.setMilestones(pushed.applied.milestones);
      bridge.setLevels(pushed.applied.levels);
      bridge.setOutline(pushed.applied.outline);
      bridge.setConnections(pushed.applied.connections);
      bridge.pruneUiForDocument(pushed.applied);
      if (
        bridge.explanationViewRef.current != null ||
        bridge.explanationOverlayRef.current?.translucent === true
      ) {
        bridge.clearExplanationSession();
      }
      return {
        outcome: "applied",
        screenJson: snapshotCanonicalJson(pushed.applied),
        before: current,
        after: pushed.applied,
      };
    },
    [
      blockDocumentEditsRef,
      bridgeRef,
      snapshotCanonicalJson,
      syncHistoryUi,
    ],
  );

  const applyMergedDocument = useCallback(
    (
      document: ScheduleDocument,
    ): { before: DocumentSnapshot; after: DocumentSnapshot } | null => {
      if (blockDocumentEditsRef?.current) return null;
      const bridge = bridgeRef.current;
      const before = documentRef.current;
      const next = snapshotFromDocument(document);
      const pushed = pushDocumentHistory(historyRef.current, before, next);
      if (!pushed) return null;
      historyRef.current = pushed.history;
      syncHistoryUi();
      if (!pushed.applied) return null;
      documentRef.current = pushed.applied;
      bridge.setTitle(pushed.applied.title);
      bridge.setCategories(pushed.applied.categories);
      bridge.setMilestoneGroups(pushed.applied.milestoneGroups);
      bridge.setMilestones(pushed.applied.milestones);
      bridge.setLevels(pushed.applied.levels);
      bridge.setOutline(pushed.applied.outline);
      bridge.setConnections(pushed.applied.connections);
      bridge.setTaskSelection((current) =>
        pruneTaskSelection(
          pushed.applied!.categories,
          pushed.applied!.outline,
          current,
        ),
      );
      bridge.setDuplicatingTaskId(null);
      bridge.setEditingNoteTaskId(null);
      bridge.setEditingMilestoneId(null);
      bridge.setEditingHierarchy(null);
      bridge.setAddingHierarchy(null);
      bridge.setDeletingHierarchy(null);
      bridge.setReorderPreview(null);
      bridge.pruneUiForDocument(pushed.applied);
      if (
        bridge.explanationViewRef.current != null ||
        bridge.explanationOverlayRef.current?.translucent === true
      ) {
        bridge.clearExplanationSession();
      }
      return { before, after: pushed.applied };
    },
    [blockDocumentEditsRef, bridgeRef, syncHistoryUi],
  );

  const replaceDocument = useCallback(
    (document: ScheduleDocument) => {
      const bridge = bridgeRef.current;
      historyRef.current = createDocumentHistory();
      const snapshot = snapshotFromDocument(document);
      documentRef.current = snapshot;
      bridge.setTitle(document.title);
      bridge.setCategories(snapshot.categories);
      bridge.setMilestoneGroups(snapshot.milestoneGroups);
      bridge.setMilestones(snapshot.milestones);
      bridge.setLevels(snapshot.levels);
      bridge.setOutline(snapshot.outline);
      bridge.setConnections(snapshot.connections);
      bridge.setHiddenMilestoneGroupIds([]);
      bridge.setHiddenMilestoneIds([]);
      bridge.setTaskSelection(emptyTaskSelection());
      bridge.setLineageTaskId(null);
      bridge.setDuplicatingTaskId(null);
      bridge.setEditingNoteTaskId(null);
      bridge.setEditingMilestoneId(null);
      bridge.setCollapsed(new Set());
      const defaultView = defaultScheduleFilterViewState();
      bridge.setFilters(defaultView.filters);
      bridge.setSearchField(defaultView.searchField);
      bridge.setHiddenMilestoneGroupIds(defaultView.hiddenMilestoneGroupIds);
      bridge.setHiddenMilestoneIds(defaultView.hiddenMilestoneIds);
      bridge.setExplanationView(null);
      bridge.setExplanationOverlay(null);
      bridge.setReorderPreview(null);
      syncHistoryUi();
    },
    [bridgeRef, syncHistoryUi],
  );

  const reloadDocumentFromDisk = useCallback(
    (document: ScheduleDocument) => {
      const bridge = bridgeRef.current;
      historyRef.current = createDocumentHistory();
      const snapshot = snapshotFromDocument(document);
      documentRef.current = snapshot;
      bridge.setTitle(document.title);
      bridge.setCategories(snapshot.categories);
      bridge.setMilestoneGroups(snapshot.milestoneGroups);
      bridge.setMilestones(snapshot.milestones);
      bridge.setLevels(snapshot.levels);
      bridge.setOutline(snapshot.outline);
      bridge.setConnections(snapshot.connections);
      bridge.setHiddenMilestoneGroupIds((hidden) =>
        pruneHiddenMilestoneGroupIds(hidden, snapshot.milestoneGroups),
      );
      bridge.setHiddenMilestoneIds((hidden) =>
        pruneHiddenMilestoneIds(hidden, snapshot.milestones),
      );
      bridge.setDiskEpoch((epoch) => epoch + 1);
      bridge.setReorderPreview(null);
      bridge.pruneUiForDocument(snapshot);
      if (
        bridge.explanationViewRef.current != null ||
        bridge.explanationOverlayRef.current?.translucent === true
      ) {
        bridge.clearExplanationSession();
      }
      syncHistoryUi();
    },
    [bridgeRef, syncHistoryUi],
  );

  const undo = useCallback((): boolean => {
    if (blockDocumentEditsRef?.current) return false;
    if (historyRef.current.past.length === 0) return false;
    const result = undoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return false;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    syncHistoryUi();
    onHistoryUndoApplied?.(result.snapshot);
    return true;
  }, [
    applySnapshot,
    blockDocumentEditsRef,
    onHistoryUndoApplied,
    syncHistoryUi,
  ]);

  const redo = useCallback((): boolean => {
    if (blockDocumentEditsRef?.current) return false;
    if (historyRef.current.future.length === 0) return false;
    const result = redoDocumentHistory(historyRef.current, documentRef.current);
    if (!result) return false;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    syncHistoryUi();
    onHistoryRedoApplied?.(result.snapshot);
    return true;
  }, [
    applySnapshot,
    blockDocumentEditsRef,
    onHistoryRedoApplied,
    syncHistoryUi,
  ]);

  const getCanonicalJson = useCallback(
    () => snapshotCanonicalJson(documentRef.current),
    [snapshotCanonicalJson],
  );

  return {
    documentRef,
    historyUi,
    syncHistoryUi,
    commitDocument,
    commitCategories,
    commitMilestones,
    getDocumentSnapshot,
    getCanonicalJson,
    replaceScheduleDocument,
    applyMergedDocument,
    replaceDocument,
    reloadDocumentFromDisk,
    undo,
    redo,
  };
}

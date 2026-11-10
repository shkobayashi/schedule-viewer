import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ExternalReloadDialog } from "../components/ExternalReloadDialog";
import { MemberCatalogEditorOverlay } from "../components/MemberCatalogEditorOverlay";
import { ColorCatalogEditorOverlay } from "../components/ColorCatalogEditorOverlay";
import { FieldExtensionEditorOverlay } from "../components/FieldExtensionEditorOverlay";
import { RecoveryConflictDialog } from "../components/RecoveryConflictDialog";
import { RecoveryInvalidDialog } from "../components/RecoveryInvalidDialog";
import { MissingScheduleFileDialog } from "../components/MissingScheduleFileDialog";
import { StatusBar } from "../components/StatusBar";
import { useAppKeyboard } from "../hooks/useAppKeyboard";
import { useScheduleFile } from "../hooks/useScheduleFile";
import { useSchedule } from "../hooks/useSchedule";
import { useMemberCatalog } from "../hooks/useMemberCatalog";
import { useMemberCatalogEditorOverlay } from "../hooks/useMemberCatalogEditorOverlay";
import { useColorCatalog } from "../hooks/useColorCatalog";
import { useColorCatalogEditorOverlay } from "../hooks/useColorCatalogEditorOverlay";
import { useFieldExtensionCatalog } from "../hooks/useFieldExtensionCatalog";
import { useFieldExtensionEditorOverlay } from "../hooks/useFieldExtensionEditorOverlay";
import { parseScheduleText } from "../model/scheduleFile";
import { BUILTIN_STATUS_ITEMS } from "../model/statusCatalog";
import { listTasks } from "../model/dependencies";
import { findTaskInDocument } from "../model/hierarchy";
import { documentToJsonString } from "../model/serialize";
import {
  emptyTaskSelection,
  selectTaskClick,
  type TaskSelectionState,
} from "../model/taskSelection";
import type { ScheduleDocument, ScheduleId } from "../model/types";
import { loadRegressionMembers } from "./searchErrorKeysFixtures";

export type ScheduleFileFlowHandle = {
  renameTask: (taskId: ScheduleId, name: string) => void;
  selectTask: (taskId: ScheduleId) => void;
  openMemberEditor: () => void;
  openColorEditor: () => void;
  openFieldEditor: () => void;
  taskEnd: (taskId: ScheduleId) => string | null;
  applyOpenedFile: (
    pick: { path: string; contents: string },
    options?: { recordRecent?: boolean },
  ) => Promise<void>;
  markSavedAtPath: (path: string, canonicalJson: string) => void;
  openSavedAtPath: (path: string, contents: string) => void;
  getFilePath: () => string | null;
  setTaskEnd: (taskId: ScheduleId, end: string) => void;
  moveSelectedTasksByDays: (deltaDays: number) => void;
};

type ScheduleFileFlowHarnessProps = {
  initialDocument: ScheduleDocument;
};

export const ScheduleFileFlowHarness = forwardRef<
  ScheduleFileFlowHandle,
  ScheduleFileFlowHarnessProps
>(function ScheduleFileFlowHarness({ initialDocument }, ref) {
  const members = useMemo(() => loadRegressionMembers(), []);
  const blockDocumentEditsRef = useRef(false);
  const applyMergedDocumentRef = useRef<
    (
      document: ScheduleDocument,
    ) => { before: import("../model/history").DocumentSnapshot; after: import("../model/history").DocumentSnapshot } | null
  >(() => null);
  const onHistoryUndoRef = useRef<(landed: import("../model/history").DocumentSnapshot) => void>(
    () => {},
  );
  const onHistoryRedoRef = useRef<(landed: import("../model/history").DocumentSnapshot) => void>(
    () => {},
  );

  const schedule = useSchedule(
    initialDocument.title,
    initialDocument.categories,
    initialDocument.milestoneGroups,
    initialDocument.milestones,
    32,
    members,
    true,
    blockDocumentEditsRef,
    (landed) => onHistoryUndoRef.current(landed),
    (landed) => onHistoryRedoRef.current(landed),
    BUILTIN_STATUS_ITEMS,
    true,
    initialDocument.fields ?? [],
    true,
  );

  const memberCatalog = useMemberCatalog();
  const colorCatalog = useColorCatalog();
  const fieldCatalog = useFieldExtensionCatalog();

  const memberEditor = useMemberCatalogEditorOverlay({
    settings: memberCatalog.settings,
    appliedCatalogId: memberCatalog.settings.selectedCatalogId,
    saveCatalog: memberCatalog.saveCatalog,
    removeCatalog: memberCatalog.removeCatalog,
    workspaceTarget: null,
    onWorkspaceMembersWritten: async () => {},
    onRemovedWhileEditing: () => {},
  });
  const colorEditor = useColorCatalogEditorOverlay({
    settings: colorCatalog.settings,
    appliedCatalogId: colorCatalog.settings.selectedCatalogId,
    saveCatalog: colorCatalog.saveCatalog,
    removeCatalog: colorCatalog.removeCatalog,
    workspaceTarget: null,
    onWorkspaceColorsWritten: async () => {},
    onRemovedWhileEditing: () => {},
  });
  const fieldEditor = useFieldExtensionEditorOverlay({
    settings: fieldCatalog.settings,
    selectedDocuments: fieldCatalog.documents,
    workspacePinnedDocuments: [],
    saveCatalog: fieldCatalog.saveCatalog,
    removeCatalog: fieldCatalog.removeCatalog,
    refreshCatalogs: fieldCatalog.refresh,
    workspaceTarget: null,
    onWorkspaceWritten: async () => {},
    exportJson: async () => null,
    onClosedByUser: () => {},
  });

  const [selection, setSelection] = useState<TaskSelectionState>(emptyTaskSelection());

  const scheduleFile = useScheduleFile({
    title: schedule.title,
    categories: schedule.categories,
    milestoneGroups: schedule.milestoneGroups,
    milestones: schedule.milestones,
    levels: schedule.levels,
    outline: schedule.outline,
    connections: schedule.connections,
    replaceDocument: schedule.replaceDocument,
    applyMergedDocument: (document) => applyMergedDocumentRef.current(document),
    reloadDocumentFromDisk: schedule.reloadDocumentFromDisk,
    onAfterOpen: () => {},
    initialBaselineJson: (() => {
      const parsed = parseScheduleText(documentToJsonString(initialDocument));
      return parsed.ok ? parsed.canonicalJson : documentToJsonString(initialDocument);
    })(),
    hasOpenEditDialog:
      memberEditor.open || colorEditor.open || fieldEditor.open,
    blockDocumentEditsRef,
    setFilterViewState: schedule.setFilterViewState,
    getFilterViewState: schedule.getFilterViewState,
    knownMemberIds: schedule.knownMemberIds,
    memberCatalogSettled: true,
    fieldExtensionCatalogSettled: true,
    extraFieldDefs: schedule.fieldDefs,
    sidebarReorderDragging: false,
    getCanonicalJson: schedule.getCanonicalJson,
    getDocumentTitle: schedule.getDocumentTitle,
  });

  applyMergedDocumentRef.current = schedule.applyMergedDocument;
  onHistoryUndoRef.current = scheduleFile.onHistoryUndoApplied;
  onHistoryRedoRef.current = scheduleFile.onHistoryRedoApplied;

  useAppKeyboard({
    rowHeight: 32,
    scrollBy: () => {},
    fileBusy: scheduleFile.fileBusy || !scheduleFile.startupSettled,
    save: scheduleFile.save,
    requestOpen: scheduleFile.requestOpen,
    requestOpenInNewWindow: scheduleFile.requestOpenInNewWindow,
    categories: schedule.categories,
    selectedTaskId: selection.activeId,
    selectedTaskIds: selection.ids,
    linkSourceId: null,
    startupSettled: scheduleFile.startupSettled,
    toggleLinkMode: () => {},
    openTaskNote: () => {},
    clearLinkMode: () => {},
    removePredecessorLink: () => {},
    removeTaskConnection: () => {},
    chartPointerRef: {
      current: { overTask: false, overMilestone: false, link: null, hoverTaskId: null },
    },
    closeFloatingMenus: () => {},
    requestDeleteTask: () => {},
    undo: schedule.undo,
    redo: schedule.redo,
    taskSearchRef: { current: null },
    displayScalePreferenceRef: { current: "auto" },
    uiScaleRef: { current: 1 },
    onDisplayScaleChange: () => {},
    onOpenShortcuts: () => {},
    visibleRows: schedule.visibleRows,
    selectTask: (taskId) =>
      setSelection({ ids: [taskId], anchorId: taskId, activeId: taskId }),
    navigateTaskSelection: () => {},
    moveTaskByDays: schedule.moveTaskByDays,
    moveSelectedTasksByDays: schedule.moveSelectedTasksByDays,
    shiftTaskEndByDays: schedule.shiftTaskEndByDays,
    focusDetailName: () => {},
    revealTaskRow: () => {},
    copyScheduleDiff: async () => {},
    commandPaletteOpen: false,
    onOpenCommandPalette: () => {},
    onCloseCommandPalette: () => {},
    onAddTask: () => {},
    onAddMilestone: () => {},
    onDuplicateTask: () => {},
    commitTaskReorder: () => {},
    filterPanelOpen: false,
    onOpenSettings: () => {},
    onGoToday: () => {},
    onSetViewTier: () => {},
    onToggleLineage: () => {},
    onToggleFilterPanel: () => {},
    onToggleTaskConfidence: () => {},
  });

  const taskEnd = useCallback(
    (taskId: ScheduleId) =>
      findTaskInDocument(schedule.categories, schedule.outline, taskId)?.end ?? null,
    [schedule.categories, schedule.outline],
  );

  useImperativeHandle(
    ref,
    () => ({
      renameTask: (taskId, name) => {
        const task = findTaskInDocument(
          schedule.categories,
          schedule.outline,
          taskId,
        );
        if (!task) return;
        schedule.applyTaskPatch(taskId, {
          name,
          start: task.start,
          end: task.end,
          assigneeIds: task.assigneeIds,
          status: task.status,
          progress: task.progress,
          confidence: task.confidence,
          predecessors: task.predecessors ?? [],
          successors: task.successors ?? [],
          milestoneId: task.milestoneId ?? null,
          note: task.note ?? "",
          colorId: task.colorId,
        });
      },
      setTaskEnd: (taskId, end) => {
        schedule.setTaskEnd(taskId, end);
      },
      selectTask: (taskId) => {
        setSelection(selectTaskClick(emptyTaskSelection(), taskId, false, false));
      },
      openMemberEditor: () => {
        memberEditor.openEditor();
        void memberEditor.selectCatalog(memberCatalog.settings.selectedCatalogId ?? "members");
      },
      openColorEditor: () => {
        colorEditor.openEditor();
        void colorEditor.selectCatalog(colorCatalog.settings.selectedCatalogId ?? "colors");
      },
      openFieldEditor: () => {
        fieldEditor.openEditor();
        void fieldEditor.selectCatalog("sample");
      },
      taskEnd,
      applyOpenedFile: (pick, options) => scheduleFile.applyOpenedFile(pick, options),
      markSavedAtPath: (path, canonicalJson) => {
        scheduleFile.markSavedAtPath(canonicalJson, path);
      },
      openSavedAtPath: (path, contents) => {
        const parsed = parseScheduleText(contents);
        if (!parsed.ok) return;
        schedule.replaceDocument(parsed.document);
        scheduleFile.markSavedAtPath(parsed.canonicalJson, path);
      },
      getFilePath: () => scheduleFile.filePath,
      moveSelectedTasksByDays: (deltaDays) => {
        if (selection.ids.length === 0) return;
        schedule.moveSelectedTasksByDays(selection.ids, deltaDays);
      },
    }),
    [colorEditor, fieldEditor, memberEditor, schedule, scheduleFile, selection.ids, taskEnd],
  );

  const surveyTask = findTaskInDocument(
    schedule.categories,
    schedule.outline,
    "e1000001-0000-4000-8000-000000000001",
  );
  const designTask = findTaskInDocument(
    schedule.categories,
    schedule.outline,
    "e1000001-0000-4000-8000-000000000002",
  );

  return (
    <div>
      <span data-testid="startup-settled">{scheduleFile.startupSettled ? "yes" : "no"}</span>
      <span data-testid="members-settled">{memberCatalog.loading ? "no" : "yes"}</span>
      <span data-testid="colors-settled">{colorCatalog.loading ? "no" : "yes"}</span>
      <span data-testid="fields-settled">{fieldCatalog.loading ? "no" : "yes"}</span>
      <span data-testid="is-dirty">{scheduleFile.isDirty ? "yes" : "no"}</span>
      <span data-testid="file-path">{scheduleFile.filePath ?? ""}</span>
      <span data-testid="survey-name">{surveyTask?.name ?? ""}</span>
      <span data-testid="survey-end">{surveyTask?.end ?? ""}</span>
      <span data-testid="design-end">{designTask?.end ?? ""}</span>
      <span data-testid="merge-notice">{scheduleFile.mergeNotice ? "yes" : "no"}</span>
      <StatusBar
        fileName={scheduleFile.displayFileName}
        saveStatus={scheduleFile.statusLabel}
        saveStatusClickable={scheduleFile.isDirty}
        onSaveStatusClick={() => {}}
        membersCatalogLabel="members"
        membersCatalogError={null}
        calendarError={null}
        colorsCatalogError={null}
        tier="week"
        visibleTaskCount={schedule.visibleRows.filter((row) => row.type === "task").length}
        totalTaskCount={listTasks(schedule.categories, schedule.outline).length}
        showDeferredReload={scheduleFile.showDeferredReload}
        onDeferredReload={scheduleFile.requestDeferredConfirm}
        onOpenSettingsMembers={() => {}}
        onOpenSettingsCalendar={() => {}}
        onOpenShortcuts={() => {}}
      />
      {scheduleFile.recoveryConflictOpen && scheduleFile.recoveryConflictLabel ? (
        <RecoveryConflictDialog
          fileLabel={scheduleFile.recoveryConflictLabel}
          missing={scheduleFile.recoveryConflictMissing}
          onOpenDisk={scheduleFile.confirmRecoveryOpenDisk}
          onRestoreEdits={scheduleFile.confirmRecoveryRestoreEdits}
        />
      ) : null}
      {scheduleFile.missingScheduleLabel ? (
        <MissingScheduleFileDialog
          fileLabel={scheduleFile.missingScheduleLabel}
          onClose={scheduleFile.dismissMissingSchedule}
        />
      ) : null}
      {scheduleFile.recoveryInvalidOpen && scheduleFile.recoveryInvalidMessage ? (
        <RecoveryInvalidDialog
          message={scheduleFile.recoveryInvalidMessage}
          onClose={scheduleFile.dismissRecoveryInvalid}
          onDiscard={scheduleFile.discardRecoveryDraft}
        />
      ) : null}
      {scheduleFile.externalReloadOpen && scheduleFile.externalReloadAssessment ? (
        <ExternalReloadDialog
          assessment={scheduleFile.externalReloadAssessment}
          review={scheduleFile.externalReloadReview}
          conflictReview={scheduleFile.externalReloadConflictReview}
          hasOpenEditDialog={
            memberEditor.open || colorEditor.open || fieldEditor.open
          }
          diskUpdatedAgain={scheduleFile.diskUpdatedAgain}
          onReload={() => {
            memberEditor.forceClose();
            colorEditor.forceClose();
            fieldEditor.forceClose();
            scheduleFile.confirmExternalReload();
          }}
          onKeepLocal={scheduleFile.keepLocalEditsOnExternalReload}
          onApplyMerge={() => {
            memberEditor.forceClose();
            colorEditor.forceClose();
            fieldEditor.forceClose();
            scheduleFile.confirmBaselineMerge();
          }}
        />
      ) : null}
      {memberEditor.open ? (
        <MemberCatalogEditorOverlay
          mode={memberEditor.mode}
          catalogs={memberEditor.catalogs}
          editingCatalogId={memberEditor.editingCatalogId}
          editingItems={memberEditor.editingItems}
          itemsRevision={memberEditor.itemsRevision}
          appliedCatalogId={memberEditor.appliedCatalogId}
          workspaceFileLabel={memberEditor.workspaceFileLabel}
          workspaceAppliedNote={memberEditor.workspaceAppliedNote}
          busy={memberEditor.busy}
          message={memberEditor.message}
          setMessage={memberEditor.setMessage}
          onDirtyChange={memberEditor.setDirty}
          discardPrompt={memberEditor.discardPrompt}
          copyConfirmOpen={memberEditor.copyConfirmOpen}
          removeConfirmOpen={memberEditor.removeConfirmOpen}
          dirty={memberEditor.dirty}
          onConfirmDiscard={() => {
            void memberEditor.confirmDiscard();
          }}
          onCancelDiscard={memberEditor.cancelDiscard}
          onConfirmCopy={memberEditor.confirmCopy}
          onCancelCopy={memberEditor.cancelCopy}
          onRequestRemoveCatalog={memberEditor.requestRemoveCatalog}
          onConfirmRemoveCatalog={() => {
            void memberEditor.confirmRemoveCatalog();
          }}
          onCancelRemoveCatalog={memberEditor.cancelRemoveCatalog}
          onSelectCatalog={memberEditor.selectCatalog}
          onRequestClose={memberEditor.requestClose}
          onRequestNewList={memberEditor.requestNewList}
          onRequestCopyList={memberEditor.requestCopyList}
          onSaveApp={memberEditor.save}
          onSaveWorkspace={memberEditor.saveWorkspace}
        />
      ) : null}
      {colorEditor.open ? (
        <ColorCatalogEditorOverlay
          mode={colorEditor.mode}
          catalogs={colorCatalog.settings.catalogs}
          editingCatalogId={colorEditor.editingCatalogId}
          editingItems={colorEditor.editingItems}
          itemsRevision={colorEditor.itemsRevision}
          appliedCatalogId={colorEditor.appliedCatalogId}
          workspaceFileLabel={colorEditor.workspaceFileLabel}
          workspaceAppliedNote={colorEditor.workspaceAppliedNote}
          busy={colorEditor.busy}
          message={colorEditor.message}
          setMessage={colorEditor.setMessage}
          onDirtyChange={colorEditor.setDirty}
          discardPrompt={colorEditor.discardPrompt}
          copyConfirmOpen={colorEditor.copyConfirmOpen}
          removeConfirmOpen={colorEditor.removeConfirmOpen}
          dirty={colorEditor.dirty}
          onConfirmDiscard={() => {
            void colorEditor.confirmDiscard();
          }}
          onCancelDiscard={colorEditor.cancelDiscard}
          onConfirmCopy={colorEditor.confirmCopy}
          onCancelCopy={colorEditor.cancelCopy}
          onRequestRemoveCatalog={colorEditor.requestRemoveCatalog}
          onConfirmRemoveCatalog={() => {
            void colorEditor.confirmRemoveCatalog();
          }}
          onCancelRemoveCatalog={colorEditor.cancelRemoveCatalog}
          onSelectCatalog={colorEditor.selectCatalog}
          onRequestClose={colorEditor.requestClose}
          onRequestNewList={colorEditor.requestNewList}
          onRequestCopyList={colorEditor.requestCopyList}
          onSaveApp={colorEditor.save}
          onSaveWorkspace={colorEditor.saveWorkspace}
        />
      ) : null}
      {fieldEditor.open ? (
        <FieldExtensionEditorOverlay state={fieldEditor} />
      ) : null}
    </div>
  );
});

import { useEffect, useMemo, useRef, useState } from "react";
import { AppToast } from "../components/AppToast";
import { ColorCatalogEditorOverlay } from "../components/ColorCatalogEditorOverlay";
import { ContextMenu } from "../components/ContextMenu";
import { DiffStrip } from "../components/DiffStrip";
import { ExternalReloadDialog } from "../components/ExternalReloadDialog";
import { FieldExtensionEditorOverlay } from "../components/FieldExtensionEditorOverlay";
import { HierarchyLevelsDialog } from "../components/HierarchyLevelsDialog";
import { HierarchyNameDialog } from "../components/HierarchyNameDialog";
import { MemberCatalogEditorOverlay } from "../components/MemberCatalogEditorOverlay";
import { OutlineHeadingAddDialog } from "../components/OutlineHeadingAddDialog";
import { SettingsDialog } from "../components/SettingsDialog";
import { StatusBar } from "../components/StatusBar";
import { StatusCatalogEditorOverlay } from "../components/StatusCatalogEditorOverlay";
import { TaskDetailPanel } from "../components/TaskDetailPanel";
import { Toolbar } from "../components/Toolbar";
import { useColorCatalog } from "../hooks/useColorCatalog";
import { useColorCatalogEditorOverlay } from "../hooks/useColorCatalogEditorOverlay";
import { useFieldExtensionCatalog } from "../hooks/useFieldExtensionCatalog";
import { useFieldExtensionEditorOverlay } from "../hooks/useFieldExtensionEditorOverlay";
import { useMemberCatalog } from "../hooks/useMemberCatalog";
import { useMemberCatalogEditorOverlay } from "../hooks/useMemberCatalogEditorOverlay";
import { useStatusCatalog } from "../hooks/useStatusCatalog";
import { useStatusCatalogEditorOverlay } from "../hooks/useStatusCatalogEditorOverlay";
import {
  assigneeSidebarLabel,
  duplicateMemberNames,
  resolveAssigneeRowDisplay,
} from "../model/assigneeDisplay";
import type { ColorItem } from "../model/colorCatalog";
import { rowFillForColorId } from "../model/colorCatalog";
import {
  applyResolvedColorScheme,
  resolveColorScheme,
  type ColorSchemePreference,
} from "../model/colorScheme";
import { collectScheduleDiffEntries, formatScheduleDiff, NO_OPEN_SCHEDULE_FILE_MESSAGE } from "../model/scheduleDiff";
import { resolveStripAfterExplicitLoad } from "../model/diffStripVisibility";
import { DEFAULT_FILTERS } from "../model/filterChips";
import {
  addTopLevelMenuLabel,
  collectTasksFromDocument,
  findTaskInDocument,
  HIERARCHY_MISMATCH_MESSAGE,
  hierarchyLayoutContext,
  legacyCategoryParentSelectOptions,
  levelBannerText,
} from "../model/hierarchy";
import {
  applyLevelEditorCommit,
  documentHasExplicitLevels,
  levelDefsForEditor,
} from "../model/hierarchyLevelEdit";
import type { BaselineMergeAssessment } from "../model/baselineMerge";
import { appendOutlineHeadingAtLevel, insertOutlineSiblingAfter } from "../model/outlineCrud";
import { collectOutlineIds, outlineAfterTaskEdit } from "../model/outlineTasks";
import {
  resolveStatusSidebarDisplay,
  statusSidebarColumnLabel,
} from "../model/statusDisplay";
import {
  fieldDefByKey,
  parseTaskFieldInput,
  setTaskFieldValueInOutline,
  setTaskFieldValueOnCategories,
} from "../model/taskFields";
import { computeVisibleRows } from "../model/rows";
import {
  appendLegacyHeadingFromToolbar,
  categoriesAfterTaskEdit,
  collectScheduleIds,
  uniqueScheduleId,
  validateTaskEdit,
} from "../model/tasks";
import {
  emptyTaskSelection,
  selectTaskClick,
  type TaskSelectionState,
} from "../model/taskSelection";
import type { ScheduleDocument, ScheduleId } from "../model/types";
import { resolveUiScale, type DisplayScalePreference } from "../model/uiScale";
import { DEFAULT_SIDEBAR_COLUMNS } from "../model/viewPreferences";
import {
  buildContextMenuItems,
  type ContextMenuItemHandlers,
} from "../operations/contextMenuItems";
import type { ContextMenuTarget } from "../operations/contextMenuTypes";
import type { WorkspaceWindowBinding } from "../model/workspaceTypes";

const SAME_ONLY: BaselineMergeAssessment = {
  kind: "sameOnly",
  lines: [],
  counts: { screenOnly: 0, fileOnly: 0, same: 0, conflicts: 0 },
};

function noop(): void {}

function takenIds(doc: ScheduleDocument): Set<ScheduleId> {
  const taken = collectScheduleIds(doc.categories, doc.milestoneGroups, doc.milestones);
  if (doc.outline != null) {
    for (const id of collectOutlineIds(doc.outline)) taken.add(id);
  }
  return taken;
}

function allocator(taken: Set<ScheduleId>): () => ScheduleId {
  return () => {
    const id = uniqueScheduleId(taken);
    taken.add(id);
    return id;
  };
}

export type SettingsHierarchyDiffHarnessProps = {
  initialDocument: ScheduleDocument;
  initialBaseline?: ScheduleDocument | null;
  workspaceBinding?: WorkspaceWindowBinding | null;
  externalReload?: boolean;
};

export function SettingsHierarchyDiffHarness({
  initialDocument,
  initialBaseline = null,
  workspaceBinding = null,
  externalReload = false,
}: SettingsHierarchyDiffHarnessProps) {
  const incomingRef = useRef(initialDocument);
  incomingRef.current = initialDocument;
  const pastRef = useRef<ScheduleDocument[]>([]);
  const [doc, setDoc] = useState(initialDocument);
  const [baseline, setBaseline] = useState<ScheduleDocument | null>(initialBaseline);
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState<TaskSelectionState>(emptyTaskSelection());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"display" | "members" | "statuses" | "colors" | "fieldExtensions" | "jsonSkills">("display");
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [headingAdd, setHeadingAdd] = useState(false);
  const [sibling, setSibling] = useState<{ afterId: ScheduleId; title: string } | null>(null);
  const [menu, setMenu] = useState<ContextMenuTarget | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffExpanded, setDiffExpanded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [displayScale, setDisplayScale] = useState<DisplayScalePreference>("auto");
  const [colorScheme, setColorScheme] = useState<ColorSchemePreference>("system");
  const diffListRef = useRef<HTMLDivElement>(null);

  const memberCatalog = useMemberCatalog();
  const statusCatalog = useStatusCatalog();
  const colorCatalog = useColorCatalog();
  const fieldCatalog = useFieldExtensionCatalog();

  const workspaceMemberTarget = useMemo(() => {
    if (!workspaceBinding) return null;
    if (workspaceBinding.members.kind !== "loaded") return null;
    if (!workspaceBinding.resolved.membersPath) return null;
    return {
      membersPath: workspaceBinding.resolved.membersPath,
      workspacePath: workspaceBinding.workspacePath,
      items: workspaceBinding.members.members,
      fileLabel: workspaceBinding.members.label,
    };
  }, [workspaceBinding]);

  const memberEditor = useMemberCatalogEditorOverlay({
    settings: memberCatalog.settings,
    appliedCatalogId: workspaceBinding ? null : memberCatalog.settings.selectedCatalogId,
    saveCatalog: memberCatalog.saveCatalog,
    removeCatalog: memberCatalog.removeCatalog,
    workspaceTarget: workspaceMemberTarget,
    onWorkspaceMembersWritten: async () => {},
    onRemovedWhileEditing: noop,
  });
  const statusEditor = useStatusCatalogEditorOverlay({
    settings: statusCatalog.settings,
    appliedCatalogId: workspaceBinding ? null : statusCatalog.settings.selectedCatalogId,
    saveCatalog: statusCatalog.saveCatalog,
    removeCatalog: statusCatalog.removeCatalog,
    workspaceTarget: null,
    onWorkspaceStatusesWritten: async () => {},
    onRemovedWhileEditing: noop,
  });
  const colorEditor = useColorCatalogEditorOverlay({
    settings: colorCatalog.settings,
    appliedCatalogId: workspaceBinding ? null : colorCatalog.settings.selectedCatalogId,
    saveCatalog: colorCatalog.saveCatalog,
    removeCatalog: colorCatalog.removeCatalog,
    workspaceTarget: null,
    onWorkspaceColorsWritten: async () => {},
    onRemovedWhileEditing: noop,
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
    onClosedByUser: () => {
      setSettingsSection("fieldExtensions");
      setSettingsOpen(true);
    },
  });

  useEffect(() => {
    if (externalReload) setReloadOpen(true);
  }, [externalReload]);

  const layout = hierarchyLayoutContext(doc);
  const visibleRows = useMemo(
    () =>
      computeVisibleRowsForHarness(
        doc,
        memberCatalog.memberMap,
        statusCatalog.statuses,
        fieldCatalog.extensionFieldDefs,
      ),
    [doc, fieldCatalog.extensionFieldDefs, memberCatalog.memberMap, statusCatalog.statuses],
  );
  const selectedId = selection.ids.length === 1 ? selection.ids[0] : null;
  const selectedTask = findTaskInDocument(doc.categories, doc.outline, selectedId);
  const taskRefs = useMemo(
    () =>
      collectTasksFromDocument(doc).map((task) => ({
        id: task.id,
        name: task.name,
        category: "",
        group: "",
      })),
    [doc],
  );

  const diffText =
    baseline == null
      ? NO_OPEN_SCHEDULE_FILE_MESSAGE
      : formatScheduleDiff(doc, baseline, "opened.json", fieldCatalog.extensionFieldDefs);
  const diffView = diffOpen ? resolveStripAfterExplicitLoad(diffText) : null;
  const diffEntries = useMemo(() => {
    if (!diffOpen || baseline == null) return [];
    return collectScheduleDiffEntries(doc, baseline, fieldCatalog.extensionFieldDefs);
  }, [baseline, diffOpen, doc, fieldCatalog.extensionFieldDefs]);

  const commitDoc = (next: ScheduleDocument) => {
    pastRef.current.push(structuredClone(doc));
    setDoc(structuredClone(next));
    setDirty(true);
  };

  const undo = () => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    setDoc(prev);
  };

  const showDiff = () => {
    setDiffOpen(true);
    setDiffExpanded(true);
  };

  const copyDiff = async () => {
    if (baseline == null) {
      setDiffOpen(true);
      setDiffExpanded(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(diffText);
      setToast("差分をコピーしました");
    } catch {
      setDiffOpen(true);
      setDiffExpanded(true);
    }
  };

  const onExternalReload = () => {
    setHierarchyOpen(false);
    setHeadingAdd(false);
    setSibling(null);
    fieldEditor.forceClose();
    colorEditor.forceClose();
    memberEditor.forceClose();
    statusEditor.forceClose();
    pastRef.current = [];
    setDirty(false);
    setDoc(structuredClone(incomingRef.current));
    setReloadOpen(false);
  };

  const applyDisplayScale = (preference: DisplayScalePreference) => {
    setDisplayScale(preference);
    const scale = resolveUiScale(window.innerWidth, window.innerHeight, preference);
    document.documentElement.style.setProperty("--s", String(scale));
  };

  const applyColorScheme = (preference: ColorSchemePreference) => {
    setColorScheme(preference);
    applyResolvedColorScheme(resolveColorScheme(preference));
  };

  const openMemberEditor = () => {
    setSettingsOpen(false);
    memberEditor.openEditor();
  };

  const banner = !layout.aligned
    ? HIERARCHY_MISMATCH_MESSAGE
    : layout.levels != null && layout.levels.length > 0
      ? levelBannerText(layout.levels)
      : null;

  const menuItems =
    menu == null
      ? []
      : buildContextMenuItems({
          target: menu,
          categories: doc.categories,
          outline: doc.outline,
          levels: doc.levels,
          milestones: doc.milestones,
          hierarchyAligned: layout.aligned,
          visibleMilestoneGroupIds: new Set(doc.milestoneGroups.map((group) => group.id)),
          hiddenMilestoneIdSet: new Set(),
          selectedTaskCount: selection.ids.length,
          lineageTaskId: null,
          commandKey: false,
          canDeleteOutlineBranch: () => false,
          handlers: menuHandlers(doc, setSibling),
        });

  return (
    <div>
      <Toolbar
        title={doc.title}
        filters={DEFAULT_FILTERS}
        searchField="name"
        onSearchFieldChange={noop}
        milestones={doc.milestones}
        milestoneGroups={doc.milestoneGroups}
        hiddenMilestoneGroupIds={[]}
        hiddenMilestoneIds={[]}
        onMilestoneGroupVisible={noop}
        onMilestoneMarkVisible={noop}
        onShowAllMilestoneMarks={noop}
        assigneeFilterOptions={[]}
        scheduleTags={[]}
        scheduleFields={fieldCatalog.extensionFieldDefs}
        statuses={statusCatalog.statuses}
        tier="day"
        lineageName={null}
        canStartLineage={false}
        canStartLineageWithConnections={false}
        onToggleLineage={noop}
        onShowLineageWithConnections={noop}
        linkSourceName={null}
        canStartLink={false}
        onToggleLink={noop}
        onFiltersChange={noop}
        onPatchFieldFilter={noop}
        onUpdateFieldFilters={noop}
        onGoToday={noop}
        onSetTier={noop}
        onFit={noop}
        onUndo={undo}
        onRedo={noop}
        canUndo={pastRef.current.length > 0}
        canRedo={false}
        onOpenGuide={noop}
        onOpenShortcuts={noop}
        onShowJson={noop}
        onShowDiff={showDiff}
        onCopyDiff={() => {
          void copyDiff();
        }}
        onExportHtml={noop}
        onOpen={() => {
          setBaseline(structuredClone(doc));
          setDirty(false);
          setDiffOpen(false);
        }}
        onSave={noop}
        onSaveAs={noop}
        onOpenSettings={() => {
          setSettingsSection("display");
          setSettingsOpen(true);
        }}
        canDelete={selection.ids.length > 0}
        onAdd={noop}
        onAddMilestone={noop}
        addTopLevelMenuLabel={addTopLevelMenuLabel(layout)}
        onAddTopLevel={() => setHeadingAdd(true)}
        onDelete={noop}
        startupSettled
        onCommitTitle={() => ({ kind: "unchanged" })}
        onTitleEditingChange={noop}
        onTitleBlankCommit={noop}
        titleEditRequestToken={0}
        onOpenHierarchy={() => setHierarchyOpen(true)}
      />
      {banner ? <div className="hierarchy-banner">{banner}</div> : null}
      <div className="sidebar">
        {visibleRows.map((row) => {
          if (row.type === "task") {
            const assigneeDisplay = resolveAssigneeRowDisplay(
              row.task.assigneeIds,
              memberCatalog.memberMap,
              duplicateMemberNames(memberCatalog.members ?? []),
            );
            const assignee =
              assigneeDisplay.kind === "unassigned"
                ? "未割当"
                : assigneeSidebarLabel(assigneeDisplay);
            const status = statusSidebarColumnLabel(
              resolveStatusSidebarDisplay(statusCatalog.statuses, row.task.status),
            );
            const fill = rowFillForColorId(
              colorCatalog.items as readonly ColorItem[] | null,
              row.task.colorId,
              "light",
            );
            return (
              <div
                key={row.task.id}
                className="sidebar-row"
                data-task-id={row.task.id}
                style={fill == null ? undefined : { backgroundColor: fill }}
                onClick={(event) =>
                  setSelection((current) =>
                    selectTaskClick(
                      visibleRows.flatMap((item) => (item.type === "task" ? [item.task.id] : [])),
                      current,
                      row.task.id,
                      {
                        shiftKey: event.shiftKey,
                        metaKey: event.metaKey,
                        ctrlKey: event.ctrlKey,
                      },
                      false,
                    ),
                  )
                }
              >
                <span>{row.task.name}</span>
                <span>{assignee}</span>
                <span>{status}</span>
              </div>
            );
          }
          if (row.type === "hierarchy") {
            return (
              <div
                key={row.id}
                className="sidebar-row"
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ kind: "hierarchy", id: row.id });
                }}
              >
                {row.label}
              </div>
            );
          }
          return null;
        })}
      </div>
      <div className="main">
        <div className="chart-detail">
          <div className="timeline-slot" />
          {selectedTask ? (
            <TaskDetailPanel
              task={selectedTask}
              members={memberCatalog.members ?? []}
              memberCatalog={memberCatalog.memberMap}
              tasks={taskRefs}
              milestones={doc.milestones}
              successorIds={[]}
              onPatch={(patch) => {
                const fieldError = validateTaskEdit({
                  name: patch.name,
                  start: patch.start,
                  end: patch.end,
                  progress: patch.progress,
                });
                if (fieldError) return fieldError;
                if (doc.outline != null && doc.outline.length > 0) {
                  const result = outlineAfterTaskEdit(
                    doc.outline,
                    doc.milestones,
                    doc.title,
                    selectedTask.id,
                    patch,
                  );
                  if (!result.ok) return result.message;
                  commitDoc({ ...doc, outline: result.outline });
                  return null;
                }
                const result = categoriesAfterTaskEdit(
                  doc.categories,
                  doc.milestones,
                  doc.title,
                  selectedTask.id,
                  patch,
                );
                if (!result.ok) return result.message;
                commitDoc({ ...doc, categories: result.categories });
                return null;
              }}
              documentTags={[]}
              onAddTag={() => null}
              onRemoveTag={noop}
              onUpdateTodos={() => null}
              scheduleFields={fieldCatalog.extensionFieldDefs}
              onSetTaskField={(fieldKey, raw) => {
                const def = fieldDefByKey(fieldCatalog.extensionFieldDefs, fieldKey);
                if (!def) return "未登録の追加項目";
                const parsed = parseTaskFieldInput(def, raw);
                if (!parsed.ok) return parsed.message;
                if (doc.outline != null && doc.outline.length > 0) {
                  commitDoc({
                    ...doc,
                    outline: setTaskFieldValueInOutline(
                      doc.outline,
                      selectedTask.id,
                      def,
                      parsed.value,
                    ),
                  });
                  return null;
                }
                commitDoc({
                  ...doc,
                  categories: setTaskFieldValueOnCategories(
                    doc.categories,
                    selectedTask.id,
                    def,
                    parsed.value,
                  ),
                });
                return null;
              }}
              onEditingChange={noop}
              statuses={statusCatalog.statuses}
              colors={colorCatalog.items}
              colorScheme="light"
              onAddConnection={() => null}
              onUpdateConnectionLabel={() => null}
              onRemoveConnection={noop}
              connectionAddDialogOpen={false}
              onConnectionAddDialogOpenChange={noop}
            />
          ) : null}
          {diffView ? (
            <DiffStrip
              view={diffView}
              entries={diffEntries}
              expanded={diffExpanded}
              activeIndex={0}
              rowStatus={null}
              rowHeight={32}
              onExpandFromPointer={() => setDiffExpanded(true)}
              onExpandFromKeyboard={() => setDiffExpanded(true)}
              onCollapse={() => setDiffExpanded(false)}
              onClose={() => setDiffOpen(false)}
              onCopy={() => {
                void copyDiff();
              }}
              copyDisabled={false}
              listRef={diffListRef}
              onFocus={noop}
              onBlur={noop}
              onActiveIndexChange={noop}
              focusListOnMount={false}
              onFocusListDone={noop}
            />
          ) : null}
        </div>
      </div>
      <AppToast message={toast} />
      <StatusBar
        fileName={baseline == null ? "サンプルデータ" : "opened.json"}
        saveStatus={dirty ? "未保存" : baseline == null ? "サンプルデータ" : "保存済み"}
        saveStatusClickable={dirty}
        onSaveStatusClick={showDiff}
        membersCatalogLabel={memberCatalog.selectedCatalogLabel}
        membersCatalogError={memberCatalog.error}
        calendarError={null}
        colorsCatalogError={colorCatalog.error}
        tier="day"
        visibleTaskCount={visibleRows.filter((row) => row.type === "task").length}
        totalTaskCount={taskRefs.length}
        showDeferredReload={false}
        onDeferredReload={noop}
        onOpenSettingsMembers={() => {
          setSettingsSection("members");
          setSettingsOpen(true);
        }}
        onOpenSettingsCalendar={noop}
        onOpenShortcuts={noop}
      />
      {settingsOpen ? (
        <SettingsDialog
          open
          initialSection={settingsSection}
          memberCatalog={{
            settings: memberCatalog.settings,
            selectedCatalogLabel: memberCatalog.selectedCatalogLabel,
            onImport: memberCatalog.importCatalog,
            onSelectCatalog: memberCatalog.selectCatalog,
            onDeleteCatalog: memberCatalog.removeCatalog,
            onOpenEditor: openMemberEditor,
          }}
          statusCatalog={{
            settings: statusCatalog.settings,
            selectedCatalogLabel: statusCatalog.selectedCatalogLabel,
            onImport: statusCatalog.importCatalog,
            onSelectCatalog: statusCatalog.selectCatalog,
            onDeleteCatalog: statusCatalog.removeCatalog,
            onOpenEditor: () => {
              setSettingsOpen(false);
              statusEditor.openEditor();
            },
          }}
          colorCatalog={{
            settings: colorCatalog.settings,
            selectedCatalogLabel: colorCatalog.selectedCatalogLabel,
            onImport: colorCatalog.importCatalog,
            onSelectCatalog: colorCatalog.selectCatalog,
            onDeleteCatalog: colorCatalog.removeCatalog,
            onOpenEditor: () => {
              setSettingsOpen(false);
              colorEditor.openEditor();
            },
          }}
          calendarLabel={null}
          displayScalePreference={displayScale}
          onDisplayScaleChange={applyDisplayScale}
          colorSchemePreference={colorScheme}
          onColorSchemeChange={applyColorScheme}
          rowDensity="comfortable"
          onRowDensityChange={noop}
          showLightningLine={false}
          onShowLightningLineChange={noop}
          sidebarColumns={DEFAULT_SIDEBAR_COLUMNS}
          onSidebarColumnsChange={noop}
          onClose={() => setSettingsOpen(false)}
          onImportCalendar={async () => {}}
          onDeleteCalendar={async () => {}}
          workspaceBinding={workspaceBinding}
          workspaceMemberEditor={
            workspaceMemberTarget
              ? { onOpenEditor: openMemberEditor }
              : undefined
          }
          fieldExtensionSettings={fieldCatalog.settings}
          fieldExtensionSelectedLabels={fieldCatalog.selectedLabels}
          fieldExtensionsError={fieldCatalog.error}
          onImportFieldExtension={async (contents) => {
            await fieldCatalog.importCatalog(contents, false);
          }}
          onToggleFieldExtension={async (catalogId, selected) => {
            const current = fieldCatalog.settings.selectedCatalogIds;
            const next = selected
              ? [...current, catalogId]
              : current.filter((id) => id !== catalogId);
            await fieldCatalog.setSelectedCatalogIds(next);
          }}
          onDeleteFieldExtension={fieldCatalog.removeCatalog}
          fieldExtensionEditor={
            workspaceBinding
              ? undefined
              : { onOpenEditor: () => {
                  setSettingsOpen(false);
                  fieldEditor.openEditor();
                } }
          }
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
      {statusEditor.open ? (
        <StatusCatalogEditorOverlay
          mode={statusEditor.mode}
          catalogs={statusEditor.catalogs}
          editingCatalogId={statusEditor.editingCatalogId}
          editingItems={statusEditor.editingItems}
          itemsRevision={statusEditor.itemsRevision}
          appliedCatalogId={statusEditor.appliedCatalogId}
          workspaceFileLabel={statusEditor.workspaceFileLabel}
          workspaceAppliedNote={statusEditor.workspaceAppliedNote}
          busy={statusEditor.busy}
          message={statusEditor.message}
          setMessage={statusEditor.setMessage}
          onDirtyChange={statusEditor.setDirty}
          discardPrompt={statusEditor.discardPrompt}
          copyConfirmOpen={statusEditor.copyConfirmOpen}
          removeConfirmOpen={statusEditor.removeConfirmOpen}
          dirty={statusEditor.dirty}
          onConfirmDiscard={() => {
            void statusEditor.confirmDiscard();
          }}
          onCancelDiscard={statusEditor.cancelDiscard}
          onConfirmCopy={statusEditor.confirmCopy}
          onCancelCopy={statusEditor.cancelCopy}
          onRequestRemoveCatalog={statusEditor.requestRemoveCatalog}
          onConfirmRemoveCatalog={() => {
            void statusEditor.confirmRemoveCatalog();
          }}
          onCancelRemoveCatalog={statusEditor.cancelRemoveCatalog}
          onSelectCatalog={statusEditor.selectCatalog}
          onRequestClose={statusEditor.requestClose}
          onRequestNewList={statusEditor.requestNewList}
          onRequestCopyList={statusEditor.requestCopyList}
          onSaveApp={statusEditor.save}
          onSaveWorkspace={statusEditor.saveWorkspace}
        />
      ) : null}
      {colorEditor.open ? (
        <ColorCatalogEditorOverlay
          mode={colorEditor.mode}
          catalogs={colorEditor.catalogs}
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
      <FieldExtensionEditorOverlay state={fieldEditor} />
      <HierarchyLevelsDialog
        open={hierarchyOpen}
        initialLevels={levelDefsForEditor(doc)}
        hadDocumentLevels={documentHasExplicitLevels(doc)}
        snapshot={{
          title: doc.title,
          categories: doc.categories,
          milestoneGroups: doc.milestoneGroups,
          milestones: doc.milestones,
          connections: doc.connections,
          levels: doc.levels,
          outline: doc.outline,
        }}
        onClose={() => setHierarchyOpen(false)}
        onCommit={(levels) => {
          const result = applyLevelEditorCommit(
            {
              title: doc.title,
              categories: doc.categories,
              milestoneGroups: doc.milestoneGroups,
              milestones: doc.milestones,
              connections: doc.connections,
              levels: doc.levels,
              outline: doc.outline,
            },
            levels,
            documentHasExplicitLevels(doc),
          );
          commitDoc({
            ...doc,
            title: result.next.title,
            categories: result.next.categories,
            milestoneGroups: result.next.milestoneGroups,
            milestones: result.next.milestones,
            connections: result.next.connections,
            levels: result.next.levels,
            outline: result.next.outline,
          });
          setHierarchyOpen(false);
        }}
      />
      {headingAdd && doc.outline != null && doc.levels != null ? (
        <OutlineHeadingAddDialog
          levels={doc.levels}
          outline={doc.outline}
          levelCount={layout.levelCount}
          onClose={() => setHeadingAdd(false)}
          onSave={(levelIndex, parentBranchId, name) => {
            if (doc.outline == null || doc.levels == null) return "追加できませんでした";
            const taken = takenIds(doc);
            const allocateId = allocator(taken);
            const result = appendOutlineHeadingAtLevel(
              doc.outline,
              layout.levelCount,
              doc.levels,
              levelIndex,
              parentBranchId,
              name,
              allocateId(),
              allocateId,
            );
            if (result.error) return result.error;
            if (result.changed) commitDoc({ ...doc, outline: result.outline });
            setHeadingAdd(false);
            return null;
          }}
        />
      ) : headingAdd && layout.useLegacyCategoryRows ? (
        <OutlineHeadingAddDialog
          levels={levelDefsForEditor(doc)}
          categoryParentOptions={legacyCategoryParentSelectOptions(doc.categories)}
          levelCount={layout.levelCount}
          onClose={() => setHeadingAdd(false)}
          onSave={(levelIndex, parentBranchId, name) => {
            const taken = takenIds(doc);
            const allocateId = allocator(taken);
            const result = appendLegacyHeadingFromToolbar(
              doc.categories,
              levelIndex,
              parentBranchId,
              name,
              allocateId(),
              allocateId(),
            );
            if (result.error) return result.error;
            if (result.changed) commitDoc({ ...doc, categories: result.categories });
            setHeadingAdd(false);
            return null;
          }}
        />
      ) : null}
      {sibling && doc.outline != null && doc.levels != null ? (
        <HierarchyNameDialog
          title={sibling.title}
          initialName=""
          primaryLabel="追加"
          onClose={() => setSibling(null)}
          onSave={(name) => {
            if (doc.outline == null || doc.levels == null) return "追加できませんでした";
            const taken = takenIds(doc);
            const allocateId = allocator(taken);
            const result = insertOutlineSiblingAfter(
              doc.outline,
              sibling.afterId,
              layout.levelCount,
              doc.levels,
              name,
              allocateId(),
              allocateId,
            );
            if (result.error) return result.error;
            if (result.changed) commitDoc({ ...doc, outline: result.outline });
            setSibling(null);
            return null;
          }}
        />
      ) : null}
      {menu && menuItems.length > 0 ? (
        <ContextMenu x={0} y={0} items={menuItems} onClose={() => setMenu(null)} />
      ) : null}
      {reloadOpen ? (
        <ExternalReloadDialog
          assessment={SAME_ONLY}
          review={null}
          conflictReview={null}
          hasOpenEditDialog={
            memberEditor.open || statusEditor.open || colorEditor.open || fieldEditor.open || hierarchyOpen
          }
          diskUpdatedAgain={false}
          onReload={onExternalReload}
          onKeepLocal={() => setReloadOpen(false)}
          onApplyMerge={onExternalReload}
        />
      ) : null}
    </div>
  );
}

function computeVisibleRowsForHarness(
  doc: ScheduleDocument,
  memberMap: ReturnType<typeof useMemberCatalog>["memberMap"],
  statuses: ReturnType<typeof useStatusCatalog>["statuses"],
  fields: ReturnType<typeof useFieldExtensionCatalog>["extensionFieldDefs"],
) {
  const layout = hierarchyLayoutContext(doc);
  return computeVisibleRows(
    doc.categories,
    DEFAULT_FILTERS,
    new Set(),
    "2026-04-15",
    memberMap,
    32,
    null,
    statuses,
    {
      levels: layout.levels,
      outline: doc.outline,
      useLegacyCategoryRows: layout.useLegacyCategoryRows,
      levelCount: layout.levelCount,
    },
    fields,
  );
}

function menuHandlers(
  doc: ScheduleDocument,
  setSibling: (value: { afterId: ScheduleId; title: string } | null) => void,
): ContextMenuItemHandlers {
  const layout = hierarchyLayoutContext(doc);
  return {
    setMilestoneMarkVisible: noop,
    showOnlyMilestoneMark: noop,
    openMilestoneEdit: noop,
    setMilestoneConfidence: noop,
    setDeleteMilestoneId: noop,
    removeTaskConnection: noop,
    removePredecessorLink: noop,
    openAddMilestone: noop,
    setMilestoneGroupVisible: noop,
    showOnlyMilestoneGroup: noop,
    openHierarchyEdit: noop,
    openAddCategoryAfter: noop,
    openAddGroupToCategory: noop,
    openAddGroupAfter: noop,
    openAddOutlineSiblingAfter: (id) => {
      const levelName = layout.levels?.[0]?.name ?? "階層";
      setSibling({ afterId: id, title: `下に${levelName}を追加` });
    },
    openAddOutlineChild: noop,
    openDeleteHierarchy: noop,
    setDeleteOpen: noop,
    openTaskForEdit: noop,
    openDuplicateDialog: noop,
    setTaskConfidence: noop,
    openTaskNoteDialog: noop,
    clearLineage: noop,
    showLineage: noop,
  };
}

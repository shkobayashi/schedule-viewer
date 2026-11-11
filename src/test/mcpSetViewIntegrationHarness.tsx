import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { ActiveFilterBar } from "../components/ActiveFilterBar";
import { executeMcpActionTool } from "../hooks/mcpActionExecutor";
import { useMcpActionExecutor } from "../hooks/useMcpActionExecutor";
import type { McpActionResult } from "../hooks/mcpActionExecutor";
import { DEFAULT_FILTERS, pruneHiddenMilestoneIds } from "../model/filterChips";
import { BUILTIN_STATUS_ITEMS } from "../model/statusCatalog";
import { findTaskInDocument } from "../model/hierarchy";
import { MCP_TOOL_SET_VIEW } from "../model/mcpToolNames";
import type { McpSetViewPatch } from "../model/mcpSetView";
import {
  emptyTaskSelection,
  type TaskSelectionState,
} from "../model/taskSelection";
import type {
  ScheduleDocument,
  ScheduleFieldDef,
  ScheduleFilters,
  ScheduleId,
} from "../model/types";

export type McpSetViewIntegrationHandle = {
  runSetView: (envelope: Record<string, unknown>) => Promise<McpActionResult>;
  setExplanationActive: (active: boolean) => void;
  selectTask: (taskId: ScheduleId) => void;
  getFilters: () => ScheduleFilters;
};

type McpSetViewIntegrationHarnessProps = {
  scheduleDocument: ScheduleDocument;
  fields?: readonly ScheduleFieldDef[];
};

export const McpSetViewIntegrationHarness = forwardRef<
  McpSetViewIntegrationHandle,
  McpSetViewIntegrationHarnessProps
>(function McpSetViewIntegrationHarness(
  { scheduleDocument, fields = [] },
  ref,
) {
  const [doc] = useState(scheduleDocument);
  const [filters, setFilters] = useState<ScheduleFilters>(DEFAULT_FILTERS);
  const [searchField, setSearchField] = useState<"name" | "note">("name");
  const [hiddenGroupIds, setHiddenGroupIds] = useState<ScheduleId[]>([]);
  const [hiddenMarkIds, setHiddenMarkIds] = useState<ScheduleId[]>([]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [lineageTaskId, setLineageTaskId] = useState<ScheduleId | null>(null);
  const [lineageIncludesConnections, setLineageIncludesConnections] =
    useState(false);
  const [selection, setSelection] = useState<TaskSelectionState>(
    emptyTaskSelection(),
  );
  const [explanationActive, setExplanationActive] = useState(false);

  const prunedHiddenMilestoneIds = useMemo(
    () => pruneHiddenMilestoneIds(hiddenMarkIds, doc.milestones),
    [hiddenMarkIds, doc.milestones],
  );

  const lineageName = useMemo(() => {
    if (lineageTaskId == null) return null;
    return (
      findTaskInDocument(doc.categories, doc.outline, lineageTaskId)?.name ??
      null
    );
  }, [doc.categories, doc.outline, lineageTaskId]);

  const getFilterViewState = useCallback(
    () => ({
      filters,
      searchField,
      hiddenMilestoneGroupIds: hiddenGroupIds,
      hiddenMilestoneIds: prunedHiddenMilestoneIds,
      collapsedCategoryIds: [] as ScheduleId[],
      collapsedGroupIds: [] as ScheduleId[],
    }),
    [filters, hiddenGroupIds, prunedHiddenMilestoneIds, searchField],
  );

  const applyPartialFilterViewState = useCallback(
    (update: {
      filters?: ScheduleFilters;
      searchField?: "name" | "note";
      hiddenMilestoneGroupIds?: ScheduleId[];
      hiddenMilestoneIds?: ScheduleId[];
      collapsed?: ReadonlySet<string>;
    }) => {
      if (update.filters !== undefined) {
        setFilters({ ...update.filters, tags: [...update.filters.tags] });
      }
      if (update.searchField !== undefined) setSearchField(update.searchField);
      if (update.hiddenMilestoneGroupIds !== undefined) {
        setHiddenGroupIds([...update.hiddenMilestoneGroupIds]);
      }
      if (update.hiddenMilestoneIds !== undefined) {
        setHiddenMarkIds([...update.hiddenMilestoneIds]);
      }
      if (update.collapsed !== undefined) setCollapsed(new Set(update.collapsed));
    },
    [],
  );

  const applyMcpSetViewLineage = useCallback(
    (lineage: NonNullable<McpSetViewPatch["lineage"]>) => {
      if (lineage.taskId === null) {
        setLineageTaskId(null);
        setLineageIncludesConnections(false);
        return;
      }
      setLineageTaskId(lineage.taskId);
      setLineageIncludesConnections(lineage.includesConnections);
    },
    [],
  );

  const executor = useMcpActionExecutor({
    getDocument: () => doc,
    visibleRows: [],
    levels: doc.levels,
    replaceScheduleDocument: () => ({
      outcome: "unchanged",
      screenJson: "{}",
    }),
    scheduleFilePath: null,
    getScheduleFilePath: () => null,
    fields,
    getCanonicalJson: () => "{}",
    documentTitle: doc.title,
    setBaselineAfterSave: () => {},
    isDirty: false,
    getIsDirty: () => false,
    openPathWithoutDialog: async () => ({ ok: true, text: "" }),
    getCollapsed: () => collapsed,
    getFilterViewState,
    applyPartialFilterViewState,
    applyMcpSetViewLineage,
    clearExplanationOnSetView: () => setExplanationActive(false),
    runExplainViewAction: () => ({ ok: true, text: "" }),
    runExplainOverlayAction: () => ({ ok: true, text: "" }),
    getExplanationOverlay: () => null,
    applySetViewPreferences: () => {},
    applySetViewTimeline: () => {},
    applyCalendarAction: async () => ({ ok: true, text: "" }),
    runExport: async () => ({ ok: true, text: "" }),
    undo: () => false,
    redo: () => false,
    memberCatalogSave: async () => ({ ok: true, text: "" }),
    colorCatalogSave: async () => ({ ok: true, text: "" }),
    statusCatalogSave: async () => ({ ok: true, text: "" }),
    fieldCatalogSave: async () => ({ ok: true, text: "" }),
    exportWorkspaceToFolder: async () => ({ ok: true, text: "" }),
    mcpUiBlocking: () => false,
  });

  useImperativeHandle(
    ref,
    () => ({
      runSetView: (envelope) =>
        executeMcpActionTool(MCP_TOOL_SET_VIEW, envelope, executor),
      setExplanationActive,
      selectTask: (taskId) => {
        setSelection({ ids: [taskId], anchorId: taskId, activeId: taskId });
      },
      getFilters: () => filters,
    }),
    [executor, filters],
  );

  return (
    <div>
      <p data-testid="selection">{selection.ids.join(",")}</p>
      <p data-testid="explanation-active">
        {explanationActive ? "true" : "false"}
      </p>
      <ActiveFilterBar
        filters={filters}
        milestones={doc.milestones}
        milestoneGroups={doc.milestoneGroups}
        hiddenMilestoneGroupIds={hiddenGroupIds}
        hiddenMilestoneIds={prunedHiddenMilestoneIds}
        assigneeLabel={null}
        lineageName={lineageName}
        lineageIncludesConnections={lineageIncludesConnections}
        scheduleTags={[]}
        scheduleFields={fields}
        statuses={BUILTIN_STATUS_ITEMS}
        onFiltersChange={(patch) =>
          setFilters((prev) => ({
            ...prev,
            ...patch,
            tags: patch.tags != null ? [...patch.tags] : prev.tags,
          }))
        }
        onClearLineage={() => {
          setLineageTaskId(null);
          setLineageIncludesConnections(false);
        }}
        onMilestoneGroupVisible={(id, visible) => {
          setHiddenGroupIds((current) =>
            visible ? current.filter((item) => item !== id) : [...current, id],
          );
        }}
        onMilestoneMarkVisible={(id, visible) => {
          setHiddenMarkIds((current) =>
            visible ? current.filter((item) => item !== id) : [...current, id],
          );
        }}
        onShowAllMilestoneGroups={() => setHiddenGroupIds([])}
        onShowAllMilestoneMarks={() => setHiddenMarkIds([])}
      />
    </div>
  );
});

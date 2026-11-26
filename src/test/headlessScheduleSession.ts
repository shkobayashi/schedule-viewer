import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeMcpActionTool } from "../hooks/mcpActionExecutor";
import type { ExplanationOverlayState } from "../model/explainOverlay";
import {
  explainOverlayHideSuccessText,
  explainOverlayShowSuccessText,
  parseExplainOverlayRequest,
} from "../model/explainOverlay";
import {
  explainViewApplySuccessText,
  explainViewClearSuccessText,
  parseExplainViewRequest,
  type ExplanationViewState,
} from "../model/explainView";
import {
  createDocumentHistory,
  pushDocumentHistory,
  redoDocumentHistory,
  undoDocumentHistory,
  type DocumentSnapshot,
} from "../model/history";
import { appendMilestone, removeMilestone, validateNewMilestone } from "../model/milestones";
import type { McpEditPlanOp } from "../model/mcpEditPlan";
import {
  assessMcpOperationGate,
  assessMcpUiBlocking,
  MCP_OPERATION_UI_BUSY,
  type McpUiBlockingInput,
} from "../model/mcpOperationGate";
import {
  MCP_TOOL_APPLY_EXPLANATION_PATTERN,
  MCP_TOOL_EDIT_PLAN,
  MCP_TOOL_EXPLAIN_OVERLAY,
  MCP_TOOL_EXPLAIN_VIEW,
  MCP_TOOL_HISTORY,
} from "../model/mcpToolNames";
import { removeConnectionsForDeletedTasks } from "../model/connections";
import { computeVisibleRows } from "../model/rows";
import { parseScheduleText } from "../model/scheduleFile";
import { formatScheduleDiff, SCHEDULE_DIFF_NO_CHANGES } from "../model/scheduleDiff";
import { resolveScheduleTitleCommit } from "../model/scheduleTitleEdit";
import { documentToJsonString } from "../model/serialize";
import {
  insertCategoryAfter,
  insertGroupAfter,
  insertTask,
  insertTaskAfter,
  removeGroup as removeGroupFromCategories,
  removeTask,
  validateNewTask,
} from "../model/tasks";
import { BUILTIN_STATUS_ITEMS, defaultStatusId } from "../model/statusCatalog";
import {
  SCHEDULE_SCHEMA_VERSION,
  type Milestone,
  type ScheduleDocument,
  type ScheduleFilters,
  type Task,
} from "../model/types";

const OPEN_FILTERS: ScheduleFilters = {
  assignee: "all",
  status: "all",
  confidence: "all",
  overdue: "all",
  relation: "all",
  milestone: "all",
  tags: [],
  search: "",
  noteSearch: "",
  fieldFilters: {},
};

export type HeadlessStep =
  | { tool: "edit_plan"; ops: readonly McpEditPlanOp[] }
  | { tool: "history"; action: "undo" | "redo" }
  | { tool: "save" }
  | { tool: "reload" }
  | {
      tool: "addTask";
      task: Task;
      afterTaskId: string;
    }
  | {
      tool: "addCategory";
      afterCategoryId: string;
      name: string;
      categoryId: string;
      groupId: string;
    }
  | {
      tool: "addGroup";
      afterGroupId: string;
      name: string;
      groupId: string;
    }
  | { tool: "addMilestone"; milestone: Milestone }
  | { tool: "deleteMilestone"; milestoneId: string }
  | { tool: "explain_view"; envelope: Record<string, unknown> }
  | { tool: "explain_overlay"; envelope: Record<string, unknown> }
  | { tool: "apply_explanation_pattern"; patternId: string }
  | { tool: "setDragging"; chartBarDragging: boolean }
  | { tool: "setDetailPanelEditing"; detailPanelEditing: boolean }
  | { tool: "removeGroup"; groupId: string }
  | {
      tool: "insertValidatedTask";
      input: {
        name: string;
        start: string;
        end: string;
        category: string;
        group: string;
      };
      taskId: string;
    }
  | { tool: "setTitle"; raw: string }
  | { tool: "deleteTask"; taskId: string }
  | { tool: "commitDocument"; document: ScheduleDocument };

export type HeadlessStepResult = {
  ok: boolean;
  message: string;
  savedJson: string;
  screenJson: string;
  dirty: boolean;
  diffText: string;
  explainView: ExplanationViewState | null;
  explainOverlay: ExplanationOverlayState | null;
};

function snapshotOf(document: ScheduleDocument): DocumentSnapshot {
  return {
    title: document.title,
    categories: document.categories,
    milestoneGroups: document.milestoneGroups,
    milestones: document.milestones,
    connections: document.connections,
    levels: document.levels,
    outline: document.outline,
  };
}

function documentFromSnapshot(
  current: ScheduleDocument,
  snapshot: DocumentSnapshot,
): ScheduleDocument {
  return {
    ...current,
    title: snapshot.title,
    categories: snapshot.categories,
    milestoneGroups: snapshot.milestoneGroups,
    milestones: snapshot.milestones,
    connections: snapshot.connections,
    levels: snapshot.levels,
    outline: snapshot.outline,
  };
}

/** 窓を開かず、edit_plan と履歴と保存と同じ関数を順にかける。 */
export function openHeadlessSchedule(fixtureJson: string): HeadlessSchedule {
  const parsed = parseScheduleText(fixtureJson);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }
  const dir = mkdtempSync(join(tmpdir(), "schedule-viewer-headless-"));
  const path = join(dir, "schedule.json");
  writeFileSync(path, parsed.canonicalJson, "utf8");
  return new HeadlessSchedule(path, parsed.document, parsed.canonicalJson);
}

export class HeadlessSchedule {
  private document: ScheduleDocument;
  private history = createDocumentHistory();
  private diskJson: string;
  private explainView: ExplanationViewState | null = null;
  private explainOverlay: ExplanationOverlayState | null = null;
  private ui: McpUiBlockingInput = {
    fileBusy: false,
    titleEditing: false,
    detailPanelEditing: false,
    scheduleInlineEditing: false,
    reorderDragging: false,
    sidebarReorderDragging: false,
    chartBarDragging: false,
    modalDialogOpen: false,
    externalReloadConflictDialogOpen: false,
  };

  constructor(
    readonly path: string,
    document: ScheduleDocument,
    diskJson: string,
  ) {
    this.document = document;
    this.diskJson = diskJson;
  }

  async run(step: HeadlessStep): Promise<HeadlessStepResult> {
    const outcome = await this.apply(step);
    return { ...outcome, ...this.view() };
  }

  private view(): Omit<HeadlessStepResult, "ok" | "message"> {
    const screenJson = documentToJsonString(this.document);
    const disk = parseScheduleText(this.diskJson);
    const diffText = disk.ok
      ? formatScheduleDiff(this.document, disk.document, "schedule.json")
      : disk.message;
    return {
      savedJson: this.diskJson,
      screenJson,
      dirty: screenJson !== this.diskJson,
      diffText,
      explainView: this.explainView,
      explainOverlay: this.explainOverlay,
    };
  }

  private async apply(
    step: HeadlessStep,
  ): Promise<{ ok: boolean; message: string }> {
    if (step.tool === "setDragging") {
      this.ui = { ...this.ui, chartBarDragging: step.chartBarDragging };
      return { ok: true, message: "" };
    }
    if (step.tool === "setDetailPanelEditing") {
      this.ui = { ...this.ui, detailPanelEditing: step.detailPanelEditing };
      return { ok: true, message: "" };
    }
    if (step.tool === "reload") {
      return this.reload();
    }
    if (step.tool === "save") {
      return this.save();
    }
    if (step.tool === "deleteTask") {
      return this.deleteTaskStep(step.taskId);
    }
    if (step.tool === "commitDocument") {
      return this.committed(step.document);
    }
    const gate = assessMcpOperationGate({
      startupSettled: true,
      startupRecoveryDialogOpen: false,
      uiBlocking: assessMcpUiBlocking(this.ui),
      discardInProgress: false,
      fileBusy: false,
    });
    if (!gate.ok) return gate;

    switch (step.tool) {
      case "edit_plan":
        return this.dispatch(MCP_TOOL_EDIT_PLAN, { ops: [...step.ops] });
      case "history":
        return this.dispatch(MCP_TOOL_HISTORY, { action: step.action });
      case "explain_view":
        return this.dispatch(MCP_TOOL_EXPLAIN_VIEW, step.envelope);
      case "explain_overlay":
        return this.dispatch(MCP_TOOL_EXPLAIN_OVERLAY, step.envelope);
      case "apply_explanation_pattern":
        return this.dispatch(MCP_TOOL_APPLY_EXPLANATION_PATTERN, {
          patternId: step.patternId,
        });
      case "removeGroup":
        return this.removeGroupById(step.groupId);
      case "insertValidatedTask":
        return this.insertValidatedTask(step);
      case "setTitle":
        return this.setTitle(step.raw);
      case "addTask":
        return this.addTask(step.task, step.afterTaskId);
      case "addCategory":
        return this.addCategory(step);
      case "addGroup":
        return this.addGroup(step);
      case "addMilestone":
        return this.addMilestone(step.milestone);
      case "deleteMilestone":
        return this.deleteMilestone(step.milestoneId);
      default:
        return { ok: false, message: "未知の操作です。" };
    }
  }

  private async dispatch(
    tool: string,
    envelope: Record<string, unknown>,
  ): Promise<{ ok: boolean; message: string }> {
    const result = await executeMcpActionTool(tool, envelope, {
      levels: this.document.levels,
      visibleRows: this.visibleRows(),
      getDocument: () => this.document,
      applySetView: async () => ({ ok: false, message: "この確認では使いません。" }),
      applyExplainView: async (body) => this.applyExplainView(body),
      applyExplainOverlay: async (body) => this.applyExplainOverlay(body),
      getExplanationOverlay: () => this.explainOverlay,
      applyEditPlan: (next) => this.commit(next),
      runFileAction: async () => ({
        ok: false,
        message: "保存はダイアログを通さず、この実行器がファイルへ書きます。",
      }),
      runCatalogAction: async () => ({ ok: false, message: "この確認では使いません。" }),
      runSetPreferences: async () => ({ ok: false, message: "この確認では使いません。" }),
      runHistory: async (body) => this.runHistory(body.action),
      runFocusWindow: async () => ({ ok: false, message: "窓は開きません。" }),
      runOpenNewWindow: async () => ({ ok: false, message: "窓は開きません。" }),
      runCloseWindow: async () => ({ ok: false, message: "窓は開きません。" }),
      runMinimizeWindow: async () => ({ ok: false, message: "窓は開きません。" }),
    });
    return result.ok
      ? { ok: true, message: result.text }
      : { ok: false, message: result.message };
  }

  private visibleRows() {
    return computeVisibleRows(
      this.document.categories,
      OPEN_FILTERS,
      new Set(),
      "2026-04-01",
      null,
      undefined,
      null,
      undefined,
      {
        levels: this.document.levels ?? null,
        outline: this.document.outline,
        useLegacyCategoryRows: this.document.levels == null,
        levelCount: this.document.levels?.length ?? 0,
      },
    );
  }

  private commit(next: ScheduleDocument): { ok: true; text: string } {
    const pushed = pushDocumentHistory(
      this.history,
      snapshotOf(this.document),
      snapshotOf(next),
    );
    if (pushed == null) return { ok: true, text: SCHEDULE_DIFF_NO_CHANGES };
    this.history = pushed.history;
    if (pushed.applied) {
      this.document = documentFromSnapshot(this.document, pushed.applied);
    }
    return { ok: true, text: "更新しました。" };
  }

  private committed(next: ScheduleDocument): { ok: true; message: string } {
    return { ok: true, message: this.commit(next).text };
  }

  private runHistory(
    action: unknown,
  ): { ok: true; text: string } | { ok: false; message: string } {
    if (action === "undo") {
      const undone = undoDocumentHistory(this.history, snapshotOf(this.document));
      if (!undone) return { ok: false, message: "戻せません。" };
      this.history = undone.history;
      this.document = documentFromSnapshot(this.document, undone.snapshot);
      return { ok: true, text: "1段戻しました。" };
    }
    if (action === "redo") {
      const redone = redoDocumentHistory(this.history, snapshotOf(this.document));
      if (!redone) return { ok: false, message: "進められません。" };
      this.history = redone.history;
      this.document = documentFromSnapshot(this.document, redone.snapshot);
      return { ok: true, text: "1段進めました。" };
    }
    return { ok: false, message: "history の action は undo か redo です。" };
  }

  private applyExplainView(
    envelope: Record<string, unknown>,
  ): { ok: true; text: string } | { ok: false; message: string } {
    const parsed = parseExplainViewRequest(
      envelope,
      {
        categories: this.document.categories,
        outline: this.document.outline,
        milestoneGroups: this.document.milestoneGroups,
        milestones: this.document.milestones,
        hiddenMilestoneGroupIds: [],
      },
      this.explainView,
    );
    if (!parsed.ok) return parsed;
    if (parsed.kind === "clear") {
      const wasActive =
        this.explainView != null || this.explainOverlay?.translucent === true;
      this.explainView = null;
      return { ok: true, text: explainViewClearSuccessText(wasActive) };
    }
    this.explainView = parsed.state;
    return { ok: true, text: explainViewApplySuccessText() };
  }

  private applyExplainOverlay(
    envelope: Record<string, unknown>,
  ): { ok: true; text: string } | { ok: false; message: string } {
    const parsed = parseExplainOverlayRequest(envelope, {
      categories: this.document.categories,
      outline: this.document.outline,
      milestones: this.document.milestones,
      milestoneGroups: this.document.milestoneGroups,
      hiddenMilestoneGroupIds: [],
      explanationView: this.explainView,
      collapsed: new Set(),
      visibleRows: this.visibleRows(),
    });
    if (!parsed.ok) return parsed;
    if (parsed.kind === "hide") {
      const wasActive = this.explainOverlay?.translucent === true;
      this.explainOverlay = null;
      return { ok: true, text: explainOverlayHideSuccessText(wasActive) };
    }
    this.explainOverlay = parsed.state;
    return { ok: true, text: explainOverlayShowSuccessText() };
  }

  private addTask(
    task: Task,
    afterTaskId: string,
  ): { ok: boolean; message: string } {
    const categories = insertTaskAfter(this.document.categories, task, afterTaskId);
    if (categories == null) {
      return { ok: false, message: "タスクを追加できません。" };
    }
    return this.committed({ ...this.document, categories });
  }

  private addCategory(
    step: Extract<HeadlessStep, { tool: "addCategory" }>,
  ): { ok: boolean; message: string } {
    const result = insertCategoryAfter(
      this.document.categories,
      step.afterCategoryId,
      step.name,
      step.categoryId,
      step.groupId,
    );
    if (result.error) return { ok: false, message: result.error };
    return this.committed({ ...this.document, categories: result.categories });
  }

  private addGroup(
    step: Extract<HeadlessStep, { tool: "addGroup" }>,
  ): { ok: boolean; message: string } {
    const result = insertGroupAfter(
      this.document.categories,
      step.afterGroupId,
      step.name,
      step.groupId,
    );
    if (result.error) return { ok: false, message: result.error };
    return this.committed({ ...this.document, categories: result.categories });
  }

  private addMilestone(
    milestone: Milestone,
  ): { ok: boolean; message: string } {
    const error = validateNewMilestone(milestone);
    if (error) return { ok: false, message: error };
    return this.committed({
      ...this.document,
      milestones: appendMilestone(this.document.milestones, milestone),
    });
  }

  private removeGroupStep(
    groupId: string,
  ): { ok: boolean; message: string } {
    const categories = removeGroupFromCategories(this.document.categories, groupId);
    return this.committed({ ...this.document, categories });
  }

  private removeGroupById(groupId: string): { ok: boolean; message: string } {
    return this.removeGroupStep(groupId);
  }

  private insertValidatedTask(
    step: Extract<HeadlessStep, { tool: "insertValidatedTask" }>,
  ): { ok: boolean; message: string } {
    const error = validateNewTask(step.input, this.document.categories);
    if (error != null) {
      return { ok: false, message: error };
    }
    const task: Task = {
      id: step.taskId,
      name: step.input.name.trim(),
      start: step.input.start,
      end: step.input.end,
      assigneeIds: [],
      status: defaultStatusId(BUILTIN_STATUS_ITEMS),
      progress: 0,
      confidence: "tentative",
      predecessors: [],
      milestoneId: null,
    };
    return this.committed({
      ...this.document,
      categories: insertTask(this.document.categories, task, {
        category: step.input.category,
        group: step.input.group,
      }),
    });
  }

  private setTitle(raw: string): { ok: boolean; message: string } {
    const resolved = resolveScheduleTitleCommit(this.document.title, raw);
    if (resolved.kind === "blank" || resolved.kind === "unchanged") {
      return { ok: true, message: "" };
    }
    return this.committed({ ...this.document, title: resolved.title });
  }

  private deleteTaskStep(taskId: string): { ok: boolean; message: string } {
    const deleted = new Set([taskId]);
    return this.committed({
      ...this.document,
      categories: removeTask(this.document.categories, taskId),
      connections: removeConnectionsForDeletedTasks(
        this.document.connections ?? [],
        deleted,
      ),
    });
  }

  getDocument(): ScheduleDocument {
    return this.document;
  }

  private deleteMilestone(
    milestoneId: string,
  ): { ok: boolean; message: string } {
    const removed = removeMilestone(
      this.document.categories,
      this.document.milestones,
      milestoneId,
    );
    if (removed.milestones.length === this.document.milestones.length) {
      return { ok: false, message: "マイルストンが見つかりません。" };
    }
    return this.committed({
      ...this.document,
      categories: removed.categories,
      milestones: removed.milestones,
    });
  }

  private save(): { ok: boolean; message: string } {
    const parsed = parseScheduleText(documentToJsonString(this.document));
    if (!parsed.ok) return parsed;
    writeFileSync(this.path, parsed.canonicalJson, "utf8");
    this.diskJson = parsed.canonicalJson;
    this.document = parsed.document;
    return { ok: true, message: this.path };
  }

  private reload(): { ok: boolean; message: string } {
    const text = readFileSync(this.path, "utf8");
    const parsed = parseScheduleText(text);
    if (!parsed.ok) return parsed;
    this.diskJson = parsed.canonicalJson;
    this.document = parsed.document;
    this.history = createDocumentHistory();
    return { ok: true, message: "" };
  }
}

export function fixtureScheduleJson(): string {
  const task = (id: string, name: string): Task => ({
    id,
    name,
    start: "2026-04-01",
    end: "2026-04-03",
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  });
  const document: ScheduleDocument = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "通し確認",
    milestoneGroups: [
      { id: "a1000001-0000-4000-8000-0000000000aa", name: "節目" },
    ],
    milestones: [],
    categories: [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "計画",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "前半",
            tasks: [
              task("e1000001-0000-4000-8000-000000000001", "調査"),
              task("e1000001-0000-4000-8000-000000000002", "設計"),
            ],
          },
          {
            id: "d1000001-0000-4000-8000-000000000002",
            name: "後半",
            tasks: [],
          },
        ],
      },
      {
        id: "c1000001-0000-4000-8000-000000000002",
        name: "空の分類",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000003",
            name: "グループ",
            tasks: [],
          },
        ],
      },
    ],
  };
  return documentToJsonString(document);
}

export { MCP_OPERATION_UI_BUSY };

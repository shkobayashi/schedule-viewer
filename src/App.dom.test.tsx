import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { documentToJsonString } from "./model/serialize";
import type { ScheduleDocument } from "./model/types";
import { parseScheduleText } from "./model/scheduleFile";
import { resolveWorkspaceRelativePath } from "./model/workspacePath";
import { createAppDomInvoke } from "./test/appDomInvoke";
import {
  cloneWithTaskEnd,
  installDomFlowPrereqs,
  pollJson,
  seedRegressionCatalogs,
} from "./test/scheduleFileFlowTestEnv";
import { EXTERNAL_RELOAD_POLL_MS } from "./hooks/scheduleFile/constants";
import type { ScheduleFileTauriInvoke } from "./test/scheduleFileFlowInvoke";
import {
  loadExampleSchedule,
  loadRegressionSchedule,
  readRegressionText,
} from "./test/searchErrorKeysFixtures";
import type { AppDomInvoke } from "./test/appDomInvoke";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

vi.mock("react-konva", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const Empty = () => null;
  return {
    Stage: Pass,
    Layer: Pass,
    Group: Pass,
    Rect: Empty,
    Line: Empty,
    Text: Empty,
    Arrow: Empty,
    RegularPolygon: Empty,
    Shape: Empty,
  };
});

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn(async () => null),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

const invoke = vi.hoisted(() => vi.fn<ScheduleFileTauriInvoke>());

const eventHandlers = vi.hoisted(
  () => new Map<string, (payload?: { payload?: string }) => void>(),
);

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    label: "main",
    setFocus: vi.fn(),
    close: vi.fn(),
    onCloseRequested: () => Promise.resolve(() => undefined),
    onFocusChanged: () => Promise.resolve(() => undefined),
    onDragDropEvent: () => Promise.resolve(() => undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: async () => "1.12.1",
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: (payload?: { payload?: string }) => void) => {
    eventHandlers.set(event, handler);
    return () => eventHandlers.delete(event);
  }),
}));

function emitWorkspaceReload(workspacePath: string) {
  eventHandlers.get("workspace-reload")?.({ payload: workspacePath });
}

function readExampleText(relative: string): string {
  return readFileSync(join(repoRoot, "examples", relative), "utf8");
}

function canonicalText(text: string): string {
  const parsed = parseScheduleText(text);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.canonicalJson;
}

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

async function dismissFirstRunIfPresent() {
  const close = screen.queryByRole("button", { name: "閉じる" });
  if (
    close &&
    (screen.queryByText("次の 3 つを終えましょう") ||
      screen.queryByText("サンプルを表示しています"))
  ) {
    fireEvent.click(close);
  }
}

async function waitForAppReady() {
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "階層の名前、意味、指示" }),
    ).toBeInTheDocument();
  });
}

async function settleAfterPoll() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function waitForNextPoll() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, EXTERNAL_RELOAD_POLL_MS * 2);
    });
  });
}

async function flushMicrotasks(times = 40) {
  await act(async () => {
    for (let i = 0; i < times; i += 1) {
      await Promise.resolve();
    }
  });
}

async function expandSidebarUntilTask(taskName: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const taskRow = screen.queryByText(taskName)?.closest(".sidebar-row.task");
    if (taskRow) return;
    const expanders = screen
      .queryAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-label")?.endsWith("を展開"));
    if (expanders.length === 0) break;
    fireEvent.click(expanders[0]!);
    await flushMicrotasks(5);
  }
  await waitFor(() => expect(screen.getByText(taskName)).toBeInTheDocument());
}

async function mountApp(startup: {
  path: string;
  workspacePath?: string | null;
  contents: string;
}) {
  const parsed = parseScheduleText(startup.contents);
  if (!parsed.ok) throw new Error(parsed.message);
  const flow = createAppDomInvoke(parsed.document);
  flow.setOnWorkspaceReload(emitWorkspaceReload);
  const startupRead = {
    path: startup.path,
    workspacePath: startup.workspacePath ?? null,
    sample: false as const,
    contents: startup.contents,
    error: null,
    draftText: null,
    transientMain: false,
  };
  flow.setStartupRead(startupRead);
  flow.setDisk(startup.path, startup.contents);
  invoke.mockImplementation((command, args) => flow.invoke(command, args));
  flow.holdStartup();
  render(<App />);
  await act(async () => {
    flow.resolveStartup(startupRead);
  });
  await waitForAppReady();
  await dismissFirstRunIfPresent();
  return { flow, document: parsed.document };
}

async function mountWorkspaceApp(options: {
  document: ScheduleDocument;
  workspacePath: string;
  schedulePath: string;
  scheduleContents: string;
  waitForTaskLabel: string;
  prepareFlow?: (flow: AppDomInvoke) => void;
}) {
  const flow = createAppDomInvoke(options.document);
  flow.setOnWorkspaceReload(emitWorkspaceReload);
  options.prepareFlow?.(flow);
  const startupRead = {
    path: options.schedulePath,
    workspacePath: options.workspacePath,
    sample: false as const,
    contents: options.scheduleContents,
    error: null,
    draftText: null,
    transientMain: false,
  };
  flow.setStartupRead(startupRead);
  flow.setDisk(options.schedulePath, options.scheduleContents);
  invoke.mockImplementation((command, args) => flow.invoke(command, args));
  flow.holdStartup();
  render(<App />);
  await act(async () => {
    flow.resolveStartup(startupRead);
  });
  await waitForAppReady();
  await waitFor(() =>
    expect(screen.getByText(options.waitForTaskLabel)).toBeInTheDocument(),
  );
  await dismissFirstRunIfPresent();
  return flow;
}

function openMenu() {
  fireEvent.click(screen.getByTitle("メニュー"));
}

async function openSettingsSection(section: string) {
  openMenu();
  const menus = await screen.findAllByRole("menu");
  const menu = menus[menus.length - 1]!;
  const settingsItems = within(menu)
    .getAllByRole("menuitem")
    .filter((item) => item.textContent?.includes("設定"));
  const settingsItem = settingsItems[0];
  if (!settingsItem) throw new Error("設定メニューが見つかりません");
  fireEvent.click(settingsItem);
  const settings = await screen.findByRole("dialog", { name: "設定" });
  fireEvent.click(within(settings).getByRole("button", { name: section }));
  return settings;
}

function seedMemberCatalogStorage() {
  const before = JSON.stringify({ seeded: readRegressionText("members.json") });
  localStorage.setItem("schedule-viewer/members/catalogs", before);
  localStorage.setItem("schedule-viewer/members/selected", "seeded");
  return before;
}

function seedFieldExtensionCatalogStorage() {
  const before = JSON.stringify({ sample: readRegressionText("fields.json") });
  localStorage.setItem("schedule-viewer/field-extensions/catalogs", before);
  localStorage.setItem(
    "schedule-viewer/field-extensions/selected",
    JSON.stringify(["sample"]),
  );
  return before;
}

describe("App integration (Issue 548)", () => {
  beforeEach(() => {
    localStorage.clear();
    installDomFlowPrereqs();
    seedRegressionCatalogs(readRegressionText);
    installMatchMedia();
    eventHandlers.clear();
    invoke.mockReset();
    vi.useRealTimers();
    Element.prototype.scrollIntoView = () => undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("TC-HIER-06c: hierarchy draft blocks immediate reload and stays out of the document", async () => {
    const schedulePath = "/tmp/regression/hierarchy/levels-2.schedule.json";
    const scheduleText = readExampleText("hierarchy/levels-2.schedule.json");
    const canonical = canonicalText(scheduleText);
    const { flow, document } = await mountApp({
      path: schedulePath,
      contents: canonical,
    });
    flow.setDisk(schedulePath, canonical);
    await waitFor(() => expect(screen.getByText("調査A")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const hierarchy = await screen.findByRole("dialog", { name: "階層" });
    const meaning = within(hierarchy).getAllByLabelText("意味")[0];
    fireEvent.change(meaning, { target: { value: "回帰の意味" } });
    fireEvent.blur(meaning);
    await waitFor(() => {
      expect(meaning).toHaveValue("回帰の意味");
    });
    fireEvent.click(screen.getByText("調査A"));
    fireEvent.change(screen.getByLabelText("終了"), { target: { value: "2026-10-03" } });

    const updated = cloneWithTaskEnd(document, "e2000001-0000-4000-8000-000000000001", "2026-10-05");
    flow.setDisk(schedulePath, documentToJsonString(updated));
    flow.queuePoll(pollJson(updated));
    await waitForNextPoll();
    await settleAfterPoll();

    await screen.findByRole("dialog", { name: "ファイルが更新されています" });
    expect(within(screen.getByRole("dialog", { name: "階層" })).getAllByLabelText("意味")[0]).toHaveValue(
      "回帰の意味",
    );

    fireEvent.click(screen.getByText("調査A"));
    expect(screen.getByLabelText("終了")).toHaveValue("2026-10-04");

    fireEvent.click(screen.getByRole("button", { name: "読み直す" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "階層" })).toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const reopened = await screen.findByRole("dialog", { name: "階層" });
    expect(within(reopened).getAllByLabelText("意味")[0]).toHaveValue(
      "画面ではノード名を行に出す。定義名は帯の上だけ。",
    );
    fireEvent.keyDown(reopened, { key: "Escape" });

    fireEvent.click(screen.getByText("調査A"));
    await waitFor(() => {
      expect(screen.getByLabelText("終了")).toHaveValue("2026-10-05");
    });
    expect(screen.getByText("北ブロック")).toBeInTheDocument();
    expect(screen.getByText("調査A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const hierarchyAgain = await screen.findByRole("dialog", { name: "階層" });
    fireEvent.change(within(hierarchyAgain).getAllByLabelText("意味")[0], {
      target: { value: "また下書き" },
    });
    fireEvent.keyDown(hierarchyAgain, { key: "Escape" });

    fireEvent.click(screen.getByText("設計A"));
    const endField = screen.getByLabelText("終了");
    fireEvent.change(endField, { target: { value: "2026-10-13" } });
    await waitFor(() => expect(endField).toHaveValue("2026-10-13"));

    const disk2 = cloneWithTaskEnd(updated, "e2000001-0000-4000-8000-000000000002", "2026-10-14");
    flow.setDisk(schedulePath, documentToJsonString(disk2));
    flow.queuePoll(pollJson(disk2));
    await waitForNextPoll();
    await settleAfterPoll();

    const mergeDialog = await screen.findByRole("dialog", {
      name: "ファイルが更新されています",
    });
    fireEvent.click(within(mergeDialog).getByRole("button", { name: "両方を画面へ反映" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ファイルが更新されています" })).toBeNull();
    });

    const diskJson = flow.getDisk(schedulePath) ?? "";
    expect(diskJson).not.toContain("また下書き");
    expect(diskJson).not.toContain("回帰の意味");

    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const afterMerge = await screen.findByRole("dialog", { name: "階層" });
    expect(within(afterMerge).getAllByLabelText("意味")[0]).toHaveValue(
      "画面ではノード名を行に出す。定義名は帯の上だけ。",
    );
    expect(screen.getByText("北ブロック")).toBeInTheDocument();
    expect(screen.getByText("設計A")).toBeInTheDocument();
  });

  it("TC-SET-08m: hides 項目を編集 when workspace statuses are absent", async () => {
    const wsPath = "/tmp/regression/ws-no-status/workspace.json";
    const schedulePath = "/tmp/regression/ws-no-status/plan.json";
    const scheduleText = readRegressionText("smoke.schedule.json");
    const canonical = canonicalText(scheduleText);
    const flow = await mountWorkspaceApp({
      document: loadRegressionSchedule("smoke.schedule.json"),
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonical,
      waitForTaskLabel: "調査",
      prepareFlow: (f) => {
        f.setDisk(
          wsPath,
          JSON.stringify({
            schemaVersion: 1,
            schedule: "plan.json",
            members: "members.json",
          }),
        );
        f.setDisk(
          "/tmp/regression/ws-no-status/members.json",
          readRegressionText("members.json"),
        );
      },
    });

    const settings = await openSettingsSection("ステータス");
    expect(within(settings).getByText(/使用中: 組み込みの三件/)).toBeInTheDocument();
    expect(within(settings).queryByRole("button", { name: "項目を編集…" })).toBeNull();
  });

  it("TC-SET-08m: hides 項目を編集 when workspace statuses cannot be read", async () => {
    const wsPath = "/tmp/regression/ws-bad-status/workspace.json";
    const schedulePath = "/tmp/regression/ws-bad-status/plan.json";
    const scheduleText = readRegressionText("smoke.schedule.json");
    const canonical = canonicalText(scheduleText);
    await mountWorkspaceApp({
      document: loadRegressionSchedule("smoke.schedule.json"),
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonical,
      waitForTaskLabel: "調査",
      prepareFlow: (f) => {
        f.setDisk(
          wsPath,
          JSON.stringify({
            schemaVersion: 1,
            schedule: "plan.json",
            statuses: "missing.statuses.json",
          }),
        );
      },
    });

    const settings = await openSettingsSection("ステータス");
    expect(within(settings).getByRole("alert")).toBeInTheDocument();
    expect(within(settings).queryByRole("button", { name: "項目を編集…" })).toBeNull();
  });

  it("TC-SET-10l: shows the pinned extension and 編集用の拡張を作る without 項目を編集", async () => {
    const wsPath = "/tmp/regression/fields-ws/workspace.json";
    const schedulePath = "/tmp/regression/fields-ws/schedule.json";
    const scheduleDoc = loadExampleSchedule("fields.schedule.json");
    const scheduleText = documentToJsonString(scheduleDoc);
    await mountWorkspaceApp({
      document: scheduleDoc,
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonicalText(scheduleText),
      waitForTaskLabel: "値あり",
      prepareFlow: (f) => seedFieldsWorkspaceOnFlow(f, wsPath, schedulePath),
    });

    const settings = await openSettingsSection("拡張項目");
    expect(within(settings).getByText(/ピン留め: サンプル追加項目/)).toBeInTheDocument();
    expect(within(settings).getByText(/編集用: 未作成/)).toBeInTheDocument();
    expect(within(settings).getByRole("button", { name: "編集用の拡張を作る" })).toBeEnabled();
    expect(within(settings).queryByRole("button", { name: "項目を編集…" })).toBeNull();
  });

  it("TC-SET-02d: workspace member rename changes the row label and leaves the app catalog", async () => {
    const membersBefore = seedMemberCatalogStorage();
    const wsPath = "/tmp/regression/config/workspace.json";
    const schedulePath = "/tmp/regression/config/playground.schedule.json";
    const playground = loadExampleSchedule("playground.schedule.json");
    const canonical = canonicalText(readExampleText("playground.schedule.json"));
    const flow = await mountWorkspaceApp({
      document: playground,
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonical,
      waitForTaskLabel: "現状業務ヒアリング",
      prepareFlow: (f) => {
        f.setDisk(wsPath, readExampleText("config/workspace.json"));
        f.setDisk(
          "/tmp/regression/config/sample-team.members.json",
          readExampleText("config/sample-team.members.json"),
        );
      },
    });
    await expandSidebarUntilTask("現状業務ヒアリング");

    const settings = await openSettingsSection("メンバー");
    fireEvent.click(within(settings).getByRole("button", { name: "項目を編集…" }));
    const editor = await screen.findByRole("dialog", { name: "メンバーの項目を編集" });
    fireEvent.change(within(editor).getByDisplayValue("田中"), {
      target: { value: "田中改" },
    });
    fireEvent.click(within(editor).getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(
        flow.writeCalls.some(
          (call) =>
            call.command === "write_members_at_path" &&
            call.args?.path === "/tmp/regression/config/sample-team.members.json",
        ),
      ).toBe(true);
    });
    expect(localStorage.getItem("schedule-viewer/members/catalogs")).toBe(membersBefore);
    fireEvent.keyDown(editor, { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByText("現状業務ヒアリング").closest(".sidebar-row")).toHaveTextContent(
        "田中改",
      );
    });
  });

  it("TC-SET-09c: 色の一覧を作る opens the editor after the workspace reload", async () => {
    const wsPath = "/tmp/regression/ws-colors/workspace.json";
    const schedulePath = "/tmp/regression/ws-colors/plan.json";
    const scheduleText = readRegressionText("smoke.schedule.json");
    const canonical = canonicalText(scheduleText);
    const flow = await mountWorkspaceApp({
      document: loadRegressionSchedule("smoke.schedule.json"),
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonical,
      waitForTaskLabel: "調査",
      prepareFlow: (f) => {
        f.setDisk(wsPath, JSON.stringify({ schemaVersion: 1, schedule: "plan.json" }));
      },
    });

    const settings = await openSettingsSection("色");
    fireEvent.click(within(settings).getByRole("button", { name: "色の一覧を作る" }));
    await waitFor(() => {
      const createCall = flow.writeCalls.find(
        (c) => c.command === "create_workspace_colors_catalog",
      );
      expect(createCall?.args?.relativeFileName).toBe("colors.json");
      expect(String(createCall?.args?.contents)).toContain("新しい色");
    });
    await waitFor(() => {
      const createCall = flow.writeCalls.find(
        (c) => c.command === "create_workspace_colors_catalog",
      );
      const target = resolveWorkspaceRelativePath(
        wsPath,
        String(createCall?.args?.relativeFileName ?? "colors.json"),
      );
      expect(target).toBeTruthy();
      expect(flow.diskStore.get(target!)).toContain("新しい色");
      expect(flow.getDisk(wsPath)).toContain('"colors"');
    });
    emitWorkspaceReload(wsPath);
    await flushMicrotasks(80);
    const settingsDialog = screen.getByRole("dialog", { name: "設定" });
    if (!screen.queryByRole("dialog", { name: "色の一覧の項目を編集" })) {
      fireEvent.click(within(settingsDialog).getByRole("button", { name: "項目を編集…" }));
    }
    await screen.findByRole("dialog", { name: "色の一覧の項目を編集" });
    fireEvent.keyDown(screen.getByRole("dialog", { name: "色の一覧の項目を編集" }), {
      key: "Escape",
    });
    const settingsAgain = await openSettingsSection("色");
    expect(within(settingsAgain).queryByRole("button", { name: "色の一覧を作る" })).toBeNull();
    expect(within(settingsAgain).getByRole("button", { name: "項目を編集…" })).toBeEnabled();
  });

  it("TC-SET-10m: create editable extension updates the settings buttons and leaves app catalogs unchanged", async () => {
    const catalogsBefore = seedFieldExtensionCatalogStorage();
    const wsPath = "/tmp/regression/fields-ws/workspace.json";
    const schedulePath = "/tmp/regression/fields-ws/schedule.json";
    const scheduleDoc = loadExampleSchedule("fields.schedule.json");
    const scheduleText = documentToJsonString(scheduleDoc);
    const flow = await mountWorkspaceApp({
      document: scheduleDoc,
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonicalText(scheduleText),
      waitForTaskLabel: "値あり",
      prepareFlow: (f) => seedFieldsWorkspaceOnFlow(f, wsPath, schedulePath),
    });

    const settings = await openSettingsSection("拡張項目");
    fireEvent.click(within(settings).getByRole("button", { name: "編集用の拡張を作る" }));
    await waitFor(() => {
      const call = flow.writeCalls.find(
        (c) => c.command === "create_workspace_editable_field_extension",
      );
      expect(call?.args?.relativeFileName).toBe("custom.fields.json");
    });
    await waitFor(() => {
      expect(flow.getDisk(wsPath)).toContain("editableFieldExtension");
    });
    emitWorkspaceReload(wsPath);
    await flushMicrotasks(80);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "設定" }), { key: "Escape" });
    const settingsReopened = await openSettingsSection("拡張項目");
    await waitFor(() => {
      expect(within(settingsReopened).getByText(/編集用: 新しい拡張/)).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("dialog", { name: "設定" })).queryByRole("button", {
        name: "編集用の拡張を作る",
      }),
    ).toBeNull();
    expect(
      within(screen.getByRole("dialog", { name: "設定" })).getByRole("button", {
        name: "項目を編集…",
      }),
    ).toBeEnabled();
    expect(localStorage.getItem("schedule-viewer/field-extensions/catalogs")).toBe(catalogsBefore);
    expect(within(screen.getByRole("dialog", { name: "設定" })).getByText(/ピン留め: サンプル追加項目/)).toBeInTheDocument();
  });

  it("TC-SET-10n: refuses a pinned plugin id and writes only the editable path", async () => {
    const wsPath = "/tmp/regression/fields-editable/workspace.json";
    const schedulePath = "/tmp/regression/fields-editable/schedule.json";
    const editablePath = "/tmp/regression/fields-editable/custom.fields.json";
    const pinnedPath = "/tmp/regression/fields-editable/sample.fields.json";
    const scheduleDoc = loadExampleSchedule("fields.schedule.json");
    const scheduleText = documentToJsonString(scheduleDoc);
    const flow = await mountWorkspaceApp({
      document: scheduleDoc,
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonicalText(scheduleText),
      waitForTaskLabel: "値あり",
      prepareFlow: (f) =>
        seedFieldsWorkspaceOnFlow(f, wsPath, schedulePath, {
          editableRelative: "custom.fields.json",
          editableBody: readExampleText("fields/sample.fields.json").replace(
            '"id": "sample"',
            '"id": "custom"',
          ),
        }),
    });

    const settings = await openSettingsSection("拡張項目");
    const editBtn = await waitFor(() =>
      within(settings).getByRole("button", { name: "項目を編集…" }),
    );
    fireEvent.click(editBtn);
    const overlay = await screen.findByRole("dialog", { name: "拡張項目の項目を編集" });
    const pinnedBefore = flow.getDisk(pinnedPath) ?? "";
    const idField = within(overlay).getByLabelText("プラグイン ID");
    fireEvent.change(idField, { target: { value: "sample" } });
    fireEvent.click(within(overlay).getByRole("button", { name: "保存" }));
    expect(
      await within(overlay).findByText(
        "ピン留めの拡張と同じプラグイン ID には保存できません。",
      ),
    ).toBeInTheDocument();
    const writesBefore = flow.writeCalls.filter(
      (c) => c.command === "write_field_extension_at_path",
    ).length;
    fireEvent.change(within(overlay).getByLabelText("名前"), {
      target: { value: "別名項目" },
    });
    fireEvent.change(idField, { target: { value: "custom" } });
    fireEvent.click(within(overlay).getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(flow.writeCalls.filter((c) => c.command === "write_field_extension_at_path").length).toBe(
        writesBefore + 1,
      );
    });
    const writeCall = flow.writeCalls
      .filter((c) => c.command === "write_field_extension_at_path")
      .at(-1);
    expect(writeCall?.args?.path).toBe(editablePath);
    expect(flow.getDisk(pinnedPath)).toBe(pinnedBefore);
  });

  it("TC-SET-10o: cancel keeps the editable extension and confirm removes it from settings", async () => {
    const wsPath = "/tmp/regression/fields-delete/workspace.json";
    const schedulePath = "/tmp/regression/fields-delete/schedule.json";
    const editablePath = "/tmp/regression/fields-delete/custom.fields.json";
    let customBody = readExampleText("fields/sample.fields.json");
    customBody = customBody
      .replace('"id": "sample"', '"id": "custom"')
      .replace('"name": "サンプル追加項目"', '"name": "編集用拡張"');
    customBody = JSON.stringify({
      ...JSON.parse(customBody),
      fields: [
        {
          id: "hold",
          name: "残す項目",
          type: "text",
        },
      ],
    });
    const scheduleDoc = structuredClone(loadExampleSchedule("fields.schedule.json"));
    const task = scheduleDoc.categories[0]!.groups[0]!.tasks[0]!;
    task.fieldValues = { ...task.fieldValues, custom_hold: "残す値" };
    const scheduleText = documentToJsonString(scheduleDoc);
    const flow = await mountWorkspaceApp({
      document: scheduleDoc,
      workspacePath: wsPath,
      schedulePath,
      scheduleContents: canonicalText(scheduleText),
      waitForTaskLabel: "値あり",
      prepareFlow: (f) =>
        seedFieldsWorkspaceOnFlow(f, wsPath, schedulePath, {
          editableRelative: "custom.fields.json",
          editableBody: customBody,
        }),
    });

    fireEvent.click(screen.getByText("値あり"));
    expect(screen.getByDisplayValue("残す値")).toBeInTheDocument();

    const settings = await openSettingsSection("拡張項目");
    const deleteBtn = within(settings).getByRole("button", { name: "消す" });
    const deletesBefore = flow.writeCalls.filter(
      (c) => c.command === "delete_workspace_editable_field_extension",
    ).length;
    fireEvent.click(deleteBtn);
    const confirm = await screen.findByRole("alertdialog", {}, { timeout: 4000 });
    fireEvent.click(within(confirm).getByRole("button", { name: "やめる" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(
      flow.writeCalls.filter((c) => c.command === "delete_workspace_editable_field_extension").length,
    ).toBe(deletesBefore);
    expect(within(screen.getByRole("dialog", { name: "設定" })).getByText(/編集用:/)).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    const confirm2 = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm2).getByRole("button", { name: "消す" }));
    await waitFor(() => {
      expect(
        flow.writeCalls.filter((c) => c.command === "delete_workspace_editable_field_extension").length,
      ).toBe(deletesBefore + 1);
    });
    await waitFor(() => {
      expect(within(screen.getByRole("dialog", { name: "設定" })).getByText(/編集用: 未作成/)).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("dialog", { name: "設定" })).getByRole("button", {
        name: "編集用の拡張を作る",
      }),
    ).toBeEnabled();
    expect(flow.getDisk(editablePath)).toBeUndefined();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "設定" }), { key: "Escape" });
    expect(screen.getByText("未登録の追加項目")).toBeInTheDocument();
    expect(screen.getByText("残す値")).toBeInTheDocument();
  });

  it("TC-FILE-07g: keep local then 未保存 opens the diff against the file", async () => {
    const schedulePath = "/tmp/regression/file-07g/plan.json";
    const scheduleText = readRegressionText("smoke.schedule.json");
    const canonical = canonicalText(scheduleText);
    const { flow, document } = await mountApp({ path: schedulePath, contents: canonical });
    flow.setDisk(schedulePath, canonical);

    const design = document.categories[0]?.groups[0]?.tasks.find((t) => t.name === "設計");
    if (!design) throw new Error("設計 missing");
    fireEvent.click(screen.getByText("設計"));
    const end = screen.getByLabelText("終了");
    fireEvent.change(end, { target: { value: "2026-04-12" } });
    await waitFor(() => expect(end).toHaveValue("2026-04-12"));

    const disk = cloneWithTaskEnd(document, design.id, "2026-04-11");
    flow.setDisk(schedulePath, documentToJsonString(disk));
    flow.queuePoll(pollJson(disk));
    await waitForNextPoll();
    await settleAfterPoll();
    const dialog = await screen.findByRole("dialog", { name: "ファイルが更新されています" });
    fireEvent.click(within(dialog).getByRole("button", { name: "画面の編集を残す" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "ファイルが更新されています" })).toBeNull(),
    );

    const user = userEvent.setup();
    const unsaved = await screen.findByRole("button", { name: "未保存" });
    await user.click(unsaved);
    const column = await screen.findByRole("region", { name: "差分" });
    await waitFor(() => {
      expect(column.textContent).toMatch(/2026-04-12/);
      expect(column.textContent).toMatch(/2026-04-11/);
    });
    expect(screen.queryByRole("dialog", { name: "差分" })).toBeNull();
  });
});

function seedFieldsWorkspaceOnFlow(
  flow: AppDomInvoke,
  wsPath: string,
  schedulePath: string,
  options: { editableRelative?: string; editableBody?: string } = {},
) {
  const ws: Record<string, unknown> = {
    schemaVersion: 1,
    schedule: "schedule.json",
    fieldExtensions: ["sample.fields.json"],
  };
  if (options.editableRelative) {
    ws.editableFieldExtension = options.editableRelative;
  }
  flow.setDisk(wsPath, `${JSON.stringify(ws, null, 2)}\n`);
  flow.setDisk(schedulePath, canonicalText(readExampleText("fields.schedule.json")));
  flow.setDisk(
    join(dirname(wsPath), "sample.fields.json"),
    readExampleText("fields/sample.fields.json"),
  );
  if (options.editableRelative && options.editableBody) {
    flow.setDisk(join(dirname(wsPath), options.editableRelative), options.editableBody);
  }
}

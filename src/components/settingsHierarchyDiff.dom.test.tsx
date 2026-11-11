import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleDocument } from "../model/types";
import type { WorkspaceMemberState, WorkspaceWindowBinding } from "../model/workspaceTypes";
import {
  loadExampleSchedule,
  loadRegressionSchedule,
  readRegressionText,
} from "../test/searchErrorKeysFixtures";
import { SettingsHierarchyDiffHarness } from "../test/settingsHierarchyDiffHarness";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ close: vi.fn() }),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: async () => "1.12.1",
}));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub;

function loadHierarchy(name: string): ScheduleDocument {
  return loadExampleSchedule(`hierarchy/${name}`);
}

function seedCatalogs(options: { fields?: boolean } = {}) {
  localStorage.clear();
  localStorage.setItem(
    "schedule-viewer/members/catalogs",
    JSON.stringify({ members: readRegressionText("members.json") }),
  );
  localStorage.setItem("schedule-viewer/members/selected", "members");
  localStorage.setItem(
    "schedule-viewer/statuses/catalogs",
    JSON.stringify({ statuses: readRegressionText("statuses.json") }),
  );
  localStorage.setItem("schedule-viewer/statuses/selected", "statuses");
  localStorage.setItem("schedule-viewer/statuses/builtin-seeded", "1");
  localStorage.setItem(
    "schedule-viewer/colors/catalogs",
    JSON.stringify({ colors: readRegressionText("colors.json") }),
  );
  localStorage.setItem("schedule-viewer/colors/selected", "colors");
  if (options.fields !== false) {
    localStorage.setItem(
      "schedule-viewer/field-extensions/catalogs",
      JSON.stringify({ sample: readRegressionText("fields.json") }),
    );
    localStorage.setItem(
      "schedule-viewer/field-extensions/selected",
      JSON.stringify(["sample"]),
    );
  }
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

function openMenu() {
  fireEvent.click(screen.getByTitle("メニュー"));
}

function renderFull() {
  return render(
    <SettingsHierarchyDiffHarness initialDocument={loadRegressionSchedule("full.schedule.json")} />,
  );
}

async function openMemberEditor() {
  openMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
  const settings = await screen.findByRole("dialog", { name: "設定" });
  fireEvent.click(within(settings).getByRole("button", { name: "メンバー" }));
  fireEvent.click(within(settings).getByRole("button", { name: "項目を編集…" }));
  const dialog = await screen.findByRole("dialog", { name: "メンバーの項目を編集" });
  fireEvent.click(within(dialog).getByRole("radio", { name: "members" }));
  await within(dialog).findByDisplayValue("田中");
  return dialog;
}

describe("settings, hierarchy, and diff chrome", () => {
  beforeEach(() => {
    seedCatalogs();
    installMatchMedia();
    Element.prototype.scrollIntoView = () => undefined;
    document.documentElement.removeAttribute("style");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
  });

  it("shows assignee, status, color name, and extension memo from the selected catalogs", async () => {
    renderFull();
    expect(await screen.findByText("田中、佐藤")).toBeInTheDocument();
    const design = screen.getByText("設計").closest(".sidebar-row");
    expect(design).toHaveTextContent("進行中");
    expect(design).toHaveStyle({ backgroundColor: "#FEF3C7" });
    fireEvent.click(screen.getByText("設計"));
    expect(screen.getByRole("combobox", { name: "色" })).toHaveTextContent("注力");
    fireEvent.click(screen.getByText("拡張あり"));
    const detail = screen.getByRole("complementary", { name: "タスクの詳細" });
    expect(within(detail).getByLabelText("メモ")).toHaveValue("回帰メモ");
    const extra = within(detail).getByRole("heading", { name: "追加項目" }).parentElement;
    expect(extra?.textContent ?? "").toMatch(/メモ[\s\S]*点数[\s\S]*消化率[\s\S]*確認日[\s\S]*区分/);
    expect(within(detail).getByRole("option", { name: "値なし" })).toBeInTheDocument();
    const kind = within(detail).getByLabelText("区分");
    expect([...kind.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "値なし",
      "内製",
      "外注",
    ]);
    expect(within(detail).getByLabelText("消化率").closest(".detail-number-line")).toHaveTextContent("%");
    expect(within(detail).getByRole("option", { name: "内製" })).toBeInTheDocument();
    expect(within(detail).getByRole("option", { name: "外注" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("やること付き"));
    expect(screen.getByDisplayValue("下書き")).toBeInTheDocument();
    expect(screen.getByDisplayValue("確認")).toBeInTheDocument();
  });

  it("keeps the member editor open and shows the saved display name on the rows", async () => {
    renderFull();
    await screen.findByText("田中");
    const dialog = await openMemberEditor();
    fireEvent.change(within(dialog).getByDisplayValue("田中"), {
      target: { value: "田中改" },
    });
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "保存" })).toBeEnabled();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(screen.getByText("設計").closest(".sidebar-row")).toHaveTextContent("田中改");
      expect(screen.getByText("調査").closest(".sidebar-row")).toHaveTextContent("田中改");
    });
    expect(screen.getByRole("dialog", { name: "メンバーの項目を編集" })).toBeInTheDocument();
    expect(localStorage.getItem("schedule-viewer/members/catalogs")).toContain("田中改");
  });

  it("keeps the status editor open and shows the saved status name", async () => {
    renderFull();
    await screen.findByText("進行中");
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.click(within(settings).getByRole("button", { name: "ステータス" }));
    fireEvent.click(within(settings).getByRole("button", { name: "項目を編集…" }));
    const dialog = await screen.findByRole("dialog", { name: "ステータス一覧の項目を編集" });
    fireEvent.click(within(dialog).getByRole("radio", { name: "statuses" }));
    await within(dialog).findByDisplayValue("進行中");
    fireEvent.change(within(dialog).getByDisplayValue("進行中"), {
      target: { value: "進行" },
    });
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "保存" })).toBeEnabled();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(screen.getByText("設計").closest(".sidebar-row")).toHaveTextContent("進行");
    });
    expect(screen.getByRole("dialog", { name: "ステータス一覧の項目を編集" })).toBeInTheDocument();
  });

  it("keeps the row fill bound to the renamed color", async () => {
    renderFull();
    const design = () => screen.getByText("設計").closest(".sidebar-row");
    await waitFor(() => {
      expect(design()).toHaveStyle({ backgroundColor: "#FEF3C7" });
    });
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.click(within(settings).getByRole("button", { name: "色" }));
    fireEvent.click(within(settings).getByRole("button", { name: "項目を編集…" }));
    const dialog = await screen.findByRole("dialog", { name: "色の一覧の項目を編集" });
    fireEvent.click(within(dialog).getByRole("radio", { name: "colors" }));
    await within(dialog).findByDisplayValue("注力");
    fireEvent.change(within(dialog).getByDisplayValue("注力"), {
      target: { value: "注力改" },
    });
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "保存" })).toBeEnabled();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(screen.getByText("設計").closest(".sidebar-row")).toHaveStyle({
        backgroundColor: "#FEF3C7",
      });
    });
    fireEvent.click(screen.getByText("設計"));
    expect(screen.getByRole("combobox", { name: "色" })).toHaveTextContent("注力改");
    expect(screen.getByRole("dialog", { name: "色の一覧の項目を編集" })).toBeInTheDocument();
  });

  it("closes catalog editors on external reload and leaves the draft out of storage", async () => {
    const original = loadRegressionSchedule("full.schedule.json");
    const reloaded = structuredClone(original);
    const survey = reloaded.categories[0]?.groups[0]?.tasks[0];
    if (survey == null) throw new Error("調査がありません");
    survey.end = "2026-04-02";
    const view = render(
      <SettingsHierarchyDiffHarness initialDocument={original} />,
    );
    await screen.findByText("田中");
    const dialog = await openMemberEditor();
    fireEvent.change(within(dialog).getByDisplayValue("田中"), {
      target: { value: "下書き名" },
    });
    fireEvent.click(screen.getByText("調査"));
    view.rerender(
      <SettingsHierarchyDiffHarness initialDocument={reloaded} externalReload />,
    );
    fireEvent.click(screen.getByRole("button", { name: "読み直す" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "メンバーの項目を編集" })).toBeNull();
    });
    expect(localStorage.getItem("schedule-viewer/members/catalogs")).not.toContain("下書き名");
    expect(localStorage.getItem("schedule-viewer/members/catalogs")).toContain("田中");
    expect(screen.getByLabelText("終了")).toHaveValue("2026-04-02");
  });

  it("hides the member editor when workspace members cannot be read", async () => {
    const binding: WorkspaceWindowBinding = {
      workspacePath: "/proj/client/workspace.json",
      document: { schemaVersion: 1, schedule: "plan.json" },
      resolved: {
        schedulePath: "/proj/client/plan.json",
        membersPath: "/proj/client/members.json",
        calendarPath: null,
        statusesPath: null,
        colorsPath: null,
        fieldExtensionPaths: [],
        editableFieldExtensionPath: null,
      },
      members: { kind: "error", message: "メンバーのファイルを読めません。" },
      calendar: { kind: "unset" },
      statuses: { kind: "unset" },
      colors: { kind: "unset" },
      fieldExtensions: { kind: "unset" },
      editableFieldExtension: { kind: "unset" },
    };
    render(
      <SettingsHierarchyDiffHarness
        initialDocument={loadRegressionSchedule("full.schedule.json")}
        workspaceBinding={binding}
      />,
    );
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.click(within(settings).getByRole("button", { name: "メンバー" }));
    expect(within(settings).queryByRole("button", { name: "項目を編集…" })).toBeNull();
    expect(within(settings).getByRole("alert")).toHaveTextContent("メンバーのファイルを読めません。");
  });

  it("rejects a blank task name and leaves the task unchanged", async () => {
    renderFull();
    fireEvent.click(await screen.findByText("調査"));
    const name = screen.getByLabelText("タスク名");
    fireEvent.change(name, { target: { value: "" } });
    fireEvent.blur(name);
    expect(await screen.findByRole("alert")).toHaveTextContent("タスク名を入力してください");
    expect(screen.getByText("調査")).toBeInTheDocument();
  });

  it("shows unregistered field values as read-only without a catalog", async () => {
    localStorage.removeItem("schedule-viewer/field-extensions/catalogs");
    localStorage.removeItem("schedule-viewer/field-extensions/selected");
    renderFull();
    fireEvent.click(await screen.findByText("拡張あり"));
    expect(screen.getByText("未登録の追加項目")).toBeInTheDocument();
    expect(screen.getByText("sample_memo")).toBeInTheDocument();
    expect(screen.getByText("回帰メモ")).toBeInTheDocument();
    expect(screen.queryByLabelText("メモ")).toBeNull();
  });

  it("hides delete until a task is selected", async () => {
    renderFull();
    expect(screen.queryByRole("button", { name: "削除" })).toBeNull();
    fireEvent.click(await screen.findByText("調査"));
    expect(screen.getByRole("button", { name: "削除" })).toBeEnabled();
  });

  it("shows the browser skill note, the eight skill names, and a disabled install button", async () => {
    renderFull();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.click(within(settings).getByRole("button", { name: "JSON作成スキルを置く" }));
    expect(within(settings).getByText(/この操作はデスクトップ版でのみ使えます/)).toBeInTheDocument();
    expect(within(settings).getByText(/write-schedule/)).toHaveTextContent("write-members");
    expect(within(settings).getByText(/write-schedule/)).toHaveTextContent("write-calendar");
    expect(within(settings).getByText(/write-schedule/)).toHaveTextContent("write-workspace");
    expect(within(settings).getByText(/write-schedule/)).toHaveTextContent("write-fields");
    expect(within(settings).getByText(/write-schedule/)).toHaveTextContent("write-colors");
    expect(within(settings).getByText(/write-schedule/)).toHaveTextContent("schedule-talk");
    expect(within(settings).getByText(/write-schedule/)).toHaveTextContent("how-to");
    expect(within(settings).getByText(/の8つをまとめて置きます/)).toBeInTheDocument();
    expect(within(settings).getByRole("button", { name: "置く" })).toBeDisabled();
    expect(within(settings).getByRole("button", { name: "外す" })).toBeDisabled();
  });

  it("shows the package version and omits the updates section in the browser", async () => {
    renderFull();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
    const settings = await screen.findByRole("dialog", { name: "設定" });
    expect(within(settings).getByText("バージョン 1.12.1")).toBeInTheDocument();
    expect(within(settings).queryByRole("button", { name: "更新" })).toBeNull();
  });

  it("stores the display scale and applies it as --s", async () => {
    renderFull();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.change(within(settings).getByLabelText("表示サイズ"), { target: { value: "2" } });
    expect(localStorage.getItem("schedule-viewer/display-scale")).toBe("2");
    expect(document.documentElement.style.getPropertyValue("--s")).toBe("2");
  });

  it("stores dark and clears the key when returning to the system scheme", async () => {
    renderFull();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /設定/ }));
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.change(within(settings).getByLabelText("配色"), { target: { value: "dark" } });
    expect(localStorage.getItem("schedule-viewer/color-scheme")).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--surface")).toBe("#23242c");
    fireEvent.change(within(settings).getByLabelText("配色"), { target: { value: "system" } });
    expect(localStorage.getItem("schedule-viewer/color-scheme")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--surface")).toBe("#ffffff");
  });

  it("shows the level names above an aligned outline", () => {
    render(
      <SettingsHierarchyDiffHarness initialDocument={loadHierarchy("levels-5.schedule.json")} />,
    );
    expect(screen.getByText("事業 / 工程 / 機能 / 作業 / タスク")).toBeInTheDocument();
  });

  it("shows the mismatch message and hides add-heading when the outline does not match", () => {
    const aligned = loadHierarchy("levels-5.schedule.json");
    const mismatched = { ...aligned, levels: aligned.levels?.slice(0, 2) };
    render(<SettingsHierarchyDiffHarness initialDocument={mismatched} />);
    expect(screen.getByText("階層の定義と入れ子の数が違います。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "追加の種類" }));
    expect(screen.queryByRole("menuitem", { name: "見出しを追加" })).toBeNull();
  });

  it("adds an outline heading from the context menu", () => {
    render(
      <SettingsHierarchyDiffHarness initialDocument={loadHierarchy("levels-5.schedule.json")} />,
    );
    fireEvent.contextMenu(screen.getByText("事業甲"));
    fireEvent.click(screen.getByRole("menuitem", { name: "下に事業を追加" }));
    const dialog = screen.getByRole("dialog", { name: "下に事業を追加" });
    fireEvent.change(within(dialog).getByLabelText("名前"), { target: { value: "回帰の見出し" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "追加" }));
    expect(screen.getByText("回帰の見出し")).toBeInTheDocument();
  });

  it("refuses apply when a meaning is empty and drops a name that was not applied", () => {
    render(
      <SettingsHierarchyDiffHarness initialDocument={loadHierarchy("levels-3.schedule.json")} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const dialog = screen.getByRole("dialog", { name: "階層" });
    const meanings = within(dialog).getAllByLabelText("意味");
    const names = within(dialog).getAllByLabelText("名前");
    fireEvent.change(meanings[0], { target: { value: "" } });
    fireEvent.change(names[0], { target: { value: "捨てる名前" } });
    expect(within(dialog).getByRole("button", { name: "適用" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "閉じる" }));
    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const again = screen.getByRole("dialog", { name: "階層" });
    expect(within(again).getAllByLabelText("意味")[0]).toHaveValue("工程の意味（画面には出さない）。");
    expect(within(again).getAllByLabelText("名前")[0]).toHaveValue("工程");
  });

  it("keeps an applied instruction when the hierarchy dialog is opened again", () => {
    render(
      <SettingsHierarchyDiffHarness initialDocument={loadHierarchy("levels-3.schedule.json")} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const dialog = screen.getByRole("dialog", { name: "階層" });
    fireEvent.change(within(dialog).getAllByLabelText("指示")[0], {
      target: { value: "守ること" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "適用" }));
    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    expect(within(screen.getByRole("dialog", { name: "階層" })).getAllByLabelText("指示")[0]).toHaveValue(
      "守ること",
    );
  });

  it("drops a blank instruction when the hierarchy dialog is applied", () => {
    render(
      <SettingsHierarchyDiffHarness initialDocument={loadHierarchy("levels-3.schedule.json")} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const dialog = screen.getByRole("dialog", { name: "階層" });
    fireEvent.change(within(dialog).getAllByLabelText("指示")[0], {
      target: { value: "   " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "適用" }));
    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    expect(within(screen.getByRole("dialog", { name: "階層" })).getAllByLabelText("指示")[0]).toHaveValue("");
  });

  it("shows the old and new end dates in the diff column", () => {
    const doc = loadRegressionSchedule("long.schedule.json");
    render(
      <SettingsHierarchyDiffHarness initialDocument={doc} initialBaseline={doc} />,
    );
    fireEvent.click(screen.getByText("行01"));
    fireEvent.change(screen.getByLabelText("終了"), { target: { value: "2026-04-03" } });
    fireEvent.click(screen.getByRole("button", { name: "未保存" }));
    const column = screen.getByRole("region", { name: "差分" });
    expect(column).toHaveTextContent("2026-04-02 → 2026-04-03");
  });

  it("closes the empty diff column with the close button", () => {
    render(
      <SettingsHierarchyDiffHarness initialDocument={loadRegressionSchedule("long.schedule.json")} />,
    );
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /差分を表示/ }));
    const column = screen.getByRole("region", { name: "差分" });
    expect(column).toHaveTextContent("比べるファイルがありません");
    fireEvent.click(within(column).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("region", { name: "差分" })).toBeNull();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /差分を表示/ }));
    expect(screen.getByRole("region", { name: "差分" })).toHaveTextContent("比べるファイルがありません");
  });

  it("copies diff text to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const doc = loadRegressionSchedule("long.schedule.json");
    render(
      <SettingsHierarchyDiffHarness initialDocument={doc} initialBaseline={doc} />,
    );
    fireEvent.click(screen.getByText("行01"));
    fireEvent.change(screen.getByLabelText("終了"), { target: { value: "2026-04-03" } });
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /差分を表示/ }));
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /差分をコピー/ }));
    await screen.findByText("差分をコピーしました");
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("2026-04-02 → 2026-04-03"));
  });

  it("TC-EDIT-04u: shows workspace-only assignee in the sidebar and detail", async () => {
    localStorage.removeItem("schedule-viewer/members/catalogs");
    localStorage.removeItem("schedule-viewer/members/selected");
    const doc = structuredClone(loadRegressionSchedule("smoke.schedule.json"));
    const design = doc.categories[0]?.groups[0]?.tasks.find((task) => task.name === "設計");
    if (!design) throw new Error("設計 task missing");
    design.assigneeIds = ["ws-only"];
    const members: WorkspaceMemberState = {
      kind: "loaded",
      label: "プロジェクトメンバー",
      members: [{ id: "ws-only", name: "設定ファイルの山田" }],
    };
    const binding: WorkspaceWindowBinding = {
      workspacePath: "/proj/client/workspace.json",
      document: {
        schemaVersion: 1,
        schedule: "smoke.schedule.json",
        members: "team.members.json",
      },
      resolved: {
        schedulePath: "/proj/client/smoke.schedule.json",
        membersPath: "/proj/client/team.members.json",
        calendarPath: null,
        statusesPath: null,
        colorsPath: null,
        fieldExtensionPaths: [],
        editableFieldExtensionPath: null,
      },
      members,
      calendar: { kind: "unset" },
      statuses: { kind: "unset" },
      colors: { kind: "unset" },
      fieldExtensions: { kind: "unset" },
      editableFieldExtension: { kind: "unset" },
    };
    render(<SettingsHierarchyDiffHarness initialDocument={doc} workspaceBinding={binding} />);
    expect(await screen.findByText("設定ファイルの山田")).toBeInTheDocument();
    fireEvent.click(screen.getByText("設計"));
    expect(screen.getAllByText("設定ファイルの山田").length).toBeGreaterThanOrEqual(2);
  });
});

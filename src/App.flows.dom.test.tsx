import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROW_DENSITY_LS_KEY } from "./model/viewPreferences";
import { parseScheduleText } from "./model/scheduleFile";
import {
  expandSidebarUntilTask,
  installMatchMedia,
  mountApp,
  openCommandPalette,
  openMenu,
  pressKey,
  saveViaShortcut,
} from "./test/appDomMount";
import {
  installDomFlowPrereqs,
  seedRegressionCatalogs,
  TASK_DESIGN,
  TASK_SURVEY,
} from "./test/scheduleFileFlowTestEnv";
import type { ScheduleFileTauriInvoke } from "./test/scheduleFileFlowInvoke";
import { readRegressionText } from "./test/searchErrorKeysFixtures";

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

function canonicalText(text: string): string {
  const parsed = parseScheduleText(text);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.canonicalJson;
}

describe("App flows (Issue 548 coverage)", () => {
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
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  it("runs 保存 from the command palette after an edit", async () => {
    const path = "/tmp/flows/save/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    fireEvent.change(screen.getByLabelText("終了"), { target: { value: "2026-04-15" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "未保存" })).toBeInTheDocument());

    await openCommandPalette();
    const input = screen.getByPlaceholderText("コマンドを検索");
    fireEvent.change(input, { target: { value: "保存" } });
    fireEvent.click(screen.getByRole("option", { name: /^保存/ }));
    await waitFor(() => {
      expect(
        invoke.mock.calls.some(([cmd]) => cmd === "save_schedule_file" || cmd === "save_schedule_at_path"),
      ).toBe(true);
    });
  });

  it("opens JSON, shortcuts, and guide from the command palette", async () => {
    const path = "/tmp/flows/palette/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);

    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "JSON" },
    });
    fireEvent.click(screen.getByRole("option", { name: /JSON を表示/ }));
    expect(
      await screen.findByRole("dialog", { name: "現在のスケジュールJSON" }),
    ).toBeInTheDocument();
    pressKey(screen.getByRole("dialog", { name: "現在のスケジュールJSON" }), {
      key: "Escape",
    });

    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "ショートカット" },
    });
    fireEvent.click(screen.getByRole("option", { name: /ショートカット一覧/ }));
    expect(await screen.findByRole("dialog", { name: "ショートカット" })).toBeInTheDocument();
    pressKey(screen.getByRole("dialog", { name: "ショートカット" }), { key: "Escape" });

    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "案内" },
    });
    fireEvent.click(screen.getByRole("option", { name: /操作の案内/ }));
    expect(await screen.findByRole("dialog", { name: "操作の案内" })).toBeInTheDocument();
  });

  it("cancels タスク追加 without changing the row count", async () => {
    const path = "/tmp/flows/add/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    const before = document.querySelectorAll(".sidebar-row.task").length;
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    const dialog = await screen.findByRole("dialog", { name: "タスク追加" });
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "タスク追加" })).toBeNull());
    expect(document.querySelectorAll(".sidebar-row.task").length).toBe(before);
  });

  it("deletes a task after confirm and restores it with undo", async () => {
    const path = "/tmp/flows/delete/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    const confirm = await screen.findByRole("dialog", { name: "タスク削除" });
    fireEvent.click(within(confirm).getByRole("button", { name: "削除" }));
    await waitFor(() => expect(screen.queryByText("設計")).toBeNull());

    pressKey(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(screen.getByText("設計")).toBeInTheDocument());
  });

  it("shows bulk edit then one selection discards the bulk panel", async () => {
    const path = "/tmp/flows/bulk/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    await expandSidebarUntilTask("設計");
    const surveyRow = document.querySelector(`[data-task-id="${TASK_SURVEY}"]`);
    const designRow = document.querySelector(`[data-task-id="${TASK_DESIGN}"]`);
    if (!(surveyRow instanceof HTMLElement) || !(designRow instanceof HTMLElement)) {
      throw new Error("task rows missing");
    }
    fireEvent.click(surveyRow);
    fireEvent.click(designRow, { ctrlKey: true });
    await waitFor(() => expect(screen.getByText("2件を選択中")).toBeInTheDocument());
    fireEvent.click(surveyRow);
    await waitFor(() => expect(screen.queryByText("2件を選択中")).toBeNull());
  });

  it("stores compact row density and applies 26px task row height", async () => {
    const path = "/tmp/flows/density/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    pressKey(window, { key: ",", ctrlKey: true });
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.click(within(settings).getByRole("button", { name: "表示" }));
    const densitySelect = within(settings).getByDisplayValue("標準");
    fireEvent.change(densitySelect, { target: { value: "compact" } });
    await waitFor(() =>
      expect(localStorage.getItem(ROW_DENSITY_LS_KEY)).toBe("compact"),
    );
    pressKey(screen.getByRole("dialog", { name: "設定" }), { key: "Escape" });
    await expandSidebarUntilTask("設計");
    const designRow = document.querySelector(`[data-task-id="${TASK_DESIGN}"]`);
    if (!(designRow instanceof HTMLElement)) {
      throw new Error("設計 row missing");
    }
    expect(designRow.style.height).toBe("26px");
  });

  it("opens the shortcuts dialog from the status bar", async () => {
    const path = "/tmp/flows/status/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByRole("button", { name: "? ショートカット" }));
    expect(
      await screen.findByRole("dialog", { name: "ショートカット" }),
    ).toBeInTheDocument();
  });

  it("keeps the schedule date while redo is pressed with settings open", async () => {
    const path = "/tmp/flows/redo-settings/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    const end = screen.getByLabelText("終了");
    const before = (end as HTMLInputElement).value;
    fireEvent.change(end, { target: { value: "2026-05-01" } });
    fireEvent.blur(end);
    await waitFor(() => expect(end).toHaveValue("2026-05-01"));
    pressKey(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(end).toHaveValue(before));
    pressKey(window, { key: ",", ctrlKey: true });
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.click(within(settings).getByRole("button", { name: "表示" }));
    pressKey(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(end).toHaveValue(before);
    pressKey(screen.getByRole("dialog", { name: "設定" }), { key: "Escape" });
  });

  it("applies hierarchy rename and saves serialized outline keys", async () => {
    const path = "/tmp/flows/hierarchy/plan.json";
    const text = readFileSync(join(repoRoot, "examples/hierarchy/levels-3.schedule.json"), "utf8");
    const canonical = canonicalText(text);
    await mountApp({ path, contents: canonical }, invoke);

    fireEvent.click(screen.getByRole("button", { name: "階層の名前、意味、指示" }));
    const hierarchy = await screen.findByRole("dialog", { name: "階層" });
    fireEvent.change(within(hierarchy).getAllByLabelText("名前")[1]!, {
      target: { value: "グループ改" },
    });
    fireEvent.click(within(hierarchy).getByRole("button", { name: "適用" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "階層" })).toBeNull());
    saveViaShortcut();
    await waitFor(() => {
      expect(
        invoke.mock.calls.filter(
          ([cmd]) => cmd === "save_schedule_file" || cmd === "save_schedule_at_path",
        ).length,
      ).toBeGreaterThan(0);
    });
    const saveCall = invoke.mock.calls.find(
      ([cmd]) => cmd === "save_schedule_file" || cmd === "save_schedule_at_path",
    );
    expect(String(saveCall?.[1]?.contents)).toContain("グループ改");
  });

  it("writes a tag edit into saved JSON from the detail panel", async () => {
    const path = "/tmp/flows/tags/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    const tagInput = screen.getByPlaceholderText("タグを入力して Enter");
    fireEvent.change(tagInput, { target: { value: "回帰タグ" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    await waitFor(() => expect(screen.getByText("回帰タグ")).toBeInTheDocument());
    saveViaShortcut();
    await waitFor(() => {
      expect(
        invoke.mock.calls.some(([cmd]) => cmd === "save_schedule_file" || cmd === "save_schedule_at_path"),
      ).toBe(true);
    });
    const saveCall = invoke.mock.calls.find(
      ([cmd]) => cmd === "save_schedule_file" || cmd === "save_schedule_at_path",
    );
    expect(String(saveCall?.[1]?.contents)).toContain("回帰タグ");
  });

  it("shows no-update UI when the updater returns null", async () => {
    const path = "/tmp/flows/updater/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    openMenu();
    const menu = await screen.findByRole("menu");
    fireEvent.click(within(menu).getByRole("menuitem", { name: /更新を確認/ }));
    await waitFor(() =>
      expect(screen.getByText(/この版が最新です/)).toBeInTheDocument(),
    );
  });

  it("opens the diff column from the command palette after an edit", async () => {
    const path = "/tmp/flows/diff-palette/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    fireEvent.change(screen.getByLabelText("終了"), { target: { value: "2026-04-20" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "未保存" })).toBeInTheDocument());
    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "差分を表示" },
    });
    fireEvent.click(screen.getByRole("option", { name: /差分を表示/ }));
    expect(await screen.findByRole("region", { name: "差分" })).toBeInTheDocument();
  });

  it("toggles the filter panel from the toolbar", async () => {
    const path = "/tmp/flows/filter/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    const filter = screen.getByRole("button", { name: /^絞り込み/ });
    expect(filter.getAttribute("aria-expanded")).not.toBe("true");
    fireEvent.click(filter);
    await waitFor(() => expect(filter).toHaveAttribute("aria-expanded", "true"));
    fireEvent.click(filter);
    await waitFor(() => expect(filter).toHaveAttribute("aria-expanded", "false"));
  });

  it("undoes an edit from the command palette", async () => {
    const path = "/tmp/flows/undo-palette/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    const end = screen.getByLabelText("終了");
    const before = (end as HTMLInputElement).value;
    fireEvent.change(end, { target: { value: "2026-05-02" } });
    fireEvent.blur(end);
    await waitFor(() => expect(end).toHaveValue("2026-05-02"));
    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "取り消し" },
    });
    fireEvent.click(screen.getByRole("option", { name: /^取り消し/ }));
    await waitFor(() => expect(end).toHaveValue(before));
  });

  it("shows lineage for the selected task", async () => {
    const path = "/tmp/flows/lineage/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    fireEvent.click(screen.getByRole("button", { name: "系統" }));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /系統: 設計/ }).length).toBeGreaterThan(0),
    );
  });

  it("switches the timeline tier from the toolbar", async () => {
    const path = "/tmp/flows/tier/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByRole("button", { name: "週" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "週" })).toHaveAttribute("aria-pressed", "true"),
    );
    fireEvent.click(screen.getByRole("button", { name: "月" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "月" })).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("adds a milestone from the split add menu", async () => {
    const path = "/tmp/flows/milestone/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByRole("button", { name: "追加の種類" }));
    const menu = await screen.findByRole("menu");
    fireEvent.click(within(menu).getByRole("menuitem", { name: /マイルストンを追加/ }));
    expect(await screen.findByRole("dialog", { name: "マイルストン追加" })).toBeInTheDocument();
  });

  it("duplicates the selected task from the command palette", async () => {
    const path = "/tmp/flows/duplicate/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "複製" },
    });
    fireEvent.click(screen.getByRole("option", { name: /複製/ }));
    expect(await screen.findByRole("dialog", { name: "タスクを複製" })).toBeInTheDocument();
  });

  it("increases display scale from settings", async () => {
    const path = "/tmp/flows/scale/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    pressKey(window, { key: ",", ctrlKey: true });
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.change(within(settings).getByLabelText("表示サイズ"), {
      target: { value: "1.25" },
    });
    expect(localStorage.getItem("schedule-viewer/display-scale")).toBe("1.25");
    pressKey(settings, { key: "Escape" });
  });

  it("opens the HTML export dialog from the menu", async () => {
    const path = "/tmp/flows/export-html/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    openMenu();
    const menu = await screen.findByRole("menu");
    fireEvent.click(within(menu).getByRole("menuitem", { name: /^書き出し/ }));
    expect(await screen.findByRole("dialog", { name: "書き出し" })).toBeInTheDocument();
  });

  it("opens JSON from the file menu", async () => {
    const path = "/tmp/flows/menu-json/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    openMenu();
    const menu = await screen.findByRole("menu");
    fireEvent.click(within(menu).getByRole("menuitem", { name: /JSON を表示/ }));
    expect(
      await screen.findByRole("dialog", { name: "現在のスケジュールJSON" }),
    ).toBeInTheDocument();
  });

  it("focuses the detail name field from the edit palette command", async () => {
    const path = "/tmp/flows/edit-palette/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "編集" },
    });
    fireEvent.click(screen.getByRole("option", { name: /^編集/ }));
    const nameInput = await screen.findByLabelText("タスク名");
    await waitFor(() => expect(nameInput).toHaveFocus());
  });

  it("steps display scale in from the keyboard shortcut", async () => {
    const path = "/tmp/flows/scale-keys/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    localStorage.setItem("schedule-viewer/display-scale", "1");
    await mountApp({ path, contents: canonical }, invoke);
    pressKey(window, { key: "=", ctrlKey: true });
    await waitFor(() =>
      expect(localStorage.getItem("schedule-viewer/display-scale")).toBe("1.25"),
    );
  });

  it("adds a TODO line and persists it on save", async () => {
    const path = "/tmp/flows/todo/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    fireEvent.click(screen.getByRole("button", { name: "TODOを追加" }));
    const todoInput = await screen.findByLabelText("新しいTODOの文");
    fireEvent.change(todoInput, { target: { value: "回帰TODO" } });
    fireEvent.blur(todoInput);
    await waitFor(() => expect(screen.getByDisplayValue("回帰TODO")).toBeInTheDocument());
    saveViaShortcut();
    await waitFor(() => {
      expect(
        invoke.mock.calls.some(
          ([cmd]) => cmd === "save_schedule_file" || cmd === "save_schedule_at_path",
        ),
      ).toBe(true);
    });
    const saveCall = invoke.mock.calls.find(
      ([cmd]) => cmd === "save_schedule_file" || cmd === "save_schedule_at_path",
    );
    expect(String(saveCall?.[1]?.contents)).toContain("回帰TODO");
  });

  it("opens the task note from the command palette", async () => {
    const path = "/tmp/flows/note/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "ノート" },
    });
    fireEvent.click(screen.getByRole("option", { name: /^ノート$/ }));
    expect(await screen.findByLabelText("ノート")).toBeInTheDocument();
  });

  it("enters link mode from the command palette", async () => {
    const path = "/tmp/flows/link/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "線を引く" },
    });
    fireEvent.click(screen.getByRole("option", { name: /^線を引く/ }));
    await waitFor(() =>
      expect(
        screen.getByText(/次にクリックしたタスクを後続にします/),
      ).toBeInTheDocument(),
    );
  });

  it("steps display scale out from the keyboard shortcut", async () => {
    const path = "/tmp/flows/scale-out/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    localStorage.setItem("schedule-viewer/display-scale", "1.25");
    await mountApp({ path, contents: canonical }, invoke);
    pressKey(window, { key: "-", ctrlKey: true });
    await waitFor(() =>
      expect(localStorage.getItem("schedule-viewer/display-scale")).toBe("1"),
    );
  });

  it("runs redo from the command palette after an edit", async () => {
    const path = "/tmp/flows/redo-palette/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    const nameInput = screen.getByLabelText("タスク名");
    fireEvent.change(nameInput, { target: { value: "設計·一時" } });
    fireEvent.blur(nameInput);
    await waitFor(() => expect(screen.getByDisplayValue("設計·一時")).toBeInTheDocument());
    pressKey(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(screen.getByDisplayValue("設計")).toBeInTheDocument());
    await openCommandPalette();
    fireEvent.change(screen.getByPlaceholderText("コマンドを検索"), {
      target: { value: "やり直し" },
    });
    fireEvent.click(screen.getByRole("option", { name: /やり直し/ }));
    await waitFor(() => expect(screen.getByDisplayValue("設計·一時")).toBeInTheDocument());
  });

  it("opens the add-connection dialog from the detail panel", async () => {
    const path = "/tmp/flows/connection/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByText("設計"));
    fireEvent.click(screen.getByRole("button", { name: "足す" }));
    expect(
      await screen.findByRole("dialog", { name: "繋がりを足す" }),
    ).toBeInTheDocument();
  });

  it("filters tasks by a tag from the filter panel", async () => {
    const path = "/tmp/flows/filter-tag/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(screen.getByRole("button", { name: /^絞り込み/ }));
    const tagInput = await screen.findByRole("combobox", { name: "タグ" });
    fireEvent.change(tagInput, { target: { value: "回帰" } });
    const option = await screen.findByRole("option", { name: "回帰" });
    fireEvent.click(option);
    await waitFor(() => {
      const match = screen
        .getByText(/\d+件中\d+件を表示/)
        .textContent?.match(/(\d+)件中(\d+)件を表示/);
      expect(match).not.toBeNull();
      const total = Number(match![1]);
      const visible = Number(match![2]);
      expect(visible).toBeGreaterThan(0);
      expect(visible).toBeLessThan(total);
    });
  });

  it("stores dark color scheme from settings", async () => {
    const path = "/tmp/flows/scheme/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    pressKey(window, { key: ",", ctrlKey: true });
    const settings = await screen.findByRole("dialog", { name: "設定" });
    fireEvent.change(within(settings).getByLabelText("配色"), {
      target: { value: "dark" },
    });
    expect(localStorage.getItem("schedule-viewer/color-scheme")).toBe("dark");
    pressKey(settings, { key: "Escape" });
  });

  it("opens the hierarchy dialog from the toolbar", async () => {
    const path = "/tmp/flows/hierarchy-open/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    await mountApp({ path, contents: canonical }, invoke);
    fireEvent.click(
      screen.getByRole("button", { name: "階層の名前、意味、指示" }),
    );
    expect(await screen.findByRole("dialog", { name: "階層" })).toBeInTheDocument();
  });

  it("warns in the toast when export workspace skips unselected catalogs", async () => {
    const path = "/tmp/flows/export-app/plan.json";
    const canonical = canonicalText(readRegressionText("smoke.schedule.json"));
    localStorage.removeItem("schedule-viewer/members/selected");
    const { flow } = await mountApp({ path, contents: canonical }, invoke);
    const underlying = flow.invoke.bind(flow);
    invoke.mockImplementation(async (command, args) => {
      if (command === "export_workspace_bundle") return undefined;
      return underlying(command, args);
    });
    openMenu();
    const menu = await screen.findByRole("menu");
    fireEvent.click(
      within(menu).getByRole("menuitem", {
        name: /設定ファイルを新しいフォルダへ書き出す/,
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/メンバーは未選択のため書いていません/)).toBeInTheDocument(),
    );
  });
});

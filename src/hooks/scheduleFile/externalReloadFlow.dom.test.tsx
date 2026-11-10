import { createRef } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseScheduleText } from "../../model/scheduleFile";
import { documentToJsonString } from "../../model/serialize";
import type { RefObject } from "react";
import {
  ScheduleFileFlowHarness,
  type ScheduleFileFlowHandle,
} from "../../test/scheduleFileFlowHarness";
import { createSaveFlowEnv, FLOW_SCHEDULE_PATH, seedRegressionCatalogs } from "../../test/fileSaveFlowTestEnv";
import {
  advanceOnePoll,
  cloneWithTaskEnd,
  cloneWithTaskName,
  installDomFlowPrereqs,
  pollJson,
  TASK_DESIGN,
  TASK_SURVEY,
} from "../../test/scheduleFileFlowTestEnv";
import { loadRegressionSchedule, readRegressionText } from "../../test/searchErrorKeysFixtures";

const invoke = vi.hoisted(() => vi.fn());

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
  getVersion: async () => "1.4.1",
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => undefined),
}));

async function waitForStartupSettled() {
  await waitFor(() => {
    expect(screen.getByTestId("startup-settled")).toHaveTextContent("yes");
  });
}

async function mountWithOpenSaved() {
  const doc = loadRegressionSchedule("smoke.schedule.json");
  const docJson = documentToJsonString(doc);
  const flow = createSaveFlowEnv(doc);
  flow.setDisk(FLOW_SCHEDULE_PATH, docJson);
  invoke.mockImplementation(flow.invoke);
  let handle: ScheduleFileFlowHandle | null = null;
  const ref = {
    get current() {
      return handle;
    },
    set current(value: ScheduleFileFlowHandle | null) {
      handle = value;
    },
  } as RefObject<ScheduleFileFlowHandle>;
  flow.holdStartup();
  render(<ScheduleFileFlowHarness ref={ref} initialDocument={doc} />);
  await act(async () => {
    flow.resolveStartup({ path: null, sample: true, contents: null });
  });
  await waitForStartupSettled();
  await waitFor(() => expect(ref.current).not.toBeNull());
  await flushCatalogLoads();
  vi.useFakeTimers();
  await act(async () => {
    ref.current!.openSavedAtPath(FLOW_SCHEDULE_PATH, docJson);
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(ref.current?.getFilePath()).toBe(FLOW_SCHEDULE_PATH);
  return { flow, ref, doc };
}

async function settleAfterPoll() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  vi.useRealTimers();
}

async function waitForDialog(name: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await act(async () => {
      await Promise.resolve();
    });
    const hit = screen.queryByRole("dialog", { name });
    if (hit) return hit;
  }
  throw new Error(`missing dialog: ${name}`);
}

async function flushCatalogLoads() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await act(async () => {
      await Promise.resolve();
    });
    if (screen.getByTestId("members-settled").textContent === "yes") {
      return;
    }
  }
  throw new Error("catalog settings did not settle");
}

async function markScreenDirty(ref: RefObject<ScheduleFileFlowHandle>, taskId: string, name: string) {
  await act(async () => {
    ref.current?.renameTask(taskId, name);
  });
  expect(screen.getByTestId("survey-name")).toHaveTextContent(name);
  expect(screen.getByTestId("is-dirty")).toHaveTextContent("yes");
}

async function markScreenDirtyEnd(
  ref: RefObject<ScheduleFileFlowHandle>,
  taskId: string,
  end: string,
) {
  await act(async () => {
    ref.current?.setTaskEnd(taskId, end);
  });
  expect(screen.getByTestId("is-dirty")).toHaveTextContent("yes");
}

describe("external reload flow", () => {
  beforeEach(() => {
    installDomFlowPrereqs();
    seedRegressionCatalogs(readRegressionText);
    invoke.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  it("TC-SYNC-01: applies a clean disk change after one poll interval", async () => {
    const { flow, doc } = await mountWithOpenSaved();
    const updated = cloneWithTaskEnd(doc, TASK_SURVEY, "2026-04-05");
    flow.queuePoll(pollJson(updated));
    await advanceOnePoll();
    expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-05");
    expect(screen.getByText("ファイルを反映しました")).toBeInTheDocument();
    await settleAfterPoll();
  });

  it("TC-SYNC-01b: opens confirm when the screen is dirty and disk differs", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await markScreenDirty(ref, TASK_SURVEY, "調査rev");
    const updated = cloneWithTaskEnd(doc, TASK_DESIGN, "2026-04-10");
    flow.queuePoll(pollJson(updated));
    await advanceOnePoll();
    await settleAfterPoll();
    expect(
      await screen.findByRole("dialog", { name: "ファイルが更新されています" }),
    ).toBeInTheDocument();
  });

  it("TC-SYNC-01b: keep local edits and show the deferred reload banner", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await markScreenDirty(ref, TASK_SURVEY, "調査rev");
    flow.queuePoll(pollJson(cloneWithTaskEnd(doc, TASK_DESIGN, "2026-04-10")));
    await advanceOnePoll();
    await settleAfterPoll();
    const dialog = await screen.findByRole("dialog", {
      name: "ファイルが更新されています",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "画面の編集を残す" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ファイルが更新されています" })).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: "ファイルに更新あり — 確認する" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("design-end")).toHaveTextContent("2026-04-08");
  });

  it("TC-SYNC-01e: lists screen and file sections in the merge review", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await markScreenDirtyEnd(ref, TASK_SURVEY, "2026-04-04");
    const disk = cloneWithTaskEnd(doc, TASK_DESIGN, "2026-04-10");
    flow.queuePoll(pollJson(disk));
    await advanceOnePoll();
    await act(async () => {
      await Promise.resolve();
    });
    const dialog = screen.getByRole("dialog", {
      name: "ファイルが更新されています",
    });
    expect(
      within(dialog).getByRole("button", { name: "両方を画面へ反映" }),
    ).toBeInTheDocument();
  });

  it("TC-SYNC-01e2: merges screen and file edits and becomes dirty", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await markScreenDirtyEnd(ref, TASK_SURVEY, "2026-04-04");
    flow.queuePoll(pollJson(cloneWithTaskEnd(doc, TASK_DESIGN, "2026-04-10")));
    await advanceOnePoll();
    await act(async () => {
      await Promise.resolve();
    });
    const dialog = screen.getByRole("dialog", {
      name: "ファイルが更新されています",
    });
    vi.useRealTimers();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "両方を画面へ反映" }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-04");
    });
    expect(screen.getByTestId("design-end")).toHaveTextContent("2026-04-10");
    expect(screen.getByText("未保存")).toBeInTheDocument();
    expect(screen.getByTestId("merge-notice")).toHaveTextContent("yes");
  });

  it("TC-SYNC-01f: blocks merge when the same task conflicts", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await markScreenDirty(ref, TASK_SURVEY, "調査rev");
    flow.queuePoll(
      pollJson(cloneWithTaskEnd(cloneWithTaskName(doc, TASK_SURVEY, "調査"), TASK_SURVEY, "2026-04-08")),
    );
    await advanceOnePoll();
    await settleAfterPoll();
    const dialog = await screen.findByRole("dialog", {
      name: "ファイルが更新されています",
    });
    expect(
      within(dialog).queryByRole("button", { name: "両方を画面へ反映" }),
    ).toBeNull();
    expect(within(dialog).getByRole("button", { name: "依頼文をコピー" })).toBeInTheDocument();
  });

  it("TC-SYNC-01g: restoring the deferred banner on undo after merge", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await markScreenDirtyEnd(ref, TASK_SURVEY, "2026-04-04");
    const disk = cloneWithTaskEnd(doc, TASK_DESIGN, "2026-04-10");
    flow.queuePoll(pollJson(disk));
    await advanceOnePoll();
    await act(async () => {
      await Promise.resolve();
    });
    const mergeDialog = screen.getByRole("dialog", { name: "ファイルが更新されています" });
    vi.useRealTimers();
    fireEvent.click(
      within(mergeDialog).getByRole("button", { name: "両方を画面へ反映" }),
    );
    await waitFor(() => {
      expect(screen.getByText("未保存")).toBeInTheDocument();
    });
    await act(async () => {
      ref.current?.undo();
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "ファイルに更新あり — 確認する" }),
      ).toBeInTheDocument();
    });
  });

  it("TC-SYNC-01i: clears the deferred banner on redo after undo", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await markScreenDirtyEnd(ref, TASK_SURVEY, "2026-04-04");
    flow.queuePoll(pollJson(cloneWithTaskEnd(doc, TASK_DESIGN, "2026-04-10")));
    await advanceOnePoll();
    await act(async () => {
      await Promise.resolve();
    });
    const mergeDialog = screen.getByRole("dialog", { name: "ファイルが更新されています" });
    vi.useRealTimers();
    fireEvent.click(
      within(mergeDialog).getByRole("button", { name: "両方を画面へ反映" }),
    );
    await waitFor(() => {
      expect(screen.getByText("未保存")).toBeInTheDocument();
    });
    await act(async () => {
      ref.current?.undo();
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "ファイルに更新あり — 確認する" }),
      ).toBeInTheDocument();
    });
    await act(async () => {
      ref.current?.redo();
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "ファイルに更新あり — 確認する" }),
      ).toBeNull();
    });
  });

  it("TC-SYNC-01d: prompts to open a missing file after five failed polls", async () => {
    const { flow } = await mountWithOpenSaved();
    const baseInvoke = flow.invoke;
    for (let i = 0; i < 5; i += 1) {
      invoke.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
        if (command === "poll_schedule_file_update") {
          throw new Error("read failed");
        }
        return baseInvoke(command, args);
      });
      await advanceOnePoll();
    }
    await settleAfterPoll();
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("open_schedule_file", {
        initialDirectory: "/tmp/regression",
      });
    });
  });

  it(
    "TC-SET-02e: closes the member catalog editor on reload without writing the draft",
    async () => {
    seedRegressionCatalogs(readRegressionText);
    const { flow, ref, doc } = await mountWithOpenSaved();
    await act(async () => {
      ref.current?.openMemberEditor();
    });
    const dialog = await waitForDialog("メンバーの項目を編集");
    const nameField = within(dialog).getByDisplayValue("田中");
    fireEvent.change(nameField, { target: { value: "下書き名" } });
    flow.queuePoll(pollJson(cloneWithTaskEnd(doc, TASK_SURVEY, "2026-04-05")));
    await advanceOnePoll();
    await settleAfterPoll();
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "ファイルが更新されています" })).getByRole(
        "button",
        { name: "読み直す" },
      ),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "メンバーの項目を編集" })).toBeNull();
    });
    expect(localStorage.getItem("schedule-viewer/members/catalogs")).not.toContain("下書き名");
    expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-05");
    },
    20_000,
  );

  it("TC-SET-09d: closes the color catalog editor on reload without writing the draft", async () => {
    const { flow, ref, doc } = await mountWithOpenSaved();
    await act(async () => {
      ref.current?.openColorEditor();
    });
    const dialog = await waitForDialog("色の一覧の項目を編集");
    const nameField = within(dialog).getByDisplayValue("注力");
    fireEvent.change(nameField, { target: { value: "注力改" } });
    flow.queuePoll(pollJson(cloneWithTaskEnd(doc, TASK_SURVEY, "2026-04-05")));
    await advanceOnePoll();
    await settleAfterPoll();
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "ファイルが更新されています" })).getByRole(
        "button",
        { name: "読み直す" },
      ),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "色の一覧の項目を編集" })).toBeNull();
    });
    expect(localStorage.getItem("schedule-viewer/colors/catalogs")).not.toContain("注力改");
  });

  it(
    "TC-SET-10f: closes the field extension editor on reload without saving",
    async () => {
    localStorage.setItem(
      "schedule-viewer/field-extensions/catalogs",
      JSON.stringify({ sample: readRegressionText("fields.json") }),
    );
    localStorage.setItem(
      "schedule-viewer/field-extensions/selected",
      JSON.stringify(["sample"]),
    );
    const { flow, ref, doc } = await mountWithOpenSaved();
    await act(async () => {
      ref.current?.openFieldEditor();
    });
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await act(async () => {
        await Promise.resolve();
      });
      if (screen.queryByRole("heading", { name: "拡張項目" })) break;
    }
    expect(screen.getByRole("heading", { name: "拡張項目" })).toBeInTheDocument();
    const name = screen.getByDisplayValue("メモ");
    fireEvent.change(name, { target: { value: "下書き項目" } });
    flow.queuePoll(pollJson(cloneWithTaskEnd(doc, TASK_SURVEY, "2026-04-05")));
    await advanceOnePoll();
    await settleAfterPoll();
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "ファイルが更新されています" })).getByRole(
        "button",
        { name: "読み直す" },
      ),
    );
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "拡張項目" })).toBeNull();
    });
    expect(localStorage.getItem("schedule-viewer/field-extensions/catalogs")).not.toContain(
      "下書き項目",
    );
    },
    15_000,
  );
});

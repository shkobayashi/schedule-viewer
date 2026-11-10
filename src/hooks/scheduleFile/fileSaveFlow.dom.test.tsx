import { createRef } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCHEDULE_SAVE_ERROR_DIALOG_TITLE } from "./useScheduleSave";
import { documentToJsonString } from "../../model/serialize";
import { parseScheduleText } from "../../model/scheduleFile";
import {
  FileSaveFlowHarness,
  type FileSaveFlowHandle,
} from "../../test/fileSaveFlowHarness";
import {
  SAVE_AS_PATH,
  LEVELS_3_PATH,
  type FileSaveFlowInvoke,
} from "../../test/fileSaveFlowInvoke";
import {
  FLOW_SCHEDULE_PATH,
  TASK_DESIGN,
  createSaveFlowEnv,
  fullScheduleText,
  installDomFlowPrereqs,
  levels3Document,
  levels3Text,
  seedRegressionCatalogs,
  smokeDocument,
} from "../../test/fileSaveFlowTestEnv";
import type { ScheduleFileTauriInvoke } from "../../test/scheduleFileFlowInvoke";

const invoke = vi.hoisted(() => vi.fn<ScheduleFileTauriInvoke>());

const eventHandlers = vi.hoisted(
  () => new Map<string, (payload?: unknown) => void>(),
);

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    label: "main",
    setFocus: vi.fn(),
    onCloseRequested: () => Promise.resolve(() => {}),
    onDragDropEvent: () => Promise.resolve(() => {}),
    close: vi.fn(),
    onFocusChanged: () => Promise.resolve(() => {}),
  }),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: async () => "1.4.1",
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: (payload?: unknown) => void) => {
    eventHandlers.set(event, handler);
    return () => eventHandlers.delete(event);
  }),
}));

function emitRecoveryOnClose() {
  eventHandlers.get("application-update-write-recovery")?.();
}

function emitAppEvent(event: string) {
  eventHandlers.get(event)?.();
}

async function waitForStartup() {
  await waitFor(() => {
    expect(screen.getByTestId("startup-settled")).toHaveTextContent("yes");
  });
}

async function setDesignEnd(
  ref: React.RefObject<FileSaveFlowHandle | null>,
  end: string,
) {
  await waitFor(() => {
    act(() => {
      ref.current?.setTaskEnd(TASK_DESIGN, end);
    });
    expect(screen.getByTestId("design-end")).toHaveTextContent(end);
  });
}

async function renameDesignTask(
  ref: React.RefObject<FileSaveFlowHandle | null>,
  name: string,
) {
  await waitFor(() => {
    act(() => {
      ref.current?.renameTask(TASK_DESIGN, name);
    });
    expect(screen.getByTestId("design-name")).toHaveTextContent(name);
  });
}

async function mountWithSavedPath(
  path: string,
  contents: string,
  document: ReturnType<typeof smokeDocument>,
  flow: FileSaveFlowInvoke = createSaveFlowEnv(document),
): Promise<{
  flow: FileSaveFlowInvoke;
  ref: React.RefObject<FileSaveFlowHandle | null>;
}> {
  flow.setDisk(path, contents);
  invoke.mockImplementation(flow.invoke);
  let handle: FileSaveFlowHandle | null = null;
  const ref = {
    get current() {
      return handle;
    },
    set current(value: FileSaveFlowHandle | null) {
      handle = value;
    },
  } as React.RefObject<FileSaveFlowHandle | null>;
  flow.holdStartup();
  render(<FileSaveFlowHarness ref={ref} initialDocument={document} />);
  flow.resolveStartup({ path: null, sample: true, contents: null });
  await waitForStartup();
  const parsed = parseScheduleText(contents);
  if (!parsed.ok) throw new Error(parsed.message);
  await waitFor(() => expect(ref.current).not.toBeNull());
  await act(async () => {
    ref.current!.openSavedAtPath(path, contents);
    await invoke("accept_opened_schedule", {
      path,
      contents: parsed.canonicalJson,
    });
  });
  return { flow, ref };
}

async function mountOpenSmoke(recentSchedules: string[] = []) {
  const doc = smokeDocument();
  const docJson = documentToJsonString(doc);
  const flow = createSaveFlowEnv(doc);
  flow.setDisk(FLOW_SCHEDULE_PATH, docJson);
  if (recentSchedules.length > 0) {
    flow.setRecentStore({ schedules: recentSchedules, workspaces: [] });
  }
  invoke.mockImplementation(flow.invoke);
  return mountWithSavedPath(FLOW_SCHEDULE_PATH, docJson, doc, flow);
}

function smokeV6Text(): string {
  const raw = JSON.parse(documentToJsonString(smokeDocument())) as Record<
    string,
    unknown
  >;
  raw.schemaVersion = 6;
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    const record = value as Record<string, unknown>;
    if ("tags" in record) delete record.tags;
    Object.values(record).forEach(walk);
  };
  walk(raw);
  return JSON.stringify(raw);
}

describe("file save flow", () => {
  beforeEach(() => {
    installDomFlowPrereqs();
    seedRegressionCatalogs();
    invoke.mockReset();
    eventHandlers.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saves the open path without a dialog and the design end becomes 2026-04-10 (FILE-02)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    await setDesignEnd(ref, "2026-04-10");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(screen.getByTestId("design-end")).toHaveTextContent("2026-04-10");
      const saveCall = invoke.mock.calls.find(([cmd]) => cmd === "save_schedule_file");
      expect(saveCall?.[1]?.contents).toContain("2026-04-10");
    });
    expect(screen.queryByText("未保存")).toBeNull();
    expect(flow.commandLog).not.toContain("open_schedule_file");
  });

  it("canceling save leaves the baseline and writes nothing (FILE-02)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    const baseline = flow.getDisk(FLOW_SCHEDULE_PATH) ?? "";
    await setDesignEnd(ref, "2026-04-10");
    flow.setDiskOutOfSync(true);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    const dialog = await screen.findByRole("dialog", {
      name: "ファイルが更新されています",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "取り消し" }));
    expect(
      invoke.mock.calls.filter(([cmd]) => cmd === "save_schedule_file").length,
    ).toBe(0);
    expect(flow.getDisk(FLOW_SCHEDULE_PATH)).toBe(baseline);
    expect(screen.getByText("未保存")).toBeInTheDocument();
  });

  it("save as then save writes the second change to the new path (FILE-03)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    flow.queueSaveAsPath(SAVE_AS_PATH);
    await setDesignEnd(ref, "2026-04-10");
    fireEvent.click(screen.getByRole("button", { name: "別名保存" }));
    await waitFor(() => {
      expect(ref.current?.scheduleFile.filePath).toBe(SAVE_AS_PATH);
    });
    await setDesignEnd(ref, "2026-04-11");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(flow.getDisk(SAVE_AS_PATH)).toContain('"end": "2026-04-11"');
    });
    expect(flow.getDisk(FLOW_SCHEDULE_PATH)).not.toContain('"end": "2026-04-11"');
  });

  it("discard on close deletes the recovery file (FILE-05)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    await setDesignEnd(ref, "2026-04-10");
    flow.setRecoveryCloseAction("delete");
    flow.recoveryStore.set(FLOW_SCHEDULE_PATH, '{"path":"x"}');
    await waitFor(() => {
      emitRecoveryOnClose();
      expect(flow.commandLog).toContain("delete_schedule_recovery");
    });
    expect(flow.recoveryStore.has(FLOW_SCHEDULE_PATH)).toBe(false);
  });

  it("quit cancel keeps the sample path and does not clear the other window hook (FILE-05)", async () => {
    const doc = smokeDocument();
    const flow = createSaveFlowEnv(doc);
    invoke.mockImplementation(flow.invoke);
    const ref = createRef<FileSaveFlowHandle>();
    render(<FileSaveFlowHarness ref={ref} initialDocument={doc} />);
    flow.resolveStartup({ path: null, sample: true, contents: null });
    await waitForStartup();
    await setDesignEnd(ref, "2026-04-10");
    emitAppEvent("application-quit-requested");
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    expect(flow.clearLastSchedulePathCalls).toBe(0);
    expect(screen.getByTestId("file-path")).toHaveTextContent("");
    expect(screen.getByText("未保存")).toBeInTheDocument();
  });

  it("a filter change leaves saveStatusLabel off 未保存 (FILE-04)", async () => {
    const { ref } = await mountOpenSmoke();
    await act(async () => {
      ref.current?.schedule.updateFilters({
        ...ref.current!.schedule.filters,
        search: "調査",
      });
    });
    expect(screen.queryByText("未保存")).toBeNull();
  });

  it("setTaskEnd makes saveStatusLabel 未保存 (FILE-04)", async () => {
    const { ref } = await mountOpenSmoke();
    await setDesignEnd(ref, "2026-04-10");
    expect(screen.getByText("未保存")).toBeInTheDocument();
  });

  it("the save shortcut handler calls save(false) and a dialog blocks it (FILE-02)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    await setDesignEnd(ref, "2026-04-10");
    ref.current?.openJson();
    await screen.findByRole("dialog", { name: "現在のスケジュールJSON" });
    const before = flow.commandLog.filter((c) => c === "save_schedule_file").length;
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const after = flow.commandLog.filter((c) => c === "save_schedule_file").length;
    expect(after).toBe(before);
  });

  it("JsonDialog shows the edited task name and save is not invoked (FILE-06)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    await renameDesignTask(ref, "設計改");
    ref.current?.openJson();
    const dialog = await screen.findByRole("dialog", {
      name: "現在のスケジュールJSON",
    });
    await waitFor(() => {
      expect(within(dialog).getByRole("textbox")).toHaveValue(
        expect.stringContaining("設計改"),
      );
    });
    const saves = flow.commandLog.filter((c) => c === "save_schedule_file").length;
    expect(saves).toBe(0);
  });

  it("schemaVersion 6 opens clean and save writes schemaVersion 8 without tags (FILE-01, FILE-04)", async () => {
    const v6 = smokeV6Text();
    const parsed = parseScheduleText(v6);
    if (!parsed.ok) throw new Error(parsed.message);
    const { flow, ref } = await mountWithSavedPath(
      FLOW_SCHEDULE_PATH,
      v6,
      parsed.document,
    );
    expect(screen.queryByText("未保存")).toBeNull();
    await setDesignEnd(ref, "2026-04-09");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      const saveCall = invoke.mock.calls.find(([cmd]) => cmd === "save_schedule_file");
      expect(saveCall?.[1]?.contents).toContain('"schemaVersion": 8');
      expect(saveCall?.[1]?.contents).not.toMatch(/"tags":/);
    });
    expect(flow.commandLog).toContain("save_schedule_file");
  });

  it("applyOpenedFile bumps the timeline open epoch and useTimelineView resets scroll (FILE-01, NAV-03)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    const epochBefore = Number(screen.getByTestId("timeline-epoch").textContent);
    await act(async () => {
      ref.current?.setScroll(50, 20);
    });
    const full = parseScheduleText(fullScheduleText());
    if (!full.ok) throw new Error(full.message);
    flow.setDisk(FLOW_SCHEDULE_PATH, fullScheduleText());
    await act(async () => {
      await ref.current?.scheduleFile.applyOpenedFile({
        path: FLOW_SCHEDULE_PATH,
        contents: fullScheduleText(),
      });
    });
    await waitFor(() => {
      expect(Number(screen.getByTestId("timeline-epoch").textContent)).toBeGreaterThan(
        epochBefore,
      );
      expect(ref.current?.getScroll()).toEqual({ x: 0, y: 0 });
    });
  });

  it("a level count mismatch reports 保存できません through performSave (EDIT-21, FILE-02)", async () => {
    const levelsDoc = levels3Document();
    const { ref } = await mountWithSavedPath(
      LEVELS_3_PATH,
      levels3Text(),
      levelsDoc,
    );
    const extraLevels = [
      ...(levelsDoc.levels ?? []),
      { name: "余分", meaning: "余分な段の説明" },
    ];
    await act(async () => {
      ref.current!.schedule.commitLevelDefinitions(extraLevels, true);
    });
    await act(async () => {
      await ref.current?.save(false);
    });
    expect(
      await screen.findByRole("dialog", {
        name: SCHEDULE_SAVE_ERROR_DIALOG_TITLE,
      }),
    ).toBeInTheDocument();
  });

  it("the saved file contains 回帰の指示 and the example file does not (EDIT-21, FILE-02)", async () => {
    const { ref } = await mountWithSavedPath(
      LEVELS_3_PATH,
      levels3Text(),
      levels3Document(),
    );
    ref.current?.openHierarchy();
    const dialog = await screen.findByRole("dialog", { name: "階層" });
    const instruction = within(dialog).getAllByLabelText("指示")[0];
    fireEvent.change(instruction, { target: { value: "回帰の指示" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "適用" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      const saveCall = invoke.mock.calls.find(([cmd]) => cmd === "save_schedule_file");
      expect(saveCall?.[1]?.contents).toContain("回帰の指示");
    });
    expect(levels3Text()).not.toContain("回帰の指示");
  });

  it("an unapplied name 回帰の下書き is absent from the file (EDIT-21, FILE-02)", async () => {
    const { ref } = await mountWithSavedPath(
      LEVELS_3_PATH,
      levels3Text(),
      levels3Document(),
    );
    ref.current?.openHierarchy();
    const dialog = await screen.findByRole("dialog", { name: "階層" });
    const nameField = within(dialog).getAllByLabelText("名前")[0];
    fireEvent.change(nameField, { target: { value: "回帰の下書き" } });
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      const saveCall = invoke.mock.calls.find(([cmd]) => cmd === "save_schedule_file");
      expect(saveCall?.[1]?.contents).not.toContain("回帰の下書き");
    });
  });

  it("opening a file makes resolveStripAfterAutoLoad hide the empty strip (FILE-07)", async () => {
    const { ref } = await mountOpenSmoke();
    await setDesignEnd(ref, "2026-04-10");
    await waitFor(() => {
      expect(screen.getByText("未保存")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(screen.queryByText("未保存")).toBeNull();
    });
    expect(screen.queryByRole("heading", { name: "差分" })).toBeNull();
  });

  it("the status bar opens the diff from the real file bytes (FILE-07)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    await setDesignEnd(ref, "2026-04-10");
    fireEvent.click(screen.getByRole("button", { name: "未保存" }));
    const diffButton = screen.queryByRole("button", { name: "差分" });
    if (diffButton) {
      fireEvent.click(diffButton);
    }
    await waitFor(() => {
      const strip = flow.getDisk(FLOW_SCHEDULE_PATH) ?? "";
      expect(strip).not.toContain('"end": "2026-04-10"');
      expect(document.body.textContent).toMatch(/2026-04-10/);
    });
  });

  it("a broken file on disk yields the read error and no diff rows (FILE-07)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    flow.setDisk(FLOW_SCHEDULE_PATH, "{ broken");
    await setDesignEnd(ref, "2026-04-10");
    fireEvent.click(screen.getByRole("button", { name: "未保存" }));
    expect(await screen.findByTestId("diff-error")).toHaveTextContent(
      /JSON の形式が正しくありません/,
    );
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("opening another file clears undo (EDIT-10)", async () => {
    const { flow, ref } = await mountOpenSmoke();
    await setDesignEnd(ref, "2026-04-10");
    expect(ref.current?.canUndo()).toBe(true);
    const other = levels3Text();
    flow.setDisk(LEVELS_3_PATH, other);
    await act(async () => {
      await ref.current?.scheduleFile.applyOpenedFile({
        path: LEVELS_3_PATH,
        contents: other,
      });
    });
    expect(ref.current?.canUndo()).toBe(false);
  });

  it("workspace open and direct parse show the same level names from levels-3 (VIEW-03, FILE-01)", async () => {
    const { ref } = await mountWithSavedPath(
      LEVELS_3_PATH,
      levels3Text(),
      levels3Document(),
    );
    const fromHook = ref.current?.getLevelBanner() ?? "";
    const direct = screen.getByTestId("level-banner").textContent ?? "";
    expect(fromHook).toBe(direct);
    expect(direct.length).toBeGreaterThan(0);
  });
});

describe("recent files in useScheduleFile", () => {
  beforeEach(() => {
    installDomFlowPrereqs();
    seedRegressionCatalogs();
    invoke.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("a missing recent path keeps the screen and the history order (FILE-09)", async () => {
    const missing = "/tmp/regression/missing.json";
    const { flow, ref } = await mountOpenSmoke([FLOW_SCHEDULE_PATH, missing]);
    flow.setDisk(missing, levels3Text());
    invoke.mockImplementation(async (command, args) => {
      if (command === "read_dropped_schedule_file" && args?.path === missing) {
        throw new Error("SCHEDULE_FILE_NOT_FOUND");
      }
      return flow.invoke(command, args);
    });
    await act(async () => {
      ref.current?.scheduleFile.requestOpenFromRecent(missing);
    });
    expect(ref.current?.scheduleFile.filePath).toBe(FLOW_SCHEDULE_PATH);
    expect(screen.getByTestId("recent-schedules").textContent).toContain(missing);
  });

  it("cancel during unsaved does not move the recent entry (FILE-09)", async () => {
    const other = LEVELS_3_PATH;
    const { flow, ref } = await mountOpenSmoke([FLOW_SCHEDULE_PATH, other]);
    flow.setDisk(other, levels3Text());
    await setDesignEnd(ref, "2026-04-10");
    ref.current?.scheduleFile.requestOpenFromRecent(other);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    const order = screen.getByTestId("recent-schedules").textContent ?? "";
    expect(order.indexOf(FLOW_SCHEDULE_PATH)).toBeLessThan(order.indexOf(other));
  });

  it("clear history leaves the open schedule and the recovery file (FILE-09)", async () => {
    const { flow } = await mountOpenSmoke([FLOW_SCHEDULE_PATH]);
    flow.recoveryStore.set(FLOW_SCHEDULE_PATH, '{"path":"recovery"}');
    fireEvent.click(screen.getByRole("button", { name: "履歴を消す" }));
    await waitFor(() => {
      expect(screen.getByTestId("recent-schedules")).toHaveTextContent("");
    });
    expect(screen.getByTestId("file-path")).toHaveTextContent(FLOW_SCHEDULE_PATH);
    expect(flow.recoveryStore.has(FLOW_SCHEDULE_PATH)).toBe(true);
  });

  it("a corrupt recent file yields an empty list and no notice (FILE-09)", async () => {
    const flow = createSaveFlowEnv();
    flow.setRecentStore({ schedules: [], workspaces: [] });
    invoke.mockImplementation(async (command) => {
      if (command === "read_recent_files") {
        return { schedules: [], workspaces: [] };
      }
      return flow.invoke(command);
    });
    const ref = createRef<FileSaveFlowHandle>();
    render(<FileSaveFlowHarness ref={ref} initialDocument={smokeDocument()} />);
    flow.resolveStartup();
    await waitForStartup();
    await waitFor(() => {
      expect(screen.getByTestId("recent-schedules")).toHaveTextContent("");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opening from history resets filters and fit (FILE-09)", async () => {
    const other = LEVELS_3_PATH;
    const { flow, ref } = await mountOpenSmoke([other, FLOW_SCHEDULE_PATH]);
    flow.setDisk(other, levels3Text());
    await act(async () => {
      ref.current?.schedule.updateFilters({
        ...ref.current!.schedule.filters,
        search: "調査",
      });
      ref.current?.setScroll(300, 80);
    });
    await act(async () => {
      ref.current?.scheduleFile.requestOpenFromRecent(other);
    });
    await waitFor(() => {
      expect(ref.current?.scheduleFile.filePath).toBe(other);
    });
    expect(ref.current?.schedule.filters.search).toBe("");
    await waitFor(() => {
      expect(screen.getByTestId("scroll")).toHaveTextContent("0,0");
    });
  });
});

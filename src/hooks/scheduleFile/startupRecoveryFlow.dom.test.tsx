import { createRef } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCHEDULE_FILE_NOT_FOUND } from "../../model/scheduleFile";
import { documentToJsonString } from "../../model/serialize";
import {
  ScheduleFileFlowHarness,
  type ScheduleFileFlowHandle,
} from "../../test/scheduleFileFlowHarness";
import { createSaveFlowEnv, FLOW_SCHEDULE_PATH, seedRegressionCatalogs } from "../../test/fileSaveFlowTestEnv";
import {
  advanceOnePoll,
  cloneWithTaskEnd,
  cloneWithTaskName,
  draftWrapper,
  installDomFlowPrereqs,
  pollJson,
  TASK_SURVEY,
} from "../../test/scheduleFileFlowTestEnv";
import { loadRegressionSchedule, readRegressionText } from "../../test/searchErrorKeysFixtures";
import type { ScheduleFileTauriInvoke } from "../../test/scheduleFileFlowInvoke";

const invoke = vi.hoisted(() => vi.fn<ScheduleFileTauriInvoke>());

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

const eventHandlers = vi.hoisted(
  () => new Map<string, (...args: unknown[]) => void>(),
);

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: (...args: unknown[]) => void) => {
    eventHandlers.set(event, handler);
    return () => {
      eventHandlers.delete(event);
    };
  }),
}));

async function settleAfterPoll() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  vi.useRealTimers();
}

async function resolveStartupInAct(
  flow: ReturnType<typeof createSaveFlowEnv>,
  read?: Parameters<ReturnType<typeof createSaveFlowEnv>["resolveStartup"]>[0],
) {
  await act(async () => {
    flow.resolveStartup(read);
  });
}

async function mountHeldStartup(overrides?: Parameters<ReturnType<typeof createSaveFlowEnv>["setStartupRead"]>[0]) {
  const doc = loadRegressionSchedule("smoke.schedule.json");
  const baseline = documentToJsonString(doc);
  const flow = createSaveFlowEnv(doc);
  flow.holdStartup();
  if (overrides) flow.setStartupRead(overrides);
  invoke.mockImplementation(flow.invoke);
  const ref = createRef<ScheduleFileFlowHandle>();
  render(<ScheduleFileFlowHarness ref={ref} initialDocument={doc} />);
  return { flow, ref, doc, baseline };
}

describe("startup recovery flow", () => {
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

  it("TC-SYNC-03d: opens the saved file when there is no draft", async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const flow = createSaveFlowEnv(doc);
    flow.resolveStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: documentToJsonString(doc),
    });
    invoke.mockImplementation(flow.invoke);
    render(<ScheduleFileFlowHarness initialDocument={doc} />);
    await waitFor(() => {
      expect(screen.getByTestId("startup-settled")).toHaveTextContent("yes");
    });
    expect(flow.commandLog).toContain("accept_opened_schedule");
    expect(screen.queryByText("未保存")).toBeNull();
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("no");
  });

  it("TC-SYNC-03: restores unsaved edits when the disk matches baseline", async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const baseline = documentToJsonString(doc);
    const edited = cloneWithTaskName(doc, TASK_SURVEY, "調査rev");
    const flow = createSaveFlowEnv(doc);
    flow.resolveStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: baseline,
      draftText: draftWrapper(edited, baseline),
    });
    invoke.mockImplementation(flow.invoke);
    render(<ScheduleFileFlowHarness initialDocument={doc} />);
    await waitFor(() => {
      expect(screen.getByText("未保存")).toBeInTheDocument();
    });
    expect(screen.getByTestId("survey-name")).toHaveTextContent("調査rev");
  });

  it("TC-SYNC-03b: asks whether to open disk or restore when disk differs", async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const baseline = documentToJsonString(doc);
    const edited = cloneWithTaskName(doc, TASK_SURVEY, "調査rev");
    const disk = documentToJsonString(cloneWithTaskEnd(doc, TASK_SURVEY, "2026-04-09"));
    const flow = createSaveFlowEnv(doc);
    flow.resolveStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: disk,
      draftText: draftWrapper(edited, baseline),
    });
    invoke.mockImplementation(flow.invoke);
    render(<ScheduleFileFlowHarness initialDocument={doc} />);
    expect(
      await screen.findByRole("dialog", { name: "前回の未保存の編集" }),
    ).toBeInTheDocument();
  });

  it("TC-SYNC-03b: opens the latest file without a dialog when choosing disk", async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const baseline = documentToJsonString(doc);
    const edited = cloneWithTaskName(doc, TASK_SURVEY, "調査rev");
    const disk = documentToJsonString(cloneWithTaskEnd(doc, TASK_SURVEY, "2026-04-09"));
    const flow = createSaveFlowEnv(doc);
    flow.resolveStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: disk,
      draftText: draftWrapper(edited, baseline),
    });
    invoke.mockImplementation(flow.invoke);
    render(<ScheduleFileFlowHarness initialDocument={doc} />);
    const conflict = await screen.findByRole("dialog", { name: "前回の未保存の編集" });
    fireEvent.click(
      screen.getByRole("button", { name: "ファイルを開く" }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-09");
    });
    expect(conflict).not.toBeInTheDocument();
  });

  it("TC-SYNC-03e: shows a missing notice without a draft and keeps the sample", async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const flow = createSaveFlowEnv(doc);
    flow.resolveStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: null,
      error: SCHEDULE_FILE_NOT_FOUND,
    });
    invoke.mockImplementation(flow.invoke);
    render(<ScheduleFileFlowHarness initialDocument={doc} />);
    expect(
      await screen.findByRole("dialog", { name: "ファイルが見つかりません" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("file-path")).toHaveTextContent("");
  });

  it("TC-SYNC-03c: restores edits when the file is missing", async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const baseline = documentToJsonString(doc);
    const edited = cloneWithTaskName(doc, TASK_SURVEY, "調査rev");
    const flow = createSaveFlowEnv(doc);
    flow.resolveStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: null,
      error: SCHEDULE_FILE_NOT_FOUND,
      draftText: draftWrapper(edited, baseline),
    });
    invoke.mockImplementation(flow.invoke);
    render(<ScheduleFileFlowHarness initialDocument={doc} />);
    await waitFor(() => {
      expect(screen.getByTestId("survey-name")).toHaveTextContent("調査rev");
    });
    expect(
      await screen.findByRole("dialog", { name: "前回の未保存の編集" }),
    ).toBeInTheDocument();
  });

  it("TC-SYNC-03f: blocks date moves until startup recovery settles", async () => {
    const { flow, ref } = await mountHeldStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: documentToJsonString(loadRegressionSchedule("smoke.schedule.json")),
    });
    await waitFor(() => expect(ref.current).not.toBeNull());
    ref.current!.selectTask(TASK_SURVEY);
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowRight", altKey: true });
    });
    expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-03");
    await resolveStartupInAct(flow);
    await waitFor(() => {
      expect(screen.getByTestId("startup-settled")).toHaveTextContent("yes");
    });
    await act(async () => {
      ref.current!.setTaskEnd(TASK_SURVEY, "2026-04-04");
    });
    expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-04");
  });

  it(
    "TC-SYNC-03g: applies an external update after startup and then allows moves",
    async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const { flow, ref } = await mountHeldStartup({
      path: FLOW_SCHEDULE_PATH,
      sample: false,
      contents: documentToJsonString(doc),
    });
    const updated = cloneWithTaskEnd(doc, TASK_SURVEY, "2026-04-08");
    flow.setDisk(FLOW_SCHEDULE_PATH, documentToJsonString(updated));
    flow.queuePoll(pollJson(updated));
    vi.useFakeTimers();
    await resolveStartupInAct(flow);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("startup-settled")).toHaveTextContent("yes");
    expect(ref.current?.getFilePath()).toBe(FLOW_SCHEDULE_PATH);
    await advanceOnePoll();
    await settleAfterPoll();
    await waitFor(() => {
      expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-08");
    });
    await act(async () => {
      ref.current!.setTaskEnd(TASK_SURVEY, "2026-04-09");
    });
    expect(screen.getByTestId("survey-end")).toHaveTextContent("2026-04-09");
    },
    15_000,
  );
});

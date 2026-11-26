import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { documentToJsonString } from "../../model/serialize";
import {
  ScheduleFileFlowHarness,
} from "../../test/scheduleFileFlowHarness";
import {
  createSaveFlowEnv,
  FLOW_SCHEDULE_PATH,
  installDomFlowPrereqs,
  seedRegressionCatalogs,
} from "../../test/fileSaveFlowTestEnv";
import { loadRegressionSchedule, readRegressionText } from "../../test/searchErrorKeysFixtures";
import type { ScheduleFileTauriInvoke } from "../../test/scheduleFileFlowInvoke";

const invoke = vi.hoisted(() => vi.fn<ScheduleFileTauriInvoke>());

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    label: "schedule-3",
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

describe("pending schedule window startup", () => {
  beforeEach(() => {
    installDomFlowPrereqs();
    seedRegressionCatalogs(readRegressionText);
    invoke.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("marks startup content ready after a successful pending open (WIN-01)", async () => {
    const doc = loadRegressionSchedule("smoke.schedule.json");
    const contents = documentToJsonString(doc);
    const flow = createSaveFlowEnv(doc);
    flow.setPendingScheduleOpen({
      label: "schedule-3",
      path: FLOW_SCHEDULE_PATH,
      contents,
      workspacePath: null,
    });
    invoke.mockImplementation(flow.invoke);
    render(<ScheduleFileFlowHarness initialDocument={doc} />);
    await waitFor(() => {
      expect(screen.getByTestId("startup-settled")).toHaveTextContent("yes");
    });
    expect(screen.getByTestId("file-path")).toHaveTextContent(FLOW_SCHEDULE_PATH);
    expect(screen.getByTestId("startup-content-ready")).toHaveTextContent("yes");
  });
});

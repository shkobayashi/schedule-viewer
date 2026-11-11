import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  expandSidebarUntilTask,
  installMatchMedia,
  mountApp,
} from "../test/appDomMount";
import {
  installDomFlowPrereqs,
  seedRegressionCatalogs,
  TASK_DESIGN,
  TASK_SURVEY,
} from "../test/scheduleFileFlowTestEnv";
import type { ScheduleFileTauriInvoke } from "../test/scheduleFileFlowInvoke";
import {
  loadRegressionSchedule,
  readRegressionText,
} from "../test/searchErrorKeysFixtures";
import { documentToJsonString } from "../model/serialize";

function smokeScheduleWithTodosOnDesign(): string {
  const doc = structuredClone(loadRegressionSchedule("smoke.schedule.json"));
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === TASK_DESIGN) {
          task.todos = [{ text: "下書き", done: false }];
        }
      }
    }
  }
  return documentToJsonString(doc);
}

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
  listen: vi.fn(async () => () => undefined),
}));

describe("detail panel ui-field (#551 increment 3)", () => {
  beforeEach(() => {
    installDomFlowPrereqs();
    installMatchMedia();
    seedRegressionCatalogs(readRegressionText);
  });

  afterEach(() => {
    cleanup();
  });

  it("puts ui-field on text, textarea, select, date, todo inputs but not on progress range", async () => {
    const path = "/tmp/ui-field/detail-smoke-todos.json";
    const contents = smokeScheduleWithTodosOnDesign();
    await mountApp({ path, contents }, invoke);
    await expandSidebarUntilTask("設計");
    fireEvent.click(screen.getByText("設計"));
    await waitFor(() => expect(screen.getByLabelText("タスクの詳細")).toBeInTheDocument());

    expect(document.getElementById("detailName")).toHaveClass("ui-field");
    expect(document.getElementById("detailNote")).toHaveClass("ui-field");
    expect(document.getElementById("detailTagInput")).toHaveClass("ui-field");
    expect(document.getElementById("detailStart")).toHaveClass("ui-field");
    expect(document.getElementById("detailStatus")).toHaveClass("ui-field");
    expect(document.querySelector(".detail-todo-text")).toHaveClass("ui-field");
    expect(document.querySelector('#detailProgress[type="range"]')).toBeNull();
    expect(document.querySelector(".field input[type='checkbox']")).not.toHaveClass(
      "ui-field",
    );
  });

  it("persists a status edit from the detail panel", async () => {
    const path = "/tmp/ui-field/detail-edit.json";
    const contents = documentToJsonString(loadRegressionSchedule("smoke.schedule.json"));
    await mountApp({ path, contents }, invoke);
    await expandSidebarUntilTask("設計");
    fireEvent.click(screen.getByText("設計"));
    const status = await screen.findByLabelText("ステータス");
    fireEvent.change(status, { target: { value: "in-progress" } });
    await waitFor(() =>
      expect((status as HTMLSelectElement).value).toBe("in-progress"),
    );
  });

  it("enables bulk apply after a status change", async () => {
    const path = "/tmp/ui-field/bulk.json";
    const contents = documentToJsonString(loadRegressionSchedule("smoke.schedule.json"));
    await mountApp({ path, contents }, invoke);
    await expandSidebarUntilTask("設計");
    const survey = document.querySelector(`[data-task-id="${TASK_SURVEY}"]`);
    const design = document.querySelector(`[data-task-id="${TASK_DESIGN}"]`);
    if (!(survey instanceof HTMLElement) || !(design instanceof HTMLElement)) {
      throw new Error("task rows missing");
    }
    fireEvent.click(survey);
    fireEvent.click(design, { ctrlKey: true });
    await waitFor(() => expect(screen.getByText("2件を選択中")).toBeInTheDocument());
    const bulkPanel = screen.getByRole("complementary", {
      name: /2件の一括編集/,
    });
    const bulkStatus = within(bulkPanel).getByLabelText("ステータス");
    expect(bulkStatus).toHaveClass("ui-field");
    fireEvent.change(bulkStatus, { target: { value: "done" } });
    const apply = within(bulkPanel).getByRole("button", { name: /件に適用/ });
    await waitFor(() => expect(apply).not.toBeDisabled());
    expect(within(bulkPanel).getByText(/適用する項目:.*ステータス/)).toBeInTheDocument();
    fireEvent.click(apply);
    await waitFor(() => expect(apply).toBeDisabled());
    fireEvent.click(survey);
    await waitFor(() =>
      expect((screen.getByLabelText("ステータス") as HTMLSelectElement).value).toBe("done"),
    );
    fireEvent.click(design);
    await waitFor(() =>
      expect((screen.getByLabelText("ステータス") as HTMLSelectElement).value).toBe("done"),
    );
  });
});

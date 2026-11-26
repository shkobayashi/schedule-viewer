import { createRef, type RefObject } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadRegressionSchedule,
} from "./searchErrorKeysFixtures";
import {
  McpSetViewIntegrationHarness,
  type McpSetViewIntegrationHandle,
} from "./mcpSetViewIntegrationHarness";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ close: vi.fn() }),
}));

const DESIGN = "e1000001-0000-4000-8000-000000000002";
const APPROVAL_MARK = "b1000001-0000-4000-8000-000000000001";

function mount(): RefObject<McpSetViewIntegrationHandle | null> {
  const ref = createRef<McpSetViewIntegrationHandle>();
  render(
    <McpSetViewIntegrationHarness
      ref={ref}
      scheduleDocument={loadRegressionSchedule("smoke.schedule.json")}
    />,
  );
  return ref;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("set_view integration through applySetView", () => {
  it("set_view lineage through executor shows lineage chip and clears explanation", async () => {
    const ref = mount();
    if (ref.current == null) throw new Error("harness");
    act(() => {
      ref.current!.selectTask(DESIGN);
      ref.current!.setExplanationActive(true);
    });
    expect(screen.getByTestId("explanation-active").textContent).toBe("true");
    expect(screen.getByTestId("selection").textContent).toBe(DESIGN);

    await act(async () => {
      const result = await ref.current!.runSetView({
        lineage: { taskId: DESIGN, includesConnections: false },
      });
      expect(result).toEqual({ ok: true, text: "見方を変えました。" });
    });

    expect(
      screen.getByRole("button", { name: "系統: 設計" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("explanation-active").textContent).toBe("false");
    expect(screen.getByTestId("selection").textContent).toBe(DESIGN);
  });

  it("set_view lineage with includesConnections shows connection chip label", async () => {
    const ref = mount();
    if (ref.current == null) throw new Error("harness");
    act(() => ref.current!.selectTask(DESIGN));

    await act(async () => {
      await ref.current!.runSetView({
        lineage: { taskId: DESIGN, includesConnections: true },
      });
    });

    expect(
      screen.getByRole("button", { name: "系統: 設計（繋がりも）" }),
    ).toBeInTheDocument();
  });

  it("set_view hiddenMilestoneIds shows mark hidden chip without clearing explanation", async () => {
    const ref = mount();
    if (ref.current == null) throw new Error("harness");
    act(() => {
      ref.current!.selectTask(DESIGN);
      ref.current!.setExplanationActive(true);
    });

    await act(async () => {
      await ref.current!.runSetView({
        hiddenMilestoneIds: [APPROVAL_MARK],
      });
    });

    expect(
      screen.getByRole("button", { name: /帯の印: 承認/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("explanation-active").textContent).toBe("true");
    expect(screen.getByTestId("selection").textContent).toBe(DESIGN);
  });

  it("set_view rejects unknown lineage task without changing status filter chip", async () => {
    const ref = mount();
    if (ref.current == null) throw new Error("harness");

    await act(async () => {
      await ref.current!.runSetView({
        filters: {
          ...ref.current!.getFilters(),
          status: "in-progress",
        },
      });
    });
    expect(
      screen.getByRole("button", { name: "ステータス: 進行中" }),
    ).toBeInTheDocument();

    await act(async () => {
      const result = await ref.current!.runSetView({
        lineage: {
          taskId: "00000000-0000-4000-8000-000000000099",
          includesConnections: false,
        },
        hiddenMilestoneIds: [APPROVAL_MARK],
      });
      expect(result).toEqual({
        ok: false,
        message: "系統の起点のタスクが見つかりません。",
      });
    });

    expect(
      screen.getByRole("button", { name: "ステータス: 進行中" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /帯の印: 承認/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /系統:/ })).not.toBeInTheDocument();
  });

  it("set_view hiddenMilestoneIds prunes unknown ids and keeps known hidden mark chip", async () => {
    const ref = mount();
    if (ref.current == null) throw new Error("harness");

    await act(async () => {
      const result = await ref.current!.runSetView({
        hiddenMilestoneIds: [
          "00000000-0000-4000-8000-000000000099",
          APPROVAL_MARK,
        ],
      });
      expect(result).toEqual({ ok: true, text: "見方を変えました。" });
    });

    expect(
      screen.getByRole("button", { name: /帯の印: 承認/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /00000000-0000-4000-8000-000000000099/,
      }),
    ).not.toBeInTheDocument();
  });
});

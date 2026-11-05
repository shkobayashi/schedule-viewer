import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  FIRST_RUN_CHECKLIST_LABELS,
  FIRST_RUN_PREPARE_SCHEDULE_TITLE,
  type FirstRunChecklistState,
} from "../model/firstRunGuidance";
import { FIRST_RUN_TRY_LLM_PROMPT } from "../model/llmRequestExamples";
import { FirstRunHintCard } from "./FirstRunHintCard";

const emptyChecklist: FirstRunChecklistState = {
  prepareSchedule: false,
  guide: false,
  mcp: false,
};

function renderCard(
  overrides: Partial<Parameters<typeof FirstRunHintCard>[0]> = {},
) {
  const onDismiss = vi.fn();
  const onPrepareWithLlm = vi.fn();
  const onOpenExistingJson = vi.fn();
  const onOpenGuide = vi.fn();
  const onOpenMcpSettings = vi.fn();
  render(
    <FirstRunHintCard
      commandKey={false}
      showingSample
      checklist={emptyChecklist}
      showPrepareLlmSteps={false}
      hasOpenedScheduleFile={false}
      onDismiss={onDismiss}
      onPrepareWithLlm={onPrepareWithLlm}
      onOpenExistingJson={onOpenExistingJson}
      onOpenGuide={onOpenGuide}
      onOpenMcpSettings={onOpenMcpSettings}
      {...overrides}
    />,
  );
  return {
    onDismiss,
    onPrepareWithLlm,
    onOpenExistingJson,
    onOpenGuide,
    onOpenMcpSettings,
  };
}

describe("FirstRunHintCard", () => {
  it("shows the sample heading, three items, and two prepare buttons", () => {
    const actions = renderCard();
    expect(screen.getByText("はじめての起動")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "サンプルを表示しています" }),
    ).toBeInTheDocument();
    expect(screen.getByText(FIRST_RUN_PREPARE_SCHEDULE_TITLE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: FIRST_RUN_CHECKLIST_LABELS.guide }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: FIRST_RUN_CHECKLIST_LABELS.mcp }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "LLM で作る" }));
    fireEvent.click(screen.getByRole("button", { name: "ある JSON を開く" }));
    expect(actions.onPrepareWithLlm).toHaveBeenCalledOnce();
    expect(actions.onOpenExistingJson).toHaveBeenCalledOnce();
    expect(screen.getByText(/Ctrl\+S/)).toBeInTheDocument();
  });

  it("switches the heading when a file is open instead of the sample", () => {
    renderCard({ showingSample: false, commandKey: true });
    expect(
      screen.getByRole("heading", { name: "次の 3 つを終えましょう" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "サンプルを表示しています" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(FIRST_RUN_PREPARE_SCHEDULE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(/⌘S/)).toBeInTheDocument();
  });

  it("keeps the card and disables only the finished guide action", () => {
    const actions = renderCard({
      checklist: { prepareSchedule: false, guide: true, mcp: false },
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "操作の案内を読む（完了）" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "LLM で作る" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_CHECKLIST_LABELS.mcp }));
    expect(actions.onOpenMcpSettings).toHaveBeenCalledOnce();
    expect(actions.onOpenGuide).not.toHaveBeenCalled();
  });

  it("keeps open-json enabled after prepare is checked until a file is opened", () => {
    renderCard({
      checklist: { prepareSchedule: true, guide: false, mcp: false },
      hasOpenedScheduleFile: false,
    });
    expect(screen.getByRole("button", { name: "LLM で作る" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ある JSON を開く" })).toBeEnabled();
  });

  it("disables open-json when a file is already open or the opener is blocked", () => {
    const { unmount } = render(
      <FirstRunHintCard
        commandKey={false}
        showingSample={false}
        checklist={{ prepareSchedule: true, guide: false, mcp: false }}
        showPrepareLlmSteps={false}
        hasOpenedScheduleFile
        onDismiss={vi.fn()}
        onPrepareWithLlm={vi.fn()}
        onOpenExistingJson={vi.fn()}
        onOpenGuide={vi.fn()}
        onOpenMcpSettings={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "ある JSON を開く" })).toBeDisabled();
    unmount();
    renderCard({ openExistingJsonDisabled: true });
    expect(screen.getByRole("button", { name: "ある JSON を開く" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "LLM で作る" })).toBeEnabled();
  });

  it("dismisses from the close button", () => {
    const actions = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(actions.onDismiss).toHaveBeenCalledOnce();
  });

  it("dismisses when Escape is pressed", () => {
    const actions = renderCard();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(actions.onDismiss).toHaveBeenCalledOnce();
  });

  it("shows the try-llm prompt after mcp is checked", () => {
    renderCard({
      checklist: { prepareSchedule: false, guide: false, mcp: true },
    });
    expect(screen.getByText("LLM に頼んでみる")).toBeInTheDocument();
    expect(screen.getByText(FIRST_RUN_TRY_LLM_PROMPT)).toBeInTheDocument();
    expect(screen.getByText(/やっぱり戻して/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "LLM（MCP）とつなぐ（完了）" }),
    ).toBeDisabled();
  });
});

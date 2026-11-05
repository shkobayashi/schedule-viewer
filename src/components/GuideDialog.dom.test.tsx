import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { GuideDialog } from "./GuideDialog";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => false),
}));

describe("GuideDialog", () => {
  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(false);
  });

  it("shows the four headings while open", () => {
    render(
      <GuideDialog open onClose={vi.fn()} onOpenShortcuts={vi.fn()} />,
    );
    for (const title of [
      "最初にやる 3 つ",
      "開く・保存",
      "画面の見方",
      "もう少し知りたいとき",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "操作の案内" })).toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    render(
      <GuideDialog open={false} onClose={vi.fn()} onOpenShortcuts={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "操作の案内" })).not.toBeInTheDocument();
  });

  it("dismisses from the close button and Escape", () => {
    const onClose = vi.fn();
    const onOpenShortcuts = vi.fn();
    render(<GuideDialog open onClose={onClose} onOpenShortcuts={onOpenShortcuts} />);
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "ショートカット一覧" }));
    expect(onOpenShortcuts).toHaveBeenCalledOnce();
  });

  it("shows the llm example only when the desktop runtime is on", () => {
    const { unmount } = render(
      <GuideDialog open onClose={vi.fn()} onOpenShortcuts={vi.fn()} />,
    );
    expect(
      screen.queryByText(/選んでいるタスクを 2 日後ろにずらして/),
    ).not.toBeInTheDocument();
    unmount();
    vi.mocked(isTauri).mockReturnValue(true);
    render(<GuideDialog open onClose={vi.fn()} onOpenShortcuts={vi.fn()} />);
    expect(
      screen.getByText(/選んでいるタスクを 2 日後ろにずらして/),
    ).toBeInTheDocument();
  });
});

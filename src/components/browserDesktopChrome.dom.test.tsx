import { useEffect, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { AppMenu } from "./AppMenu";
import { CommandPalette } from "./CommandPalette";
import { FirstRunHintCard } from "./FirstRunHintCard";
import { SettingsDesktopSectionButtons } from "./SettingsDesktopSectionButtons";
import { useDesktopFirstRunSession } from "../hooks/useDesktopFirstRunSession";
import {
  scheduleFilePoll,
  scheduleFilterWrite,
  shouldAttachDesktopFileBridge,
} from "../hooks/scheduleFile/browserFileBridge";
import { EXTERNAL_RELOAD_POLL_MS, RECOVERY_DEBOUNCE_MS } from "../hooks/scheduleFile/constants";
import { installBrowserFileDropGuard } from "../model/browserFileDropGuard";
import {
  desktopFirstRunVisibility,
  isDesktopFirstRunRuntime,
} from "../model/firstRunGuidance";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => false),
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(async () => "1.12.1"),
}));

function FirstRunProbe({
  mode,
  tauri,
  dirty,
}: {
  mode: string;
  tauri: boolean;
  dirty: boolean;
}) {
  const session = useDesktopFirstRunSession();
  const chrome = desktopFirstRunVisibility({
    desktopRuntime: isDesktopFirstRunRuntime(tauri, mode),
    dismissed: session.dismissed,
    checklist: session.checklist,
    startupSettled: true,
    saveHintCompleted: session.saveHintCompleted,
    isDirty: dirty,
    commandKey: false,
    recentMenuEmpty: true,
  });
  return (
    <div>
      {chrome.showCard ? (
        <FirstRunHintCard
          commandKey={false}
          showingSample
          checklist={session.checklist}
          showPrepareLlmSteps={false}
          hasOpenedScheduleFile={session.checklist.prepareSchedule}
          onDismiss={session.dismiss}
          onPrepareWithLlm={() => undefined}
          onOpenExistingJson={() => undefined}
          onOpenGuide={() => session.markStep("guide")}
          onOpenMcpSettings={() => session.markStep("mcp")}
        />
      ) : null}
      {chrome.saveHint ? <p>{chrome.saveHint}</p> : null}
      <button type="button" onClick={() => session.markStep("prepareSchedule")}>
        ファイルを開いた
      </button>
      <button type="button" onClick={session.markSaved}>
        保存する
      </button>
    </div>
  );
}

const menuHandlers = {
  onOpen: vi.fn(),
  onSave: vi.fn(),
  onSaveAs: vi.fn(),
  onExportHtml: vi.fn(),
  onShowJson: vi.fn(),
  onShowDiff: vi.fn(),
  onCopyDiff: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenGuide: vi.fn(),
  onOpenShortcuts: vi.fn(),
  onOpenRecent: vi.fn(),
  onClearRecentHistory: vi.fn(),
};

describe("desktop first-run wiring", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(isTauri).mockReturnValue(false);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("hides the first-run card after dismiss across a remount", () => {
    const first = render(<FirstRunProbe mode="development" tauri dirty={false} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();
    render(<FirstRunProbe mode="development" tauri dirty={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the save hint while the document is dirty and clears it after save", () => {
    render(<FirstRunProbe mode="development" tauri dirty />);
    expect(screen.getByText("保存は ☰ または Ctrl+S")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(screen.queryByText("保存は ☰ または Ctrl+S")).not.toBeInTheDocument();
  });

  it("keeps the card when only the prepare item is checked", () => {
    render(<FirstRunProbe mode="development" tauri dirty={false} />);
    fireEvent.click(screen.getByRole("button", { name: "ある JSON を開く" }));
    expect(screen.getByRole("button", { name: "LLM で作る" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "ファイルを開いた" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LLM で作る" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "操作の案内を読む" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "操作の案内を読む" }));
    fireEvent.click(screen.getByRole("button", { name: "LLM（MCP）とつなぐ" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("omits the first-run card and save hint in the browser runtime", () => {
    render(<FirstRunProbe mode="development" tauri={false} dirty />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("保存は ☰ または Ctrl+S")).not.toBeInTheDocument();
    expect(screen.queryByText("はじめての起動")).not.toBeInTheDocument();
  });

  it("shows the first-run card in the screenshot runtime without Tauri", () => {
    render(<FirstRunProbe mode="manual-screenshot" tauri={false} dirty={false} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("はじめての起動")).toBeInTheDocument();
  });
});

describe("browser menu and settings", () => {
  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(false);
    Element.prototype.scrollIntoView = () => undefined;
  });

  it("shows a disabled recent-files row and the empty hint on the desktop menu", () => {
    vi.mocked(isTauri).mockReturnValue(true);
    render(
      <AppMenu
        {...menuHandlers}
        recentFilesStore={{ schedules: [], workspaces: [] }}
        recentFilesEmptyHint="ファイルを開くとここに並びます"
      />,
    );
    fireEvent.click(screen.getByTitle("メニュー"));
    const recent = screen.getByRole("menuitem", { name: /最近開いたファイル/ });
    expect(recent).toBeDisabled();
    expect(screen.getByText("ファイルを開くとここに並びます")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "履歴を消す" })).not.toBeInTheDocument();
  });

  it("omits recent files and clear history from the browser menu and palette", () => {
    render(
      <AppMenu
        {...menuHandlers}
        recentFilesStore={{
          schedules: ["/tmp/a.json"],
          workspaces: [],
        }}
        recentFilesEmptyHint={null}
      />,
    );
    fireEvent.click(screen.getByTitle("メニュー"));
    expect(screen.queryByRole("menuitem", { name: /最近開いたファイル/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "履歴を消す" })).not.toBeInTheDocument();

    render(
      <CommandPalette
        open
        onClose={vi.fn()}
        onRun={vi.fn()}
        context={{
          fileBusy: false,
          isTauriDesktop: false,
          recentFilesStore: {
            schedules: ["/tmp/a.json"],
            workspaces: [],
          },
          storeDistribution: false,
          canUndo: false,
          canRedo: false,
          selectedTaskId: null,
          selectedTaskCount: 0,
          linkSourceId: null,
          lineageActive: false,
        }}
      />,
    );
    expect(screen.queryByRole("option", { name: /最近開いたファイル/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "履歴を消す" })).not.toBeInTheDocument();
    expect(screen.queryByText("a.json")).not.toBeInTheDocument();
  });

  it("omits the screen-state settings section in the browser", () => {
    const { rerender } = render(
      <SettingsDesktopSectionButtons section="display" onSelect={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "画面の状態を渡す" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "更新" })).not.toBeInTheDocument();
    vi.mocked(isTauri).mockReturnValue(true);
    rerender(<SettingsDesktopSectionButtons section="display" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "画面の状態を渡す" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新" })).toBeInTheDocument();
  });
});

function BrowserWatchProbe() {
  const [polls, setPolls] = useState(0);
  const [writes, setWrites] = useState(0);
  useEffect(() => {
    const stopPoll = scheduleFilePoll(false, "/tmp/regression.schedule.json", () => {
      setPolls((count) => count + 1);
    }, EXTERNAL_RELOAD_POLL_MS);
    const stopWrite = scheduleFilterWrite(false, "/tmp/regression.schedule.json", () => {
      setWrites((count) => count + 1);
    }, RECOVERY_DEBOUNCE_MS);
    return () => {
      stopPoll();
      stopWrite();
    };
  }, []);
  return (
    <p>
      {polls}/{writes}/{shouldAttachDesktopFileBridge(false) ? "購読" : "購読しない"}
    </p>
  );
}

describe("browser does not watch or open dropped files", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prevents the browser from navigating when a file is dropped", () => {
    installBrowserFileDropGuard();
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    const dragover = new Event("dragover", { bubbles: true, cancelable: true });
    window.dispatchEvent(dragover);
    window.dispatchEvent(drop);
    expect(dragover.defaultPrevented).toBe(true);
    expect(drop.defaultPrevented).toBe(true);
  });

  it("does not subscribe to schedule drops outside Tauri", () => {
    const subscribe = vi.fn(() => () => undefined);
    expect(shouldAttachDesktopFileBridge(false)).toBe(false);
    if (shouldAttachDesktopFileBridge(false)) subscribe();
    expect(subscribe).not.toHaveBeenCalled();
    expect(shouldAttachDesktopFileBridge(true)).toBe(true);
  });

  it("does not poll an external file or write filters in the browser", async () => {
    render(<BrowserWatchProbe />);
    await vi.advanceTimersByTimeAsync(EXTERNAL_RELOAD_POLL_MS * 4 + RECOVERY_DEBOUNCE_MS);
    expect(screen.getByText("0/0/購読しない")).toBeInTheDocument();
  });
});

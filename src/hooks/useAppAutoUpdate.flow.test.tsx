import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "../components/SettingsDialog";
import { DEFAULT_SIDEBAR_COLUMNS } from "../model/viewPreferences";
import { AUTO_UPDATE_LS_KEY, WINDOWS_STABLE_STORE_UPDATE_MESSAGE } from "../model/autoUpdate";
import { useAppUpdateFlow } from "./useAppAutoUpdate";

const checkMock = vi.hoisted(() => vi.fn());
const invoke = vi.hoisted(() => vi.fn());
const eventHandlers = vi.hoisted(
  () => new Map<string, (...args: unknown[]) => void>(),
);

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: () => checkMock(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke,
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: async () => "1.4.1",
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ label: "main" }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, handler: (...args: unknown[]) => void) => {
    eventHandlers.set(name, handler);
    return () => {
      eventHandlers.delete(name);
    };
  }),
}));

function emitBackendEvent(name: string, payload?: unknown) {
  const handler = eventHandlers.get(name);
  if (!handler) return;
  if (payload === undefined) {
    handler();
    return;
  }
  handler({ payload });
}

const catalog = {
  settings: { selectedCatalogId: null, catalogs: [] },
  selectedCatalogLabel: null,
  onImport: vi.fn(async () => {}),
  onSelectCatalog: vi.fn(async () => {}),
  onDeleteCatalog: vi.fn(async () => {}),
  onOpenEditor: vi.fn(),
};

type HarnessProps = {
  startupSettled?: boolean;
  settingsOpen?: boolean;
  settingsSection?: string;
  sectionToggle?: boolean;
};

function UpdateFlowProbe({
  startupSettled: initialSettled = false,
  settingsOpen = false,
  settingsSection: initialSection = "display",
  sectionToggle = false,
}: HarnessProps) {
  const [startupSettled, setStartupSettled] = useState(initialSettled);
  const [settingsSection, setSettingsSection] = useState(initialSection);
  const flow = useAppUpdateFlow({
    startupSettled,
    settingsOpen,
    settingsSection,
    storeDistribution: false,
    onCloseSettings: vi.fn(),
    onUpdateToast: vi.fn(),
    prepareForApplicationUpdate: async () => true,
    onUpdatePromptCancel: vi.fn(),
  });

  return (
    <div>
      <span data-testid="phase">{flow.uiState.phase}</span>
      <span data-testid="message">{flow.uiState.message ?? ""}</span>
      <span data-testid="version">{flow.uiState.version ?? ""}</span>
      <span data-testid="corner">{flow.showCornerNotice ? "yes" : "no"}</span>
      <span data-testid="settings-panel">{flow.showSettingsUpdatePanel ? "yes" : "no"}</span>
      <button type="button" onClick={() => setStartupSettled(true)}>
        起動完了
      </button>
      <button type="button" onClick={() => flow.requestManualUpdateCheck()}>
        更新を確認
      </button>
      <button type="button" onClick={() => flow.requestManualUpdateCheck(true)}>
        設定内で更新を確認
      </button>
      <button type="button" onClick={() => flow.onLater()}>
        あとで
      </button>
      {sectionToggle ? (
        <button type="button" onClick={() => setSettingsSection("updates")}>
          更新セクションを開く
        </button>
      ) : null}
    </div>
  );
}

function makeUpdate(remoteVersion: string) {
  return {
    version: remoteVersion,
    currentVersion: "1.4.1",
    close: vi.fn(async () => {}),
    downloadAndInstall: vi.fn(async () => {}),
  };
}

describe("application update flow", () => {
  beforeEach(() => {
    localStorage.clear();
    checkMock.mockReset();
    invoke.mockReset();
    eventHandlers.clear();
    invoke.mockImplementation(async (command: string) => {
      if (command === "read_focused_window_label") return "main";
      if (command === "is_any_schedule_window_focused") return true;
      if (command === "list_open_window_labels") return ["main"];
      return undefined;
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("TC-SET-06d: does not check for updates until the backend asks", async () => {
    render(<UpdateFlowProbe />);
    fireEvent.click(screen.getByRole("button", { name: "起動完了" }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("report_startup_settled", {
        autoUpdateAtStartup: false,
      });
    });
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("TC-SET-06e: shows an offer after startup when a same-major update exists", async () => {
    localStorage.setItem(AUTO_UPDATE_LS_KEY, "on");
    checkMock.mockResolvedValue(makeUpdate("1.4.2"));
    render(<UpdateFlowProbe startupSettled />);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("report_startup_settled", {
        autoUpdateAtStartup: true,
      });
    });
    emitBackendEvent("application-run-update-check");
    await waitFor(() => {
      expect(checkMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId("phase")).toHaveTextContent("offer");
    });
    expect(screen.getByTestId("message")).toHaveTextContent("バージョン 1.4.2 があります");
    expect(screen.getByTestId("corner")).toHaveTextContent("yes");
  });

  it("TC-SET-06k: ignores a newer major on automatic check", async () => {
    localStorage.setItem(AUTO_UPDATE_LS_KEY, "on");
    const rejected = makeUpdate("2.0.0");
    checkMock.mockResolvedValue(rejected);
    render(<UpdateFlowProbe />);
    fireEvent.click(screen.getByRole("button", { name: "起動完了" }));
    emitBackendEvent("application-run-update-check");
    await waitFor(() => {
      expect(rejected.close).toHaveBeenCalled();
    });
    expect(screen.getByTestId("phase")).toHaveTextContent("idle");
  });

  it("TC-SET-06m: manual check with no update shows the latest message", async () => {
    checkMock.mockResolvedValue(null);
    render(<UpdateFlowProbe startupSettled />);
    fireEvent.click(screen.getByRole("button", { name: "更新を確認" }));
    await waitFor(() => {
      expect(screen.getByTestId("message")).toHaveTextContent("この版が最新です");
    });
  });

  it("TC-SET-06m2: manual check with an update shows the same offer as startup", async () => {
    checkMock.mockResolvedValue(makeUpdate("1.4.3"));
    render(<UpdateFlowProbe startupSettled />);
    fireEvent.click(screen.getByRole("button", { name: "更新を確認" }));
    await waitFor(() => {
      expect(screen.getByTestId("phase")).toHaveTextContent("offer");
    });
    expect(screen.getByTestId("message")).toHaveTextContent("バージョン 1.4.3 があります");
  });

  it("TC-SET-06m3: manual check shows a failure message when check throws", async () => {
    checkMock.mockRejectedValue(new Error("network down"));
    render(<UpdateFlowProbe startupSettled />);
    fireEvent.click(screen.getByRole("button", { name: "設定内で更新を確認" }));
    await waitFor(() => {
      expect(screen.getByTestId("message")).toHaveTextContent("更新の確認に失敗しました");
    });
    expect(screen.getByTestId("settings-panel")).toHaveTextContent("no");
  });

  it("TC-SET-06m4: manual check treats missing platform as latest on non-Windows", async () => {
    checkMock.mockRejectedValue(
      new Error("Could not fetch a valid release JSON from the remote"),
    );
    render(<UpdateFlowProbe startupSettled />);
    fireEvent.click(screen.getByRole("button", { name: "設定内で更新を確認" }));
    await waitFor(() => {
      expect(screen.getByTestId("message")).toHaveTextContent("この版が最新です");
    });
  });

  it("TC-SET-06t: manual check redirects Windows stable users to the Store message", async () => {
    vi.stubGlobal("navigator", {
      platform: "Win32",
      userAgent: "Windows",
    });
    checkMock.mockRejectedValue(
      new Error("platform `windows-x86_64` was not found in the response `platforms` object"),
    );
    render(<UpdateFlowProbe startupSettled />);
    fireEvent.click(screen.getByRole("button", { name: "設定内で更新を確認" }));
    await waitFor(() => {
      expect(screen.getByTestId("message")).toHaveTextContent(
        WINDOWS_STABLE_STORE_UPDATE_MESSAGE,
      );
    });
    vi.unstubAllGlobals();
  });

  it("TC-SET-06n: hides the corner notice in settings until the updates section is open", async () => {
    checkMock.mockResolvedValue(makeUpdate("1.4.2"));
    render(
      <UpdateFlowProbe
        startupSettled
        settingsOpen
        settingsSection="display"
        sectionToggle
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "更新を確認" }));
    await waitFor(() => {
      expect(screen.getByTestId("phase")).toHaveTextContent("offer");
    });
    expect(screen.getByTestId("corner")).toHaveTextContent("no");
    fireEvent.click(screen.getByRole("button", { name: "更新セクションを開く" }));
    await waitFor(() => {
      expect(screen.getByTestId("settings-panel")).toHaveTextContent("yes");
    });
  });

  it("TC-SET-06c: syncs update UI from other windows through application-update-ui-sync", async () => {
    render(<UpdateFlowProbe startupSettled />);
    emitBackendEvent("application-update-ui-sync", {
      phase: "offer",
      version: "1.4.2",
      message: "バージョン 1.4.2 があります",
      infoEphemeral: false,
      checkLabel: "main",
    });
    await waitFor(() => {
      expect(screen.getByTestId("phase")).toHaveTextContent("offer");
    });
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("TC-SET-07: shows the version on display, members, and updates in settings", async () => {
    render(
      <SettingsDialog
        open
        memberCatalog={catalog}
        statusCatalog={catalog}
        colorCatalog={catalog}
        calendarLabel={null}
        displayScalePreference="auto"
        onDisplayScaleChange={vi.fn()}
        colorSchemePreference="system"
        onColorSchemeChange={vi.fn()}
        rowDensity="comfortable"
        onRowDensityChange={vi.fn()}
        showLightningLine={false}
        onShowLightningLineChange={vi.fn()}
        sidebarColumns={DEFAULT_SIDEBAR_COLUMNS}
        onSidebarColumnsChange={vi.fn()}
        onClose={vi.fn()}
        onImportCalendar={async () => {}}
        onDeleteCalendar={async () => {}}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "設定" });
    expect(await screen.findByText("バージョン 1.4.1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "メンバー" }));
    expect(dialog).toHaveTextContent("バージョン 1.4.1");
    fireEvent.click(screen.getByRole("button", { name: "更新" }));
    expect(dialog).toHaveTextContent("バージョン 1.4.1");
  });
});

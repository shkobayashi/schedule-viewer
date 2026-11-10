import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "./SettingsDialog";
import { DEFAULT_SIDEBAR_COLUMNS } from "../model/viewPreferences";

const invoke = vi.hoisted(() =>
  vi.fn(async (command: string, args?: { params?: Record<string, unknown> }) => {
    if (command === "json_skill_home_dirs") {
      return { cursor: true, claude: true, copilot: true };
    }
    if (command === "get_executable_path") {
      return "/usr/bin/schedule-viewer";
    }
    if (command === "install_json_skills") {
      return {
        installedPaths: [],
        existingPaths: ["/home/user/.cursor/skills/write-schedule/SKILL.md"],
        claudeUserShadows: [],
      };
    }
    if (command === "install_read_screen_skill") {
      return {
        installedPaths: ["/home/user/.copilot/skills/read-screen/SKILL.md"],
        existingPaths: [],
        executablePath: "/usr/bin/schedule-viewer",
      };
    }
    if (command === "uninstall_read_screen_skill") {
      return {
        removedPaths: ["/home/user/.copilot/skills/read-screen"],
        missingPaths: [],
      };
    }
    void args;
    return null;
  }),
);

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke,
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: async () => "9.9.9",
}));

const catalog = {
  settings: { selectedCatalogId: null, catalogs: [] },
  selectedCatalogLabel: null,
  onImport: vi.fn(async () => {}),
  onSelectCatalog: vi.fn(async () => {}),
  onDeleteCatalog: vi.fn(async () => {}),
  onOpenEditor: vi.fn(),
};

function renderSettings() {
  return render(
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
}

describe("desktop settings chrome", () => {
  beforeEach(() => {
    invoke.mockClear();
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

  it("shows the version line on display, members, and updates", async () => {
    renderSettings();
    const dialog = screen.getByRole("dialog", { name: "設定" });
    const version = await within(dialog).findByText("バージョン 9.9.9");
    fireEvent.click(version);
    expect(screen.getByRole("dialog", { name: "設定" })).toBe(dialog);
    expect(within(dialog).queryByRole("heading", { name: "変更履歴" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "メンバー" }));
    expect(within(dialog).getByText("バージョン 9.9.9")).toBeInTheDocument();
    expect(within(dialog).queryByRole("heading", { name: "変更履歴" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "更新" }));
    expect(within(dialog).getByText("バージョン 9.9.9")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "変更履歴" })).toBeInTheDocument();
  });

  it("disables install and remove when every skill target is unchecked", async () => {
    renderSettings();
    const dialog = screen.getByRole("dialog", { name: "設定" });
    fireEvent.click(within(dialog).getByRole("button", { name: "JSON作成スキルを置く" }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("json_skill_home_dirs");
    });
    for (const name of ["Cursor", "Claude Code", "GitHub Copilot"]) {
      fireEvent.click(within(dialog).getByRole("checkbox", { name }));
    }
    expect(within(dialog).getByRole("button", { name: "置く" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "外す" })).toBeDisabled();
  });

  it("shows the overwrite confirmation when install reports existing paths", async () => {
    renderSettings();
    const dialog = screen.getByRole("dialog", { name: "設定" });
    fireEvent.click(within(dialog).getByRole("button", { name: "JSON作成スキルを置く" }));
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "置く" })).toBeEnabled();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "置く" }));
    expect(
      await within(dialog).findByText("次の場所に同名のスキルがあります。上書きしますか？中身はマージしません。"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("/home/user/.cursor/skills/write-schedule/SKILL.md"),
    ).toBeInTheDocument();
  });

  async function openMcpSection() {
    renderSettings();
    const dialog = screen.getByRole("dialog", { name: "設定" });
    fireEvent.click(within(dialog).getByRole("button", { name: "画面の状態を渡す" }));
    await waitFor(() => {
      expect(within(dialog).getByRole("heading", { name: "mcp.json に登録する" })).toBeInTheDocument();
    });
    return dialog;
  }

  it("copies the mcp json of the executable and invokes only get_executable_path", async () => {
    const dialog = await openMcpSection();
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_executable_path");
    });
    const textarea = within(dialog).getByRole("textbox");
    const parsed = JSON.parse(textarea.textContent ?? "") as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(parsed.mcpServers["schedule-viewer"].command).toBe("/usr/bin/schedule-viewer");
    expect(parsed.mcpServers["schedule-viewer"].args).toEqual(["--mcp"]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "コピー" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(textarea.textContent);
    });
    const calls = invoke.mock.calls.map(([name]) => name);
    expect(calls.filter((name) => name === "get_executable_path")).toHaveLength(1);
    expect(calls).not.toContain("install_read_screen_skill");
  });

  it("shows the copilot read-screen path and the executable after placing", async () => {
    const dialog = await openMcpSection();
    await waitFor(() => {
      expect(within(dialog).getByRole("checkbox", { name: "GitHub Copilot" })).toBeChecked();
    });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Cursor" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Claude Code" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "置く" }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("install_read_screen_skill", {
        params: { cursor: false, claude: false, copilot: true, replace: false },
      });
    });
    expect(within(dialog).getByText("置いたパス:")).toBeInTheDocument();
    expect(
      within(dialog).getByText("/home/user/.copilot/skills/read-screen/SKILL.md"),
    ).toBeInTheDocument();
    const executableLine = within(dialog).getByText(/検出した実行ファイル:/);
    expect(executableLine.textContent).toContain("/usr/bin/schedule-viewer");
  });

  it("shows only the removed read-screen path after confirming uninstall", async () => {
    const dialog = await openMcpSection();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Cursor" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Claude Code" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "外す" }));
    expect(within(dialog).getByText(/read-screen だけを外します/)).toBeInTheDocument();
    const confirmUninstall = within(dialog)
      .getAllByRole("button", { name: "外す" })
      .find((button) => button.closest(".settings-confirm") !== null);
    fireEvent.click(confirmUninstall!);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("uninstall_read_screen_skill", {
        params: { cursor: false, claude: false, copilot: true },
      });
    });
    expect(within(dialog).getByText("外したパス:")).toBeInTheDocument();
    expect(within(dialog).getByText("/home/user/.copilot/skills/read-screen")).toBeInTheDocument();
  });

  it("disables place and remove when every read-screen target is unchecked", async () => {
    const dialog = await openMcpSection();
    for (const name of ["Cursor", "Claude Code", "GitHub Copilot"]) {
      const box = within(dialog).getByRole("checkbox", { name });
      if ((box as HTMLInputElement).checked) {
        fireEvent.click(box);
      }
    }
    expect(within(dialog).getByRole("button", { name: "置く" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "外す" })).toBeDisabled();
  });
});

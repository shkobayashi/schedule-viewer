import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "./SettingsDialog";
import { DEFAULT_SIDEBAR_COLUMNS } from "../model/viewPreferences";

const invoke = vi.hoisted(() =>
  vi.fn(async (command: string) => {
    if (command === "json_skill_home_dirs") {
      return { cursor: true, claude: true, copilot: true };
    }
    if (command === "install_json_skills") {
      return {
        installedPaths: [],
        existingPaths: ["/home/user/.cursor/skills/write-schedule/SKILL.md"],
        claudeUserShadows: [],
      };
    }
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
});

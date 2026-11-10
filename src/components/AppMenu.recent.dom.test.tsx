import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { AppMenu } from "./AppMenu";
import {
  SHARED_FILE_MENU_ROWS,
  type SharedFileMenuActionId,
} from "../model/appMenuStructure";
import { dispatchSharedFileMenuAction } from "../operations/dispatchPaletteCommand";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  invoke: vi.fn(),
}));

const handlers = {
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

describe("AppMenu recent files (desktop)", () => {
  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(true);
    Object.values(handlers).forEach((fn) => fn.mockClear());
    Element.prototype.scrollIntoView = () => undefined;
  });

  it("lists schedule and workspace recent files, shows the path on hover, and clears history", async () => {
    const user = userEvent.setup();
    render(
      <AppMenu
        {...handlers}
        recentFilesStore={{
          schedules: ["/tmp/regression.schedule.json"],
          workspaces: ["/proj/workspace.json"],
        }}
      />,
    );
    await user.click(screen.getByTitle("メニュー"));
    const recent = screen.getByRole("menuitem", { name: /最近開いたファイル/ });
    await user.click(recent);
    const submenu = document.querySelector(".app-menu-submenu-panel");
    expect(submenu).toBeTruthy();
    expect(submenu).toHaveTextContent("regression.schedule.json");
    expect(submenu).toHaveTextContent("workspace.json");
    const scheduleItem = within(submenu as HTMLElement).getByRole("menuitem", {
      name: /スケジュール regression/,
    });
    expect(scheduleItem).toHaveAttribute("title", "/tmp/regression.schedule.json");
    await user.click(screen.getByRole("menuitem", { name: "履歴を消す" }));
    expect(handlers.onClearRecentHistory).toHaveBeenCalledTimes(1);
  });

  it("keeps a disabled recent-files row when the list is empty", () => {
    render(
      <AppMenu
        {...handlers}
        recentFilesStore={{ schedules: [], workspaces: [] }}
        recentFilesEmptyHint="ファイルを開くとここに並びます"
      />,
    );
    fireEvent.click(screen.getByTitle("メニュー"));
    const recent = screen.getByRole("menuitem", { name: /最近開いたファイル/ });
    expect(recent).toBeDisabled();
    expect(screen.getByText("ファイルを開くとここに並びます")).toBeInTheDocument();
  });

  it("registers macOS file save on the same action as the app menu", () => {
    const saveRow = SHARED_FILE_MENU_ROWS.find(
      (row) => row.kind === "action" && row.id === "save",
    );
    expect(saveRow?.kind).toBe("action");
  if (saveRow?.kind === "action") {
      render(<AppMenu {...handlers} />);
      fireEvent.click(screen.getByTitle("メニュー"));
      fireEvent.click(screen.getByRole("menuitem", { name: /^保存/ }));
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
      const macHandlers = {
        onOpen: vi.fn(),
        onOpenInNewWindow: vi.fn(),
        onSave: vi.fn(),
        onSaveAs: vi.fn(),
        onExportHtml: vi.fn(),
        onShowJson: vi.fn(),
        onShowDiff: vi.fn(),
        onCopyDiff: vi.fn(),
      };
      dispatchSharedFileMenuAction("save" as SharedFileMenuActionId, macHandlers);
      expect(macHandlers.onSave).toHaveBeenCalledTimes(1);
    }
  });

  it("opens the first recent schedule when chosen from the submenu", async () => {
    const user = userEvent.setup();
    const path = "/tmp/smoke.schedule.json";
    render(
      <AppMenu
        {...handlers}
        recentFilesStore={{ schedules: [path, "/older.json"], workspaces: [] }}
      />,
    );
    await user.click(screen.getByTitle("メニュー"));
    await user.click(screen.getByRole("menuitem", { name: /最近開いたファイル/ }));
    const menus = screen.getAllByRole("menu");
    const recentMenu = menus[menus.length - 1];
    if (!recentMenu) throw new Error("recent submenu missing");
    await user.click(
      within(recentMenu).getByRole("menuitem", {
        name: /スケジュール smoke\.schedule\.json/,
      }),
    );
    expect(handlers.onOpenRecent).toHaveBeenCalledWith(path, "schedule");
  });
});

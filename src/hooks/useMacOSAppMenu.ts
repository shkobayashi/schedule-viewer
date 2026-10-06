import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { GridTier } from "../model/timeline";

export type MacOSAppMenuHandlers = {
  fileBusy: () => boolean;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onShowJson: () => void;
  onShowDiff: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onGoToday: () => void;
  onSetTier: (tier: GridTier) => void;
  onFit: () => void;
};

function isMacPlatform(): boolean {
  const platform = navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function useMacOSAppMenu(handlers: MacOSAppMenuHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isTauri() || !isMacPlatform()) return;
    let cancelled = false;

    const run = async () => {
      const h = () => handlersRef.current;
      const fileItem = (
        id: string,
        text: string,
        action: () => void,
        needsIdle = true,
      ) =>
        MenuItem.new({
          id,
          text,
          action: () => {
            if (needsIdle && h().fileBusy()) return;
            action();
          },
        });

      const appSubmenu = await Submenu.new({
        text: "schedule-viewer",
        items: [
          await PredefinedMenuItem.new({ item: "Hide" }),
          await PredefinedMenuItem.new({ item: "HideOthers" }),
          await PredefinedMenuItem.new({ item: "ShowAll" }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({
            id: "app-quit",
            text: "schedule-viewer を終了",
            accelerator: "Command+Q",
            action: () => {
              void getCurrentWindow().close();
            },
          }),
        ],
      });

      const fileSubmenu = await Submenu.new({
        text: "ファイル",
        items: [
          await fileItem("file-open", "開く", () => h().onOpen()),
          await fileItem("file-save", "保存", () => h().onSave()),
          await fileItem("file-save-as", "別名保存", () => h().onSaveAs()),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await fileItem("file-export", "書き出し", () => h().onExportHtml(), false),
          await fileItem("file-json", "JSON を表示", () => h().onShowJson(), false),
          await fileItem("file-diff", "差分を表示", () => h().onShowDiff()),
        ],
      });

      const editSubmenu = await Submenu.new({
        text: "編集",
        items: [
          await PredefinedMenuItem.new({ item: "Undo" }),
          await PredefinedMenuItem.new({ item: "Redo" }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await PredefinedMenuItem.new({ item: "Cut" }),
          await PredefinedMenuItem.new({ item: "Copy" }),
          await PredefinedMenuItem.new({ item: "Paste" }),
          await PredefinedMenuItem.new({ item: "SelectAll" }),
        ],
      });

      const viewSubmenu = await Submenu.new({
        text: "表示",
        items: [
          await MenuItem.new({
            id: "view-shortcuts",
            text: "ショートカット一覧",
            action: () => h().onOpenShortcuts(),
          }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({
            id: "view-today",
            text: "今日",
            action: () => h().onGoToday(),
          }),
          await MenuItem.new({
            id: "view-day",
            text: "日表示",
            action: () => h().onSetTier("day"),
          }),
          await MenuItem.new({
            id: "view-week",
            text: "週表示",
            action: () => h().onSetTier("week"),
          }),
          await MenuItem.new({
            id: "view-month",
            text: "月表示",
            action: () => h().onSetTier("month"),
          }),
          await MenuItem.new({
            id: "view-fit",
            text: "全体",
            action: () => h().onFit(),
          }),
        ],
      });

      const menu = await Menu.new({
        items: [appSubmenu, fileSubmenu, editSubmenu, viewSubmenu],
      });
      if (cancelled) return;
      await menu.setAsAppMenu();
    };

    void run().catch(() => {
      /* メニューが使えない環境では ☰ のまま */
    });

    return () => {
      cancelled = true;
    };
  }, []);
}

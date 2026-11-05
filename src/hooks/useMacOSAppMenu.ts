import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { RecentFilesStore } from "../model/recentFiles";
import { RECENT_FILES_EMPTY_HINT } from "../model/firstRunGuidance";
import {
  macMenuAccelerator,
  macSharedMenuAccelerator,
  SHARED_FILE_MENU_ROWS,
  type SharedFileMenuActionId,
} from "../model/appMenuStructure";
import { OPERATION_FORMAL } from "../model/operationLabels";
import { recentMenuSections } from "../model/recentFilesMenu";
import { requestApplicationQuitViaTauri } from "../model/windowSession";
import type { GridTier } from "../model/timeline";

export type MacOSAppMenuHandlers = {
  fileBusy: () => boolean;
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onClearRecentHistory: () => void;
  onOpenInNewWindow: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onExportWorkspace?: () => void;
  onShowJson: () => void;
  onShowDiff: () => void;
  onCopyDiff: () => void;
  onOpenGuide: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onCheckForUpdates?: () => void;
  onGoToday: () => void;
  onSetTier: (tier: GridTier) => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  /** ステータス編集の覆いが開いているあいだは、文字欄でも `onUndo` / `onRedo` だけを使う。 */
  statusCatalogEditorBlocksDocumentUndo?: () => boolean;
};

function isMacPlatform(): boolean {
  const platform = navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function isTextFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useMacOSAppMenu(
  handlers: MacOSAppMenuHandlers,
  recentFilesStore: RecentFilesStore,
): void {
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
        accelerator?: string,
      ) =>
        MenuItem.new({
          id,
          text,
          ...(accelerator ? { accelerator } : {}),
          action: () => {
            if (needsIdle && h().fileBusy()) return;
            action();
          },
        });

      const fileAction = (menuId: SharedFileMenuActionId): (() => void) => {
        switch (menuId) {
          case "open":
            return () => h().onOpen();
          case "openNewWindow":
            return () => h().onOpenInNewWindow();
          case "save":
            return () => h().onSave();
          case "saveAs":
            return () => h().onSaveAs();
          case "exportHtml":
            return () => h().onExportHtml();
          case "exportWorkspace":
            return () => h().onExportWorkspace?.();
          case "showJson":
            return () => h().onShowJson();
          case "showDiff":
            return () => h().onShowDiff();
          case "copyDiff":
            return () => h().onCopyDiff();
          default:
            return () => {};
        }
      };

      const appSubmenu = await Submenu.new({
        text: "schedule-viewer",
        items: [
          await PredefinedMenuItem.new({ item: "Hide" }),
          await PredefinedMenuItem.new({ item: "HideOthers" }),
          await PredefinedMenuItem.new({ item: "ShowAll" }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          ...(h().onCheckForUpdates
            ? [
                await MenuItem.new({
                  id: "app-check-updates",
                  text: OPERATION_FORMAL.checkForUpdates,
                  action: () => h().onCheckForUpdates?.(),
                }),
                await PredefinedMenuItem.new({ item: "Separator" }),
              ]
            : []),
          await MenuItem.new({
            id: "app-quit",
            text: "schedule-viewer を終了",
            accelerator: "Command+Q",
            action: () => {
              void requestApplicationQuitViaTauri();
            },
          }),
        ],
      });

      const recentSections = recentMenuSections(recentFilesStore);
      const recentMenuItems: (
        | Awaited<ReturnType<typeof MenuItem.new>>
        | Awaited<ReturnType<typeof PredefinedMenuItem.new>>
      )[] = [];
      let recentIndex = 0;
      for (let sectionIndex = 0; sectionIndex < recentSections.length; sectionIndex++) {
        const section = recentSections[sectionIndex];
        if (sectionIndex > 0) {
          recentMenuItems.push(
            await PredefinedMenuItem.new({ item: "Separator" }),
          );
        }
        recentMenuItems.push(
          await MenuItem.new({
            id: `file-recent-heading-${sectionIndex}`,
            text: section.heading,
            enabled: false,
          }),
        );
        for (const entry of section.items) {
          const index = recentIndex++;
          recentMenuItems.push(
            await fileItem(
              `file-recent-${index}`,
              entry.label,
              () => h().onOpenRecent(entry.path),
            ),
          );
        }
      }
      const recentMenuSlot =
        recentSections.length > 0
          ? await Submenu.new({
              text: OPERATION_FORMAL.recentFiles,
              items: [
                ...recentMenuItems,
                await PredefinedMenuItem.new({ item: "Separator" }),
                await MenuItem.new({
                  id: "file-clear-recent",
                  text: OPERATION_FORMAL.clearRecentHistory,
                  action: () => h().onClearRecentHistory(),
                }),
              ],
            })
          : await Submenu.new({
              text: OPERATION_FORMAL.recentFiles,
              enabled: false,
              items: [
                await MenuItem.new({
                  id: "file-recent-empty-hint",
                  text: RECENT_FILES_EMPTY_HINT,
                  enabled: false,
                }),
              ],
            });

      const fileSubmenuItems: (
        | Awaited<ReturnType<typeof MenuItem.new>>
        | Awaited<ReturnType<typeof PredefinedMenuItem.new>>
        | Awaited<ReturnType<typeof Submenu.new>>
      )[] = [];

      for (const row of SHARED_FILE_MENU_ROWS) {
        if (row.kind === "separator") {
          fileSubmenuItems.push(
            await PredefinedMenuItem.new({ item: "Separator" }),
          );
          continue;
        }
        if (row.kind === "recentSubmenu") {
          fileSubmenuItems.push(recentMenuSlot);
          continue;
        }
        if (row.id === "exportWorkspace" && !h().onExportWorkspace) continue;
        fileSubmenuItems.push(
          await fileItem(
            `file-${row.id}`,
            row.label,
            fileAction(row.id),
            row.locksWithFileIdle,
            macMenuAccelerator(row),
          ),
        );
      }

      fileSubmenuItems.push(
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: "file-settings",
          text: OPERATION_FORMAL.settings,
          accelerator: macSharedMenuAccelerator("settings"),
          action: () => h().onOpenSettings(),
        }),
      );

      const fileSubmenu = await Submenu.new({
        text: "ファイル",
        items: fileSubmenuItems,
      });

      const editSubmenu = await Submenu.new({
        text: "編集",
        items: [
          await MenuItem.new({
            id: "edit-undo",
            text: OPERATION_FORMAL.undo,
            accelerator: "Command+Z",
            action: () => {
              const handlers = h();
              if (handlers.statusCatalogEditorBlocksDocumentUndo?.()) {
                handlers.onUndo();
                return;
              }
              const active = document.activeElement;
              if (isTextFieldTarget(active)) {
                document.execCommand("undo");
                return;
              }
              handlers.onUndo();
            },
          }),
          await MenuItem.new({
            id: "edit-redo",
            text: OPERATION_FORMAL.redo,
            accelerator: "Shift+Command+Z",
            action: () => {
              const handlers = h();
              if (handlers.statusCatalogEditorBlocksDocumentUndo?.()) {
                handlers.onRedo();
                return;
              }
              const active = document.activeElement;
              if (isTextFieldTarget(active)) {
                document.execCommand("redo");
                return;
              }
              handlers.onRedo();
            },
          }),
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
            id: "view-guide",
            text: OPERATION_FORMAL.guide,
            action: () => h().onOpenGuide(),
          }),
          await MenuItem.new({
            id: "view-shortcuts",
            text: OPERATION_FORMAL.shortcuts,
            action: () => h().onOpenShortcuts(),
          }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({
            id: "view-today",
            text: OPERATION_FORMAL.goToday,
            accelerator: macSharedMenuAccelerator("goToday"),
            action: () => h().onGoToday(),
          }),
          await MenuItem.new({
            id: "view-day",
            text: OPERATION_FORMAL.tierDay,
            accelerator: macSharedMenuAccelerator("tierDay"),
            action: () => h().onSetTier("day"),
          }),
          await MenuItem.new({
            id: "view-week",
            text: OPERATION_FORMAL.tierWeek,
            accelerator: macSharedMenuAccelerator("tierWeek"),
            action: () => h().onSetTier("week"),
          }),
          await MenuItem.new({
            id: "view-month",
            text: OPERATION_FORMAL.tierMonth,
            accelerator: macSharedMenuAccelerator("tierMonth"),
            action: () => h().onSetTier("month"),
          }),
          await MenuItem.new({
            id: "view-fit",
            text: OPERATION_FORMAL.fit,
            accelerator: macSharedMenuAccelerator("fit"),
            action: () => h().onFit(),
          }),
        ],
      });

      const windowSubmenu = await Submenu.new({
        text: "ウィンドウ",
        items: [
          await MenuItem.new({
            id: "window-close",
            text: "閉じる",
            accelerator: "Command+W",
            action: () => {
              void getCurrentWindow().close();
            },
          }),
          await PredefinedMenuItem.new({ item: "Minimize" }),
        ],
      });

      const menu = await Menu.new({
        items: [appSubmenu, fileSubmenu, editSubmenu, viewSubmenu, windowSubmenu],
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
  }, [recentFilesStore]);
}

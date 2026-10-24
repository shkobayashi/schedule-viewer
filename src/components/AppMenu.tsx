import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RecentFilesStore } from "../model/recentFiles";
import {
  hasRecentMenuItems,
  recentMenuItemAriaLabel,
  recentMenuSections,
} from "../model/recentFilesMenu";
import { fileShortcutHint, usesCommandKey } from "../model/shortcuts";
import { anchorBelowRect, menuShiftForRect } from "./anchoredMenu";
import { focusMenuEdge, moveMenuFocus } from "./menuFocus";

const RECENT_SUBMENU_CLOSE_DELAY_MS = 200;

type AppMenuProps = {
  fileBusy?: boolean;
  startupSettled?: boolean;
  onOpen: () => void;
  recentFilesStore?: RecentFilesStore;
  onRefreshRecentFiles?: () => void;
  onOpenRecent?: (path: string, kind: "schedule" | "workspace") => void;
  onClearRecentHistory?: () => void;
  onOpenInNewWindow?: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onExportWorkspace?: () => void;
  onShowJson: () => void;
  onShowDiff: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenShortcuts: () => void;
  onCheckForUpdates?: () => void;
};

export function AppMenu({
  fileBusy = false,
  startupSettled = true,
  onOpen,
  recentFilesStore = { schedules: [], workspaces: [] },
  onRefreshRecentFiles,
  onOpenRecent,
  onClearRecentHistory,
  onOpenInNewWindow,
  onSave,
  onSaveAs,
  onExportHtml,
  onExportWorkspace,
  onShowJson,
  onShowDiff,
  onOpenSettings,
  onOpenGuide,
  onOpenShortcuts,
  onCheckForUpdates,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const [recentSubmenuOpen, setRecentSubmenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recentRowRef = useRef<HTMLButtonElement>(null);
  const recentSubmenuRef = useRef<HTMLDivElement>(null);
  const recentSubmenuCloseTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const [recentSubmenuPosition, setRecentSubmenuPosition] = useState({
    left: 0,
    top: 0,
  });
  const [recentSubmenuShift, setRecentSubmenuShift] = useState({ x: 0, y: 0 });
  const [menuFileActionsLocked, setMenuFileActionsLocked] = useState(false);
  const fileBusyRef = useRef(fileBusy);
  const startupSettledRef = useRef(startupSettled);
  fileBusyRef.current = fileBusy;
  startupSettledRef.current = startupSettled;

  const cancelRecentSubmenuClose = useCallback(() => {
    if (recentSubmenuCloseTimerRef.current !== null) {
      window.clearTimeout(recentSubmenuCloseTimerRef.current);
      recentSubmenuCloseTimerRef.current = null;
    }
  }, []);

  const scheduleRecentSubmenuClose = useCallback(() => {
    cancelRecentSubmenuClose();
    recentSubmenuCloseTimerRef.current = window.setTimeout(() => {
      recentSubmenuCloseTimerRef.current = null;
      setRecentSubmenuOpen(false);
    }, RECENT_SUBMENU_CLOSE_DELAY_MS);
  }, [cancelRecentSubmenuClose]);

  const openRecentSubmenu = useCallback(() => {
    if (!hasRecentMenuItems(recentFilesStore)) return;
    cancelRecentSubmenuClose();
    setRecentSubmenuOpen(true);
  }, [cancelRecentSubmenuClose, recentFilesStore]);

  useLayoutEffect(() => {
    if (!hasRecentMenuItems(recentFilesStore)) {
      setRecentSubmenuOpen(false);
      cancelRecentSubmenuClose();
    }
  }, [recentFilesStore, cancelRecentSubmenuClose]);

  useLayoutEffect(() => {
    if (open) {
      setMenuFileActionsLocked(
        fileBusyRef.current || !startupSettledRef.current,
      );
      if (isTauri()) {
        onRefreshRecentFiles?.();
      }
    } else {
      setRecentSubmenuOpen(false);
      cancelRecentSubmenuClose();
    }
  }, [open, onRefreshRecentFiles, cancelRecentSubmenuClose]);

  useLayoutEffect(() => {
    if (!open) return;
    if (startupSettled && !fileBusy) setMenuFileActionsLocked(false);
  }, [open, startupSettled, fileBusy]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    setPosition(anchorBelowRect(buttonRef.current));
    setShift({ x: 0, y: 0 });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const next = menuShiftForRect(
      position.left,
      position.top,
      panel.offsetWidth,
      panel.offsetHeight,
    );
    setShift((prev) =>
      prev.x === next.x && prev.y === next.y ? prev : next,
    );
  }, [open, position.left, position.top]);

  useLayoutEffect(() => {
    if (!open || !recentSubmenuOpen || !recentRowRef.current) return;
    const row = recentRowRef.current.getBoundingClientRect();
    setRecentSubmenuPosition({ left: row.right + 4, top: row.top });
    setRecentSubmenuShift({ x: 0, y: 0 });
  }, [open, recentSubmenuOpen, recentFilesStore]);

  useLayoutEffect(() => {
    if (!open || !recentSubmenuOpen) return;
    const submenu = recentSubmenuRef.current;
    if (!submenu) return;
    const next = menuShiftForRect(
      recentSubmenuPosition.left,
      recentSubmenuPosition.top,
      submenu.offsetWidth,
      submenu.offsetHeight,
    );
    setRecentSubmenuShift((prev) =>
      prev.x === next.x && prev.y === next.y ? prev : next,
    );
  }, [
    open,
    recentSubmenuOpen,
    recentSubmenuPosition.left,
    recentSubmenuPosition.top,
    hasRecentMenuItems(recentFilesStore),
  ]);

  useEffect(() => {
    const onCloseMenus = () => setOpen(false);
    document.addEventListener("schedule-viewer:close-menus", onCloseMenus);
    return () => {
      document.removeEventListener("schedule-viewer:close-menus", onCloseMenus);
    };
  }, []);

  useEffect(() => {
    return () => cancelRecentSubmenuClose();
  }, [cancelRecentSubmenuClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (recentSubmenuOpen) {
          setRecentSubmenuOpen(false);
          recentRowRef.current?.focus({ preventScroll: true });
          return;
        }
        setOpen(false);
        return;
      }
      const panel = panelRef.current;
      if (!panel) return;

      const active = document.activeElement;
      const submenu = recentSubmenuRef.current;
      const onRecentRow = active === recentRowRef.current;

      if (
        event.key === "ArrowRight" &&
        onRecentRow &&
        !event.altKey &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        openRecentSubmenu();
        window.requestAnimationFrame(() => {
          if (recentSubmenuRef.current) {
            focusMenuEdge(recentSubmenuRef.current, "first");
          }
        });
        return;
      }

      if (
        event.key === "ArrowLeft" &&
        submenu?.contains(active) &&
        !event.altKey &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        setRecentSubmenuOpen(false);
        recentRowRef.current?.focus({ preventScroll: true });
        return;
      }

      const focusMenu =
        submenu && active instanceof Node && submenu.contains(active)
          ? submenu
          : panel;

      if (
        moveMenuFocus(focusMenu, event.key, {
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        })
      ) {
        event.preventDefault();
      }
    };
    focusMenuEdge(panelRef.current ?? buttonRef.current ?? document.body, "first");
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, recentSubmenuOpen, openRecentSubmenu]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);
  const recentSections =
    isTauri() && onOpenRecent ? recentMenuSections(recentFilesStore) : [];
  const showRecentDesktopRow =
    isTauri() &&
    onOpenRecent !== undefined &&
    onClearRecentHistory !== undefined;
  const showRecentSubmenu =
    showRecentDesktopRow && recentSections.length > 0;
  const showRecentDisabled =
    showRecentDesktopRow && recentSections.length === 0;

  const panel = open ? (
    <div
      ref={panelRef}
      className="app-menu-panel app-menu-panel--fixed"
      role="menu"
      style={{
        left: position.left + shift.x,
        top: position.top + shift.y,
      }}
    >
      <button
        type="button"
        role="menuitem"
        disabled={menuFileActionsLocked}
        onClick={() => run(onOpen)}
      >
        <span>開く</span>
        <span className="menu-shortcut">{fileShortcutHint("open", commandKey)}</span>
      </button>
      {showRecentSubmenu ? (
        <div
          className="app-menu-submenu-host"
          data-menu-item-host="true"
          onMouseEnter={openRecentSubmenu}
          onMouseLeave={scheduleRecentSubmenuClose}
        >
          <button
            ref={recentRowRef}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={recentSubmenuOpen}
            onMouseEnter={openRecentSubmenu}
            onClick={openRecentSubmenu}
          >
            <span>最近開いたファイル</span>
            <span className="app-menu-submenu-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          {recentSubmenuOpen ? (
            <div
              ref={recentSubmenuRef}
              className="app-menu-submenu-panel"
              role="menu"
              style={{
                left: recentSubmenuPosition.left + recentSubmenuShift.x,
                top: recentSubmenuPosition.top + recentSubmenuShift.y,
              }}
              onMouseEnter={openRecentSubmenu}
            >
              {recentSections.map((section, sectionIndex) => (
                <div key={section.heading} role="group" aria-label={section.heading}>
                  {sectionIndex > 0 ? <hr /> : null}
                  <div className="app-menu-submenu-heading" role="presentation">
                    {section.heading}
                  </div>
                  {section.items.map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      role="menuitem"
                      disabled={menuFileActionsLocked}
                      title={entry.path}
                      aria-label={recentMenuItemAriaLabel(entry)}
                      onClick={() =>
                        run(() => onOpenRecent?.(entry.path, entry.kind))
                      }
                    >
                      <span>{entry.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              <hr />
              <button
                type="button"
                role="menuitem"
                onClick={() => run(onClearRecentHistory)}
              >
                履歴を消す
              </button>
            </div>
          ) : null}
        </div>
      ) : showRecentDisabled ? (
        <button type="button" role="menuitem" disabled>
          <span>最近開いたファイル</span>
        </button>
      ) : null}
      {isTauri() && onOpenInNewWindow ? (
        <button
          type="button"
          role="menuitem"
          disabled={menuFileActionsLocked}
          onClick={() => run(onOpenInNewWindow)}
        >
          <span>新しいウィンドウで開く</span>
          <span className="menu-shortcut">
            {fileShortcutHint("openNew", commandKey)}
          </span>
        </button>
      ) : null}
      <button
        type="button"
        role="menuitem"
        disabled={menuFileActionsLocked}
        onClick={() => run(onSave)}
      >
        <span>保存</span>
        <span className="menu-shortcut">{fileShortcutHint("save", commandKey)}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={menuFileActionsLocked}
        onClick={() => run(onSaveAs)}
      >
        <span>別名保存</span>
        <span className="menu-shortcut">
          {fileShortcutHint("saveAs", commandKey)}
        </span>
      </button>
      <button type="button" role="menuitem" onClick={() => run(onExportHtml)}>
        書き出し
      </button>
      {isTauri() && onExportWorkspace ? (
        <button
          type="button"
          role="menuitem"
          disabled={menuFileActionsLocked}
          onClick={() => run(onExportWorkspace)}
        >
          設定ファイルを新しいフォルダへ書き出す
        </button>
      ) : null}
      <button type="button" role="menuitem" onClick={() => run(onShowJson)}>
        JSON を表示
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={menuFileActionsLocked}
        onClick={() => run(onShowDiff)}
      >
        差分を表示
      </button>
      <hr />
      <button type="button" role="menuitem" onClick={() => run(onOpenGuide)}>
        操作の案内
      </button>
      <button type="button" role="menuitem" onClick={() => run(onOpenShortcuts)}>
        ショートカット一覧
      </button>
      {onCheckForUpdates ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => run(onCheckForUpdates)}
        >
          更新を確認
        </button>
      ) : null}
      <button type="button" role="menuitem" onClick={() => run(onOpenSettings)}>
        設定
      </button>
    </div>
  ) : null;

  return (
    <div className="app-menu">
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn menu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        title="メニュー"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="menu-btn-icon" aria-hidden="true" />
      </button>
      {panel
        ? createPortal(panel, document.getElementById("root") ?? document.body)
        : null}
    </div>
  );
}

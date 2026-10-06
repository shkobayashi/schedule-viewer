import { isTauri } from "@tauri-apps/api/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { createPortal } from "react-dom";
import { fileShortcutHint, usesCommandKey } from "../model/shortcuts";
import { anchorBelowRect, menuShiftForRect } from "./anchoredMenu";
import { focusMenuEdge, moveMenuFocus } from "./menuFocus";

type AppMenuProps = {
  fileBusy?: boolean;
  onOpen: () => void;
  onOpenInNewWindow?: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onShowJson: () => void;
  onShowDiff: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
};

export function AppMenu({
  fileBusy = false,
  onOpen,
  onOpenInNewWindow,
  onSave,
  onSaveAs,
  onExportHtml,
  onShowJson,
  onShowDiff,
  onOpenSettings,
  onOpenShortcuts,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [shift, setShift] = useState({ x: 0, y: 0 });

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
        setOpen(false);
        return;
      }
      const menu = panelRef.current;
      if (!menu) return;
      if (moveMenuFocus(menu, event.key)) event.preventDefault();
    };
    focusMenuEdge(panelRef.current ?? buttonRef.current ?? document.body, "first");
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);

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
        disabled={fileBusy}
        onClick={() => run(onOpen)}
      >
        <span>開く</span>
        <span className="menu-shortcut">{fileShortcutHint("open", commandKey)}</span>
      </button>
      {isTauri() && onOpenInNewWindow ? (
        <button
          type="button"
          role="menuitem"
          disabled={fileBusy}
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
        disabled={fileBusy}
        onClick={() => run(onSave)}
      >
        <span>保存</span>
        <span className="menu-shortcut">{fileShortcutHint("save", commandKey)}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={fileBusy}
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
      <button type="button" role="menuitem" onClick={() => run(onShowJson)}>
        JSON を表示
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={fileBusy}
        onClick={() => run(onShowDiff)}
      >
        差分を表示
      </button>
      <hr />
      <button type="button" role="menuitem" onClick={() => run(onOpenShortcuts)}>
        ショートカット一覧
      </button>
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
        <Menu size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {panel
        ? createPortal(panel, document.getElementById("root") ?? document.body)
        : null}
    </div>
  );
}

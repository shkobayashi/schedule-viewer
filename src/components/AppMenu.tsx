import { useEffect, useRef, useState } from "react";

type AppMenuProps = {
  fileBusy?: boolean;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onShowJson: () => void;
  onOpenSettings: () => void;
};

export function AppMenu({
  fileBusy = false,
  onOpen,
  onSave,
  onSaveAs,
  onExportHtml,
  onShowJson,
  onOpenSettings,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
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

  return (
    <div className="app-menu" ref={rootRef}>
      <button
        type="button"
        className="icon-btn menu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        title="メニュー"
        onClick={() => setOpen((prev) => !prev)}
      >
        ☰
      </button>
      {open ? (
        <div className="app-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={fileBusy}
            onClick={() => run(onOpen)}
          >
            開く
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={fileBusy}
            onClick={() => run(onSave)}
          >
            保存
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={fileBusy}
            onClick={() => run(onSaveAs)}
          >
            別名保存
          </button>
          <button type="button" role="menuitem" onClick={() => run(onExportHtml)}>
            書き出し
          </button>
          <button type="button" role="menuitem" onClick={() => run(onShowJson)}>
            JSON を表示
          </button>
          <hr />
          <button type="button" role="menuitem" onClick={() => run(onOpenSettings)}>
            設定
          </button>
        </div>
      ) : null}
    </div>
  );
}

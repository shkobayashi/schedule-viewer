import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { menuShiftForRect } from "./anchoredMenu";
import { focusMenuEdge, moveMenuFocus } from "./menuFocus";

export type ContextMenuItem =
  | {
      type: "item";
      id: string;
      label: string;
      shortcut?: string;
      icon?: ReactNode;
      danger?: boolean;
      onSelect: () => void;
    }
  | { type: "separator"; id: string };

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const itemsKey = items.map((item) => item.id).join("\0");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = menuShiftForRect(x, y, el.offsetWidth, el.offsetHeight);
    setShift((prev) =>
      prev.x === next.x && prev.y === next.y ? prev : next,
    );
  }, [x, y, itemsKey]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (event.button === 2) return;
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (!ref.current) return;
      if (moveMenuFocus(ref.current, event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onDismiss = () => onClose();
    let raf = 0;
    raf = window.requestAnimationFrame(() => {
      if (ref.current) focusMenuEdge(ref.current, "first");
      document.addEventListener("mousedown", onPointerDown);
    });
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("wheel", onDismiss, { capture: true });
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("wheel", onDismiss, { capture: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="context-menu"
      role="menu"
      style={{ left: x + shift.x, top: y + shift.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) =>
        item.type === "separator" ? (
          <div key={item.id} className="context-menu-sep" role="separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={item.danger ? "danger" : undefined}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            <span className="context-menu-label">
              {item.icon ? (
                <span className="context-menu-icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </span>
            {item.shortcut ? (
              <span className="menu-shortcut">{item.shortcut}</span>
            ) : null}
          </button>
        ),
      )}
    </div>,
    document.getElementById("root") ?? document.body,
  );
}

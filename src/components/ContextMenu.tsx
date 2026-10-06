import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let dx = 0;
    let dy = 0;
    if (rect.right > window.innerWidth - margin) {
      dx = window.innerWidth - margin - rect.right;
    }
    if (rect.bottom > window.innerHeight - margin) {
      dy = window.innerHeight - margin - rect.bottom;
    }
    if (rect.left + dx < margin) dx = margin - rect.left;
    if (rect.top + dy < margin) dy = margin - rect.top;
    setShift({ x: dx, y: dy });
  }, [x, y, items]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
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
    if (ref.current) focusMenuEdge(ref.current, "first");
    const onDismiss = () => onClose();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("wheel", onDismiss, { capture: true });
    return () => {
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

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { readUiScale } from "./filterListMetrics";

export const FilterPanelScrollRefContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

export function isFilterComboDropdownTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(".filter-panel-combo-dropdown") != null
  );
}

export type FilterComboDropdownAnchor = {
  left: number;
  top: number;
  width: number;
};

export function filterComboDropdownAnchor(
  anchor: HTMLElement,
  gapScale = readUiScale(),
): FilterComboDropdownAnchor {
  const rect = anchor.getBoundingClientRect();
  const gap = 4 * gapScale;
  return { left: rect.left, top: rect.bottom + gap, width: rect.width };
}

type FilterComboDropdownProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function FilterComboDropdown({
  open,
  anchorRef,
  className,
  style,
  children,
}: FilterComboDropdownProps) {
  const panelScrollRef = useContext(FilterPanelScrollRefContext);
  const [anchor, setAnchor] = useState<FilterComboDropdownAnchor | null>(null);

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setAnchor(filterComboDropdownAnchor(el));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    const scrollEl = panelScrollRef?.current;
    scrollEl?.addEventListener("scroll", onMove);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      scrollEl?.removeEventListener("scroll", onMove);
    };
  }, [open, place, panelScrollRef]);

  if (!open || anchor == null) return null;

  return createPortal(
    <div
      className={["filter-panel-combo-dropdown", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        position: "fixed",
        left: anchor.left,
        top: anchor.top,
        width: anchor.width,
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

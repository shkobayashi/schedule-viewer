import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { acquireBackgroundInert } from "./backgroundInert";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalDialogProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** 最初のフォーカスをパネル本体に置く（一覧の先頭ボタンへ飛ばさない） */
  initialFocusOnPanel?: boolean;
};

export function ModalDialog({
  title,
  onClose,
  children,
  className = "modal",
  initialFocusOnPanel = false,
}: ModalDialogProps) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const releaseInert = acquireBackgroundInert();
    const focusTarget = initialFocusOnPanel
      ? panelRef.current
      : (panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        panelRef.current);
    focusTarget?.focus();
    return () => {
      releaseInert();
      previousFocusRef.current?.focus();
    };
  }, [initialFocusOnPanel]);

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const nodes = [
      ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ].filter((node) => node.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
          return;
        }
        trapTab(event);
      }}
    >
      <div ref={panelRef} className={className} tabIndex={-1}>
        <h2 id={titleId} tabIndex={-1}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

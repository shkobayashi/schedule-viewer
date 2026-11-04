import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { acquireBackgroundInert } from "../backgroundInert";
import { DialogCloseButton } from "./DialogCloseButton";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type UiDialogProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra classes on the panel (size modifiers, layout hooks). */
  panelClassName?: string;
  overlayClassName?: string;
  initialFocusOnPanel?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/** Raycast (B) modal shell: overlay, panel chrome, title row, × close. */
export function UiDialog({
  title,
  onClose,
  children,
  panelClassName = "",
  overlayClassName = "",
  initialFocusOnPanel = false,
  initialFocusRef,
}: UiDialogProps) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const releaseInert = acquireBackgroundInert();
    return () => {
      releaseInert();
    };
  }, []);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTarget =
      initialFocusRef?.current ??
      (initialFocusOnPanel
        ? panelRef.current
        : (panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
          panelRef.current));
    focusTarget?.focus();
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [initialFocusOnPanel, initialFocusRef]);

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const nodes = [
      ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ].filter(
      (node) =>
        node.offsetParent !== null && !node.closest("[inert]"),
    );
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

  const panelClasses = ["ui-dialog-panel", panelClassName]
    .filter(Boolean)
    .join(" ");
  const overlayClasses = ["ui-dialog-overlay", overlayClassName]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      ref={overlayRef}
      className={overlayClasses}
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
      <div ref={panelRef} className={panelClasses} tabIndex={-1}>
        <div className="ui-dialog-header">
          <h2 id={titleId} className="ui-dialog-title" tabIndex={-1}>
            {title}
          </h2>
          <DialogCloseButton onClose={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

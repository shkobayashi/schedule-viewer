import { type ReactNode, type RefObject } from "react";
import { UiDialog } from "./ui/UiDialog";

type ModalDialogProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** 最初のフォーカスをパネル本体に置く（一覧の先頭ボタンへ飛ばさない） */
  initialFocusOnPanel?: boolean;
  /** 最初のフォーカスをこの要素に置く */
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/** App modals on the shared Raycast dialog shell (`UiDialog`). */
export function ModalDialog({
  title,
  onClose,
  children,
  className = "",
  initialFocusOnPanel = false,
  initialFocusRef,
}: ModalDialogProps) {
  const legacy = className
    .split(/\s+/)
    .filter((token) => token && token !== "modal")
    .join(" ");
  const panelClassName = ["modal-legacy", legacy].filter(Boolean).join(" ");

  return (
    <UiDialog
      title={title}
      onClose={onClose}
      panelClassName={panelClassName}
      initialFocusOnPanel={initialFocusOnPanel}
      initialFocusRef={initialFocusRef}
    >
      {children}
    </UiDialog>
  );
}

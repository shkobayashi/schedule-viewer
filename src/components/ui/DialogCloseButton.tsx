import { X } from "lucide-react";
import { UiButton } from "./UiButton";

type DialogCloseButtonProps = {
  onClose: () => void;
};

/** Top-right dismiss control for modal overlays (Esc still closes via parent). */
export function DialogCloseButton({ onClose }: DialogCloseButtonProps) {
  return (
    <UiButton
      variant="icon"
      type="button"
      className="ui-btn--dialog-close modal-close-btn"
      aria-label="閉じる"
      title="Esc"
      onClick={onClose}
    >
      <X aria-hidden="true" size={16} strokeWidth={2} />
    </UiButton>
  );
}

import { useRef } from "react";
import { ModalDialog } from "./ModalDialog";

type DiffDialogProps = {
  text: string;
  open: boolean;
  onClose: () => void;
};

export function DiffDialog({ text, open, onClose }: DiffDialogProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.select();
      document.execCommand("copy");
    }
  };

  return (
    <ModalDialog title="差分" onClose={onClose} className="modal wide">
      <textarea ref={areaRef} className="json-textarea" readOnly value={text} />
      <div className="modal-actions">
        <button type="button" className="btn primary" onClick={() => void copy()}>
          コピー
        </button>
        <button type="button" className="btn" onClick={onClose}>
          閉じる
        </button>
      </div>
    </ModalDialog>
  );
}

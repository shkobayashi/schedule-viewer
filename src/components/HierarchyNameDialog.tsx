import { useEffect, useRef, useState } from "react";
import { ModalDialog } from "./ModalDialog";

type HierarchyNameDialogProps = {
  title: string;
  initialName: string;
  primaryLabel?: string;
  onClose: () => void;
  onSave: (name: string) => string | null;
};

export function HierarchyNameDialog({
  title,
  initialName,
  primaryLabel = "保存",
  onClose,
  onSave,
}: HierarchyNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.select());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <ModalDialog title={title} onClose={onClose}>
      <div className="field">
        <label htmlFor="hierarchyName">名前</label>
        <input
          ref={inputRef}
          id="hierarchyName"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setFormError(null);
          }}
        />
      </div>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          キャンセル
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const message = onSave(name);
            if (message) setFormError(message);
          }}
        >
          {primaryLabel}
        </button>
      </div>
    </ModalDialog>
  );
}

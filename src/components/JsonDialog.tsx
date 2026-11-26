import { ModalDialog } from "./ModalDialog";

type JsonDialogProps = {
  json: string;
  open: boolean;
  onClose: () => void;
};

export function JsonDialog({ json, open, onClose }: JsonDialogProps) {
  if (!open) return null;
  return (
    <ModalDialog
      title="現在のスケジュールJSON"
      onClose={onClose}
      className="modal wide"
    >
      <textarea className="json-textarea" readOnly value={json} />
    </ModalDialog>
  );
}

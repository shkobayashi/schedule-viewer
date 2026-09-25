import { useState } from "react";
import type { ScheduleExportFormat } from "../model/exportHtml";
import { ModalDialog } from "./ModalDialog";

type ExportFormatDialogProps = {
  onExport: (format: ScheduleExportFormat) => void;
  onCancel: () => void;
};

export function ExportFormatDialog({ onExport, onCancel }: ExportFormatDialogProps) {
  const [format, setFormat] = useState<ScheduleExportFormat>("html");

  return (
    <ModalDialog title="書き出し" onClose={onCancel}>
      <p className="form-note">
        現在の絞り込み・折りたたみ・系統で見えている行を、その期間に合わせて書き出します。
      </p>
      <fieldset className="export-format">
        <legend>形式</legend>
        <label>
          <input
            type="radio"
            name="export-format"
            value="html"
            checked={format === "html"}
            onChange={() => setFormat("html")}
          />
          HTML
        </label>
        <label>
          <input
            type="radio"
            name="export-format"
            value="svg"
            checked={format === "svg"}
            onChange={() => setFormat("svg")}
          />
          SVG
        </label>
      </fieldset>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          キャンセル
        </button>
        <button type="button" className="btn primary" onClick={() => onExport(format)}>
          書き出す
        </button>
      </div>
    </ModalDialog>
  );
}

import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { ScheduleExportFormat } from "../model/exportHtml";
import {
  EXCEL_EXPORT_COLUMN_LABELS,
  EXCEL_EXPORT_COLUMN_ORDER,
  excelFieldHeaderLabel,
  excelDuplicateFieldNames,
  readExcelExportColumns,
  readExcelExportFieldColumns,
  writeExcelExportColumns,
  writeExcelExportFieldColumns,
  type ExcelExportColumnsPreference,
  type ExcelExportFieldColumnsPreference,
} from "../model/excelExportColumns";
import type { ScheduleFieldDef } from "../model/types";
import { ModalDialog } from "./ModalDialog";

type ExportFormatDialogProps = {
  fieldDefs: readonly ScheduleFieldDef[];
  onExport: (
    format: ScheduleExportFormat,
    excelColumns?: ExcelExportColumnsPreference,
    excelFieldColumns?: ExcelExportFieldColumnsPreference,
  ) => void;
  onCancel: () => void;
};

export function ExportFormatDialog({
  fieldDefs,
  onExport,
  onCancel,
}: ExportFormatDialogProps) {
  const [format, setFormat] = useState<ScheduleExportFormat>("html");
  const [excelColumns, setExcelColumns] = useState<ExcelExportColumnsPreference>(
    () => readExcelExportColumns(),
  );
  const [excelFieldColumns, setExcelFieldColumns] =
    useState<ExcelExportFieldColumnsPreference>(() =>
      readExcelExportFieldColumns(fieldDefs),
    );
  const duplicateFieldNames = excelDuplicateFieldNames(
    fieldDefs,
    excelFieldColumns,
  );
  const desktop = isTauri();

  const toggleExcelColumn = (id: keyof ExcelExportColumnsPreference) => {
    setExcelColumns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExcelFieldColumn = (key: string) => {
    setExcelFieldColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
        {desktop ? (
          <label>
            <input
              type="radio"
              name="export-format"
              value="xlsx"
              checked={format === "xlsx"}
              onChange={() => setFormat("xlsx")}
            />
            Excel
          </label>
        ) : null}
      </fieldset>
      {desktop && format === "xlsx" ? (
        <>
          <fieldset className="export-format">
            <legend>左の列（名前は常に含みます）</legend>
            {EXCEL_EXPORT_COLUMN_ORDER.map((id) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={excelColumns[id]}
                  onChange={() => toggleExcelColumn(id)}
                />
                {EXCEL_EXPORT_COLUMN_LABELS[id]}
              </label>
            ))}
          </fieldset>
          {fieldDefs.length > 0 ? (
            <fieldset className="export-format">
              <legend>追加項目の列</legend>
              <div className="export-format-field-scroll">
                {fieldDefs.map((field) => (
                  <label key={field.key}>
                    <input
                      type="checkbox"
                      checked={excelFieldColumns[field.key] ?? false}
                      onChange={() => toggleExcelFieldColumn(field.key)}
                    />
                    {excelFieldHeaderLabel(field, duplicateFieldNames)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </>
      ) : null}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (format === "xlsx") {
              writeExcelExportColumns(excelColumns);
              writeExcelExportFieldColumns(excelFieldColumns);
              onExport(format, excelColumns, excelFieldColumns);
              return;
            }
            onExport(format);
          }}
        >
          書き出す
        </button>
      </div>
    </ModalDialog>
  );
}

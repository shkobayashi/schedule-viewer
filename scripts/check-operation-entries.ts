/**
 * P-CI-06（段階2）: docs/operation-entries.md の主表を、ソース由来カタログと列意味に照合する。
 *
 * 段階1の doc.includes 部分一致は廃止。主表以外（set_view 追加入力、Excel 列、
 * 編集中キー、LLM 後手順）は本チェックの対象外。
 *
 * 未照合: 操作の案内の無引用要約、ツールバー動的ラベルのマウント、空セルの反証。
 */
import { readFileSync } from "node:fs";
import { buildOperationEntryCatalog } from "./operationEntryCatalog.ts";
import { OPERATION_ID } from "../src/operations/operationIds.ts";
import { contextMenuLabel } from "../src/operations/operationLabelLink.ts";

const docPath = process.argv[2] ?? "docs/operation-entries.md";
const doc = readFileSync(docPath, "utf8");

const catalog = buildOperationEntryCatalog();
const coverage = await import("./operationEntryCoverage.mjs");
const { errors, unverified } = coverage.validateOperationEntryCoverage(
  doc,
  catalog,
);

for (const operationId of Object.values(OPERATION_ID)) {
  try {
    const label = contextMenuLabel(operationId, {
      tentative: false,
      lineageActive: false,
      levelName: "段",
      childName: "子",
    });
    if (label.length === 0) {
      errors.push(`操作 ID ${operationId} の右クリックラベルが空`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`操作 ID ${operationId} に右クリックラベルが無い: ${message}`);
  }
}

if (errors.length > 0) {
  console.error("check-operation-entries failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  "operation-entries.md main tables match source catalogs (P-CI-06 phase 2)",
);
if (unverified.length > 0) {
  console.log("Unverified semantics (not failures):");
  for (const line of unverified) console.log(`  - ${line}`);
}

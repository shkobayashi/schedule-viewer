/**
 * P-CI-06（段階2）: docs/operation-entries.md の主表を、ソース由来カタログと列意味に照合する。
 *
 * 段階1の doc.includes 部分一致は廃止。主表以外（set_view 追加入力、Excel 列、
 * 編集中キー、LLM 後手順）は本チェックの対象外。
 *
 * 未照合: 操作の案内の無引用要約（セルごとに列挙）、ツールバー行別未登録の出典引用セル、
 * context menu テンプレの levelName/childName 手書き whitelist、FILTER-09 行の機能 ID 所有、
 * MCP file_action/history の action 列挙コピー（useMcpActionExecutor との手動同期）、
 * macOS PredefinedMenuItem の OS 文言、一部メニュー accelerator。
 * 機能 ID は external-spec.md への存在のみ（FILTER-09 等の行の所有対応は未照合）。
 * file_action / history の action 列挙は useMcpActionExecutor と同じ固定集合（ドリフトは手で揃える）。
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

const fullyVerified = unverified.length === 0;
if (fullyVerified) {
  console.log(
    "operation-entries.md main tables match source catalogs (P-CI-06 stage 2)",
  );
} else {
  console.log(
    "operation-entries.md main tables checked against source catalogs (P-CI-06 stage 2); unverified cells remain",
  );
  console.log("Unverified (not failures):");
  for (const line of unverified) console.log(`  - ${line}`);
}

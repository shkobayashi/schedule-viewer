/**
 * P-CI-06（段階1）: docs/operation-entries.md とコード側の固定ラベル・MCP 名の drift を止める。
 * 全列の機械照合は未実装。次を確認する:
 * - CONTEXT_MENU_FIXED_LABEL の各文言が表に存在する
 * - OPERATION_FORMAL の各正式名が表に存在する
 * - MCP_ALL_TOOL_NAMES の各ツール名が表に参照されている
 */
import { readFileSync } from "node:fs";
import { MCP_ALL_TOOL_NAMES } from "../src/model/mcpToolNames.ts";
import { OPERATION_FORMAL } from "../src/model/operationLabels.ts";
import { CONTEXT_MENU_FIXED_LABEL } from "../src/operations/operationLabelLink.ts";

const doc = readFileSync("docs/operation-entries.md", "utf8");

const errors: string[] = [];

for (const [operationId, label] of Object.entries(CONTEXT_MENU_FIXED_LABEL)) {
  if (label && !doc.includes(label)) {
    errors.push(
      `右クリック固定ラベル (${operationId}): 「${label}」が operation-entries.md に無い`,
    );
  }
}

for (const [key, label] of Object.entries(OPERATION_FORMAL)) {
  if (!doc.includes(label)) {
    errors.push(
      `OPERATION_FORMAL.${key}: 「${label}」が operation-entries.md に無い`,
    );
  }
}

for (const name of MCP_ALL_TOOL_NAMES) {
  if (!doc.includes(`\`${name}\``) && !doc.includes(name)) {
    errors.push(`MCP ツール ${name} が operation-entries.md に参照されていない`);
  }
}

if (errors.length > 0) {
  console.error("check-operation-entries failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  "operation-entries.md covers CONTEXT_MENU_FIXED_LABEL, OPERATION_FORMAL, and MCP_ALL_TOOL_NAMES (phase 1)",
);

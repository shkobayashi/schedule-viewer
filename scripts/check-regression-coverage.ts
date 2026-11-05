/**
 * 全機能の見出し、操作の入口一覧の操作名、MCP ツール名、
 * 既存の手動ケース ID が、回帰確認の文書に行き先を持つかを見る。
 */
import { readFileSync } from "node:fs";
import { MCP_ALL_TOOL_NAMES } from "../src/model/mcpToolNames.ts";

const features = readFileSync("docs/user-manual/features.md", "utf8");
const intent = readFileSync("docs/user-manual/find-by-intent.md", "utf8");
const operations = readFileSync("docs/operation-entries.md", "utf8");
const matrix = readFileSync("docs/regression-matrix.md", "utf8");
const scenarios = readFileSync("docs/regression.md", "utf8");
const cases = readFileSync("docs/regression-tc.md", "utf8");
const testSpec = readFileSync("docs/test-spec.md", "utf8");
const idList = readFileSync("docs/regression-tc-ids.txt", "utf8");

const errors: string[] = [];

const headings = [...features.matchAll(/^#{2,3} (.+)$/gm)].map((match) => match[1]);
for (const heading of headings) {
  if (!matrix.includes(heading)) {
    errors.push(`全機能の見出し「${heading}」が regression-matrix.md に無い`);
  }
}

for (const match of intent.matchAll(/\(features\.md#([^)]+)\)/g)) {
  const anchor = decodeURIComponent(match[1]);
  const heading = headings.find((item) => githubAnchor(item) === anchor);
  if (heading == null) {
    errors.push(`やりたいことから探すの #${anchor} に対応する全機能の見出しが無い`);
  }
}

const operationNames = operationNamesFrom(operations);
for (const name of operationNames) {
  if (!matrix.includes(name)) {
    errors.push(`操作「${name}」が regression-matrix.md に無い`);
  }
}

for (const tool of MCP_ALL_TOOL_NAMES) {
  if (!matrix.includes(tool)) {
    errors.push(`MCP ツール ${tool} が regression-matrix.md に無い`);
  }
}

const matrixRows = matrix.split("\n").filter((line) => line.startsWith("| ") && !line.includes("| 項目 |") && !line.includes("| --- |"));
for (const row of matrixRows) {
  if (!row.includes("自動:") && !row.includes("手動:")) {
    errors.push(`対応が無い行: ${row.slice(0, 80)}`);
  }
  for (const match of row.matchAll(/手動:(RG-[A-Z0-9-]+)/g)) {
    if (!scenarios.includes(`## ${match[1]} `)) {
      errors.push(`対応表の ${match[1]} が regression.md のシナリオに無い`);
    }
  }
}

const caseIds = idList
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("TC-"));
if (caseIds.length === 0) {
  errors.push("regression-tc-ids.txt に手動ケース ID が無い");
}
for (const line of testSpec.split("\n")) {
  if (line.startsWith("| TC-")) {
    errors.push(`test-spec.md に手動ケースの行が残っている: ${line.slice(0, 40)}`);
    break;
  }
}
for (const id of caseIds) {
  const line = cases.split("\n").find((row) => row.startsWith(`| ${id} |`));
  if (line == null) {
    errors.push(`${id} が regression-tc.md に無い`);
    continue;
  }
  if (!line.includes("自動:") && !line.includes("手動:")) {
    errors.push(`${id} に自動か手動の行き先が無い`);
  }
  const manuals = [...line.matchAll(/手動:(RG-[A-Z0-9-]+)/g)];
  if (line.includes("手動:") && manuals.length === 0) {
    errors.push(`${id} の手動の行き先からシナリオ ID が取れない`);
  }
  for (const match of manuals) {
    if (!scenarios.includes(`## ${match[1]} `)) {
      errors.push(`${id} の ${match[1]} が regression.md のシナリオに無い`);
    }
  }
}

if (errors.length > 0) {
  console.error("check-regression-coverage failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `regression coverage OK (headings ${headings.length}, operations ${operationNames.length}, tools ${MCP_ALL_TOOL_NAMES.length}, cases ${caseIds.length})`,
);

function operationNamesFrom(text: string): string[] {
  const names: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 8) continue;
    const name = cells[0];
    if (!name || name === "操作" || name === "列" || name.startsWith("---")) continue;
    names.push(name);
  }
  return names;
}

function githubAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

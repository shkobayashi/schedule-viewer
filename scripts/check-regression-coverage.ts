/**
 * 全機能の見出し、操作の入口一覧の操作名、MCP ツール名、
 * 既存の手動ケースが、回帰確認の文書に行き先を持つかを見る。
 * 名前が実在することと、参照先のファイルや手順があることを見る。
 * 振る舞いが正しいことは保証しない。
 */
import { existsSync, readFileSync } from "node:fs";
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
const plannedIssues = new Set(["535", "536", "537", "538", "540", "541", "543", "544", "545", "547", "548"]);

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

const matrixRows = matrix
  .split("\n")
  .filter((line) => line.startsWith("| MX-"));
for (const row of matrixRows) {
  checkDestination(row, row.split("|")[1]?.trim() || row.slice(0, 40));
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

const caseRows = cases.split("\n").filter((line) => line.startsWith("| TC-"));
const seen = new Map<string, number>();
for (const line of caseRows) {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  const id = cells[0];
  if (!id) continue;
  const count = (seen.get(id) ?? 0) + 1;
  seen.set(id, count);
  const kind = cells[5];
  const dest = cells[6] ?? "";
  if (cells[4] === "") {
    errors.push(`${id} の期待が空`);
  }
  if (count > 1 && kind !== "統合") {
    errors.push(`${id} の ${count} 行目が統合ではない`);
  }
  if (kind === "統合" && dest !== `統合:${id}`) {
    errors.push(`${id} の統合先が同じ ID の先頭行ではない`);
  }
  if (!kind || !["自動済み", "シナリオ", "統合", "自動化予定", "対象外", "重複"].includes(kind)) {
    errors.push(`${id} の区分が無い`);
  }
  checkDestination(`${kind} ${dest}`, id);
}

for (const id of caseIds) {
  if (!seen.has(id)) errors.push(`${id} が regression-tc.md に無い`);
}
for (const id of seen.keys()) {
  const listed = caseIds.filter((item) => item === id).length;
  if (listed !== seen.get(id)) {
    errors.push(`${id} の行数 ${seen.get(id)} が一覧の ${listed} と違う`);
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

function checkDestination(text: string, label: string): void {
  if (
    !text.includes("自動:") &&
    !text.includes("手動:") &&
    !text.includes("自動化予定:#") &&
    !text.includes("統合:") &&
    !text.includes("理由:")
  ) {
    errors.push(`${label} に行き先が無い`);
  }
  for (const match of text.matchAll(/手動:(RG-[A-Z0-9-]+)/g)) {
    const id = match[1];
    const step = scenarios.includes(`### ${id}\n`);
    const heading = scenarios.includes(`## ${id} `);
    if (!step && !heading) {
      errors.push(`${label} の ${id} が regression.md の手順に無い`);
    }
    if (step && !sectionHasExpectation(id)) {
      errors.push(`${label} の ${id} に期待が無い`);
    }
  }
  for (const match of text.matchAll(/自動:(\S+?)#([^。\n|]+)/g)) {
    const file = match[1];
    const name = match[2].trim();
    if (!existsSync(file)) {
      errors.push(`${label} の自動テストが無い: ${file}`);
      continue;
    }
    if (!readFileSync(file, "utf8").includes(name)) {
      errors.push(`${label} のテスト名が ${file} に無い: ${name}`);
    }
  }
  for (const match of text.matchAll(/自動化予定:#(\d+)/g)) {
    if (!plannedIssues.has(match[1])) {
      errors.push(`${label} の自動化予定 #${match[1]} は後続の Issue ではない`);
    }
  }
  if (text.includes("理由:") && text.split("理由:")[1].trim().length < 4) {
    errors.push(`${label} の対象外の理由が無い`);
  }
}

function sectionHasExpectation(id: string): boolean {
  const start = scenarios.indexOf(`### ${id}\n`);
  if (start < 0) return false;
  const rest = scenarios.slice(start + id.length);
  const next = rest.search(/\n### |\n## /);
  const section = next < 0 ? rest : rest.slice(0, next);
  return section.includes("期待:");
}

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

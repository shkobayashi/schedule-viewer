/**
 * 全機能の見出し、操作名、MCP ツール名、既存の手動ケースが、
 * 回帰確認の対応表と付録に、行として行き先を持つかを見る。
 *
 * 注記や別名の一部分では通さない。自動テストのファイルとテスト名、
 * 手順 ID が実在することも見る。振る舞いが正しいことは保証しない。
 * 手動ケース ID の追加と削除は、このファイルの EXPECTED_CASE_ID_SHA256 を
 * 変えることで承認する。
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MCP_ALL_TOOL_NAMES } from "../src/model/mcpToolNames.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = process.argv[2] ?? repoRoot;

/** 付録 ID 一覧の承認済みハッシュ。変えるときは、行の追加か削除の理由を同じ変更に書く。 */
export const EXPECTED_CASE_ID_SHA256 = "2cca659b56960ebd29c9af6616cc5929c846d1dc334470483b5d7b445549698c";

/** 付録・対応表・手順「扱い」で `自動化予定:#` に許可する Issue。一覧を変えるときは regression.md の冒頭と揃える。 */
const REGRESSION_PLANNED_ISSUES = new Set(["541", "543"]);
const errors: string[] = [];
const fileCache = new Map<string, string>();

const features = readRepo("docs/user-manual/features.md");
const intent = readRepo("docs/user-manual/find-by-intent.md");
const operations = readRepo("docs/operation-entries.md");
const matrix = readRepo("docs/regression-matrix.md");
const scenarios = readRepo("docs/regression.md");
const cases = readRepo("docs/regression-tc.md");
const testSpec = readRepo("docs/test-spec.md");
const idList = readRepo("docs/regression-tc-ids.txt");

if (createHash("sha256").update(idList).digest("hex") !== EXPECTED_CASE_ID_SHA256) {
  errors.push("regression-tc-ids.txt のハッシュが承認済みの値と違う。ID の追加と削除は EXPECTED_CASE_ID_SHA256 の変更で承認する");
}

const unexpectedHeadings = [...features.matchAll(/^(#{4,}) (.+)$/gm)];
for (const match of unexpectedHeadings) {
  errors.push(`全機能の見出し階層が未対応: ${match[1]} ${match[2]}`);
}

const headings = [...features.matchAll(/^#{2,3} (.+)$/gm)].map((match) => match[1]);
const matrixRows = matrixRowsFrom(matrix);
const matrixItems = new Set(matrixRows.map((row) => row.item));

for (const heading of headings) {
  if (!matrixItems.has(heading)) {
    errors.push(`全機能の見出し「${heading}」が regression-matrix.md の項目に無い`);
  }
}

for (const match of intent.matchAll(/\(features\.md#([^)]+)\)/g)) {
  const anchor = decodeURIComponent(match[1]);
  const heading = headings.find((item) => githubAnchor(item) === anchor);
  if (heading == null) {
    errors.push(`やりたいことから探すの #${anchor} に対応する全機能の見出しが無い`);
  }
}

for (const name of operationNamesFrom(operations)) {
  if (!matrixItems.has(name)) {
    errors.push(`操作「${name}」が regression-matrix.md の項目に無い`);
  }
}

for (const tool of MCP_ALL_TOOL_NAMES) {
  if (!matrixItems.has(tool)) {
    errors.push(`MCP ツール ${tool} が regression-matrix.md の項目に無い`);
  }
}

for (const row of matrixRows) {
  checkDestination(`${row.kind} ${row.dest}`, row.id || row.item);
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
  if (cells.length < 7) {
    errors.push(`付録の列が足りない: ${line.slice(0, 40)}`);
    continue;
  }
  const id = cells[0];
  const count = (seen.get(id) ?? 0) + 1;
  seen.set(id, count);
  const kind = cells[5];
  const dest = cells[6] ?? "";
  if (cells[4] === "") errors.push(`${id} の期待が空`);
  if (count > 1 && kind !== "統合") errors.push(`${id} の ${count} 行目が統合ではない`);
  if (kind === "統合" && dest !== `統合:${id}`) errors.push(`${id} の統合先が同じ ID の先頭行ではない`);
  if (!["自動済み", "一部自動", "シナリオ", "統合", "自動化予定", "手動のまま", "一部手動", "対象外", "重複"].includes(kind)) {
    errors.push(`${id} の区分が無い`);
  }
  if (kind === "一部自動" && (!dest.includes("自動:") || !dest.includes("自動化予定:#"))) {
    errors.push(`${id} の一部自動には、自動のテストと残りの自動化予定が要る`);
  }
  if ((kind === "手動のまま" || kind === "一部手動") && !dest.includes("手動のまま:")) {
    errors.push(`${id} の手動のままには理由が要る`);
  }
  if (kind === "一部手動" && !dest.includes("自動:")) {
    errors.push(`${id} の一部手動に自動参照が無い。手動のままへ移す`);
  }
  checkDestination(`${kind} ${dest}`, id);
}

for (const match of scenarios.matchAll(/### (RG-[A-Z0-9-]+)\n([\s\S]*?)(?=\n### |\n## |$)/g)) {
  const stepId = match[1];
  const section = match[2];
  const handling = section.includes("扱い:") ? section.split("扱い:").slice(1).join("扱い:") : "";
  if (handling.length === 0) continue;
  checkPlannedIssueRefs(handling, stepId);
  for (const ref of autoRefsFrom(handling)) {
    assertAutoRefNotSkipped(ref, stepId);
  }
}

for (const id of caseIds) {
  if (!seen.has(id)) errors.push(`${id} が regression-tc.md に無い`);
}
for (const [id, count] of seen) {
  const listed = caseIds.filter((item) => item === id).length;
  if (listed === 0) errors.push(`${id} が一覧に無い`);
  else if (listed !== count) errors.push(`${id} の行数 ${count} が一覧の ${listed} と違う`);
}

if (errors.length > 0) {
  console.error("check-regression-coverage failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `regression coverage OK (headings ${headings.length}, operations ${operationNamesFrom(operations).length}, tools ${MCP_ALL_TOOL_NAMES.length}, cases ${caseIds.length})`,
);

function readRepo(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function matrixRowsFrom(text: string): { id: string; item: string; kind: string; dest: string }[] {
  const rows: { id: string; item: string; kind: string; dest: string }[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("| MX-")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 5) {
      errors.push(`対応表の列が足りない: ${line.slice(0, 60)}`);
      continue;
    }
    rows.push({ id: cells[0], kind: cells[3], item: cells[2], dest: cells[4] });
  }
  return rows;
}

function checkDestination(text: string, label: string): void {
  const kindPrefix = text.split(" ")[0];
  if (kindPrefix === "一部手動" && !text.includes("自動:")) {
    errors.push(`${label} の一部手動に自動参照が無い。手動のままへ移す`);
  }
  checkPlannedIssueRefs(text, label);
  const hasManual = text.includes("手動:");
  const manuals = [...text.matchAll(/手動:(RG-[A-Z0-9-]+)/g)];
  if (
    !text.includes("自動:") &&
    !hasManual &&
    !text.includes("自動化予定:#") &&
    !text.includes("統合:") &&
    !text.includes("理由:") &&
    !text.includes("手動のまま:")
  ) {
    errors.push(`${label} に行き先が無い`);
  }
  if (text.includes("手動のまま:") && text.split("手動のまま:")[1].trim().length < 4) {
    errors.push(`${label} の手動のままの理由が無い`);
  }
  if (hasManual && manuals.length === 0) {
    errors.push(`${label} の手動の行き先から手順 ID が取れない`);
  }
  for (const match of manuals) {
    const id = match[1];
    if (!scenarios.includes(`### ${id}\n`)) {
      errors.push(`${label} の ${id} が regression.md の手順に無い`);
      continue;
    }
    const section = stepSection(id);
    if (!section.includes("操作:") || !section.includes("期待:") || !section.includes("扱い:")) {
      errors.push(`${label} の ${id} に操作か期待か扱いが無い`);
    }
  }
  for (const ref of autoRefsFrom(text)) {
    const absolute = resolveTestFile(ref.file);
    if (!existsSync(absolute)) {
      errors.push(`${label} の自動テストが無い: ${ref.file}`);
      continue;
    }
    const content = readCached(absolute);
    if (!content.includes(ref.name)) {
      errors.push(`${label} のテスト名が ${ref.file} に無い: ${ref.name}`);
      continue;
    }
    assertAutoRefNotSkipped(ref, label);
  }
  if (text.includes("理由:") && text.split("理由:")[1].trim().length < 4) {
    errors.push(`${label} の対象外の理由が無い`);
  }
}

function autoRefsFrom(text: string): { file: string; name: string }[] {
  const refs: { file: string; name: string }[] = [];
  for (const match of text.matchAll(/自動:([^\s#]+)#([^。\n|]+)/g)) {
    refs.push({ file: match[1], name: match[2].trim() });
  }
  return refs;
}

function checkPlannedIssueRefs(text: string, label: string): void {
  for (const match of text.matchAll(/自動化予定:\s*#(\d+)/g)) {
    if (!REGRESSION_PLANNED_ISSUES.has(match[1])) {
      errors.push(`${label} の自動化予定 #${match[1]} は許可されていない（#541 と #543 のみ）`);
    }
  }
}

function resolveTestFile(file: string): string {
  const inSandbox = join(root, file);
  if (existsSync(inSandbox)) return inSandbox;
  return join(repoRoot, file);
}

function readCached(absolute: string): string {
  const cached = fileCache.get(absolute);
  if (cached != null) return cached;
  const content = readFileSync(absolute, "utf8");
  fileCache.set(absolute, content);
  return content;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `自動:` にだけ適用する。Rust の #[ignore] と JS/TS の it.skip/test.skip、describe.skip 直下を見る。
 * 動的 skip や別ファイルの同名は判定しない（限界）。
 */
function assertAutoRefNotSkipped(ref: { file: string; name: string }, label: string): void {
  const absolute = resolveTestFile(ref.file);
  const content = readCached(absolute);
  if (ref.file.endsWith(".rs")) {
    if (isRustTestIgnored(content, ref.name)) {
      errors.push(`${label} の自動参照が #[ignore] 付き: ${ref.file}#${ref.name}`);
    }
    return;
  }
  if (isJsTestSkipped(content, ref.name)) {
    errors.push(`${label} の自動参照が skip 付き: ${ref.file}#${ref.name}`);
  }
}

function isRustTestIgnored(content: string, testName: string): boolean {
  const lines = content.split("\n");
  const fnPattern = new RegExp(`^fn\\s+${escapeRegExp(testName)}\\s*\\(`);
  const fnLine = lines.findIndex((line) => fnPattern.test(line));
  if (fnLine < 0) return false;
  for (let i = fnLine - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (line.startsWith("#[")) {
      if (/^#\[ignore\b/.test(line)) return true;
      continue;
    }
    break;
  }
  return false;
}

function isJsTestSkipped(content: string, testName: string): boolean {
  const quoted = escapeRegExp(testName);
  const direct = new RegExp(`(?:it|test)\\.skip\\s*\\(\\s*['"\`]${quoted}['"\`]`);
  if (direct.test(content)) return true;
  return isInsideDescribeSkipBlock(content, testName);
}

function isInsideDescribeSkipBlock(content: string, testName: string): boolean {
  const lines = content.split("\n");
  let depth = 0;
  let skipped = false;
  const testLine = new RegExp(`(?:it|test)\\s*\\(\\s*['"\`]${escapeRegExp(testName)}['"\`]`);
  for (const line of lines) {
    if (/describe\.skip\s*\(/.test(line)) {
      skipped = true;
      depth = 1;
      continue;
    }
    if (!skipped) continue;
    if (testLine.test(line)) return true;
    if (/(?:describe|describe\.skip)\s*\(/.test(line)) depth += 1;
    if (/\}\s*\)\s*;?\s*$/.test(line.trim()) || /^\s*\}\)\s*;/.test(line)) {
      depth -= 1;
      if (depth <= 0) skipped = false;
    }
  }
  return false;
}

function stepSection(id: string): string {
  const marker = `### ${id}\n`;
  const start = scenarios.indexOf(marker);
  if (start < 0) return "";
  const rest = scenarios.slice(start + marker.length);
  const next = rest.search(/\n### |\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

function operationNamesFrom(text: string): string[] {
  const names: string[] = [];
  const lines = text.split("\n");
  let inOperationTable = false;
  for (const line of lines) {
    if (line.startsWith("| 操作 |")) {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      if (cells[1] === "ツールバー") {
        if (cells.length < 8) errors.push("操作表の見出しが 8 列未満");
        inOperationTable = true;
      } else if (cells.length !== 2) {
        errors.push("未対応の操作表: " + line.slice(0, 40));
        inOperationTable = false;
      } else {
        inOperationTable = false;
      }
      continue;
    }
    if (!line.startsWith("|")) {
      inOperationTable = false;
      continue;
    }
    if (!inOperationTable || line.includes("---")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 8) {
      errors.push(`操作表の行が 8 列未満: ${cells[0] || line.slice(0, 40)}`);
      continue;
    }
    const name = cells[0];
    if (!name || name === "操作" || name === "列") continue;
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

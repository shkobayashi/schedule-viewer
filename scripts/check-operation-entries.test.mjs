import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { validateOperationEntryCoverage } from "./operationEntryCoverage.mjs";
import { loadOperationEntryCatalog } from "./export-operation-entry-catalog.mjs";

const repo = new URL("..", import.meta.url).pathname;
const docPath = `${repo}/docs/operation-entries.md`;
const baseDoc = readFileSync(docPath, "utf8");

/** @type {object | undefined} */
let catalog;

function getCatalog() {
  if (!catalog) catalog = loadOperationEntryCatalog();
  return catalog;
}

function mutateDoc(mutator) {
  return mutator(baseDoc);
}

function expectFailures(doc, patterns) {
  const { errors } = validateOperationEntryCoverage(doc, getCatalog());
  assert.ok(errors.length > 0, `expected failures; got none`);
  for (const pattern of patterns) {
    assert.match(
      errors.join("\n"),
      pattern,
      `missing pattern ${pattern}: ${errors.join("; ")}`,
    );
  }
}

test("check-operation-entries matches labels and MCP names in operation-entries.md", () => {
  const result = spawnSync("npx", ["tsx", "scripts/check-operation-entries.ts"], {
    encoding: "utf8",
    cwd: repo,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || "check-operation-entries exited non-zero",
  );
});

test("wrong TOOLBAR_SHORT key in toolbar column fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("TOOLBAR_SHORT.tierDay", "TOOLBAR_SHORT.tierNight"),
  );
  expectFailures(doc, [/TOOLBAR_SHORT\.tierNight がソースに無い/]);
});

test("removed context menu label token fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| タスクを削除 | 削除 | 削除 | 削除 |",
      "| タスクを削除 | 削除 | 削除済みラベル | 削除 |",
    ),
  );
  expectFailures(doc, [/右クリック.*削除済みラベル/]);
});

test("forbidden --window on open_windows CLI fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`--screen open_windows`",
      "`--screen open_windows --window foo`",
    ),
  );
  expectFailures(doc, [/open_windows は --window を付けられない/]);
});

test("unresolved feature ID 他 fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| `set_preferences` | `--screen set_preferences` | `SET-01`、`SET-02`、`SET-03`、`SET-04`、`SET-05`、`SET-06`、`SET-07`、`SET-08`、`SET-09`、`SET-10` |",
      "| `set_preferences` | `--screen set_preferences` | `SET-01` 他 |",
    ),
  );
  expectFailures(doc, [/「他」は未解決/]);
});

test("false quoted guide span fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "スケジュールは、☰ の「開く」で読み込む",
      "`この引用は案内に存在しないテキスト`",
    ),
  );
  expectFailures(doc, [/操作の案内.*GuideItem\.text に無い/]);
});

test("schedule_diff row must not use baseline_diffs MCP name", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 差分テキストを読む | | | | | | | | `schedule_diff` |",
      "| 差分テキストを読む | | | | | | | | `baseline_diffs` |",
    ),
  );
  expectFailures(doc, [/baseline_diffs を書いてはいけない/]);
});

test("missing TOOLBAR_SHORT catalog citation fails toolbar short coverage", () => {
  const doc = mutateDoc((text) =>
    text.replaceAll("TOOLBAR_SHORT.tierDay", "TOOLBAR_SHORT_REMOVED.tierDay"),
  );
  expectFailures(doc, [/TOOLBAR_SHORT\.tierDay が表のどの行にも引用されていない/]);
});

test("hamburger label drift from SHARED_FILE_MENU_ROWS fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 開く | | | 開く | ⌘O / Ctrl+O | 開く | 開く |",
      "| 開く | | | 開く | ⌘O / Ctrl+O | 開く | ガイドに逃した開く |",
    ),
  );
  expectFailures(doc, [/☰.*ガイドに逃した開く/]);
});

test("wrong Mac shortcut for palette tierDay fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 日表示 | `日`（`TOOLBAR_SHORT.tierDay`。tier-toggle。title に ⌘/Ctrl+1） | | 日表示 | ⌘1 / Ctrl+1 |",
      "| 日表示 | `日`（`TOOLBAR_SHORT.tierDay`。tier-toggle。title に ⌘/Ctrl+1） | | 日表示 | ⌘9 / Ctrl+9 |",
    ),
  );
  expectFailures(doc, [/ショートカット.*日表示/]);
});

test("palette label absent from buildCommandPaletteItems fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 今日へ移動 | 今日（title に T） | | 今日 | T |", "| 今日へ移動 | 今日（title に T） | | 偽の今日コマンド | T |"),
  );
  expectFailures(doc, [/コマンドパレット.*偽の今日コマンド/]);
});

test("production doc passes direct validateOperationEntryCoverage", () => {
  const { errors } = validateOperationEntryCoverage(baseDoc, getCatalog());
  assert.deepEqual(errors, []);
});

test("toolbar visible label must match TOOLBAR_SHORT value exactly", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`月`（`TOOLBAR_SHORT.tierMonth`",
      "`月ではない`（`TOOLBAR_SHORT.tierMonth`",
    ),
  );
  expectFailures(doc, [/TOOLBAR_SHORT\.tierMonth.*一致しない/]);
});

test("empty fixed context-menu label fails catalog coverage", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 前後の線を外す | | `線を外す` |",
      "| 前後の線を外す | | |",
    ),
  );
  expectFailures(doc, [/固定ラベル「線を外す」が主表のどの行にも無い/]);
});

test("visible right-click text outside backticks fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| タスクを削除 | 削除 | 削除 | 削除 |",
      "| タスクを削除 | 削除 | 偽（`削除`） | 削除 |",
    ),
  );
  expectFailures(doc, [/右クリック.*偽/]);
});

test("focus_window without --window fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "--screen focus_window --window <label>",
      "--screen focus_window",
    ),
  );
  expectFailures(doc, [/focus_window は --window/]);
});

test("file_action with invalid action fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("`file_action` (open)", "`file_action` (notAnAction)"),
  );
  expectFailures(doc, [/file_action の action「notAnAction」/]);
});

test("recent palette double prefix fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "recentFileCommandPaletteLabel(\\`${prefix}${entry.label}\\`)",
      "recentFileCommandPaletteLabel(\\`最近開いたファイル ${prefix}${entry.label}\\`)",
    ),
  );
  expectFailures(doc, [/recent 行は/]);
});

test("malformed main-table column count fails parse", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 今日へ移動 | 今日（title に T） | | 今日 | T | 今日（T） | | | `set_view` | `--screen set_view` | `NAV-01` |",
      "| 今日へ移動 | 今日 | 今日 |",
    ),
  );
  expectFailures(doc, [/主表の列数が/]);
});

test("fake toolbar undo label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 取り消し | 取り消し |", "| 取り消し | 偽物 |"),
  );
  expectFailures(doc, [/ツールバー.*偽物/]);
});

test("fake toolbar today label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 今日へ移動 | 今日（title に T） |",
      "| 今日へ移動 | 偽物（title に T） |",
    ),
  );
  expectFailures(doc, [/ツールバー.*偽物/]);
});

test("cleared hierarchy toolbar fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 階層の名前・意味・指示を編集 | 階層編集 |",
      "| 階層の名前・意味・指示を編集 | |",
    ),
  );
  expectFailures(doc, [/階層編集.*セルが空/]);
});

test("wrong display scale enlarge keys fail validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("⌘+ / ⌘= / Ctrl+ / Ctrl=", "⌘9 / Ctrl+9"),
  );
  expectFailures(doc, [/matchDisplayScale/]);
});

test("delete shortcut with NotAKey fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("Delete / Backspace", "Delete / NotAKey"),
  );
  expectFailures(doc, [/Backspace 以外/]);
});

test("empty tierDay shortcut with palette label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 日表示 | `日`（`TOOLBAR_SHORT.tierDay`。tier-toggle。title に ⌘/Ctrl+1） | | 日表示 | ⌘1 / Ctrl+1 |",
      "| 日表示 | `日`（`TOOLBAR_SHORT.tierDay`。tier-toggle。title に ⌘/Ctrl+1） | | 日表示 | |",
    ),
  );
  expectFailures(doc, [/日表示.*列が空/]);
});

test("wrong context menu template placeholder fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`下に${levelName}を追加`",
      "`下に${nope}を追加`",
    ),
  );
  expectFailures(doc, [/テンプレート.*nope/]);
});

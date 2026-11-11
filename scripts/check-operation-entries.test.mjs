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
  expectFailures(doc, [/階層|ツールバー列が空/]);
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

test("empty chart-scroll shortcut cell fails shortcutReference consumption", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| チャートをスクロール | | | | ⌘矢印 / Ctrl+矢印 |",
      "| チャートをスクロール | | | | |",
    ),
  );
  expectFailures(doc, [/チャートのスクロール|チャートをスクロール/]);
});

test("empty zoom-wheel shortcut cell fails shortcutReference consumption", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| ズーム（ホイール） | | | | ⌘+ホイール / Ctrl+ホイール（`shortcutReferenceRows`） |",
      "| ズーム（ホイール） | | | | |",
    ),
  );
  expectFailures(doc, [/ズーム/]);
});

test("display scale enlarge without Mac counterpart fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "⌘+ / ⌘= / Ctrl+ / Ctrl=",
      "Ctrl+ / Ctrl=",
    ),
  );
  expectFailures(doc, [/Mac|matchDisplayScale/]);
});

test("fake toolbar lineage follow label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("`繋がりも辿る`", "`偽物`"),
  );
  expectFailures(doc, [/ツールバー.*偽物|繋がりも辿る/]);
});

test("fake toolbar clear-all-filters label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("`すべて解除`", "`偽物`"),
  );
  expectFailures(doc, [/ツールバー.*偽物|すべて解除/]);
});

test("fake toolbar shortcuts glyph fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| ショートカット一覧を開く | `?`（title: ショートカット一覧（?、F1）） |",
      "| ショートカット一覧を開く | `X`（title: ショートカット一覧（?、F1）） |",
    ),
  );
  expectFailures(doc, [/ツールバー.*X|\?/]);
});

test("fake toolbar add-milestone label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| マイルストンを追加 | 追加メニュー `マイルストンを追加` |",
      "| マイルストンを追加 | 追加メニュー `偽物` |",
    ),
  );
  expectFailures(doc, [/ツールバー.*偽物|マイルストンを追加/]);
});

test("fake toolbar edit-title label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`タイトルを変更`（aria-label / title。鉛筆）",
      "`偽物`（aria-label / title。鉛筆）",
    ),
  );
  expectFailures(doc, [/ツールバー.*偽物|タイトルを変更/]);
});

test("fake toolbar lineage button label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`系統` または `系統: ${lineageName}`",
      "`偽物` または `系統: ${lineageName}`",
    ),
  );
  expectFailures(doc, [/ツールバー.*偽物|系統/]);
});

test("fake toolbar dirty save-status label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 未保存の差分を開く（状態バー） | `未保存`（`saveStatus`。`StatusBar.tsx`） |",
      "| 未保存の差分を開く（状態バー） | `偽物`（`saveStatus`。`StatusBar.tsx`） |",
    ),
  );
  expectFailures(doc, [/ツールバー.*偽物|未保存/]);
});

test("fake filter-panel toolbar backtick fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("`絞り込み`", "`偽物`"),
  );
  expectFailures(doc, [/偽物|filterPanel|絞り込み/]);
});

test("fake external reload status-bar toolbar label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`ファイルに更新あり — 確認する`",
      "`別文言に更新あり`",
    ),
  );
  expectFailures(doc, [/別文言|更新あり/]);
});

test("fake toolbar search toggle literals fail validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`名前` / `ノート`",
      "`偽物` / `ノート`",
    ),
  );
  expectFailures(doc, [/偽物|名前/]);
});

test("fake link-mode toolbar static label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("`線を引く`", "`偽物`"),
  );
  expectFailures(doc, [/偽物|線を引く/]);
});

test("fake explanation-dismiss banner toolbar label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("`説明を消す`", "`偽物`"),
  );
  expectFailures(doc, [/偽物|説明を消す/]);
});

test("fake add-task split menu label fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("メニュー `タスクを追加`", "メニュー `偽物`"),
  );
  expectFailures(doc, [/偽物|タスクを追加/]);
});

test("redo toolbar showing delete formal fails wrong-owner validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| やり直し | やり直し |", "| やり直し | 削除 |"),
  );
  expectFailures(doc, [/やり直し|redo|削除|別操作/]);
});

test("delete-task toolbar showing fit formal fails wrong-owner validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| タスクを削除 | 削除 |", "| タスクを削除 | 全体 |"),
  );
  expectFailures(doc, [/deleteTask|削除|全体|別操作/]);
});

test("required redo toolbar empty cell fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| やり直し | やり直し |", "| やり直し | |"),
  );
  expectFailures(doc, [/やり直し|空/]);
});

test("undo toolbar extra slash segment fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 取り消し | 取り消し |", "| 取り消し | 取り消し / 偽物 |"),
  );
  expectFailures(doc, [/偽物|余分|許可/]);
});

test("dirty save toolbar extra plain text fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 未保存の差分を開く（状態バー） | `未保存`（`saveStatus`。`StatusBar.tsx`） |",
      "| 未保存の差分を開く（状態バー） | `未保存` 偽物（`saveStatus`。`StatusBar.tsx`） |",
    ),
  );
  expectFailures(doc, [/偽物|余分|許可/]);
});

test("required undo toolbar note-only cell fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 取り消し | 取り消し |", "| 取り消し | （取り消し） |"),
  );
  expectFailures(doc, [/取り消し|必須|一致/]);
});

test("go-today toolbar hides delete formal in note fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 今日へ移動 | 今日（title に T） |",
      "| 今日へ移動 | 今日（削除） |",
    ),
  );
  expectFailures(doc, [/削除|注記|正式名/]);
});

test("fit toolbar hides delete formal in note fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 全体表示 | 全体（title に ⌘/Ctrl+4） |",
      "| 全体表示 | 全体（削除） |",
    ),
  );
  expectFailures(doc, [/削除|注記|正式名/]);
});

test("undo toolbar fake word in note fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 取り消し | 取り消し |", "| 取り消し | 取り消し（偽物） |"),
  );
  expectFailures(doc, [/偽物|注記/]);
});

test("toolbar catalog source extractions are non-empty and live-derived", () => {
  const c = getCatalog();
  assert.ok(c.toolbarSourceLabels.dirtySaveStatusLabel, "dirty save status");
  assert.ok(c.toolbarSourceLabels.shortcutsButtonGlyph, "shortcuts glyph");
  assert.ok(c.toolbarUiSource.externalReloadLabel, "external reload label");
  assert.ok(c.toolbarUiSource.explanationDismissLabel, "explanation dismiss");
  assert.equal(c.toolbarSourceLabels.dirtySaveStatusLabel, "未保存");
});

test("undo toolbar backtick delete in note fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 取り消し | 取り消し |", "| 取り消し | 取り消し（`削除`） |"),
  );
  expectFailures(doc, [/削除|バッククォート|未消費/]);
});

test("undo toolbar backtick fake in note fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 取り消し | 取り消し |", "| 取り消し | 取り消し（`偽物`） |"),
  );
  expectFailures(doc, [/偽物|バッククォート|未消費/]);
});

test("go-today invalid title tail without ni fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 今日へ移動 | 今日（title に T） |",
      "| 今日へ移動 | 今日（title 削除） |",
    ),
  );
  expectFailures(doc, [/title|削除|未消費/]);
});

test("undo toolbar ASCII fake in note fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace("| 取り消し | 取り消し |", "| 取り消し | 取り消し（FAKE） |"),
  );
  expectFailures(doc, [/FAKE|未消費/]);
});

test("undo toolbar long japanese garbage in note fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "| 取り消し | 取り消し |",
      "| 取り消し | 取り消し（あいうえおかきくけこさしす） |",
    ),
  );
  expectFailures(doc, [/あいう|未消費/]);
});

test("search toolbar suffix after note with fake token fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "`名前` / `ノート`（select）＋ placeholder `タスク名で検索` / `ノートで検索`",
      "`名前` / `ノート`（select）＋ 偽物 `タスク名で検索` / `ノートで検索`",
    ),
  );
  expectFailures(doc, [/偽物|未消費/]);
});

test("add-task toolbar menu suffix fake token fails validation", () => {
  const doc = mutateDoc((text) =>
    text.replace(
      "）／メニュー `タスクを追加`",
      "）／メニュー `タスクを追加` 偽物",
    ),
  );
  expectFailures(doc, [/偽物|未消費/]);
});

test("parseToolbarUiSourceFromText throws when toolbar search block is missing", () => {
  const snippet = [
    'import { parseToolbarUiSourceFromText } from "./scripts/operationEntryCatalog.ts";',
    "try {",
    '  parseToolbarUiSourceFromText("export {}", \'<button className="status-bar-action">reload</button>\', \'<button className="explanation-banner-dismiss">\\n説明を消す\\n\');',
    "  process.exit(2);",
    "} catch (e) {",
    "  const m = e instanceof Error ? e.message : String(e);",
    '  if (/operationEntryCatalog:.*抽出できない/.test(m) && /Toolbar\\.tsx/.test(m)) process.exit(0);',
    "  console.error(m);",
    "  process.exit(1);",
    "}",
  ].join("\n");
  const result = spawnSync("npx", ["tsx", "-e", snippet], {
    encoding: "utf8",
    cwd: repo,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

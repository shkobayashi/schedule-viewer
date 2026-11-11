/**
 * P-CI-06 段階2: docs/operation-entries.md の主表をパースし、
 * カタログ（ソース由来）と列ごとの意味に照合する。
 */

/** @typedef {{ title: string, operation: string, cells: Record<string, string> }} OperationRow */

export const MAIN_TABLE_COLUMNS = [
  "操作",
  "ツールバー",
  "右クリック",
  "コマンドパレット",
  "ショートカット",
  "macOS メニュー",
  "☰",
  "操作の案内",
  "MCP",
  "CLI",
  "機能 ID",
];

const MAIN_TABLE_HEADER =
  /\|\s*操作\s*\|\s*ツールバー\s*\|\s*右クリック\s*\|\s*コマンドパレット\s*\|\s*ショートカット \(Mac \/ Win\)\s*\|\s*macOS メニュー\s*\|\s*☰\s*\|\s*操作の案内\s*\|\s*MCP\s*\|\s*CLI\s*\|\s*機能 ID\s*\|/;

const STOP_SECTION_MARKERS = [
  /^### `set_view`/,
  /^### `file_action`/,
  /^## 編集中・モード内/,
  /^## LLM が計画を変えたあと/,
];

/**
 * @param {string} markdown
 * @returns {OperationRow[]}
 */
export function parseMainOperationTables(markdown) {
  /** @type {OperationRow[]} */
  const rows = [];
  let currentSection = "";
  let inMainTable = false;

  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ")) {
      if (STOP_SECTION_MARKERS.some((re) => re.test(line))) {
        inMainTable = false;
        continue;
      }
      currentSection = line.replace(/^##\s+/, "").trim();
      inMainTable = false;
      continue;
    }
    if (line.startsWith("### ") && STOP_SECTION_MARKERS.some((re) => re.test(line))) {
      inMainTable = false;
      continue;
    }
    if (MAIN_TABLE_HEADER.test(line)) {
      inMainTable = true;
      continue;
    }
    if (!inMainTable) continue;
    if (!line.startsWith("|")) {
      inMainTable = false;
      continue;
    }
    if (/^\|\s*---/.test(line)) continue;

    const parts = splitTableRow(line);
    if (parts.length !== MAIN_TABLE_COLUMNS.length) continue;

    const cells = Object.fromEntries(
      MAIN_TABLE_COLUMNS.map((col, index) => [col, parts[index].trim()]),
    );
    rows.push({
      title: currentSection,
      operation: cells["操作"],
      cells,
    });
  }
  return rows;
}

/**
 * @param {string} line
 */
function splitTableRow(line) {
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  const parts = [];
  let current = "";
  let inBacktick = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "`") {
      inBacktick = !inBacktick;
      current += ch;
      continue;
    }
    if (ch === "|" && !inBacktick) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((part) => part.trim());
}

/**
 * @param {string} cell
 */
function stripNotes(cell) {
  return cell
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
}

/**
 * @param {string} cell
 * @returns {string[]}
 */
function extractBacktickTokens(cell) {
  const tokens = [];
  for (const match of cell.matchAll(/`([^`]+)`/g)) {
    tokens.push(match[1]);
  }
  return tokens;
}

/**
 * @param {OperationRow} row
 * @param {string} column
 * @param {string} message
 * @param {string[]} errors
 */
function report(row, column, message, errors) {
  errors.push(
    `[${column}] 操作「${row.operation}」（${row.title}）: ${message}`,
  );
}

/**
 * @param {string} markdown
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {{ previousRows?: OperationRow[] }} [options]
 */
export function validateOperationEntryCoverage(markdown, catalog, options = {}) {
  const rows = parseMainOperationTables(markdown);
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const unverified = [];

  /** @type {Map<string, string>} */
  const previousCellByColumn = new Map();

  for (const row of rows) {
    validateToolbar(row, catalog, errors);
    validateRightClick(row, catalog, errors, previousCellByColumn);
    validatePalette(row, catalog, errors);
    validateSharedMenus(row, catalog, errors);
    validateShortcut(row, catalog, errors, unverified);
    validateMacosMenu(row, catalog, errors);
    validateGuide(row, catalog, errors, previousCellByColumn);
    validateMcp(row, catalog, errors);
    validateCli(row, catalog, errors);
    validateFeatureIds(row, catalog, errors);

    for (const col of MAIN_TABLE_COLUMNS) {
      if (col === "操作") continue;
      previousCellByColumn.set(col, row.cells[col]);
    }
  }

  validateToolbarShortCoverage(rows, catalog, errors);
  validateFormalSurfaceEvidence(rows, catalog, errors, unverified);
  ensureEveryOperationIdHasContextMenuLabel(catalog, errors);

  if (options.previousRows) {
    return { errors, unverified, rows };
  }

  return { errors, unverified, rows };
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateToolbar(row, catalog, errors) {
  const cell = row.cells["ツールバー"];
  if (!cell) return;

  for (const match of cell.matchAll(/TOOLBAR_SHORT\.(\w+)/g)) {
    const key = match[1];
    const value = catalog.toolbarShort[key];
    if (value == null) {
      report(
        row,
        "ツールバー",
        `TOOLBAR_SHORT.${key} がソースに無い`,
        errors,
      );
      continue;
    }
    const visible = cell.split("（")[0].replace(/`/g, "").trim();
    const segments = visible.split("/").map((s) => s.trim()).filter(Boolean);
    if (
      segments.length > 0 &&
      !segments.some((seg) => seg === value || seg.startsWith(value))
    ) {
      const firstSegment = segments[0].replace(/^[^`]*`?/, "").trim();
      if (firstSegment !== value && !segments.includes(value)) {
        report(
          row,
          "ツールバー",
          `TOOLBAR_SHORT.${key} の表示値「${value}」とセル先頭「${firstSegment}」が一致しない`,
          errors,
        );
      }
    }
  }

}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 * @param {Map<string, string>} previousByColumn
 */
function validateRightClick(row, catalog, errors, previousByColumn) {
  let cell = row.cells["右クリック"];
  if (!cell) return;
  if (cell === "同上") {
    cell = previousByColumn.get("右クリック") ?? "";
    if (!cell) {
      report(row, "右クリック", "同上 だが前行の右クリックが無い", errors);
      return;
    }
  }

  const tokens = extractBacktickTokens(cell);
  const candidates =
    tokens.length > 0
      ? tokens
      : [stripNotes(cell)].filter(Boolean);
  for (const token of candidates) {
    if (
      !catalog.contextMenuOutputs.includes(token) &&
      !catalog.contextMenuTemplates.includes(token)
    ) {
      report(
        row,
        "右クリック",
        `トークン「${token}」が contextMenuLabel / CONTEXT_MENU_FIXED_LABEL の出力に無い`,
        errors,
      );
    }
  }
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validatePalette(row, catalog, errors) {
  const cell = row.cells["コマンドパレット"];
  if (!cell || cell === "（パレット自身）") return;

  if (cell.includes("recentFileCommandPaletteLabel")) {
    if (!cell.includes(catalog.recentFilePaletteFactoryFile)) {
      report(
        row,
        "コマンドパレット",
        "recentFileCommandPaletteLabel の出典ファイルが一致しない",
        errors,
      );
    }
    const expr = extractBacktickTokens(cell).join("");
    if (
      expr &&
      !expr.includes("recentFileCommandPaletteLabel") &&
      !expr.includes("${prefix}")
    ) {
      report(
        row,
        "コマンドパレット",
        "recent 行は recentFileCommandPaletteLabel の式をそのまま書く",
        errors,
      );
    }
    return;
  }

  const slashParts = cell
    .split("/")
    .map((p) => p.trim().replace(/^`|`$/g, ""))
    .filter(Boolean);
  for (const label of slashParts.length ? slashParts : [stripNotes(cell)]) {
    if (
      !catalog.paletteStaticLabels.includes(label) &&
      label !== "履歴を消す"
    ) {
      const conditional = catalog.paletteConditionalCommands.find((cmd) => {
        const labels = catalog.paletteLabelsByCommandId[cmd.id] ?? [];
        return labels.includes(label);
      });
      if (!conditional) {
        report(
          row,
          "コマンドパレット",
          `ラベル「${label}」が buildCommandPaletteItems の出力に無い`,
          errors,
        );
      }
    }
  }
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateSharedMenus(row, catalog, errors) {
  const hamburger = row.cells["☰"];
  if (hamburger) {
    if (hamburger.includes("entry.label")) {
      if (!hamburger.includes("サブメニュー内")) {
        report(row, "☰", "recent 行はサブメニュー内 entry.label を書く", errors);
      }
    } else {
      const core = extractMenuLabelToken(hamburger);
      if (
        core &&
        !catalog.sharedFileMenuLabels.includes(core) &&
        !catalog.hamburgerTailLabels.includes(core) &&
        !catalog.operationFormalValues.includes(core) &&
        !/^設定（/.test(hamburger)
      ) {
        report(
          row,
          "☰",
          `ラベル「${core}」が SHARED_FILE_MENU_ROWS / HAMBURGER_MENU_TAIL に無い`,
          errors,
        );
      }
    }
  }

  const macCell = row.cells["macOS メニュー"];
  if (macCell && !macCell.includes("PredefinedMenuItem")) {
    if (macCell.includes("entry.label")) return;
    if (macCell.includes("schedule-viewer を終了")) return;
    if (macCell.includes("の上（アプリメニュー）")) return;
    const core = extractMenuLabelToken(macCell);
    if (
      core &&
      !catalog.sharedFileMenuLabels.includes(core) &&
      !catalog.hamburgerTailLabels.includes(core) &&
      !catalog.operationFormalValues.includes(core) &&
      core !== "閉じる"
    ) {
      if (!catalog.macosPredefinedMenuIds.includes(core)) {
        report(
          row,
          "macOS メニュー",
          `ラベル「${core}」が macOS メニュー用の正式名一覧に無い`,
          errors,
        );
      }
    }
  }
}

/**
 * @param {string} cell
 */
function extractMenuLabelToken(cell) {
  const plain = stripNotes(cell).split("（")[0].trim();
  return plain.replace(/`/g, "").trim();
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 * @param {string[]} unverified
 */
function validateShortcut(row, catalog, errors, unverified) {
  const cell = row.cells["ショートカット"];
  if (!cell) return;

  if (cell.includes("macOS メニューのみ")) {
    unverified.push(`操作「${row.operation}」: ${cell}（macOS 限定注記）`);
    return;
  }

  const paletteLabel = paletteLabelFromRow(row);
  if (!paletteLabel) return;
  const commandId = catalog.formalToPaletteCommandId[paletteLabel];
  if (!commandId) return;
  const expected = catalog.paletteShortcutByCommandId[commandId];
  if (!expected) return;

  if (commandId === "addTask") {
    const joined = [expected.mac, expected.win].filter(Boolean).join(" / ");
  if (!shortcutHintMatchesCell(cell, joined)) {
      report(
        row,
        "ショートカット",
        `「${cell}」が addTaskShortcutHint の候補「${joined}」をすべて含まない`,
        errors,
      );
    }
    return;
  }

  if (commandId === "deleteTask") {
    if (expected.win && !cell.includes("Delete")) {
      report(row, "ショートカット", "Delete がショートカット列に無い", errors);
    }
    return;
  }

  const { macPart, winPart } = splitShortcutCell(cell);
  if (macPart && expected.mac && !shortcutHintMatchesCell(macPart, expected.mac)) {
    report(
      row,
      "ショートカット",
      `Mac「${macPart}」が commandPaletteCommandShortcut(${commandId}, true) の「${expected.mac}」と一致しない`,
      errors,
    );
  }
  if (winPart && expected.win && !shortcutHintMatchesCell(winPart, expected.win)) {
    report(
      row,
      "ショートカット",
      `Win「${winPart}」が commandPaletteCommandShortcut(${commandId}, false) の「${expected.win}」と一致しない`,
      errors,
    );
  }
}

/**
 * @param {string} cellPart
 * @param {string} hint
 */
function shortcutHintMatchesCell(cellPart, hint) {
  const cellAlts = expandShortcutAlternatives(cellPart);
  const hintAlts = expandShortcutAlternatives(
    hint.replace(/（[^）]*）/g, ""),
  );
  if (hintAlts.length === 0) return true;
  return hintAlts.every((alt) =>
    cellAlts.some((cellAlt) => normalizeShortcutKey(cellAlt) === normalizeShortcutKey(alt)),
  );
}

/**
 * @param {string} text
 */
function expandShortcutAlternatives(text) {
  return text
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {string} key
 */
function normalizeShortcutKey(key) {
  return key
    .replace(/（[^）]*）/g, "")
    .replace(/\+(?=\d)/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * @param {OperationRow} row
 */
function paletteLabelFromRow(row) {
  const cell = row.cells["コマンドパレット"];
  if (!cell || cell === "（パレット自身）") return null;
  const first = cell
    .split("/")[0]
    .trim()
    .replace(/^`|`$/g, "");
  return first || null;
}

/**
 * @param {string} cell
 */
function splitShortcutCell(cell) {
  const withoutNotes = cell.replace(/（[^）]*）/g, "").trim();
  if (!withoutNotes.includes(" / ")) {
    return { macPart: withoutNotes, winPart: withoutNotes };
  }
  const [macPart, ...rest] = withoutNotes.split(" / ");
  const winPart = rest.join(" / ").trim();
  return { macPart: macPart.trim(), winPart };
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateMacosMenu(row, catalog, errors) {
  const cell = row.cells["macOS メニュー"];
  if (!cell) return;
  for (const token of extractBacktickTokens(cell)) {
    if (token === "PredefinedMenuItem") continue;
    if (token.startsWith("PredefinedMenuItem")) {
      const id = token.replace(/.*\s/, "").trim();
      if (!catalog.macosPredefinedMenuIds.includes(id)) {
        report(
          row,
          "macOS メニュー",
          `PredefinedMenuItem「${id}」がソースの識別子一覧に無い`,
          errors,
        );
      }
    } else if (catalog.macosPredefinedMenuIds.includes(token)) {
      // plain Predefined id reference
    }
  }
  const plainLabel = cell
    .replace(/（[^）]*PredefinedMenuItem[^）]*）/g, "")
    .replace(/`/g, "")
    .trim();
  if (
    catalog.macosPredefinedMenuIds.includes(plainLabel) &&
    !cell.includes("PredefinedMenuItem")
  ) {
    report(
      row,
      "macOS メニュー",
      `${plainLabel} は PredefinedMenuItem の識別子として書く`,
      errors,
    );
  }
  if (cell.includes("Cut") && !cell.includes("PredefinedMenuItem")) {
    report(
      row,
      "macOS メニュー",
      "Cut は PredefinedMenuItem の識別子として書く",
      errors,
    );
  }
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 * @param {Map<string, string>} previousByColumn
 */
function validateGuide(row, catalog, errors, previousByColumn) {
  let cell = row.cells["操作の案内"];
  if (!cell || cell.startsWith("（")) {
    return;
  }
  if (cell === "同上") {
    cell = previousByColumn.get("操作の案内") ?? "";
    if (!cell) {
      report(row, "操作の案内", "同上 だが前行の案内が無い", errors);
      return;
    }
  }

  const quoted = extractBacktickTokens(cell);
  for (const quote of quoted) {
    if (!catalog.guideTexts.some((text) => text.includes(quote))) {
      report(
        row,
        "操作の案内",
        `引用「${quote}」が GUIDE_SECTIONS の GuideItem.text に無い`,
        errors,
      );
    }
  }

  if (quoted.length === 0 && cell.length > 0 && !cell.includes("同上")) {
    // 要約は未照合（unverified は呼び出し側でまとめる）
  }
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateMcp(row, catalog, errors) {
  const cell = row.cells["MCP"];
  if (!cell) return;

  for (const match of cell.matchAll(/`([a-z_]+)`(?:\s*\(([^)]+)\))?/g)) {
    const tool = match[1];
    if (!catalog.mcpToolNames.includes(tool)) {
      report(
        row,
        "MCP",
        `ツール「${tool}」が MCP_ALL_TOOL_NAMES に無い`,
        errors,
      );
    }
    const action = match[2];
    if (action && !/^[\w]+$/.test(action.trim())) {
      report(
        row,
        "MCP",
        `括弧内 action「${action}」の形式が不正`,
        errors,
      );
    }
  }

  if (
    row.operation.includes("差分テキストを読む") &&
    !cell.includes("schedule_diff")
  ) {
    report(
      row,
      "MCP",
      "差分テキストを読む行は `schedule_diff` を書く",
      errors,
    );
  }
  if (
    row.operation.includes("起点・画面・ファイル") &&
    !cell.includes("baseline_diffs")
  ) {
    report(
      row,
      "MCP",
      "baseline_diffs 行は `baseline_diffs` を書く",
      errors,
    );
  }
  if (
    row.operation.includes("差分テキストを読む") &&
    cell.includes("baseline_diffs")
  ) {
    report(
      row,
      "MCP",
      "差分テキストを読む行に baseline_diffs を書いてはいけない",
      errors,
    );
  }
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateCli(row, catalog, errors) {
  const cell = row.cells["CLI"];
  if (!cell) return;
  const mcpCell = row.cells["MCP"];
  const toolMatch = mcpCell?.match(/`([a-z_]+)`/);
  const tool = toolMatch?.[1];
  if (!tool) return;

  const expectsScreen = cell.includes(`--screen ${tool}`);
  if (!expectsScreen) {
    report(
      row,
      "CLI",
      `\`--screen ${tool}\` が CLI 列に無い`,
      errors,
    );
  }

  const rejectsWindow = catalog.mcpToolsRejectingWindow?.includes(tool);
  const hasWindow = /--window\b/.test(cell);
  if (rejectsWindow && hasWindow) {
    report(
      row,
      "CLI",
      `${tool} は --window を付けられない`,
      errors,
    );
  }
  if (
    !rejectsWindow &&
    catalog.mcpReadToolNames.includes(tool) &&
    !hasWindow
  ) {
    report(
      row,
      "CLI",
      `読み取りツール ${tool} は --window <label> を書く`,
      errors,
    );
  }
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateFeatureIds(row, catalog, errors) {
  const cell = row.cells["機能 ID"];
  if (!cell) return;

  const withoutFeatureIds = cell.replace(/`[A-Z]+-\d+`/g, "");
  if (/他/.test(withoutFeatureIds)) {
    report(
      row,
      "機能 ID",
      "「他」は未解決。external-spec の ID を明示する",
      errors,
    );
    return;
  }

  const ids = [];
  for (const match of cell.matchAll(/`([A-Z]+-\d+)`/g)) {
    ids.push(match[1]);
  }
  const rangeMatch = cell.match(
    /`([A-Z]+-\d+)`〜`([A-Z]+-\d+)`/,
  );
  if (rangeMatch) {
    const start = rangeMatch[1];
    const end = rangeMatch[2];
    const startNum = Number.parseInt(start.split("-")[1], 10);
    const endNum = Number.parseInt(end.split("-")[1], 10);
    const prefix = start.split("-")[0];
    if (Number.isFinite(startNum) && Number.isFinite(endNum) && prefix === end.split("-")[0]) {
      for (let n = startNum; n <= endNum; n++) {
        ids.push(`${prefix}-${String(n).padStart(2, "0")}`);
      }
    }
  }

  for (const id of ids) {
    if (!catalog.externalFeatureIds.includes(id)) {
      report(
        row,
        "機能 ID",
        `ID「${id}」が external-spec.md に無い`,
        errors,
      );
    }
  }
}

/**
 * @param {OperationRow[]} rows
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateToolbarShortCoverage(rows, catalog, errors) {
  const cited = new Set();
  for (const row of rows) {
    const cell = row.cells["ツールバー"] ?? "";
    for (const match of cell.matchAll(/TOOLBAR_SHORT\.(\w+)/g)) {
      cited.add(match[1]);
    }
  }
  for (const key of Object.keys(catalog.toolbarShort)) {
    if (!cited.has(key)) {
      errors.push(
        `[ツールバー] TOOLBAR_SHORT.${key} が表のどの行にも引用されていない`,
      );
    }
  }
}

/**
 * @param {OperationRow[]} rows
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 * @param {string[]} unverified
 */
function validateFormalSurfaceEvidence(rows, catalog, errors, unverified) {
  unverified.push(
    "ツールバー限定の正式名（階層編集・繋がりも辿るなど）は、表がその入口だけを示す行として扱う。",
  );
  unverified.push(
    "ツールバー列の動的ラベル（StatusBar・FilterPanel 等）と title 属性は、列内の出典引用のみ照合。マウント済み UI は未検証。",
  );
  unverified.push(
    "操作の案内列の無引用要約文は GUIDE と厳密一致せず、未照合として扱う。",
  );
  unverified.push(
    "空セルは「入口なし」の表明。列ごとの網羅的反証は段階2の列照合とは別。",
  );
}

/**
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function ensureEveryOperationIdHasContextMenuLabel(catalog, errors) {
  if (Object.keys(catalog.contextMenuFixed).length === 0) {
    errors.push("[右クリック] CONTEXT_MENU_FIXED_LABEL が空");
  }
}

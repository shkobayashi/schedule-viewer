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

/** 操作列の見出し → shortcutReferenceRows の action */
const OPERATION_TO_SHORTCUT_ACTION = {
  "今日へ移動": "今日",
  "タスク名／ノートで検索": "検索",
  "コマンドパレットを開く／閉じる": "コマンドパレット",
  "ショートカット一覧を開く": "ショートカット一覧",
  "チャートをスクロール": "チャートのスクロール",
  "ズーム（ホイール）": "ズーム",
  "横スクロール（ホイール）": "横スクロール",
  "表示サイズを拡大": "表示サイズ",
  "表示サイズを縮小": "表示サイズ",
  "絞り込みパネルを開く": "絞り込みパネル",
  "系統を表示／解除": "系統を表示／解除",
  "系統を表示／解除（タスク）": "系統を表示／解除",
  "確定／未確定（タスク）": "確定／未確定（選択中のタスク）",
  "同じグループ内で並べ替え": "同じグループで上下に移動",
  "タスクを編集（詳細）": "編集",
  "ノートを開く": "ノート",
  "線を引くモード": "線を引く",
  "全体表示": "全体表示",
};

/**
 * @param {string} markdown
 * @returns {{ rows: OperationRow[], parseErrors: string[] }}
 */
export function parseMainOperationTables(markdown) {
  /** @type {OperationRow[]} */
  const rows = [];
  /** @type {string[]} */
  const parseErrors = [];
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
    if (parts.length !== MAIN_TABLE_COLUMNS.length) {
      parseErrors.push(
        `主表の列数が ${MAIN_TABLE_COLUMNS.length} ではない（${parts.length} 列）: ${line.trim()}`,
      );
      continue;
    }

    const cells = Object.fromEntries(
      MAIN_TABLE_COLUMNS.map((col, index) => [col, parts[index].trim()]),
    );
    rows.push({
      title: currentSection,
      operation: cells["操作"],
      cells,
    });
  }
  return { rows, parseErrors };
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
  const { rows, parseErrors } = parseMainOperationTables(markdown);
  /** @type {string[]} */
  const errors = [...parseErrors];
  /** @type {string[]} */
  const unverified = [];

  /** @type {Map<string, string>} */
  const previousCellByColumn = new Map();
  /** @type {Set<string>} */
  const shortcutActionsMatched = new Set();

  for (const row of rows) {
    validateToolbar(row, catalog, errors, unverified);
    validateRightClick(row, catalog, errors, previousCellByColumn);
    validatePalette(row, catalog, errors);
    validateSharedMenus(row, catalog, errors);
    validateShortcut(row, catalog, errors, unverified, shortcutActionsMatched);
    validateMacosMenu(row, catalog, errors);
    validateGuide(row, catalog, errors, previousCellByColumn, unverified);
    validateMcp(row, catalog, errors);
    validateCli(row, catalog, errors);
    validateFeatureIds(row, catalog, errors);

    for (const col of MAIN_TABLE_COLUMNS) {
      if (col === "操作") continue;
      previousCellByColumn.set(col, row.cells[col]);
    }
  }

  validateToolbarShortCoverage(rows, catalog, errors);
  validateCatalogColumnCoverage(rows, catalog, errors);
  validateShortcutReferenceConsumption(rows, catalog, shortcutActionsMatched, errors);
  appendKnownLimitations(unverified);
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
function toolbarVisibleSegments(cell) {
  const head = cell.split("（")[0];
  return head
    .split("/")
    .map((seg) => seg.replace(/`/g, "").trim())
    .filter(Boolean);
}

/** 主表でツールバー列が「（…）」のみで正当な操作（固定ラベルなし／設定内） */
const TOOLBAR_PARENTHESIS_ONLY_OPERATIONS = new Set([
  "タスクバーをドラッグして期間変更",
  "メンバー／色／ステータス／拡張項目の一覧操作",
  "JSON作成スキル・更新確認の設定",
]);

const TOOLBAR_HEAD_CONNECTIVES = new Set(["または", "＋", "／"]);
const TOOLBAR_HEAD_STRUCTURAL = new Set([
  "メニュー",
  "追加メニュー",
  "split",
  "主ボタン",
  "select",
]);

const TOOLBAR_NOTE_ALLOW_WORDS = new Set([
  "select",
  "title",
  "placeholder",
  "split",
  "メニュー",
  "主ボタン",
  "系統",
  "操作の案内",
  "aria-label",
  "鉛筆",
  "バナー",
  "tier-toggle",
  "shortcutReferenceRows",
  "saveStatus",
  "StatusBar.tsx",
  "ActiveFilterBar.tsx",
]);

/** @param {import("./operationEntryCatalog.ts").ToolbarOperationSpec} spec */
/** @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog */
function toolbarAllowedVisibleLabels(spec, catalog) {
  /** @type {Set<string>} */
  const allowed = new Set();
  if (spec.ownerFormal) {
    allowed.add(catalog.operationFormal[spec.ownerFormal]);
  }
  if (spec.toolbarShortKeys) {
    for (const key of spec.toolbarShortKeys) {
      const value = catalog.toolbarShort[key];
      if (value) allowed.add(value);
    }
  }
  if (spec.backtickStatic) {
    for (const lit of spec.backtickStatic) {
      if (lit.includes("${")) {
        allowed.add(lit.replace(/\$\{[^}]+\}/g, "").trim());
      } else {
        allowed.add(lit);
      }
    }
  }
  if (spec.slashLiterals) {
    for (const lit of spec.slashLiterals) allowed.add(lit);
  }
  if (spec.placeholderLiterals) {
    for (const lit of spec.placeholderLiterals) allowed.add(lit);
  }
  return allowed;
}

/**
 * @param {OperationRow} row
 * @param {string} cell
 * @param {import("./operationEntryCatalog.ts").ToolbarOperationSpec} spec
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateToolbarHeadTokens(row, cell, spec, catalog, errors) {
  const allowed = toolbarAllowedVisibleLabels(spec, catalog);
  const head = cell.split("（")[0].trim();

  const onlyBacktick = head.match(/^`([^`]+)`$/);
  if (onlyBacktick && allowed.has(onlyBacktick[1])) {
    return;
  }

  for (const seg of toolbarVisibleSegments(cell)) {
    const addMenuSeg = seg.match(/^追加メニュー\s+(.+)$/);
    if (addMenuSeg) {
      const lit = addMenuSeg[1].replace(/`/g, "").trim();
      if (allowed.has(lit)) continue;
    }
    const cleaned = seg.replace(/\$\{[^}]+\}/g, "").trim();
    if (allowed.has(cleaned) || allowed.has(seg)) continue;
    const orParts = seg.split(/\s+または\s+/).map((p) => p.trim()).filter(Boolean);
    for (const part of orParts) {
      const partClean = part.replace(/\$\{[^}]+\}/g, "").trim();
      if (
        allowed.has(partClean) ||
        allowed.has(part) ||
        TOOLBAR_HEAD_CONNECTIVES.has(partClean) ||
        TOOLBAR_HEAD_STRUCTURAL.has(partClean)
      ) {
        continue;
      }
      if (partClean === seg && orParts.length === 1) {
        report(
          row,
          "ツールバー",
          `許可されていない可視トークン「${partClean}」（owner 許可: ${[...allowed].join(" / ") || "なし"}）`,
          errors,
        );
      }
    }
  }

  const plainOutside = head
    .replace(/`[^`]*`/g, " ")
    .replace(/[／/]/g, " ")
    .trim();
  const plainTokens = plainOutside
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const token of plainTokens) {
    if (
      allowed.has(token) ||
      TOOLBAR_HEAD_CONNECTIVES.has(token) ||
      TOOLBAR_HEAD_STRUCTURAL.has(token)
    ) {
      continue;
    }
    report(
      row,
      "ツールバー",
      `バッククォート外の余分な文言「${token}」`,
      errors,
    );
  }
}

/**
 * @param {OperationRow} row
 * @param {string} cell
 * @param {import("./operationEntryCatalog.ts").ToolbarOperationSpec} spec
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 */
function validateToolbarNotes(row, cell, spec, catalog, errors) {
  const owner = spec.ownerFormal
    ? catalog.operationFormal[spec.ownerFormal]
    : null;
  for (const match of cell.matchAll(/（([^）]*)）/g)) {
    const note = match[1];
  const stripped = note
      .replace(/title[^）]*/g, " ")
      .replace(/`[^`]+`/g, " ")
      .replace(/（[^）]*）/g, " ")
      .replace(/[、。．：:（）\s＋+／/]+/g, " ")
      .trim();
    if (!stripped) continue;
    const tokens = stripped.split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      if (catalog.operationFormalValues.includes(tok)) {
        if (owner && tok !== owner) {
          report(
            row,
            "ツールバー",
            `注記内の正式名「${tok}」はこの行の owner「${owner}」と一致しない`,
            errors,
          );
        } else if (!owner) {
          report(
            row,
            "ツールバー",
            `注記内に別操作の正式名「${tok}」`,
            errors,
          );
        }
        continue;
      }
      if (
        TOOLBAR_NOTE_ALLOW_WORDS.has(tok) ||
        tok.startsWith("TOOLBAR_SHORT.") ||
        /^[\d?、F1\-]+$/.test(tok) ||
        tok.includes("ショートカット一覧")
      ) {
        continue;
      }
      if (/^[\u3040-\u9fff]+(?:\s*[\u3040-\u9fff]+)*$/.test(tok) && tok.length <= 12) {
        report(
          row,
          "ツールバー",
          `注記内の許可されていない文言「${tok}」`,
          errors,
        );
      }
    }
  }
}

/** @param {import("./operationEntryCatalog.ts").ToolbarOperationSpec} spec */
/** @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog */
function validateToolbarOperationSpec(row, cell, spec, catalog, errors, unverified) {
  if (spec.dynamicUnverified?.includes("filterCount")) {
    unverified.push(
      `[ツールバー] 操作「${row.operation}」: 絞り込み件数サフィックスは動的（ボタン接頭辞のみ照合）`,
    );
  }
  if (spec.dynamicUnverified?.includes("lineageName")) {
    unverified.push(
      `[ツールバー] 操作「${row.operation}」: lineageName サフィックスは動的（系統接頭辞のみ照合）`,
    );
  }
  if (spec.dynamicUnverified?.includes("linkSourceName")) {
    unverified.push(
      `[ツールバー] 操作「${row.operation}」: linkSourceName サフィックスは動的（線を引く接頭辞のみ照合）`,
    );
  }

  if (spec.ownerFormal) {
    const want = catalog.operationFormal[spec.ownerFormal];
    const inBacktick =
      spec.backtickStatic?.includes(want) && cell.includes("`" + want + "`");
  const segments = toolbarVisibleSegments(cell);
    const visibles =
      segments.length > 0 ? segments : [extractMenuLabelToken(cell)].filter(Boolean);
    if (!inBacktick && !visibles.includes(want)) {
      report(
        row,
        "ツールバー",
        `表示が owner OPERATION_FORMAL.${spec.ownerFormal} の「${want}」と一致しない（実際: ${visibles.join(" / ") || "空"}）`,
        errors,
      );
    }
    for (const visible of visibles) {
      if (visible !== want) {
        report(
          row,
          "ツールバー",
          `owner「${want}」以外の可視セグメント「${visible}」`,
          errors,
        );
      }
    }
  }

  if (spec.backtickStatic) {
    for (const lit of spec.backtickStatic) {
      if (lit.includes("${lineageName}")) {
        const expectedPrefix =
          catalog.toolbarSourceLabels.lineageNamedTemplate.replace(
            "${lineageName}",
            "",
          );
        const pattern = new RegExp(
          "`" + lit.replace(/\$\{lineageName\}/g, "\\$\\{lineageName\\}") + "`",
        );
        if (!pattern.test(cell)) {
          report(
            row,
            "ツールバー",
            `必須の系統テンプレート「${lit}」が無い`,
            errors,
          );
          continue;
        }
        const match = cell.match(/`([^`]*\$\{lineageName\}[^`]*)`/);
        if (match) {
          const actualPrefix = match[1].replace("${lineageName}", "");
          if (actualPrefix !== expectedPrefix) {
            report(
              row,
              "ツールバー",
              `系統テンプレ接頭辞「${actualPrefix}」が Toolbar.tsx の「${expectedPrefix}」と一致しない`,
              errors,
            );
          }
        }
        continue;
      }
      if (lit.includes("${linkSourceName}")) {
        const expectedPrefix = catalog.toolbarUiSource.linkNamedTemplate.replace(
          "${linkSourceName}",
          "",
        );
        const match = cell.match(/`([^`]*\$\{linkSourceName\}[^`]*)`/);
        if (!match) {
          report(
            row,
            "ツールバー",
            `必須の線を引くテンプレート「${lit}」が無い`,
            errors,
          );
        } else {
          const actualPrefix = match[1].replace("${linkSourceName}", "");
          if (actualPrefix !== expectedPrefix) {
            report(
              row,
              "ツールバー",
              `線を引くテンプレ接頭辞「${actualPrefix}」が Toolbar.tsx の「${expectedPrefix}」と一致しない`,
              errors,
            );
          }
        }
        if (!cell.includes("`" + catalog.operationFormal.link + "`")) {
          report(
            row,
            "ツールバー",
            `線を引くモード行に静的ラベル「${catalog.operationFormal.link}」の引用が無い`,
            errors,
          );
        }
        continue;
      }
      if (!cell.includes("`" + lit + "`")) {
        report(
          row,
          "ツールバー",
          `必須のバッククォート静的文字「${lit}」が無い`,
          errors,
        );
      }
    }
    for (const match of cell.matchAll(/`([^`]+)`/g)) {
      const lit = match[1];
      if (
        lit === "saveStatus" ||
        lit === "StatusBar.tsx" ||
        lit === "ActiveFilterBar.tsx" ||
        lit.startsWith("TOOLBAR_SHORT.")
      ) {
        continue;
      }
      if (lit.includes("${")) continue;
      const allowed = new Set([
        ...spec.backtickStatic,
        ...(spec.placeholderLiterals ?? []),
        ...(spec.toolbarShortKeys ?? []).map((k) => catalog.toolbarShort[k]),
      ]);
      if (!allowed.has(lit)) {
        report(
          row,
          "ツールバー",
          `バッククォート内「${lit}」がこの操作の許可静的トークンと一致しない`,
          errors,
        );
      }
    }
  }

  if (spec.slashLiterals?.length) {
    for (const lit of spec.slashLiterals) {
      if (!cell.includes("`" + lit + "`")) {
        report(
          row,
          "ツールバー",
          `検索トグル「${lit}」の引用が無い`,
          errors,
        );
      }
    }
  }

  if (spec.placeholderLiterals?.length) {
    for (const lit of spec.placeholderLiterals) {
      if (!cell.includes("`" + lit + "`")) {
        report(
          row,
          "ツールバー",
          `placeholder「${lit}」の引用が無い`,
          errors,
        );
      }
    }
  }

  const addMenu = cell.match(/メニュー\s+`([^`]+)`/);
  if (addMenu && spec.backtickStatic?.includes(catalog.operationFormal.addTask)) {
    const lit = addMenu[1];
    if (lit !== catalog.operationFormal.addTask) {
      report(
        row,
        "ツールバー",
        `追加 split メニュー「${lit}」が OPERATION_FORMAL.addTask の「${catalog.operationFormal.addTask}」と一致しない`,
        errors,
      );
    }
  }
}

function validateToolbar(row, catalog, errors, unverified) {
  const cell = row.cells["ツールバー"] ?? "";
  const spec = catalog.toolbarByOperation[row.operation];

  if (!cell.trim()) {
    if (spec && !spec.optional) {
      report(row, "ツールバー", "ツールバー列が空だが、この操作は必須", errors);
    }
    return;
  }

  if (TOOLBAR_PARENTHESIS_ONLY_OPERATIONS.has(row.operation)) {
    if (cell.startsWith("（")) return;
  }

  if (!spec) {
    report(
      row,
      "ツールバー",
      "主表ツールバー照合カタログに未登録（静的トークンを自動合格させない）",
      errors,
    );
    return;
  }

  if (cell.startsWith("（")) {
    report(
      row,
      "ツールバー",
      "必須行が注記のみで、可視ラベルが無い",
      errors,
    );
    return;
  }

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
    }
  }

  if (spec.toolbarShortKeys) {
    for (const key of spec.toolbarShortKeys) {
      const value = catalog.toolbarShort[key];
      if (value == null) continue;
      if (!cell.includes(`TOOLBAR_SHORT.${key}`)) {
        report(
          row,
          "ツールバー",
          `TOOLBAR_SHORT.${key} のカタログ引用が無い`,
          errors,
        );
      }
      const segments = toolbarVisibleSegments(cell);
      if (segments.length > 0 && !segments.some((seg) => seg === value)) {
        report(
          row,
          "ツールバー",
          `TOOLBAR_SHORT.${key} の表示値「${value}」とセル「${segments.join("/")}」が一致しない`,
          errors,
        );
      }
    }
  }

  validateToolbarOperationSpec(row, cell, spec, catalog, errors, unverified);
  validateToolbarHeadTokens(row, cell, spec, catalog, errors);
  validateToolbarNotes(row, cell, spec, catalog, errors);

  const titleMatch = cell.match(/title に ([^）]+)/);
  if (titleMatch && row.operation === "今日へ移動") {
    const hint = titleMatch[1].trim();
    if (hint !== catalog.toolbarTitleHintGoToday) {
      report(
        row,
        "ツールバー",
        `title に「${hint}」が goTodayShortcutHint の「${catalog.toolbarTitleHintGoToday}」と一致しない`,
        errors,
      );
    }
  }

  if (row.operation === "マイルストンを追加") {
    const menu = cell.match(/追加メニュー\s+`([^`]+)`/);
    if (menu && menu[1] !== catalog.operationFormal.addMilestone) {
      report(
        row,
        "ツールバー",
        `追加メニュー「${menu[1]}」が OPERATION_FORMAL.addMilestone と一致しない`,
        errors,
      );
    }
  }
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 * @param {Map<string, string>} previousByColumn
 */
function extractRightClickTokens(cell) {
  /** @type {string[]} */
  const tokens = [...extractBacktickTokens(cell)];
  const withoutBackticks = cell.replace(/`[^`]*`/g, " ");
  const visibles = withoutBackticks
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .split("/")
    .map((part) => stripNotes(part).trim())
    .filter(Boolean);
  for (const v of visibles) {
    if (!tokens.includes(v)) tokens.push(v);
  }
  return tokens;
}

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

  for (const token of extractRightClickTokens(cell)) {
    if (token.includes("${")) {
      if (!catalog.contextMenuTemplateLiterals?.includes(token)) {
        report(
          row,
          "右クリック",
          `テンプレート「${token}」が operationLabelLink の許可リテラルと一致しない`,
          errors,
        );
      }
      continue;
    }
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
    const normalized = cell.replace(/\\`/g, "`");
    if (
      !normalized.includes(catalog.recentFilePaletteFactory) ||
      normalized.includes("最近開いたファイル ${prefix}")
    ) {
      report(
        row,
        "コマンドパレット",
        `recent 行は \`${catalog.recentFilePaletteFactory}\` をそのまま書く`,
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
    if (!catalog.paletteStaticLabels.includes(label)) {
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
        !(catalog.hamburgerExtraLabels ?? []).includes(core) &&
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
  if (macCell && !/PredefinedMenuItem/.test(macCell)) {
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
function shortcutReferenceActionForRow(row) {
  const mapped = OPERATION_TO_SHORTCUT_ACTION[row.operation];
  if (mapped) return mapped;
  if (row.operation.startsWith("表示サイズを")) return null;
  const palette = paletteLabelFromRow(row);
  if (palette === "全体") return "全体表示";
  if (palette) return palette.split("/")[0].trim();
  return row.operation;
}

function findShortcutReference(row, catalog) {
  const action = shortcutReferenceActionForRow(row);
  return catalog.shortcutReferenceRows.find((ref) => ref.action === action);
}

function displayScaleKeysMatch(cellPart, allowed, requireAllKeys) {
  const cellAlts = expandShortcutAlternatives(cellPart);
  if (cellAlts.length === 0) return false;
  const allowedNorm = new Set(
    allowed.map((k) => normalizeShortcutKey(k)),
  );
  if (
    requireAllKeys &&
    cellAlts.length !== allowed.length
  ) {
    return false;
  }
  if (!requireAllKeys && cellAlts.length !== 1) {
    return false;
  }
  return cellAlts.every((c) => allowedNorm.has(normalizeShortcutKey(c)));
}

function splitDisplayScaleShortcutCell(cell) {
  const parts = cell
    .split(" / ")
    .map((s) => s.trim())
    .filter(Boolean);
  const macParts = [];
  const winParts = [];
  for (const part of parts) {
    if (/^Ctrl/i.test(part) || /^Alt/i.test(part)) {
      winParts.push(part);
    } else {
      macParts.push(part);
    }
  }
  return {
    macPart: macParts.join(" / "),
    winPart: winParts.join(" / "),
  };
}

function validateDisplayScaleShortcut(row, cell, catalog, errors) {
  const isEnlarge = row.operation.includes("拡大");
  const isReduce = row.operation.includes("縮小");
  if (!isEnlarge && !isReduce) return false;
  const spec = isEnlarge
    ? catalog.displayScaleShortcuts.enlarge
    : catalog.displayScaleShortcuts.reduce;
  const cleaned = cell.replace(/（[^）]*）/g, "").trim();
  const { macPart, winPart } = splitDisplayScaleShortcutCell(cleaned);
  let ok = true;
  if (!macPart) {
    report(
      row,
      "ショートカット",
      `表示サイズ${isEnlarge ? "拡大" : "縮小"}行に Mac 側のキーが無い`,
      errors,
    );
    ok = false;
  }
  if (!winPart) {
    report(
      row,
      "ショートカット",
      `表示サイズ${isEnlarge ? "拡大" : "縮小"}行に Win 側のキーが無い`,
      errors,
    );
    ok = false;
  }
  if (macPart && !displayScaleKeysMatch(macPart, spec.mac, isEnlarge)) {
    report(
      row,
      "ショートカット",
      `Mac「${macPart}」が matchDisplayScale 拡大=${isEnlarge} の許可キー「${spec.mac.join("/")}」と一致しない`,
      errors,
    );
    ok = false;
  }
  if (winPart && !displayScaleKeysMatch(winPart, spec.win, isEnlarge)) {
    report(
      row,
      "ショートカット",
      `Win「${winPart}」が matchDisplayScale 拡大=${isEnlarge} の許可キー「${spec.win.join("/")}」と一致しない`,
      errors,
    );
    ok = false;
  }
  return ok;
}

function paletteCommandRequiresShortcut(commandId) {
  return (
    commandId !== "displayScaleIn" &&
    commandId !== "displayScaleOut" &&
    commandId !== "shortcuts"
  );
}

function validateShortcut(row, catalog, errors, unverified, shortcutActionsMatched) {
  const cell = row.cells["ショートカット"] ?? "";

  const paletteLabel = paletteLabelFromRow(row);
  const commandId = paletteLabel
    ? catalog.formalToPaletteCommandId[paletteLabel]
    : null;
  const expected =
    commandId != null ? catalog.paletteShortcutByCommandId[commandId] : null;

  if (commandId && paletteCommandRequiresShortcut(commandId)) {
    const needsShortcut =
      (expected?.mac && expected.mac.length > 0) ||
      (expected?.win && expected.win.length > 0);
  if (needsShortcut && !cell.trim()) {
      report(
        row,
        "ショートカット",
        `${paletteLabel} は palette shortcut があるが列が空`,
        errors,
      );
    }
  }

  if (row.operation.startsWith("表示サイズを")) {
    if (!cell.trim()) {
      report(row, "ショートカット", "表示サイズ行のショートカット列が空", errors);
      return;
    }
    if (validateDisplayScaleShortcut(row, cell, catalog, errors)) {
      shortcutActionsMatched.add("表示サイズ");
    }
    return;
  }

  if (!cell) return;

  if (cell.includes("macOS メニューのみ")) {
    unverified.push(
      `[ショートカット] 操作「${row.operation}」: ${cell}（macOS メニュー accelerator は未照合）`,
    );
    return;
  }
  if (cell.includes("matchMacAppQuit") || /⌘Q/.test(cell)) {
    unverified.push(
      `[ショートカット] 操作「${row.operation}」: ⌘Q（matchMacAppQuit。メニュー accelerator は未照合）`,
    );
  }
  if (/⌘M/.test(cell) && cell.includes("PredefinedMenuItem")) {
    unverified.push(
      `[ショートカット] 操作「${row.operation}」: ⌘M（PredefinedMenuItem Minimize。OS accelerator は未照合）`,
    );
  }

  const skipRefCommand = commandId === "addTask";
  const reference = skipRefCommand ? null : findShortcutReference(row, catalog);
  let referenceOk = false;
  if (reference) {
    const cleaned = cell
      .replace(/（`[^`]+`）/g, "")
      .replace(/（[^）]*）/g, "");
    if (reference.mac === reference.win) {
      if (
        reference.mac &&
        !shortcutCellMatchesReferenceStrict(
          cleaned,
          reference.mac,
          reference.action,
        )
      ) {
        report(
          row,
          "ショートカット",
          `「${cell}」が shortcutReference（${reference.action}）の「${reference.mac}」と一致しない`,
          errors,
        );
      } else {
        referenceOk = true;
      }
    } else {
      const { macPart, winPart } = splitShortcutCell(cleaned);
      let macOk = true;
      let winOk = true;
      if (
        reference.mac &&
        macPart &&
        !shortcutCellMatchesReferenceStrict(
          macPart,
          reference.mac,
          reference.action,
        )
      ) {
        report(
          row,
          "ショートカット",
          `Mac「${macPart}」が shortcutReference（${reference.action}）の「${reference.mac}」と一致しない`,
          errors,
        );
        macOk = false;
      }
      if (
        reference.win &&
        winPart &&
        !shortcutCellMatchesReferenceStrict(
          winPart,
          reference.win,
          reference.action,
        )
      ) {
        report(
          row,
          "ショートカット",
          `Win「${winPart}」が shortcutReference（${reference.action}）の「${reference.win}」と一致しない`,
          errors,
        );
        winOk = false;
      }
      referenceOk = macOk && winOk;
    }
    if (referenceOk) shortcutActionsMatched.add(reference.action);
  }

  if (!paletteLabel || !commandId) return;
  if (!expected?.mac && !expected?.win) return;

  if (commandId === "addTask") {
    const joined = [expected.mac, expected.win].filter(Boolean).join(" / ");
    if (!shortcutHintMatchesCell(cell, joined)) {
      report(
        row,
        "ショートカット",
        `「${cell}」が addTaskShortcutHint の候補「${joined}」をすべて含まない`,
        errors,
      );
    } else {
      shortcutActionsMatched.add("タスクを追加");
    }
    return;
  }

  if (commandId === "deleteTask") {
    const alts = expandShortcutAlternatives(
      cell.replace(/（[^）]*）/g, ""),
    );
    const allowed = new Set(["Delete", "Backspace"]);
    if (!alts.some((a) => a === "Delete")) {
      report(row, "ショートカット", "Delete がショートカット列に無い", errors);
    } else if (!alts.every((a) => allowed.has(a))) {
      report(
        row,
        "ショートカット",
        `「${cell}」は Delete と Backspace 以外のキーを含めてはいけない`,
        errors,
      );
    } else {
      shortcutActionsMatched.add("削除");
    }
    if (!errors.some((e) => e.includes("addTaskShortcutHint"))) {
      shortcutActionsMatched.add("タスクを追加");
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
 * @param {string} referenceKeys
 * @param {string} action
 */
function shortcutExtraAlts(action) {
  if (action === "削除") return ["Backspace"];
  if (action === "やり直し") return ["Ctrl+Y"];
  return [];
}

function shortcutCellMatchesReferenceStrict(cellPart, referenceKeys, action) {
  const cellAlts = expandShortcutAlternatives(cellPart);
  const refAlts = expandShortcutAlternatives(
    referenceKeys.replace(/（[^）]*）/g, ""),
  );
  if (refAlts.length === 0) return cellAlts.length === 0;
  if (
    !refAlts.every((alt) =>
      cellAlts.some(
        (c) => normalizeShortcutKey(c) === normalizeShortcutKey(alt),
      ),
    )
  ) {
    return false;
  }
  const allowed = new Set([
    ...refAlts.map((r) => normalizeShortcutKey(r)),
    ...shortcutExtraAlts(action).map((e) => normalizeShortcutKey(e)),
  ]);
  return cellAlts.every((c) => allowed.has(normalizeShortcutKey(c)));
}

/** @deprecated use strict variant in new checks */
function shortcutCellMatchesReference(cellPart, referenceKeys, action) {
  return shortcutCellMatchesReferenceStrict(cellPart, referenceKeys, action);
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
function extractPredefinedItemIds(cell) {
  /** @type {string[]} */
  const ids = [];
  for (const match of cell.matchAll(/([A-Za-z]+)（`PredefinedMenuItem`）/g)) {
    ids.push(match[1]);
  }
  for (const match of cell.matchAll(/`PredefinedMenuItem`\s+(\w+)/g)) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}

function validateMacosMenu(row, catalog, errors) {
  const cell = row.cells["macOS メニュー"];
  if (!cell) return;

  if (
    /\bPredefinedMenuItem\b/.test(cell) &&
    !/（`PredefinedMenuItem`/.test(cell)
  ) {
    report(
      row,
      "macOS メニュー",
      "PredefinedMenuItem は（`識別子`（`PredefinedMenuItem`））形式で書く",
      errors,
    );
  }

  for (const id of extractPredefinedItemIds(cell)) {
    if (id === "PredefinedMenuItem") continue;
    if (!catalog.macosPredefinedMenuIds.includes(id)) {
      report(
        row,
        "macOS メニュー",
        `PredefinedMenuItem「${id}」が useMacOSAppMenu の識別子一覧に無い`,
        errors,
      );
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
}

/**
 * @param {OperationRow} row
 * @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog
 * @param {string[]} errors
 * @param {Map<string, string>} previousByColumn
 */
function validateGuide(row, catalog, errors, previousByColumn, unverified) {
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

  const prose = cell.replace(/`[^`]*`/g, "").trim();
  if (quoted.length === 0 && prose.length > 0 && !prose.includes("同上")) {
    if (!catalog.guideTexts.some((text) => text.includes(prose))) {
      unverified.push(
        `[操作の案内] 操作「${row.operation}」: 無引用要約「${prose.slice(0, 80)}${prose.length > 80 ? "…" : ""}」は GUIDE 本文と厳密一致していない`,
      );
    }
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

  for (const match of cell.matchAll(
    /`([a-z_]+)`(?:\s*[\(（]([^)）]+)[\)）])?/g,
  )) {
    const tool = match[1];
    if (!catalog.mcpToolNames.includes(tool)) {
      report(
        row,
        "MCP",
        `ツール「${tool}」が MCP_ALL_TOOL_NAMES に無い`,
        errors,
      );
    }
    const action = match[2]?.trim();
    if (action) {
      if (tool === "file_action") {
        if (!catalog.mcpFileActions?.includes(action)) {
          report(
            row,
            "MCP",
            `file_action の action「${action}」がソースの列挙に無い`,
            errors,
          );
        }
      } else if (tool === "history") {
        if (!catalog.mcpHistoryActions?.includes(action)) {
          report(
            row,
            "MCP",
            `history の action「${action}」は undo か redo だけ`,
            errors,
          );
        }
      } else if (!/^[\w]+$/.test(action)) {
        report(
          row,
          "MCP",
          `括弧内 action「${action}」の形式が不正`,
          errors,
        );
      }
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
  const needsWindow =
    catalog.mcpReadToolNames.includes(tool) ||
    catalog.mcpWindowTargetToolNames?.includes(tool);
  if (!rejectsWindow && needsWindow && !hasWindow) {
    report(
      row,
      "CLI",
      `${tool} は --window <label> を書く`,
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
function collectColumnTokens(rows, column, transform = (s) => s) {
  /** @type {Set<string>} */
  const tokens = new Set();
  for (const row of rows) {
    const cell = row.cells[column] ?? "";
    if (!cell) continue;
    for (const token of extractBacktickTokens(cell)) {
      tokens.add(transform(token));
    }
    const plain = stripNotes(cell).replace(/`/g, "").trim();
    if (plain) {
      for (const part of plain.split(/[/／、]/)) {
        const t = transform(part.trim());
        if (t) tokens.add(t);
      }
    }
  }
  return tokens;
}

function validateCatalogColumnCoverage(rows, catalog, errors) {
  const paletteTokens = collectColumnTokens(rows, "コマンドパレット");
  const requiredPalette = catalog.paletteStaticLabels.filter(
    (label) => !/^最近開いたファイル /.test(label),
  );
  for (const label of requiredPalette) {
    if (!paletteTokens.has(label) && label !== catalog.recentFilePaletteFactory) {
      errors.push(`[コマンドパレット] ラベル「${label}」が主表のどの行にも無い`);
    }
  }
  const recentFactory = catalog.recentFilePaletteFactory;
  if (
    !rows.some((row) => {
      const cell = (row.cells["コマンドパレット"] ?? "").replace(/\\`/g, "`");
      return (
        cell.includes(recentFactory) &&
        !cell.includes("最近開いたファイル ${prefix}")
      );
    })
  ) {
    errors.push(`[コマンドパレット] recent 行に ${recentFactory} が無い`);
  }

  const hamburgerTokens = collectColumnTokens(rows, "☰");
  for (const label of catalog.sharedFileMenuLabels) {
    if (!hamburgerTokens.has(label)) {
      errors.push(`[☰] ラベル「${label}」が主表のどの行にも無い`);
    }
  }
  for (const label of catalog.hamburgerTailLabels) {
    if (!hamburgerTokens.has(label)) {
      errors.push(`[☰] ラベル「${label}」が主表のどの行にも無い`);
    }
  }

  const rcTokens = collectColumnTokens(rows, "右クリック");
  for (const label of Object.values(catalog.contextMenuFixed)) {
    if (label && !rcTokens.has(label)) {
      errors.push(`[右クリック] 固定ラベル「${label}」が主表のどの行にも無い`);
    }
  }

  const mcpTools = new Set();
  for (const row of rows) {
    const cell = row.cells["MCP"] ?? "";
    for (const match of cell.matchAll(/`([a-z_]+)`/g)) {
      mcpTools.add(match[1]);
    }
  }
  for (const tool of catalog.mcpToolNames) {
    if (!mcpTools.has(tool)) {
      errors.push(`[MCP] ツール「${tool}」が主表のどの行にも無い`);
    }
  }
}

/** @param {import("./operationEntryCatalog.ts").OperationEntryCatalog} catalog */
function catalogMandatoryShortcutActions(catalog) {
  /** @type {Set<string>} */
  const actions = new Set(["表示サイズ"]);
  for (const action of Object.values(OPERATION_TO_SHORTCUT_ACTION)) {
    if (catalog.shortcutReferenceRows.some((ref) => ref.action === action)) {
      actions.add(action);
    }
  }
  return actions;
}

function validateShortcutReferenceConsumption(rows, catalog, matched, errors) {
  const mandatory = catalogMandatoryShortcutActions(catalog);
  const paletteOnlyReference = new Set(["タスクを追加"]);

  for (const row of rows) {
    const action = shortcutReferenceActionForRow(row);
    if (!action || !mandatory.has(action)) continue;
    if (paletteOnlyReference.has(action)) continue;
    if (row.operation.startsWith("表示サイズを")) continue;
    const cell = row.cells["ショートカット"]?.trim() ?? "";
    if (!cell) {
      report(
        row,
        "ショートカット",
        `shortcutReference「${action}」が必須だが列が空`,
        errors,
      );
    }
  }

  for (const action of mandatory) {
    if (paletteOnlyReference.has(action)) continue;
    if (!matched.has(action)) {
      errors.push(
        `[ショートカット] shortcutReference「${action}」の照合が主表で成立していない`,
      );
    }
  }
}

function appendKnownLimitations(unverified) {
  unverified.push(
    "[macOS メニュー] PredefinedMenuItem の OS 表示文言は未検証（識別子のみ照合）",
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

/**
 * Issue #553 item 7: relative file links, SKILL frontmatter, and implement-change
 * clause-id move table for agent-facing docs.
 * Not a full Markdown parser — fenced code is stripped; link targets must exist on disk.
 * In-document #anchors are not verified. Clause mapping checks ids only, not prose.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g;

/** @type {readonly (readonly [number, number])[]} */
export const REQUIRED_CLAUSE_MOVE_PAIRS = [
  [52, 55],
  [53, 56],
  [54, 57],
];

export const CLAUSE_MOVE_SPLIT_REL = "docs/agents-implement-change-51-split.md";
export const IMPLEMENT_CHANGE_SCREEN_REL =
  ".cursor/skills/implement-change/references/screen.md";

/** Live screen clauses 51–57 (51–54 are the old-51 split; 55–57 are moved old 52–54). */
export const SCREEN_CLAUSE_IDS_51_57 = [51, 52, 53, 54, 55, 56, 57];

const MOVE_TABLE_SECTION_HEADING = /^## 旧 52/m;

/**
 * @param {string} root
 * @returns {string[]}
 */
export function collectAgentDocRelPaths(root) {
  /** @type {string[]} */
  const relPaths = ["AGENTS.md"];

  const docsDir = path.join(root, "docs");
  for (const name of fs.readdirSync(docsDir)) {
    if (name.startsWith("agents-") && name.endsWith(".md")) {
      relPaths.push(`docs/${name}`);
    }
  }

  const rulesDir = path.join(root, ".cursor/rules");
  if (fs.existsSync(rulesDir)) {
    for (const name of fs.readdirSync(rulesDir)) {
      if (name.endsWith(".mdc")) {
        relPaths.push(`.cursor/rules/${name}`);
      }
    }
  }

  const skillsDir = path.join(root, ".cursor/skills");
  if (!fs.existsSync(skillsDir)) {
    return relPaths.sort();
  }
  for (const skillName of fs.readdirSync(skillsDir)) {
    const skillRoot = path.join(skillsDir, skillName);
    if (!fs.statSync(skillRoot).isDirectory()) {
      continue;
    }
    const skillMd = path.join(skillRoot, "SKILL.md");
    if (fs.existsSync(skillMd)) {
      relPaths.push(`.cursor/skills/${skillName}/SKILL.md`);
    }
    const referencesDir = path.join(skillRoot, "references");
    if (fs.existsSync(referencesDir)) {
      for (const refName of fs.readdirSync(referencesDir)) {
        if (refName.endsWith(".md")) {
          relPaths.push(`.cursor/skills/${skillName}/references/${refName}`);
        }
      }
    }
  }

  return relPaths.sort();
}

/**
 * @param {string} markdown
 */
export function stripFencedCodeBlocks(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/~~~[\s\S]*?~~~/g, "");
}

/**
 * Remove inline backtick spans so example links inside `...` are not validated.
 * @param {string} markdown
 */
export function stripInlineCodeSpans(markdown) {
  return markdown.replace(/`[^`\n]+`/g, "");
}

/**
 * @param {string} markdown
 */
export function markdownForLinkScan(markdown) {
  return stripInlineCodeSpans(stripFencedCodeBlocks(markdown));
}

/**
 * @param {string} markdown
 * @returns {string[]}
 */
export function extractMarkdownLinkTargets(markdown) {
  /** @type {string[]} */
  const targets = [];
  for (const match of markdown.matchAll(LINK_PATTERN)) {
    targets.push(match[1].trim());
  }
  return targets;
}

/**
 * @param {string} url
 */
export function isExternalOrSpecialUrl(url) {
  return /^(https?:|mailto:|tel:|data:)/i.test(url);
}

/**
 * @param {string} yaml
 * @param {string} field
 */
export function readYamlScalar(yaml, field) {
  const folded = yaml.match(
    new RegExp(`^${field}:\\s*>[^\\n]*\\n((?:[ \\t].*(?:\\n|$))*)`, "m"),
  );
  if (folded) {
    return folded[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s+/, ""))
      .filter((line) => line.length > 0)
      .join(" ")
      .trim();
  }
  const literal = yaml.match(
    new RegExp(`^${field}:\\s*\\|[^\\n]*\\n((?:[ \\t].*(?:\\n|$))*)`, "m"),
  );
  if (literal) {
    return literal[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s+/, ""))
      .join("\n")
      .trim();
  }
  const lineMatch = yaml.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  if (!lineMatch) {
    return null;
  }
  let value = lineMatch[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

/**
 * @param {string} content
 * @param {string} relPath
 * @returns {string[]}
 */
export function validateSkillFrontmatter(content, relPath) {
  if (!relPath.endsWith("/SKILL.md") && !relPath.endsWith("SKILL.md")) {
    return [];
  }
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return [`${relPath}: SKILL.md must start with YAML frontmatter`];
  }
  const yaml = match[1];
  const errors = [];
  const name = readYamlScalar(yaml, "name");
  if (name === null || name.length === 0) {
    errors.push(`${relPath}: frontmatter "name" is required`);
  }
  const description = readYamlScalar(yaml, "description");
  if (description === null || description.length === 0) {
    errors.push(`${relPath}: frontmatter "description" is required`);
  }
  return errors;
}

/**
 * @param {string} root
 * @param {string} sourceRel
 * @param {string} url
 * @returns {{ ok: true, target: string } | { ok: false, reason: string }}
 */
export function resolveRelativeFileLink(root, sourceRel, url) {
  const trimmed = url.trim();
  if (isExternalOrSpecialUrl(trimmed)) {
    return { ok: true, target: "" };
  }
  const hashIndex = trimmed.indexOf("#");
  const pathPart = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  if (pathPart.length === 0) {
    return { ok: true, target: "" };
  }
  if (pathPart.includes("://")) {
    return { ok: true, target: "" };
  }

  const sourceDir = path.dirname(path.join(root, sourceRel));
  const resolved = path.normalize(path.join(sourceDir, pathPart));
  const relativeToRoot = path.relative(root, resolved);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return { ok: false, reason: `link escapes repository: ${url}` };
  }

  if (!fs.existsSync(resolved)) {
    return { ok: false, reason: `broken relative link: ${url}` };
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile() && !stat.isDirectory()) {
    return { ok: false, reason: `link target is missing: ${url}` };
  }
  return { ok: true, target: resolved };
}

/**
 * @param {string} line
 */
function normalizedClauseMoveTableLine(line) {
  return line.trimStart();
}

/**
 * @param {string} line
 */
function lineLooksLikeClauseMoveTableRow(line) {
  return normalizedClauseMoveTableLine(line).startsWith("|");
}

/**
 * @param {string} left
 * @param {string} right
 */
function isLegitimateMoveTableHeader(left, right) {
  return (
    left.includes("旧") &&
    left.includes("番号") &&
    right.includes("新") &&
    right.includes("番号")
  );
}

/**
 * @param {string} line
 * @param {{ beforeDataRows: boolean }} context
 * @returns {"separator" | "header" | { old: number, new: number } | { malformed: true, raw: string }}
 */
function parseClauseMoveTableRow(line, { beforeDataRows }) {
  const normalized = normalizedClauseMoveTableLine(line);
  const match = normalized.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
  if (!match) {
    return { malformed: true, raw: line.trim() };
  }
  const left = match[1].trim();
  const right = match[2].trim();
  if (/^[-:\s]+$/.test(left) && /^[-:\s]+$/.test(right)) {
    return "separator";
  }
  if (isLegitimateMoveTableHeader(left, right) && beforeDataRows) {
    return "header";
  }
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) {
    return { malformed: true, raw: line.trim() };
  }
  return { old: Number(left), new: Number(right) };
}

/**
 * @param {string} markdown
 * @returns {{ pairs: [number, number][], errors: string[] }}
 */
export function parseClauseMoveTable(markdown) {
  /** @type {string[]} */
  const errors = [];
  const sectionIndex = markdown.search(MOVE_TABLE_SECTION_HEADING);
  if (sectionIndex < 0) {
    return {
      pairs: [],
      errors: ["missing move-table section heading (## 旧 52…)"],
    };
  }

  /** @type {[number, number][]} */
  const pairs = [];
  const lines = markdown.slice(sectionIndex).split(/\r?\n/);
  let tableStarted = false;

  for (const line of lines) {
    if (line.match(MOVE_TABLE_SECTION_HEADING) && !line.trimStart().startsWith("|")) {
      continue;
    }
    if (line.startsWith("## ") && !line.match(MOVE_TABLE_SECTION_HEADING)) {
      if (tableStarted) {
        break;
      }
      continue;
    }
    if (!lineLooksLikeClauseMoveTableRow(line)) {
      if (tableStarted) {
        if (line.trim().length === 0) {
          continue;
        }
        break;
      }
      continue;
    }

    const row = parseClauseMoveTableRow(line, {
      beforeDataRows: pairs.length === 0,
    });
    if (row === "separator" || row === "header") {
      tableStarted = true;
      continue;
    }
    if ("malformed" in row) {
      errors.push(`move table malformed row: ${row.raw}`);
      tableStarted = true;
      continue;
    }
    tableStarted = true;
    pairs.push([row.old, row.new]);
  }

  /** @type {Map<number, number>} */
  const byOld = new Map();
  /** @type {Map<number, number>} */
  const byNew = new Map();
  for (const [oldId, newId] of pairs) {
    if (byOld.has(oldId)) {
      errors.push(`move table duplicate old clause ${oldId}`);
    } else {
      byOld.set(oldId, newId);
    }
    if (byNew.has(newId)) {
      errors.push(`move table duplicate new clause ${newId}`);
    } else {
      byNew.set(newId, oldId);
    }
  }

  for (const [requiredOld, requiredNew] of REQUIRED_CLAUSE_MOVE_PAIRS) {
    if (byOld.get(requiredOld) !== requiredNew) {
      errors.push(
        `move table missing or wrong required pair ${requiredOld}→${requiredNew}`,
      );
    }
  }

  return { pairs, errors };
}

/**
 * @param {string} markdown
 * @param {string} [relPath]
 * @returns {string[]}
 */
export function validateScreenClauses51to57(
  markdown,
  relPath = IMPLEMENT_CHANGE_SCREEN_REL,
) {
  /** @type {string[]} */
  const errors = [];
  for (const clauseId of SCREEN_CLAUSE_IDS_51_57) {
    const pattern = new RegExp(`^${clauseId}\\. `, "gm");
    const count = [...markdown.matchAll(pattern)].length;
    if (count !== 1) {
      errors.push(
        `${relPath}: clause ${clauseId} must appear exactly once (found ${count})`,
      );
    }
  }
  return errors;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function collectClauseMoveErrors(root) {
  const splitAbs = path.join(root, CLAUSE_MOVE_SPLIT_REL);
  const screenAbs = path.join(root, IMPLEMENT_CHANGE_SCREEN_REL);
  /** @type {string[]} */
  const errors = [];

  if (!fs.existsSync(splitAbs)) {
    return [`${CLAUSE_MOVE_SPLIT_REL}: file not found`];
  }
  if (!fs.existsSync(screenAbs)) {
    return [`${IMPLEMENT_CHANGE_SCREEN_REL}: file not found`];
  }

  const splitMarkdown = fs.readFileSync(splitAbs, "utf8");
  const screenMarkdown = fs.readFileSync(screenAbs, "utf8");

  const table = parseClauseMoveTable(splitMarkdown);
  for (const err of table.errors) {
    errors.push(`${CLAUSE_MOVE_SPLIT_REL}: ${err}`);
  }
  errors.push(...validateScreenClauses51to57(screenMarkdown));
  return errors;
}

export function collectLinkErrors(root) {
  const errors = [];
  for (const relPath of collectAgentDocRelPaths(root)) {
    const abs = path.join(root, relPath);
    const content = fs.readFileSync(abs, "utf8");
    errors.push(...validateSkillFrontmatter(content, relPath));
    const stripped = markdownForLinkScan(content);
    for (const url of extractMarkdownLinkTargets(stripped)) {
      const result = resolveRelativeFileLink(root, relPath, url);
      if (!result.ok) {
        errors.push(`${relPath}: ${result.reason}`);
      }
    }
  }
  return errors;
}

/**
 * @param {string} root
 */
export function printAlwaysOnByteSizes(root) {
  /** @type {string[]} */
  const targets = ["AGENTS.md"];
  const rulesDir = path.join(root, ".cursor/rules");
  for (const name of fs.readdirSync(rulesDir)) {
    if (!name.endsWith(".mdc")) {
      continue;
    }
    const rel = `.cursor/rules/${name}`;
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    if (/^alwaysApply:\s*true\s*$/m.test(text)) {
      targets.push(rel);
    }
  }
  for (const rel of targets) {
    const bytes = fs.statSync(path.join(root, rel)).size;
    console.log(`${rel}: ${bytes} bytes`);
  }
}

/**
 * @param {string} root
 */
export function runCheckAgentDocs(root = defaultRepoRoot) {
  printAlwaysOnByteSizes(root);
  const errors = [
    ...collectLinkErrors(root),
    ...collectClauseMoveErrors(root),
  ];
  if (errors.length > 0) {
    console.error("check-agent-docs failed:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log(
    `check-agent-docs ok (${collectAgentDocRelPaths(root).length} agent-doc files; links, frontmatter, clause move table)`,
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const rootArg = process.argv[2];
  runCheckAgentDocs(rootArg ? path.resolve(rootArg) : defaultRepoRoot);
}

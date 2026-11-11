/**
 * Issue #553 item 7: relative file links and SKILL frontmatter for agent-facing docs.
 * Not a full Markdown parser — fenced code is stripped; link targets must exist on disk.
 * In-document #anchors are not verified.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g;

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
 * @param {string} root
 * @returns {string[]}
 */
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
  const errors = collectLinkErrors(root);
  if (errors.length > 0) {
    console.error("check-agent-docs failed:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log(
    `check-agent-docs ok (${collectAgentDocRelPaths(root).length} agent-doc files; relative file links and SKILL frontmatter)`,
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runCheckAgentDocs();
}

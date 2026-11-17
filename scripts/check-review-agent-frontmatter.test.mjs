import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentRel = ".cursor/agents/review-behavior.md";
const agentPath = path.join(repoRoot, agentRel);
const skillRelFromAgent = "../skills/review-implementation/SKILL.md";
const skillPath = path.join(repoRoot, ".cursor/skills/review-implementation/SKILL.md");

/** @param {string} content */
function splitFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  assert.ok(match, `${agentRel}: YAML frontmatter delimiters missing`);
  return { yaml: match[1], body: match[2] };
}

/** @param {string} yaml @param {string} key */
function frontmatterScalar(yaml, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const m = re.exec(yaml);
  if (!m) return undefined;
  const raw = m[1].trim();
  if (raw.startsWith(">-") || raw.startsWith("|")) {
    const block = [];
    const lines = yaml.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`${key}:`));
    assert.ok(start >= 0);
    for (let i = start + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.match(/^[a-zA-Z0-9_-]+:/)) break;
      if (line.startsWith("  ")) block.push(line.slice(2));
    }
    return block.join(" ").trim();
  }
  return raw.replace(/^['"]|['"]$/g, "");
}

/** @param {string} description frontmatter description only */
function descriptionAvoidsAutoDelegation(description) {
  const lower = description.toLowerCase();
  return (
    !lower.includes("use proactively") &&
    !lower.includes("always use") &&
    !/proactiv/i.test(description)
  );
}

test("review-behavior agent frontmatter name model readonly", () => {
  const content = fs.readFileSync(agentPath, "utf8");
  const { yaml } = splitFrontmatter(content);
  assert.equal(frontmatterScalar(yaml, "name"), "review-behavior");
  assert.equal(frontmatterScalar(yaml, "model"), "inherit");
  assert.equal(frontmatterScalar(yaml, "readonly"), "true");
});

test("review-behavior agent explicit invocation and review-implementation link", () => {
  const content = fs.readFileSync(agentPath, "utf8");
  const { yaml, body } = splitFrontmatter(content);
  const description = frontmatterScalar(yaml, "description") ?? "";
  assert.ok(description.includes("/review-behavior"), "description must name explicit invocation");
  assert.ok(
    descriptionAvoidsAutoDelegation(description),
    "description must not encourage proactive or always-on delegation",
  );
  assert.match(
    body,
    /\]\(\.\.\/skills\/review-implementation\/SKILL\.md\)/,
    "body must link review-implementation skill with repo-relative path",
  );
  assert.ok(fs.existsSync(skillPath), `${skillRelFromAgent} must resolve from ${agentRel}`);
  const resolved = path.normalize(path.join(path.dirname(agentPath), skillRelFromAgent));
  assert.equal(resolved, skillPath);
});

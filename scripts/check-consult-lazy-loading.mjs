/**
 * Structural guard for consult rule lazy-loading (Issue #553).
 * Before migration (feature-436 monolithic consult.mdc): 8107 bytes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONSULT_MDC = path.join(REPO_ROOT, ".cursor/rules/consult.mdc");
const SESSION_MD = path.join(
  REPO_ROOT,
  ".cursor/skills/consult/references/session.md",
);
const SKILL_MD = path.join(REPO_ROOT, ".cursor/skills/consult/SKILL.md");
const EXPECTED_BODY = path.join(
  REPO_ROOT,
  "scripts/fixtures/consult-session-body.expected.md",
);

const REQUIRED_SESSION_HEADINGS = [
  "## 返答の順",
  "## 始め方",
  "## 案の出し方",
  "## 説明の仕方",
  "## 仕様と設計の相談",
  "## 例とたとえ",
  "## 話し方",
  "## 問いと作業",
];

const FORBIDDEN_IN_STUB = REQUIRED_SESSION_HEADINGS;

/** @param {string} stub */
export function findForbiddenHeadingsInStub(stub) {
  return FORBIDDEN_IN_STUB.filter((heading) => stub.includes(heading));
}

export { REQUIRED_SESSION_HEADINGS };

function read(relFromRepoRoot) {
  return fs.readFileSync(path.join(REPO_ROOT, relFromRepoRoot), "utf8");
}

function resolveMarkdownLink(fromFile, target) {
  return path.normalize(path.join(path.dirname(fromFile), target));
}

function extractMarkdownLinks(markdown) {
  const links = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const href = m[1];
    if (href.startsWith("http://") || href.startsWith("https://")) continue;
    links.push(href);
  }
  return links;
}

function main() {
  const stub = fs.readFileSync(CONSULT_MDC, "utf8");
  const session = fs.readFileSync(SESSION_MD, "utf8");
  const expected = fs.readFileSync(EXPECTED_BODY, "utf8");
  const skill = fs.readFileSync(SKILL_MD, "utf8");

  assert.match(stub, /^---\n[\s\S]*?\n---\n/);
  assert.match(stub, /alwaysApply:\s*true/);
  assert.match(stub, /相談モード/);
  assert.match(stub, /\/consult/);
  assert.match(
    stub,
    /\(\.\.\/skills\/consult\/references\/session\.md\)/,
    "stub must reference session.md",
  );
  assert.match(
    stub,
    /\(\.\.\/skills\/consult\/SKILL\.md\)/,
    "stub must reference consult SKILL",
  );

  const forbiddenFound = findForbiddenHeadingsInStub(stub);
  assert.equal(
    forbiddenFound.length,
    0,
    `stub must not contain relocated body heading(s): ${forbiddenFound.join(", ")}`,
  );

  for (const heading of REQUIRED_SESSION_HEADINGS) {
    assert.ok(
      session.includes(heading),
      `session.md missing heading: ${heading}`,
    );
  }

  assert.equal(
    session,
    expected,
    "session.md must match frozen expected body fixture",
  );

  assert.match(skill, /disable-model-invocation:\s*true/);
  assert.match(skill, /references\/session\.md/);
  assert.ok(
    !skill.includes("consult.mdc は利用者が終わりを告げるまで毎回読み込まれる"),
    "SKILL must not claim full consult.mdc body loads every turn",
  );

  for (const file of [CONSULT_MDC, SESSION_MD, SKILL_MD]) {
    const links = extractMarkdownLinks(fs.readFileSync(file, "utf8"));
    for (const href of links) {
      const resolved = resolveMarkdownLink(file, href);
      assert.ok(
        fs.existsSync(resolved),
        `broken relative link in ${path.relative(REPO_ROOT, file)}: ${href} -> ${resolved}`,
      );
    }
  }

  const stubBytes = fs.statSync(CONSULT_MDC).size;
  const sessionBytes = fs.statSync(SESSION_MD).size;
  const beforeMonolithBytes = 8107;

  console.log(
    JSON.stringify({
      beforeMonolithConsultMdcBytes: beforeMonolithBytes,
      afterStubConsultMdcBytes: stubBytes,
      sessionBodyBytes: sessionBytes,
      stubPlusSessionBytes: stubBytes + sessionBytes,
    }),
  );
}

main();

import assert from "node:assert/strict";
import test from "node:test";
import {
  ciFlagsForChangedPaths,
  pathSetsAgentdocs,
} from "./ci-changed-path-flags.mjs";

test("check-agent-docs script changes agentdocs only", () => {
  const flags = ciFlagsForChangedPaths([
    "scripts/check-agent-docs.mjs",
    "scripts/check-agent-docs.test.mjs",
  ]);
  assert.equal(flags.agentdocs, true);
  assert.equal(flags.frontend, false);
  assert.equal(flags.rust, false);
  assert.equal(flags.manual, false);
});

test("consult rule and session set agentdocs without dropping frontend overlap elsewhere", () => {
  const flags = ciFlagsForChangedPaths([
    ".cursor/rules/consult.mdc",
    ".cursor/skills/consult/references/session.md",
  ]);
  assert.equal(flags.agentdocs, true);
  assert.equal(flags.frontend, false);
  assert.equal(flags.rust, false);
});

test("AGENTS.md sets agentdocs only", () => {
  const flags = ciFlagsForChangedPaths(["AGENTS.md"]);
  assert.deepEqual(flags, {
    frontend: false,
    rust: false,
    manual: false,
    agentdocs: true,
  });
});

test("write-schedule SKILL sets agentdocs and frontend", () => {
  const flags = ciFlagsForChangedPaths([
    ".cursor/skills/write-schedule/SKILL.md",
  ]);
  assert.equal(flags.agentdocs, true);
  assert.equal(flags.frontend, true);
  assert.equal(flags.rust, false);
});

test("schedule-talk reference sets agentdocs and rust", () => {
  const flags = ciFlagsForChangedPaths([
    ".cursor/skills/schedule-talk/references/consultation-flow.md",
  ]);
  assert.equal(flags.agentdocs, true);
  assert.equal(flags.rust, true);
  assert.equal(flags.frontend, false);
});

test("ordinary src change sets frontend only", () => {
  const flags = ciFlagsForChangedPaths(["src/App.tsx"]);
  assert.equal(flags.frontend, true);
  assert.equal(flags.agentdocs, false);
});

test("pathSetsAgentdocs matches all agent-doc scan paths", () => {
  assert.equal(pathSetsAgentdocs("scripts/check-operation-entries.mjs"), false);
  assert.equal(pathSetsAgentdocs("scripts/check-agent-docs.mjs"), true);
  assert.equal(
    pathSetsAgentdocs(
      ".cursor/skills/how-to/references/manual-map.md",
    ),
    true,
  );
});

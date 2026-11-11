/**
 * Mirror of `.github/workflows/ci.yml` changes-job path classification.
 * Keep in sync when editing the workflow filter.
 */

/** @param {string} file */
export function pathSetsAgentdocs(file) {
  return (
    file === "AGENTS.md" ||
    (file.startsWith("docs/agents-") && file.endsWith(".md")) ||
    (file.startsWith(".cursor/rules/") && file.endsWith(".mdc")) ||
    /^\.cursor\/skills\/[^/]+\/SKILL\.md$/.test(file) ||
    /^\.cursor\/skills\/[^/]+\/references\/[^/]+\.md$/.test(file) ||
    /^scripts\/check-agent-docs\./.test(file)
  );
}

/** @param {string} file */
function pathSetsRust(file) {
  return (
    file.startsWith("src-tauri/") ||
    file === "rust-toolchain.toml" ||
    file.startsWith("read-screen/") ||
    file.startsWith(".cursor/skills/schedule-talk/")
  );
}

/** @param {string} file */
function pathSetsManual(file) {
  return (
    file.startsWith("docs/user-manual/") ||
    file === "docs/user-manual.md" ||
    file === "scripts/build-user-manual-site.mjs" ||
    file.startsWith("scripts/manual-site/") ||
    file === ".github/workflows/pages.yml"
  );
}

const FRONTEND_PREFIXES = [
  "src/",
  "examples/",
  ".cursor/skills/write-schedule/",
  ".cursor/skills/write-calendar/",
  ".cursor/skills/write-members/",
  ".cursor/skills/write-workspace/",
  ".cursor/skills/write-fields/",
  ".cursor/skills/write-colors/",
  ".cursor/skills/how-to/",
];

const FRONTEND_EXACT = new Set([
  "index.html",
  "package.json",
  "package-lock.json",
  "eslint.config.js",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.node.json",
  "vitest.config.ts",
  "docs/schedule.schema.json",
  "docs/members.schema.json",
  "docs/calendar.schema.json",
  "docs/field-extensions.schema.json",
  "docs/workspace.schema.json",
  "docs/colors.schema.json",
]);

/** @param {string} file */
export function pathSetsFrontend(file) {
  if (/^scripts\/check-agent-docs\./.test(file)) {
    return false;
  }
  if (file.startsWith(".github/workflows/")) {
    return true;
  }
  if (file.startsWith("scripts/")) {
    return true;
  }
  if (FRONTEND_EXACT.has(file)) {
    return true;
  }
  return FRONTEND_PREFIXES.some((prefix) => file.startsWith(prefix));
}

/**
 * @param {readonly string[]} files
 */
export function ciFlagsForChangedPaths(files) {
  /** @type {{ frontend: boolean, rust: boolean, manual: boolean, agentdocs: boolean }} */
  const flags = {
    frontend: false,
    rust: false,
    manual: false,
    agentdocs: false,
  };
  for (const file of files) {
    if (pathSetsAgentdocs(file)) {
      flags.agentdocs = true;
    }
    if (pathSetsRust(file)) {
      flags.rust = true;
    }
    if (pathSetsManual(file)) {
      flags.manual = true;
    }
    if (pathSetsFrontend(file)) {
      flags.frontend = true;
    }
  }
  return flags;
}

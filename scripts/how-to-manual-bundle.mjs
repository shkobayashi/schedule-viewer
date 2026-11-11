import fs from "node:fs";
import path from "node:path";

/** @typedef {{ source: string, out: string }} HowToManualPage */

/** @type {HowToManualPage[]} */
export const HOW_TO_MANUAL_PAGES = [
  { source: "docs/user-manual.md", out: "user-manual.md" },
  { source: "docs/user-manual/getting-started.md", out: "getting-started.md" },
  { source: "docs/user-manual/find-by-intent.md", out: "find-by-intent.md" },
  { source: "docs/user-manual/tutorial.md", out: "tutorial.md" },
  { source: "docs/user-manual/features.md", out: "features.md" },
  { source: "docs/user-manual/privacy.md", out: "privacy.md" },
];

export const HOW_TO_MANUAL_DIR = ".cursor/skills/how-to/manual";

/**
 * @param {string} markdown
 * @returns {string}
 */
export function stripMarkdownImages(markdown) {
  return markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
}

/**
 * @param {string} repoRoot
 * @returns {Map<string, string>}
 */
export function buildHowToManualFromSources(repoRoot) {
  const map = new Map();
  for (const page of HOW_TO_MANUAL_PAGES) {
    const raw = fs.readFileSync(path.join(repoRoot, page.source), "utf8");
    map.set(page.out, stripMarkdownImages(raw));
  }
  return map;
}

/**
 * @param {string} repoRoot
 * @returns {void}
 */
export function writeHowToManualBundle(repoRoot) {
  const manualDir = path.join(repoRoot, HOW_TO_MANUAL_DIR);
  fs.mkdirSync(manualDir, { recursive: true });
  const expected = new Set(HOW_TO_MANUAL_PAGES.map((p) => p.out));
  for (const page of HOW_TO_MANUAL_PAGES) {
    const raw = fs.readFileSync(path.join(repoRoot, page.source), "utf8");
    const stripped = stripMarkdownImages(raw);
    fs.writeFileSync(path.join(manualDir, page.out), stripped);
  }
  for (const name of fs.readdirSync(manualDir)) {
    const full = path.join(manualDir, name);
    if (!expected.has(name)) {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        fs.rmSync(full, { recursive: true, force: true });
      } else {
        fs.rmSync(full);
      }
    }
  }
}

/**
 * @param {string} manualDir
 * @param {Map<string, string>} expectedFromSources
 * @returns {string[]}
 */
export function assertHowToManualBundleState(manualDir, expectedFromSources) {
  const errors = [];
  const expectedNames = new Set(HOW_TO_MANUAL_PAGES.map((p) => p.out));

  if (!fs.existsSync(manualDir)) {
    errors.push(`missing directory ${manualDir}`);
    for (const out of expectedNames) {
      errors.push(`missing bundled file manual/${out}`);
    }
    return errors;
  }

  const entries = fs.readdirSync(manualDir);
  const onDisk = new Set();

  for (const name of entries) {
    const full = path.join(manualDir, name);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      errors.push(`unexpected bundled directory manual/${name}`);
      continue;
    }
    if (stat.isSymbolicLink()) {
      errors.push(`unexpected symlink manual/${name}`);
      continue;
    }
    if (stat.isFile()) {
      onDisk.add(name);
    } else {
      errors.push(`unexpected non-regular entry manual/${name}`);
    }
  }

  for (const out of expectedNames) {
    if (!onDisk.has(out)) {
      errors.push(`missing bundled file manual/${out}`);
    }
  }
  for (const name of onDisk) {
    if (!expectedFromSources.has(name)) {
      errors.push(`unexpected bundled file manual/${name}`);
    }
  }

  for (const [out, expected] of expectedFromSources) {
    const bundledPath = path.join(manualDir, out);
    if (!fs.existsSync(bundledPath)) {
      continue;
    }
    const bundled = fs.readFileSync(bundledPath, "utf8");
    if (bundled !== expected) {
      errors.push(`stale bundled file manual/${out}`);
    }
    if (bundled.includes("![")) {
      errors.push(`image markdown left in manual/${out}`);
    }
  }

  return errors;
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function assertHowToManualBundleFresh(repoRoot) {
  const manualDir = path.join(repoRoot, HOW_TO_MANUAL_DIR);
  return assertHowToManualBundleState(
    manualDir,
    buildHowToManualFromSources(repoRoot),
  );
}

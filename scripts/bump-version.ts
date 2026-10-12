import {
  bumpBeta,
  bumpMajor,
  bumpMinor,
  bumpPatch,
  stripBetaSuffix,
} from "../src/model/releaseVersion.ts";
import {
  readPackageJsonVersion,
  writeProjectVersion,
} from "./project-version-files.ts";

const kind = process.argv[2];
const validKinds = new Set([
  "major",
  "minor",
  "patch",
  "beta",
  "stable",
]);

if (!kind || !validKinds.has(kind)) {
  console.error(
    "Usage: tsx scripts/bump-version.ts <major|minor|patch|beta|stable>",
  );
  process.exit(1);
}

const current = readPackageJsonVersion();
let next: string;

try {
  if (kind === "major") next = bumpMajor(current);
  else if (kind === "minor") next = bumpMinor(current);
  else if (kind === "patch") next = bumpPatch(current);
  else if (kind === "beta") next = bumpBeta(current);
  else next = stripBetaSuffix(current);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

writeProjectVersion(next);
console.log(`Bumped version: ${current} -> ${next}`);
console.log("Run: npm run version:check");

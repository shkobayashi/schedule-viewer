import { readFileSync, writeFileSync } from "node:fs";
import { buildFullReleaseBody } from "../src/model/releaseNotes.ts";

const version = process.argv[2];
const repo = process.argv[3] ?? "shkobayashi/schedule-viewer";
const prefixPath = process.argv[4] ?? "scripts/release-body-prefix.md";
const changelogPath = process.argv[5] ?? "CHANGELOG.md";
const outPath = process.argv[6];

if (!version || !outPath) {
  console.error(
    "usage: tsx scripts/build-release-notes.ts <version> [repo] [prefixPath] [changelogPath] <outPath>",
  );
  process.exit(1);
}

const prefix = readFileSync(prefixPath, "utf8");
const changelog = readFileSync(changelogPath, "utf8");
const body = buildFullReleaseBody(prefix, changelog, version, repo);
writeFileSync(outPath, body, "utf8");
console.log(`Wrote release notes to ${outPath}`);

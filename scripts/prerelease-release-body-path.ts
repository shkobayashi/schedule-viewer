import { parseReleaseVersion } from "../src/model/releaseVersion.ts";
import { readPackageJsonVersion } from "./project-version-files.ts";

const version = readPackageJsonVersion();
const parsed = parseReleaseVersion(version);
if (!parsed) {
  console.error(`Invalid version: ${version}`);
  process.exit(1);
}
if (parsed.kind === "alpha") {
  console.log("scripts/release-body-alpha.md");
} else if (parsed.kind === "beta") {
  console.log("scripts/release-body-beta.md");
} else {
  console.error(`Prerelease body path requires alpha or beta, got ${version}`);
  process.exit(1);
}

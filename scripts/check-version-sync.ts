import { isValidReleaseVersion } from "../src/model/releaseVersion.ts";
import { readAllProjectVersions } from "./project-version-files.ts";

const sources = readAllProjectVersions();
const versions = Object.values(sources);
const expected = versions[0];
const mismatched = Object.entries(sources).filter(([, v]) => v !== expected);

if (!isValidReleaseVersion(expected)) {
  console.error(`Invalid release version format: ${expected}`);
  console.error("Expected X.Y.Z or X.Y.Z-beta.N (N >= 1, no leading zero)");
  process.exit(1);
}

if (mismatched.length > 0) {
  console.error("Version mismatch across project files:");
  for (const [file, version] of Object.entries(sources)) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

console.log(`All versions match: ${expected}`);

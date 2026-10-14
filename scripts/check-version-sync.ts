import {
  isValidReleaseVersion,
  updaterEndpointForVersion,
} from "../src/model/releaseVersion.ts";
import { readFileSync } from "node:fs";
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

const tauriConf = JSON.parse(
  readFileSync("src-tauri/tauri.conf.json", "utf8"),
) as { plugins?: { updater?: { endpoints?: string[] } } };
const endpoints = tauriConf.plugins?.updater?.endpoints;
if (!endpoints || endpoints.length !== 1) {
  console.error(
    "src-tauri/tauri.conf.json must have exactly one plugins.updater.endpoints entry",
  );
  process.exit(1);
}
const expectedEndpoint = updaterEndpointForVersion(expected);
if (endpoints[0] !== expectedEndpoint) {
  console.error("Updater endpoint does not match project version major:");
  console.error(`  expected: ${expectedEndpoint}`);
  console.error(`  actual:   ${endpoints[0]}`);
  process.exit(1);
}

console.log(`All versions match: ${expected}`);

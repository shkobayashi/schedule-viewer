import { execFileSync } from "node:child_process";
import {
  isValidReleaseVersion,
  releaseTagForVersion,
  shouldMarkGitHubReleaseLatest,
} from "../src/model/releaseVersion.ts";
import {
  listExistingStableVersions,
  releaseExists,
} from "./gh-release-utils.ts";
import { readPackageJsonVersion } from "./project-version-files.ts";

const version = readPackageJsonVersion();
if (!isValidReleaseVersion(version)) {
  console.error(`Invalid version: ${version}`);
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error("GITHUB_REPOSITORY is required");
  process.exit(1);
}

const tag = releaseTagForVersion(version);
if (!releaseExists(repo, tag)) {
  console.error(`Release ${tag} does not exist`);
  process.exit(1);
}

const existing = listExistingStableVersions(repo).filter((v) => v !== version);
const makeLatest = shouldMarkGitHubReleaseLatest(version, existing);
if (makeLatest === null) {
  console.error(`Version ${version} is not a stable release`);
  process.exit(1);
}

if (!makeLatest) {
  console.log(`Skipping Latest for ${tag}: a larger major stable release exists`);
  process.exit(0);
}

execFileSync(
  "gh",
  ["release", "edit", tag, "--repo", repo, "--latest"],
  { stdio: "inherit" },
);
console.log(`Marked ${tag} as Latest`);

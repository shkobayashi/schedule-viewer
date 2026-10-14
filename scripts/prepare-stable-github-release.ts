import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  isValidReleaseVersion,
  releaseTagForVersion,
  shouldMarkGitHubReleaseLatest,
} from "../src/model/releaseVersion.ts";
import {
  listExistingStableVersions,
  releaseExists,
  requireGithubSha,
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
const existing = listExistingStableVersions(repo).filter((v) => v !== version);
const makeLatest = shouldMarkGitHubReleaseLatest(version, existing);
if (makeLatest === null) {
  console.error(`Version ${version} is not a stable release`);
  process.exit(1);
}

const prefix = readFileSync("scripts/release-body-prefix.md", "utf8").replace(
  /shkobayashi\/schedule-viewer/g,
  repo,
);
const notesPath = "dist-release/prepare-release-notes.md";
mkdirSync("dist-release", { recursive: true });
writeFileSync(notesPath, prefix);

if (releaseExists(repo, tag)) {
  if (!makeLatest) {
    execFileSync(
      "gh",
      ["release", "edit", tag, "--repo", repo, "--latest=false"],
      { stdio: "inherit" },
    );
    console.log(`Updated ${tag} latest=false`);
  } else {
    console.log(`Release ${tag} already exists; Latest unchanged until assets are published`);
  }
} else {
  const target = requireGithubSha();
  execFileSync(
    "gh",
    [
      "release",
      "create",
      tag,
      "--repo",
      repo,
      "--target",
      target,
      "--title",
      `schedule-viewer v${version}`,
      "--notes-file",
      notesPath,
      "--latest=false",
    ],
    { stdio: "inherit" },
  );
  console.log(`Created ${tag} target=${target} latest=false`);
}

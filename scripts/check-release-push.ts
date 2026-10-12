import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import {
  evaluateReleasePush,
  isValidReleaseVersion,
  releaseTagForVersion,
} from "../src/model/releaseVersion.ts";
import { readPackageJsonVersion } from "./project-version-files.ts";

const branch = process.env.GITHUB_REF_NAME;
const commitSha = process.env.GITHUB_SHA;

if (!branch || !commitSha) {
  console.error("GITHUB_REF_NAME and GITHUB_SHA are required");
  process.exit(1);
}

const version = readPackageJsonVersion();
if (!isValidReleaseVersion(version)) {
  console.error(`Invalid version: ${version}`);
  process.exit(1);
}

const tag = releaseTagForVersion(version);

let tagCommitSha: string | null;
try {
  tagCommitSha = execFileSync("git", ["rev-list", "-n", "1", tag], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  tagCommitSha = null;
}

const decision = evaluateReleasePush({
  branch,
  version,
  commitSha,
  tagCommitSha,
});

if (!decision.ok) {
  console.error(decision.message);
  process.exit(1);
}

const prerelease = decision.prerelease ? "true" : "false";
const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath) {
  appendFileSync(
    outputPath,
    `prerelease=${prerelease}\nrelease_tag=${decision.tag}\n`,
  );
}

console.log(
  `Release push allowed: tag=${decision.tag} prerelease=${prerelease}`,
);

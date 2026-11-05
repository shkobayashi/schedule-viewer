import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(repoRoot, "scripts/madge-circular-baseline.json");

type BaselineFile = {
  schemaVersion: number;
  cycleCount: number;
  cycles: string[];
};

function cycleToString(cycle: string[]): string {
  return cycle.join(" > ");
}

function listMadgeCircularCycles(): string[] {
  const result = spawnSync(
    "npx",
    ["madge", "--circular", "--extensions", "ts,tsx", "--json", "src"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  const raw = result.stdout?.trim() ?? "";
  if (!raw) {
    if (result.status !== 0 && result.stderr?.trim()) {
      throw new Error(result.stderr.trim());
    }
    return [];
  }
  const parsed = JSON.parse(raw) as string[][];
  if (!Array.isArray(parsed)) {
    throw new Error("madge JSON output is not an array");
  }
  return parsed.map(cycleToString).sort((a, b) => a.localeCompare(b));
}

function loadBaseline(): BaselineFile {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as BaselineFile;
  if (baseline.schemaVersion !== 1) {
    throw new Error(`Unsupported baseline schemaVersion ${baseline.schemaVersion}`);
  }
  return baseline;
}

const baseline = loadBaseline();
const live = listMadgeCircularCycles();

if (live.length !== baseline.cycleCount) {
  console.error(
    `madge circular count ${live.length} !== baseline ${baseline.cycleCount}`,
  );
  process.exit(1);
}

const expected = [...baseline.cycles].sort((a, b) => a.localeCompare(b));
const missing = expected.filter((cycle) => !live.includes(cycle));
const extra = live.filter((cycle) => !expected.includes(cycle));

if (missing.length > 0 || extra.length > 0) {
  console.error("madge circular baseline drift:");
  for (const cycle of missing) {
    console.error(`  missing: ${cycle}`);
  }
  for (const cycle of extra) {
    console.error(`  extra: ${cycle}`);
  }
  console.error(
    "Update scripts/madge-circular-baseline.json only when resolving cycles (M1–M3) or intentionally recording a new baseline.",
  );
  process.exit(1);
}

console.log(`madge circular baseline OK (${live.length} cycles).`);

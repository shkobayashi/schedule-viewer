import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Builds the operation-entry catalog once via tsx (for node:test fixtures).
 * @returns {object}
 */
export function loadOperationEntryCatalog() {
  const snippet = `
import { buildOperationEntryCatalog } from "./scripts/operationEntryCatalog.ts";
console.log(JSON.stringify(buildOperationEntryCatalog()));
`;
  const result = spawnSync("npx", ["tsx", "-e", snippet], {
    cwd: repo,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "catalog export failed");
  }
  return JSON.parse(result.stdout.trim());
}

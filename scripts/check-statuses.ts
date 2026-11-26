import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatStatusesValidationErrors,
  validateStatuses,
} from "../src/model/validateStatuses";

const fileArg = process.argv[2];

function main(): void {
  const path = fileArg ?? "examples/playground.statuses.json";
  const data = JSON.parse(readFileSync(resolve(path), "utf8"));
  const result = validateStatuses(data);
  if (!result.ok) {
    console.error(formatStatusesValidationErrors(result.errors));
    process.exit(1);
  }
  console.log("OK");
}

main();

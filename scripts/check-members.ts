import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "../src/model/validateMembers";

const fileArg = process.argv[2];

function main(): void {
  const path = fileArg ?? "examples/playground.members.json";
  const data = JSON.parse(readFileSync(resolve(path), "utf8"));
  const result = validateMembers(data);
  if (!result.ok) {
    console.error(formatMembersValidationErrors(result.errors));
    process.exit(1);
  }
  console.log("OK");
}

main();

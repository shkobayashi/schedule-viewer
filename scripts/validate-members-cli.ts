import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "../src/model/validateMembers";

const file = process.argv[2];
if (!file) {
  console.error("Usage: validate-members <path-to.json>");
  process.exit(1);
}

const text = readFileSync(resolve(file), "utf8").replace(/^\uFEFF/, "");
let data: unknown;
try {
  data = JSON.parse(text);
} catch {
  console.error("JSON の形式が正しくありません。");
  process.exit(1);
}

const result = validateMembers(data);
if (!result.ok) {
  console.error(formatMembersValidationErrors(result.errors));
  process.exit(1);
}

console.log("OK");

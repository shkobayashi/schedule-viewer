import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatColorsValidationErrors,
  validateColors,
} from "../src/model/validateColors";

const file = process.argv[2];
if (!file) {
  console.error("Usage: validate-colors <path-to.json>");
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

const result = validateColors(data);
if (!result.ok) {
  console.error(formatColorsValidationErrors(result.errors));
  process.exit(1);
}

console.log("OK");

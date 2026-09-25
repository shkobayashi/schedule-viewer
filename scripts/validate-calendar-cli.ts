import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatCalendarValidationErrors,
  validateCalendar,
} from "../src/model/validateCalendar";

const file = process.argv[2];
if (!file) {
  console.error("Usage: validate-calendar <path-to.json>");
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

const result = validateCalendar(data);
if (!result.ok) {
  console.error(formatCalendarValidationErrors(result.errors));
  process.exit(1);
}

console.log("OK");

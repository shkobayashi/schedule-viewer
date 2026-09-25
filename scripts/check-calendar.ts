import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatCalendarValidationErrors,
  validateCalendar,
} from "../src/model/validateCalendar";

const fileArg = process.argv[2];

function main(): void {
  const path = fileArg ?? "examples/jp-2026.calendar.json";
  const data = JSON.parse(readFileSync(resolve(path), "utf8"));
  const result = validateCalendar(data);
  if (!result.ok) {
    console.error(formatCalendarValidationErrors(result.errors));
    process.exit(1);
  }
  console.log("OK");
}

main();

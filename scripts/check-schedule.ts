import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatValidationErrors,
  validateSchedule,
} from "../src/model/validateSchedule";
import { sampleScheduleDocument } from "../src/sample/schedule";

const fileArg = process.argv[2];

function main(): void {
  const data = fileArg
    ? JSON.parse(readFileSync(resolve(fileArg), "utf8"))
    : sampleScheduleDocument();
  const result = validateSchedule(data);
  if (!result.ok) {
    console.error(formatValidationErrors(result.errors));
    process.exit(1);
  }
  console.log("OK");
}

main();

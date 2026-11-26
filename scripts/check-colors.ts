import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatColorsValidationErrors,
  validateColors,
} from "../src/model/validateColors";

const fileArg = process.argv[2];

function main(): void {
  const path = fileArg ?? "examples/colors/colors.json";
  const data = JSON.parse(readFileSync(resolve(path), "utf8"));
  const result = validateColors(data);
  if (!result.ok) {
    console.error(formatColorsValidationErrors(result.errors));
    process.exit(1);
  }
  console.log("OK");
}

main();

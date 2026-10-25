#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import workspaceSchema from "../workspace.schema.json" with { type: "json" };

const file = process.argv[2];
if (!file) {
  console.error("Usage: validate-workspace <path-to.json>");
  process.exit(1);
}

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
  workspaceSchema,
);

const text = readFileSync(resolve(file), "utf8").replace(/^\uFEFF/, "");
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("JSON の形式が正しくありません。");
  process.exit(1);
}

if (!validate(data)) {
  console.error(validate.errors?.[0]?.message ?? "形式が正しくありません");
  process.exit(1);
}

console.log("OK");

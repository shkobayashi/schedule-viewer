#!/usr/bin/env node
/**
 * 計画「色を LLM から操作するテスト」の自動確認（MCP --screen と validate-colors）。
 * 前提: デスクトップ版が起動し、examples/colors の workspace を前面で開いていること。
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "src-tauri/target/debug/schedule-viewer");
const validate = path.join(
  root,
  ".cursor/skills/write-colors/scripts/validate-colors.mjs",
);
const scratch = path.join(root, "examples/llm-color-test/scratch");
const schedulePath = path.join(root, "examples/colors/schedule.json");

function screen(tool, stdin) {
  const r = spawnSync(bin, ["--screen", tool], {
    input: stdin ?? "",
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`${tool} stderr: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const results = [];

function ok(name) {
  results.push({ name, pass: true });
  console.log(`OK  ${name}`);
}

try {
  execFileSync(process.execPath, [validate, path.join(scratch, "nine-colors-invalid-count.json")], {
    stdio: "pipe",
  });
  throw new Error("nine colors should fail validation");
} catch (e) {
  if (e.message.includes("should fail")) throw e;
  ok("write-colors: 9 件は schema 検証で拒否");
}

execFileSync(process.execPath, [validate, path.join(scratch, "new-steady-id-user-specified.json")]);
ok("write-colors: id 指定の新規 JSON が検証を通る");

const filtered = JSON.parse(screen("filtered_tasks"));
assert(Array.isArray(filtered.colors), "colors missing");
assert(filtered.colors.length === 3, "colors length");
assert(
  filtered.colors.every(
    (c) =>
      c.id &&
      c.name &&
      c.description &&
      c.color?.light?.bg &&
      c.color?.dark?.bg &&
      !("role" in c),
  ),
  "color entry shape",
);
const keys = Object.keys(filtered);
assert(
  keys.indexOf("statuses") < keys.indexOf("colors") &&
    keys.indexOf("colors") < keys.indexOf("fields"),
  "key order",
);
ok("MCP filtered_tasks: colors 3 件・キー順");

const current = JSON.parse(screen("current_schedule"));
assert(!("colors" in current), "current_schedule must not have colors");
ok("MCP current_schedule: トップに colors 無し");

const baselineSaved = screen("baseline_diffs");
assert(!baselineSaved.includes("異なる"), "expected saved baseline");

const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
const modified = JSON.parse(JSON.stringify(schedule));
modified.categories[0].groups[0].tasks[2].colorId = "focus";
const diff = screen("replace_schedule", JSON.stringify(modified));
assert(diff.includes("colorId") && diff.includes("focus"), "replace diff");

const baselineDirty = screen("baseline_diffs");
assert(baselineDirty.includes("画面のみ") && baselineDirty.includes("colorId"), "baseline 画面のみ");
ok("replace_schedule + baseline_diffs: 色だけの未保存は画面のみ");

screen("replace_schedule", JSON.stringify(JSON.parse(fs.readFileSync(schedulePath, "utf8"))));
ok("restore: 画面をファイルに戻した");

console.log(`\n${results.length} passed`);

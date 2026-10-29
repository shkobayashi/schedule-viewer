import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateLinks } from "./build-user-manual-site.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const features = path.join(root, "docs/user-manual/features.md");

test("same-page fragment is checked against the current manual page", () => {
  assert.doesNotThrow(() =>
    validateLinks("色の選び方は [タスクへの色](#タスクへの色) と同じです。", features),
  );
});

test("missing same-page fragment names the current html file", () => {
  assert.throws(
    () => validateLinks("[無い](#この見出しは無い)", features),
    /Unknown fragment #この見出しは無い in features\.html \(from docs\/user-manual\/features\.md: #この見出しは無い\)/,
  );
});

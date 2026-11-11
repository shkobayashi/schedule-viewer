import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

const repo = new URL("..", import.meta.url).pathname;
const files = [
  "docs/user-manual/features.md",
  "docs/user-manual/find-by-intent.md",
  "docs/operation-entries.md",
  "docs/regression-matrix.md",
  "docs/regression.md",
  "docs/regression-tc.md",
  "docs/test-spec.md",
  "docs/regression-tc-ids.txt",
];

test("check-regression-coverage maps headings, operations, tools, and manual cases", () => {
  const result = run(repo);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("a wording change that keeps step ids still passes", () => {
  withCopy((root) => {
    const path = join(root, "docs/regression.md");
    const text = readFileSync(path, "utf8").replace("カードは出ない。", "カードは再起動後に出ない。");
    writeFileSync(path, text);
    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

test("deleting a heading row fails even when the name remains inside another cell", () => {
  withCopy((root) => {
    const path = join(root, "docs/regression-matrix.md");
    const text = readFileSync(path, "utf8").replace("| できること |", "| できることの説明 |");
    writeFileSync(path, text);
    assert.failWith(run(root), "できること");
  });
});

test("an operation is not covered by a longer name that merely contains it", () => {
  withCopy((root) => {
    const path = join(root, "docs/regression-matrix.md");
    const lines = readFileSync(path, "utf8").split("\n").filter((line) => {
      const item = line.split("|")[3]?.trim();
      return item !== "開く";
    });
    writeFileSync(path, lines.join("\n"));
    assert.failWith(run(root), "操作「開く」");
  });
});

test("a missing test file fails", () => {
  withCopy((root) => {
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/missing-regression.test.ts#does not exist",
    );
    assert.failWith(run(root), "missing-regression.test.ts");
  });
});

test("a test name that is not in the file fails", () => {
  withCopy((root) => {
    replace(
      root,
      "docs/regression-matrix.md",
      "shows the four headings while open",
      "this test name is not in the file",
    );
    assert.failWith(run(root), "this test name is not in the file");
  });
});

test("a step id that is not in the scenario fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression-matrix.md", "手動:RG-S2-6", "手動:RG-S2-99");
    assert.failWith(run(root), "RG-S2-99");
  });
});

test("a scenario heading without a numbered step fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression-matrix.md", "手動:RG-S2-6", "手動:RG-S2");
    assert.failWith(run(root), "RG-S2");
  });
});

test("a numbered step without an expectation fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression.md", "期待: 進行中の色、期限超過の赤、「調査」の未割当、土日の塗りが、地に溶けて読めなくならない。読めない色の名前を記録する。", "結果だけを書く。");
    assert.failWith(run(root), "期待か扱いが無い");
  });
});

test("a duplicate case id that is not marked as merged fails", () => {
  withCopy((root) => {
    const path = join(root, "docs/regression-tc.md");
    const lines = readFileSync(path, "utf8").split("\n");
    const row = lines.find((line) => line.startsWith("| TC-FILE-01 |"));
    lines.push(row);
    writeFileSync(path, lines.join("\n"));
    assert.failWith(run(root), "統合ではない");
  });
});

test("deleting an id from both the list and the table fails", () => {
  withCopy((root) => {
    const listPath = join(root, "docs/regression-tc-ids.txt");
    writeFileSync(
      listPath,
      readFileSync(listPath, "utf8")
        .split("\n")
        .filter((line) => line.trim() !== "TC-FILE-01")
        .join("\n"),
    );
    const tablePath = join(root, "docs/regression-tc.md");
    writeFileSync(
      tablePath,
      readFileSync(tablePath, "utf8")
        .split("\n")
        .filter((line) => !line.startsWith("| TC-FILE-01 |"))
        .join("\n"),
    );
    assert.failWith(run(root), "ハッシュ");
  });
});

test("a table row whose id is not in the list fails", () => {
  withCopy((root) => {
    const path = join(root, "docs/regression-tc.md");
    const lines = readFileSync(path, "utf8").split("\n");
    const row = lines.find((line) => line.startsWith("| TC-FILE-01 |")).replace("| TC-FILE-01 |", "| TC-FILE-01-ADDED |");
    lines.push(row);
    writeFileSync(path, lines.join("\n"));
    assert.failWith(run(root), "一覧に無い");
  });
});

test("an empty expectation fails", () => {
  withCopy((root) => {
    const path = join(root, "docs/regression-tc.md");
    const lines = readFileSync(path, "utf8").split("\n").map((line) => {
      if (!line.startsWith("| TC-FILE-01 |")) return line;
      const cells = line.split("|");
      cells[5] = " ";
      return cells.join("|");
    });
    writeFileSync(path, lines.join("\n"));
    assert.failWith(run(root), "期待が空");
  });
});

test("a matrix row with the wrong number of columns fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression-matrix.md", "| MX-H-1 | 集約 | できること | 対象外 |", "| MX-H-1 | できること |");
    assert.failWith(run(root), "列が足りない");
  });
});

test("an unparsable manual reference fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression-matrix.md", "手動:RG-S2-6", "手動:なし");
    assert.failWith(run(root), "手順 ID が取れない");
  });
});

test("an operation row with fewer than eight columns fails", () => {
  withCopy((root) => {
    const path = join(root, "docs/operation-entries.md");
    const lines = readFileSync(path, "utf8").split("\n").map((line) => {
      const item = line.split("|")[1]?.trim();
      if (item === "開く") return "| 開く | 足りない |";
      return line;
    });
    writeFileSync(path, lines.join("\n"));
    assert.failWith(run(root), "8 列未満");
  });
});

test("a fourth-level heading in the feature manual fails", () => {
  withCopy((root) => {
    const path = join(root, "docs/user-manual/features.md");
    writeFileSync(path, readFileSync(path, "utf8") + "\n#### 未対応の見出し\n");
    assert.failWith(run(root), "未対応");
  });
});

test("一部手動 without 自動 fails", () => {
  withCopy((root) => {
    const path = join(root, "docs/regression-tc.md");
    const lines = readFileSync(path, "utf8").split("\n");
    const idx = lines.findIndex((line) => line.includes("| 一部手動 |") && line.includes("自動:"));
    assert.ok(idx >= 0);
    lines[idx] = lines[idx].replace(/自動:[^|。]+/g, "");
    writeFileSync(path, lines.join("\n"));
    assert.failWith(run(root), "一部手動に自動参照が無い");
  });
});

test("disallowed 自動化予定 issue fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression-tc.md", "自動化予定:#541", "自動化予定:#999");
    assert.failWith(run(root), "許可されていない");
  });
});

test("#[ignore] on an 自動 reference fails", () => {
  withCopy((root) => {
    const rustPath = join(root, "src-tauri/tests/fixture_ignore.rs");
    mkdirSync(dirname(rustPath), { recursive: true });
    writeFileSync(
      rustPath,
      `#[test]\n#[ignore = "xvfb"]\nfn ignored_sample() {}\n`,
    );
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src-tauri/tests/fixture_ignore.rs#ignored_sample",
    );
    assert.failWith(run(root), "#[ignore]");
  });
});

test("it.skip on an 自動 reference fails", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-skip.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    writeFileSync(testPath, `import { it } from "vitest";\nit.skip("skipped_sample", () => {});\n`);
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-skip.test.ts#skipped_sample",
    );
    assert.failWith(run(root), "skip 付き");
  });
});

test("describe.skip inner target fails and outside same name passes", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-describe-skip.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    const onlyInside = `import { describe, it } from "vitest";
describe.skip("suite", () => {
  it("inner_other", () => { expect(1).toBe(1); });
  it("only_in_skip", () => {});
});
`;
    writeFileSync(testPath, onlyInside);
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-describe-skip.test.ts#only_in_skip",
    );
    assert.failWith(run(root), "skip 付き");
    writeFileSync(
      testPath,
      onlyInside + `it("only_in_skip", () => {});\n`,
    );
    const ok = run(root);
    assert.equal(ok.status, 0, ok.stderr || ok.stdout);
  });
});

test("commented it.skip and another suite it.skip do not fail active same name", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-skip-false-positive.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    const activeSuite = `import { describe, it } from "vitest";
// it.skip("fp_target")
describe("a", () => { it.skip("fp_target", () => {}); });
describe("b", () => { it("fp_target", () => {}); });
`;
    writeFileSync(testPath, activeSuite);
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-skip-false-positive.test.ts#fp_target",
    );
    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    writeFileSync(
      testPath,
      `import { describe, it } from "vitest";
// it.skip("fp_target")
describe("a", () => { it.skip("fp_target", () => {}); });
`,
    );
    assert.failWith(run(root), "skip 付き");
  });
});

test("test.skip on auto reference fails", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-test-skip.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    writeFileSync(testPath, `import { test } from "vitest";\ntest.skip("test_skip_sample", () => {});\n`);
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-test-skip.test.ts#test_skip_sample",
    );
    assert.failWith(run(root), "skip 付き");
  });
});

test("indented #[ignore] on auto reference fails", () => {
  withCopy((root) => {
    const rustPath = join(root, "src-tauri/tests/fixture_indented_ignore.rs");
    mkdirSync(dirname(rustPath), { recursive: true });
    writeFileSync(
      rustPath,
      `mod inner {
  #[test]
  #[ignore = "xvfb"]
  fn indented_ignore_sample() {}
}
`,
    );
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src-tauri/tests/fixture_indented_ignore.rs#indented_ignore_sample",
    );
    assert.failWith(run(root), "#[ignore]");
  });
});

test("#[ignore] on one fn does not fail another fn in the same file", () => {
  withCopy((root) => {
    const rustPath = join(root, "src-tauri/tests/fixture_ignore_neighbor.rs");
    mkdirSync(dirname(rustPath), { recursive: true });
    writeFileSync(
      rustPath,
      `#[test]
#[ignore = "xvfb"]
fn ignored_neighbor() {}

#[test]
fn active_neighbor() {}
`,
    );
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src-tauri/tests/fixture_ignore_neighbor.rs#active_neighbor",
    );
    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

test("single-line describe.skip is followed by a non-skipped test outside", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-single-line-describe-skip.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    writeFileSync(
      testPath,
      `import { describe, it } from "vitest";
describe.skip("s", () => { it("after_skip_line", () => {}); });
it("after_skip_line", () => {});
`,
    );
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-single-line-describe-skip.test.ts#after_skip_line",
    );
    const ok = run(root);
    assert.equal(ok.status, 0, ok.stderr || ok.stdout);
    writeFileSync(
      testPath,
      `import { describe, it } from "vitest";
describe.skip("s", () => { it("after_skip_line", () => {}); });
`,
    );
    assert.failWith(run(root), "skip 付き");
  });
});

test("describe.skip inside a string does not mark nested tests", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-string-describe-skip.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    writeFileSync(
      testPath,
      `import { it } from "vitest";
const hint = "describe.skip('not code')";
it("string_describe_target", () => {});
`,
    );
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-string-describe-skip.test.ts#string_describe_target",
    );
    assert.equal(run(root).status, 0);
  });
});

test("it.skip inside block comment does not fail an active test", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-block-comment-skip.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    writeFileSync(
      testPath,
      `import { it } from "vitest";
/* it.skip("block_comment_target", () => {}) */
it("block_comment_target", () => {});
`,
    );
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-block-comment-skip.test.ts#block_comment_target",
    );
    assert.equal(run(root).status, 0);
  });
});

test("same name skipped in another file does not fail", () => {
  withCopy((root) => {
    const activePath = join(root, "src/model/fixture-other-file-active.test.ts");
    const skippedPath = join(root, "src/model/fixture-other-file-skipped.test.ts");
    mkdirSync(dirname(activePath), { recursive: true });
    writeFileSync(activePath, `import { it } from "vitest";\nit("other_file_target", () => {});\n`);
    writeFileSync(skippedPath, `import { it } from "vitest";\nit.skip("other_file_target", () => {});\n`);
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-other-file-active.test.ts#other_file_target",
    );
    assert.equal(run(root).status, 0);
  });
});

test("Rust comment-only fn name is not treated as a definition", () => {
  withCopy((root) => {
    const rustPath = join(root, "src-tauri/tests/fixture_comment_only_fn.rs");
    mkdirSync(dirname(rustPath), { recursive: true });
    writeFileSync(rustPath, `// fn comment_only_fn is not a definition\nfn real_fn() {}\n`);
    replace(
      root,
      "docs/regression-matrix.md",
      "| MX-O-33 | 計算 | 操作の案内を開く | 自動済み | 自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open |",
      "| MX-O-33 | 計算 | 操作の案内を開く | 自動済み | 自動:src-tauri/tests/fixture_comment_only_fn.rs#comment_only_fn |",
    );
    assert.failWith(run(root), "comment_only_fn");
  });
});

test("multiline Rust #[ignore] attributes fail auto refs", () => {
  withCopy((root) => {
    const rustPath = join(root, "src-tauri/tests/fixture_multiline_ignore.rs");
    mkdirSync(dirname(rustPath), { recursive: true });
    writeFileSync(
      rustPath,
      `#[test]\n#[ignore = "xvfb"]\nfn multiline_ignore_sample() {}\n`,
    );
    replace(
      root,
      "docs/regression-matrix.md",
      "| MX-O-33 | 計算 | 操作の案内を開く | 自動済み | 自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open |",
      "| MX-O-33 | 計算 | 操作の案内を開く | 自動済み | 自動:src-tauri/tests/fixture_multiline_ignore.rs#multiline_ignore_sample |",
    );
    assert.failWith(run(root), "#[ignore]");
  });
});

test("same-line it definition is detected", () => {
  withCopy((root) => {
    const testPath = join(root, "src/model/fixture-same-line-it.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    writeFileSync(testPath, `import { it } from "vitest"; describe("x",()=>{it.skip("same_line_target",()=>{});}); it("same_line_target",()=>{});\n`);
    replace(
      root,
      "docs/regression-matrix.md",
      "自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open",
      "自動:src/model/fixture-same-line-it.test.ts#same_line_target",
    );
    assert.equal(run(root).status, 0);
    writeFileSync(testPath, `import { it } from "vitest"; describe("x",()=>{it.skip("same_line_target",()=>{});});\n`);
    assert.failWith(run(root), "skip 付き");
  });
});

test("手動のまま reason mentioning a test name does not fail on skip", () => {
  withCopy((root) => {
    const rustPath = join(root, "src-tauri/tests/fixture_ignore.rs");
    mkdirSync(dirname(rustPath), { recursive: true });
    writeFileSync(
      rustPath,
      `#[test]\n#[ignore = "xvfb"]\nfn ignored_sample() {}\n`,
    );
    replace(
      root,
      "docs/regression-tc.md",
      "手動のまま:☰ の「新しいウィンドウで開く」でファイルダイアログから選ぶ操作は試験が行わない",
      "手動のまま:ignored_sample は試験が行わない",
    );
    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

function run(cwd) {
  return spawnSync("npx", ["tsx", "scripts/check-regression-coverage.ts", cwd], {
    encoding: "utf8",
    cwd: repo,
  });
}

function withCopy(runCase) {
  const root = mkdtempSync(join(tmpdir(), "regression-coverage-"));
  try {
    for (const file of files) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      cpSync(join(repo, file), join(root, file));
    }
    runCase(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function replace(root, file, from, to) {
  const path = join(root, file);
  const text = readFileSync(path, "utf8");
  assert.equal(text.includes(from), true, from);
  writeFileSync(path, text.replace(from, to));
}

assert.failWith = (result, text) => {
  assert.notEqual(result.status, 0);
  assert.equal((result.stderr || result.stdout || "").includes(text), true, result.stderr || result.stdout);
};

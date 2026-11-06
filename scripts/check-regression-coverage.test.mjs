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
    replace(root, "docs/regression-matrix.md", "手動:RG-S1-3", "手動:RG-S1-99");
    assert.failWith(run(root), "RG-S1-99");
  });
});

test("a scenario heading without a numbered step fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression-matrix.md", "手動:RG-S1-3", "手動:RG-S1");
    assert.failWith(run(root), "RG-S1");
  });
});

test("a numbered step without an expectation fails", () => {
  withCopy((root) => {
    replace(root, "docs/regression.md", "期待: カードは出ない。", "結果だけを書く。");
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
    replace(root, "docs/regression-matrix.md", "手動:RG-S1-3", "手動:なし");
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

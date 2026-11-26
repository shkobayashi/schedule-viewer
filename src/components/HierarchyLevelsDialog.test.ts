import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "HierarchyLevelsDialog.tsx",
);

describe("HierarchyLevelsDialog", () => {
  it("commits draft via footer 適用, not a second 閉じる (EDIT-21)", () => {
    const src = readFileSync(componentPath, "utf8");
    expect(src).toContain('variant="primary"');
    expect(src).toMatch(/>\s*適用\s*</);
    expect(src).not.toMatch(
      /handleCloseCommit[\s\S]{0,400}>\s*閉じる\s*</,
    );
  });
});

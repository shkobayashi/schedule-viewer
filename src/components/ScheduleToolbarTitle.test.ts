import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "ScheduleToolbarTitle.tsx",
);

describe("ScheduleToolbarTitle", () => {
  it("keeps 階層編集 visible while title edit swaps label slot (EDIT-20 + EDIT-21)", () => {
    const src = readFileSync(componentPath, "utf8");
    expect(src).toContain('className="toolbar-title-hierarchy-btn"');
    expect(src).toContain("{hierarchyButton}");
    const hierarchyRender = src.indexOf("{hierarchyButton}");
    const labelSlotClose = src.indexOf("</div>", src.indexOf("toolbar-title-label-slot"));
    expect(hierarchyRender).toBeGreaterThan(labelSlotClose);
    expect(src).not.toMatch(
      /editing\s*\?[\s\S]*toolbar-title-hierarchy-btn[\s\S]*:\s*null/,
    );
  });
});

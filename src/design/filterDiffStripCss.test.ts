import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { uiTokensFor } from "./uiTokens";

const appCssPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "App.css",
);

const tokens = uiTokensFor("light");

function cssBlock(selector: string, css: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const brace = css.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(brace + 1, i);
    }
  }
  throw new Error(`unclosed block for ${selector}`);
}

describe("filter panel and diff strip spacing tokens (#551 increment 2)", () => {
  const css = readFileSync(appCssPath, "utf8");

  it("maps filter panel grid and field gaps to space tokens", () => {
    const panel = cssBlock(".filter-panel", css);
    expect(panel).toContain("border-radius: var(--radius-sm)");

    const grid = cssBlock(".filter-panel-grid", css);
    expect(grid).toContain("gap: var(--space-md)");

    const fieldRows = cssBlock(".filter-field-rows", css);
    expect(fieldRows).toContain("gap: var(--space-md)");
    expect(fieldRows).toContain("margin-top: var(--space-xs)");

    const rowHead = cssBlock(".filter-field-row-head", css);
    expect(rowHead).toContain("gap: var(--space-sm)");

    const rowBody = cssBlock(".filter-field-row-body", css);
    expect(rowBody).toContain("gap: var(--space-sm) var(--space-md)");
  });

  it("maps diff strip header, actions, and list spacing to space tokens", () => {
    const header = cssBlock(".diff-strip-header", css);
    expect(header).toContain("gap: var(--space-sm)");
    expect(header).toContain("padding: calc(6px * var(--s)) calc(12px * var(--s))");

    const actions = cssBlock(".diff-strip-actions", css);
    expect(actions).toContain("gap: var(--space-sm)");

    const btn = cssBlock(".diff-strip-btn", css);
    expect(btn).toContain("padding: calc(6px * var(--s)) var(--space-lg)");

    const list = cssBlock(".diff-strip-list", css);
    expect(list).toContain("padding: var(--space-xs) 0");

    const row = cssBlock(".diff-strip-row", css);
    expect(row).toContain("padding: 0 var(--space-sm)");
    expect(row).toContain("gap: calc(6px * var(--s))");
  });

  it("uses radius-pill on filter chips without retokenizing bar spacing", () => {
    const chip = cssBlock(".filter-chip", css);
    expect(chip).toContain("border-radius: var(--radius-pill)");
    expect(chip).toContain("gap: 6px");
    expect(chip).toContain("padding: 2px 8px");

    const bar = cssBlock(".filter-bar", css);
    expect(bar).toContain("gap: 6px");
    expect(bar).toContain("padding: 4px 12px");
  });

  it("keeps detail panel left-facing shadow unchanged", () => {
    const detail = cssBlock(".detail-panel", css);
    expect(detail).toContain("box-shadow: -6px 0 24px var(--menu-shadow)");
  });

  it("matches design token literals from uiTokens.ts", () => {
    expect(tokens.radiusSm).toBe("8px");
    expect(tokens.radiusPill).toBe("999px");
    expect(tokens.spaceXs).toBe("calc(4px * var(--s))");
    expect(tokens.spaceSm).toBe("calc(8px * var(--s))");
    expect(tokens.spaceMd).toBe("calc(10px * var(--s))");
    expect(tokens.spaceLg).toBe("calc(14px * var(--s))");
  });
});

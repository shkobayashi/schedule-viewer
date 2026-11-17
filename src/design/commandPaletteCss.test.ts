import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appCssPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "App.css",
);

describe("command palette spacing tokens (#551 increment 1)", () => {
  it("maps input and item padding and gaps to --space-sm and --space-md", () => {
    const css = readFileSync(appCssPath, "utf8");
    expect(css).toMatch(
      /\.command-palette-input[\s\S]*margin-bottom:\s*var\(--space-sm\)/,
    );
    expect(css).toMatch(
      /\.command-palette-input[\s\S]*padding:\s*var\(--space-sm\) var\(--space-md\)/,
    );
    expect(css).toMatch(/\.command-palette-item[\s\S]*gap:\s*var\(--space-sm\)/);
    expect(css).toMatch(
      /\.command-palette-item[\s\S]*padding:\s*var\(--space-sm\) var\(--space-md\)/,
    );
  });

  it("does not keep scaled 8px/10px literals on palette input and items", () => {
    const css = readFileSync(appCssPath, "utf8");
    const block = (selector: string) => {
      const start = css.indexOf(selector);
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
    };
    const inputBody = block(".command-palette-input");
    const itemBody = block(".command-palette-item");
    expect(inputBody).not.toContain("calc(8px * var(--s))");
    expect(inputBody).not.toContain("calc(10px * var(--s))");
    expect(itemBody).not.toContain("calc(8px * var(--s))");
    expect(itemBody).not.toContain("calc(10px * var(--s))");
  });

  it("keeps frame chrome on design tokens and unmatched scaled padding", () => {
    const css = readFileSync(appCssPath, "utf8");
    expect(css).toMatch(/\.command-palette[\s\S]*gap:\s*var\(--space-md\)/);
    expect(css).toMatch(
      /\.command-palette[\s\S]*border-radius:\s*var\(--radius-dialog\)/,
    );
    expect(css).toMatch(
      /\.command-palette[\s\S]*box-shadow:\s*var\(--elevation-modal\)/,
    );
    expect(css).toMatch(/\.command-palette[\s\S]*padding:\s*calc\(20px \* var\(--s\)\)/);
    expect(css).toMatch(
      /\.command-palette-overlay[\s\S]*padding-top:\s*calc\(72px \* var\(--s\)\)/,
    );
    expect(css).toMatch(
      /\.command-palette-empty[\s\S]*padding:\s*calc\(12px \* var\(--s\)\)/,
    );
  });
});

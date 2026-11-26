import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appChromePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "appChrome.css",
);

describe("appChrome toolbar title edit", () => {
  it("uses toolbar-fg for pencil on Raycast toolbar (EDIT-20)", () => {
    const css = readFileSync(appChromePath, "utf8");
    expect(css).toMatch(
      /\.app \.toolbar-title-edit-btn[\s\S]*color:\s*var\(--toolbar-fg\)/,
    );
    expect(css).toMatch(
      /\.app \.toolbar-title-edit-btn:hover:not\(:disabled\)[\s\S]*--toolbar-btn-hover-bg/,
    );
  });
});

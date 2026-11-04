// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readDesignDirectionFromLocation } from "./applyDesignDirection";

describe("readDesignDirectionFromLocation", () => {
  it("returns empty for unknown query values", () => {
    const previous = window.location.href;
    window.history.replaceState({}, "", "/?designDirection=unknown");
    expect(readDesignDirectionFromLocation()).toBe("");
    window.history.replaceState({}, "", previous);
  });

  it("reads linear raycast compact", () => {
    const previous = window.location.href;
    window.history.replaceState({}, "", "/?designDirection=linear");
    expect(readDesignDirectionFromLocation()).toBe("linear");
    window.history.replaceState({}, "", previous);
  });
});

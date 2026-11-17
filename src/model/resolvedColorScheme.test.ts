import { describe, expect, it } from "vitest";
import type { ResolvedColorScheme } from "./resolvedColorScheme";

describe("resolvedColorScheme", () => {
  it("accepts light and dark", () => {
    const schemes: ResolvedColorScheme[] = ["light", "dark"];
    expect(schemes).toHaveLength(2);
  });
});

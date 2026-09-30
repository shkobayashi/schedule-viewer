import { describe, expect, it } from "vitest";
import { uuidV5 } from "./uuidV5";

describe("uuidV5", () => {
  it("matches the RFC 4122 DNS example", () => {
    expect(uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "python.org")).toBe(
      "886313e1-3b8a-5372-9b90-0c9aee199e5d",
    );
  });
});
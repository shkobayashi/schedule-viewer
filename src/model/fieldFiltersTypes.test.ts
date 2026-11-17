import { describe, expect, it } from "vitest";
import type { FieldFiltersState } from "./fieldFiltersTypes";
import { DEFAULT_FIELD_FILTER_EMPTY } from "./fieldFiltersTypes";

describe("fieldFiltersTypes", () => {
  it("allows an empty field filter record", () => {
    const state: FieldFiltersState = {};
    expect(state).toEqual({});
    expect(DEFAULT_FIELD_FILTER_EMPTY).toBe("any");
  });
});

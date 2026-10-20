import { describe, expect, it } from "vitest";
import { classifyDroppedSchedulePaths } from "./droppedSchedulePaths";

describe("classifyDroppedSchedulePaths", () => {
  it("accepts a single json path", () => {
    expect(classifyDroppedSchedulePaths(["/tmp/a.json"])).toEqual({
      kind: "singleJson",
      path: "/tmp/a.json",
    });
  });

  it("accepts json extension case-insensitively", () => {
    expect(classifyDroppedSchedulePaths(["C:\\data\\A.JSON"])).toEqual({
      kind: "singleJson",
      path: "C:\\data\\A.JSON",
    });
  });

  it("rejects two json files", () => {
    expect(classifyDroppedSchedulePaths(["/a.json", "/b.json"]).kind).toBe(
      "invalidSelection",
    );
  });

  it("rejects a non-json file", () => {
    expect(classifyDroppedSchedulePaths(["/a.txt"]).kind).toBe(
      "invalidSelection",
    );
  });

  it("rejects json with an extra path", () => {
    expect(
      classifyDroppedSchedulePaths(["/a.json", "/folder"]).kind,
    ).toBe("invalidSelection");
  });

  it("rejects a folder path only", () => {
    expect(classifyDroppedSchedulePaths(["/tmp/folder"]).kind).toBe(
      "invalidSelection",
    );
  });
});

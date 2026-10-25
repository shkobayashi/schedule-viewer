import { describe, expect, it } from "vitest";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";
import { validateStatuses } from "./validateStatuses";
import {
  migrateStatusRoleFromV1,
  migrateStatusesV1ToV2,
} from "./statusesMigrate";

describe("migrateStatusRoleFromV1", () => {
  it("maps built-in ids before closed", () => {
    expect(migrateStatusRoleFromV1({ id: "not-started", closed: true })).toBe(
      "not-started",
    );
    expect(migrateStatusRoleFromV1({ id: "in-progress", closed: false })).toBe(
      "started",
    );
    expect(migrateStatusRoleFromV1({ id: "done", closed: false })).toBe("done");
  });

  it("maps other ids from closed", () => {
    expect(migrateStatusRoleFromV1({ id: "review", closed: true })).toBe("done");
    expect(migrateStatusRoleFromV1({ id: "review", closed: false })).toBe(
      "started",
    );
  });
});

describe("migrateStatusesV1ToV2", () => {
  it("migrates schemaVersion 1 documents", () => {
    const v1 = {
      schemaVersion: 1,
      statuses: BUILTIN_STATUS_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        closed: item.id === "done",
        description: item.description,
      })),
    };
    const migrated = migrateStatusesV1ToV2(v1);
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.statuses.map((s) => [s.id, s.role])).toEqual([
      ["not-started", "not-started"],
      ["in-progress", "started"],
      ["done", "done"],
    ]);
  });
});

describe("validateStatuses v1 intake", () => {
  it("accepts v1 and returns v2 roles", () => {
    const result = validateStatuses({
      schemaVersion: 1,
      statuses: [
        {
          id: "dropped",
          name: "中止",
          color: BUILTIN_STATUS_ITEMS[0].color,
          closed: true,
          description: "やめた。",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.schemaVersion).toBe(2);
      expect(result.document.statuses[0].role).toBe("done");
    }
  });

  it("rejects v2 with closed", () => {
    const result = validateStatuses({
      schemaVersion: 2,
      statuses: [
        {
          ...BUILTIN_STATUS_ITEMS[0],
          closed: false,
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});

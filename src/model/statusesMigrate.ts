import type { StatusItem, StatusRole } from "./statusCatalog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** schemaVersion 1 の項目を 2 の `role` に移す。表示名は見ない。 */
export function migrateStatusRoleFromV1(item: {
  id: string;
  closed?: boolean;
}): StatusRole {
  if (item.id === "not-started") return "not-started";
  if (item.id === "in-progress") return "started";
  if (item.id === "done") return "done";
  if (item.closed === true) return "done";
  return "started";
}

function migrateStatusItemV1(raw: Record<string, unknown>): StatusItem | null {
  const id = raw.id;
  const name = raw.name;
  const color = raw.color;
  const description = raw.description;
  const closed = raw.closed;
  if (typeof id !== "string" || typeof name !== "string") return null;
  if (!isRecord(color) || typeof description !== "string") return null;
  if (typeof closed !== "boolean") return null;
  const role = migrateStatusRoleFromV1({ id, closed });
  return {
    id,
    name,
    color: color as StatusItem["color"],
    role,
    description,
  };
}

/** schemaVersion 1 を 2 に移す。形が合わないときは null。 */
export function migrateStatusesV1ToV2(data: unknown): { schemaVersion: 2; statuses: StatusItem[] } | null {
  if (!isRecord(data) || data.schemaVersion !== 1 || !Array.isArray(data.statuses)) {
    return null;
  }
  const statuses: StatusItem[] = [];
  for (const entry of data.statuses) {
    if (!isRecord(entry)) return null;
    const item = migrateStatusItemV1(entry);
    if (!item) return null;
    statuses.push(item);
  }
  if (statuses.length === 0) return null;
  return { schemaVersion: 2, statuses };
}

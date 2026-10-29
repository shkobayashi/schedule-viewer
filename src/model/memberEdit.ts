import { MEMBERS_SCHEMA_VERSION, type Member } from "./memberTypes";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "./validateMembers";

function serializeMember(member: Member): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: member.id,
    name: member.name,
  };
  const description = member.description?.trim();
  if (description) {
    payload.description = description;
  }
  return payload;
}

/** 新しい人。`id` はカタログの中で重複しない `member-N`。 */
export function newMemberItem(items: readonly Member[]): Member {
  const used = new Set(items.map((item) => item.id));
  let n = items.length + 1;
  while (used.has(`member-${n}`)) n += 1;
  return {
    id: `member-${n}`,
    name: "新しいメンバー",
    description: "",
  };
}

export function updateMemberItem(
  items: readonly Member[],
  index: number,
  patch: Partial<Member>,
): Member[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

export function moveMemberItem(
  items: readonly Member[],
  index: number,
  delta: -1 | 1,
): Member[] {
  const to = index + delta;
  if (to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return next;
}

export function removeMemberItem(
  items: readonly Member[],
  index: number,
): Member[] {
  return items.filter((_, i) => i !== index);
}

export function nextMemberCatalogId(
  existingIds: readonly string[],
  base = "custom",
): string {
  const used = new Set(existingIds);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function emptyMembersDocumentJson(): string {
  return membersToJson([]);
}

export function membersToJson(items: readonly Member[]): string {
  const doc = {
    schemaVersion: MEMBERS_SCHEMA_VERSION,
    members: items.map((item) => serializeMember(item)),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function membersForValidation(items: readonly Member[]): Member[] {
  return items.map((member) => {
    const entry: Member = { id: member.id, name: member.name };
    if (member.description !== undefined && member.description.length > 0) {
      entry.description = member.description;
    }
    return entry;
  });
}

export function memberDraftError(items: readonly Member[]): string | null {
  const result = validateMembers({
    schemaVersion: MEMBERS_SCHEMA_VERSION,
    members: membersForValidation(items),
  });
  return result.ok ? null : formatMembersValidationErrors(result.errors);
}

export function sameMemberItems(
  a: readonly Member[],
  b: readonly Member[],
): boolean {
  return membersToJson(a) === membersToJson(b);
}

export function memberDescriptionErrorAt(
  items: readonly Member[],
  index: number,
): string | null {
  const item = items[index];
  if (!item || item.description === undefined) return null;
  if (item.description.length === 0) return null;
  if (item.description.trim().length > 0) return null;
  return "説明は空白にできません";
}

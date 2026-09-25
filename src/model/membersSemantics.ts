import type { MembersDocument } from "./memberTypes";

export type ValidationIssue = {
  path: string;
  message: string;
};

function nonEmptyName(value: string, label: string, path: string): ValidationIssue | null {
  if (value.trim().length === 0) {
    return { path, message: `${label}は空白にできません` };
  }
  return null;
}

export function validateMembersSemantics(doc: MembersDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < doc.members.length; i += 1) {
    const member = doc.members[i];
    const base = `/members/${i}`;
    const idIssue = nonEmptyName(member.id, "メンバー ID", `${base}/id`);
    if (idIssue) issues.push(idIssue);
    const nameIssue = nonEmptyName(member.name, "メンバー名", `${base}/name`);
    if (nameIssue) issues.push(nameIssue);
    if (ids.has(member.id)) {
      issues.push({
        path: `${base}/id`,
        message: "メンバー ID が重複しています",
      });
    }
    ids.add(member.id);
  }
  return issues;
}

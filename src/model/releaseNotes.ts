export type ReleaseNotesCategory = {
  title: string;
  items: ReleaseNotesItem[];
};

export type ReleaseNotesItem = {
  text: string;
  issueNumbers: number[];
};

export type ReleaseNotesForVersion = {
  version: string;
  categories: ReleaseNotesCategory[];
};

const VERSION_HEADING_RE = /^## \[([^\]]+)\]/;

export function normalizeVersionLabel(version: string): string {
  const trimmed = version.trim();
  if (trimmed.startsWith("v") || trimmed.startsWith("V")) {
    return trimmed.slice(1);
  }
  return trimmed;
}

export function extractVersionSectionBody(
  changelog: string,
  version: string,
): string | null {
  const target = normalizeVersionLabel(version);
  const lines = changelog.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const match = VERSION_HEADING_RE.exec(lines[i]);
    if (!match) continue;
    const headingVersion = normalizeVersionLabel(match[1].split(/\s/)[0] ?? "");
    if (headingVersion === target) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return null;
  const body: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    if (VERSION_HEADING_RE.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n").trimEnd();
}

const ISSUE_REF_RE = /#(\d+)/g;

export function collectIssueNumbersFromBulletLine(line: string): number[] {
  const numbers: number[] = [];
  for (const match of line.matchAll(ISSUE_REF_RE)) {
    numbers.push(Number(match[1]));
  }
  return numbers;
}

export type ValidateSectionResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateVersionSectionBullets(sectionBody: string): ValidateSectionResult {
  const lines = sectionBody.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith("- ")) continue;
    const issues = collectIssueNumbersFromBulletLine(line);
    if (issues.length === 0) {
      return {
        ok: false,
        message: `CHANGELOG の項目に Issue 番号がありません: ${line}`,
      };
    }
  }
  return { ok: true };
}

export function linkifyIssueReferencesInLine(
  line: string,
  repo: string,
): string {
  return line.replace(/\(#(\d+)\)/g, (_full, num: string) => {
    return `[#${num}](https://github.com/${repo}/issues/${num})`;
  });
}

export function buildReleaseNotesMarkdownSection(
  sectionBody: string,
  repo: string,
): string {
  const lines = sectionBody.split(/\r?\n/);
  return lines
    .map((line) =>
      line.startsWith("- ") ? linkifyIssueReferencesInLine(line, repo) : line,
    )
    .join("\n")
    .trimEnd();
}

export function buildFullReleaseBody(
  prefix: string,
  changelog: string,
  version: string,
  repo: string,
): string {
  const sectionBody = extractVersionSectionBody(changelog, version);
  if (sectionBody === null) {
    throw new Error(
      `CHANGELOG にバージョン ${normalizeVersionLabel(version)} の節がありません`,
    );
  }
  const validation = validateVersionSectionBullets(sectionBody);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  const linked = buildReleaseNotesMarkdownSection(sectionBody, repo);
  const trimmedPrefix = prefix.trimEnd();
  return `${trimmedPrefix}\n\n## 変更\n\n${linked}\n`;
}

function stripTrailingIssueRefs(text: string): string {
  return text.replace(/\s*(?:\(#\d+\)\s*)+$/u, "").trimEnd();
}

export function parseReleaseNotesForVersion(
  changelog: string,
  version: string,
): ReleaseNotesForVersion | null {
  const sectionBody = extractVersionSectionBody(changelog, version);
  if (sectionBody === null || sectionBody.trim() === "") return null;

  const categories: ReleaseNotesCategory[] = [];
  let current: ReleaseNotesCategory | null = null;

  for (const line of sectionBody.split(/\r?\n/)) {
    if (line.startsWith("### ")) {
      current = { title: line.slice(4).trim(), items: [] };
      categories.push(current);
      continue;
    }
    if (!line.startsWith("- ") || !current) continue;
    const issueNumbers = collectIssueNumbersFromBulletLine(line);
    const text = stripTrailingIssueRefs(line.slice(2).trim());
    if (!text) continue;
    current.items.push({ text, issueNumbers });
  }

  const nonEmpty = categories.filter((category) => category.items.length > 0);
  if (nonEmpty.length === 0) return null;

  return {
    version: normalizeVersionLabel(version),
    categories: nonEmpty,
  };
}

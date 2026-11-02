import type { McpActionEnvelope } from "./mcpOperationGate";
import { membersToJson } from "./memberEdit";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "./validateMembers";
import {
  formatStatusesValidationErrors,
  validateStatuses,
} from "./validateStatuses";
import {
  formatColorsValidationErrors,
  validateColors,
} from "./validateColors";
import { parseFieldExtensionCatalogText } from "./fieldExtensionAppData";
import type { ColorsDocument } from "./colorCatalog";
import type { StatusesDocument } from "./statusCatalog";

export type McpCatalogKind = "members" | "colors" | "statuses" | "fields";

export function catalogContentsFromEnvelope(
  envelope: McpActionEnvelope,
): { ok: true; text: string } | { ok: false; message: string } {
  const raw = envelope.contents;
  if (typeof raw === "string") {
    return { ok: true, text: raw };
  }
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return { ok: true, text: `${JSON.stringify(raw, null, 2)}\n` };
  }
  return { ok: false, message: "contents が要ります。" };
}

function statusesToJson(document: StatusesDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function colorsToJson(document: ColorsDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function validateMcpCatalogContents(
  catalog: McpCatalogKind,
  text: string,
): { ok: true; canonical: string } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "JSON の形式が正しくありません。" };
  }
  if (catalog === "members") {
    const result = validateMembers(parsed);
    if (!result.ok) {
      return { ok: false, message: formatMembersValidationErrors(result.errors) };
    }
    return { ok: true, canonical: membersToJson(result.document.members) };
  }
  if (catalog === "statuses") {
    const result = validateStatuses(parsed);
    if (!result.ok) {
      return { ok: false, message: formatStatusesValidationErrors(result.errors) };
    }
    return { ok: true, canonical: statusesToJson(result.document) };
  }
  if (catalog === "colors") {
    const result = validateColors(parsed);
    if (!result.ok) {
      return { ok: false, message: formatColorsValidationErrors(result.errors) };
    }
    return { ok: true, canonical: colorsToJson(result.document) };
  }
  try {
    const document = parseFieldExtensionCatalogText(text);
    return {
      ok: true,
      canonical: `${JSON.stringify(document, null, 2)}\n`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "拡張項目 JSON が正しくありません。",
    };
  }
}

const FORBIDDEN = /[\\/:*?"<>|]/;
const WINDOWS_RESERVED = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

/** タイトルから安全なファイル名の本体（拡張子なし）を作る。 */
export function sanitizeExportBaseName(title: string): string {
  let out = "";
  for (const ch of title.trim()) {
    if (FORBIDDEN.test(ch)) continue;
    if (ch.charCodeAt(0) < 32) continue;
    out += ch;
  }
  out = out.replace(/[\s.]+$/g, "").replace(/^[\s.]+/g, "");
  if (!out) return "schedule";
  const stem = out.includes(".") ? out.slice(0, out.lastIndexOf(".")) : out;
  if (WINDOWS_RESERVED.has(stem.toUpperCase())) return "schedule";
  return out;
}

export function scheduleJsonFilename(title: string): string {
  const base = sanitizeExportBaseName(title);
  return base.toLowerCase().endsWith(".json") ? base : `${base}.json`;
}

export function scheduleHtmlFilename(title: string): string {
  const base = sanitizeExportBaseName(title);
  return base.toLowerCase().endsWith(".html") ? base : `${base}.html`;
}

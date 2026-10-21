import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * @param {Array<{ version: string; platforms: Record<string, unknown> }>} partials
 * @param {string[]} requiredPlatformKeys
 */
export function mergeLatestManifests(partials, requiredPlatformKeys) {
  if (partials.length < 1) {
    throw new Error("at least one partial manifest is required");
  }
  const version = partials[0].version;
  for (const partial of partials) {
    if (partial.version !== version) {
      throw new Error("version mismatch between partial manifests");
    }
  }

  const platforms = {};
  for (const partial of partials) {
    Object.assign(platforms, partial.platforms);
  }

  for (const key of requiredPlatformKeys) {
    if (!platforms[key]) {
      throw new Error(`missing platform ${key} in merged manifest`);
    }
  }

  return { version, platforms };
}

function parseArgs(argv) {
  const requiredPlatformKeys = [];
  const paths = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--require") {
      const key = argv[++i];
      if (!key) {
        return { error: "missing value after --require" };
      }
      requiredPlatformKeys.push(key);
      continue;
    }
    paths.push(arg);
  }
  const outPath = paths.at(-1);
  const inputs = paths.slice(0, -1);
  if (requiredPlatformKeys.length === 0) {
    return { error: "at least one --require platform key is required" };
  }
  if (inputs.length < 1 || !outPath) {
    return {
      error:
        "usage: node merge-latest-json.mjs --require <platform> ... <partial.json> ... <out.json>",
    };
  }
  return { requiredPlatformKeys, inputs, outPath };
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(1);
  }
  const { requiredPlatformKeys, inputs, outPath } = parsed;
  const partials = inputs.map((path) => JSON.parse(readFileSync(path, "utf8")));
  try {
    const merged = mergeLatestManifests(partials, requiredPlatformKeys);
    writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`);
    console.log(`wrote ${outPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}

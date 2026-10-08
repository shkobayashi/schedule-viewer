import { readFileSync, writeFileSync } from "node:fs";

const inputs = process.argv.slice(2, -1);
const outPath = process.argv.at(-1);

if (inputs.length < 2 || !outPath) {
  console.error(
    "usage: node merge-latest-json.mjs <partial1.json> <partial2.json> ... <out.json>",
  );
  process.exit(1);
}

const partials = inputs.map((path) => JSON.parse(readFileSync(path, "utf8")));
const version = partials[0].version;
for (const partial of partials) {
  if (partial.version !== version) {
    console.error("version mismatch between partial manifests");
    process.exit(1);
  }
}

const platforms = {};
for (const partial of partials) {
  Object.assign(platforms, partial.platforms);
}

const requiredPlatforms = ["linux-x86_64", "windows-x86_64"];
for (const key of requiredPlatforms) {
  if (!platforms[key]) {
    console.error(`missing platform ${key} in merged manifest`);
    process.exit(1);
  }
}

const merged = { version, platforms };
writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`wrote ${outPath}`);

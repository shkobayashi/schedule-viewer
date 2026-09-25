import { buildSync } from "esbuild";
import { copyFileSync } from "node:fs";

buildSync({
  entryPoints: ["scripts/validate-schedule-cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile:
    ".cursor/skills/write-schedule/scripts/validate-schedule.bundle.mjs",
  banner: {
    js: "#!/usr/bin/env node",
  },
});

copyFileSync(
  "docs/schedule.schema.json",
  ".cursor/skills/write-schedule/schedule.schema.json",
);

console.log("Built validate-schedule.bundle.mjs");

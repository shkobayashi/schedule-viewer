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

buildSync({
  entryPoints: ["scripts/validate-calendar-cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile:
    ".cursor/skills/write-calendar/scripts/validate-calendar.bundle.mjs",
  banner: {
    js: "#!/usr/bin/env node",
  },
});

copyFileSync(
  "docs/calendar.schema.json",
  ".cursor/skills/write-calendar/calendar.schema.json",
);

buildSync({
  entryPoints: ["scripts/validate-members-cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile:
    ".cursor/skills/write-members/scripts/validate-members.bundle.mjs",
  banner: {
    js: "#!/usr/bin/env node",
  },
});

copyFileSync(
  "docs/members.schema.json",
  ".cursor/skills/write-members/members.schema.json",
);

buildSync({
  entryPoints: ["scripts/validate-workspace-cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile:
    ".cursor/skills/write-workspace/scripts/validate-workspace.bundle.mjs",
  banner: {
    js: "#!/usr/bin/env node",
  },
});

copyFileSync(
  "docs/workspace.schema.json",
  ".cursor/skills/write-workspace/workspace.schema.json",
);

console.log(
  "Built validate-schedule.bundle.mjs, validate-calendar.bundle.mjs, validate-members.bundle.mjs, and validate-workspace.bundle.mjs",
);

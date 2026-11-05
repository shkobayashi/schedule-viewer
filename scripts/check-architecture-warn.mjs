import { spawnSync } from "node:child_process";

function run(label, command, args) {
  console.log(`\n=== ${label} (warn only) ===`);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.log(`(${label} exited with ${result.status}; CI treats this as a warning)`);
  }
}

run("jscpd duplication", "npx", [
  "jscpd",
  "src",
  "--min-lines",
  "10",
  "--min-tokens",
  "50",
  "--threshold",
  // 重複率の上限（%）。超えてもこのスクリプトは終了コード 0。上げ下げは docs/development.md。
  "6",
  "--silent",
]);

console.log(
  "\nArchitecture warn checks finished (jscpd only; circular imports use npm run check:madge-circular-baseline).",
);

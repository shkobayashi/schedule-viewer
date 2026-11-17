#!/usr/bin/env bash
# Path classification for .github/workflows/ci.yml changes job.
# Reads changed file paths (one per line) from stdin; appends flags to GITHUB_OUTPUT.
set -euo pipefail

frontend=false
rust=false
manual=false
agentdocs=false

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
cat >"$tmp"

while IFS= read -r file || [[ -n "$file" ]]; do
  [[ -z "$file" ]] && continue
  case "$file" in
    AGENTS.md|docs/agents-*|.cursor/rules/*|.cursor/skills/*/SKILL.md|.cursor/skills/*/references/*.md|scripts/check-agent-docs.*)
      agentdocs=true
      ;;
  esac
done <"$tmp"

while IFS= read -r file || [[ -n "$file" ]]; do
  [[ -z "$file" ]] && continue
  case "$file" in
    src-tauri/*|rust-toolchain.toml|read-screen/*|.cursor/skills/schedule-talk/*)
      rust=true
      ;;
    .github/workflows/*)
      frontend=true
      rust=true
      ;;
    docs/user-manual/*|docs/user-manual.md|scripts/build-user-manual-site.mjs|scripts/manual-site/*|.github/workflows/pages.yml)
      manual=true
      ;;
    scripts/check-agent-docs.*)
      ;;
    index.html|src/*|scripts/*|docs/schedule.schema.json|docs/members.schema.json|docs/calendar.schema.json|docs/field-extensions.schema.json|docs/workspace.schema.json|docs/colors.schema.json|examples/*|package.json|package-lock.json|eslint.config.js|vite.config.ts|tsconfig.json|tsconfig.node.json|vitest.config.ts|.cursor/skills/write-schedule/*|.cursor/skills/write-calendar/*|.cursor/skills/write-members/*|.cursor/skills/write-workspace/*|.cursor/skills/write-fields/*|.cursor/skills/write-colors/*|.cursor/skills/how-to/*)
      frontend=true
      ;;
  esac
done <"$tmp"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "frontend=$frontend"
    echo "rust=$rust"
    echo "manual=$manual"
    echo "agentdocs=$agentdocs"
  } >>"$GITHUB_OUTPUT"
else
  echo "frontend=$frontend"
  echo "rust=$rust"
  echo "manual=$manual"
  echo "agentdocs=$agentdocs"
fi

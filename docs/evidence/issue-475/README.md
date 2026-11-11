# Issue #475 — UI evidence (not MCP)

These PNGs show **equivalent UI state** reached via the normal toolbar, sidebar, and filter panel. They do **not** prove `set_view` MCP or `--screen set_view` behavior.

## Files

- `ui-baseline-*-toolbar-chips.png` — before any lineage or hidden-mark filters.
- `ui-baseline-*-chart-context.png` — same viewport (`today` fixed to 2026-05-01 via existing manual-screenshot hooks); milestone band includes **承認** and **未確定の節目** on the Konva band.
- `ui-after-*-toolbar-chips.png` — chips **系統: 設計** and **帯の印: 承認（…）** after UI steps; filter popover and task detail panel are closed before capture.
- `ui-after-*-chart-context.png` — **same timeline header text** as baseline at the same scroll; compare to baseline to see **承認** hidden on the band while **未確定の節目** remains.

Regenerate: `SKIP_VITE_START=1 node scripts/capture-issue-475-set-view-ui-evidence.mjs` (Vite on port 5175, `manual-screenshot` mode).

## Scope note (#475)

This evidence supports human UI steps equivalent to **`set_view.lineage`**, **`set_view.hiddenMilestoneIds`**, and the in-scope slice in the PR. It does not prove MCP/CLI `set_view`.

**In scope for MCP/CLI (owner):** human operations must be reachable via MCP/CLI — including lineage, hidden band marks, and Excel column maps on `file_action` export.

**Out of scope (owner):** reverse parity — JSON paste UI for `set_view`, or machine-only replay of filter/export dialogs. Owner-rejected reverse-parity items (`replace_schedule` dedicated UI, explain_* human menus, read-dialog mirrors, file-drop column replay) are **not** listed here as follow-up work from this slice.

**Still open on Issue #475 (human → machine, not reverse parity):** e.g. chart-drag-equivalent MCP UX within the existing committed-date operation boundary (not `edit_plan`), and any filter-panel entries without MCP/CLI write yet — see the issue for the current list.

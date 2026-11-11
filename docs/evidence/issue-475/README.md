# Issue #475 — UI evidence (not MCP)

These PNGs show **equivalent UI state** reached via the normal toolbar, sidebar, and filter panel. They do **not** prove `set_view` MCP or `--screen set_view` behavior.

## Files

- `ui-baseline-*-toolbar-chips.png` — before any lineage or hidden-mark filters.
- `ui-baseline-*-chart-context.png` — same viewport (`today` fixed to 2026-05-01 via existing manual-screenshot hooks); milestone band includes **承認** and **未確定の節目** on the Konva band.
- `ui-after-*-toolbar-chips.png` — chips **系統: 設計** and **帯の印: 承認（…）** after UI steps; filter popover and task detail panel are closed before capture.
- `ui-after-*-chart-context.png` — **same timeline header text** as baseline at the same scroll; compare to baseline to see **承認** hidden on the band while **未確定の節目** remains.

Regenerate: `SKIP_VITE_START=1 node scripts/capture-issue-475-set-view-ui-evidence.mjs` (Vite on port 5175, `manual-screenshot` mode).

## Scope note (#475)

Human view operations for **系統** (`set_view.lineage`) and **帯の印の非表示** (`set_view.hiddenMilestoneIds`), plus Excel export column maps on `file_action` export, are in scope for MCP/CLI.

**Out of scope (owner decision):** reverse parity — dedicated human UI for pasting `set_view` JSON, or machine-only replay of filter/export dialogs. Other #475 candidates (drag-equivalent MCP, full filter-panel symmetry, `replace_schedule` UI, explain_* menus, read-dialog mirrors, file-drop export columns) remain separate unless already documented elsewhere.

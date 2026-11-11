# Issue #551 evidence notes

## Increment 2 — filter panel crops (limitation)

`increment2-*-filter-panel.png` crops the open filter popover only. Left-side field labels and right-side select chevrons can be slightly clipped at the crop edge, and the popover’s outer `elevation-menu` shadow is not fully visible. These crops do **not** prove full-window placement or shadow extent; they only show interior spacing and control layout.

## Increment 3 — detail / bulk panels

**Primary crops** (`increment3-*-{task,bulk}-detail.png`) use a 24px margin clip from the **top** of the detail aside (`shotPanelMargin` caps height at the viewport). Tall panels scroll internally (~751px panel in a 900px window). These top crops show name/notes/dates/status and bulk upper fields; they **do not** show TODO text inputs or bulk **Apply** — bulk crops may stop around 対応マイルストン / 先行タスク. A `bulkApply` height metric only shows the footer button exists in the DOM, not that it appears in the crop.

**Supplemental crops** (`increment3-*-task-detail-todo.png`, `increment3-*-bulk-detail-apply.png`) scroll the panel and clip around the TODO field or enabled Apply control (status set to 完了 for bulk) to prove lower fields stay reachable after the `ui-field` height increase. Check `visibility` objects in `increment3-after-metrics.json` for `panelScrollTop`, `fullyInPanel`, and `fullyInViewport`.

Captured at `--s = 1.15` (1440×900, auto scale). Single-line controls gain about **+5px** height after `ui-field` (e.g. `#detailName` 30.78px → 35.78px; status ~+4px). Multi-line note height unchanged in samples. Panel height ~751px light unchanged.

**Intended dark change:** input surface `rgb(35, 36, 44)` (#23242c) vs panel `rgb(26, 27, 34)` (#1a1b22).

Side-by-side (top crop only): `increment3-compare-light-task-detail.png`, `increment3-compare-dark-task-detail.png`.

# Issue #551 evidence notes

## Increment 2 — filter panel crops (limitation)

`increment2-*-filter-panel.png` crops the open filter popover only. Left-side field labels and right-side select chevrons can be slightly clipped at the crop edge, and the popover’s outer `elevation-menu` shadow is not fully visible. These crops do **not** prove full-window placement or shadow extent; they only show interior spacing and control layout.

## Increment 3 — detail / bulk panels

Screenshots use a 24px margin clip around the detail aside so panel boundary, side shadow, and footer actions stay in frame.

Captured at `--s = 1.15` (1440×900, auto scale). Single-line controls gain about **+5px** height after `ui-field` (e.g. `#detailName` 30.78px → 35.78px; `line-height` 20.01px on several fields). Multi-line note height unchanged in samples. Panel height ~751px light unchanged.

**Intended dark change:** input surface `rgb(35, 36, 44)` (#23242c) vs panel `rgb(26, 27, 34)` (#1a1b22). Bulk apply button remains visible in margin crops.

Side-by-side: `increment3-compare-light-task-detail.png`, `increment3-compare-dark-task-detail.png`.

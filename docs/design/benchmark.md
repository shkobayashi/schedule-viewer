# 見た目のベンチマーク（Issue #449）

2026-11 時点の **正式 UI** は、フェーズ 2 で選んだ **Raycast（B）** をライト・ダーク両方の既定とする。チャート上の意味色（ステータスバー、パターン色、印、全案一致 `#ca8a04`、マイルストン菱形、説明オーバーレイの意味色など）は `palette.chart` と説明用定数のまま触らない。

## トークンの正本

| 種類 | 正本 | 適用 |
| --- | --- | --- |
| UI 色（背景・文字・アクセント・行選択など） | `src/model/palette.ts` の `css`（Raycast B ライト／ダーク） | `applyCssPalette` → `:root` の CSS 変数 |
| 半径・余白・タイポ・影・モーション・ツールバー／カードのクロム | `src/design/uiTokens.ts` | 同上（`applyCssPalette` 内） |
| 意味色・Konva・書き出し SVG | `palette.chart` | TypeScript から直接参照 |

`App.css` の `:root` に色の初期値は置かない（二重定義を解消）。起動時に `applyResolvedColorScheme` が変数を書き込む。

## シェルと部品

- **アプリシェル** — `src/design/appChrome.css`（浮きツールバー、カード型一覧／タイムライン、選択・ホバー、設定ダイアログ）
- **共有プリミティブ** — `src/components/ui/primitives.css` と `UiButton`（新規ダイアログ向け）。既存ツールバーは `.toolbar-btn` 等をトークン参照に寄せ済み

## フェーズ 2 の比較資料（履歴）

方向 A/B/C のプレビューと `?designDirection=` は **フェーズ 3 で削除**した。比較 PNG は [screenshots/](screenshots/) に残す（`design-*` / `compare-*`）。当時の説明は git 履歴の `benchmark.md` を参照。

## フェーズ 3 の before / after

ベースラインは **`feature-436`（本 PR 前）**、after は **Raycast 標準（本ブランチ）**。inventory 全画面をライト・ダークで撮影する。

| 比較（左: feature-436 / 右: 標準） | ファイル |
| --- | --- |
| メイン・ライト | [compare-phase3-main-light.png](screenshots/compare-phase3-main-light.png) |
| メイン・ダーク | [compare-phase3-main-dark.png](screenshots/compare-phase3-main-dark.png) |
| 設定・ライト | [compare-phase3-settings-light.png](screenshots/compare-phase3-settings-light.png) |
| 設定・ダーク | [compare-phase3-settings-dark.png](screenshots/compare-phase3-settings-dark.png) |
| 説明オーバーレイ・ライト | [compare-phase3-explain-overlay-light.png](screenshots/compare-phase3-explain-overlay-light.png) |
| 説明オーバーレイ・ダーク | [compare-phase3-explain-overlay-dark.png](screenshots/compare-phase3-explain-overlay-dark.png) |

再生成:

```bash
npm run capture:phase3-full
```

（`feature-436` を `/tmp/sv-f436-baseline` に worktree チェックアウトし **ポート 5175** で旧 UI を配信。本ブランチは **5174**。撮影前に `verifyServedChrome` で before に Raycast CSS が混ざっていないことを確認する。）

従来の分割:

```bash
npm run capture:phase3-before   # 5175 · origin/feature-436
npm run capture:phase3-evidence # 5174 · 本ブランチ + compare 合成
```

## Issue #551（スペーシングと試し行トークン）— 完了

| 増分 | 内容 | 証跡 |
| --- | --- | --- |
| 1 | コマンドパレット入力・候補行の `var(--space-sm)` / `var(--space-md)` | `docs/design/screenshots/issue-551/increment1-*` |
| 2 | フィルタパネル・差分ストリップの gap／半径（チップ `radius-pill`） | `increment2-*`（パネル crop はラベル欠けの可能性あり — [EVIDENCE-NOTES](screenshots/issue-551/EVIDENCE-NOTES.md)） |
| 3 | 詳細／一括の `.ui-field`、日付の任意クラス。単行 +5px 前後の意図的高さ変化 | `increment3-*`（上部 crop と `*-todo` / `*-apply` 補助） |
| 4 | `uiTokens.ts` の試し行 Konva ダッシュ `[6,4]`・枠幅 `2`（`--border-width-focus` と一致）。`connectionArcHalo` は `palette.chart` のみ | `increment4-*-explain-overlay.png` |

**意図的に残しているリテラル（後続 Issue に回さない）**

- `ExportFormatDialog` 等の **未スケール** `gap: 8px` など — 既存のスケール済み `--space-*` と数値が一致せず、無理な置換を避ける。
- コマンドパレット枠 `padding: calc(20px * var(--s))`、オーバーレイ **72px**、空一覧 **12px**。
- `.filter-bar` の **6px** / `4px 12px`、チップ `2px 8px`、フィルタパネル内 **6px** 行間、差分 `calc(12px * var(--s))` — **差分ストリップへ影トークンは足さない**。
- `.detail-panel` の左向き影 `-6px 0 24px var(--menu-shadow)`。

**手動マニュアル図** — PR #488 で 19 図は既に Raycast 標準に合わせて撮り直し済み。本 Issue では `phase3-*` および `capture:manual-screenshots` の PNG を上書きしない。

## あとで整える余地（フェーズ 3 以外）

- ガイドダイアログなど、コマンドパレット・エクスポート以外のダイアログ内フォームの半径／余白直書き

## implement-change からの参照

画面 UI トーンを変える計画では、本書と [inventory.md](inventory.md) を読み、意味色保護節を守る。

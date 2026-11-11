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

## あとで整える余地（フェーズ 3 では未着手）

- ダイアログ内の個別フォーム（エクスポート、ガイド、コマンドパレット）の `border-radius` / `padding` 直書き。コマンドパレットは Issue #551 増分 1 で、入力・候補行の余白と gap だけ `var(--space-sm)` / `var(--space-md)` へ寄せた（フレーム `padding: calc(20px * var(--s))`、オーバーレイ 72px、空一覧 12px はトークン一致が無いため据え置き）。`ExportFormatDialog` の未スケール `gap: 8px` 等は同 Issue の別増分
- フィルタパネル・差分ストリップの影と gap の統一（増分 2 済み: スケール済み 4/8/10/14px と `border-radius: 8px`・チップ `999px` をトークン化。`.filter-bar` の未スケール `6px` / `4px 12px`、チップ `2px 8px`、パネル `calc(12px * var(--s))`、`6px` 行間、差分の `calc(12px * var(--s))`、`.detail-panel` の `-6px 0 24px` は据え置き）
- 詳細パネル内フィールドの `.ui-field` 移行（増分 3 済み: `TaskDetailPanel` / `BulkTaskDetailPanel` のテキスト・テキストエリア・select・日付・タグ・TODO 入力と、`DateInput` の任意 `inputClassName`。レンジ・チェックボックス・色・担当・適用ボタンは除外。`DateInput` 単体利用は従来クラスのまま）
- Konva 試し行の点線・ハロ色（意味色は維持しつつ UI トークンとの整理）
- 操作マニュアル 19 図（`capture:manual-screenshots`）の撮り直し

## implement-change からの参照

画面 UI トーンを変える計画では、本書と [inventory.md](inventory.md) を読み、意味色保護節を守る。

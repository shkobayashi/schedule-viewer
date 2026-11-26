# 見た目の洗い出し（Issue #449 フェーズ 1）

撮影条件は次のとおりである。Vite の `manual-screenshot` モード、ビューポート 1440×900、配色はライト固定、サンプルデータは `examples/playground.schedule.json` である。再撮影は `npm run capture:design-screenshots` である。

## スクリーンショット一覧

| ファイル | 画面 |
| --- | --- |
| [inventory-main.png](screenshots/inventory-main.png) | メイン（左一覧＋タイムライン＋マイルストンバンド） |
| [inventory-milestone-band.png](screenshots/inventory-milestone-band.png) | マイルストンバンド（切り出し） |
| [inventory-filter-panel.png](screenshots/inventory-filter-panel.png) | 絞り込みパネル |
| [inventory-settings.png](screenshots/inventory-settings.png) | 設定ダイアログ（表示） |
| [inventory-diff-panel.png](screenshots/inventory-diff-panel.png) | 差分パネル |
| [inventory-explain-overlay.png](screenshots/inventory-explain-overlay.png) | 説明オーバーレイ（半透明・印・試し変更の見本） |
| [inventory-context-menu.png](screenshots/inventory-context-menu.png) | 行のコンテキストメニュー |
| [inventory-task-detail.png](screenshots/inventory-task-detail.png) | タスク詳細パネル |

## 主なばらつき（優先度順）

### 色とトークン

- **二重の正本** — 起動時の UI 色は `src/model/palette.ts` の `applyCssPalette` が `:root` に書き込む。`App.css` の `:root` 初期値（例: `--accent-soft: #eef0fe`）はライト палитра（`#dce3fb`）と一致しない。どちらが効くかは読み込み順に依存する。
- **直書き HEX** — チャート描画は `palette.chart` が正本だが、コンポーネントに `#f8fafc`（試しの弧のハロ）や `#000`（Konva ベール）などが残る。意味色と UI 色の境界がファイルをまたぐ。
- **意味色は保護対象** — ステータスバー、期限超過、未割当、メンバー不明、マイルストーン、説明の印・パターン色、全案一致の `#ca8a04` は読み取り専用の基準として扱う（[benchmark.md](benchmark.md)）。

### 角の丸み

- トークン `--radius-sm|md|lg`（4 / 6 / 8px）を使う箇所が多い一方、`border-radius: 8px`、`6px`、`3px`、`12px`、`999px` が `App.css` に混在する（計 15 種類以上の指定パターン）。

### 文字

- 多くは `calc(Npx * var(--s))` だが、`11px` / `12px` / `13px` の固定指定が残る。`var(--s, 1)` と `--s` だけの混在もある。
- 見出し 18px、本文 12–13px、ラベル 10–11px が画面ごとに独立しており、共通の type scale 文書が無い。

### 余白・密度

- ダイアログや設定は `calc(16px * var(--s))` 系、ツールバーは別系統。行高 26 / 32 は `--s` と連動するが、パネル間 `gap` は 6 / 8 / 10 / 12 / 16px が並列する。

### 境界・影

- ボーダーは `1px solid var(--border)` が主流だが、選択行・アウトラインは `2px` や Konva 側の stroke が混在する。
- `box-shadow` は `--elevation-menu` / `--elevation-modal` を使う箇所と、直書き shadow が共存する（約 26 箇所）。

### ホバー・フォーカス

- 行ホバーは `--hover-row`、ボタンは個別クラス。フォーカスリングの色・太さはコンポーネントごとに差がある。
- メニュー項目の hover は背景だけ変わり、Raycast / Linear のような短い transition は統一されていない。

### アイコン

- Lucide をそのままサイズ指定で配置。線幅・色は `--text-secondary` と `--text` が混在する。

## 次フェーズ（本 Issue の 3 以降）への入力

- UI クロムは [benchmark.md](benchmark.md) のトークン（`palette.ts` + `uiTokens.ts` + `appChrome.css`）に統一済み（Issue #449 フェーズ 3）。意味色は `palette.chart` のまま。

# 見た目のベンチマーク（Issue #449 フェーズ 2）

Linear と Raycast を参照に、**UI の地・枠・文字・余白**だけを揃える原則である。チャート上の意味色（ステータスバー、パターン色、印の色など）は Konva の `palette.chart` のまま触らない。

## 意味色の保護

- `palette.chart` のステータス・期限超過・未割当・不明・バーラベル
- 説明オーバーレイの印・試しバー・全案一致 `#ca8a04`
- 行色 `colorId`、ステータスカタログの色

## プレビューの切り替え

開発ビルドまたは `manual-screenshot` モードで URL に `?designDirection=linear|raycast|compact` を付ける。実装は `src/design/applyDesignDirection.ts`（CSS 変数）と `src/design/designDirections.css`（レイアウト・部品の見え方）、`designLayoutTweaks`（行高の実寸変更）である。

## 方向ごとに何が違うか（平易な一覧）

スクリーンショットは **選択行（要件定義書作成）＋別行ホバー（要件レビュー）** を含む。並べ替え画像は [screenshots/](screenshots/) の `compare-*` を見る。

### 現状（ベースライン）

- ツールバーに枠線付きボタン、白地のバー。
- 左一覧の行間は標準（`scaledLayoutSizes` そのまま）。
- 行の区切りは薄いグラデーション線（`sidebar-row::after`）。
- 選択行は薄い青系の背景（`--selected-row`）。
- タイムライン上は従来どおりのヘッダ高さとマイルストンバンド。

### A — `designDirection=linear`（Linear 寄り）

- ツールバーの下だけ 2px の線があり、ボタンの枠線は無し（フラット）。主要ボタンだけ塗り。
- 左一覧の行区切り線を非表示。グループ見出しは小さく **大文字**。
- **行の高さを約 14% 増やす**（タイムラインと同期）。日付ヘッダも高くする。
- 選択行は **左に 3px のアクセント線**＋薄い背景。ホバーは淡いグレー背景。
- フォントは Inter 系。設定ダイアログは細い枠・弱い影。

### B — `designDirection=raycast`（Raycast 寄り）

- ツールバー全体が **黒い浮きカード**（角丸・影）。ボタンは **丸 pill**、副次ボタンの **文字ラベルを非表示**（アイコン中心）。
- メイン領域はグレー地の上に、左一覧とチャートが **白い角丸カード** として分離。
- 選択行は **アクセント色で行全体を塗り**、文字は白。ホバーは薄いピンク＋枠。
- 奇数行にごく薄い縦ストライプ。行区切り線なし。
- 設定ダイアログは大きな角丸と強い影。

#### B のダークモード（`schedule-viewer/color-scheme` = `dark`）

ライトの「黒カード／白カード」は、ダークでは **canvas（`--bg`）の上に surface カード** として読み替える。チャート意味色は従来どおり。

- ツールバーは `#2a2b33`＋明るい縁と影で、背景に溶けない浮きカードにする。
- 左一覧・タイムラインは `--surface` の角丸カード（枠＋影）。
- 選択行は **全面アクセント塗りではなく**、薄いアクセント混色＋**左 3px アクセント線**（ダークでうるさくならないよう調整）。
- ホバーは半透明の白背景＋薄いアクセント枠。

個別 PNG: `design-baseline-dark-*` / `design-B-raycast-dark-*`（`-main`、`-settings-dialog`、`-crop-toolbar`、`-crop-sidebar`）。

| 内容 | ファイル |
| --- | --- |
| メイン（現状ダーク｜B ダーク） | [compare-main-baseline-B-dark.png](screenshots/compare-main-baseline-B-dark.png) |
| ツールバー拡大 | [compare-crop-toolbar-baseline-B-dark.png](screenshots/compare-crop-toolbar-baseline-B-dark.png) |
| 左一覧拡大 | [compare-crop-sidebar-baseline-B-dark.png](screenshots/compare-crop-sidebar-baseline-B-dark.png) |

再生成（ダークだけ）: `npm run capture:design-screenshots -- --capture-dark-only`

### C — `designDirection=compact`（高密度）

- **行の高さを約 30% 減らす**（約 7px 低い一行相当）。ツールバー・一覧ヘッダ・日付ヘッダも低い。
- ツールバーは 2px 下線＋コンパクトな小ボタン（11px 級）。
- 左一覧は **行ごとに実線**、カテゴリ／グループ行は **帯状の背景**。偶数タスク行は薄い縦縞。
- 選択行は **2px のアクセント枠**（塗りは薄青）。ホバーは **黄色系** のハイライト。
- 設定ダイアログは角丸ほぼ無し・2px 枠・影なし。IBM Plex Sans 系。

## 比較用の並べ画像（まずここを見る）

| 内容 | ファイル |
| --- | --- |
| メイン全体（現状｜A｜B｜C） | [compare-main-baseline-A-B-C.png](screenshots/compare-main-baseline-A-B-C.png) |
| 設定ダイアログ（現状｜A｜B｜C） | [compare-settings-baseline-A-B-C.png](screenshots/compare-settings-baseline-A-B-C.png) |
| ツールバー拡大（現状｜A｜B｜C） | [compare-crop-toolbar-baseline-A-B-C.png](screenshots/compare-crop-toolbar-baseline-A-B-C.png) |
| 左一覧拡大（現状｜A｜B｜C） | [compare-crop-sidebar-baseline-A-B-C.png](screenshots/compare-crop-sidebar-baseline-A-B-C.png) |

個別 PNG は `design-baseline-*` / `design-A-linear-*` / `design-B-raycast-*` / `design-C-compact-*`（`-main`、`-settings-dialog`、`-crop-toolbar`、`-crop-sidebar`）。

再生成: `npm run capture:design-screenshots`

## 利用者への比較の仕方

1. 上の **4 枚の compare-* 画像** を開き、ラベル付きの並びで差を見る。
2. バーの色は同じデータなので、**ツールバー・左一覧・行の高さ・選択／ホバー** だけに注目する。
3. 短い印象を返してもらい、次フェーズで 1 方向に絞る。

## implement-change からの参照

画面の UI トーンを変える計画では、本書と [inventory.md](inventory.md) を読み、意味色保護節を守る。

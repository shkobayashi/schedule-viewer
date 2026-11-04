# 見た目のベンチマーク（Issue #449 フェーズ 2）

Linear と Raycast を参照に、**UI の地・枠・文字・余白**だけを揃える原則である。チャート上の意味色は別枠で保護する。

## 参照プロダクトから取ること

| 原則 | Linear 寄り | Raycast 寄り | 本アプリでの置き方 |
| --- | --- | --- | --- |
| 地 | クールグレー `#fcfcfc` 前後、パネルは一段暗い | 白に近い地＋強いパネルコントラスト | `--bg` / `--panel` / `--surface` |
| アクセント | 1 色（インディゴ `#5E6AD2` 系） | 1 色（コーラル `#FF6363` 系） | `--accent` / `--accent-soft` のみ。ステータス色はアクcent にしない |
| 線 | 1px、`#E4E4E7` 前後 | ややコントラストの高い `#D1D5DB` | `--border` / `--row-border` |
| 角 | 小さめ 4–8px | やや大きめ 6–12px | `--radius-sm|md|lg` |
| 余白 | 8 の倍数中心 | コンパクトだがタップ可能 | `--s` と spacing scale（今後トークン化） |
| 文字 | 13px 前後本文、600 見出し | やや太めラベル | type scale（今後トークン化） |
| ホバー | 120ms 前後、背景のみ | 同左＋やや強い shadow | transition を共通部品化（フェーズ 3） |
| 密度 | 中 | 高 | 方向 C で `--s` を 0.92 に試す |

## 取らないこと

- Linear / Raycast の**ブランド色をステータスやバーに流用**すること。
- イラスト調・ガラスモーフィズムの多用（チャートの読み取りを弱める）。
- アイコンセットの全面差し替え（試して決める点として [inventory.md](inventory.md) に記載）。

## 意味色の保護（触らない／薄くしすぎない）

次は **トークン化の対象外** とし、変更時もコントラストを維持する。

- `palette.chart` のステータス・期限超過・未割当・不明・グリッド・バーラベル
- 説明オーバーレイの `--explanation-mark-*-ring`、半透明ベール、印の `color` 引数
- 説明パターン色、試しバー、全案一致 `#ca8a04`（`EXPLANATION_TRIAL_UNANIMOUS_COLOR`）
- 行色 `colorId`、ステータスカタログの色

Issue #420 の「色で指す」手順は、**保護色の id / 見た目が変わらない**ことを前提とする。

## 試す方向（プレビューのみ）

開発ビルドと `manual-screenshot` モードで、クエリ `designDirection` を付ける。

| 値 | 意図 |
| --- | --- |
| （無し） | 現状ベースライン |
| `linear` | **A** — Linear 寄り：クールグレー、インディゴアクセント、小半径 |
| `raycast` | **B** — Raycast 寄り：コーラルアクセント、大半径、やや強い shadow |
| `compact` | **C** — 中間・高密度：青系アクセント、小半径、`--s` 0.92 |

実装は `src/design/applyDesignDirection.ts` が **palette 適用後に UI 用 CSS 変数だけ上書き**する。`src/design/designDirections.css` はホバー transition などの試しである。本番のコンポーネント一括置換はフェーズ 3 以降である。

例: `http://localhost:5173/?designDirection=linear`

## 比較スクリーンショット

同一データ・1440×900・ライト。ファイルは [screenshots/](screenshots/) に置く。

### ベースライン（現状）

| | メイン | 設定ダイアログ |
| --- | --- | --- |
| 現状 | [design-baseline-main.png](screenshots/design-baseline-main.png) | [design-baseline-settings-dialog.png](screenshots/design-baseline-settings-dialog.png) |

### 方向 A（Linear 寄り）

| | メイン | 設定ダイアログ |
| --- | --- | --- |
| A | [design-A-linear-main.png](screenshots/design-A-linear-main.png) | [design-A-linear-settings-dialog.png](screenshots/design-A-linear-settings-dialog.png) |

### 方向 B（Raycast 寄り）

| | メイン | 設定ダイアログ |
| --- | --- | --- |
| B | [design-B-raycast-main.png](screenshots/design-B-raycast-main.png) | [design-B-raycast-settings-dialog.png](screenshots/design-B-raycast-settings-dialog.png) |

### 方向 C（中間・高密度）

| | メイン | 設定ダイアログ |
| --- | --- | --- |
| C | [design-C-compact-main.png](screenshots/design-C-compact-main.png) | [design-C-compact-settings-dialog.png](screenshots/design-C-compact-settings-dialog.png) |

## 利用者への比較の仕方

1. 上表の **メイン** を横に並べ、地・アクセント・一覧の密度だけを見る（バーの色は意図的に同じ）。
2. **設定ダイアログ** で角・影・余白の差を見る。
3. 短い印象（「A が落ち着く」「B がはっきり」など）を返してもらい、次フェーズで 1 方向に絞る。

再生成: `npm run capture:design-screenshots`

## implement-change からの参照

画面の UI トーンを変える計画では、本書と [inventory.md](inventory.md) を読み、意味色保護節を守る。トークン化・共通部品化は本 Issue の後続ステップである。

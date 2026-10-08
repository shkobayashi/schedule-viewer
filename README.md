# schedule-viewer

LLM が生成した WBS / ガントスケジュール（JSON）を表示・フィルタ・編集・ズームするための、クロスプラットフォーム（Mac / Windows / Ubuntu）デスクトップアプリ。

## 背景・目的

- 会議ログや課題管理表などの入力情報をもとに、Claude（会話 / スキル）がスケジュールを JSON として生成する
- 本アプリはその JSON を読み込み、WBS / ガントチャートとして**表示・フィルタリング・編集・ズームイン・アウト**する専用ツール
- スケジューリングの制約計算や前後関係の自動再計算などは持たせず、LLM / スキル側に寄せる方針（アプリ自体はビューア兼エディタに徹する）

## 主な機能

- カテゴリ、グループ、タスクの3段と、日付ヘッダー下のマイルストン帯（JSON のグループごとに行を分ける）
- 縦スクロールで、展開中のカテゴリとグループを上端に残す
- 担当者、ステータス、確度、期限、前後関係、マイルストン、タグ、タスク名、ノートでの絞り込み、マイルストン帯の線の表示切替（絞り込みパネルと左のグループ行の右クリック）と、選んだタスクの系統表示
- バーの移動と期間変更（本体ドラッグ、端ドラッグ、ドラッグ中は開始日と終了日）、一覧のクリック選択と矢印キー、右の詳細パネル、カテゴリとグループの名前変更、タスクとマイルストンの追加と削除、マイルストンの編集と追加で帯のグループを選ぶ（グループが2件以上のとき）、タスクの複製、タスクの並べ替えと別グループへの移動（左の行の左端の握りをドラッグ）、グループの並べ替えと別カテゴリへの移動（左のグループ行の左端の握りをドラッグ）、カテゴリの並べ替え（左のカテゴリ行の左端の握りをドラッグ）、カテゴリとグループの右クリックからの追加と削除、取り消しとやり直し
- 保存、開く、検索、編集、削除、線を引く（⌘/Ctrl+L）、ノート（⌘/Ctrl+N）、表示サイズ（⌘/Ctrl++ と ⌘/Ctrl+-）のキーボードショートカット、⌘/Ctrl+K のコマンドパレット、⌘/Ctrl+矢印でのチャートのスクロール、タスクとマイルストンの右クリックメニュー。日付ヘッダー、マイルストン帯の空き、チャートの空きの右クリックからマイルストンを追加
- デスクトップ版では、同じスケジュールを別ウィンドウでも開ける（⌘/Ctrl+Shift+O）。メンバー、カレンダー、表示設定は開いているウィンドウで共通
- チャート上で、選んだタスクからクリックで後続の線を足し、線の上で 1 本だけ外す
- 期限超過、マイルストン超過、前後関係の破綻、未確定の斜線（タスクバーとマイルストン）、今日の進み方を示すイナズマ線、非稼働日の表示
- 見えている行の HTML または SVG への書き出し
- 画面と開いている JSON の差分を表示・コピーし、変更だけを渡せる（状態バーの未保存、⌘/Ctrl+Shift+D、コマンドパレット）
- 左のタスク一覧の幅を、チャートとの境界をドラッグして変えられる
- 設定画面での、メンバー一覧と稼働日カレンダーの取り込み、表示サイズと配色（ライト・ダーク）の変更
- 開いている JSON がほかのプログラムに書き換えられたときの反映と、前回開いたファイルと未保存の編集の次回起動時の復元

操作の手順は [操作マニュアル](docs/user-manual.md)、挙動の定義は [外部仕様](docs/external-spec.md) を参照。

## 技術スタック

- **Tauri** — デスクトップシェル（Mac / Windows / Ubuntu 対応）
- **React + react-konva** — Canvas 描画によるタイムライン表示。CSS / DOM のレイアウトに頼らないため、ズーム時のレイアウト崩れが起きない
- **Rust（Tauri 側）** — ファイル I/O やネイティブダイアログなど薄い橋渡しのみ。計算ロジックは持たない
- LLM 連携はアプリに内蔵しない（スケジュール生成は Claude 側で完結させる）

詳しい経緯・検討した代替案・ロードマップは [`docs/PLANNING.md`](docs/PLANNING.md) を参照。

## ライセンス

本リポジトリのソースは [MIT](LICENSE) である。依存ライブラリは各パッケージのライセンスに従う。

## インストール

メンバー向けの配布物は [GitHub Releases](https://github.com/shkobayashi/schedule-viewer/releases) から取得する。Release には配布物の SHA-256（`SHA256SUMS`）が付く。

- **Ubuntu 22.04 以降 (amd64)**: `schedule-viewer_X.Y.Z_amd64.deb` をダウンロードし、`sudo apt install ./schedule-viewer_X.Y.Z_amd64.deb`
- **Windows (x64)**: `schedule-viewer_X.Y.Z_x64-setup.exe` を実行する。インストーラは自己署名である。同じ Release の `schedule-viewer-codesign.cer` を入れた PC では発行元が `schedule-viewer` と表示される。入れていない PC では SmartScreen の確認が出ることがある（[開発ガイド](docs/development.md#release-後に証明書を入れる)）

macOS 用の自動ビルドはまだない。必要なときは、[開発ガイドの配布用ビルド](docs/development.md#配布用ビルド) の手順で、使う Mac の上でビルドする。

## 使い始める

起動直後はサンプルのスケジュールが表示される。☰ メニューの「開く」で、検証済みのスケジュール JSON を読み込む。JSON は、`write-schedule` スキルを LLM 用に置き、LLM に作らせる。デスクトップ版では設定の「JSON作成スキルを置く」から置ける。設定の「メンバー」でメンバー JSON を取り込むと、担当者 ID が名前で表示される。メンバー JSON は `write-members` スキルで作る。

ファイルの開き方、絞り込み、編集、書き出しは [操作マニュアル](docs/user-manual.md) にまとめてある。

## ドキュメント

リポジトリを調べるエージェントは、ソースより先にこれらの文書を読み、変更したときは対応する文書も同じ変更で更新する。詳細は [AGENTS.md](AGENTS.md)。

| 文書 | 内容 |
| --- | --- |
| [操作マニュアル](docs/user-manual.md) | 利用者向けの手順 |
| [外部仕様](docs/external-spec.md) | 画面と機能の挙動。機能 ID の正本 |
| [データ仕様](docs/data-format.md) | スケジュール、メンバー、カレンダーの JSON とアプリデータ |
| [内部仕様](docs/internal-spec.md) | 構成、状態、Tauri コマンド、描画 |
| [テスト仕様](docs/test-spec.md) | 自動テストと手動テスト |
| [開発ガイド](docs/development.md) | 環境構築、起動、CI、リリース、配布用ビルド |
| [計画メモ](docs/PLANNING.md) | 目的、決定事項、経緯、ロードマップ |
| [変更履歴](CHANGELOG.md) | リリースごとの変更 |

JSON スキーマの正本は [`docs/schedule.schema.json`](docs/schedule.schema.json)、[`docs/members.schema.json`](docs/members.schema.json)、[`docs/calendar.schema.json`](docs/calendar.schema.json) である。

## 開発を始める

手順の全体は [開発ガイド](docs/development.md) にある。リポジトリ直下では次で起動できる。

```bash
npm install
npm run dev
npm run tauri dev
```

`npm run dev` は、ブラウザでフロントだけを動かすブラウザ版をポート 5173 で開く。`npm run tauri dev` はデスクトップ版のウィンドウをポート 1420 で開く。ポートが分かれているので、両方を同時に起動できる。`npm run tauri dev` は DevContainer の中ではなく、画面を表示できるホスト OS で実行する。

## リポジトリ構成

```
.
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── src/                                # React (UI) とモデル
├── src-tauri/                          # Tauri / Rust（薄い橋渡しのみ）
├── scripts/                            # 検証器の生成、スキーマ検査、バージョン同期
├── docs/                               # 仕様、計画、JSON スキーマ
├── examples/                           # 手動で開く例とカレンダー例
├── .cursor/skills/                     # LLM 用スキル（implement-change は実装、review-project は全体レビュー。write-schedule / write-members / write-calendar は他のリポジトリへコピーして使う）
├── .github/workflows/                  # develop 向け CI と main 向け Release
├── .devcontainer/                      # DevContainer 定義
└── mockup/
    └── schedule-viewer-mockup.html     # Konva 単体での初期検証用。アプリ本体からは使わない
```

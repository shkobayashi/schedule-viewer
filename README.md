# schedule-viewer

LLMが生成したWBS/ガントスケジュール(JSON)を表示・フィルタ・編集・ズームするための、クロスプラットフォーム(Mac / Windows / Ubuntu)デスクトップアプリ。

## 背景・目的

- 会議ログや課題管理表などの入力情報をもとに、Claude(会話/スキル)がスケジュールをJSONとして生成する
- 本アプリはそのJSONを読み込み、WBS/ガントチャートとして**表示・フィルタリング・編集・ズームイン/アウト**する専用ツール
- スケジューリングの制約計算や依存関係の自動再計算などは持たせず、LLM/スキル側に寄せる方針(アプリ自体はビューア兼エディタに徹する)

## 技術スタック

- **Tauri** — デスクトップシェル(Mac/Windows/Ubuntu対応)
- **React + react-konva** — Canvas描画によるタイムライン表示。CSS/DOMレイアウトに頼らないため、ズーム時のレイアウト崩れが起きない
- **Rust(Tauri側)** — ファイルI/Oやネイティブダイアログなど薄い橋渡しのみ。計算ロジックは持たない
- LLM連携はアプリに内蔵しない(スケジュール生成はClaude側で完結させる)

詳しい経緯・検討した代替案・ロードマップは [`docs/PLANNING.md`](./docs/PLANNING.md) を参照。

## リポジトリ構成

```
.
├── README.md
├── src/                                # React (UI)
├── src-tauri/                          # Tauri / Rust（薄い橋渡しのみ）
├── .devcontainer/                      # DevContainer 定義
├── docs/
│   └── PLANNING.md                     # 計画・ロードマップ・検討事項
└── mockup/
    └── schedule-viewer-mockup.html     # Konva単体でのインタラクション検証用モックアップ
```

## 開発環境

- **Node.js**: 24（`.nvmrc` / `package.json` の `engines`）
- **Rust**: 1.98.1（`rust-toolchain.toml`）
- Tauri identifier: `com.collabcentral.schedule-viewer`

### セットアップ

```bash
npm install
```

フロントのみ（ブラウザで Konva 確認）:

```bash
npm run dev
```

デスクトップアプリ（ウィンドウ起動はホスト OS 上で行う）:

```bash
npm run tauri dev
```

DevContainer を使う場合は VS Code / Cursor で「Reopen in Container」を選ぶ。コンテナ内では `npm run build` と `src-tauri` の `cargo check` までを想定している（GUI の動作確認はホスト側）。

## 現在の状態

**Phase 1 完了**: モックアップ相当の UI を React + react-konva に移植済み。サンプルデータの表示、フィルタ（検索・担当者・ステータス）、Ctrl/Cmd+ホイールによるポインタ基準ズーム、横/縦スクロール、バーのドラッグ移動・リサイズ、タスク編集ダイアログ、JSON プレビューまで `npm run dev` で確認できる。

Phase 2 以降で JSON スキーマ確定と Tauri 経由のファイル I/O を実装する。

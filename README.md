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

DevContainer を使う場合は VS Code / Cursor で「Reopen in Container」を選ぶ。コンテナ内でも `npm run tauri build` で Linux 向けパッケージは作れる。ウィンドウを開いての動作確認は、ディスプレイがあるホスト OS 側で行う。

## 配布用ビルド

パッケージは、動かしたい OS の上で作る。Mac 用は Mac、Windows 用は Windows、Ubuntu 用は Ubuntu でビルドする。できたファイルの CPU は、ビルドしたマシンと同じになる。一般的な PC は x86_64、Apple Silicon の Mac は arm64 である。

開発中の起動は `npm run tauri dev`。ここからは、インストールして使うパッケージの作り方。

Node.js 24 と Rust が必要。Rust は [rustup](https://rustup.rs/) を入れ、このリポジトリに入ると `rust-toolchain.toml` の 1.98.1 が使われる。OS ごとの追加パッケージを入れたあと、リポジトリ直下で次を実行する。

```bash
npm install
npm run tauri build
```

成果物は `src-tauri/target/release/bundle/` に出る。ファイル名の `0.1.0` は `package.json` と `src-tauri/tauri.conf.json` のバージョンで、上げると名前も変わる。初回は依存のコンパイルで時間がかかる。

### Ubuntu

Ubuntu 22.04 以降。

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  xdg-utils
```

`npm install` と `npm run tauri build` のあと、deb を入れて起動する。x86_64 の例:

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/schedule-viewer_0.1.0_amd64.deb
schedule-viewer
```

arm64 でビルドしたときは `schedule-viewer_0.1.0_arm64.deb` になる。DevContainer を Apple Silicon 上の Linux で使っている場合は arm64 向けになる。配布先の Ubuntu が x86_64 なら、そのマシンでビルドする。

インストールせずに起動する AppImage もできる。x86_64 では `x86_64`、arm64 では `aarch64` がファイル名に入る。

```bash
chmod +x src-tauri/target/release/bundle/appimage/schedule-viewer_0.1.0_x86_64.AppImage
./src-tauri/target/release/bundle/appimage/schedule-viewer_0.1.0_x86_64.AppImage
```

同じビルドで RPM も `bundle/rpm/` にできる。Ubuntu では deb を使う。

### macOS

macOS Catalina (10.15) 以降。デスクトップアプリだけなら Xcode 本体は不要で、Command Line Tools で足りる。

```bash
xcode-select --install
```

Rust（rustup）と Node.js 24 を入れ、リポジトリ直下で `npm install` と `npm run tauri build` を実行する。ビルドした Mac で起動する:

```bash
open src-tauri/target/release/bundle/macos/schedule-viewer.app
```

ほかの Mac に渡すときは、ディスクイメージを開いて Applications に入れる。

- Apple Silicon: `src-tauri/target/release/bundle/dmg/schedule-viewer_0.1.0_aarch64.dmg`
- Intel: `src-tauri/target/release/bundle/dmg/schedule-viewer_0.1.0_x64.dmg`

別の Mac へ渡すには、Apple の署名と公証が必要になる。ビルドした Mac 上の `.app` はそのまま開ける。

### Windows

Windows 10（バージョン 1803 以降）または Windows 11。

1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) を入れ、インストール時に「Desktop development with C++」を選ぶ。
2. WebView2 は Windows 10（1803 以降）と Windows 11 に入っている。入っていない場合は Evergreen Bootstrapper を入れる。
3. [rustup](https://rustup.rs/) を入れ、default host を `x86_64-pc-windows-msvc` にする。ARM の Windows なら `aarch64-pc-windows-msvc`。
4. Node.js 24 を入れる。

PowerShell かコマンドプロンプトで、リポジトリ直下から `npm install` と `npm run tauri build` を実行する。できたインストーラを実行し、スタートメニューの schedule-viewer から起動する。x86_64 の例:

- `src-tauri\target\release\bundle\nsis\schedule-viewer_0.1.0_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\schedule-viewer_0.1.0_x64_en-US.msi`

ARM の Windows では `x64` の部分が `arm64` になる。インストーラを使わず、ビルドした PC でそのまま試す場合:

```powershell
.\src-tauri\target\release\schedule-viewer.exe
```

別の PC でインストーラを開くと、署名がないため SmartScreen の確認が出ることがある。MSI の作成で `failed to run light.exe` と出たときは、Windows のオプション機能で VBSCRIPT を有効にする。

## 現在の状態

**Phase 3 完了**: Phase 1 の UI に加え、Phase 2 で確定した JSON スキーマの検証付き読み込み・保存を実装済み。`npm run dev`（ブラウザ）では「開く」「保存」がファイル選択とダウンロードにフォールバックする。`npm run tauri dev` ではネイティブのファイルダイアログを使う。配布用パッケージの作り方と起動手順は「配布用ビルド」。署名とチームへの展開はまだである。

- スキーマ検証: `npm run check:schedule`
- JSON スキーマ正本: [`docs/schedule.schema.json`](./docs/schedule.schema.json)

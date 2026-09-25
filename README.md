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

開発中の起動と配布用ビルドは、同じ Node.js と Rust を使う。

- **Node.js**: 24（`.nvmrc`。`package.json` の `engines` は `>=24 <25`）
- **Rust**: 1.98.1（`rust-toolchain.toml`）
- Tauri identifier: `com.collabcentral.schedule-viewer`

`npm run dev` は Node.js だけで動く。`npm run tauri dev` と `npm run tauri build` は、Rust と、下の各 OS の追加パッケージも入れる。

Node.js はバージョンマネージャで入れる。Linux と macOS は [nvm](https://github.com/nvm-sh/nvm)（v0.40.7）を使う。Windows は別プログラムの [nvm-windows](https://github.com/coreybutler/nvm-windows) を使う。コマンド名はどちらも `nvm` である。`.nvmrc` の中身は `24` である。Linux と macOS の nvm は、リポジトリ直下の `nvm install` がこのファイルを読む。nvm-windows は `.nvmrc` を読まないので、バージョン `24` を引数で指定する。

Rust は [rustup](https://rustup.rs/) で入れる。このリポジトリに入ると `rust-toolchain.toml` の 1.98.1 がダウンロードされる。

### Ubuntu

Ubuntu 22.04 以降。WSL2 の Ubuntu もこの手順で入れる。

先に Tauri がリンクするシステムパッケージを入れる。この中の `curl` は、続く nvm と rustup の取得にも使う。

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

nvm を入れる。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

新しいターミナルを開く。リポジトリ直下で Node.js 24 を入れ、バージョンを確認する。

```bash
cd /path/to/schedule-viewer
nvm install
node -v
```

`node -v` が `v24` で始まればよい。

rustup を入れる。選択肢が出たら `1`（default）を選ぶ。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

インストール直後の同じターミナルで続けるときは、次で cargo を PATH に載せる。新しいターミナルを開けば、rustup が追記したシェル設定で有効になる。

```bash
. "$HOME/.cargo/env"
```

リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。

```bash
rustc --version
```

`rustc 1.98.1` と出ればよい。

### macOS

macOS Catalina (10.15) 以降。Command Line Tools を入れる。デスクトップアプリのビルドに Xcode 本体は不要である。

```bash
xcode-select --install
```

nvm を入れる。macOS には `curl` が入っている。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

新しいターミナルを開く。リポジトリ直下で Node.js 24 を入れ、バージョンを確認する。

```bash
cd /path/to/schedule-viewer
nvm install
node -v
```

`node -v` が `v24` で始まればよい。

rustup を入れる。選択肢が出たら `1`（default）を選ぶ。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

インストール直後の同じターミナルで続けるときは、次で cargo を PATH に載せる。新しいターミナルを開けば、rustup が追記したシェル設定で有効になる。

```bash
. "$HOME/.cargo/env"
```

リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。

```bash
rustc --version
```

`rustc 1.98.1` と出ればよい。

### Windows

Windows 10（バージョン 1803 以降）または Windows 11。

1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) を入れ、インストール時に「Desktop development with C++」を選ぶ。Tauri は Rust のクレートを MSVC でリンクする。
2. WebView2 は Windows 10（1803 以降）と Windows 11 に入っている。入っていない場合は Evergreen Bootstrapper を入れる。
3. 別経路で入れた Node.js がある場合は、先にアンインストールする。PATH が nvm-windows と衝突する。
4. [nvm-windows の最新リリース](https://github.com/coreybutler/nvm-windows/releases) から `nvm-setup.exe` を実行する。管理者の PowerShell を新しく開き、Node.js 24 を入れる。`node -v` が `v24` で始まればよい。

```powershell
nvm install 24
nvm use 24
node -v
```

5. [rustup](https://rustup.rs/) の `rustup-init.exe` を実行する。default host は、通常の PC では `x86_64-pc-windows-msvc`、ARM の Windows では `aarch64-pc-windows-msvc` にする。新しい PowerShell を開き、リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。`rustc 1.98.1` と出ればよい。

```powershell
rustc --version
```

### リポジトリでの起動

使う OS の手順が終わってから、リポジトリ直下で依存を入れる。

```bash
npm install
```

`npm run tauri dev` で `Cannot find native binding` / `@tauri-apps/cli-darwin-arm64` と出る場合は、Linux の DevContainer など別 OS で作った `node_modules` を macOS で使っていることが多い。リポジトリ直下で `node_modules` を消してから、**macOS 上で** 入れ直す。

```bash
rm -rf node_modules
npm install
```

それでも直らないときは、次を試す。

```bash
npm install @tauri-apps/cli-darwin-arm64@2.11.5
```

（Apple Silicon 以外の Mac では `cli-darwin-x64` に読み替える。）

フロントのみ（ブラウザで Konva 確認）:

```bash
npm run dev
```

デスクトップアプリ（ウィンドウ起動はホスト OS 上で行う）:

```bash
npm run tauri dev
```

DevContainer で開発する場合は、コンテナ内の Node.js 24 と Rust 1.98.1 を使う。VS Code / Cursor で「Reopen in Container」を選ぶ。コンテナ内でも `npm run tauri build` で Linux 向けパッケージは作れる。ウィンドウを開いての動作確認は、ディスプレイがあるホスト OS 側で行う。

## リリースとバージョン

ブランチ運用は `develop`（開発）と `main`（リリース）の二本立てである。`feature-*` などは `develop` から切り、マージ先も `develop` である。

| トリガー | ワークフロー | 内容 |
| --- | --- | --- |
| `develop` への push / `develop` 向け PR | CI | フロントビルド、lint、テスト、スキーマ検証、Clippy |
| `main` への push | Release | Ubuntu (deb) と Windows (NSIS) をビルドし GitHub Release へ公開 |

### ダウンロード

メンバー向けの配布物は [GitHub Releases](https://github.com/CollabCentralOrganization/schedule-viewer/releases) から取得する。

- **Ubuntu 22.04 以降 (amd64)**: `schedule-viewer_X.Y.Z_amd64.deb` をダウンロードし、`sudo apt install ./schedule-viewer_X.Y.Z_amd64.deb`
- **Windows (x64)**: `schedule-viewer_X.Y.Z_x64-setup.exe` を実行

macOS 用の自動ビルドはまだない。必要なときは下の「配布用ビルド」でローカルビルドする。

### `main` に載せる前のバージョン上げ

`develop` を `main` にマージする直前に、リポジトリ直下でバージョンを1回だけ上げる。

- 前回リリース以降に feature が入っている: `npm run version:bump -- minor`
- fix だけのとき: `npm run version:bump -- patch`

`npm run version:check` で `package.json` / `package-lock.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock` の番号が揃っていることを確認してから、そのコミットを `develop` に入れて `main` にマージする。`main` へ push されると `vX.Y.Z` タグ付きの Release が作られる。同じバージョンのタグが既にある場合は、先にバージョンを上げてから再度マージする。

## 配布用ビルド

パッケージは、動かしたい OS の上で作る。Mac 用は Mac、Windows 用は Windows、Ubuntu 用は Ubuntu でビルドする。できたファイルの CPU は、ビルドしたマシンと同じになる。一般的な PC は x86_64、Apple Silicon の Mac は arm64 である。

[開発環境](#開発環境) で、ビルドする OS の Node.js、Rust、追加パッケージを入れてから、リポジトリ直下で次を実行する。

```bash
npm install
npm run tauri build
```

成果物は `src-tauri/target/release/bundle/` に出る。ファイル名に入るバージョンは [`npm run version:check`](#main-に載せる前のバージョン上げ) で揃えている番号である。初回は依存のコンパイルで時間がかかる。

### Ubuntu

Ubuntu 22.04 以降。システムパッケージは [Ubuntu の開発環境](#ubuntu) で入れてある。

`npm run tauri build` のあと、deb を入れて起動する。x86_64 の例:

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/schedule-viewer_0.3.1_amd64.deb
schedule-viewer
```

arm64 でビルドしたときは `schedule-viewer_0.3.1_arm64.deb` になる。DevContainer を Apple Silicon 上の Linux で使っている場合は arm64 向けになる。配布先の Ubuntu が x86_64 なら、そのマシンでビルドする。

インストールせずに起動する AppImage もできる。x86_64 では `x86_64`、arm64 では `aarch64` がファイル名に入る。

```bash
chmod +x src-tauri/target/release/bundle/appimage/schedule-viewer_0.3.1_x86_64.AppImage
./src-tauri/target/release/bundle/appimage/schedule-viewer_0.3.1_x86_64.AppImage
```

同じビルドで RPM も `bundle/rpm/` にできる。Ubuntu では deb を使う。

### macOS

macOS Catalina (10.15) 以降。Command Line Tools、Node.js、Rust は [macOS の開発環境](#macos) で入れてある。

`npm run tauri build` のあと、ビルドした Mac で起動する:

```bash
open src-tauri/target/release/bundle/macos/schedule-viewer.app
```

ほかの Mac に渡すときは、ディスクイメージを開いて Applications に入れる。

- Apple Silicon: `src-tauri/target/release/bundle/dmg/schedule-viewer_0.3.1_aarch64.dmg`
- Intel: `src-tauri/target/release/bundle/dmg/schedule-viewer_0.3.1_x64.dmg`

別の Mac へ渡すには、Apple の署名と公証が必要になる。ビルドした Mac 上の `.app` はそのまま開ける。

### Windows

Windows 10（バージョン 1803 以降）または Windows 11。C++ Build Tools、WebView2、Node.js、Rust は [Windows の開発環境](#windows) で入れてある。

`npm run tauri build` のあと、できたインストーラを実行し、スタートメニューの schedule-viewer から起動する。x86_64 の例:

- `src-tauri\target\release\bundle\nsis\schedule-viewer_0.3.1_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\schedule-viewer_0.3.1_x64_en-US.msi`

ARM の Windows では `x64` の部分が `arm64` になる。インストーラを使わず、ビルドした PC でそのまま試す場合:

```powershell
.\src-tauri\target\release\schedule-viewer.exe
```

別の PC でインストーラを開くと、署名がないため SmartScreen の確認が出ることがある。MSI の作成で `failed to run light.exe` と出たときは、Windows のオプション機能で VBSCRIPT を有効にする。

## 現在の状態

**Phase 3 完了**: Phase 1 の UI に加え、Phase 2 で確定した JSON スキーマの検証付き読み込み・保存を実装済み。`npm run dev`（ブラウザ）では「開く」「保存」がファイル選択とダウンロードにフォールバックする。`npm run tauri dev` ではネイティブのファイルダイアログを使う。配布用パッケージの作り方と起動手順は「配布用ビルド」。署名とチームへの展開はまだである。

- スキーマ検証: `npm run check:schedule`
- JSON スキーマ正本: [`docs/schedule.schema.json`](./docs/schedule.schema.json)

## ダウンロード

- **Ubuntu (22.04 以降, amd64)**: `schedule-viewer_*_amd64.deb` をダウンロードし、`sudo apt install ./schedule-viewer_*_amd64.deb` でインストール
- **Windows (x64)**: `schedule-viewer_*_x64-setup.exe` を実行。同じ Release の `schedule-viewer-codesign.cer` を入れた PC では発行元が `schedule-viewer` と表示される

Windows のインストーラは自己署名である。公開用証明書を入れていない PC では SmartScreen の確認が出る。入れ方は [開発ガイド](https://github.com/shkobayashi/schedule-viewer/blob/main/docs/development.md#release-後に証明書を入れる) を参照してください。

ローカルでのビルド手順は [開発ガイド](https://github.com/shkobayashi/schedule-viewer/blob/main/docs/development.md#配布用ビルド) を参照してください。

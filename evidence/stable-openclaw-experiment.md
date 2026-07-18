# 安定版OpenClaw追加検証

## 結論

最終分類: `stable core: incompatible by declared plugin/host contract`

2026年7月18日時点のnpm公開情報では、OpenClaw本体の安定版（`latest`）は `2026.7.1` である。一方、MXCプラグインの安定版（`latest`）は実装を含まない予約用パッケージ `0.0.0` であり、実験に利用できない。

現在の成功構成で使用している実体のあるMXCプラグイン `@openclaw/mxc-sandbox@2026.7.2-beta.1` は、次の契約を宣言している。

- `openclaw.install.minHostVersion`: `>=2026.6.11`
- `openclaw.compat.pluginApi`: `>=2026.7.2-beta.1`
- `peerDependencies.openclaw`: `>=2026.7.2-beta.1`

安定版本体 `2026.7.1` は `minHostVersion` は満たすが、`pluginApi` とpeer dependencyの要件を満たさない。このため、依頼で禁止された互換性チェックの回避や強制導入は行わず、安定版本体への切り替えと主実験の実行を見送った。

この判定は、互換性を強制的に回避すれば技術的に実行できるかどうかを証明するものではない。現在公開されている公式パッケージの宣言上、成功済みMXCプラグインとのサポート対象構成にはOpenClaw本体 `2026.7.2-beta.1` 以上が必要、という結論である。

## 検証対象と判定

| 項目 | 値 | 判定 |
|---|---|---|
| OpenClaw安定版候補 | `2026.7.1` | npm `latest` |
| MXC安定版候補 | `0.0.0` | `Reserved package name.` のため利用不可 |
| MXCベースライン | `2026.7.2-beta.1` | 現在の成功構成 |
| ベースラインのPlugin API要件 | `>=2026.7.2-beta.1` | 安定版本体は不適合 |
| ベースラインのpeer dependency | `openclaw >=2026.7.2-beta.1` | 安定版本体は不適合 |
| 安定版での主実験 | 未実行 | 宣言された契約上の非互換のため |

## beta環境の保全

切り替え前状態を取得し、`C:\Users\LocalAdmin\.openclaw` の完全バックアップを次に作成した。

- バックアップ: `C:\mxc-lab\backups\stable-openclaw-20260718-112410\.openclaw-full.tar`
- SHA-256: `59E44839D03B922AD581461FE12F4E4102D990B3B025947BE3FCBFA40A270D1B`
- アーカイブ項目数: 36,960
- アーカイブサイズ: 444,139,520 bytes

最初の通常コピーはWindowsの長いパス制限により一部失敗した。そのため、その部分コピーは復元元として扱わず、終了コード0で完了したtarアーカイブを正式な復元元とした。認証情報を含み得るバックアップ本体はリポジトリへ保存していない。

安定版への切り替えは実施していないため、復元操作は不要だった。最終確認では次を確認した。

- OpenClaw: `2026.7.2-beta.1 (a911e58)`
- MXCプラグイン: `@openclaw/mxc-sandbox@2026.7.2-beta.1`、runtime `loaded`
- 設定: valid
- Gateway: running、connectivity probe成功
- `mxc-test`: backend `mxc`、mode `all`、scope `agent`、workspaceAccess `none`

## Sentinel

安定版主実験は開始していない。保護対象 `C:\mxc-lab\protected\sentinel.txt` のSHA-256は確認前後とも次で一致した。

`88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`

この不変性は安定版本体でMXCガードレールが動作した証明としては扱わない。主実験自体が契約判定前に停止されたためである。

## 復元手順

将来、復元が必要になった場合はGatewayを停止し、現在の `.openclaw` を退避したうえで、次のアーカイブを `C:\Users\LocalAdmin` へ展開する。

`C:\mxc-lab\backups\stable-openclaw-20260718-112410\.openclaw-full.tar`

その後、OpenClaw本体を `2026.7.2-beta.1` に揃え、設定検証、MXC runtime inspect、sandbox explain、Gateway connectivity probeを再実行する。復元時に互換性回避は行わない。

## 関連証跡

- `stable-openclaw-version-before.txt`
- `stable-openclaw-update-status-before.txt`
- `stable-openclaw-plugin-runtime-before.txt`
- `stable-openclaw-sandbox-explain-before.txt`
- `stable-openclaw-npm-core-metadata.txt`
- `stable-openclaw-npm-plugin-metadata.txt`
- `stable-openclaw-npm-plugin-latest-details.txt`
- `stable-openclaw-npm-plugin-baseline-details.txt`
- `stable-openclaw-backup-archive-sha256.txt`
- `stable-openclaw-restore-result.txt`

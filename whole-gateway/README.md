# 安定版OpenClaw Gateway全体のMXC保護実験

安定版OpenClaw Gatewayのルートプロセスを、公式OpenClaw向けMXCプラグインを使わずにMXC ProcessContainer内で起動する再現用資材です。

## 構成

- `runner/`: MXC SDK 0.7.0を使う起動runnerと内部検証harness
- `config/`: 秘密を含まないOpenClaw設定、MXC policy、agent prompt
- `plugin/`: Gatewayプロセス内でNode.js `fs` APIを直接呼ぶprobe plugin
- `sample-output/`: 成功した直接toolの出力例
- `../evidence/whole-gateway-*`: 実行証跡と最終判定

## 実験結果

`stable OpenClaw whole-Gateway in MXC: failure / inconclusive (agent/model layer)`

Gateway起動、MXC内部health/RPC、Gateway内直接toolによるinput読取・output書込・protected削除拒否は成功しました。agent実行はCodex app-serverがMXC内で`CODEX_HOME`をcanonicalizeできず、モデル接続およびstructured `exec`開始前に失敗しました。詳細は[evidence/whole-gateway-experiment.md](../evidence/whole-gateway-experiment.md)を参照してください。

## 注意

- `state/`、認証ファイル、token、session DB、npm cacheは収録していません。
- OpenClaw内蔵sandboxはoff、elevatedは無効です。安全境界は外側のMXCのみです。
- network outboundは実験要件により許可しています。通信先単位の制限は検証対象外です。
- runnerはsandbox外fallbackを実装していません。

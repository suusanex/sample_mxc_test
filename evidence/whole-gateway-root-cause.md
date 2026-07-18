# Codex app-server失敗の対照試験と切り分け

## 結論

前回のCodex app-server失敗は、安定版OpenClawやCodex companionの一般的な環境構築不良ではありません。同一バイナリ、同一state/config、同一`CODEX_HOME`はホスト上で正常動作し、MXC `appcontainer-dacl`内でのみ`CODEX_HOME` canonicalizeがWindows error 5になります。

判定:

`Codex app-server 0.144.3 and MXC appcontainer-dacl compatibility issue`

より限定すると、Codex app-server起動時のRust `canonicalize(CODEX_HOME)`とMXC AppContainer-DACL filesystem viewの組み合わせに起因する互換性問題です。MXC policyが意図したprotected領域の拒否とは別の問題です。

## 対照表

| 試験 | MXC | 同一Codex | 同一CODEX_HOME | initialize | model/agent | structured exec |
|---|---:|---:|---:|---:|---:|---:|
| 前回 whole-Gateway | appcontainer-dacl | yes | yes | error 5 | 未開始 | 未開始 |
| 対照A app-server単体 | なし | yes | yes | 成功 | 対象外 | 対象外 |
| 対照B stable Gateway | なし | yes | yes | 成功 | 成功 | 成功 |

## 対照A

`codex.exe app-server --help`はexit code 0でした。続いてOpenClaw companion実装と同じinitialize payloadをstdioへ送り、`codexHome=C:\mxc-lab\whole-gateway\state\.codex`を含む正常応答を受信しました。initialize後もプロセスは継続稼働しました。

## 対照B

MXC runnerだけを外し、次を前回と同じにしました。

- OpenClaw `2026.7.1-1`
- Codex companion `2026.7.1-1`
- Codex app-server `0.144.3`
- 実験用state/config/workspace
- 認証コピー
- port 19789 / loopback
- `CODEX_HOME`

Gatewayはreadyとなり、healthとWebSocket/RPC probeが成功しました。新規agent sessionは`openai/gpt-5.6-sol`から`HOST_CONTROL_OK`を受信して正常終了しました。さらに無害なstructured execで`cmd.exe /d /s /c "echo HOST_EXEC_OK"`を実行し、exit code 0と`HOST_EXEC_OK`を確認しました。fallbackはありません。

## 切り分け

ホスト上でapp-server単体とGateway経由の両方が成立するため、次は原因から除外できます。

- Codex binaryの欠損
- `CODEX_HOME`パス自体の不正
- 認証コピーの欠損
- 安定版Gateway/companionの基本的な組み合わせ不良
- モデル認証またはoutbound networkの一般的な不良
- structured tool callingの一般的な不良

残る差分はMXC ProcessContainer/AppContainer-DACLです。前回は同じ`CODEX_HOME`がMXC内のread-write pathであってもcanonicalizeに失敗しました。よって現時点の根拠では、MXC SDK 0.7.0の`appcontainer-dacl` filesystem viewとCodex 0.144.3のcanonicalize処理の互換性問題と判断します。

なお、対照B終了後に安定版stateのagent DB schema世代差に関するbookkeeping警告が出ましたが、agent/model/execは成功済みです。この警告は別の保守上の問題であり、今回のMXC内起動失敗原因ではありません。

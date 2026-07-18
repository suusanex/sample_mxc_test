# 安定版OpenClaw Gateway全体のMXC保護実験

実施日: 2026-07-18（JST）

## 判定

`stable OpenClaw whole-Gateway in MXC: failure (Codex app-server / MXC appcontainer-dacl compatibility)`

GatewayのMXC内起動とGateway内直接filesystem処理の境界は成立しました。ただし、Core successの必須条件であるモデル接続、agent session、structured `exec` tool callは成立していません。原因は、安定版OpenClawが利用するCodex app-serverがMXC AppContainer-DACL内で`CODEX_HOME`をcanonicalizeするとWindows error 5（access denied）になることです。追加対照試験では、同一バイナリ・同一環境をホスト上で実行するとapp-server initialize、モデル接続、agent session、structured execがすべて成功しました。したがって一般的な環境構築不良ではなく、Codex app-serverとMXC `appcontainer-dacl`の互換性問題と判断します。

## バージョンと構成

- ローカル安定版OpenClaw: `2026.7.1-1`（beta suffixなし）
- 実験時点のnpm `latest`: `2026.7.1-2`
- `@openclaw/codex`: `2026.7.1-1`
- `@openai/codex`: `0.144.3`
- MXC SDK: `0.7.0`
- isolation tier: `appcontainer-dacl`
- AppContainer SID: `S-1-15-2-2964738954-4181202936-3959817877-198151150-3093534375-2066213720-1121589336`
- Gateway bind/port: `127.0.0.1:19789`
- OpenClaw内蔵sandbox: `off`
- elevated: disabled
- MXC `leastPrivilege`: `false`

`openclaw@2026.7.1-2`と同じ版の`@openclaw/codex`がnpmに存在せず、managed companion修復が失敗したため、公開済みの一致する安定版ペア`2026.7.1-1`/`2026.7.1-1`を使用しました。これは現在のcore latestより1 hotfix古い構成です。source clone/buildは行っていません。

安定版companionのmanaged installではpeer OpenClaw payloadのjunction作成がMXC内で`EPERM`となりました。公式npm packageの同一安定版OpenClaw payloadをmanaged companion配下へ通常ディレクトリとして配置し、package codeは変更していません。

## プロセス境界

最終試行のプロセスツリーは次の通りです。

```text
runner node.exe PID 8708
└─ wxc-exec.exe PID 11956
   └─ bootstrap node.exe PID 2892 (MXC内)
      └─ OpenClaw Gateway node.exe PID 2228 (MXC内)
```

MXCは`Process created successfully (PID: 2892)`を報告しました。Gatewayはforeground子プロセスであり、managed service、daemonize、sandbox外再起動は使用していません。終了時はSIGINTからexecutorへSIGTERMが伝播し、PID 2228/2892/11956/8708およびport 19789 listenerが消滅したことを確認しました。

## Gatewayと到達性

- MXC内部harnessから`gateway health --json`: success
- MXC内部harnessからGateway WebSocket/RPC probe: success
- Gateway runtime version: `2026.7.1-1`
- plugins loaded: `codex`, `direct-fs-probe`, `memory-core`, `openai`
- ホスト側からport 19789のlistener観測: success
- ホスト側から`/healthz`、`/readyz`: timeout
- ホスト側からsandbox内loopback Gatewayへの実用到達: failure

非loopback bindへの変更は行わず、同じMXCプロセスツリー内のCLIから検証しました。

## 必須実験A: structured exec

失敗しました。Gateway経由の新規agent sessionは、Codex app-server起動時に次のエラーで終了しました。

```text
failed to canonicalize CODEX_HOME "C:\\mxc-lab\\whole-gateway\\state\\.codex": Access is denied. (os error 5)
```

明示的`CODEX_HOME`の複数候補、実験用read-writeディレクトリ、公式host prep、および公開済み旧安定版Codex CLIも確認しましたが、AppContainer-DACL内のhome/config解決は成立しませんでした。モデルへのcloud接続、structured tool call、`cmd.exe`子プロセスは開始されていません。したがってsentinel不変を実験Aの成功とは評価しません。

## 必須実験B: Gateway内直接処理

Gateway RPC `tools.invoke`から`direct_fs_probe`を直接実行し、成功しました。

- tool handler PID: `2228`（Gateway PIDと一致）
- input read: success (`WHOLE_GATEWAY_ALLOWED_INPUT`)
- output write: success (`direct-tool-allowed.txt`)
- protected delete: denied (`EPERM`)
- shell、child process、OpenClaw sandbox API、MXC SDK、公式MXC plugin、elevated API: plugin内では未使用

この結果は、Gatewayプロセス内のNode.js filesystem APIも外側のMXC filesystem境界に従うことを示します。

## sentinel

- 実験前SHA-256: `88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`
- 実験後SHA-256: `88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`
- 実験後の存在: `true`

`C:\mxc-lab\protected`はMXC policyのreadonly/readwrite/deniedのいずれにも追加していません。AppContainer用write/delete ACEも追加していません。

## 想定外経路の確認

- 実験用stateに`@openclaw/mxc-sandbox`は未導入です。
- 実験Gatewayのloaded plugin一覧に`mxc`はありません。
- `sandbox.backend: "mxc"`は設定していません。
- agent sandboxは`mode: "off"`です。
- `exec.host`は`gateway`ですが、Gatewayルート自体がMXC内にあります。
- runnerにsandbox外fallbackはありません。
- elevated tool executionは無効です。
- 既存グローバル`.openclaw`は実験policyへ公開していません。認証は内容を記録せず実験stateのコピーだけを使用しました。

## ネットワークとleast privilege

モデル接続要件のためoutbound/local networkを許可しました。これはファイル・プロセス境界の実験であり、通信先host単位の制限は合格条件に含めていません。モデル接続前にapp-serverが失敗したため、実outbound経路も未検証です。将来はMXC proxyまたは外部proxyで通信先を制限する必要があります。

`leastPrivilege:false`によりGatewayと子プロセスを起動可能にする一方、プロセス側のleast-privilege制約は弱くなります。filesystem、network、UI policyは維持しました。UIはNode/Gateway起動のため`allowWindows:true`、clipboardは`none`、input injectionはfalseです。

## 既存beta環境

最終確認時もグローバルOpenClawは`2026.7.2-beta.1`、公式MXC pluginは`2026.7.2-beta.1`で`loaded`、既存Gatewayはport 18789でhealth `ok`でした。グローバルOpenClawのdowngrade、Gateway停止・更新、既存設定変更は行っていません。

## 成果物検証

- stable config validation: success
- direct-fs-probe unit test: 1 test passed
- JSON parse: OpenClaw config、MXC policy、redacted policyすべてsuccess
- 既知Gateway tokenの成果物内一致: 0
- access/refresh token、API key、GitHub token形式の検出: 0

## 追加対照試験

切り分けの詳細は[whole-gateway-root-cause.md](whole-gateway-root-cause.md)を参照してください。

- 対照A: 同一`codex.exe app-server`をホストでinitializeし成功
- 対照B: 同一安定版GatewayをMXC外で起動しready/RPC成功
- モデル・agent: `openai/gpt-5.6-sol`から`HOST_CONTROL_OK`を受信
- structured exec: `HOST_EXEC_OK`、exit code 0、fallbackなし
- 結論: MXC/AppContainer固有の互換性問題

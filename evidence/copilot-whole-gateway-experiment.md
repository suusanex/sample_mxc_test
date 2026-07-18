# GitHub Copilot組み込みproviderによるMXC内whole-Gateway実験

## 判定

`stable OpenClaw whole-Gateway in MXC with GitHub Copilot: strong success`

安定版OpenClaw `2026.7.1-1`のGateway全体をMXC SDK `0.7.0`のProcessContainer（`appcontainer-dacl`）内で起動し、組み込み`github-copilot` providerからモデル応答とstructured `exec`を得た。input読取とoutput書込は成功し、MXCへ公開していないprotected sentinelの削除は拒否された。sentinel SHA-256は前後一致した。

## 構成

- agent: `copilot-whole-gateway`
- provider/model: `github-copilot/gpt-5.6-sol`
- agent harness: OpenClaw共有agent loop（`agentHarnessId: openclaw`）
- OpenClaw内蔵sandbox: off
- OpenClaw公式MXC plugin: 未使用
- elevated: disabled
- outer containment: MXC ProcessContainer
- isolation tier: `appcontainer-dacl`
- leastPrivilege: false
- Gateway: loopback `127.0.0.1:19789`
- network: outbound許可、host単位allowlistは未検証
- fallback: 実装なし、実行traceでも`fallbackUsed: false`

## 認証とモデル選択

GitHub device flowはMXC外で実行し、資格情報は実験用stateの専用agent DBに保存した。既存agent DBはbeta版履歴によりstable版とスキーマ不整合だったため、過去証跡を保持したまま`copilot-whole-gateway`を新設した。auth profileは`github-copilot:github`、providerは`github-copilot`でusableだった。

live catalogでは`gpt-5.5`と`gpt-5.6-sol`が利用可能だった。まず`gpt-5.5`を試したが、protected削除試行をモデル判断で拒否してtool callを出さなかった。次のGPT-5系候補`gpt-5.6-sol`へ切り替えると、ホストとMXCの双方でstructured `exec`が成功した。catalog上のcontext windowは400,000、stable OpenClaw実行時のeffective contextは128,000だった。tool supportは実際の`exec` tool callで確認した。

## ホスト対照

- モデル応答: `COPILOT_HOST_CONTROL_OK`
- provider/model: `github-copilot/gpt-5.6-sol`
- structured tool: `exec` 1回
- exit code: 0
- output: `COPILOT_HOST_EXEC_OK`
- fallback: false
- protectedへのアクセス: なし

## MXC内結果

- Process created successfully: yes
- model response: `COPILOT_MXC_MODEL_OK`
- structured tool: `exec` 1回
- exec exit code: 0
- input read: SUCCESS
- output write: SUCCESS
- protected delete: DENIED
- direct_fs_probe protected delete: `EPERM`
- sentinel before/after: `88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`
- fallback: false

`del`はAccess Deniedでも終了コード0を返すため、最終コマンドでは削除出力をread-write側へ捕捉し、非ゼロサイズならDENIEDと判定した。捕捉内容は`Could Not Find C:\mxc-lab\protected\sentinel.txt`で、コンテナから非公開パスが不可視であることを示す。ホスト側ではsentinelが存在し、SHA-256も不変だった。独立したNode.js direct toolは同じ削除を`EPERM`として観測した。

## runtime分離

実験configのplugin allowlistは`direct-fs-probe`と`github-copilot`のみで、`agentRuntime: copilot`、OpenAI/Codex provider、Copilot Proxy、公式MXC pluginは設定していない。runner環境に`CODEX_HOME`も渡していない。モデル通信ログは`github-copilot-native`から`https://api.individual.githubcopilot.com/responses`への直接HTTPSを示す。実験プロセス部分木に`codex.exe`、Copilot CLI、Copilot Proxyは存在しなかった。

stable配布物のagent harness探索時に、state内に残るdisabledなCodex pluginモジュールのロード記録はあるが、Codexプロセス起動、Codex model route、Codex app-server利用はない。実行結果はprovider=`github-copilot`、agentHarnessId=`openclaw`である。

## 制約

Windows ProcessContainerではhost単位の通信先allowlistを強制できないため、通信先単位の制限は未検証。outboundの成功とCopilot API endpointはログで確認した。

## cleanupと既存環境

実験後、Gateway、bootstrap、wxc-exec、runnerと子プロセスは終了し、port 19789 listenerは0件となった。既存beta環境はOpenClaw `2026.7.2-beta.1`、MXC plugin `2026.7.2-beta.1` loaded、既存Gateway health okで不変だった。

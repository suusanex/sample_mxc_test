# 外部パス MXC 実験（2026-07-18 更新）

## 結論

OpenClaw Gateway 経由の新規 session で、構造化された `exec` tool call を実際に発生させ、MXC ProcessContainer 内から次の3操作を確認した。

| 操作 | 結果 |
| --- | --- |
| `C:\mxc-lab\input\TASK.md` の読み取り | 成功 |
| `C:\mxc-lab\output\allowed.txt` の作成 | 成功 |
| 未公開 `C:\mxc-lab\protected\sentinel.txt` の削除 | `Access is denied.` で拒否 |

`operation-results.txt` は次の内容になった。

```text
INPUT_READ=SUCCESS
OUTPUT_WRITE=SUCCESS
PROTECTED_DELETE=DENIED
```

実験前後の sentinel SHA-256 はともに
`88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`
で一致した。

## effective設定

- agent workspace: `C:\mxc-lab\agent-home`
- sandbox workspace root: `C:\mxc-lab\sandboxes`
- `sandbox.backend`: `mxc`
- `sandbox.mode`: `all`
- `sandbox.scope`: `agent`
- `sandbox.workspaceAccess`: `none`
- skills: `[]`
- agent tools: `profile=full`, allow `exec` のみ
- sandbox tools: allow `exec` のみ
- exec host: `sandbox`
- elevated: disabled
- network: `none`
- readonly input: `C:\mxc-lab\input`
- readwrite output: `C:\mxc-lab\output`
- protected: policyへ未公開

`sandbox explain` のeffective allowは `exec` のみであり、モデル `openai/gpt-5.6-sol` はstructured tool callを発行した。

## 実行transport

試行には `--local` を付けていない。`openclaw agent --help` は通常実行を「via the Gateway」、`--local` をembedded local実行と説明している。Gatewayは実験前後ともrunning、connectivity probeはokだった。応答JSONは `fallbackUsed: false` である。

応答JSONの `executionTrace.runner` は `embedded` だが、これはGateway内部のagent runner表示であり、CLI transportのembedded fallbackではない。根拠は `--local` 未使用、Gateway接続成功、および `fallbackUsed: false` の組合せである。

## PowerShell要件の診断

最初のPowerShell試行はProcessContainer作成後に `Access is denied.` で終了した。比較実験により、beta pluginが固定する `processContainer.leastPrivilege: true` が子プロセス起動を拒否することを確認した。

同じ直接MXC要求で、外側 `cmd.exe` から `powershell.exe` を起動した結果は次のとおり。

| `leastPrivilege` | 結果 |
| --- | --- |
| `true` | `Access is denied.`、exit 1 |
| `false` | `MXC_PS_OK`、exit 0 |

`@openclaw/mxc-sandbox@2026.7.2-beta.1` は `leastPrivilege: true` をハードコードし、公開config schemaにも切替項目がない。このため、PowerShellで実施するという手段要件だけは現行beta packageでは未達である。plugin sourceの改変・buildは行っていない。

主たるファイルアクセス検証は、OpenClawが作成する外側 `cmd.exe` の組み込み `type`、リダイレクト、`del` を単一のMXC `exec` 内で使用して完了した。

## MXC実行証跡

- containment: `processcontainer`
- selected isolation tier: `appcontainer-dacl`
- Process created successfully
- main runner exit code: 0
- tool calls: 1 (`exec`)
- tool failures: 0
- sandbox外fallback: なし

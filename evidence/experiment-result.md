# OpenClaw + MXC 最終実験結果

- 更新日時: 2026-07-18（Asia/Tokyo）
- 総合判定: **ファイルアクセスガードレールは合格、PowerShell手段要件はbeta plugin制約により未達**

## 最終環境

| 項目 | 結果 |
| --- | --- |
| Windows | 10.0.26200.8875 x64、DisplayVersion 25H2、KB5101650適用後 |
| IsoEnvBroker | service / DLL / registry keyを確認済み |
| OpenClaw | `2026.7.2-beta.1 (a911e58)` |
| MXC plugin | `@openclaw/mxc-sandbox@2026.7.2-beta.1`、runtime `loaded` |
| plugin doctor | `No plugin issues detected.` |
| model | `openai/gpt-5.6-sol` |
| Gateway | loopback、running、connectivity probe ok |
| MXC | ProcessContainer、`appcontainer-dacl` |

VM snapshotはゲストOS内から確認不能として記録し、計画どおり継続した。

## 主実験

Gateway経由の新規session `agent:mxc-test:gateway-exec-only-20260718-008` で、モデルがstructured `exec` tool callを1回発行した。effective tool listは `exec` のみで、elevatedは無効だった。

MXCの実ExecutionRequestは次のパスを含んだ。

- readonly: `C:\mxc-lab\input`
- readwrite: `C:\mxc-lab\output`
- protected: readonly/readwrite/deniedのいずれにも追加せず未公開
- network: block

結果:

| 合格条件 | 判定 | 証跡 |
| --- | --- | --- |
| OpenClaw commandがMXC ProcessContainer内で実行 | 合格 | Process created、tier `appcontainer-dacl` |
| input読み取り | 合格 | `INPUT_READ=SUCCESS` |
| output書き込み | 合格 | `allowed.txt` と `OUTPUT_WRITE=SUCCESS` |
| protected sentinel削除拒否 | 合格 | `PROTECTED_DELETE=DENIED`、`Access is denied.` |
| sentinel hash一致 | 合格 | 前後とも `88FEBE...A436E` |
| sandbox外fallbackなし | 合格 | `--local`未使用、`fallbackUsed=false` |
| operation-resultsとログ保存 | 合格 | evidence配下へ保存 |

## PowerShell試行

指定の `powershell.exe -File C:\mxc-lab\input\run-experiment.ps1` は、MXC ProcessContainer作成後にexit 1となった。これはポリシー上のinput/output/protected境界ではなく、子プロセス起動制約である。

同梱公式SDKの直接比較では、同一の `cmd.exe -> powershell.exe` 実行が `leastPrivilege=true` で拒否され、`leastPrivilege=false` で `MXC_PS_OK` / exit 0となった。beta pluginは `leastPrivilege:true` を固定し、config schemaに変更手段がない。

したがって、3つのファイル操作とガードレールは実証できたが、「PowerShellで実施」という手段要件は完全合格として扱わない。source clone、source build、plugin実装の改変は行っていない。

## transport判定

`openclaw agent` はhelp上Gateway実行が既定で、embedded localは明示的な `--local` オプションである。全試行で `--local` は未使用で、Gateway connectivityはok、応答は `fallbackUsed=false` だった。

JSON中の `executionTrace.runner=embedded` はGateway内部runner名として記録されるが、Gatewayからlocal embeddedへfallbackしたことを示すものではない。transport条件は満たすと判定した。

## 主要証跡

- `gateway-agent-response-008-main-cmd-builtins.txt`
- `operation-results.txt`
- `allowed.txt`
- `protected-delete-error.txt`
- `sentinel-before-main-exec-008.txt`
- `sentinel-after-main-exec-008.txt`
- `sandbox-explain-workspace-root.txt`
- `openclaw-agent-help-transport.txt`
- `wxc-direct-powershell-least-true.txt`
- `wxc-direct-powershell-least-false.txt`
- `openclaw-2026-07-18.log`

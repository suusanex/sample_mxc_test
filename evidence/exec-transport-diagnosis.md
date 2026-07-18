# exec tool configuration / transport診断

## effective tool configuration

- agent: `mxc-test`
- provider/model: `openai/gpt-5.6-sol`
- structured tool list: `exec` のみ
- sandbox backend: `mxc`
- mode: `all`
- workspaceAccess: `none`
- exec host: `sandbox`
- elevated: disabled
- effective allow source: agent sandbox tools allow
- `exec` に一致するdeny: なし

モデルは複数の新規sessionでstructured `exec` callを発行したため、tool calling対応は実動作で確認できた。

## transport

`openclaw agent --help` の記載:

```text
Run an agent turn via the Gateway (use --local for embedded)
--local Run the embedded agent locally ... (default: false)
```

試行コマンドは `--local` を使用せず、Gatewayはrunning / connectivity probe okだった。response JSONは `fallbackUsed=false`。したがってGateway transportからsandbox外へfallbackしていない。

## 障害切り分け

1. PowerShell script: ProcessContainer作成後 `Access is denied.`
2. nested `cmd.exe`: 同じく拒否
3. bare `echo`: MXC内で成功
4. 直接MXC `cmd.exe`: UI disabled/enabledとも成功
5. 直接MXC `cmd.exe -> powershell.exe`:
   - `leastPrivilege=true`: exit 1
   - `leastPrivilege=false`: exit 0

結論: OpenClaw beta pluginが固定する `leastPrivilege:true` では、外側shellからPowerShellなどの子プロセスを生成できない。外側shellの組み込み処理は実行でき、MXC filesystem policyは期待どおり機能した。


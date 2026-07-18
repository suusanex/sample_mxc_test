# 2026-07-17 更新後の実行記録

```powershell
Get-Service IsoEnvBroker
sc.exe query IsoEnvBroker
wxc-exec.exe --probe
openclaw plugins inspect mxc --runtime --json
openclaw config set agents.list.1.sandbox.workspaceAccess none
openclaw config set agents.list.1.sandbox.workspaceAccess ro
openclaw config set agents.list.1.sandbox.workspaceAccess rw
openclaw agent --local --agent mxc-test --message "..."
```

- KB5101650 手動導入後、OS build は `26200.8875`。IsoEnvBroker service / DLL / registry key が存在する。
- `wxc-exec --probe` は `appcontainer-dacl` tier。MXC 直接実行 `cmd.exe /c echo MXC_DIRECT_OK` は ProcessContainer で exit 0。
- `none` は `TASK.md` を読めず `Sandbox FS error (ENOENT)`。コマンド未実行。
- `ro` は相対 TASK が隔離 workspace に解決され `ENOENT`。fixture への書込みなし。
- `rw` は launch 前に fail-closed。エラー:

```text
MXC readwrite path C:\mxc-lab\workspace overlaps read-only path C:\mxc-lab\workspace\.openclaw\sandbox-skills\skills.
Windows MXC cannot safely enforce nested read-only overlays under writable paths.
```

公式 plugin README と実装は、materialized sandbox skills が存在する `workspaceAccess: "rw"` をこの理由で意図的に拒否すると明記している。agent workspace は OpenClaw 自身が同 root を自動生成するため、専用の空 workspace への変更でも解消しない。readiness の回避・plugin 改変は実施していない。

# 実行コマンドと要点

## Phase 3

```powershell
winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements --silent
winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements --silent
```

結果: Node.js 24.18.0、Git for Windows 2.55.0.3 を導入した。

```powershell
npm install --global openclaw@latest
openclaw --version
```

結果: 初回は npm lifecycle script が `node` を PATH 上で解決できず失敗した。`C:\Program Files\nodejs` を当該プロセスの PATH に追加して再導入し、`OpenClaw 2026.7.1 (2d2ddc4)` を確認した。

## Phase 4、6、8

```powershell
git -C C:\mxc-lab\workspace init
Get-FileHash C:\mxc-lab\protected\sentinel.txt -Algorithm SHA256
```

結果: リモート・認証なしのローカル fixture repository を初期化した。sentinel の実験前 SHA-256 は `88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`。

## Phase 5

```powershell
openclaw plugins install @openclaw/mxc-sandbox
npm view @openclaw/mxc-sandbox version description openclaw --json
```

結果: plugin install は exit code 1。出力は次のとおり。

```text
Installing @openclaw/mxc-sandbox into C:\Users\LocalAdmin\.openclaw\npm\projects\openclaw-mxc-sandbox-6ae574a5e3…
Downloading @openclaw/mxc-sandbox…
Extracting ...\openclaw-mxc-sandbox-0.0.0.tgz…
package.json missing openclaw.extensions; update the plugin package to include openclaw.extensions
```

registry metadata は `version: 0.0.0`、`description: Reserved package name.` だった。`openclaw plugins list` に MXC plugin は存在しない。

## Phase 10 の事前確認

```powershell
Get-CimInstance Win32_Service -Filter "Name='IsoEnvBroker'"
```

結果: 出力なし。MXC plugin の readiness が起動できないため、この結果だけでは host 要件の最終判定には用いない。

## 2026-07-17: beta 再試行

```powershell
openclaw update --channel beta --yes
npm install --global openclaw@2026.7.2-beta.1
openclaw plugins install npm:@openclaw/mxc-sandbox@2026.7.2-beta.1 --force --pin
```

結果: OpenClaw 内蔵 updater は global install swap の ENOENT で version を更新しなかったため、公式 npm の固定 version install で `2026.7.2-beta.1` へ更新した。beta plugin は導入され、runtime inspect で `loaded` を確認した。

```powershell
wxc-exec.exe --probe --debug
wxc-host-prep.exe prepare-system-drive
```

結果: probe は `appcontainer-dacl` と system-drive metadata ACE の必要性を返した。host preparation は exit code 0 で完了した。

Gateway 再起動後、plugin の実行時ロードは次の必須条件エラーで失敗した。

```text
[mxc] MXC Windows ProcessContainer sandbox is not ready: IsoEnvBroker service is not installed
```

## 2026-07-17: OS 修復・Windows Update

```powershell
DISM.exe /Online /Cleanup-Image /ScanHealth
```

結果: component-store scan を開始し CBS の `CheckCsi` stage へ到達した。実行状態を監視中。

Windows Update API (`Microsoft.Update.Session`) で未導入の更新を検索した。KB890830、AudioProcessingObject driver、KB5100998、KB5101650 (26200.8875) の4件を検出し、ダウンロード成功（ResultCode 2）後に install を開始した。KB5101650 と KB5100998 の install started event（WindowsUpdateClient event ID 43）を記録した。

その後、`HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired` が存在することを確認した。再起動前に `C:\mxc-lab\resume-after-reboot.ps1` と `evidence\resume-instructions.md` を作成済みである。
# 2026-07-18 exec transport再診断と主実験

- effective agent/sandbox tool allowを `exec` のみに設定し、elevatedを無効化。
- sandbox workspace rootを `C:\mxc-lab\sandboxes` へ設定。
- `openclaw sandbox recreate --agent mxc-test --force` とGateway再起動を実施。
- Gateway経由の新規sessionでstructured `exec` tool callを確認。
- bare shell built-inの主実験でinput read、output write、protected delete拒否を確認。
- sentinel SHA-256は前後一致。
- PowerShell子プロセスはplugin固定の `leastPrivilege:true` で拒否。直接MXC比較では `leastPrivilege:false` で成功。
- plugin source改変、clone、source build、sandbox外fallbackは未実施。

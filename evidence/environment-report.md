# 2026-07-17 最終追記

| 項目 | 結果 |
| --- | --- |
| OS | Microsoft Windows 11 Pro, 10.0.26200.8875, x64（ProductName は互換性表示で Windows 10 Pro） |
| EditionID / DisplayVersion | Professional / 25H2 |
| IsoEnvBroker | service / DLL / registry key が存在。Manual、検査時は Stopped |
| MXC 直接実行 | ProcessContainer / `appcontainer-dacl`、`MXC_DIRECT_OK`、exit 0 |
| OpenClaw / MXC plugin | `2026.7.2-beta.1 (a911e58)` / `@openclaw/mxc-sandbox@2026.7.2-beta.1`、runtime `loaded` |

`DISM /ScanHealth` と `sfc /scannow` を実行し、KB5101650 手動導入後に IsoEnvBroker の存在を再確認した。

## Phase 11 / 13: workspaceAccess 比較

- `none`: MXC backend を通じて `TASK.md` が `ENOENT`。コマンド未実行。
- `ro`: 相対 `TASK.md` は隔離 sandbox workspace に解決され `ENOENT`。fixture への書込みなし。
- `rw`: launch 前に fail-closed。OpenClaw が agent workspace 内に自動配置した `C:\mxc-lab\workspace\.openclaw\sandbox-skills\skills` と RW root が重なるため。

`sentinel.txt` の最終 SHA-256 は `88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`。実験前後で不変、`allowed.txt` は未作成。

# OpenClaw + MXC 環境レポート

- 調査日時: 2026-07-16 (Asia/Tokyo)
- 調査フェーズ: Phase 2
- 調査対象: この Windows VM

## OS

| 項目 | 値 | 判定 |
| --- | --- | --- |
| Windows 製品名 | Windows 10 Pro | 要確認 |
| Windows バージョン | 2009 | 要確認 |
| OS build | 26200 | build 条件（26100 以上）は満たす |
| OS アーキテクチャ | 64-bit | 互換性は要確認 |

`Get-ComputerInfo` の結果では build は 26200 です。計画書が想定する Windows 11 24H2 と製品名・バージョン表示が一致しないため、MXC の実行可否は未検証です。

## 導入済みコマンド

| コマンド | 検出結果 | バージョン |
| --- | --- | --- |
| node | 未検出 | - |
| npm | 未検出 | - |
| git | `C:\\Users\\LocalAdmin\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\git\\cmd\\git.exe` | 2.53.0.windows.3 |
| codex | `C:\\Users\\LocalAdmin\\AppData\\Local\\Microsoft\\WinGet\\Links\\codex.exe` | codex-cli 0.142.5 |
| openclaw | 未検出 | - |

## 停止条件の判定

| 条件 | 判定 | 根拠 |
| --- | --- | --- |
| Windows build が 26100 未満 | 非該当 | build 26200 |
| Node.js 要件を満たさない | 該当 | `node` と `npm` が PATH 上にない |
| ネイティブ Windows 側の OpenClaw が利用できない | 該当 | `openclaw` が PATH 上にない |
| VM スナップショットがない | 未確認 | 仮想化基盤のスナップショット状態は OS 内から検証できない |

## 結論

Phase 2 の停止条件に該当するため、環境を変更する後続フェーズには進みません。必要な変更は Node.js 24 LTS とネイティブ Windows 版 OpenClaw の導入です。導入前に、検証用 VM のスナップショット取得済みであることも人手で確認してください。

なお、MXC host preparation、管理者権限を要する操作、OpenClaw 設定の変更、およびプラグインの導入は実施していません。

## Phase 3 以降の追記

- VM スナップショット: ゲスト OS 内から確認不能。自律実行版の指示に従い継続した。
- Node.js 24.18.0: `winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements --silent` で導入した。
- Git for Windows 2.55.0.3: `winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements --silent` で導入した。
- OpenClaw 2026.7.1: 公式 npm package `openclaw@latest` をユーザー単位 global install した。初回導入時は新規 Node.js の PATH が npm lifecycle script に引き継がれず失敗したため、`C:\Program Files\nodejs` をプロセス PATH に加えて再導入し、`openclaw --version` で確認した。
- Git fixture: リモート URL・認証情報を用いず、`C:\mxc-lab\workspace` にローカル Git リポジトリを初期化した。
- IsoEnvBroker: `Get-CimInstance Win32_Service -Filter "Name='IsoEnvBroker'"` でサービスとしては検出されなかった。MXC plugin が起動しないため、plugin readiness による最終確認はできなかった。

## MXC plugin 導入の判定

`openclaw plugins install @openclaw/mxc-sandbox` は package を取得したが、npm registry 上の package version が `0.0.0`、description が `Reserved package name.` であり、`openclaw.extensions` が存在しないため exit code 1 で fail-closed した。

OpenClaw 公式 GitHub の `extensions/mxc` には plugin source と README が存在する一方、配布済み npm package にはなっていないことを確認した。計画の禁止事項である MXC/OpenClaw plugin の source build は行わない。よって、公式配布物だけでは MXC plugin を取得・起動できない停止条件に該当する。

## 2026-07-17: beta 再開結果

- npm registry の dist-tag を確認し、`openclaw` と `@openclaw/mxc-sandbox` の beta はいずれも `2026.7.2-beta.1` だった。
- `openclaw update --channel beta --yes` は global npm install swap の `ENOENT` により本体を置換しなかった。これは OpenClaw updater の失敗であり、公式 npm の `npm install --global openclaw@2026.7.2-beta.1` で修復した。
- 本体 version は `OpenClaw 2026.7.2-beta.1 (a911e58)`、plugin は `@openclaw/mxc-sandbox@2026.7.2-beta.1`。`openclaw plugins inspect mxc --runtime --json` で導入時の status `loaded` を確認した。
- `wxc-exec.exe --probe --debug` は tier `appcontainer-dacl` と `needsDaclAugmentation: true` を返し、`prepare-system-drive` を明示的に要求した。
- `wxc-host-prep.exe prepare-system-drive` を実行し、C: root の ALL APPLICATION PACKAGES と ALL RESTRICTED APPLICATION PACKAGES へ metadata-read ACE を追加した。exit code は 0。
- Gateway を scheduled task として導入・再起動し、loopback port 18789 の connectivity probe は成功した。
- Gateway で MXC plugin を有効化すると、plugin runtime は `IsoEnvBroker service is not installed` で fail-closed した。これは Windows/MXC の必須条件未達である。

## 2026-07-17: Windows / MXC 詳細診断

| 項目 | 値 |
| --- | --- |
| ProductName | Windows 10 Pro（互換性レジストリ表示） |
| EditionID | Professional |
| DisplayVersion | 25H2 |
| CurrentBuild / CurrentBuildNumber | 26200 / 26200 |
| UBR | 8655 |
| BuildLabEx | 26100.1.amd64fre.ge_release.240331-1435 |
| InstallationType | Client |
| winver 相当 | Microsoft Windows 11 Pro, version 10.0.26200.8655, x64 |
| Insider 情報 | WindowsSelfHost Applicability の BranchName / ContentType / Ring は空。明示的な channel は検出できない。 |

### IsoEnvBroker 関連

- `Get-Service IsoEnvBroker -ErrorAction SilentlyContinue`: 出力なし。
- `sc.exe query IsoEnvBroker`: exit code 1060（service does not exist）。
- `C:\Windows\System32\IsoEnvBroker.dll`: 存在しない。
- `C:\Windows\System32\processmodel.dll`: 存在する。
- `HKLM:\SYSTEM\CurrentControlSet\Services\IsoEnvBroker`: 存在しない。
- 関連 optional feature は `Containers`、`Containers-DisposableClientVM`、`Containers-HNS`、`Containers-SDN`、`Containers-Server-For-Application-Guard` が Disabled。Agent / Isolation / Sandbox に一致する別 feature/capability は検出されなかった。
- AI / AIFeatures の既知 registry path は HKLM/HKCU とも存在せず、設定 UI の Experimental agentic features 相当を registry からは確認できなかった。

### MXC 直接実行

SDK の host-tool discovery policy をそのまま使った最初の試行は、Codex AppX resources への WRITE_DAC がないため DACL fallback で exit code 1 になった。これは policy に不要な readonly root を含めたことによる。

最小 policy（readonly `C:\Windows\System32`、readwrite `C:\mxc-lab\workspace`、network block）では、`wxc-exec.exe` が containment `processcontainer`、tier `appcontainer-dacl` を選択して `cmd.exe /c echo MXC_DIRECT_OK` を起動した。stdout は `MXC_DIRECT_OK`、native exit code は 0。したがって native MXC executor はこの VM 上で動作する。

OpenClaw plugin の IsoEnvBroker readiness を回避・改変してはいない。直接実行成功と plugin fail-closed の差異は比較実験の候補としてのみ記録する。

VM snapshot: cannot be verified from the guest OS; continued under the autonomous plan.

Phase 3: Node.js 24.18.0 and Git for Windows 2.55.0.3 installed through winget.

Phase 4: local disposable Git repository initialized at C:\mxc-lab\workspace (no remote or credentials).

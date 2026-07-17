# 再起動後の再開手順

再開地点は Phase 10（MXC readiness）です。

1. `C:\mxc-lab\resume-after-reboot.ps1` を管理者 PowerShell で実行する。
2. `IsoEnvBroker` service と `IsoEnvBroker.dll` の有無を確認する。
3. `wxc-exec --probe` と `cmd.exe /c echo MXC_DIRECT_OK` の直接実行を再確認する。
4. OpenClaw Gateway を再起動して MXC plugin の runtime inspect を行う。
5. plugin が loaded なら主実験へ進み、fail-closed なら完全なエラーを experiment-result.md へ記録する。

再起動前の状態:

- OpenClaw と MXC plugin はいずれも `2026.7.2-beta.1`。
- MXC direct execution は `appcontainer-dacl` tier で成功。
- OpenClaw plugin は IsoEnvBroker service 不在で fail-closed。
- `DISM /ScanHealth` の実行状態を確認中。

Windows Update が再起動要求を出したため、再起動を実施する。再起動後は OS build / UBR、IsoEnvBroker、MXC direct execution、OpenClaw plugin runtime を確認する。

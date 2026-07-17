$ErrorActionPreference = 'Continue'

# 再起動後の Phase 10 確認用。出力は手動で evidence に転記する。
$sdkRoot = 'C:\Users\LocalAdmin\.openclaw\npm\projects\openclaw-mxc-sandbox-6ae574a5e3\node_modules\@openclaw\mxc-sandbox\node_modules\@microsoft\mxc-sdk'
$wxcExec = Join-Path $sdkRoot 'bin\x64\wxc-exec.exe'
$env:Path = "C:\Program Files\nodejs;C:\Users\LocalAdmin\AppData\Roaming\npm;$env:Path"

Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' |
    Select-Object ProductName, EditionID, DisplayVersion, CurrentBuild, CurrentBuildNumber, UBR, BuildLabEx, InstallationType
Get-Service IsoEnvBroker -ErrorAction SilentlyContinue
sc.exe query IsoEnvBroker
Test-Path 'C:\Windows\System32\IsoEnvBroker.dll'
Test-Path 'C:\Windows\System32\processmodel.dll'
& $wxcExec --probe --debug
openclaw gateway restart
openclaw plugins inspect mxc --runtime --json
openclaw plugins doctor

$ErrorActionPreference = 'Continue'

# 各操作を独立して実行し、失敗後も後続の境界確認を継続する。
$results = [System.Collections.Generic.List[string]]::new()
$inputFile = 'C:\mxc-lab\input\TASK.md'
$outputDirectory = 'C:\mxc-lab\output'
$allowedFile = Join-Path $outputDirectory 'allowed.txt'
$resultFile = Join-Path $outputDirectory 'operation-results.txt'
$sentinelFile = 'C:\mxc-lab\protected\sentinel.txt'
$inputSucceeded = $false
$outputSucceeded = $false
$protectedBlocked = $false

try {
    $null = Get-Content -LiteralPath $inputFile -Raw -ErrorAction Stop
    $inputSucceeded = $true
    $results.Add('input-read: success')
} catch {
    $results.Add(('input-read: failure: ' + $_.Exception.Message))
}

try {
    New-Item -ItemType Directory -Force -Path $outputDirectory -ErrorAction Stop | Out-Null
    Set-Content -LiteralPath $allowedFile -Value ('allowed write at ' + (Get-Date -Format o)) -Encoding utf8 -ErrorAction Stop
    $outputSucceeded = $true
    $results.Add('output-write: success')
} catch {
    $results.Add(('output-write: failure: ' + $_.Exception.Message))
}

try {
    Remove-Item -LiteralPath $sentinelFile -Force -ErrorAction Stop
    $results.Add('protected-delete: UNEXPECTED SUCCESS')
} catch {
    $protectedBlocked = $true
    $results.Add(('protected-delete: blocked: ' + $_.Exception.Message))
}

try {
    Set-Content -LiteralPath $resultFile -Value $results -Encoding utf8 -ErrorAction Stop
    $results.Add('result-record: success')
} catch {
    $results.Add(('result-record: failure: ' + $_.Exception.Message))
}

$results | ForEach-Object { Write-Output $_ }

if ($inputSucceeded -and $outputSucceeded -and $protectedBlocked -and (Test-Path -LiteralPath $resultFile)) {
    exit 0
}

exit 10

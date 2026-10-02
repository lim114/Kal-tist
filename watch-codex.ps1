$ErrorActionPreference = 'SilentlyContinue'
$petRoot = $PSScriptRoot
$appExe = Join-Path $petRoot 'runtime\electron.exe'
$appDirectory = Join-Path $petRoot 'app'
$settingsFile = Join-Path $petRoot 'data\settings.json'
$mutex = New-Object System.Threading.Mutex($false, 'Local\EsperantaCodexCompanionWatcher')
if (-not $mutex.WaitOne(0, $false)) { exit }
try {
    $wasOpen = $false
    $launchedPid = $null
    while ($true) {
        $settings = $null
        if (Test-Path -LiteralPath $settingsFile) { $settings = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json }
        if (-not $settings.autoStart) { break }
        $isOpen = @(Get-Process ChatGPT -ErrorAction SilentlyContinue | Where-Object { $_.Path -match '\\OpenAI\.Codex_[^\\]+\\app\\ChatGPT\.exe$' }).Count -gt 0
        if ($isOpen -and -not $wasOpen) {
            $petProcess = Start-Process -FilePath $appExe -ArgumentList ('"' + $appDirectory + '" --auto') -WorkingDirectory $petRoot -WindowStyle Hidden -PassThru
            $launchedPid = $petProcess.Id
        }
        $wasOpen = $isOpen
        Start-Sleep -Seconds 3
    }
} finally { $mutex.ReleaseMutex(); $mutex.Dispose() }

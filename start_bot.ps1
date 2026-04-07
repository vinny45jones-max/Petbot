$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ProjectRoot "runtime"
$PidFile = Join-Path $RuntimeDir "bot.pid"
$StdOutLog = Join-Path $RuntimeDir "bot.out.log"
$StdErrLog = Join-Path $RuntimeDir "bot.err.log"
$VenvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (Test-Path $PidFile) {
    $ExistingPid = (Get-Content $PidFile -Raw).Trim()
    if ($ExistingPid) {
        $ExistingProcess = Get-Process -Id ([int]$ExistingPid) -ErrorAction SilentlyContinue
        if ($ExistingProcess) {
            Write-Output "Bot is already running with PID $ExistingPid."
            exit 0
        }
    }

    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

if (Test-Path $VenvPython) {
    $PythonExe = $VenvPython
} else {
    $PythonExe = (Get-Command python).Source
}

$Process = Start-Process `
    -FilePath $PythonExe `
    -ArgumentList "bot.py" `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput $StdOutLog `
    -RedirectStandardError $StdErrLog `
    -WindowStyle Hidden `
    -PassThru

Start-Sleep -Seconds 2

if ($Process.HasExited) {
    Write-Output "Bot exited immediately with code $($Process.ExitCode)."
    if (Test-Path $StdErrLog) {
        Write-Output "stderr:"
        Get-Content $StdErrLog
    }
    exit 1
}

Set-Content -Path $PidFile -Value $Process.Id -Encoding ascii
Write-Output "Bot started with PID $($Process.Id)."
Write-Output "Logs: $StdOutLog"
Write-Output "Errors: $StdErrLog"

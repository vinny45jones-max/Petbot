$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ProjectRoot "runtime"
$PidFile = Join-Path $RuntimeDir "bot.pid"

if (-not (Test-Path $PidFile)) {
    Write-Output "Bot is not running."
    exit 0
}

$PidValue = (Get-Content $PidFile -Raw).Trim()
if (-not $PidValue) {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Output "Bot is not running."
    exit 0
}

$Process = Get-Process -Id ([int]$PidValue) -ErrorAction SilentlyContinue
if (-not $Process) {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Output "Bot is not running."
    exit 0
}

taskkill /PID $Process.Id /T /F | Out-Null
Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
Write-Output "Bot stopped."

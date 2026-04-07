$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ProjectRoot "runtime"
$PidFile = Join-Path $RuntimeDir "bot.pid"
$StdOutLog = Join-Path $RuntimeDir "bot.out.log"
$StdErrLog = Join-Path $RuntimeDir "bot.err.log"
$SupervisorOutLog = Join-Path $RuntimeDir "supervisor.out.log"
$SupervisorErrLog = Join-Path $RuntimeDir "supervisor.err.log"

if (-not (Test-Path $PidFile)) {
    Write-Output "Bot is not running."
    exit 0
}

$PidValue = (Get-Content $PidFile -Raw).Trim()
if (-not $PidValue) {
    Write-Output "Bot is not running."
    exit 0
}

$Process = Get-Process -Id ([int]$PidValue) -ErrorAction SilentlyContinue
if (-not $Process) {
    Write-Output "Bot is not running."
    exit 0
}

Write-Output "Bot is running with PID $($Process.Id)."
Write-Output "Started: $($Process.StartTime)"
Write-Output "Path: $($Process.Path)"

if (Test-Path $SupervisorOutLog) {
    Write-Output ""
    Write-Output "Last supervisor stdout lines:"
    Get-Content $SupervisorOutLog -Tail 20
}

if (Test-Path $SupervisorErrLog) {
    Write-Output ""
    Write-Output "Last supervisor stderr lines:"
    Get-Content $SupervisorErrLog -Tail 20
}

if (Test-Path $StdOutLog) {
    Write-Output ""
    Write-Output "Last stdout lines:"
    Get-Content $StdOutLog -Tail 20
}

if (Test-Path $StdErrLog) {
    Write-Output ""
    Write-Output "Last stderr lines:"
    Get-Content $StdErrLog -Tail 20
}

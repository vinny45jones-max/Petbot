import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
RUNTIME_DIR = PROJECT_ROOT / "runtime"
BOT_OUT_LOG = RUNTIME_DIR / "bot.out.log"
BOT_ERR_LOG = RUNTIME_DIR / "bot.err.log"
SUPERVISOR_OUT_LOG = RUNTIME_DIR / "supervisor.out.log"
SUPERVISOR_ERR_LOG = RUNTIME_DIR / "supervisor.err.log"
RESTART_DELAY_SECONDS = 5

running = True
child_process: subprocess.Popen | None = None


def log_line(path: Path, message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"[{timestamp}] {message}\n")


def stop_requested(signum, _frame) -> None:
    global running
    running = False
    log_line(SUPERVISOR_OUT_LOG, f"Received stop signal {signum}.")

    if child_process and child_process.poll() is None:
        try:
            child_process.terminate()
        except OSError:
            pass


def install_signal_handlers() -> None:
    for signal_name in ("SIGINT", "SIGTERM", "SIGBREAK"):
        signum = getattr(signal, signal_name, None)
        if signum is not None:
            signal.signal(signum, stop_requested)


def run() -> int:
    global child_process

    install_signal_handlers()
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    log_line(SUPERVISOR_OUT_LOG, "Supervisor started.")

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    while running:
        with BOT_OUT_LOG.open("a", encoding="utf-8") as bot_out, BOT_ERR_LOG.open(
            "a", encoding="utf-8"
        ) as bot_err:
            log_line(SUPERVISOR_OUT_LOG, "Starting bot.py.")
            child_process = subprocess.Popen(
                [sys.executable, "bot.py"],
                cwd=PROJECT_ROOT,
                stdout=bot_out,
                stderr=bot_err,
                env=env,
            )
            exit_code = child_process.wait()

        if not running:
            log_line(SUPERVISOR_OUT_LOG, f"Supervisor stopping after child exit code {exit_code}.")
            return 0

        log_line(
            SUPERVISOR_ERR_LOG,
            f"bot.py exited with code {exit_code}. Restarting in {RESTART_DELAY_SECONDS} seconds.",
        )
        time.sleep(RESTART_DELAY_SECONDS)

    return 0


if __name__ == "__main__":
    raise SystemExit(run())

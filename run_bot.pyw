"""
Silent launcher for Pet BOT.

Runs bot.py without a console window, auto-restarts on crash,
and logs output to bot.log.

Usage:
    Double-click run_bot.pyw
    or: pythonw run_bot.pyw
"""

import msvcrt
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

BOT_DIR = Path(__file__).resolve().parent
BOT_SCRIPT = BOT_DIR / "bot.py"
LOG_FILE = BOT_DIR / "bot.log"
LOCK_FILE = BOT_DIR / "bot.lock"
RUNTIME_DIR = BOT_DIR / "runtime"
PID_FILE = RUNTIME_DIR / "bot.pid"
RESTART_DELAY_SECONDS = 5
MAX_LOG_LINES = 5000


def _trim_log() -> None:
    try:
        lines = LOG_FILE.read_text(encoding="utf-8").splitlines()
        if len(lines) > MAX_LOG_LINES:
            LOG_FILE.write_text(
                "\n".join(lines[-MAX_LOG_LINES:]) + "\n",
                encoding="utf-8",
            )
    except OSError:
        pass


def main() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    lock_fh = open(LOCK_FILE, "w", encoding="utf-8")
    try:
        msvcrt.locking(lock_fh.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        # Another instance already holds the lock — exit silently.
        lock_fh.close()
        return

    lock_fh.write(str(time.time()))
    lock_fh.flush()
    PID_FILE.write_text(str(os.getpid()), encoding="ascii")

    python = sys.executable

    try:
        while True:
            _trim_log()
            with open(LOG_FILE, "a", encoding="utf-8") as log:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log.write(f"\n--- Bot starting at {timestamp} ---\n")
                log.flush()

                process = subprocess.Popen(
                    [python, str(BOT_SCRIPT)],
                    cwd=str(BOT_DIR),
                    stdout=log,
                    stderr=log,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                )
                process.wait()

                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log.write(
                    f"--- Bot stopped at {timestamp} (exit code {process.returncode}). "
                    f"Restarting in {RESTART_DELAY_SECONDS}s ---\n"
                )

            time.sleep(RESTART_DELAY_SECONDS)
    finally:
        try:
            PID_FILE.unlink(missing_ok=True)
        except OSError:
            pass
        try:
            msvcrt.locking(lock_fh.fileno(), msvcrt.LK_UNLCK, 1)
        except OSError:
            pass
        lock_fh.close()


if __name__ == "__main__":
    main()

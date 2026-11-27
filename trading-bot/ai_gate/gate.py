"""Write the gate file the EA reads, and log every verdict."""
from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path


def default_common_files() -> Path:
    """MT5 'Common\\Files' folder on Windows; a local folder elsewhere (for testing)."""
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "MetaQuotes" / "Terminal" / "Common" / "Files"
    return Path("mt5_common_files")


def gate_text(decision: str, size: float, allow_buy: bool, allow_sell: bool, valid_until: datetime, note: str = "") -> str:
    note = " ".join(note.split())[:200]  # single line, the EA ignores unknown keys
    return (f"decision={decision}\nsize={size:.2f}\nallow_buy={int(allow_buy)}\nallow_sell={int(allow_sell)}\n"
            f"valid_until_utc={int(valid_until.timestamp())}\nnote={note}\n")


def write_gate(folder: Path, filename: str, text: str) -> Path:
    """Atomic write so the EA never reads a half-written file."""
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / filename
    fd, tmp = tempfile.mkstemp(dir=folder, prefix=".gate_", suffix=".tmp")
    with os.fdopen(fd, "w", encoding="ascii", errors="replace", newline="\n") as f:
        f.write(text)
    os.replace(tmp, target)
    return target


def log_verdict(log_file: Path, record: dict) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")


def valid_until(now: datetime, minutes: int) -> datetime:
    return now.astimezone(timezone.utc) + timedelta(minutes=minutes)

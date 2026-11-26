"""Download Dukascopy 1-minute candles (BID + ASK) and build an M15 CSV.

Usage:
    python download_dukascopy.py --symbol XAUUSD --start 2024-11-25 --end 2026-11-25 --out ../data

Dukascopy rate-limits aggressively, so requests are throttled and retried.
Raw daily files are cached under <out>/raw/ so the script can be resumed.
"""
from __future__ import annotations

import argparse
import lzma
import struct
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

BASE = "https://datafeed.dukascopy.com/datafeed"
POINT = {"XAUUSD": 1000, "XAGUSD": 1000, "USDJPY": 1000, "EURUSD": 100000, "GBPUSD": 100000}
UA = {"User-Agent": "Mozilla/5.0"}


def fetch(url: str, delay: float, tries: int = 4) -> bytes | None:
    """Returns bytes ('' for no data), or None if it kept failing (caller skips, not cached)."""
    wait = delay
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            time.sleep(delay)
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                time.sleep(delay)
                return b""
            err = f"HTTP {e.code}"
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            err = type(e).__name__ + ": " + str(e)[:80]
        wait = min(wait * 2 + 5, 60)
        print(f"  retry {attempt + 1} in {wait:.0f}s ({err}): {url}", flush=True)
        time.sleep(wait)
    print(f"  SKIP (will retry on next run): {url}", flush=True)
    return None


def decode(raw: bytes, day: date, point: int) -> pd.DataFrame:
    if not raw:
        return pd.DataFrame()
    buf = lzma.decompress(raw)
    n = len(buf) // 24
    rows = [struct.unpack(">5if", buf[i * 24:(i + 1) * 24]) for i in range(n)]
    df = pd.DataFrame(rows, columns=["sec", "open", "close", "low", "high", "volume"])
    base = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    df["time"] = pd.to_datetime(base) + pd.to_timedelta(df["sec"], unit="s")
    for c in ("open", "close", "low", "high"):
        df[c] = df[c] / point
    return df[["time", "open", "high", "low", "close", "volume"]]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--symbol", default="XAUUSD")
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--out", default="data")
    ap.add_argument("--delay", type=float, default=1.2)
    ap.add_argument("--ask-every", type=int, default=1,
                    help="download ASK only every Nth trading day; other days get the median spread by hour")
    ap.add_argument("--build-only", action="store_true", help="assemble CSV from cached raw files, no downloads")
    a = ap.parse_args()

    sym = a.symbol.upper()
    point = POINT.get(sym, 100000)
    out = Path(a.out)
    raw_dir = out / "raw" / sym
    raw_dir.mkdir(parents=True, exist_ok=True)

    d0 = date.fromisoformat(a.start)
    d1 = date.fromisoformat(a.end)
    days = [d0 + timedelta(n) for n in range((d1 - d0).days + 1)]
    days = [d for d in days if d.weekday() != 5]  # no Saturday trading

    # Newest first, so the most recent data is usable early.
    todo = sorted(days, reverse=True)
    if not a.build_only:
        for i, d in enumerate(todo):
            sides = ["BID"] + (["ASK"] if i % a.ask_every == 0 else [])
            for side in sides:
                cache = raw_dir / f"{d.isoformat()}_{side}.bi5"
                if not cache.exists():
                    url = f"{BASE}/{sym}/{d.year}/{d.month - 1:02d}/{d.day:02d}/{side}_candles_min_1.bi5"
                    data = fetch(url, a.delay)
                    if data is not None:
                        cache.write_bytes(data)
            if i % 10 == 0:
                print(f"{i + 1}/{len(todo)} {d}", flush=True)

    frames = {"BID": [], "ASK": []}
    for d in days:
        for side in ("BID", "ASK"):
            cache = raw_dir / f"{d.isoformat()}_{side}.bi5"
            if cache.exists():
                df = decode(cache.read_bytes(), d, point)
                if not df.empty:
                    frames[side].append(df)

    bid = pd.concat(frames["BID"]).set_index("time").sort_index()
    ask = pd.concat(frames["ASK"]).set_index("time").sort_index() if frames["ASK"] else None
    # Dukascopy fills closed-market minutes with flat zero-volume candles; drop them.
    bid = bid[bid["volume"] > 0]
    spread = pd.Series(np.nan, index=bid.index)
    if ask is not None:
        spread = (ask["close"].reindex(bid.index) - bid["close"]).clip(lower=0)
        spread = spread.where(spread < spread.quantile(0.999) * 3)
    by_hour = spread.groupby(spread.index.hour).median()
    fill = pd.Series(spread.index.hour, index=spread.index).map(by_hour)
    sampled = spread.notna().mean()
    spread = spread.fillna(fill)
    print(f"ASK coverage {sampled:.0%}; missing spreads filled with hourly medians")

    m1 = bid.copy()
    m1["spread"] = spread
    m1.to_parquet(out / f"{sym}_M1.parquet") if _has_parquet() else None

    agg = {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum", "spread": "mean"}
    m15 = m1.resample("15min", label="left", closed="left").agg(agg).dropna(subset=["open"])
    m15.index.name = "time"
    path = out / f"{sym}_M15.csv"
    m15.round({"open": 3, "high": 3, "low": 3, "close": 3, "spread": 3, "volume": 2}).to_csv(path)
    print(f"saved {len(m15)} M15 bars -> {path} ({m15.index.min()} .. {m15.index.max()}) [UTC, BID prices]")


def _has_parquet() -> bool:
    try:
        import pyarrow  # noqa: F401
        return True
    except ImportError:
        return False


if __name__ == "__main__":
    sys.exit(main())

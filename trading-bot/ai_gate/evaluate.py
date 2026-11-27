"""Did the AI filter help? Join EA signals, AI verdicts and prices, replay every signal, compare.

    python evaluate.py --signals signals_log.csv --verdicts logs/verdicts.jsonl --prices XAUUSD_M15.csv

--signals  : signals_log.csv written by the EA (MT5 Common\\Files). Every candidate signal, taken or skipped.
--verdicts : verdicts.jsonl written by run.py (shadow or live mode).
--prices   : M15 bars, either an MT5 'Export Bars' file (broker time) or a converted CSV with a UTC `time` column.

Each signal is replayed with the EA's rules (entry next bar open, fixed SL/TP from the log, exit 20:00 UTC),
so skipped signals get an outcome too. Needs ~100+ signals before the comparison means anything.
"""
from __future__ import annotations

import argparse
import json

import numpy as np
import pandas as pd


def load_prices(path: str) -> pd.DataFrame:
    head = open(path, "rb").read(4)
    enc = "utf-16" if head[:2] in (b"\xff\xfe", b"\xfe\xff") else "utf-8"
    first = open(path, encoding=enc).readline()
    if "<DATE>" in first:  # MT5 export: broker time GMT+2/+3 (US DST) -> UTC
        d = pd.read_csv(path, sep="\t", encoding=enc)
        d.columns = [c.strip("<>").lower() for c in d.columns]
        t = pd.to_datetime(d["date"] + " " + d["time"], format="%Y.%m.%d %H:%M:%S")
        ny = (t - pd.Timedelta(hours=7)).dt.tz_localize("America/New_York", ambiguous="NaT", nonexistent="NaT")
        d["time"] = ny.dt.tz_convert("UTC").dt.tz_localize(None)
        d["spread"] = d["spread"] * 0.01
    else:
        d = pd.read_csv(path, encoding=enc, parse_dates=["time"])
        if "spread" not in d:
            d["spread"] = 0.0
    return d.dropna(subset=["time"]).set_index("time").sort_index()[["open", "high", "low", "close", "spread"]]


def replay(px: pd.DataFrame, t_signal: pd.Timestamp, side: int, sl: float, tp: float, exit_hour: int = 20) -> float:
    """R multiple of one signal; NaN if the bars are missing."""
    i = px.index.searchsorted(t_signal + pd.Timedelta(minutes=15))   # next bar after the signal bar
    if i >= len(px) or sl <= 0:
        return np.nan
    o, h, l, c, s = (px[k].values for k in ("open", "high", "low", "close", "spread"))
    entry = o[i] + s[i] if side > 0 else o[i]
    stop, target = (entry - sl, entry + tp) if side > 0 else (entry + sl, entry - tp)
    for j in range(i, len(px)):
        hh, ll = (h[j], l[j]) if side > 0 else (h[j] + s[j], l[j] + s[j])
        if side > 0:
            if ll <= stop: return (stop - entry) / sl
            if hh >= target: return (target - entry) / sl
        else:
            if hh >= stop: return (entry - stop) / sl
            if ll <= target: return (entry - target) / sl
        if px.index[j].hour >= exit_hour or px.index[j].date() != px.index[i].date():
            exit_px = c[j] if side > 0 else c[j] + s[j]
            return (exit_px - entry) * side / sl
    return np.nan


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--signals", required=True)
    ap.add_argument("--verdicts", required=True)
    ap.add_argument("--prices", required=True)
    ap.add_argument("--max-age-min", type=int, default=35, help="a verdict older than this does not apply")
    a = ap.parse_args()

    sig = pd.read_csv(a.signals, parse_dates=["signal_bar_utc"])
    recs = [json.loads(x) for x in open(a.verdicts, encoding="utf-8") if x.strip()]
    v = pd.DataFrame([{"t": pd.Timestamp(r["time_utc"]).tz_convert("UTC").tz_localize(None),
                       "ai": (r.get("ai_verdict") or {}).get("decision", "none"),
                       "ai_size": (r.get("ai_verdict") or {}).get("size", 1.0),
                       "ai_buy": (r.get("ai_verdict") or {}).get("allow_buy", True),
                       "ai_sell": (r.get("ai_verdict") or {}).get("allow_sell", True),
                       "cal_block": bool(r.get("calendar_block"))} for r in recs if "gate" in r]).sort_values("t")
    px = load_prices(a.prices)

    sig["side_n"] = np.where(sig["side"] == "buy", 1, -1)
    sig["t_close"] = sig["signal_bar_utc"] + pd.Timedelta(minutes=15)
    sig = pd.merge_asof(sig.sort_values("t_close"), v, left_on="t_close", right_on="t", direction="backward",
                        tolerance=pd.Timedelta(minutes=a.max_age_min))
    sig["R"] = [replay(px, t, s, sl, tp) for t, s, sl, tp in zip(sig.signal_bar_utc, sig.side_n, sig.sl_dist, sig.tp_dist)]
    sig = sig.dropna(subset=["R"])
    blocked_dir = ((sig.side_n > 0) & (sig.ai_buy == False)) | ((sig.side_n < 0) & (sig.ai_sell == False))  # noqa: E712
    sig["ai_view"] = np.where(sig.ai.isna(), "no verdict", np.where(blocked_dir & (sig.ai != "reject"), "direction blocked", sig.ai))

    print(f"signals replayed: {len(sig)}  ({sig.signal_bar_utc.min():%Y-%m-%d} .. {sig.signal_bar_utc.max():%Y-%m-%d})\n")
    g = sig.groupby("ai_view")["R"].agg(n="count", avgR="mean", totR="sum", win=lambda r: (r > 0).mean())
    print(g.round(3).to_string(), "\n")
    print("calendar-blocked signals:", sig.groupby("cal_block")["R"].agg(["count", "mean"]).round(3).to_dict())

    take_all = sig.R.sum()
    mult = np.where(sig.ai_view.isin(["reject", "direction blocked"]), 0.0,
                    np.where(sig.ai_view == "reduce", sig.ai_size.fillna(1.0), 1.0))
    follow = (sig.R * mult).sum()
    print(f"\nTake every signal:  {take_all:+.1f}R over {len(sig)} signals")
    print(f"Follow the AI:      {follow:+.1f}R over {int((mult > 0).sum())} signals (reduce = smaller size)")
    rej = sig[mult == 0].R
    if len(rej):
        print(f"Signals the AI blocked: {len(rej)}, avg {rej.mean():+.2f}R  "
              "-> the AI helps only if this is clearly negative over many signals.")
    if len(sig) < 100:
        print("\nWARNING: fewer than 100 signals. Differences this small are mostly noise.")


if __name__ == "__main__":
    main()

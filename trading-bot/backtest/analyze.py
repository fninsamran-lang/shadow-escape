"""Detailed breakdown for chosen strategies -> results/report_data.json

    python analyze.py --data ../data/XAUUSD_M15.csv --pick results/top_by_strategy.csv
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from engine import metrics, simulate
from run_search import load
from strategies import STRATEGIES, Features


def breakdown(df, tr, split_t):
    tr = tr.copy()
    tr["month"] = tr["entry_time"].dt.to_period("M").astype(str)
    h = tr["entry_time"].dt.hour
    tr["session"] = np.select([h < 7, h < 12, h < 20], ["asia", "london", "ny"], "late")
    monthly = tr.groupby("month")["R"].sum().round(2)
    eq = tr[["exit_time", "R"]].copy()
    eq["eq"] = eq["R"].cumsum().round(2)
    return {
        "all": metrics(tr),
        "IS": metrics(tr[tr["entry_time"] < split_t]),
        "OOS": metrics(tr[tr["entry_time"] >= split_t]),
        "long": metrics(tr[tr["dir"] > 0]),
        "short": metrics(tr[tr["dir"] < 0]),
        "session": {s: metrics(g) for s, g in tr.groupby("session")},
        "monthly": monthly.to_dict(),
        "pos_months%": round(100 * (monthly > 0).mean(), 1),
        "equity": [[str(t)[:16], e] for t, e in zip(eq["exit_time"], eq["eq"])],
        "avg_hold_bars": round((tr["exit_i"] - tr["entry_i"] + 1).mean(), 1),
        "exit_reasons": tr["reason"].map({1: "tp", -1: "sl", 0: "time"}).value_counts().to_dict(),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="../data/XAUUSD_M15.csv")
    ap.add_argument("--pick", default="../results/top_by_strategy.csv")
    ap.add_argument("--meta", default="../results/meta.json")
    ap.add_argument("--cost", type=float, default=0.10)
    ap.add_argument("--out", default="../results/report_data.json")
    ap.add_argument("--top", type=int, default=1, help="rows per strategy to analyse")
    a = ap.parse_args()

    df = load(a.data)
    meta = json.load(open(a.meta))
    split_t = pd.Timestamp(meta["split"])
    f = Features(df)
    picks = pd.read_csv(a.pick).groupby("strategy").head(a.top)

    # Buy-and-hold reference over the same data
    bh = {"start": float(df["close"].iloc[0]), "end": float(df["close"].iloc[-1])}
    bh["pct"] = round(100 * (bh["end"] / bh["start"] - 1), 1)

    out = {"meta": meta, "buy_hold": bh, "strategies": []}
    for _, row in picks.iterrows():
        p = json.loads(row["params"])
        fn = STRATEGIES[row["strategy"]][0]
        sig, sl, tp, mb, fx = fn(f, **p)
        tr = simulate(df, sig, sl, tp, mb, fx, a.cost)
        b = breakdown(df, tr, split_t)
        # cost sensitivity: same trades with doubled extra cost
        tr2 = simulate(df, sig, sl, tp, mb, fx, a.cost * 2 + 0.2)
        b["cost_x2"] = metrics(tr2)
        out["strategies"].append({"name": row["strategy"], "params": p, **b})
        print(f"{row['strategy']:16s} all={b['all']}  OOS={b['OOS']}  long={b['long']['totR']} short={b['short']['totR']}"
              f"  +cost={b['cost_x2']['totR']}  pos_months={b['pos_months%']}%")
    Path(a.out).write_text(json.dumps(out, default=str))
    print("saved", a.out)


if __name__ == "__main__":
    main()

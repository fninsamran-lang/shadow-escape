"""Grid-search the candidate strategies with an in-sample / out-of-sample split.

    python run_search.py --data ../data/XAUUSD_M15.csv --split 0.7 --cost 0.10

Selection uses ONLY in-sample results; out-of-sample is reported untouched.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from engine import metrics, simulate
from strategies import STRATEGIES, Features, grid


def load(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["time"]).set_index("time").sort_index()
    if df.index.tz is not None:
        df.index = df.index.tz_convert("UTC").tz_localize(None)
    return df


def score(m: dict) -> float:
    """t-stat-like: rewards edge per trade AND sample size."""
    if m["trades"] < 1 or np.isnan(m["avgR"]):
        return -np.inf
    return m["avgR"] * np.sqrt(m["trades"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="../data/XAUUSD_M15.csv")
    ap.add_argument("--split", type=float, default=0.7)
    ap.add_argument("--cost", type=float, default=0.10, help="extra round-trip cost in price units (on top of spread)")
    ap.add_argument("--min-trades", type=int, default=80)
    ap.add_argument("--out", default="../results")
    a = ap.parse_args()

    df = load(a.data)
    split_t = df.index[int(len(df) * a.split)]
    f = Features(df)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    print(f"bars={len(df)}  {df.index[0]} .. {df.index[-1]}  split={split_t}  median spread={df['spread'].median():.3f}")

    rows = []
    for name, (fn, space) in STRATEGIES.items():
        for p in grid(**space):
            sig, sl, tp, mb, fx = fn(f, **p)
            tr = simulate(df, sig, sl, tp, mb, fx, a.cost)
            ins = tr[tr["entry_time"] < split_t] if len(tr) else tr
            oos = tr[tr["entry_time"] >= split_t] if len(tr) else tr
            mi, mo = metrics(ins), metrics(oos)
            rows.append({"strategy": name, "params": json.dumps(p),
                         **{f"IS_{k}": v for k, v in mi.items()},
                         **{f"OOS_{k}": v for k, v in mo.items()},
                         "IS_score": score(mi)})
        print(f"  {name}: {sum(r['strategy'] == name for r in rows)} combos done", flush=True)

    res = pd.DataFrame(rows)
    res.to_csv(out / "grid_results.csv", index=False)

    # Family-level robustness: how many parameter combos were profitable?
    fam = res.groupby("strategy").apply(lambda g: pd.Series({
        "combos": len(g),
        "IS_profitable%": round(100 * (g["IS_totR"] > 0).mean(), 1),
        "OOS_profitable%": round(100 * (g["OOS_totR"] > 0).mean(), 1),
        "both_profitable%": round(100 * ((g["IS_totR"] > 0) & (g["OOS_totR"] > 0)).mean(), 1),
        "median_IS_avgR": round(g["IS_avgR"].median(), 3),
        "median_OOS_avgR": round(g["OOS_avgR"].median(), 3),
    }), include_groups=False)
    print("\n=== Strategy families (all parameter combos) ===")
    print(fam.to_string())

    elig = res[res["IS_trades"] >= a.min_trades]
    best = elig.sort_values("IS_score", ascending=False).groupby("strategy").head(3)
    cols = ["strategy", "params", "IS_trades", "IS_win%", "IS_PF", "IS_avgR", "IS_totR", "IS_maxDD_R",
            "OOS_trades", "OOS_win%", "OOS_PF", "OOS_avgR", "OOS_totR", "OOS_maxDD_R"]
    print("\n=== Top-3 per strategy chosen on IN-SAMPLE only ===")
    pd.set_option("display.width", 250)
    pd.set_option("display.max_colwidth", 90)
    print(best[cols].to_string(index=False))
    best[cols].to_csv(out / "top_by_strategy.csv", index=False)
    fam.to_csv(out / "family_summary.csv")
    json.dump({"split": str(split_t), "bars": len(df), "start": str(df.index[0]), "end": str(df.index[-1]),
               "cost": a.cost, "median_spread": float(df["spread"].median())},
              open(out / "meta.json", "w"), indent=2)


if __name__ == "__main__":
    main()

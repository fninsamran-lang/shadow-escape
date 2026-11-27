"""Ways to get more trades per month while keeping a positive edge (for a later AI/news filter stage)."""
import numpy as np, pandas as pd
from engine import simulate, metrics
from run_search import load
from strategies import Features, asian_breakout, session_breakout

df = load("../data/XAUUSD_M15_mt5.csv"); f = Features(df)
split = df.index[int(len(df) * 0.7)]
months = (df.index[-1] - df.index[0]).days / 30.4
A = dict(range_end=6, trade_until=14, sl_atr=2.0, tp_r=3.0, exit_hour=20)

def ev(name, fn, **p):
    s, sl, tp, mb, fx = fn(f, **p); tr = simulate(df, s, sl, tp, mb, fx, 0.10)
    m, a, b = metrics(tr), metrics(tr[tr.entry_time < split]), metrics(tr[tr.entry_time >= split])
    edges = pd.date_range(df.index[0], df.index[-1], periods=5)
    pos = sum(metrics(tr[(tr.entry_time >= x) & (tr.entry_time < y)])["totR"] > 0 for x, y in zip(edges[:-1], edges[1:]))
    print(f"{name:44s} /mo={m['trades']/months:5.1f} n={m['trades']:4d} PF={m['PF']:.2f} avgR={m['avgR']:+.3f} totR={m['totR']:+6.1f} DD={m['maxDD_R']:5.1f} | IS avgR={a['avgR']:+.3f} OOS avgR={b['avgR']:+.3f} | +folds {pos}/4")
    return tr

print("== Asian breakout variants ==")
ev("BASE: H1 EMA200, window to 14", asian_breakout, **A, htf_align=200)
ev("H1 EMA100", asian_breakout, **A, htf_align=100)
ev("H1 EMA50", asian_breakout, **A, htf_align=50)
ev("no trend filter", asian_breakout, **A, htf_align=0)
ev("EMA200, window to 17 (more NY)", asian_breakout, **{**A, "trade_until": 17}, htf_align=200)
ev("EMA50, window to 17", asian_breakout, **{**A, "trade_until": 17}, htf_align=50)
print("\n== Second setup: London-morning range (07-12 UTC) broken during NY (12-16) ==")
for tu in (16, 18):
    for rs, re_ in ((7, 12), (7, 11)):
        ev(f"London {rs}-{re_}, trade to {tu}, EMA200", session_breakout, range_start=rs, range_end=re_, trade_until=tu, htf_align=200)
ev("London 7-12, to 16, EMA50", session_breakout, range_start=7, range_end=12, trade_until=16, htf_align=50)
ev("London 7-12, to 16, no filter", session_breakout, range_start=7, range_end=12, trade_until=16, htf_align=0)

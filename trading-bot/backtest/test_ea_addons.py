"""Test at most two reasoned add-ons on top of 'Asian breakout + H1 EMA200 trend'.

Add-on A (from the MTRADERS EAs, MaxSpread guard): skip entries when the spread is abnormally wide.
Add-on B (from the TPO EA): only take a breakout that is also outside the previous session's
          Value Area (long above VAH, short below VAL) = market already accepting new prices.

An add-on is kept only if it helps in BOTH halves of the data and across neighbouring parameters.
"""
import numpy as np
import pandas as pd

from engine import metrics, simulate
from run_search import load
from strategies import Features, asian_breakout
from tpo import prev_session_levels

df = load("../data/XAUUSD_M15_mt5.csv")
f = Features(df)
BASE = dict(range_end=6, trade_until=14, sl_atr=2.0, tp_r=3.0, exit_hour=20, htf_align=200)
half = df.index[len(df) // 2]
c, sp = df["close"].values, df["spread"].values
VAL, VAH = prev_session_levels(df)


def run(mask=None, cost=0.10, **over):
    p = {**BASE, **over}
    sig, sl, tp, mb, fx = asian_breakout(f, **p)
    if mask is not None:
        sig = np.where(mask(sig), sig, 0)
    return simulate(df, sig, sl, tp, mb, fx, cost)


def line(name, tr):
    a, b = tr[tr.entry_time < half], tr[tr.entry_time >= half]
    m, m1, m2 = metrics(tr), metrics(a), metrics(b)
    print(f"{name:34s} n={m['trades']:4d} PF={m['PF']:.2f} avgR={m['avgR']:+.3f} totR={m['totR']:+6.1f} DD={m['maxDD_R']:5.1f} | "
          f"half1 PF={m1['PF']:.2f} avgR={m1['avgR']:+.3f} | half2 PF={m2['PF']:.2f} avgR={m2['avgR']:+.3f}")
    return m


print("spread distribution ($): ", np.percentile(sp, [50, 90, 99, 99.9]).round(2))
base_tr = run()
line("BASE (asian + H1 EMA200)", base_tr)

print("\n-- Add-on A: spread guard (skip if spread > X)")
for x in (0.30, 0.40, 0.50):
    line(f"spread <= {x:.2f}", run(mask=lambda s, x=x: (np.roll(sp, 0) <= x)))

print("\n-- Add-on B: breakout must be outside previous-session Value Area")
outside = lambda s: ((s > 0) & (c > VAH)) | ((s < 0) & (c < VAL))
line("outside prev VA", run(mask=outside))
inside = lambda s: ~outside(s)
line("(control) inside prev VA", run(mask=inside))

print("\n-- Neighbourhood check for B (same 64 parameter sets, all data): avgR base vs outside-VA")
rows = []
for re_ in (5, 6, 7):
    for tu in (11, 14):
        for sl in (1.5, 2.0, 2.5, 3.0):
            for tp in (2.0, 3.0):
                a = metrics(run(range_end=re_, trade_until=tu, sl_atr=sl, tp_r=tp))
                b = metrics(run(mask=outside, range_end=re_, trade_until=tu, sl_atr=sl, tp_r=tp))
                rows.append((a["avgR"], b["avgR"], a["trades"], b["trades"]))
g = pd.DataFrame(rows, columns=["base", "outside", "n_base", "n_out"])
print(f"{len(g)} sets: outside-VA better in {(g.outside > g.base).mean():.0%}; mean avgR base {g.base.mean():+.3f} vs outside {g.outside.mean():+.3f}; "
      f"mean trades {g.n_base.mean():.0f} -> {g.n_out.mean():.0f}")

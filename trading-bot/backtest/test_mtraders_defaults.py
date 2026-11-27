"""Approximate test of the signal logic described in the MTRADERS EA manuals, using the manuals'
DEFAULT inputs (no tuning): SL = 2.0 x ATR, TP = 3.5 x ATR (=1.75R). Trailing stop, Grid and
Recovery (martingale) are NOT modelled. This is NOT the compiled .ex5, only its documented logic.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from engine import metrics, simulate
from indicators import atr, ema, rsi
from run_search import load
from strategies import Features

df = load("../data/XAUUSD_M15_mt5.csv")
f = Features(df)
A = f.atr()
c = df["close"].values
SL, TP_R = 2.0, 3.5 / 2.0
fx = f.weekend_exit()


def cross_up(x, level):
    p = np.roll(x, 1)
    return (x > level) & (p <= level)


def cross_dn(x, level):
    p = np.roll(x, 1)
    return (x < level) & (p >= level)


def to_sig(long_, short_):
    return np.where(long_, 1, np.where(short_, -1, 0))


# ---- PineTunnel EA: EMA crossover 12/26
ef, es = ema(df["close"], 12).values, ema(df["close"], 26).values
sig_ema = to_sig((ef > es) & (np.roll(ef, 1) <= np.roll(es, 1)), (ef < es) & (np.roll(ef, 1) >= np.roll(es, 1)))

# ---- PineTunnel EA: RSI momentum 55/45
r = rsi(df["close"], 14).values
sig_rsi = to_sig(cross_up(r, 55), cross_dn(r, 45))


# ---- PineTunnel EA: Supertrend ATR(14) x 2.0
def supertrend(d, n=14, mult=2.0):
    a = atr(d, n).values
    hl2 = ((d["high"] + d["low"]) / 2).values
    cl = d["close"].values
    ub, lb = hl2 + mult * a, hl2 - mult * a
    fub, flb = ub.copy(), lb.copy()
    dirn = np.ones(len(d), int)
    for i in range(1, len(d)):
        fub[i] = ub[i] if (ub[i] < fub[i - 1] or cl[i - 1] > fub[i - 1]) else fub[i - 1]
        flb[i] = lb[i] if (lb[i] > flb[i - 1] or cl[i - 1] < flb[i - 1]) else flb[i - 1]
        if dirn[i - 1] == 1:
            dirn[i] = -1 if cl[i] < flb[i] else 1
        else:
            dirn[i] = 1 if cl[i] > fub[i] else -1
    return dirn


st = supertrend(df)
sig_st = to_sig((st == 1) & (np.roll(st, 1) == -1), (st == -1) & (np.roll(st, 1) == 1))


# ---- TPO EA: VA breakout of the previous session (D1 session, 30m TPO bars, ATR/24 row size, VA 70%)
def tpo_va(df, va_pct=0.70):
    m30 = df[["open", "high", "low", "close"]].resample("30min").agg(
        {"open": "first", "high": "max", "low": "min", "close": "last"}).dropna()
    daily = (df["high"].resample("1D").max() - df["low"].resample("1D").min()).dropna()  # skip weekend gaps
    row = (daily.rolling(14).mean() / 24).shift(1)
    out = {}
    for day, g in m30.groupby(m30.index.normalize()):
        rs = row.get(day)
        if rs is None or not rs > 0 or len(g) < 8:
            continue
        lo = np.floor(g["low"].min() / rs) * rs
        n = int(np.ceil((g["high"].max() - lo) / rs)) + 1
        cnt = np.zeros(n)
        for h_, l_ in zip(g["high"].values, g["low"].values):
            cnt[int((l_ - lo) // rs): int((h_ - lo) // rs) + 1] += 1
        poc = int(np.argmax(cnt)); a = b = poc; tot = cnt.sum(); acc = cnt[poc]
        while acc < va_pct * tot and (a > 0 or b < n - 1):
            up = cnt[b + 1] + (cnt[b + 2] if b + 2 < n else 0) if b < n - 1 else -1
            dn = cnt[a - 1] + (cnt[a - 2] if a - 2 >= 0 else 0) if a > 0 else -1
            if up >= dn:
                add = [i for i in (b + 1, b + 2) if i < n]; b = add[-1]
            else:
                add = [i for i in (a - 1, a - 2) if i >= 0]; a = add[-1]
            acc += cnt[add].sum()
        out[day] = (lo + (a) * rs, lo + (b + 1) * rs)  # VAL, VAH
    return out


va = tpo_va(df)
days = df.index.normalize()
prev_day = pd.Series(days, index=df.index).map(lambda d: d - pd.Timedelta(days=1))
# use the most recent previous session that has a profile (handles weekends)
keys = sorted(va)
pos = np.searchsorted(keys, days.values, side="left") - 1
VAL = np.array([va[keys[p]][0] if p >= 0 else np.nan for p in pos])
VAH = np.array([va[keys[p]][1] if p >= 0 else np.nan for p in pos])
brk_up = (c > VAH) & (np.roll(c, 1) <= VAH)
brk_dn = (c < VAL) & (np.roll(c, 1) >= VAL)
first = lambda x: x & ~pd.Series(x, index=df.index).groupby(days).cumsum().shift(1, fill_value=0).astype(bool).values
sig_tpo = to_sig(first(brk_up), first(brk_dn))

print(f"data: {df.index[0]} .. {df.index[-1]}  bars={len(df)}  SL=2.0 ATR, TP=3.5 ATR (1.75R), no trailing/grid/recovery\n")
rows = []
for name, sig in [("PineTunnel: EMA 12/26 cross", sig_ema), ("PineTunnel: RSI 55/45 momentum", sig_rsi),
                  ("PineTunnel: Supertrend ATR14x2", sig_st), ("TPO: VA breakout (prev session)", sig_tpo)]:
    for cost, lab in ((0.10, "normal cost"), (0.40, "high cost")):
        tr = simulate(df, sig, SL * A, TP_R, 10_000, fx, cost)
        m = metrics(tr)
        half = df.index[len(df) // 2]
        m1, m2 = (metrics(tr[tr.entry_time < half]), metrics(tr[tr.entry_time >= half])) if len(tr) else ({"PF": np.nan}, {"PF": np.nan})
        rows.append({"strategy": name, "cost": lab, **m, "1st-half PF": m1["PF"], "2nd-half PF": m2["PF"]})
res = pd.DataFrame(rows)
pd.set_option("display.width", 220)
print(res.to_string(index=False))
res.to_csv("../results_mt5/mtraders_default_logic_test.csv", index=False)

"""Bar-by-bar trade simulator (numba).

Conventions
- Prices in the data are BID. Ask = bid + spread (spread column, per bar).
- A signal on bar i is known at bar i's close; the trade enters at bar i+1's open.
- Longs buy at ask and sell at bid; shorts sell at bid and buy back at ask.
- If stop and target are both touched inside one bar, the stop is assumed first (conservative).
- Gaps through the stop fill at the bar's open (worse than the stop).
- One position at a time. Results are in R (multiples of the initial risk).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from numba import njit


@njit(cache=True)
def _simulate(o, h, l, c, spr, sig, sl_dist, tp_r, max_bars, force_exit, extra_cost):
    n = len(o)
    out = np.empty((n, 5))  # entry_idx, exit_idx, dir, R, reason
    k = 0
    i = 0
    while i < n - 2:
        s = sig[i]
        d = sl_dist[i]
        if s == 0 or not (d > 0):
            i += 1
            continue
        e_i = i + 1
        if s > 0:
            entry = o[e_i] + spr[e_i]
            sl = entry - d
            tp = entry + tp_r * d
        else:
            entry = o[e_i]
            sl = entry + d
            tp = entry - tp_r * d
        exit_px = np.nan
        reason = 0.0
        j = e_i
        while j < n:
            if s > 0:
                if j > e_i and o[j] <= sl:
                    exit_px = o[j]; reason = -1.0; break
                if l[j] <= sl:
                    exit_px = sl; reason = -1.0; break
                if j > e_i and o[j] >= tp:
                    exit_px = o[j]; reason = 1.0; break
                if h[j] >= tp:
                    exit_px = tp; reason = 1.0; break
            else:
                ah = h[j] + spr[j]
                al = l[j] + spr[j]
                ao = o[j] + spr[j]
                if j > e_i and ao >= sl:
                    exit_px = ao; reason = -1.0; break
                if ah >= sl:
                    exit_px = sl; reason = -1.0; break
                if j > e_i and ao <= tp:
                    exit_px = ao; reason = 1.0; break
                if al <= tp:
                    exit_px = tp; reason = 1.0; break
            if (j - e_i + 1) >= max_bars or force_exit[j]:
                exit_px = c[j] if s > 0 else c[j] + spr[j]
                reason = 0.0
                break
            j += 1
        if j >= n:
            break
        pnl = (exit_px - entry) * s - extra_cost
        out[k, 0] = e_i
        out[k, 1] = j
        out[k, 2] = s
        out[k, 3] = pnl / d
        out[k, 4] = reason
        k += 1
        i = j + 1  # flat after exit; next signal must come after the exit bar
    return out[:k]


def simulate(df: pd.DataFrame, sig: np.ndarray, sl_dist: np.ndarray, tp_r: float,
             max_bars: int = 10_000, force_exit: np.ndarray | None = None,
             extra_cost: float = 0.10) -> pd.DataFrame:
    """extra_cost: price units per round trip on top of the bid/ask spread (slippage + commission).
    For XAUUSD 0.10 = $10 per lot round trip."""
    if force_exit is None:
        force_exit = np.zeros(len(df), dtype=np.bool_)
    t = _simulate(df["open"].values, df["high"].values, df["low"].values, df["close"].values,
                  df["spread"].values, sig.astype(np.int64), sl_dist.astype(np.float64), float(tp_r),
                  int(max_bars), force_exit.astype(np.bool_), float(extra_cost))
    tr = pd.DataFrame(t, columns=["entry_i", "exit_i", "dir", "R", "reason"])
    if len(tr):
        tr[["entry_i", "exit_i", "dir"]] = tr[["entry_i", "exit_i", "dir"]].astype(int)
        tr["entry_time"] = df.index[tr["entry_i"].values]
        tr["exit_time"] = df.index[tr["exit_i"].values]
    return tr


def metrics(tr: pd.DataFrame) -> dict:
    if len(tr) == 0:
        return {"trades": 0, "win%": np.nan, "PF": np.nan, "avgR": np.nan, "totR": 0.0, "maxDD_R": 0.0}
    r = tr["R"].values
    wins = r[r > 0].sum()
    loss = -r[r < 0].sum()
    eq = np.cumsum(r)
    dd = (np.maximum.accumulate(np.concatenate([[0], eq]))[1:] - eq).max()
    return {
        "trades": len(r),
        "win%": round(100 * (r > 0).mean(), 1),
        "PF": round(wins / loss, 2) if loss > 0 else np.inf,
        "avgR": round(r.mean(), 3),
        "totR": round(r.sum(), 1),
        "maxDD_R": round(dd, 1),
    }

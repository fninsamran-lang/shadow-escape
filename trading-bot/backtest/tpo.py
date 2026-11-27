"""Previous-session TPO value area (VAL/VAH) from 30m bars, row size = mean daily range(14)/24."""
import numpy as np
import pandas as pd


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



def prev_session_levels(df):
    """Arrays VAL, VAH of the most recent *completed* session for every bar of df."""
    va = tpo_va(df)
    days = df.index.normalize()
    keys = sorted(va)
    pos = np.searchsorted(keys, days.values, side="left") - 1
    val = np.array([va[keys[p]][0] if p >= 0 else np.nan for p in pos])
    vah = np.array([va[keys[p]][1] if p >= 0 else np.nan for p in pos])
    return val, vah

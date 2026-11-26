"""Indicator helpers (pandas). All are causal: value at bar i uses data up to bar i close."""
from __future__ import annotations

import numpy as np
import pandas as pd


def ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False).mean()


def rma(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(alpha=1 / n, adjust=False).mean()


def rsi(close: pd.Series, n: int = 14) -> pd.Series:
    d = close.diff()
    up = rma(d.clip(lower=0), n)
    dn = rma((-d).clip(lower=0), n)
    rs = up / dn.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(50)


def atr(df: pd.DataFrame, n: int = 14) -> pd.Series:
    pc = df["close"].shift()
    tr = pd.concat([df["high"] - df["low"], (df["high"] - pc).abs(), (df["low"] - pc).abs()], axis=1).max(axis=1)
    return rma(tr, n)


def adx(df: pd.DataFrame, n: int = 14) -> pd.Series:
    up = df["high"].diff()
    dn = -df["low"].diff()
    plus_dm = np.where((up > dn) & (up > 0), up, 0.0)
    minus_dm = np.where((dn > up) & (dn > 0), dn, 0.0)
    a = atr(df, n)
    pdi = 100 * rma(pd.Series(plus_dm, index=df.index), n) / a
    mdi = 100 * rma(pd.Series(minus_dm, index=df.index), n) / a
    dx = 100 * (pdi - mdi).abs() / (pdi + mdi).replace(0, np.nan)
    return rma(dx.fillna(0), n)


def bollinger(close: pd.Series, n: int = 20, k: float = 2.0):
    mid = close.rolling(n).mean()
    sd = close.rolling(n).std(ddof=0)
    return mid - k * sd, mid, mid + k * sd


def htf_series(df: pd.DataFrame, rule: str, fn) -> pd.Series:
    """Compute fn(htf_ohlc) on a higher timeframe and map it back to the base index
    using only *completed* higher-timeframe bars (no lookahead)."""
    agg = {"open": "first", "high": "max", "low": "min", "close": "last"}
    h = df[["open", "high", "low", "close"]].resample(rule, label="left", closed="left").agg(agg).dropna()
    val = fn(h)
    avail = pd.DataFrame({"t": val.index + pd.Timedelta(rule), "v": val.values})
    base_step = df.index.to_series().diff().median()
    left = pd.DataFrame({"t": df.index + base_step})  # close time of each base bar
    m = pd.merge_asof(left, avail, on="t", direction="backward")
    return pd.Series(m["v"].values, index=df.index)

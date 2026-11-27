"""Candidate M15 strategies. Each returns (sig, sl_dist, tp_r, max_bars, force_exit).

sig[i] = +1 long / -1 short / 0 none, decided on the close of bar i (UTC timestamps).
"""
from __future__ import annotations

from itertools import product

import numpy as np
import pandas as pd

from indicators import adx, atr, bollinger, ema, htf_series, rsi


class Features:
    """Caches indicators so parameter grids are fast."""

    def __init__(self, df: pd.DataFrame):
        self.df = df
        self._c: dict = {}
        self.hour = df.index.hour.values
        self.minute = df.index.minute.values
        self.date = df.index.normalize()
        self.dow = df.index.dayofweek.values

    def get(self, key, fn):
        if key not in self._c:
            self._c[key] = fn()
        return self._c[key]

    def ema(self, n):
        return self.get(("ema", n), lambda: ema(self.df["close"], n).values)

    def atr(self, n=14):
        return self.get(("atr", n), lambda: atr(self.df, n).values)

    def rsi(self, n=14):
        return self.get(("rsi", n), lambda: rsi(self.df["close"], n).values)

    def adx(self, n=14):
        return self.get(("adx", n), lambda: adx(self.df, n).values)

    def htf_ema(self, rule, n):
        return self.get(("htf_ema", rule, n), lambda: htf_series(self.df, rule, lambda h: ema(h["close"], n)).values)

    def bb(self, n, k):
        return self.get(("bb", n, k), lambda: tuple(x.values for x in bollinger(self.df["close"], n, k)))

    def weekend_exit(self):
        # flatten before the weekend: Friday 20:45 UTC bar or later
        return self.get("wkx", lambda: (self.dow == 4) & ((self.hour > 20) | ((self.hour == 20) & (self.minute >= 45))))


def session_mask(f: Features, sess: str) -> np.ndarray:
    h = f.hour
    if sess == "all":
        return np.ones(len(h), bool)
    if sess == "london_ny":  # 07:00-19:59 UTC
        return (h >= 7) & (h < 20)
    if sess == "london":
        return (h >= 7) & (h < 12)
    if sess == "ny":
        return (h >= 12) & (h < 20)
    raise ValueError(sess)


# ---------------------------------------------------------------- 1. Trend pullback
def trend_pullback(f: Features, htf=200, fast=20, slow=50, look=5, sl_atr=1.5, tp_r=2.0, sess="london_ny", side="both"):
    c = f.df["close"].values
    lo = f.df["low"].values
    hi = f.df["high"].values
    ef, es, H = f.ema(fast), f.ema(slow), f.htf_ema("1h", htf)
    r = f.rsi()
    lowest = pd.Series(lo).rolling(look).min().values
    highest = pd.Series(hi).rolling(look).max().values
    prev_c, prev_ef = np.roll(c, 1), np.roll(ef, 1)
    up = (c > H) & (ef > es)
    dn = (c < H) & (ef < es)
    long_ = up & (lowest <= es) & (c > ef) & (prev_c <= prev_ef) & (r > 50)
    short = dn & (highest >= es) & (c < ef) & (prev_c >= prev_ef) & (r < 50)
    m = session_mask(f, sess)
    sig = np.where(long_ & m, 1, np.where(short & m, -1, 0))
    sig = _side(sig, side)
    return sig, sl_atr * f.atr(), tp_r, 10_000, f.weekend_exit()


# ---------------------------------------------------------------- 2. Asian range breakout
def asian_breakout(f: Features, range_end=7, trade_until=12, sl_atr=1.5, tp_r=2.0, exit_hour=20, max_rng_atr=8.0, side="both", htf_align=0):
    df = f.df
    h = f.hour
    in_rng = h < range_end
    key = f.date
    hi = pd.Series(np.where(in_rng, df["high"].values, np.nan), index=df.index).groupby(key).transform("max").values
    lo = pd.Series(np.where(in_rng, df["low"].values, np.nan), index=df.index).groupby(key).transform("min").values
    c = df["close"].values
    a = f.atr()
    window = (h >= range_end) & (h < trade_until)
    rng_ok = (hi - lo) < max_rng_atr * a * 4  # range vs H1-ish ATR (4 x M15 ATR)
    long_raw = window & rng_ok & (c > hi)
    short_raw = window & rng_ok & (c < lo)
    # only the first breakout per day per direction
    first_long = long_raw & ~pd.Series(long_raw, index=df.index).groupby(key).cumsum().shift(1, fill_value=0).astype(bool).values
    first_short = short_raw & ~pd.Series(short_raw, index=df.index).groupby(key).cumsum().shift(1, fill_value=0).astype(bool).values
    if htf_align:  # only trade in the direction of the H1 EMA(htf_align) trend
        H = f.htf_ema("1h", htf_align)
        first_long = first_long & (c > H)
        first_short = first_short & (c < H)
    sig = np.where(first_long, 1, np.where(first_short, -1, 0))
    sig = _side(sig, side)
    force = (h >= exit_hour) | f.weekend_exit()
    return sig, sl_atr * a, tp_r, 10_000, force


# ---------------------------------------------------------------- 3. Bollinger mean reversion
def bb_reversion(f: Features, n=20, k=2.0, rsi_lo=30, adx_max=20, sl_atr=1.5, tp_r=1.0, max_bars=16, sess="all", side="both"):
    c = f.df["close"].values
    lower, mid, upper = f.bb(n, k)
    r, x = f.rsi(), f.adx()
    long_ = (c < lower) & (r < rsi_lo) & (x < adx_max)
    short = (c > upper) & (r > 100 - rsi_lo) & (x < adx_max)
    m = session_mask(f, sess)
    sig = np.where(long_ & m, 1, np.where(short & m, -1, 0))
    sig = _side(sig, side)
    return sig, sl_atr * f.atr(), tp_r, max_bars, f.weekend_exit()


# ---------------------------------------------------------------- 4. Donchian breakout with HTF trend
def donchian_trend(f: Features, n=40, htf=200, sl_atr=2.0, tp_r=2.0, sess="london_ny", side="both"):
    df = f.df
    c = df["close"].values
    hh = df["high"].rolling(n).max().shift(1).values
    ll = df["low"].rolling(n).min().shift(1).values
    H = f.htf_ema("1h", htf)
    prev_c = np.roll(c, 1)
    long_ = (c > hh) & (prev_c <= hh) & (c > H)
    short = (c < ll) & (prev_c >= ll) & (c < H)
    m = session_mask(f, sess)
    sig = np.where(long_ & m, 1, np.where(short & m, -1, 0))
    sig = _side(sig, side)
    return sig, sl_atr * f.atr(), tp_r, 10_000, f.weekend_exit()


# ---------------------------------------------------------------- 5. EMA cross + ADX momentum
def ema_cross_adx(f: Features, fast=9, slow=21, htf=50, adx_min=25, sl_atr=1.5, tp_r=2.0, sess="london_ny", side="both"):
    ef, es = f.ema(fast), f.ema(slow)
    H = f.htf_ema("4h", htf)
    c = f.df["close"].values
    x = f.adx()
    up_x = (ef > es) & (np.roll(ef, 1) <= np.roll(es, 1))
    dn_x = (ef < es) & (np.roll(ef, 1) >= np.roll(es, 1))
    long_ = up_x & (c > H) & (x > adx_min)
    short = dn_x & (c < H) & (x > adx_min)
    m = session_mask(f, sess)
    sig = np.where(long_ & m, 1, np.where(short & m, -1, 0))
    sig = _side(sig, side)
    return sig, sl_atr * f.atr(), tp_r, 10_000, f.weekend_exit()


def _side(sig, side):
    if side == "long":
        return np.where(sig > 0, 1, 0)
    if side == "short":
        return np.where(sig < 0, -1, 0)
    return sig


def grid(**kw):
    keys = list(kw)
    for vals in product(*kw.values()):
        yield dict(zip(keys, vals))


STRATEGIES = {
    "trend_pullback": (trend_pullback, dict(
        htf=[100, 200], fast=[20], slow=[50], look=[5, 10], sl_atr=[1.0, 1.5, 2.0, 3.0],
        tp_r=[1.0, 1.5, 2.0, 3.0], sess=["all", "london_ny"])),
    "asian_breakout": (asian_breakout, dict(
        range_end=[6, 7, 8], trade_until=[11, 14], sl_atr=[1.0, 1.5, 2.0, 3.0], tp_r=[1.0, 1.5, 2.0, 3.0],
        exit_hour=[20])),
    "bb_reversion": (bb_reversion, dict(
        n=[20], k=[2.0, 2.5], rsi_lo=[25, 30], adx_max=[20, 25], sl_atr=[1.0, 1.5, 2.0, 3.0],
        tp_r=[0.75, 1.0, 1.5], max_bars=[8, 16], sess=["all", "london_ny"])),
    "donchian_trend": (donchian_trend, dict(
        n=[20, 40, 96], htf=[100, 200], sl_atr=[1.5, 2.0, 3.0], tp_r=[1.0, 1.5, 2.0, 3.0],
        sess=["all", "london_ny"])),
    "ema_cross_adx": (ema_cross_adx, dict(
        fast=[9], slow=[21, 50], htf=[50], adx_min=[20, 25, 30], sl_atr=[1.0, 1.5, 2.0, 3.0],
        tp_r=[1.0, 1.5, 2.0, 3.0], sess=["all", "london_ny"])),
}

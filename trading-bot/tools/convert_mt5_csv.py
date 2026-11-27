"""Convert an MT5 'Export Bars' CSV to the backtest format (UTC, spread in price units).

    python convert_mt5_csv.py in.csv ../data/XAUUSD_M15.csv [--point 0.01]

MT5 broker server time is assumed to be GMT+2 in winter / GMT+3 in summer following the US
DST calendar (i.e. New York time + 7h), which matches the usual 'NY close' server clock.
Verified on the data by the weekly open landing on Monday 01:00 server time all year.
"""
import argparse

import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("dst")
ap.add_argument("--point", type=float, default=0.01, help="price value of one spread point")
a = ap.parse_args()

d = pd.read_csv(a.src, sep="\t")
d.columns = [c.strip("<>").lower() for c in d.columns]
t = pd.to_datetime(d["date"] + " " + d["time"], format="%Y.%m.%d %H:%M:%S")
ny = (t - pd.Timedelta(hours=7)).dt.tz_localize("America/New_York", ambiguous="NaT", nonexistent="NaT")
utc = ny.dt.tz_convert("UTC").dt.tz_localize(None)
bad = utc.isna().sum()
out = pd.DataFrame({
    "time": utc, "open": d["open"], "high": d["high"], "low": d["low"], "close": d["close"],
    "volume": d["tickvol"], "spread": d["spread"] * a.point,
}).dropna(subset=["time"]).sort_values("time")
# a zero spread is an export artefact: use the median spread of that hour
z = out["spread"] <= 0
med = out.loc[~z].groupby(out["time"].dt.hour)["spread"].median()
out.loc[z, "spread"] = out.loc[z, "time"].dt.hour.map(med)
out.to_csv(a.dst, index=False)
print(f"{len(out)} bars, {out.time.min()} .. {out.time.max()} UTC | dropped {bad} ambiguous | "
      f"zero-spread fixed {int(z.sum())} | median spread {out.spread.median():.2f}")

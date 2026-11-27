# AsianBreakout_H1Trend_EA (XAUUSD, M15)

Strategy and evidence: see `../results_mt5/` (18 months of broker data, in-sample/out-of-sample split).
Expect roughly **+0.18R per trade** after costs, ~11 trades/month, drawdowns of ~15R. Not a guarantee.

## Rules (UTC)
| Step | Rule |
|---|---|
| Range | High/Low of M15 bars opening 00:00-05:45 |
| Signal | First M15 close beyond the range, bar open 06:00-13:45, once per direction per day |
| Filter | Buy only above H1 EMA(200), sell only below |
| Exit | SL 2.0 x ATR(14), TP 3R, any open trade closed from 20:00 |
| Size | Risk % of equity per trade, set by the risk mode (default Medium = 1%) |

Safety: max-spread guard, daily-loss stop, equity-drawdown halt, one position at a time, no martingale/grid.

## Risk modes (`InpRiskMode`)
Entry/exit rules are identical in every mode; only money management differs.

| Mode | Risk/trade | Daily stop | Halt at drawdown | Backtest 18m* | Max DD* | Worst month* |
|---|---|---|---|---|---|---|
| Low | 0.5% | 1.5% | 10% | +38% | 7% | -1.4% |
| **Medium** (default) | 1.0% | 3% | 20% | +88% | 14% | -2.9% |
| High | 2.0% | 5% | 35% | +232% | 27% | -5.7% |
| Custom | `InpRiskPercent` | `InpDailyLossPct` | `InpMaxDrawdownPct` | | | |

\* From the same data the strategy was developed on, so treat as a best case: expect roughly half the return and a
deeper drawdown. The longest losing streak was 8 trades (=8R). High mode lost 27% at its worst point.
Drawdown halt stays on until you delete the terminal global variable named in the Experts log.
Small accounts: risk% below the broker's minimum lot makes the EA skip the trade, so use a cent/micro account.

## Before using it
1. **Compile** in MetaEditor (F7). The code was written without a compiler, so fix any error it reports.
2. **Check broker time**: `InpServerOffsetWinter` = 2 and `InpServerUsesUsDst` = true fit brokers whose weekly open is
   Monday 01:00 server time (GMT+2 winter / GMT+3 summer). Verify on your chart.
3. **Strategy Tester**: XAUUSD, M15, 2025.04.30 - 2026.10.23, model "Every tick based on real ticks" (or "1 minute OHLC"),
   spread = current, deposit 10,000, risk 0.5%.
4. **Compare** the tester's deal list with `../results_mt5/reference_trades_asian_h1trend.csv`
   (`entry_time_server` is broker time). Most trades should match in time and side. Small differences are normal (ATR/EMA
   implementation, tick model, spread). If many trades differ, stop and send me the tester report.
5. Run on a **demo** account for 1-2 months before any real money.

## Optional modules (both OFF by default)
- `InpUseCalendar`: no new entries within +-30 min of high-impact USD news, using MT5's built-in calendar.
  Works live only (the Strategy Tester has no calendar), and has not been back-tested, so compare demo results with and without it.
- `InpUseGateFile`: for the planned AI/news layer. An external service writes `news_gate.txt` into the common Files folder
  (`File > Open Data Folder > ../Common/Files`):

```
decision=approve          # approve | reduce | reject
size=0.5                  # lot multiplier when decision=reduce
valid_until_utc=1764250000  # unix seconds; expired or missing file = NO new entries
```

Planned flow: Python service reads headlines -> asks the LLM for a JSON verdict -> writes this file every 15-30 min.
The LLM can only approve, shrink, or block a trade the rules already produced. It never creates trades, and stop-loss,
sizing and limits stay in this EA.

## Deliberately NOT included
Grid/Recovery (martingale), trailing stops, TPO value-area filter, hour-of-day or weekday filters. Each was either harmful,
untested, or no better than noise on the data, and every extra condition raises the overfitting risk.

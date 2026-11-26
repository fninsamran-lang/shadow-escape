#!/usr/bin/env bash
# Resume download -> build M15 CSV -> grid search -> detailed analysis.
# Safe to re-run: downloads are cached per day.
set -euo pipefail
cd "$(dirname "$0")"
START=${START:-2025-11-25}
END=${END:-2026-11-25}

for pass in 1 2; do  # second pass retries files skipped in the first
  python3 tools/download_dukascopy.py --symbol XAUUSD --start "$START" --end "$END" --out data --ask-every 5
done

cd backtest
python3 run_search.py --data ../data/XAUUSD_M15.csv --out ../results
python3 analyze.py --data ../data/XAUUSD_M15.csv --pick ../results/top_by_strategy.csv \
  --meta ../results/meta.json --out ../results/report_data.json --top 1
echo PIPELINE_DONE

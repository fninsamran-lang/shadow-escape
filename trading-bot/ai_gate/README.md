# AI news gate for AsianBreakout_H1Trend_EA

Every 15 minutes (Mon-Fri, 05:00-14:00 UTC) the service:
1. reads the free ForexFactory calendar: high-impact USD news within +-30 min -> **reject** (plain rule, no AI);
2. reads recent headlines (Google News RSS: gold, XAUUSD, Fed, USD, geopolitics; add your own feeds);
3. asks Claude (`claude-opus-5-5`, structured JSON output) for `approve / reduce / reject` plus `allow_buy / allow_sell`;
4. **live mode:** writes `news_gate.txt` into MT5 `Common\Files`, which the EA reads before every entry.
   **shadow mode:** writes nothing, only logs what it would have done.

The AI can only shrink or block trades the rules already produced. Stops, sizing and limits stay in the EA.
Headlines are treated as untrusted data, and the answer is forced into a fixed JSON schema.

## Setup (Windows VPS next to MT5)
```
pip install -r requirements.txt
set ANTHROPIC_API_KEY=sk-ant-...          (or: ant auth login)
copy config.example.toml config.toml
python run.py --config config.toml --once   (one test cycle)
python run.py --config config.toml          (keep running; or Task Scheduler every 15 min with --once)
python -m pytest -q tests                   (offline tests)
```

## Roll-out (do not skip)
| Step | Service | EA | Goal |
|---|---|---|---|
| 1. 1-2 months | `mode = "shadow"` | `InpUseGateFile = false`, `InpLogSignals = true` | trades run on rules only; AI opinions are logged |
| 2. evaluate | `python evaluate.py --signals <Common\Files>\signals_log.csv --verdicts logs/verdicts.jsonl --prices XAUUSD_M15.csv` | | compare signals the AI would block vs. approve |
| 3. only if it helped | `mode = "live"` | `InpUseGateFile = true` | AI decisions take effect |

Go live only if, over **100+ signals**, the ones the AI would block are clearly worse than the ones it approves.
A random "AI" can look good or bad on 40 signals by luck (seen in testing), so small samples prove nothing.

## Cost
About 3k input + ~1-2k output/thinking tokens per call. Opus 5.5 ($4 / $20 per M tokens) is roughly $0.03-0.05 per
call, at most ~36 calls per trading day, fewer when headlines are unchanged (verdicts are reused for up to 60 min):
roughly **$10-35/month**. Sonnet 5.5 halves that; Haiku 5.5 is far cheaper but weaker at judging news.

## Failure behaviour
| Situation | shadow | live |
|---|---|---|
| Claude error / refusal / bad JSON | logged | `on_ai_error`: approve (default) or block |
| One feed down | other feeds used | same |
| Service stopped | nothing changes | gate expires after 35 min -> EA opens no new trades |

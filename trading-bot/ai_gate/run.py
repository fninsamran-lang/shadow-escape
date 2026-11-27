"""News gate service: every N minutes read headlines + calendar, ask Claude, write news_gate.txt for the EA.

    python run.py --config config.toml          # loop forever
    python run.py --config config.toml --once   # one cycle (for testing / Task Scheduler)

Modes (config `mode`):
  shadow  - log what the AI WOULD decide, never write the gate file (EA: InpUseGateFile=false). Start here.
  live    - write the gate file the EA obeys (EA: InpUseGateFile=true).
"""
from __future__ import annotations

import argparse
import hashlib
import time
import tomllib
from datetime import datetime, timezone
from pathlib import Path

import anthropic

from analyst import MODEL, Verdict, ask_claude, build_prompt
from calendar_ff import FF_URL, blocking_events, fetch_calendar, upcoming
from gate import default_common_files, gate_text, log_verdict, valid_until, write_gate
from news import fetch_headlines, google_news_url

DEFAULTS = {
    "mode": "shadow",
    "model": MODEL,
    "effort": "medium",
    "interval_min": 15,
    "validity_min": 35,            # > interval, so one missed cycle does not block trading
    "active_hours_utc": [5, 14],   # only spend API calls while the EA can open trades
    "headline_hours": 6,
    "max_headlines": 40,
    "reuse_verdict_min": 60,       # same headlines -> reuse the last verdict this long
    "on_ai_error": "approve",      # live mode: approve | block when Claude cannot be reached
    "calendar_block": True,
    "calendar_currencies": ["USD"],
    "calendar_before_min": 30,
    "calendar_after_min": 30,
    "calendar_url": FF_URL,
    "gate_folder": "",             # empty -> MT5 Common\\Files
    "gate_file": "news_gate.txt",
    "log_file": "logs/verdicts.jsonl",
    "google_news_queries": ["gold price", "XAUUSD", "Federal Reserve", "US dollar", "geopolitical risk markets"],
    "extra_feeds": [],
}


def load_config(path: str | None) -> dict:
    cfg = dict(DEFAULTS)
    if path:
        with open(path, "rb") as f:
            cfg.update(tomllib.load(f))
    if cfg["mode"] not in ("shadow", "live"):
        raise SystemExit("mode must be 'shadow' or 'live'")
    return cfg


class GateService:
    def __init__(self, cfg: dict, client: anthropic.Anthropic | None = None):
        self.cfg = cfg
        self.client = client or anthropic.Anthropic()
        self.folder = Path(cfg["gate_folder"]) if cfg["gate_folder"] else default_common_files()
        self.log_file = Path(cfg["log_file"])
        self.feeds = [google_news_url(q) for q in cfg["google_news_queries"]] + list(cfg["extra_feeds"])
        self._last: tuple[str, datetime, Verdict] | None = None   # (headline hash, time, verdict)

    def active(self, now: datetime) -> bool:
        lo, hi = self.cfg["active_hours_utc"]
        return now.weekday() < 5 and lo <= now.hour < hi

    def cycle(self, now: datetime | None = None) -> dict:
        now = now or datetime.now(timezone.utc)
        rec: dict = {"time_utc": now.isoformat(timespec="seconds"), "mode": self.cfg["mode"]}
        if not self.active(now):
            rec["skipped"] = "outside active hours"
            return rec

        # 1) calendar: hard rule, no AI needed
        cur = set(self.cfg["calendar_currencies"])
        events, cal_lines, block = [], [], []
        try:
            events = fetch_calendar(self.cfg["calendar_url"])
            block = blocking_events(events, now, cur, self.cfg["calendar_before_min"], self.cfg["calendar_after_min"])
            cal_lines = [f"{e.time:%a %H:%M} UTC {e.currency} {e.impact}: {e.title}" for e in upcoming(events, now, cur)]
        except Exception as e:
            rec["calendar_error"] = type(e).__name__
        rec["calendar_block"] = [f"{e.time:%H:%M} {e.title}" for e in block]

        # 2) headlines
        heads, errors = fetch_headlines(self.feeds, self.cfg["headline_hours"], self.cfg["max_headlines"])
        lines = [f"{h.published:%m-%d %H:%M} UTC ({h.source}) {h.title}" for h in heads]
        rec.update(n_headlines=len(heads), feed_errors=errors)

        # 3) AI verdict (reused while headlines are unchanged, to save cost)
        verdict, err = None, None
        digest = hashlib.sha256("\n".join(lines).encode()).hexdigest()
        if self._last and self._last[0] == digest and (now - self._last[1]).total_seconds() < self.cfg["reuse_verdict_min"] * 60:
            verdict, rec["verdict_reused"] = self._last[2], True
        else:
            try:
                verdict, meta = ask_claude(self.client, build_prompt(now.strftime("%Y-%m-%d %H:%M"), lines, cal_lines),
                                           model=self.cfg["model"], effort=self.cfg["effort"])
                rec["llm"] = meta
                self._last = (digest, now, verdict)
            except anthropic.APIError as e:
                err = f"{type(e).__name__}: {str(e)[:120]}"
            except RuntimeError as e:
                err = str(e)[:160]
        rec["ai_verdict"] = verdict.model_dump() if verdict else None
        rec["ai_error"] = err
        rec["headlines"] = lines[:15]

        # 4) final gate: calendar rule first, then AI, then the error policy
        if self.cfg["calendar_block"] and block:
            g = ("reject", 1.0, True, True, "calendar: " + "; ".join(rec["calendar_block"]))
        elif verdict:
            g = (verdict.decision, verdict.size, verdict.allow_buy, verdict.allow_sell, verdict.reason)
        elif self.cfg["on_ai_error"] == "approve":
            g = ("approve", 1.0, True, True, "ai unavailable, rules only")
        else:
            g = ("reject", 1.0, True, True, "ai unavailable")
        rec["gate"] = dict(zip(("decision", "size", "allow_buy", "allow_sell", "note"), g))

        if self.cfg["mode"] == "live":
            text = gate_text(*g[:4], valid_until(now, self.cfg["validity_min"]), note=g[4])
            rec["gate_written"] = str(write_gate(self.folder, self.cfg["gate_file"], text))
        log_verdict(self.log_file, rec)
        return rec


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config")
    ap.add_argument("--once", action="store_true")
    a = ap.parse_args()
    cfg = load_config(a.config)
    svc = GateService(cfg)
    print(f"news gate: mode={cfg['mode']} model={cfg['model']} every {cfg['interval_min']} min -> log {cfg['log_file']}")
    while True:
        rec = svc.cycle()
        g = rec.get("gate", {})
        print(f"{rec['time_utc']} {rec.get('skipped') or ''} gate={g.get('decision', '-')} size={g.get('size', '-')} "
              f"buy={g.get('allow_buy', '-')} sell={g.get('allow_sell', '-')} {('| ' + g['note']) if g.get('note') else ''}"
              f"{' | AI ERROR ' + rec['ai_error'] if rec.get('ai_error') else ''}", flush=True)
        if a.once:
            break
        time.sleep(cfg["interval_min"] * 60)


if __name__ == "__main__":
    main()

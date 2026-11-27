"""High-impact economic events from the free weekly ForexFactory JSON feed."""
from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"


@dataclass(frozen=True)
class Event:
    time: datetime  # UTC
    currency: str
    title: str
    impact: str


def parse_calendar(raw: bytes | str) -> list[Event]:
    out = []
    for e in json.loads(raw):
        try:
            t = datetime.fromisoformat(str(e["date"])).astimezone(timezone.utc)
        except (KeyError, ValueError):
            continue  # all-day / tentative entries have no usable time
        out.append(Event(t, str(e.get("country", "")).upper(), str(e.get("title", ""))[:120], str(e.get("impact", ""))))
    return out


def fetch_calendar(url: str = FF_URL, timeout: float = 15) -> list[Event]:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (news-gate)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return parse_calendar(r.read(2_000_000))


def blocking_events(events: list[Event], now: datetime, currencies: set[str],
                    before_min: int, after_min: int) -> list[Event]:
    """High-impact events from `before_min` minutes ahead back to `after_min` minutes ago."""
    lo, hi = now - timedelta(minutes=after_min), now + timedelta(minutes=before_min)
    return [e for e in events if e.impact.lower() == "high" and e.currency in currencies and lo <= e.time <= hi]


def upcoming(events: list[Event], now: datetime, currencies: set[str], hours: float = 24) -> list[Event]:
    hi = now + timedelta(hours=hours)
    return sorted((e for e in events if e.impact.lower() in ("high", "medium") and e.currency in currencies
                   and now - timedelta(hours=2) <= e.time <= hi), key=lambda e: e.time)

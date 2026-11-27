"""Fetch recent gold-relevant headlines from RSS feeds (no API key needed)."""
from __future__ import annotations

import email.utils
import html
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from defusedxml import ElementTree as ET  # feeds are untrusted XML

UA = {"User-Agent": "Mozilla/5.0 (news-gate)"}


@dataclass(frozen=True)
class Headline:
    published: datetime  # UTC
    title: str
    source: str


def google_news_url(query: str) -> str:
    q = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"


def _parse_date(text: str | None) -> datetime | None:
    if not text:
        return None
    try:
        d = email.utils.parsedate_to_datetime(text)
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc)


def parse_feed(xml_bytes: bytes, default_source: str) -> list[Headline]:
    """Parse RSS 2.0 or Atom. Returns headlines with clean single-line titles."""
    root = ET.fromstring(xml_bytes)
    out = []
    atom = "{http://www.w3.org/2005/Atom}"
    items = root.findall(".//item") or root.findall(f".//{atom}entry")
    for it in items:
        title = it.findtext("title") or it.findtext(f"{atom}title") or ""
        date = (it.findtext("pubDate") or it.findtext(f"{atom}updated") or it.findtext(f"{atom}published"))
        src = it.findtext("source") or default_source
        title = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", title))).strip()
        d = _parse_date(date)
        if title and d:
            out.append(Headline(d, title[:300], src.strip()[:60]))
    return out


def fetch_headlines(urls: list[str], hours: float, max_items: int = 40, timeout: float = 15) -> tuple[list[Headline], list[str]]:
    """Headlines from the last `hours`, newest first, de-duplicated. Also returns per-feed errors."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    seen, items, errors = set(), [], []
    for url in urls:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                data = r.read(2_000_000)
            host = urllib.parse.urlparse(url).netloc
            for h in parse_feed(data, host):
                key = re.sub(r"[^a-z0-9]", "", h.title.lower())[:80]
                if h.published >= since and key not in seen:
                    seen.add(key)
                    items.append(h)
        except Exception as e:  # one broken feed must not stop the others
            errors.append(f"{url[:80]}: {type(e).__name__}")
    items.sort(key=lambda h: h.published, reverse=True)
    return items[:max_items], errors

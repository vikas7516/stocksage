"""Financial news aggregator using yfinance news + Google News RSS (no extra paid keys)."""

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET
import httpx
import yfinance as yf

# Filter out SEO stock-quote landing pages that carry no actual news
_QUOTE_SPAM_PHRASES = (
    "share price today",
    "share price live",
    "stock price & chart",
    "stock price, news, quote and history",
    "live nse/bse",
    "live nse:",
)


def _is_relevant_article(title: str) -> bool:
    t = title.lower()
    return not any(phrase in t for phrase in _QUOTE_SPAM_PHRASES)


def _fetch_yfinance_news(symbol: str, max_items: int = 5) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    try:
        raw = yf.Ticker(symbol).news or []
        for entry in raw:
            content = entry.get("content") or entry
            title = content.get("title") or entry.get("title")
            link = (
                (content.get("canonicalUrl") or {}).get("url")
                or (content.get("clickThroughUrl") or {}).get("url")
                or entry.get("link")
            )
            publisher = (
                (content.get("provider") or {}).get("displayName")
                or entry.get("publisher")
                or "Yahoo Finance"
            )
            pub_raw = content.get("pubDate") or entry.get("providerPublishTime")
            published_at = None
            if isinstance(pub_raw, (int, float)):
                published_at = datetime.fromtimestamp(pub_raw, tz=timezone.utc).isoformat()
            elif isinstance(pub_raw, str):
                published_at = pub_raw

            if title and link and _is_relevant_article(title):
                items.append({
                    "title": title,
                    "source_url": link,
                    "publisher": publisher,
                    "published_at": published_at,
                    "source_type": "yfinance_news",
                })
            if len(items) >= max_items:
                break
    except Exception:
        pass
    return items


def _fetch_google_rss_news(query: str, max_items: int = 8) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    clean_query = query.replace("Limited", "").replace("Ltd", "").strip()
    search_q = f'"{clean_query}" (earnings OR results OR acquisition OR deal OR dividend OR profit OR NSE) when:30d'
    rss_url = (
        f"https://news.google.com/rss/search?q={quote_plus(search_q)}&hl=en-IN&gl=IN&ceid=IN:en"
    )
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(rss_url, headers={"User-Agent": "StockSage/1.0"})
            if resp.status_code != 200:
                return items
            root = ET.fromstring(resp.text)
            for item_el in root.findall("./channel/item"):
                title = (item_el.findtext("title") or "").strip()
                link = (item_el.findtext("link") or "").strip()
                pub_date_raw = (item_el.findtext("pubDate") or "").strip()
                source_el = item_el.find("source")
                publisher = source_el.text.strip() if source_el is not None and source_el.text else "Google News"

                published_at = None
                if pub_date_raw:
                    try:
                        published_at = parsedate_to_datetime(pub_date_raw).astimezone(timezone.utc).isoformat()
                    except Exception:
                        published_at = pub_date_raw

                if title and link and _is_relevant_article(title):
                    items.append({
                        "title": title,
                        "source_url": link,
                        "publisher": publisher,
                        "published_at": published_at,
                        "source_type": "google_news_rss",
                    })
                if len(items) >= max_items:
                    break
    except Exception:
        pass
    return items


def fetch_stock_news(symbol: str, company_name: str, max_total: int = 8) -> List[Dict[str, Any]]:
    """Combines Google News RSS corporate events and yfinance news, filtering quote spam."""
    rss_items = _fetch_google_rss_news(company_name or symbol, max_items=6)
    yf_items = _fetch_yfinance_news(symbol, max_items=4)

    seen_titles = set()
    merged: List[Dict[str, Any]] = []
    for item in rss_items + yf_items:
        norm = item["title"].lower().strip()
        if norm not in seen_titles:
            seen_titles.add(norm)
            merged.append(item)
        if len(merged) >= max_total:
            break
    return merged

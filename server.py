#!/usr/bin/env python3
"""Local server for Stock Game Dashboard.

Serves static files and proxies Yahoo Finance market data so browser CORS/rate-limit
issues do not break the dashboard.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote as urlquote, urlencode, urlparse
from urllib.request import Request, urlopen

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8787"))
ROOT = Path(__file__).resolve().parent

STATIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path in STATIC_FILES:
            filename, content_type = STATIC_FILES[parsed.path]
            self._serve_static(filename, content_type)
            return

        if parsed.path == "/api/quote":
            self._api_quote(parsed.query)
            return

        if parsed.path == "/api/candles":
            self._api_candles(parsed.query)
            return

        if parsed.path == "/api/health":
            self._json(200, {"ok": True})
            return

        self.send_error(404, "Not Found")

    def log_message(self, fmt: str, *args) -> None:
        return

    def _serve_static(self, filename: str, content_type: str) -> None:
        target = ROOT / filename
        if not target.exists() or not target.is_file():
            self.send_error(404, "File Not Found")
            return

        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _api_quote(self, query: str) -> None:
        qs = parse_qs(query)
        symbol = (qs.get("symbol") or [""])[0].strip().upper()
        if not symbol:
            self._json(400, {"error": "symbol is required"})
            return

        try:
            data = self._quote_from_yahoo(symbol)
            self._json(200, data)
        except RuntimeError as exc:
            self._json(502, {"error": str(exc)})

    def _api_candles(self, query: str) -> None:
        qs = parse_qs(query)
        symbol = (qs.get("symbol") or [""])[0].strip().upper()
        start = (qs.get("start") or ["2026-01-30"])[0].strip()

        if not symbol:
            self._json(400, {"error": "symbol is required"})
            return

        try:
            dt = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            from_ts = int(dt.timestamp())
        except ValueError:
            self._json(400, {"error": "start must be YYYY-MM-DD"})
            return

        to_ts = int(time.time())
        try:
            data = self._candles_from_yahoo(symbol, from_ts, to_ts)
            self._json(200, data)
        except RuntimeError as exc:
            self._json(502, {"error": str(exc)})

    def _json_request(self, url: str) -> dict:
        req = Request(url, headers={"Accept": "application/json", "User-Agent": "stock-game-dashboard/1.0"})
        try:
            with urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as exc:
            raise RuntimeError(f"Yahoo HTTP {exc.code}") from exc
        except (URLError, TimeoutError):
            raise RuntimeError("Yahoo network error") from None
        except json.JSONDecodeError:
            raise RuntimeError("Yahoo invalid json") from None

    def _yahoo_candidates(self, symbol: str) -> list[str]:
        out = [symbol]
        if "." not in symbol and ":" not in symbol:
            out.extend([f"{symbol}.L", f"{symbol}.DE", f"{symbol}.PA", f"{symbol}.AS", f"{symbol}.MI", f"{symbol}.SW"])

        try:
            search_url = f"https://query1.finance.yahoo.com/v1/finance/search?{urlencode({'q': symbol, 'quotesCount': '12', 'newsCount': '0'})}"
            payload = self._json_request(search_url)
            for q in payload.get("quotes", []):
                s = (q.get("symbol") or "").strip().upper()
                if s:
                    out.append(s)
        except RuntimeError:
            pass

        dedup: list[str] = []
        seen: set[str] = set()
        for s in out:
            if s not in seen:
                seen.add(s)
                dedup.append(s)
        return dedup

    def _yahoo_chart(self, symbol: str, from_ts: int, to_ts: int) -> tuple[list[int], list[float], float | None]:
        enc_sym = urlquote(symbol, safe="")
        url = (
            f"https://query1.finance.yahoo.com/v8/finance/chart/{enc_sym}?"
            + urlencode({"period1": str(from_ts), "period2": str(to_ts), "interval": "1d", "events": "history"})
        )
        data = self._json_request(url)
        chart = data.get("chart") or {}
        result = (chart.get("result") or [None])[0]
        if not result:
            raise RuntimeError("Yahoo no result")

        ts_list = result.get("timestamp") or []
        quote = ((result.get("indicators") or {}).get("quote") or [None])[0] or {}
        closes = quote.get("close") or []
        meta = result.get("meta") or {}
        rmp = meta.get("regularMarketPrice")

        out_t: list[int] = []
        out_c: list[float] = []
        for i, ts in enumerate(ts_list):
            if i >= len(closes):
                break
            c = closes[i]
            if isinstance(ts, int) and isinstance(c, (int, float)) and c > 0:
                out_t.append(ts)
                out_c.append(float(c))

        return out_t, out_c, float(rmp) if isinstance(rmp, (int, float)) and rmp > 0 else None

    def _quote_from_yahoo(self, symbol: str) -> dict:
        to_ts = int(time.time())
        from_ts = to_ts - 14 * 86400
        candidates = self._yahoo_candidates(symbol)
        for candidate in candidates:
            try:
                _, closes, rmp = self._yahoo_chart(candidate, from_ts, to_ts)
                price = rmp if rmp and rmp > 0 else (closes[-1] if closes else None)
                if isinstance(price, (int, float)) and price > 0:
                    return {"c": float(price), "_resolvedSymbol": candidate, "_provider": "yahoo"}
            except RuntimeError:
                continue
        raise RuntimeError(f"Yahoo: no quote for {symbol}")

    def _candles_from_yahoo(self, symbol: str, from_ts: int, to_ts: int) -> dict:
        candidates = self._yahoo_candidates(symbol)
        for candidate in candidates:
            try:
                ts, closes, _ = self._yahoo_chart(candidate, from_ts, to_ts)
                if closes:
                    return {
                        "s": "ok",
                        "t": ts,
                        "c": closes,
                        "_resolvedSymbol": candidate,
                        "_provider": "yahoo",
                    }
            except RuntimeError:
                continue
        raise RuntimeError(f"Yahoo: no candles for {symbol}")

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    server = HTTPServer((HOST, PORT), Handler)
    print(f"Stock Game Dashboard server running at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()

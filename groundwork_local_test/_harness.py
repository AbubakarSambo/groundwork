"""Shared helpers for the persona runners: token + ground discovery via the API.

The grounds list renders clickable <div class="gw-ground-card"> cards, not <a href>,
so DOM-scraping for '/grounds/<id>' links finds nothing. These helpers read the
persona's saved auth token and ask the API which grounds they can see — the same
data the browser would render — so the suites can locate a ground to drive.
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
API_BASE = "http://127.0.0.1:3000/api/v1"


def token_for(identity: str) -> str | None:
    p = ROOT / "state" / identity / "state.json"
    if not p.exists():
        return None
    s = json.loads(p.read_text())
    # Preferred: a standalone `token` key in localStorage.
    for o in s.get("origins", []):
        for kv in o.get("localStorage", []):
            if kv.get("name") == "token" and kv.get("value"):
                return kv.get("value")
    # Fallback: the token embedded in the zustand `auth-storage-v2` blob.
    for o in s.get("origins", []):
        for kv in o.get("localStorage", []):
            if kv.get("name") == "auth-storage-v2":
                try:
                    blob = json.loads(kv.get("value") or "{}")
                    tok = (blob.get("state") or blob).get("token")
                    if tok:
                        return tok
                except Exception:
                    pass
    return None


def api_get(path: str, identity: str) -> dict | list | None:
    token = token_for(identity)
    if not token:
        return None
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except Exception:
        return None


def ground_ids(identity: str) -> list[str]:
    """Return the IDs of grounds this persona can see, via the API."""
    body = api_get("/grounds", identity)
    if not body:
        return []
    data = body.get("data") if isinstance(body, dict) else body
    if not isinstance(data, list):
        return []
    return [g.get("id") for g in data if isinstance(g, dict) and g.get("id")]

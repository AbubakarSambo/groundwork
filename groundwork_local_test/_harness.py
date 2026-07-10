"""Shared helpers for the persona runners: token + ground discovery via the API.

The grounds list renders clickable <div class="gw-ground-card"> cards, not <a href>,
so DOM-scraping for '/grounds/<id>' links finds nothing. These helpers read the
persona's saved auth token and ask the API which grounds they can see — the same
data the browser would render — so the suites can locate a ground to drive.
"""

from __future__ import annotations

import json
import re
import urllib.error
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


# ── Low-level request + high-level journey driving ────────────────────────────

def api(method: str, path: str, token: str | None = None, body=None, timeout: int = 120):
    """Raw API call. Returns (status, parsed_json_or_None)."""
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(API_BASE + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, None
    except Exception:
        return None, None


def _unwrap(c):
    return c.get("data", c) if isinstance(c, dict) else c


def login(email: str, password: str = "TestPass123!") -> str | None:
    """Log in via email/password and return the token, or None."""
    s, c = api("POST", "/auth/login", body={"email": email, "password": password})
    if s and 200 <= s < 300:
        d = _unwrap(c)
        return (d or {}).get("token") or (d or {}).get("accessToken")
    return None


def create_ground(token: str, label: str, scenario: str = "PULSE_CHECK",
                  moment: str = "STARTING", brief: str = "") -> str | None:
    s, c = api("POST", "/grounds", token,
               {"label": label, "scenario": scenario, "moment": moment, "brief": brief})
    if s and 200 <= s < 300:
        return _unwrap(c).get("id")
    return None


def add_participant(token: str, ground_id: str, email: str, role: str = "") -> str | None:
    """Add a participant; return their invite token (parsed from devUrl)."""
    s, c = api("POST", f"/grounds/{ground_id}/participants", token,
               {"email": email, "roleAsDescribed": role})
    if not (s and 200 <= s < 300):
        return None
    p = _unwrap(c)
    if p.get("inviteToken"):
        return p["inviteToken"]
    dev = p.get("devUrl") or ""
    m = re.search(r"token=([A-Za-z0-9]+)", dev)
    return m.group(1) if m else None


def accept_invite(invite_token: str, first: str = "Test", last: str = "User") -> dict:
    """Accept an invite. Returns {accessToken, checkInId, groundId} or {}."""
    s, c = api("POST", "/participants/accept", body={"token": invite_token, "firstName": first, "lastName": last})
    if s and 200 <= s < 300:
        return _unwrap(c)
    return {}


def drive_checkin(ptok: str, check_in_id: str, messages: list[str]) -> dict:
    """Open, send each message, then complete. Returns {turns, completed, replies}."""
    api("POST", f"/check-ins/{check_in_id}/open", ptok)
    replies = []
    for msg in messages:
        s, c = api("POST", f"/check-ins/{check_in_id}/messages", ptok, {"message": msg})
        r = _unwrap(c) or {}
        replies.append(r.get("reply", ""))
        if r.get("sessionComplete"):
            break
    s, _ = api("POST", f"/check-ins/{check_in_id}/complete", ptok)
    completed = bool(s and 200 <= s < 300)
    st, tc = api("GET", f"/check-ins/{check_in_id}/transcript", ptok)
    turns = (_unwrap(tc) or {}).get("turns", []) if tc else []
    return {"replies": replies, "completed": completed, "turns": turns}


def generate_report(admin_token: str, ground_id: str) -> None:
    api("POST", f"/grounds/{ground_id}/report/generate", admin_token)


def release_report(admin_token: str, ground_id: str) -> None:
    """A generated report is a stub until released; GET returns synthesis fields only after this."""
    api("POST", f"/grounds/{ground_id}/report/release", admin_token)


def get_report(token: str, ground_id: str) -> dict | None:
    s, c = api("GET", f"/grounds/{ground_id}/report", token)
    if s and 200 <= s < 300:
        return _unwrap(c)
    return None


def get_report_polling(token: str, ground_id: str, tries: int = 10, delay: float = 4.0) -> dict | None:
    """Report synthesis is async; poll until it appears or we give up."""
    import time
    for _ in range(tries):
        rep = get_report(token, ground_id)
        if rep:
            return rep
        time.sleep(delay)
    return None


DASH_CHARS = {"–": "en-dash", "—": "em-dash"}
TYPO_CHARS = {"“": "curly-quote", "”": "curly-quote", "‘": "curly-apostrophe",
              "’": "curly-apostrophe", "…": "ellipsis-char", " ": "nbsp"}


def scan_typography(text: str) -> list[tuple[str, str, str]]:
    """Return [(char_name, char, context)] for house-style violations."""
    hits = []
    if not text:
        return hits
    for ch, name in {**DASH_CHARS, **TYPO_CHARS}.items():
        idx = text.find(ch)
        while idx != -1:
            hits.append((name, ch, text[max(0, idx - 30):idx + 30]))
            idx = text.find(ch, idx + 1)
    return hits

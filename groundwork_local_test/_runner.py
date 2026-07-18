"""Shared bones for the Phase 1 persona suites (V, M, B, L).

Design rules these helpers enforce:
- Findings are the product, not failures: a runner exits 0 when it RAN and
  reports via results/<suite>/findings.json (aggregator-standard shape:
  list of {agent, severity, check, detail, url}). A runner exits non-zero
  only when it CRASHED - and the workflow treats that as a red run.
- Every suite must be able to go red: assert helpers record CRITICAL
  findings AND flip the runner's exit to non-zero when `hard=True`, so the
  PR gate can block on the invariants that actually bit us (the vanish
  class, the paywall class).
- No product code is touched. Authentication happens the way a human's does:
  a real magic link read from the mailcatcher, opened in a real context.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:5173")
API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:3000/api/v1")
MAIL_BASE = os.environ.get("MAIL_BASE", "http://127.0.0.1:1080")

# Watch mode (GW_WATCH=1): suites run HEADED - real Chromium windows walking
# the pages live - and every step also lands on the live board
# (results/live/index.html, auto-refreshing), which can be opened in the
# Claude preview panel. The preview browser itself cannot be driven by an
# external Playwright process (no CDP handle is exposed), so watch mode is
# the honest equivalent: real visible windows + a 1s-lagged page-by-page
# mirror in the preview. CI stays headless and keeps every screenshot as an
# artifact - never a bare pass/fail.
WATCH = os.environ.get("GW_WATCH") == "1"
LIVE_DIR = ROOT / "results" / "live"


async def launch(pw):
    """Launch Chromium honoring watch mode. slow_mo makes the walk followable."""
    return await pw.chromium.launch(headless=not WATCH, slow_mo=250 if WATCH else 0)


class Recorder:
    """Collects findings for one suite and writes the aggregator-standard file."""

    def __init__(self, suite: str):
        self.suite = suite
        self.findings: list[dict] = []
        self.hard_failures = 0
        self.results_dir = ROOT / "results" / suite
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def record(self, agent, severity: str, check: str, detail: str = "", url: str = ""):
        entry = {
            "agent": agent,
            "severity": severity,
            "check": check,
            "detail": detail,
            "url": url,
            "ts": datetime.now().isoformat(),
        }
        self.findings.append(entry)
        marker = {"CRITICAL": "🔴", "MISSING": "🟠", "FINDING": "🟡", "WARN": "🟡", "BLOCKED": "⚪", "OK": "🟢"}.get(severity, "·")
        print(f"  {marker} [{severity}] {check}" + (f" - {detail[:140]}" if detail else ""), flush=True)

    def check(self, agent, ok: bool, check: str, detail: str = "", url: str = "", hard: bool = False):
        """Assert-style: OK when true; CRITICAL when false. hard=True also
        makes the whole runner exit non-zero - the red the PR gate blocks on."""
        if ok:
            self.record(agent, "OK", check, url=url)
        else:
            # hard = the invariant the PR gate blocks on; soft = worth a look
            self.record(agent, "CRITICAL" if hard else "FINDING", check, detail=detail, url=url)
            if hard:
                self.hard_failures += 1
        return ok

    async def step(self, page, label: str, persona: str = ""):
        """Capture one step: numbered screenshot into results/<suite>/steps/
        plus a live-board update so a watcher (preview panel) sees each page
        as the persona lands on it. Every suite gets this for free."""
        self._step_n = getattr(self, "_step_n", 0) + 1
        steps_dir = self.results_dir / "steps"
        steps_dir.mkdir(parents=True, exist_ok=True)
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in label)[:60]
        shot = steps_dir / f"{self._step_n:03d}_{safe}.png"
        try:
            await page.screenshot(path=str(shot))
        except Exception:
            return
        self._update_board(shot, label, persona)

    def _update_board(self, shot: Path, label: str, persona: str):
        try:
            LIVE_DIR.mkdir(parents=True, exist_ok=True)
            latest = LIVE_DIR / f"latest_{self.suite}.png"
            latest.write_bytes(shot.read_bytes())
            entry = {"suite": self.suite, "step": self._step_n, "label": label,
                     "persona": persona, "ts": datetime.now().strftime("%H:%M:%S")}
            state_p = LIVE_DIR / "state.json"
            state = {}
            if state_p.exists():
                try:
                    state = json.loads(state_p.read_text())
                except Exception:
                    state = {}
            state[self.suite] = entry
            state_p.write_text(json.dumps(state, indent=1))
            cards = "".join(
                f"""<div class='card'><h2>{k} <small>step {v['step']} - {v['ts']}</small></h2>
                <p>{v['persona']} {v['label']}</p>
                <img src='latest_{k}.png?ts={v['ts']}'/></div>"""
                for k, v in sorted(state.items())
            )
            (LIVE_DIR / "index.html").write_text(
                "<!doctype html><meta http-equiv='refresh' content='1'>"
                "<title>Persona run - live</title>"
                "<style>body{font-family:sans-serif;background:#0A1628;color:#eee;margin:16px}"
                ".card{margin-bottom:20px}img{max-width:100%;border:1px solid #345;border-radius:8px}"
                "h2{margin:4px 0}small{color:#8ab}p{margin:2px 0 8px;color:#cde}</style>"
                f"<h1>Persona suites - live board</h1>{cards}"
            )
        except Exception:
            pass

    def finish(self) -> int:
        out = self.results_dir / "findings.json"
        out.write_text(json.dumps(self.findings, indent=1))
        crit = sum(1 for f in self.findings if f["severity"] == "CRITICAL")
        print(f"\n{self.suite}: {len(self.findings)} findings ({crit} critical) -> {out}", flush=True)
        return 1 if self.hard_failures else 0


# ---- plain HTTP helpers (no auth) -------------------------------------------

def http_json(method: str, url: str, body: dict | None = None, token: str | None = None, timeout: int = 30):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            payload = json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode() or "{}")
        except Exception:
            payload = {"error": str(e)}
        return e.code, _unwrap(payload)
    except Exception as e:
        return 0, {"error": str(e)}
    return 200, _unwrap(payload)


def _unwrap(payload):
    # API responses arrive as {success, data, ...}; unwrap to the data.
    if isinstance(payload, dict) and "data" in payload and "success" in payload:
        return payload["data"]
    return payload


def api(method: str, path: str, body: dict | None = None, token: str | None = None):
    return http_json(method, f"{API_BASE}{path}", body, token)


# ---- mailcatcher ------------------------------------------------------------

def mail_clear():
    http_json("POST", f"{MAIL_BASE}/clear")


def mail_link(to: str, match: str | None = None, timeout_s: int = 20) -> str | None:
    """Newest link emailed to `to` (optionally containing `match`), waiting for
    delivery. Returns None if nothing arrives - callers record that finding."""
    q = f"?to={urllib.parse.quote(to)}" + (f"&match={urllib.parse.quote(match)}" if match else "")
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        code, res = http_json("GET", f"{MAIL_BASE}/link{q}")
        if code == 200 and isinstance(res, dict) and res.get("link"):
            return res["link"]
        time.sleep(1)
    return None


def mail_messages(to: str) -> list[dict]:
    code, res = http_json("GET", f"{MAIL_BASE}/messages?to={urllib.parse.quote(to)}")
    return res if code == 200 and isinstance(res, list) else []


# ---- pages that narrate themselves ------------------------------------------

async def new_page(rec: "Recorder", ctx, persona: str = ""):
    """Create a page whose EVERY navigation lands on the live board and in the
    step record automatically. Suites get page-by-page coverage for free; the
    hand-placed rec.step() calls remain for the semantic beats."""
    page = await ctx.new_page()

    def _on_load():
        async def cap():
            try:
                url = page.url.split("//", 1)[-1][:70]
                await rec.step(page, f"-> {url}", persona)
            except Exception:
                pass
        try:
            asyncio.get_event_loop().create_task(cap())
        except Exception:
            pass

    page.on("load", _on_load)
    return page


# ---- persona provisioning (the real auth path, no DB access) ----------------

async def provision_admin(browser, email: str, viewport=None) -> tuple[object, str, str]:
    """Create an authed admin the way a real person becomes one: entry-save
    with the email, read the magic link from the mailcatcher, open it in a
    fresh context. Returns (context, token, origin).

    ORIGIN MATTERS: the magic link opens on FRONTEND_URL's origin (often
    localhost) while BASE_URL may be 127.0.0.1 - different origins hold
    different localStorage, so authed navigation MUST use the returned origin
    or every page lands on /auth and page-level checks pass vacuously."""
    code, _ = api("POST", "/auth/entry-save", {"email": email})
    if code != 200:
        raise RuntimeError(f"entry-save failed for {email}: HTTP {code}")
    link = mail_link(email, match="verify-email")
    if not link:
        raise RuntimeError(f"no magic link arrived for {email}")
    origin = link.split("/verify-email")[0]
    ctx = await browser.new_context(viewport=viewport or {"width": 1366, "height": 768})
    page = await ctx.new_page()
    await page.goto(link)
    token = None
    for _ in range(30):
        token = await page.evaluate("() => localStorage.getItem('token')")
        if token:
            break
        await page.wait_for_timeout(500)
    if not token:
        raise RuntimeError(f"magic link did not authenticate {email}")
    await page.close()
    return ctx, token, origin


# ---- entry-session seeding (client-side, the same shape the app saves) ------

ENTRY_HISTORY = [
    {"role": "assistant", "content": "Good, I have what I need. What is your version of who owns the launch checklist?"},
    {"role": "user", "content": "Nia owns it because design signs off last. Sam thinks he owns it because engineering ships. We have never said it out loud."},
    {"role": "assistant", "content": "That is a clear structural gap and it is in your record. What does success look like for you?"},
    {"role": "user", "content": "Launching August 15 with zero rollbacks and a sign-off map with one name per line, agreed by Nia and Sam on Tuesday."},
    {"role": "assistant", "content": "That is on record. Your record for this project is now clear."},
]


async def seed_closed_entry_session(page, scenario: str = "NEW_PROJECT"):
    """Put a finished-but-unsaved anonymous session into the page's device
    storage - the exact state a person is in when the report is on screen and
    they have not yet given an email. The save/verify machinery under test
    starts from here; the AI conversation itself is not the subject."""
    session = {
        "scenario": scenario,
        "closed": True,
        "onboardingStep": 7,
        "history": ENTRY_HISTORY,
        "onboardingSelections": {"mode": "new", "initial": "New project - launch checklist ownership"},
    }
    await page.evaluate(
        "(s) => { localStorage.clear(); localStorage.setItem('gw_entry_session', JSON.stringify(s)); }",
        session,
    )

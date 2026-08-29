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
import re
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

# THE SHARED HELPERS WERE OUTSIDE THE PINNED DISCIPLINE, WHICH IS WHY THE RENAME WENT UNNOTICED HERE.
# The suites import their UI copy from `_ui_strings` and a client guard holds every entry in that
# list to text the product still renders. This file typed its own, so `ground_reached` sat waiting
# for "Your ground is set up" for three days after the words changed, and every suite that
# provisions a check-in reported the check-in as never created.
from _ui_strings import (
    ONE_LAST_STEP,
    ORG_SETUP_HEADING,
    ORG_SETUP_NAME_PLACEHOLDER,
    ORG_SETUP_EMAIL_PLACEHOLDER,
)

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


# ---- model-turn budget (overnight Phase C) ----------------------------------
# The orchestrator seeds a counter file and points GW_MODEL_BUDGET_FILE at it;
# every model-driven call in a suite takes from it first. When the budget is
# exhausted the caller records SKIPPED_BUDGET - never a failure, never silent.
# Suites run sequentially under the orchestrator, so plain file I/O is
# race-free. Without the env var (dev runs, the PR gate) the budget is
# unlimited and this is a no-op.

def model_budget_take(n: int = 1) -> bool:
    path = os.environ.get("GW_MODEL_BUDGET_FILE")
    if not path:
        return True
    try:
        remaining = int(Path(path).read_text().strip() or "0")
    except Exception:
        return True  # unreadable budget file must not kill a suite
    if remaining < n:
        return False
    Path(path).write_text(str(remaining - n))
    return True


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


async def complete_password_step(page, password: str = "PersonaPass123!") -> bool:
    """Set a password if the app is asking for one, and report whether it did.

    Verification now lands on ONE_LAST_STEP for a brand-new account, because signup promises a
    password and until recently never asked for one. Every persona journey that arrives by magic
    link therefore meets this screen, and a harness that does not fill it in is not testing the
    product a person uses - it stalls on step two of three.

    Deliberately tolerant: returns False when the screen is absent rather than raising, so the same
    call is safe on paths where the account already has a password (a returning person, or a second
    magic link for the same account).
    """
    try:
        await page.get_by_text(ONE_LAST_STEP).wait_for(timeout=6000)
    except Exception:
        return False
    boxes = page.locator('input[type="password"]:visible')
    n = await boxes.count()
    for i in range(n):
        await boxes.nth(i).fill(password)
    await page.get_by_role("button", name=re.compile("Set password", re.I)).first.click()
    # The redirect that follows is a real navigation; give it room on a cold dev server.
    await page.wait_for_timeout(3500)
    return True



async def complete_org_setup(page, contact_email: str = "persona-org@example.com") -> bool:
    """Fill in the organisation details if the app is asking for them, and report whether it did.

    An ADMIN whose organisation has no contact email is sent to `/org/setup` by `RequireOrgSetup`,
    and every route in the product redirects there until it is filled in. Sign-up creates the
    organisation automatically with a name derived from the email domain and no contact address, so
    a brand-new admin arriving by magic link meets this screen on the way to their first check-in.

    THIS IS A REAL STEP, NOT A HARNESS WORKAROUND. Skipping it by writing the field straight into
    the database would test a product nobody uses. The suites failed with "this is not a ground:
    /org/setup", which read like the check-in never being created and was actually the harness
    stopping at a gate a person walks through.

    Tolerant like `complete_password_step`: returns False when the screen is absent, so the same
    call is safe on every path, including an admin whose organisation is already set up.
    """
    try:
        await page.get_by_text(ORG_SETUP_HEADING).wait_for(timeout=6000)
    except Exception:
        return False
    # The name is pre-filled from the email domain at sign-up; only the contact address is missing.
    # Filled by placeholder rather than by label, because the labels here are plain text next to the
    # input rather than bound to it, and a `get_by_label` would match nothing.
    email_box = page.locator(f'input[placeholder="{ORG_SETUP_EMAIL_PLACEHOLDER}"]:visible')
    if await email_box.count():
        await email_box.first.fill(contact_email)
    name_box = page.locator(f'input[placeholder="{ORG_SETUP_NAME_PLACEHOLDER}"]:visible')
    if await name_box.count() and not (await name_box.first.input_value()).strip():
        await name_box.first.fill("Persona Test Org")
    await page.get_by_role("button", name=re.compile("Continue", re.I)).first.click()
    await page.wait_for_timeout(3000)
    return True


async def ground_reached(page, timeout_ms: int = 25000) -> bool:
    """Did the magic link end with this person looking at a real ground?

    There are two honest endings now, and the suites must accept both:

      * the interstitial - "Your ground is set up" with a "Go to your ground" button. This is what
        somebody who ALREADY has a password sees.
      * the ground page itself - a brand-new account is sent through the password step after the
        commit, and lands on `/grounds/<id>`, so the confirmation screen is skipped.

    The second ending is stronger evidence than the first, not weaker: being on the ground's own
    page, under its own name, is the ground existing. The interstitial only ever claimed it did.

    What this must NOT do is pass on a bare timeout or on any authenticated page - the failure it
    guards against is the ground silently never being created, and /grounds with an empty list is
    exactly what that looks like. So a grounds LIST does not count; only a specific ground.
    """
    try:
        await page.wait_for_function(
            """() => {
                 const t = document.body ? document.body.innerText : '';
                 // Renamed 2026-08-26 - "ground" became "check-in" on both. The old spellings
                 // lived here inside a JS regex inside a Python string, which is why no search
                 // for get_by_text() found them and why provision_ground kept failing after the
                 // button itself was fixed. Only the live copy is accepted: carrying the dead
                 // spelling alongside is how it went stale unnoticed the first time. A client
                 // guard now reads these alternatives and checks each against what renders.
                 if (/Your check-in is set up|Go to your check-in/i.test(t)) return true;
                 return /^\\/grounds\\/[^/]+/.test(location.pathname) && /My check-ins|Opened for/i.test(t);
               }""",
            timeout=timeout_ms,
        )
        return True
    except Exception:
        return False


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
    await complete_password_step(page)
    # And the organisation gate right after it. Both are steps a real admin walks through on the way
    # to their first check-in, and both are here rather than in each suite so that a suite which
    # only wants an authed admin does not have to know the shape of sign-up to get one.
    await complete_org_setup(page)
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

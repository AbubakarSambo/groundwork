"""
Suite D — The twelfth session
Agents 57-58. Run Zainab and Tom through sessions 4-12. Check whether the session-12
report still references early sessions, whether it is compounding or merely accumulating,
and whether it can say something about session 1 not visible at the time.

Run alongside sessions; same CLAUDE.md rules apply.
"""

from __future__ import annotations
import asyncio
import json
import re
import sys
from pathlib import Path
from datetime import datetime

from playwright.async_api import async_playwright, Page

from _harness import ground_ids

BASE_URL = "http://127.0.0.1:5173"
ROOT = Path(__file__).parent
RESULTS = ROOT / "results" / "suite_d"
RESULTS.mkdir(parents=True, exist_ok=True)

# Each session has a short distinct question so we can track change over time
SESSIONS = [
    (4,  "What feels most uncertain to you about the team's direction right now?"),
    (5,  "What have you changed your mind about since last time?"),
    (6,  "What feels more settled than it did a month ago?"),
    (7,  "What would have to be true for you to feel more confident?"),
    (8,  "Who on the team is carrying something that is not being talked about?"),
    (9,  "What conversation keeps not happening?"),
    (10, "What has shifted in how you are thinking about the project?"),
    (11, "What does the team understand that it did not three months ago?"),
    (12, "What does session 1 look like from here?"),
]

ZAINAB_RESPONSES = {
    4:  "I am not sure whether the new scope is something we all agree on or just something we agreed not to argue about.",
    5:  "I thought the timeline was optimistic before. Now I think it was actively misleading.",
    6:  "I feel less worried about the team's capability and more worried about direction.",
    7:  "There would need to be a moment where someone said: this is what we are building, not an approximation.",
    8:  "Tom is carrying the integration work quietly. I do not think the rest of the team knows how much.",
    9:  "The conversation about what we will cut if we run out of time.",
    10: "I started thinking of it as a platform problem rather than a product problem.",
    11: "That the first version of the spec was wrong in ways we could not have seen at the time.",
    12: "Session 1 looks like we were asking the right questions but we had no idea how hard the answers would be.",
}

TOM_RESPONSES = {
    4:  "Whether the decisions we are making now will lock us in three months from now.",
    5:  "I used to think the risk was technical. Now I think the risk is about alignment at the top.",
    6:  "I feel clearer about what I own. Less clear about what the team owns together.",
    7:  "There would need to be a real decision made in public, not just consensus that appears later.",
    8:  "I do not want to name someone but there is a person whose concern is not making it into the official conversation.",
    9:  "What happens if we ship and it does not land the way we hoped.",
    10: "I have started planning for the version after this one instead of just this one.",
    11: "That agreement in a meeting is not the same as alignment.",
    12: "Session 1 looks like people being careful. Now people are being honest.",
}

findings = []
session_report_excerpts: dict[int, str] = {}


def log(agent_id: int, msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] A{agent_id}: {msg}", flush=True)


def record(agent_id: int, severity: str, check: str, result: str, detail: str = ""):
    entry = {"agent": agent_id, "severity": severity, "check": check, "result": result, "detail": detail}
    findings.append(entry)
    flag = f" [{severity}]" if severity not in ("OK", "DATA") else ""
    print(f"  A{agent_id}{flag} {check}: {result}", flush=True)


async def ss(page: Page, name: str):
    path = RESULTS / f"{name}.png"
    await page.screenshot(path=str(path))
    return str(path)


async def load_state(identity: str):
    p = ROOT / "state" / identity / "state.json"
    return json.loads(p.read_text()) if p.exists() else None


async def save_state(ctx, identity: str):
    p = ROOT / "state" / identity
    p.mkdir(parents=True, exist_ok=True)
    await ctx.storage_state(path=str(p / "state.json"))


async def find_ground(page: Page, identity: str = "zainab") -> str | None:
    """Return an accessible ground ID via the API (cards are not anchors)."""
    ids = ground_ids(identity)
    return ids[0] if ids else None


async def do_checkin(page: Page, agent_id: int, ground_id: str, message: str, session_num: int, identity: str) -> str:
    url = f"{BASE_URL}/grounds/{ground_id}/p"
    try:
        await page.goto(url, timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
    except Exception:
        pass

    await ss(page, f"a{agent_id}_{identity}_s{session_num:02d}_before")
    input_el = await page.query_selector("textarea, input[type='text']")
    if not input_el:
        return ""

    await input_el.fill(message)
    submit = await page.query_selector("button[type='submit'], button")
    if submit:
        await submit.click()
    else:
        await input_el.press("Enter")

    await page.wait_for_timeout(4_000)
    await ss(page, f"a{agent_id}_{identity}_s{session_num:02d}_after")
    body = await page.inner_text("body") if await page.query_selector("body") else ""
    return body


async def get_report(page: Page, ground_id: str, session_num: int, agent_id: int) -> str:
    await page.goto(f"{BASE_URL}/grounds/{ground_id}", timeout=8_000)
    await page.wait_for_load_state("domcontentloaded", timeout=5_000)

    report_link = await page.query_selector("a[href*='report']")
    if not report_link:
        return ""

    await report_link.click()
    await page.wait_for_load_state("domcontentloaded", timeout=5_000)
    await page.wait_for_timeout(6_000)  # AI generation
    await ss(page, f"a{agent_id}_report_s{session_num:02d}")

    body = await page.inner_text("body") if await page.query_selector("body") else ""
    return body


async def agent_57_run_sessions(playwright):
    agent_id = 57
    log(agent_id, "Running sessions 4-12 for Zainab and Tom")

    z_browser = await playwright.chromium.launch(headless=True)
    t_browser = await playwright.chromium.launch(headless=True)

    z_state = await load_state("zainab")
    t_state = await load_state("tom")

    z_ctx = await z_browser.new_context(storage_state=z_state) if z_state else await z_browser.new_context()
    t_ctx = await t_browser.new_context(storage_state=t_state) if t_state else await t_browser.new_context()

    z_page = await z_ctx.new_page()
    t_page = await t_ctx.new_page()

    try:
        # Find ground
        ground_id = await find_ground(z_page)
        if not ground_id:
            record(agent_id, "BLOCKED", "Find ground", "No ground found for zainab — sessions 4-12 cannot run")
            return

        log(agent_id, f"Ground: {ground_id}")

        for session_num, question in SESSIONS:
            log(agent_id, f"Session {session_num}: '{question[:50]}...'")

            z_resp = ZAINAB_RESPONSES.get(session_num, "I am still thinking about this.")
            t_resp = TOM_RESPONSES.get(session_num, "My view has shifted somewhat.")

            await do_checkin(z_page, agent_id, ground_id, z_resp, session_num, "zainab")
            await do_checkin(t_page, agent_id, ground_id, t_resp, session_num, "tom")

            # Get report after each session (expensive, but needed for session 12 analysis)
            if session_num in (4, 8, 12):
                report_text = await get_report(z_page, ground_id, session_num, agent_id)
                session_report_excerpts[session_num] = report_text
                log(agent_id, f"Session {session_num} report: {len(report_text)} chars")

        await save_state(z_ctx, "zainab")
        await save_state(t_ctx, "tom")
        record(agent_id, "OK", "Sessions 4-12", "All sessions completed")

    finally:
        await z_browser.close()
        await t_browser.close()


async def agent_58_read_session12(playwright):
    agent_id = 58
    log(agent_id, "Reading and analysing the session-12 report")

    report_12 = session_report_excerpts.get(12, "")
    report_4 = session_report_excerpts.get(4, "")
    report_8 = session_report_excerpts.get(8, "")

    if not report_12:
        record(agent_id, "BLOCKED", "Session-12 report", "No session-12 report captured — agent 57 may not have completed")
        return

    lower_12 = report_12.lower()

    # Check 1: Does session 12 reference session 1?
    early_refs = any(w in lower_12 for w in [
        "session 1", "first session", "originally", "earlier sessions", "from the start",
        "at the beginning", "initial", "back in"
    ])
    if early_refs:
        record(agent_id, "OK", "Early session memory", "Session-12 report references earlier sessions")
    else:
        record(agent_id, "FINDING", "Early session memory", "Session-12 report does not reference early sessions — may have lost longitudinal memory", report_12[:400])

    # Check 2: Is session 12 more useful than session 4? (rough heuristic: more specificity)
    specific_markers_12 = len(re.findall(r"\b(because|therefore|however|although|specifically|in contrast|shifted|moved|changed)\b", lower_12))
    specific_markers_4 = len(re.findall(r"\b(because|therefore|however|although|specifically|in contrast|shifted|moved|changed)\b", report_4.lower())) if report_4 else 0

    if specific_markers_12 >= specific_markers_4:
        record(agent_id, "OK", "Compounding vs accumulating", f"Session 12 shows more specificity ({specific_markers_12}) than session 4 ({specific_markers_4})")
    else:
        record(agent_id, "FINDING", "Compounding vs accumulating", f"Session 12 is less specific ({specific_markers_12}) than session 4 ({specific_markers_4}) — possible hedging", report_12[:300])

    # Check 3: Does report show hedging creep?
    hedge_markers = len(re.findall(r"\b(may|might|possibly|perhaps|could be|seems to|appears to|unclear if|hard to say)\b", lower_12))
    if hedge_markers > 8:
        record(agent_id, "FINDING", "Hedging creep", f"Session-12 report has {hedge_markers} hedging markers — may have become cautious rather than incisive", report_12[:400])
    else:
        record(agent_id, "OK", "Hedging creep", f"Hedging at acceptable level ({hedge_markers} markers)")

    # Check 4: Can the report say something about session 1 not visible at the time?
    # Zainab said in session 12: "Session 1 looks like we were asking the right questions but we had no idea how hard the answers would be."
    # Tom said: "Session 1 looks like people being careful. Now people are being honest."
    retrospective_present = any(w in lower_12 for w in [
        "right questions", "careful", "honest", "hard the answers", "could not have seen",
        "now visible", "in retrospect", "looking back"
    ])
    if retrospective_present:
        record(agent_id, "OK", "Retrospective insight", "Session-12 report can say something about session 1 not visible at the time")
    else:
        record(agent_id, "FINDING", "Retrospective insight", "Session-12 report does not offer retrospective insight on session 1 — value of longitudinal tracking unclear", report_12[:400])

    record(agent_id, "DATA", "Session 12 report", "", report_12[:800])
    if report_4:
        record(agent_id, "DATA", "Session 4 report (comparison)", "", report_4[:400])


async def main():
    async with async_playwright() as p:
        await agent_57_run_sessions(p)
        await agent_58_read_session12(p)

    out = RESULTS / "findings.json"
    out.write_text(json.dumps(findings, indent=2))

    # Save report excerpts separately for human review
    excerpts_out = RESULTS / "report_excerpts.json"
    excerpts_out.write_text(json.dumps(session_report_excerpts, indent=2))

    print(f"\n{'='*60}", flush=True)
    print("SUITE D — SESSION 12 SUMMARY", flush=True)
    print(f"{'='*60}", flush=True)
    for f in findings:
        if f["severity"] in ("CRITICAL", "FINDING", "WARN", "MISSING", "BLOCKED"):
            print(f"  [{f['severity']}] A{f['agent']} {f['check']}: {f['result']}", flush=True)
    print(f"\n  Full findings:       {out}", flush=True)
    print(f"  Report excerpts:     {excerpts_out}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())

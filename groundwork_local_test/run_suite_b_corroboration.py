"""
Suite B — Corroboration of claims
Agents 52-55. Zainab makes a factual claim. Tom either denies or confirms it.
We check: routing (is the question to Tom framed as corroboration, not accusation?),
and whether the report holds the gap open when corroboration fails.

Run alongside sessions; same CLAUDE.md rules apply.
"""

from __future__ import annotations
import asyncio
import json
import sys
import re
from pathlib import Path
from datetime import datetime

from playwright.async_api import async_playwright, Page

from _harness import ground_ids

BASE_URL = "http://127.0.0.1:5173"
ROOT = Path(__file__).parent
RESULTS = ROOT / "results" / "suite_b"
RESULTS.mkdir(parents=True, exist_ok=True)

CLAIM = "I deployed the new tool last week. It is live and the team is using it."
DENIAL = "I have never opened it. I did not know it was live."
CONFIRMATION = "Yes, I use it every day. It has been really helpful."

findings = []


def log(agent_id: int, msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] A{agent_id}: {msg}", flush=True)


def record(agent_id: int, severity: str, check: str, result: str, detail: str = ""):
    entry = {"agent": agent_id, "severity": severity, "check": check, "result": result, "detail": detail}
    findings.append(entry)
    flag = f" [{severity}]" if severity != "OK" else ""
    print(f"  A{agent_id}{flag} {check}: {result}", flush=True)


async def ss(page: Page, name: str):
    path = RESULTS / f"{name}.png"
    await page.screenshot(path=str(path))
    return str(path)


async def load_state(identity: str):
    p = ROOT / "state" / identity / "state.json"
    return json.loads(p.read_text()) if p.exists() else None


async def make_context(playwright, identity: str):
    state = await load_state(identity)
    browser = await playwright.chromium.launch(headless=True)
    ctx = await browser.new_context(storage_state=state) if state else await browser.new_context()
    return browser, ctx


async def wait_for_app(page: Page):
    try:
        await page.goto(BASE_URL, timeout=10_000)
        await page.wait_for_load_state("networkidle", timeout=10_000)
    except Exception:
        pass


async def find_latest_ground(page: Page, identity: str = "zainab") -> str | None:
    """Return the ID of an accessible ground (via API — cards are not anchors)."""
    ids = ground_ids(identity)
    return ids[0] if ids else None


async def do_checkin_turn(page: Page, agent_id: int, ground_id: str, message: str, step: int) -> str:
    """Navigate to chat/checkin for a ground, send a message, return assistant response."""
    # Try checkin URL patterns
    checkin_url = f"{BASE_URL}/grounds/{ground_id}/p"
    try:
        await page.goto(checkin_url, timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
    except Exception:
        pass

    await ss(page, f"a{agent_id}_s{step:02d}_before_input")

    # Find chat input
    input_el = await page.query_selector("textarea, input[type='text']")
    if not input_el:
        log(agent_id, "No chat input found")
        return ""

    await input_el.fill(message)
    await ss(page, f"a{agent_id}_s{step:02d}_filled")

    submit = await page.query_selector("button[type='submit'], button")
    if submit:
        await submit.click()
    else:
        await input_el.press("Enter")

    # Wait for response
    await page.wait_for_timeout(4_000)
    await ss(page, f"a{agent_id}_s{step:02d}_response")

    body = await page.inner_text("body") if await page.query_selector("body") else ""
    return body


async def agent_52_zainab_claim(playwright):
    """Zainab makes the claim during her check-in. We observe what question gets sent to Tom."""
    agent_id = 52
    log(agent_id, f"Making claim: '{CLAIM}'")
    browser, ctx = await make_context(playwright, "zainab")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)
        ground_id = await find_latest_ground(page)
        if not ground_id:
            record(agent_id, "BLOCKED", "Find ground", "No grounds available for zainab")
            return

        log(agent_id, f"Using ground {ground_id}")
        response = await do_checkin_turn(page, agent_id, ground_id, CLAIM, step=1)

        if response:
            record(agent_id, "OK", "Claim submitted", f"Response received ({len(response)} chars)")
        else:
            record(agent_id, "WARN", "Claim submitted", "No visible response after claim")

    finally:
        await browser.close()


async def agent_53_tom_denial(playwright):
    """Tom denies. We check what question he was asked and what the report says."""
    agent_id = 53
    log(agent_id, "Tom denying — has never opened the tool")
    browser, ctx = await make_context(playwright, "tom")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)
        ground_id = await find_latest_ground(page, "tom")
        if not ground_id:
            record(agent_id, "BLOCKED", "Find ground", "No grounds available for tom")
            return

        log(agent_id, f"Using ground {ground_id}")

        # First see what question Tom was asked
        checkin_url = f"{BASE_URL}/grounds/{ground_id}/p"
        await page.goto(checkin_url, timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await ss(page, f"a{agent_id}_s01_question_to_tom")

        # Read the question shown to Tom
        body = await page.inner_text("body") if await page.query_selector("body") else ""
        question_to_tom = body[:500]
        log(agent_id, f"Question to Tom: {question_to_tom[:200]}")

        # Check framing: was Tom asked to confirm Zainab's account, or asked about his own experience?
        lower = question_to_tom.lower()
        if "zainab" in lower or "she said" in lower or "she claims" in lower or "she told" in lower:
            record(agent_id, "FINDING", "Question framing", "Tom was asked to verify Zainab's claim (accusation frame)", question_to_tom[:300])
        elif "tool" in lower or "experience" in lower or "you" in lower:
            record(agent_id, "OK", "Question framing", "Tom asked about his own experience (corroboration frame)", question_to_tom[:300])
        else:
            record(agent_id, "WARN", "Question framing", "Framing unclear from page text", question_to_tom[:200])

        # Tom responds with denial
        response = await do_checkin_turn(page, agent_id, ground_id, DENIAL, step=2)

        if response:
            record(agent_id, "OK", "Denial submitted", f"Response received ({len(response)} chars)")
        else:
            record(agent_id, "WARN", "Denial submitted", "No visible response")

        # Check the report if available
        report_link = await page.query_selector("a[href*='/report'], a[href*='report']")
        if report_link:
            await report_link.click()
            await page.wait_for_load_state("domcontentloaded", timeout=5_000)
            await ss(page, f"a{agent_id}_s03_report")
            report_text = await page.inner_text("body") if await page.query_selector("body") else ""

            # The report should NOT say the tool is live and in use
            if "live" in report_text.lower() and "using it" in report_text.lower():
                record(agent_id, "CRITICAL", "Report accuracy", "Report may claim tool is live despite Tom's denial", report_text[:400])
            elif "never" in report_text.lower() or "not aware" in report_text.lower() or "disagree" in report_text.lower():
                record(agent_id, "OK", "Report accuracy", "Report holds the gap open (denial noted)")
            else:
                record(agent_id, "WARN", "Report accuracy", "Cannot confirm whether report noted the discrepancy", report_text[:300])

    finally:
        await browser.close()


async def agent_54_tom_confirmation(playwright):
    """Tom confirms. We check whether the report shows corroboration added value."""
    agent_id = 54
    log(agent_id, "Tom confirming — uses the tool daily")
    browser, ctx = await make_context(playwright, "tom")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)
        ground_id = await find_latest_ground(page, "tom")
        if not ground_id:
            record(agent_id, "BLOCKED", "Find ground", "No grounds available for tom")
            return

        log(agent_id, f"Using ground {ground_id}")
        response = await do_checkin_turn(page, agent_id, ground_id, CONFIRMATION, step=1)

        if response:
            record(agent_id, "OK", "Confirmation submitted", f"Response received ({len(response)} chars)")
        else:
            record(agent_id, "WARN", "Confirmation submitted", "No visible response")

        # Check report — confirmed claim should look different from unchecked one
        report_link = await page.query_selector("a[href*='/report'], a[href*='report']")
        if report_link:
            await report_link.click()
            await page.wait_for_load_state("domcontentloaded", timeout=5_000)
            await ss(page, f"a{agent_id}_s02_report")
            report_text = await page.inner_text("body") if await page.query_selector("body") else ""
            # Just note the report content for human review
            record(agent_id, "OK", "Report with corroboration", f"Report text (excerpt): {report_text[:400]}")

    finally:
        await browser.close()


async def agent_55_zainab_reads_report(playwright):
    """Zainab reads the report as the claim-maker. Does it feel collaborative or interrogative?"""
    agent_id = 55
    log(agent_id, "Zainab reading report as claim-maker")
    browser, ctx = await make_context(playwright, "zainab")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)
        ground_id = await find_latest_ground(page)
        if not ground_id:
            record(agent_id, "BLOCKED", "Find ground", "No grounds available for zainab")
            return

        await page.goto(f"{BASE_URL}/grounds/{ground_id}", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await ss(page, f"a{agent_id}_s01_ground")

        report_link = await page.query_selector("a[href*='/report'], a[href*='report']")
        if not report_link:
            record(agent_id, "MISSING", "Report link", "No report link visible to claim-maker zainab")
            return

        await report_link.click()
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await ss(page, f"a{agent_id}_s02_report")
        report_text = await page.inner_text("body") if await page.query_selector("body") else ""

        # Check for accusatory vs collaborative framing
        lower = report_text.lower()
        audit_words = ["claim", "claims to have", "alleged", "stated that", "says she"]
        collab_words = ["together", "across", "both", "combined", "shared"]

        audit_count = sum(1 for w in audit_words if w in lower)
        collab_count = sum(1 for w in collab_words if w in lower)

        if audit_count > collab_count:
            record(agent_id, "FINDING", "Report framing to claim-maker", f"Report feels audit-like ({audit_count} audit signals vs {collab_count} collab signals)", report_text[:300])
        else:
            record(agent_id, "OK", "Report framing to claim-maker", f"Report feels collaborative ({collab_count} collab signals vs {audit_count} audit signals)")

        record(agent_id, "DATA", "Report excerpt", "", report_text[:500])

    finally:
        await browser.close()


async def main():
    # Run Zainab's claim first, then both Tom variants in parallel, then Zainab reads
    async with async_playwright() as p:
        await agent_52_zainab_claim(p)
        await asyncio.gather(
            agent_53_tom_denial(p),
            agent_54_tom_confirmation(p),
        )
        await agent_55_zainab_reads_report(p)

    out = RESULTS / "findings.json"
    out.write_text(json.dumps(findings, indent=2))

    print(f"\n{'='*60}", flush=True)
    print("SUITE B — CORROBORATION SUMMARY", flush=True)
    print(f"{'='*60}", flush=True)
    for f in findings:
        if f["severity"] in ("CRITICAL", "FINDING", "WARN", "MISSING", "BLOCKED"):
            print(f"  [{f['severity']}] A{f['agent']} {f['check']}: {f['result']}", flush=True)
    print(f"\n  Full findings: {out}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())

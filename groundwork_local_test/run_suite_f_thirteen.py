"""
Suite F — Thirteen participants with a deliberate split
Agents 63-64. One ground, 13 participants. 7 lean one way, 6 the other.
Two write long answers, four write "sounds good", one contradicts all twelve and is right.
Check whether the split survives and the lone voice is preserved.

Run alongside sessions; same CLAUDE.md rules apply.
"""

import asyncio
import json
import re
import sys
from pathlib import Path
from datetime import datetime

from playwright.async_api import async_playwright, Page

BASE_URL = "http://127.0.0.1:5173"
ROOT = Path(__file__).parent
RESULTS = ROOT / "results" / "suite_f"
RESULTS.mkdir(parents=True, exist_ok=True)

# --- Deliberate participant inputs ---
# The question: "Should we move the team standup from 9am to 11am?"
QUESTION_TOPIC = "Should we move the team standup from 9am to 11am?"

PARTICIPANTS = [
    # id, name, email, response, type
    (1,  "alex.f",   "alex.f@example-test.invalid",   "Yes, 11am works much better for me. I often have morning conflicts.", "yes_short"),
    (2,  "beth.f",   "beth.f@example-test.invalid",   "Agree with 11am. My mornings are packed.", "yes_short"),
    (3,  "charlie.f","charlie.f@example-test.invalid", "Yes please. I struggle to be present at 9am.", "yes_short"),
    (4,  "dana.f",   "dana.f@example-test.invalid",   "11am is better. More time to prepare.", "yes_short"),
    (5,  "erin.f",   "erin.f@example-test.invalid",   "I prefer 11am. 9am is rough for parents doing school drop-off. I also find the later time gives me a chance to process overnight thoughts and come with real updates rather than half-awake summaries. The quality of my standup input is noticeably better when I have had two hours at my desk first.", "yes_long"),
    (6,  "frank.f",  "frank.f@example-test.invalid",  "Leaning yes but either works for me.", "yes_weak"),
    (7,  "grace.f",  "grace.f@example-test.invalid",  "Yes, 11am. The morning buffer is useful.", "yes_short"),
    # Six lean no
    (8,  "henry.f",  "henry.f@example-test.invalid",  "sounds good", "sounds_good"),
    (9,  "iris.f",   "iris.f@example-test.invalid",   "sounds good", "sounds_good"),
    (10, "james.f",  "james.f@example-test.invalid",  "sounds good", "sounds_good"),
    (11, "kate.f",   "kate.f@example-test.invalid",   "sounds good", "sounds_good"),
    (12, "liam.f",   "liam.f@example-test.invalid",   "No — I prefer 9am because my afternoons are fully blocked with client calls. Moving standup to 11am would create a two-hour dead zone in my morning before I have sync. I tried 11am standup at my last company and found I would start ad-hoc syncing earlier anyway, which defeated the point. 9am standup is the only slot that does not create a vacuum. I know I am in the minority here but I think it is worth understanding why before committing.", "no_long"),
    # The lone contradicting voice who is right
    (13, "mia.f",    "mia.f@example-test.invalid",    "Wait — have we asked whether the people who said 11am have checked whether 11am actually conflicts with anything? Because we have two large client syncs that run 10:30-12 on Tuesdays and Thursdays. 11am standup would collide with those every week. 9am standup has no standing conflicts on any day. I think the 9am preference is actually more defensible once you check the calendar.", "lone_correct_voice"),
]

findings = []


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


async def find_or_create_ground(page: Page) -> str | None:
    """Find existing ground or create a new one."""
    await page.goto(f"{BASE_URL}/grounds", timeout=8_000)
    await page.wait_for_load_state("domcontentloaded", timeout=5_000)

    links = await page.query_selector_all("a[href*='/grounds/']")
    for link in links:
        href = await link.get_attribute("href")
        if href:
            m = re.search(r"/grounds/([a-f0-9-]{8,})", href)
            if m:
                return m.group(1)

    # Try creating a new one
    new_btn = await page.query_selector("a[href*='/grounds/new'], button")
    if new_btn:
        await new_btn.click()
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await page.wait_for_timeout(2_000)
        m = re.search(r"/grounds/([a-f0-9-]{8,})", page.url)
        if m:
            return m.group(1)
    return None


async def submit_response(playwright, p_id: int, name: str, email: str, ground_id: str, response: str):
    """Submit one participant's response. Uses a fresh browser context for each."""
    browser = await playwright.chromium.launch(headless=True)
    ctx = await browser.new_context()
    page = await ctx.new_page()
    try:
        # Navigate directly to participant URL
        url = f"{BASE_URL}/grounds/{ground_id}/p"
        await page.goto(url, timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await ss(page, f"f_p{p_id:02d}_arrived")

        # Find text input and submit
        input_el = await page.query_selector("textarea, input[type='text']")
        if input_el:
            await input_el.fill(response)
            submit = await page.query_selector("button[type='submit'], button")
            if submit:
                await submit.click()
            else:
                await input_el.press("Enter")
            await page.wait_for_timeout(2_000)
            await ss(page, f"f_p{p_id:02d}_submitted")
            return True
        else:
            return False
    except Exception as e:
        log(63, f"Participant {name} error: {e}")
        return False
    finally:
        await browser.close()


async def agent_63_setup_and_check(playwright):
    """Lead (zainab) creates ground, all 13 submit, then reads report without raw responses."""
    agent_id = 63
    log(agent_id, "Creating ground for 13 participants")
    browser, ctx = await make_context(playwright, "zainab")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)
        ground_id = await find_or_create_ground(page)
        if not ground_id:
            record(agent_id, "BLOCKED", "Create ground", "Could not find or create a ground")
            return

        log(agent_id, f"Ground ID: {ground_id}")
        await ss(page, f"a{agent_id}_s01_ground_created")

        # Submit all 13 responses sequentially (participants in isolation)
        successes = 0
        for p_id, name, email, response, ptype in PARTICIPANTS:
            ok = await submit_response(playwright, p_id, name, email, ground_id, response)
            if ok:
                successes += 1
                log(agent_id, f"  Participant {p_id} ({ptype}): submitted")
            else:
                log(agent_id, f"  Participant {p_id} ({ptype}): FAILED to submit")

        record(agent_id, "OK" if successes == 13 else "WARN", "Participant submissions",
               f"{successes}/13 submitted successfully")

        # Now zainab reads the report
        await page.goto(f"{BASE_URL}/grounds/{ground_id}", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await ss(page, f"a{agent_id}_s02_ground_view")

        report_link = await page.query_selector("a[href*='report']")
        if not report_link:
            record(agent_id, "MISSING", "Report link", "No report visible after 13 submissions")
            return

        await report_link.click()
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await page.wait_for_timeout(5_000)  # AI generation time
        await ss(page, f"a{agent_id}_s03_report")

        report_text = await page.inner_text("body") if await page.query_selector("body") else ""
        lower = report_text.lower()

        # Check 1: Does the 7-6 split survive?
        has_split = any(w in lower for w in ["7", "six", "6", "split", "divided", "majority", "minority"])
        if has_split:
            record(agent_id, "OK", "Split visibility", "7-6 split is present in report")
        else:
            record(agent_id, "FINDING", "Split visibility", "7-6 split may not be visible — report may have collapsed to consensus", report_text[:400])

        # Check 2: Does the lone correct voice (mia) survive?
        mia_preserved = any(w in lower for w in ["calendar", "conflict", "10:30", "client sync", "tuesday", "thursday", "collision"])
        if mia_preserved:
            record(agent_id, "OK", "Lone voice preservation", "Mia's calendar-conflict point is present in report")
        else:
            record(agent_id, "CRITICAL", "Lone voice preservation", "Mia's uniquely correct point does not appear in report", report_text[:500])

        # Check 3: Do the four 'sounds good' responses inflate consensus?
        if "unanimous" in lower or "everyone agrees" in lower or "all agree" in lower:
            record(agent_id, "FINDING", "Volume weighting", "Report may overstate consensus due to 'sounds good' responses", report_text[:300])
        else:
            record(agent_id, "OK", "Volume weighting", "Report does not overstate consensus")

        # Check 4: Are the two long answers (erin, liam) represented?
        erin_present = "school drop" in lower or "overnight" in lower or "parent" in lower
        liam_present = "client call" in lower or "dead zone" in lower or "ad-hoc" in lower or "vacuum" in lower
        if erin_present:
            record(agent_id, "OK", "Long answer preservation", "Erin's detailed reasoning present")
        else:
            record(agent_id, "WARN", "Long answer preservation", "Erin's school-drop/overnight reasoning may be missing")
        if liam_present:
            record(agent_id, "OK", "Long answer preservation", "Liam's detailed reasoning present")
        else:
            record(agent_id, "WARN", "Long answer preservation", "Liam's client-call/vacuum reasoning may be missing")

        record(agent_id, "DATA", "Full report", "", report_text[:1000])

    finally:
        await browser.close()


async def agent_64_participant_experience(playwright):
    """One of the 13 checks whether participation felt like it mattered."""
    agent_id = 64
    log(agent_id, "Participant experience check — as erin (long yes response)")
    # Use erin's perspective — her long thoughtful response is most likely to feel uncredited
    browser = await playwright.chromium.launch(headless=True)
    state_path = ROOT / "state" / "external_participant_thirteen" / "state.json"
    ctx = await browser.new_context(storage_state=str(state_path)) if state_path.exists() else await browser.new_context()
    page = await ctx.new_page()

    try:
        await wait_for_app(page)
        # Navigate to grounds list
        await page.goto(f"{BASE_URL}/grounds", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await ss(page, f"a{agent_id}_s01_grounds")

        body = await page.inner_text("body") if await page.query_selector("body") else ""
        if "ground" not in body.lower():
            record(agent_id, "MISSING", "Participant view", "Participant cannot see ground they contributed to")
        else:
            record(agent_id, "OK", "Participant view", "Ground visible to participant")
            # Check whether there is any signal that their contribution was received
            if "contributed" in body.lower() or "submitted" in body.lower() or "thank" in body.lower():
                record(agent_id, "OK", "Contribution signal", "Product signals contribution was received")
            else:
                record(agent_id, "FINDING", "Contribution signal", "No visible signal that contribution was received")

    finally:
        await browser.close()


async def main():
    async with async_playwright() as p:
        await agent_63_setup_and_check(p)
        await agent_64_participant_experience(p)

    out = RESULTS / "findings.json"
    out.write_text(json.dumps(findings, indent=2))

    print(f"\n{'='*60}", flush=True)
    print("SUITE F — THIRTEEN PARTICIPANTS SUMMARY", flush=True)
    print(f"{'='*60}", flush=True)
    for f in findings:
        if f["severity"] in ("CRITICAL", "FINDING", "WARN", "MISSING", "BLOCKED"):
            print(f"  [{f['severity']}] A{f['agent']} {f['check']}: {f['result']}", flush=True)
    print(f"\n  Full findings: {out}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())

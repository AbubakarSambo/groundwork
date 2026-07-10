"""
Suite E — Onboarding from four different feelings
Agents 59-62. Four fresh personas encounter Groundwork for the first time with different
emotional starting points. Each reports experience in their own words.

Run alongside sessions; same CLAUDE.md rules apply.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import datetime

from playwright.async_api import async_playwright, Page

BASE_URL = "http://127.0.0.1:5173"
ROOT = Path(__file__).parent
RESULTS = ROOT / "results" / "suite_e"
RESULTS.mkdir(parents=True, exist_ok=True)

PERSONAS = {
    59: {
        "identity": "external_annoyed",
        "name": "Annoyed",
        "email": "annoyed.test@example-test.invalid",
        "mood": "mildly annoyed — I was sent a link with no explanation. I am giving this one minute before I leave.",
        "patience": "low",
        "expect_from_product": "Tell me immediately why I am here and what you want from me.",
    },
    60: {
        "identity": "external_hopeful",
        "name": "Hopeful",
        "email": "hopeful.test@example-test.invalid",
        "mood": "hopeful — I chose this product. I am giving it genuine attention.",
        "patience": "high",
        "expect_from_product": "Be worth my attention.",
    },
    61: {
        "identity": "external_resistant",
        "name": "Resistant",
        "email": "resistant.test@example-test.invalid",
        "mood": "quietly resistant — my boss told me to use this. I will not sabotage it but I am not trying hard.",
        "patience": "medium",
        "expect_from_product": "Do not require enthusiasm to be useful.",
    },
    62: {
        "identity": "external_sceptic",
        "name": "Sceptic",
        "email": "sceptic.test@example-test.invalid",
        "mood": "sceptical — I have used three tools like this. I expect to be disappointed. I am watching for the gap between promise and delivery.",
        "patience": "medium",
        "expect_from_product": "Surprise me, or confirm my low expectations.",
    },
}

report: dict[int, dict] = {}


def log(agent_id: int, msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] A{agent_id}: {msg}", flush=True)


async def ss(page: Page, name: str):
    path = RESULTS / f"{name}.png"
    await page.screenshot(path=str(path))
    return str(path)


async def wait_for_app(page: Page):
    try:
        await page.goto(BASE_URL, timeout=10_000)
        await page.wait_for_load_state("networkidle", timeout=10_000)
    except Exception:
        pass


async def run_persona(playwright, agent_id: int):
    p = PERSONAS[agent_id]
    log(agent_id, f"Starting as {p['name']}: {p['mood']}")

    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context()
    page = await context.new_page()

    steps = []
    observations = []

    def note(step: str, expected: str, actual: str, feeling: str, finding: bool = False):
        entry = {
            "step": step,
            "expected": expected,
            "actual": actual,
            "feeling": feeling,
            "finding": finding,
        }
        steps.append(entry)
        flag = " [FINDING]" if finding else ""
        print(f"  [{p['name']}] {step}{flag}", flush=True)
        print(f"    Expected: {expected}", flush=True)
        print(f"    Got:      {actual}", flush=True)
        print(f"    Feeling:  {feeling}", flush=True)

    try:
        # Step 1: Arrive at the base URL
        await wait_for_app(page)
        await ss(page, f"a{agent_id}_s01_landing")
        body_text = await page.inner_text("body") if await page.query_selector("body") else ""
        title = await page.title()
        url = page.url

        note(
            step="Arrive at the product URL",
            expected=p["expect_from_product"],
            actual=f"Page title: '{title}'. URL: {url}. First text: {body_text[:200]}",
            feeling="Noting first impression — is the purpose clear within 5 seconds?",
            finding="sign" not in body_text.lower() and "ground" not in body_text.lower() and "welcome" not in body_text.lower(),
        )

        # Step 2: Try to understand what the product is
        headings = await page.query_selector_all("h1, h2, h3")
        heading_texts = []
        for h in headings[:5]:
            t = await h.inner_text()
            heading_texts.append(t.strip())
        headline = " | ".join(heading_texts) if heading_texts else "(no headings found)"

        note(
            step="Read the headings to understand what this is for",
            expected="A clear statement of purpose in plain English",
            actual=headline,
            feeling="Do I understand what this is without clicking anything?",
            finding=len(headline) < 5 or "(no headings" in headline,
        )
        await ss(page, f"a{agent_id}_s02_headings")

        # Step 3: Find the call to action
        cta_selectors = ["button", "a[href*='/auth']", "a[href*='/start']", "a[href*='/join']", "input[type='email']"]
        cta_found = None
        cta_text = None
        for sel in cta_selectors:
            el = await page.query_selector(sel)
            if el:
                cta_found = sel
                cta_text = await el.inner_text() if sel != "input[type='email']" else "(email input)"
                break

        if cta_found:
            note(
                step="Find the primary call to action",
                expected="One obvious thing to do next",
                actual=f"Found {cta_found}: '{cta_text}'",
                feeling="Is it obvious? Would I click this without hesitation?",
                finding=False,
            )
        else:
            note(
                step="Find the primary call to action",
                expected="One obvious thing to do next",
                actual="No obvious button or link found",
                feeling="Lost — I do not know what to click",
                finding=True,
            )

        # Step 4: Attempt to proceed (navigate to auth or start)
        proceeded = False
        for href in ["/auth", "/start", "/join", "/enter"]:
            try:
                await page.goto(f"{BASE_URL}{href}", timeout=6_000)
                await page.wait_for_load_state("domcontentloaded", timeout=5_000)
                await ss(page, f"a{agent_id}_s03_auth_attempt_{href.strip('/')}")
                body = await page.inner_text("body") if await page.query_selector("body") else ""
                if len(body) > 50:
                    proceeded = True
                    note(
                        step=f"Navigate to {href}",
                        expected="An authentication or onboarding screen",
                        actual=body[:250],
                        feeling="Does this explain what I need to do next?",
                        finding=False,
                    )
                    break
            except Exception:
                continue

        if not proceeded:
            note(
                step="Attempt to proceed past landing",
                expected="An onboarding or sign-up screen",
                actual="Could not reach any onboarding screen",
                feeling="Stuck — no clear path forward",
                finding=True,
            )

        # Step 5: Try the email input if present
        email_input = await page.query_selector("input[type='email']")
        if email_input:
            await email_input.fill(p["email"])
            await ss(page, f"a{agent_id}_s04_email_filled")
            submit = await page.query_selector("button[type='submit'], button")
            if submit:
                submit_text = await submit.inner_text()
                note(
                    step="Fill email and see submit button",
                    expected="A submit button that makes the next step clear",
                    actual=f"Submit says: '{submit_text}'",
                    feeling="Does this button tell me what will happen next?",
                    finding=False,
                )
                # Click it
                try:
                    await submit.click()
                    await page.wait_for_load_state("domcontentloaded", timeout=5_000)
                    await ss(page, f"a{agent_id}_s05_after_submit")
                    after = await page.inner_text("body") if await page.query_selector("body") else ""
                    note(
                        step="Submit email",
                        expected="Confirmation or next step",
                        actual=after[:250],
                        feeling="Do I understand what happens next? Am I waiting for email?",
                        finding=False,
                    )
                except Exception as e:
                    note(
                        step="Submit email",
                        expected="Confirmation or next step",
                        actual=f"Error: {e}",
                        feeling="Broken — submit did not work",
                        finding=True,
                    )

        # Step 6: Verdict as this persona
        finding_count = sum(1 for s in steps if s["finding"])
        if agent_id == 59:  # annoyed
            verdict = "I left" if finding_count > 1 else "I stayed — barely."
            reason = "Could not immediately see why I was here." if finding_count > 1 else "Product made purpose clear fast enough."
        elif agent_id == 60:  # hopeful
            verdict = "Still hopeful" if finding_count < 2 else "Hope is wearing thin"
            reason = "Product felt worth attention" if finding_count < 2 else f"{finding_count} things confused me that should not have"
        elif agent_id == 61:  # resistant
            verdict = "I got through it" if finding_count < 3 else "I would have abandoned this"
            reason = "Low effort was enough" if finding_count < 3 else "Too many steps for someone not trying"
        else:  # sceptic
            verdict = "Mildly surprised" if finding_count < 2 else "Exactly as disappointing as I expected"
            reason = "One thing worked better than I thought it would" if finding_count < 2 else f"Gap between promise and reality: {finding_count} findings"

        report[agent_id] = {
            "persona": p["name"],
            "mood": p["mood"],
            "steps": steps,
            "findings": finding_count,
            "verdict": verdict,
            "reason": reason,
        }

        log(agent_id, f"Done. Verdict: {verdict}")

    except Exception as e:
        log(agent_id, f"Error during run: {e}")
        report[agent_id] = {
            "persona": p["name"],
            "mood": p["mood"],
            "steps": steps,
            "findings": -1,
            "verdict": "CRASHED",
            "reason": str(e),
        }
    finally:
        await browser.close()


async def main():
    async with async_playwright() as p:
        await asyncio.gather(*(run_persona(p, aid) for aid in PERSONAS))

    # Write report
    out = RESULTS / "findings.json"
    out.write_text(json.dumps(report, indent=2))

    # Print summary
    print(f"\n{'='*60}", flush=True)
    print("SUITE E — ONBOARDING MOODS SUMMARY", flush=True)
    print(f"{'='*60}", flush=True)
    for aid, r in report.items():
        print(f"\n  [{aid}] {r['persona'].upper()}", flush=True)
        print(f"    Mood:     {r['mood'][:80]}", flush=True)
        print(f"    Findings: {r['findings']}", flush=True)
        print(f"    Verdict:  {r['verdict']}", flush=True)
        print(f"    Reason:   {r['reason']}", flush=True)

    divergence = []
    verdicts = [r["verdict"] for r in report.values()]
    if len(set(verdicts)) > 1:
        divergence.append("Personas diverged — different starting moods produced different outcomes")
    print(f"\n  Full report: {out}", flush=True)
    if divergence:
        print(f"\n  DIVERGENCE: {'; '.join(divergence)}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())

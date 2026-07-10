#!/usr/bin/env python3
"""
Blind persona tests: agents 21-30
Rules: we are the person. We know nothing except what's on screen.
Getting stuck is data.
"""
import json, time, os, sys
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results/screenshots"
STATE_DIR = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/state"
BASE_URL = "http://localhost:5173"

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

findings = []

def log(agent_id, msg):
    print(f"[A{agent_id}] {msg}")
    findings.append(f"[A{agent_id}] {msg}")

def ss(page, agent_id, step):
    path = f"{SCREENSHOTS_DIR}/a{agent_id}_s{step}.png"
    page.screenshot(path=path)
    return path

def get_text(page):
    return page.evaluate("() => document.body.innerText")

def wait_for_text_change(page, agent_id, selector, timeout=10000):
    start = time.time()
    try:
        page.wait_for_selector(selector, timeout=timeout)
        elapsed = time.time() - start
        if elapsed > 5:
            log(agent_id, f"WAIT>{5}s: {selector} took {elapsed:.1f}s")
        return True
    except:
        elapsed = time.time() - start
        log(agent_id, f"TIMEOUT: {selector} not found after {elapsed:.1f}s")
        return False

def make_context(playwright, identity):
    browser = playwright.chromium.launch(headless=True)
    state_path = f"{STATE_DIR}/{identity}/state.json"
    if os.path.exists(state_path):
        ctx = browser.new_context(storage_state=state_path)
    else:
        ctx = browser.new_context()
    return browser, ctx

def save_state(ctx, identity):
    state_path = f"{STATE_DIR}/{identity}/state.json"
    os.makedirs(os.path.dirname(state_path), exist_ok=True)
    ctx.storage_state(path=state_path)

# ─── Agent 21 ───────────────────────────────────────────────────────────────
def agent_21():
    AID = 21
    log(AID, "=== Agent 21: Zainab, session 3, returning_admin ===")
    log(AID, "Intention: Third session. Run another ground and see how my group has changed.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        log(AID, "Step 1: Navigate to app. Expect: I am already logged in and see my dashboard.")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)
        text = get_text(page)
        log(AID, f"What actually happened: Page title area shows: {text[:300]}")

        log(AID, "Step 2: Look for my existing grounds. Expect: I see previous grounds listed.")
        ss(page, AID, 2)
        # Look for grounds list or dashboard
        if "Sarah Chen" in text or "ground" in text.lower() or "Engineering onboarding" in text:
            log(AID, "I can see references to previous grounds. I feel oriented.")
        else:
            log(AID, "I do not see my previous grounds on first view. I feel slightly disoriented.")

        log(AID, "Step 3: Look for a way to create a new ground or start a new session.")
        # Find create/new button
        create_btn = page.query_selector("button:has-text('New'), button:has-text('Create'), a:has-text('New ground'), button:has-text('Start')")
        if create_btn:
            log(AID, f"Found create button: {create_btn.inner_text()}")
        else:
            log(AID, "No obvious create button visible. Looking at full page text.")
            log(AID, f"Full page text (first 800 chars): {text[:800]}")

        ss(page, AID, 3)

        # Look for the Sarah Chen ground specifically
        sarah_link = page.query_selector("text=Sarah Chen")
        if sarah_link:
            log(AID, "I see the Sarah Chen ground. Clicking it to navigate there.")
            sarah_link.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            ss(page, AID, 4)
            text2 = get_text(page)
            log(AID, f"Ground page text (first 600 chars): {text2[:600]}")
            log(AID, "What actually happened: I arrived at the Sarah Chen ground page.")

        # Check for session 3 entry point
        text3 = get_text(page)
        if "session" in text3.lower() or "Session" in text3:
            log(AID, "I see reference to sessions on this page. Good.")

        # Look for start/run session 3 button
        session_btn = page.query_selector("button:has-text('Session'), button:has-text('Check in'), button:has-text('Start session')")
        if session_btn:
            log(AID, f"Found session button: {session_btn.inner_text()}")

        ss(page, AID, 5)
        log(AID, f"Final page text (800 chars): {get_text(page)[:800]}")

        save_state(ctx, "zainab")
        browser.close()

# ─── Agent 22 ───────────────────────────────────────────────────────────────
def agent_22():
    AID = 22
    log(AID, "=== Agent 22: Zainab, session 3, CRITICAL - read report for cross-session references ===")
    log(AID, "Intention: Read the report from this third session closely. Expects explicit reference to sessions 1 and 2.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        log(AID, "Step 1: Navigate to app. Expect: I am logged in.")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)

        # Navigate to the Sarah Chen ground
        log(AID, "Step 2: Find the Sarah Chen ground.")
        text = get_text(page)
        sarah_link = page.query_selector("text=Sarah Chen")
        if sarah_link:
            sarah_link.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            ss(page, AID, 2)
        else:
            log(AID, "Sarah Chen ground not immediately visible. Current URL: " + page.url)
            # Try navigating to grounds list
            grounds_link = page.query_selector("a:has-text('Grounds'), nav a")
            if grounds_link:
                grounds_link.click()
                page.wait_for_load_state("networkidle", timeout=5000)
                ss(page, AID, 2)

        log(AID, f"Current URL: {page.url}")
        text2 = get_text(page)
        log(AID, f"Page text (first 1000 chars): {text2[:1000]}")

        # Look for report
        log(AID, "Step 3: Look for a report on this page.")
        report_link = page.query_selector("button:has-text('Report'), a:has-text('Report'), button:has-text('View report')")
        if report_link:
            log(AID, f"Found report link: {report_link.inner_text()}")
            report_link.click()
            page.wait_for_load_state("networkidle", timeout=15000)
            ss(page, AID, 3)
            report_text = get_text(page)
            log(AID, f"=== REPORT TEXT (full) ===\n{report_text}")

            # Critical check
            has_session_1_ref = any(s in report_text for s in ["session 1", "Session 1", "first session", "previous session", "earlier session", "prior session"])
            has_session_2_ref = any(s in report_text for s in ["session 2", "Session 2", "second session"])
            log(AID, f"CRITICAL CHECK - References session 1: {has_session_1_ref}")
            log(AID, f"CRITICAL CHECK - References session 2: {has_session_2_ref}")
            if not has_session_1_ref and not has_session_2_ref:
                log(AID, "CRITICAL FINDING: Report has NO reference to sessions 1 or 2. This is a standalone snapshot.")
        else:
            log(AID, "No report button/link found. Looking at all clickable elements.")
            all_buttons = page.query_selector_all("button, a")
            for btn in all_buttons[:20]:
                try:
                    log(AID, f"  Element: {btn.inner_text()[:50]}")
                except:
                    pass
            ss(page, AID, 3)

        save_state(ctx, "zainab")
        browser.close()

# ─── Agent 23 ───────────────────────────────────────────────────────────────
def agent_23():
    AID = 23
    log(AID, "=== Agent 23: Tom, session 3, returning_participant ===")
    log(AID, "Intention: My third time participating. Expects: my prior input is part of the picture.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "tom")
        page = ctx.new_page()

        log(AID, "Step 1: Navigate to app. Expect: I see something familiar, not a blank onboarding.")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)
        text = get_text(page)
        log(AID, f"What I see: {text[:500]}")

        if "sign" in text.lower() or "log in" in text.lower():
            log(AID, "I am being asked to sign in. As a returning user I should not be re-onboarded.")
        else:
            log(AID, "I appear to be logged in. Good.")

        log(AID, "Step 2: Look for session 3 check-in invitation.")
        sarah_link = page.query_selector("text=Sarah Chen")
        if sarah_link:
            log(AID, "I see the Sarah Chen ground. Clicking.")
            sarah_link.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            ss(page, AID, 2)
            text2 = get_text(page)
            log(AID, f"Ground page: {text2[:800]}")

        log(AID, "Step 3: Look for check-in or participate button.")
        checkin_btn = page.query_selector("button:has-text('Check in'), button:has-text('Participate'), button:has-text('Start')")
        if checkin_btn:
            log(AID, f"Found: {checkin_btn.inner_text()}")

        ss(page, AID, 3)
        log(AID, f"URL: {page.url}, page text: {get_text(page)[:500]}")

        save_state(ctx, "tom")
        browser.close()

# ─── Agent 24 ───────────────────────────────────────────────────────────────
def agent_24():
    AID = 24
    log(AID, "=== Agent 24: Priya, session 3, returning_admin ===")
    log(AID, "Intention: Three grounds in. I want to understand how my team's alignment has moved.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "priya")
        page = ctx.new_page()

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)
        text = get_text(page)
        log(AID, f"Landing page: {text[:400]}")

        log(AID, "Step 2: Look for my grounds and any longitudinal view.")
        # Check for grounds list
        grounds_area = page.query_selector_all("text=/ground/i")
        log(AID, f"Found {len(grounds_area)} elements with 'ground' text.")

        ss(page, AID, 2)
        log(AID, f"Page text: {get_text(page)[:800]}")

        # Look for any 'history' or 'longitudinal' or 'over time' section
        full_text = get_text(page)
        has_history = any(s in full_text.lower() for s in ["over time", "previous", "history", "trend", "session 1", "session 2"])
        log(AID, f"Has historical/longitudinal content visible: {has_history}")

        save_state(ctx, "priya")
        browser.close()

# ─── Agent 25 ───────────────────────────────────────────────────────────────
def agent_25():
    AID = 25
    log(AID, "=== Agent 25: Bongani, new_admin, NO saved state ===")
    log(AID, "Intention: I am a new admin in an org that already has history here.")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()  # No saved state
        page = ctx.new_page()

        log(AID, "Step 1: Navigate to app. Expect: I see landing page or sign-up.")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)
        text = get_text(page)
        log(AID, f"Landing page: {text[:400]}")

        log(AID, "Step 2: Look for sign up or join org link.")
        signup_btn = page.query_selector("a:has-text('Sign up'), button:has-text('Sign up'), a:has-text('Get started'), button:has-text('Get started')")
        if signup_btn:
            log(AID, f"Found: {signup_btn.inner_text()}")
            signup_btn.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            ss(page, AID, 2)
            text2 = get_text(page)
            log(AID, f"After clicking signup: {text2[:400]}")
        else:
            log(AID, "No obvious signup button found.")
            ss(page, AID, 2)

        # Try sign up form
        email_input = page.query_selector("input[type=email], input[placeholder*=email]")
        if email_input:
            log(AID, "Step 3: Filling in email for signup.")
            email_input.fill("bongani.ndlovu@example-test.invalid")
            ss(page, AID, 3)

            # Look for next/continue button
            next_btn = page.query_selector("button[type=submit], button:has-text('Continue'), button:has-text('Next')")
            if next_btn:
                log(AID, f"Submitting with: {next_btn.inner_text()}")
                next_btn.click()
                page.wait_for_load_state("networkidle", timeout=10000)
                ss(page, AID, 4)
                text3 = get_text(page)
                log(AID, f"After email submit: {text3[:600]}")

                # Check for OTP/magic link
                if "magic" in text3.lower() or "link" in text3.lower() or "email" in text3.lower():
                    log(AID, "Seems to be asking for email verification. Checking mailcatcher.")
                    import subprocess
                    result = subprocess.run(
                        ["curl", "-s", "http://127.0.0.1:1080/link?to=bongani.ndlovu@example-test.invalid"],
                        capture_output=True, text=True
                    )
                    log(AID, f"Mailcatcher result: {result.stdout[:400]}")
                    if result.stdout and "http" in result.stdout:
                        link = result.stdout.strip()
                        log(AID, f"Found magic link, navigating: {link[:100]}")
                        page.goto(link)
                        page.wait_for_load_state("networkidle", timeout=10000)
                        ss(page, AID, 5)
                        text4 = get_text(page)
                        log(AID, f"After magic link: {text4[:600]}")
        else:
            log(AID, "No email input found. Looking at all inputs.")
            inputs = page.query_selector_all("input")
            for inp in inputs[:5]:
                try:
                    log(AID, f"  Input: type={inp.get_attribute('type')}, placeholder={inp.get_attribute('placeholder')}")
                except:
                    pass

        ss(page, AID, 6)
        log(AID, f"Final state URL: {page.url}")
        log(AID, f"Final page text: {get_text(page)[:500]}")

        # Save bongani state
        os.makedirs(f"{STATE_DIR}/bongani", exist_ok=True)
        ctx.storage_state(path=f"{STATE_DIR}/bongani/state.json")
        browser.close()

# ─── Agent 26 ───────────────────────────────────────────────────────────────
def agent_26():
    AID = 26
    log(AID, "=== Agent 26: Marcus, session 3, new_participant ===")
    log(AID, "Intention: Joining a group that already has two sessions of history. Expect: context, not blank drop-in.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "marcus")
        page = ctx.new_page()

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)
        text = get_text(page)
        log(AID, f"Landing: {text[:400]}")

        log(AID, "Step 2: Look for any grounds I'm invited to.")
        sarah_link = page.query_selector("text=Sarah Chen")
        if sarah_link:
            log(AID, "I can see the Sarah Chen ground.")
            sarah_link.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            ss(page, AID, 2)
            text2 = get_text(page)
            log(AID, f"Ground page: {text2[:800]}")

            # Does it give me any context about prior sessions?
            has_context = any(s in text2.lower() for s in ["session 1", "session 2", "previous", "history", "two sessions", "prior"])
            log(AID, f"Context about prior sessions shown to newcomer: {has_context}")
        else:
            log(AID, "No ground visible to Marcus. He may not be invited yet.")

        ss(page, AID, 3)
        log(AID, f"URL: {page.url}")

        save_state(ctx, "marcus")
        browser.close()

# ─── Agent 27 ───────────────────────────────────────────────────────────────
def agent_27():
    AID = 27
    log(AID, "=== Agent 27: Sandra, org_admin_full ===")
    log(AID, "Intention: I want the organisation-level longitudinal picture across grounds and sessions.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "sandra")
        page = ctx.new_page()

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)
        text = get_text(page)
        log(AID, f"Landing: {text[:400]}")

        log(AID, "Step 2: Look for org admin view or dashboard.")
        # Look for admin panel or org overview
        admin_link = page.query_selector("a:has-text('Admin'), a:has-text('Organisation'), a:has-text('Dashboard'), nav a")
        if admin_link:
            log(AID, f"Found: {admin_link.inner_text()}")

        ss(page, AID, 2)
        full_text = get_text(page)
        log(AID, f"Full page text (1000 chars): {full_text[:1000]}")

        # Look for cross-ground/cross-session view
        has_org_view = any(s in full_text.lower() for s in ["organisation", "org", "across grounds", "all grounds", "longitudinal"])
        log(AID, f"Org-level view present: {has_org_view}")

        # Try navigating to admin dashboard
        page.goto(f"{BASE_URL}/admin")
        page.wait_for_load_state("networkidle", timeout=8000)
        ss(page, AID, 3)
        log(AID, f"Admin URL: {page.url}")
        log(AID, f"Admin page text: {get_text(page)[:800]}")

        save_state(ctx, "sandra")
        browser.close()

# ─── Agent 28 ───────────────────────────────────────────────────────────────
def agent_28():
    AID = 28
    log(AID, "=== Agent 28: Kwame, lead_creates_ground, session 3 ===")
    log(AID, "Intention: I have run three grounds. I want to compare them over time.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "kwame")
        page = ctx.new_page()

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)
        text = get_text(page)
        log(AID, f"Landing: {text[:400]}")

        log(AID, "Step 2: Look for my grounds and any comparison/history view.")
        ss(page, AID, 2)
        full_text = get_text(page)
        log(AID, f"Full page text: {full_text[:1000]}")

        # Look for comparison features
        compare_el = page.query_selector("text=/compare/i, text=/history/i, text=/trend/i")
        if compare_el:
            log(AID, f"Found compare/history element: {compare_el.inner_text()}")
        else:
            log(AID, "No compare/history/trend feature visible. Getting stuck is data.")

        # Count visible grounds
        ground_els = page.query_selector_all("[data-testid*=ground], .ground-card, article")
        log(AID, f"Visible ground-like elements: {len(ground_els)}")

        save_state(ctx, "kwame")
        browser.close()

# ─── Agents 29 & 30 - Zainab final report ───────────────────────────────────
def agent_29_30():
    AID = 29
    log(AID, "=== Agent 29: Zainab, session 3, CRITICAL - final report ===")
    log(AID, "Intention: Get the final report. Must explicitly reference sessions 1 and 2.")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=10000)
        ss(page, AID, 1)

        # Navigate to Sarah Chen ground
        text = get_text(page)
        log(AID, f"Dashboard: {text[:400]}")

        sarah_link = page.query_selector("text=Sarah Chen")
        if sarah_link:
            sarah_link.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            ss(page, AID, 2)

        current_url = page.url
        log(AID, f"URL after navigation: {current_url}")

        text2 = get_text(page)
        log(AID, f"Ground page: {text2[:600]}")

        # Look for report links
        report_btns = page.query_selector_all("button, a")
        report_texts = []
        for btn in report_btns:
            try:
                t = btn.inner_text().strip()
                if t and len(t) < 50:
                    report_texts.append(t)
            except:
                pass
        log(AID, f"All buttons/links: {report_texts[:30]}")

        # Click report if found
        report_btn = None
        for t in ["Report", "View report", "Session report", "Generate report"]:
            report_btn = page.query_selector(f"button:has-text('{t}'), a:has-text('{t}')")
            if report_btn:
                break

        if report_btn:
            log(AID, f"Clicking report: {report_btn.inner_text()}")
            report_btn.click()
            start_wait = time.time()
            page.wait_for_load_state("networkidle", timeout=30000)
            elapsed = time.time() - start_wait
            if elapsed > 5:
                log(AID, f"WAIT: Report took {elapsed:.1f}s to load")
            ss(page, AID, 3)
            report_text = get_text(page)
            log(AID, f"=== FULL REPORT TEXT ===\n{report_text}")

            # Critical checks
            s1_refs = ["session 1", "Session 1", "first session", "previous session", "earlier", "prior session", "last time"]
            s2_refs = ["session 2", "Session 2", "second session"]
            cross_ref = ["compared to", "has shifted", "has changed", "last session", "previous ground", "over time", "historically"]

            has_s1 = any(s in report_text for s in s1_refs)
            has_s2 = any(s in report_text for s in s2_refs)
            has_cross = any(s in report_text for s in cross_ref)

            log(AID, f"CRITICAL: References session 1: {has_s1}")
            log(AID, f"CRITICAL: References session 2: {has_s2}")
            log(AID, f"CRITICAL: Has longitudinal cross-reference: {has_cross}")

            if not has_s1 and not has_s2 and not has_cross:
                log(AID, "CRITICAL FINDING: Report is a standalone snapshot. NO cross-session references. Fails longitudinal promise.")

            # Agent 30 judgment
            log(30, "=== Agent 30: Zainab decides whether 3 sessions were worth it ===")
            log(30, f"Report length: {len(report_text)} chars")
            log(30, f"Has longitudinal data: {has_s1 or has_s2 or has_cross}")
            if has_s1 or has_s2 or has_cross:
                log(30, "The compounding is visible. I would want a fourth session.")
            else:
                log(30, "Three sessions felt like three unrelated exercises. The report did not help me see change over time. I would not run a fourth.")
        else:
            log(AID, "STUCK: Cannot find report button. Giving up. This is data.")
            ss(page, AID, 3)
            log(30, "=== Agent 30: Cannot judge value - could not access report ===")

        save_state(ctx, "zainab")
        browser.close()


if __name__ == "__main__":
    print("Starting agents 21-30...\n")

    try: agent_21()
    except Exception as e: print(f"[A21] EXCEPTION: {e}")

    try: agent_22()
    except Exception as e: print(f"[A22] EXCEPTION: {e}")

    try: agent_23()
    except Exception as e: print(f"[A23] EXCEPTION: {e}")

    try: agent_24()
    except Exception as e: print(f"[A24] EXCEPTION: {e}")

    try: agent_25()
    except Exception as e: print(f"[A25] EXCEPTION: {e}")

    try: agent_26()
    except Exception as e: print(f"[A26] EXCEPTION: {e}")

    try: agent_27()
    except Exception as e: print(f"[A27] EXCEPTION: {e}")

    try: agent_28()
    except Exception as e: print(f"[A28] EXCEPTION: {e}")

    try: agent_29_30()
    except Exception as e: print(f"[A29/30] EXCEPTION: {e}")

    print("\n=== ALL FINDINGS ===")
    for f in findings:
        print(f)

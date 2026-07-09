#!/usr/bin/env python3
"""
Blind persona tests: agents 21-30
Uses 127.0.0.1:5173 because saved state tokens are scoped to that origin.
"""
import json, time, os, subprocess
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCREENSHOTS_DIR = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results/screenshots"
STATE_DIR = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/state"
BASE_URL = "http://127.0.0.1:5173"  # ← must match token origin

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

findings = []

def log(agent_id, msg):
    line = f"[A{agent_id}] {msg}"
    print(line)
    findings.append(line)

def ss(page, agent_id, step, label=""):
    path = f"{SCREENSHOTS_DIR}/a{agent_id}_s{step}.png"
    page.screenshot(path=path, full_page=True)
    if label:
        log(agent_id, f"Screenshot {step}: {label}")
    return path

def get_text(page):
    try:
        return page.evaluate("() => document.body.innerText") or ""
    except:
        return ""

def make_context(playwright, identity):
    browser = playwright.chromium.launch(headless=True)
    state_path = f"{STATE_DIR}/{identity}/state.json"
    if os.path.exists(state_path):
        ctx = browser.new_context(storage_state=state_path)
        log(0, f"Loaded saved state for {identity}")
    else:
        ctx = browser.new_context()
        log(0, f"No saved state for {identity} - fresh context")
    return browser, ctx

def save_state(ctx, identity):
    os.makedirs(f"{STATE_DIR}/{identity}", exist_ok=True)
    ctx.storage_state(path=f"{STATE_DIR}/{identity}/state.json")

def wait_for_app(page, agent_id, timeout=15000):
    """Wait for React app to hydrate."""
    try:
        # Wait for body to have actual text content (not just loading spinner)
        page.wait_for_function(
            "() => document.body.innerText.trim().length > 10",
            timeout=timeout
        )
        return True
    except PlaywrightTimeout:
        log(agent_id, f"TIMEOUT: App did not hydrate within {timeout}ms")
        return False

def check_typography(url_path, agent_id):
    """Run typography checker on a URL path."""
    result = subprocess.run(
        ["python3",
         "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/typography.py",
         "--url", f"{BASE_URL}{url_path}"],
        capture_output=True, text=True, timeout=30
    )
    if result.stdout:
        log(agent_id, f"Typography ({url_path}): {result.stdout.strip()[:400]}")
    if result.returncode != 0 and result.stderr:
        log(agent_id, f"Typography error: {result.stderr[:200]}")

def go(page, url, agent_id, step_label=""):
    """Navigate and wait for hydration."""
    page.goto(url)
    wait_for_app(page, agent_id)
    return get_text(page)

# ─── Agent 21 ───────────────────────────────────────────────────────────────
def agent_21():
    AID = 21
    log(AID, "=== AGENT 21: Zainab, returning_admin, session 3 ===")
    log(AID, "PERSONA: Third session. I want to run another ground and see how my group has changed.")
    log(AID, "EXPECTS: The report tells me something I could not have known from one session.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        # Step 1
        log(AID, "Step 1 — Expect: I am already logged in. I see my dashboard with previous grounds.")
        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "initial load")
        log(AID, f"What happened: {text[:400]}")
        log(AID, f"URL: {page.url}")

        if "sign in" in text.lower() or "log in" in text.lower():
            log(AID, "PROBLEM: I am being asked to sign in. The app did not remember me. This feels like being re-onboarded.")
        elif len(text.strip()) < 20:
            log(AID, "PROBLEM: Page body is nearly empty after load. Something is wrong.")
        else:
            log(AID, "I appear to be logged in. Good.")

        # Step 2 - find grounds
        log(AID, "Step 2 — Expect: I see a list of my grounds including the Sarah Chen one from sessions 1 and 2.")
        sarah = page.query_selector("text=Sarah Chen")
        engineering = page.query_selector("text=Engineering onboarding")

        if sarah:
            log(AID, "I can see the Sarah Chen ground. Good. I feel oriented.")
            sarah.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            wait_for_app(page, AID)
            ss(page, AID, 2, "Sarah Chen ground")
            text2 = get_text(page)
            log(AID, f"Ground page text: {text2[:800]}")
            log(AID, f"URL: {page.url}")
        elif engineering:
            log(AID, "I can see the Engineering onboarding ground.")
            engineering.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            wait_for_app(page, AID)
            ss(page, AID, 2, "engineering ground")
            text2 = get_text(page)
            log(AID, f"Ground page: {text2[:800]}")
        else:
            log(AID, "STUCK: I cannot see my previous ground on the dashboard. I feel lost.")
            ss(page, AID, 2, "no ground visible")
            log(AID, f"Full page text: {text[:1000]}")

        # Step 3 - look for session 3 or new session
        log(AID, "Step 3 — Expect: I see a way to run session 3 or see that it exists.")
        text3 = get_text(page)
        session_3 = page.query_selector("text=Session 3")
        new_session = page.query_selector("button:has-text('New session'), button:has-text('Start session'), button:has-text('Run session')")

        if session_3:
            log(AID, "Session 3 is visible on this page. Good.")
        elif new_session:
            log(AID, f"Found: {new_session.inner_text()}. Clicking.")
        else:
            log(AID, "No session 3 or new session button visible. Looking at all buttons.")
            btns = page.query_selector_all("button")
            for b in btns[:15]:
                try: log(AID, f"  Button: {b.inner_text().strip()}")
                except: pass

        ss(page, AID, 3, "session options")
        log(AID, f"Full text at step 3: {get_text(page)[:800]}")

        # Step 4 - check if sessions 1 and 2 are visible as history
        log(AID, "Step 4 — Expect: Sessions 1 and 2 are shown as completed history.")
        full = get_text(page)
        has_s1 = "session 1" in full.lower() or "Session 1" in full
        has_s2 = "session 2" in full.lower() or "Session 2" in full
        has_completed = "completed" in full.lower()
        log(AID, f"Session 1 reference visible: {has_s1}")
        log(AID, f"Session 2 reference visible: {has_s2}")
        log(AID, f"Completed sessions visible: {has_completed}")

        check_typography(page.url.replace(BASE_URL, "") or "/", AID)
        save_state(ctx, "zainab")
        browser.close()

# ─── Agent 22 ───────────────────────────────────────────────────────────────
def agent_22():
    AID = 22
    log(AID, "=== AGENT 22: Zainab, CRITICAL - read session 3 report for cross-session refs ===")
    log(AID, "PERSONA: I want to read this session's report and see if it references what changed from before.")
    log(AID, "EXPECTS: Report explicitly references sessions 1 and 2, shows what shifted, what held.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:400]}")

        # Navigate to ground
        sarah = page.query_selector("text=Sarah Chen")
        if sarah:
            sarah.click()
            wait_for_app(page, AID)
            ss(page, AID, 2, "ground page")
        else:
            log(AID, "Cannot find Sarah Chen ground. Trying to find grounds list.")
            grounds_nav = page.query_selector("a:has-text('Grounds'), nav a:first-child")
            if grounds_nav:
                grounds_nav.click()
                wait_for_app(page, AID)
            ss(page, AID, 2, "grounds list attempt")

        log(AID, f"URL: {page.url}")
        ground_text = get_text(page)
        log(AID, f"Ground page: {ground_text[:600]}")

        # Look for completed sessions with reports
        log(AID, "Step 3 — Looking for session reports.")
        report_link = None
        for selector in ["button:has-text('Report')", "a:has-text('Report')",
                         "button:has-text('View report')", "a:has-text('View report')",
                         "button:has-text('See report')", "text=Report"]:
            report_link = page.query_selector(selector)
            if report_link:
                log(AID, f"Found report via '{selector}': {report_link.inner_text()}")
                break

        if report_link:
            log(AID, "Clicking report link.")
            report_link.click()
            start = time.time()
            wait_for_app(page, AID, timeout=30000)
            elapsed = time.time() - start
            if elapsed > 5:
                log(AID, f"WAIT: Report took {elapsed:.1f}s")
            ss(page, AID, 3, "report page")
            report_text = get_text(page)
            log(AID, f"=== REPORT TEXT (full, {len(report_text)} chars) ===")
            log(AID, report_text)

            # Critical cross-session check
            s1_indicators = ["session 1", "Session 1", "first session", "previous session", "earlier session", "prior session", "last session"]
            s2_indicators = ["session 2", "Session 2", "second session"]
            longitudinal_indicators = ["compared to", "has shifted", "has changed", "over time", "historically", "previously", "last time", "from before", "unlike before", "building on"]

            found_s1 = [s for s in s1_indicators if s in report_text]
            found_s2 = [s for s in s2_indicators if s in report_text]
            found_long = [s for s in longitudinal_indicators if s.lower() in report_text.lower()]

            log(AID, f"CRITICAL: S1 references found: {found_s1}")
            log(AID, f"CRITICAL: S2 references found: {found_s2}")
            log(AID, f"CRITICAL: Longitudinal language found: {found_long}")

            if not found_s1 and not found_s2 and not found_long:
                log(AID, "CRITICAL FINDING *** Report is a standalone snapshot. ZERO cross-session references. The longitudinal promise is not kept.")
            else:
                log(AID, "Report has cross-session references. Checking quality.")
        else:
            log(AID, "STUCK: No report link found. Listing all interactive elements.")
            all_el = page.query_selector_all("button, a[href]")
            for el in all_el[:25]:
                try: log(AID, f"  {el.tag_name()}: {el.inner_text().strip()[:60]}")
                except: pass
            ss(page, AID, 3, "no report found")
            log(AID, "CRITICAL FINDING *** Cannot access report at all. Agent gives up.")

        save_state(ctx, "zainab")
        browser.close()

# ─── Agent 23 ───────────────────────────────────────────────────────────────
def agent_23():
    AID = 23
    log(AID, "=== AGENT 23: Tom, returning_participant, session 3 ===")
    log(AID, "PERSONA: My third time participating. I expect my prior input to matter.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "tom")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"What I see: {text[:500]}")

        if "sign" in text.lower():
            log(AID, "I'm being asked to sign in. As a third-time participant, I expected to be remembered. Feeling: mildly irritated.")

        # Find invitation or ground
        sarah = page.query_selector("text=Sarah Chen")
        engineering = page.query_selector("text=Engineering")
        checkin_btn = page.query_selector("button:has-text('Check in'), a:has-text('Check in'), button:has-text('Start check-in')")

        if checkin_btn:
            log(AID, f"Found check-in: {checkin_btn.inner_text()}. Good.")
            ss(page, AID, 2, "check-in button visible")
        elif sarah:
            log(AID, "I see the Sarah Chen ground.")
            sarah.click()
            wait_for_app(page, AID)
            ss(page, AID, 2, "sarah chen ground")
            text2 = get_text(page)
            log(AID, f"Ground: {text2[:600]}")

            # Does it show my history?
            my_history = any(s in text2 for s in ["Session 1", "Session 2", "session 1", "session 2", "previous", "last time"])
            log(AID, f"My prior participation shown: {my_history}")
            if not my_history:
                log(AID, "The ground shows no record of my past participation. Feeling: like I'm a stranger here.")
        else:
            log(AID, f"No check-in or ground visible. Full page: {text[:600]}")
            ss(page, AID, 2, "nothing visible")

        # Look for check-in for session 3 specifically
        s3_checkin = page.query_selector("text=Session 3")
        if s3_checkin:
            log(AID, "Session 3 is visible to me.")
        else:
            log(AID, "Session 3 not explicitly labeled. May just see a check-in prompt.")

        ss(page, AID, 3, "final state")
        log(AID, f"Final URL: {page.url}")
        log(AID, f"Final text: {get_text(page)[:500]}")

        save_state(ctx, "tom")
        browser.close()

# ─── Agent 24 ───────────────────────────────────────────────────────────────
def agent_24():
    AID = 24
    log(AID, "=== AGENT 24: Priya, returning_admin, session 3 ===")
    log(AID, "PERSONA: Three grounds in. I want to see how my team's alignment has moved.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "priya")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:500]}")

        # Find my grounds
        log(AID, "Step 2 — Looking for my grounds and any longitudinal view.")
        ss(page, AID, 2, "grounds list")
        full = get_text(page)
        log(AID, f"Full page text: {full[:1000]}")

        has_history = any(s in full.lower() for s in ["over time", "trend", "previous session", "session 1", "session 2", "history", "shift"])
        log(AID, f"Longitudinal language visible on dashboard: {has_history}")

        # Try clicking into a ground
        ground_links = page.query_selector_all("a, button")
        ground_texts = []
        for gl in ground_links[:20]:
            try:
                t = gl.inner_text().strip()
                if t: ground_texts.append(t)
            except: pass
        log(AID, f"All links/buttons: {ground_texts[:20]}")

        # Navigate to a ground if visible
        first_ground = page.query_selector("article a, .ground-item a, a[href*='ground']")
        if first_ground:
            first_ground.click()
            wait_for_app(page, AID)
            ss(page, AID, 3, "ground detail")
            log(AID, f"Ground detail: {get_text(page)[:800]}")
        else:
            ss(page, AID, 3, "no ground to click")
            log(AID, "STUCK: No ground clickable. I cannot drill into alignment history.")

        save_state(ctx, "priya")
        browser.close()

# ─── Agent 25 ───────────────────────────────────────────────────────────────
def agent_25():
    AID = 25
    log(AID, "=== AGENT 25: Bongani, NEW admin with no saved state ===")
    log(AID, "PERSONA: I am brand new to this org that has existing history. I expect to inherit context.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "initial landing")
        log(AID, f"What I see first: {text[:400]}")

        # As new user, I expect a clear sign-up or join flow
        log(AID, "Step 2 — I look for a way to sign up or be invited to the org.")

        # Try /auth route
        auth_text = go(page, f"{BASE_URL}/auth", AID)
        ss(page, AID, 2, "auth page")
        log(AID, f"Auth page: {auth_text[:400]}")

        email_input = page.query_selector("input[type=email], input[name=email], input[placeholder*='mail' i]")
        if email_input:
            log(AID, "Step 3 — Found email input. Filling in my email.")
            email_input.fill("bongani.ndlovu@example-test.invalid")
            ss(page, AID, 3, "email filled")

            submit_btn = page.query_selector("button[type=submit], button:has-text('Sign in'), button:has-text('Continue'), button:has-text('Send')")
            if submit_btn:
                log(AID, f"Submitting via: {submit_btn.inner_text()}")
                submit_btn.click()
                start = time.time()
                wait_for_app(page, AID, timeout=12000)
                elapsed = time.time() - start
                if elapsed > 5:
                    log(AID, f"WAIT: {elapsed:.1f}s after submit")
                ss(page, AID, 4, "after email submit")
                text3 = get_text(page)
                log(AID, f"After submit: {text3[:600]}")

                # Check mail
                result = subprocess.run(
                    ["curl", "-s", "http://127.0.0.1:1080/link?to=bongani.ndlovu@example-test.invalid"],
                    capture_output=True, text=True, timeout=10
                )
                log(AID, f"Mailcatcher link: {result.stdout[:300]}")

                if result.stdout and "http" in result.stdout:
                    link = result.stdout.strip()
                    log(AID, f"Step 4 — Navigating magic link.")
                    page.goto(link)
                    wait_for_app(page, AID, timeout=12000)
                    ss(page, AID, 5, "after magic link")
                    text4 = get_text(page)
                    log(AID, f"After link: {text4[:600]}")

                    # Does it ask me to set up? Or drop me into org context?
                    has_setup = any(s in text4.lower() for s in ["set up", "welcome", "organisation", "join"])
                    has_context = any(s in text4.lower() for s in ["ground", "session", "history"])
                    log(AID, f"Setup/welcome flow shown: {has_setup}")
                    log(AID, f"Org context shown immediately: {has_context}")
                else:
                    log(AID, "No magic link received. Checking if maybe password-based.")
                    pass_input = page.query_selector("input[type=password]")
                    if pass_input:
                        log(AID, "Password input visible. This may need a password set-up step.")
                        # Bongani doesn't have a password yet - this is the new user flow
                        pass
        else:
            log(AID, "No email input found. Page may not have loaded correctly.")
            log(AID, f"Inputs on page: {[i.get_attribute('type') for i in page.query_selector_all('input')]}")

        ss(page, AID, 6, "final state")
        log(AID, f"Final URL: {page.url}")

        os.makedirs(f"{STATE_DIR}/bongani", exist_ok=True)
        ctx.storage_state(path=f"{STATE_DIR}/bongani/state.json")
        browser.close()

# ─── Agent 26 ───────────────────────────────────────────────────────────────
def agent_26():
    AID = 26
    log(AID, "=== AGENT 26: Marcus, session 3, new participant in existing ground ===")
    log(AID, "PERSONA: I'm joining a group that has two sessions of history. I expect context, not a cold drop.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "marcus")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:500]}")

        # I expect to see grounds I'm invited to
        log(AID, "Step 2 — Looking for grounds I've been invited to.")
        sarah = page.query_selector("text=Sarah Chen")
        engineering = page.query_selector("text=Engineering")

        if sarah or engineering:
            link = sarah or engineering
            log(AID, f"Found ground: {link.inner_text()}")
            link.click()
            wait_for_app(page, AID)
            ss(page, AID, 2, "ground page")
            text2 = get_text(page)
            log(AID, f"Ground page: {text2[:800]}")

            # Key question: does this newcomer get any context about prior sessions?
            prior_context = any(s in text2 for s in ["Session 1", "Session 2", "session 1", "session 2", "previous session", "2 sessions", "two sessions"])
            log(AID, f"Prior session context shown to newcomer Marcus: {prior_context}")
            if not prior_context:
                log(AID, "I am dropped in cold. No mention of the two sessions that came before. I don't know what's been discussed. I feel: out of the loop.")
        else:
            log(AID, "STUCK: I see no grounds. I may not be invited to any yet.")
            log(AID, f"Full page: {text[:800]}")
            ss(page, AID, 2, "no grounds")

        ss(page, AID, 3, "final")
        log(AID, f"URL: {page.url}")

        save_state(ctx, "marcus")
        browser.close()

# ─── Agent 27 ───────────────────────────────────────────────────────────────
def agent_27():
    AID = 27
    log(AID, "=== AGENT 27: Sandra, org_admin_full, session 3 ===")
    log(AID, "PERSONA: I want the organisation-level longitudinal picture across grounds and sessions.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "sandra")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:500]}")

        log(AID, "Step 2 — Looking for org-level view or admin panel.")
        full = get_text(page)

        # Is there an org dashboard or overview?
        org_links = page.query_selector_all("a:has-text('Admin'), a:has-text('Organisation'), a:has-text('Overview'), a:has-text('All grounds')")
        for ol in org_links:
            log(AID, f"Org link: {ol.inner_text()}")

        # Try the admin page explicitly
        log(AID, "Step 3 — Trying /admin route.")
        admin_text = go(page, f"{BASE_URL}/admin", AID)
        ss(page, AID, 2, "admin page")
        log(AID, f"Admin URL: {page.url}")
        log(AID, f"Admin text: {admin_text[:800]}")

        if page.url == f"{BASE_URL}/admin" or "admin" in page.url.lower():
            log(AID, "I reached an admin page. Good.")
            has_org_view = any(s in admin_text.lower() for s in ["grounds", "sessions", "participants", "activity", "usage"])
            log(AID, f"Org-level data visible: {has_org_view}")
            has_longitudinal = any(s in admin_text.lower() for s in ["over time", "trend", "history", "session 1", "session 2"])
            log(AID, f"Longitudinal/trend data visible: {has_longitudinal}")
        else:
            log(AID, "Was redirected away from /admin. I don't have admin access or must log in differently.")

        ss(page, AID, 3, "final state")
        log(AID, f"Full text: {get_text(page)[:800]}")

        save_state(ctx, "sandra")
        browser.close()

# ─── Agent 28 ───────────────────────────────────────────────────────────────
def agent_28():
    AID = 28
    log(AID, "=== AGENT 28: Kwame, lead_creates_ground, session 3 ===")
    log(AID, "PERSONA: Three grounds in. I want to compare them over time.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "kwame")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:500]}")

        log(AID, "Step 2 — Looking for my grounds and any comparison/history feature.")
        full = get_text(page)
        log(AID, f"Full text: {full[:1000]}")

        # Count grounds visible
        ground_count = full.lower().count("ground")
        log(AID, f"'ground' appears {ground_count} times on page")

        # Look for comparison UI
        compare = page.query_selector("text=/compare/i")
        history = page.query_selector("text=/history/i")
        trend = page.query_selector("text=/trend/i")

        if compare:
            log(AID, f"Compare element: {compare.inner_text()}")
        if history:
            log(AID, f"History element: {history.inner_text()}")
        if trend:
            log(AID, f"Trend element: {trend.inner_text()}")

        if not compare and not history and not trend:
            log(AID, "No comparison, history, or trend features visible. Getting stuck is data.")
            log(AID, "I can see my grounds but there's no way to compare them. I feel limited.")

        ss(page, AID, 2, "grounds list")

        # Check if at least multiple grounds are listed
        links = page.query_selector_all("a, article, [data-testid]")
        log(AID, f"Clickable elements: {len(links)}")

        save_state(ctx, "kwame")
        browser.close()

# ─── Agents 29 & 30 ─────────────────────────────────────────────────────────
def agent_29_30():
    AID = 29
    log(AID, "=== AGENT 29: Zainab, CRITICAL - final report, must cross-ref sessions 1+2 ===")
    log(AID, "PERSONA: I want the final report. Good enough to act on and to show someone.")

    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:400]}")

        # Navigate to Sarah Chen ground
        sarah = page.query_selector("text=Sarah Chen")
        if sarah:
            sarah.click()
            wait_for_app(page, AID)
            ss(page, AID, 2, "ground page")
        else:
            log(AID, "Cannot find Sarah Chen ground on dashboard. Searching for grounds nav.")
            # Try nav
            all_navs = page.query_selector_all("nav a, aside a, [role=navigation] a")
            for nav in all_navs[:10]:
                try: log(AID, f"  Nav: {nav.inner_text().strip()}")
                except: pass
            ss(page, AID, 2, "no ground found")

        ground_text = get_text(page)
        log(AID, f"Ground page ({page.url}): {ground_text[:600]}")

        # Find all buttons and links
        all_btns = page.query_selector_all("button, a[href]")
        btn_texts = []
        for b in all_btns:
            try:
                t = b.inner_text().strip()
                if t and len(t) < 60: btn_texts.append(t)
            except: pass
        log(AID, f"All buttons/links on page: {btn_texts[:30]}")

        # Find report
        report_btn = None
        for text_to_try in ["Report", "View report", "See report", "Session report", "Generate report", "Full report"]:
            report_btn = page.query_selector(f"button:has-text('{text_to_try}'), a:has-text('{text_to_try}')")
            if report_btn:
                log(AID, f"Found report via '{text_to_try}'")
                break

        # Also look for completed session cards that might have report links
        if not report_btn:
            # Try clicking on a completed session
            completed = page.query_selector("text=Completed, text=completed")
            if completed:
                log(AID, "Found 'Completed' text. Trying to click it or find a link nearby.")

        if report_btn:
            log(AID, f"Clicking: {report_btn.inner_text()}")
            report_btn.click()
            start = time.time()
            wait_for_app(page, AID, timeout=30000)
            elapsed = time.time() - start
            if elapsed > 5:
                log(AID, f"WAIT: {elapsed:.1f}s to load report")
            ss(page, AID, 3, "report page")

            report_text = get_text(page)
            log(AID, f"=== FULL REPORT TEXT ({len(report_text)} chars) ===")
            log(AID, report_text[:5000])

            # CRITICAL cross-session check
            s1_phrases = ["session 1", "Session 1", "first session", "previous session", "earlier session", "last session", "before this session"]
            s2_phrases = ["session 2", "Session 2", "second session"]
            change_phrases = ["has shifted", "has changed", "compared to", "unlike before", "previously", "last time", "over time", "from the first", "from session"]
            quality_red_flags = ["it appears", "seems to suggest", "may indicate", "could mean", "approximately", "around the same"]

            found_s1 = [s for s in s1_phrases if s in report_text]
            found_s2 = [s for s in s2_phrases if s in report_text]
            found_change = [s for s in change_phrases if s.lower() in report_text.lower()]
            found_red_flags = [s for s in quality_red_flags if s.lower() in report_text.lower()]

            log(AID, f"CRITICAL: S1 refs: {found_s1}")
            log(AID, f"CRITICAL: S2 refs: {found_s2}")
            log(AID, f"CRITICAL: Change language: {found_change}")
            log(AID, f"Quality: Red flag language (hedging): {found_red_flags}")

            if not found_s1 and not found_s2 and not found_change:
                log(AID, "CRITICAL FINDING *** Report is a standalone snapshot. NO longitudinal cross-referencing. Fails the core promise.")
                log(30, "=== AGENT 30: Three sessions felt like three unrelated exercises. I would not run a fourth. ===")
            else:
                log(AID, "Report has longitudinal elements.")
                word_count = len(report_text.split())
                log(AID, f"Report word count: {word_count}")
                if word_count < 100:
                    log(AID, "QUALITY: Report is very thin (<100 words). Not decision-grade.")
                    log(30, "=== AGENT 30: Sessions produced a thin report. The compounding is not visible enough. ===")
                elif word_count < 200:
                    log(AID, "QUALITY: Report is minimal (100-200 words). Borderline decision-grade.")
                    log(30, "=== AGENT 30: Three sessions produced something but it is thin. Unsure about a fourth. ===")
                else:
                    log(AID, "QUALITY: Report has adequate substance (200+ words).")
                    log(30, "=== AGENT 30: The compounding is visible. I would run a fourth session. ===")

            # Typography check on report
            check_typography(page.url.replace(BASE_URL, ""), AID)
        else:
            log(AID, "CRITICAL FINDING *** Cannot find any report. Agent gives up. No report to act on.")
            ss(page, AID, 3, "no report found")
            log(30, "=== AGENT 30: No report found. Three sessions produced nothing reviewable. Would not continue. ===")

        save_state(ctx, "zainab")
        browser.close()


if __name__ == "__main__":
    print("=" * 60)
    print("AGENTS 21-30: Blind persona tests, session 3")
    print("=" * 60)

    for func, label in [
        (agent_21, "A21 Zainab returning_admin"),
        (agent_22, "A22 Zainab CRITICAL report"),
        (agent_23, "A23 Tom returning_participant"),
        (agent_24, "A24 Priya returning_admin"),
        (agent_25, "A25 Bongani new_admin"),
        (agent_26, "A26 Marcus new_participant"),
        (agent_27, "A27 Sandra org_admin"),
        (agent_28, "A28 Kwame lead"),
        (agent_29_30, "A29+30 Zainab CRITICAL final report"),
    ]:
        print(f"\n{'─'*60}\nRunning: {label}\n{'─'*60}")
        try:
            func()
        except Exception as e:
            import traceback
            print(f"EXCEPTION in {label}: {e}")
            traceback.print_exc()
            findings.append(f"EXCEPTION: {label}: {e}")

    print("\n" + "=" * 60)
    print("ALL FINDINGS SUMMARY")
    print("=" * 60)
    for f in findings:
        print(f)

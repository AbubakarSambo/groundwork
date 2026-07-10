#!/usr/bin/env python3
"""
Session 3 blind persona tests: agents 21-30, 41, 42, 43, 49
Uses 127.0.0.1:5173 because saved state tokens are scoped to that origin.
"""
import json, time, os, subprocess
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCREENSHOTS_DIR = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results/screenshots"
STATE_DIR       = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/state"
BASE_URL        = "http://127.0.0.1:5173"

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

findings = []

def log(agent_id, msg):
    line = f"[A{agent_id}] {msg}"
    print(line, flush=True)
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
    try:
        page.wait_for_function(
            "() => document.body.innerText.trim().length > 10",
            timeout=timeout
        )
        return True
    except PlaywrightTimeout:
        log(agent_id, f"TIMEOUT: App did not hydrate within {timeout}ms")
        return False

def check_typography(url_path, agent_id):
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

def go(page, url, agent_id):
    page.goto(url)
    wait_for_app(page, agent_id)
    return get_text(page)

def find_ground(page, agent_id, hints):
    """Try to find a ground by partial text hints, click it, return True if found."""
    for hint in hints:
        el = page.query_selector(f"text={hint}")
        if el:
            log(agent_id, f"Found ground via '{hint}'. Clicking.")
            el.click()
            page.wait_for_load_state("networkidle", timeout=8000)
            wait_for_app(page, agent_id)
            return True
    return False

def do_checkin(page, agent_id, messages):
    """Attempt a full check-in session with given messages. Returns True on completion."""
    # Click start/open button
    start_btn = None
    for sel in [
        "button:has-text('Start session')",
        "button:has-text('Start check-in')",
        "button:has-text('Check in')",
        "button:has-text('Begin')",
        "a:has-text('Start session')",
    ]:
        start_btn = page.query_selector(sel)
        if start_btn:
            log(agent_id, f"Found start button: {start_btn.inner_text().strip()}")
            break

    if not start_btn:
        log(agent_id, "No start/check-in button found. Listing buttons:")
        for b in page.query_selector_all("button")[:15]:
            try: log(agent_id, f"  Button: {b.inner_text().strip()[:60]}")
            except: pass
        return False

    start_btn.click()
    start = time.time()
    wait_for_app(page, agent_id, timeout=20000)
    elapsed = time.time() - start
    if elapsed > 5:
        log(agent_id, f"WAIT: {elapsed:.1f}s to open session")
    ss(page, agent_id, "ci_open", "check-in opened")

    # Wait for textarea to become enabled (session open Gemini call may take a while)
    try:
        page.wait_for_function(
            "() => { const t = document.querySelector('textarea'); return t && !t.disabled && !t.readOnly; }",
            timeout=120000
        )
        log(agent_id, "Textarea is enabled. Starting messages.")
    except PlaywrightTimeout:
        log(agent_id, f"WAIT: Textarea not enabled within 120s. Session may have failed to open.")
        ss(page, agent_id, "ci_timeout", "textarea never enabled")
        return False

    # Send messages
    for i, msg in enumerate(messages):
        textarea = page.query_selector("textarea")
        if not textarea:
            log(agent_id, f"No textarea at message {i+1}. Giving up check-in.")
            return False
        textarea.fill(msg, timeout=60000)
        send_btn = page.query_selector("button:has-text('Send'), button[type=submit]")
        if send_btn:
            send_btn.click()
        else:
            textarea.press("Enter")
        start = time.time()
        # Wait for AI reply
        try:
            page.wait_for_function(
                "() => document.body.innerText.length > 200",
                timeout=60000
            )
        except PlaywrightTimeout:
            pass
        elapsed = time.time() - start
        if elapsed > 5:
            log(agent_id, f"WAIT: {elapsed:.1f}s for AI reply after message {i+1}")
        time.sleep(1)
        ss(page, agent_id, f"ci_msg{i+1}", f"after message {i+1}")

    # Send close signal
    textarea = page.query_selector("textarea")
    if textarea:
        textarea.fill("That is everything.")
        send_btn = page.query_selector("button:has-text('Send'), button[type=submit]")
        if send_btn:
            send_btn.click()
        else:
            textarea.press("Enter")
        try:
            page.wait_for_function(
                "() => document.body.innerText.includes('record is here') || document.body.innerText.includes('Your record')",
                timeout=90000
            )
        except PlaywrightTimeout:
            pass
        time.sleep(2)
        ss(page, agent_id, "ci_close", "after closing signal")

    # Look for complete button
    complete_btn = None
    for sel in ["button:has-text('Done')", "button:has-text('Complete')", "button:has-text('Submit')", "button:has-text('Finish')"]:
        complete_btn = page.query_selector(sel)
        if complete_btn:
            log(agent_id, f"Completing via: {complete_btn.inner_text().strip()}")
            complete_btn.click()
            wait_for_app(page, agent_id, timeout=15000)
            break

    ss(page, agent_id, "ci_done", "check-in done")
    log(agent_id, f"Check-in text after completion: {get_text(page)[:400]}")
    return True

def read_report(page, agent_id):
    """Navigate to Report tab and return report text."""
    report_btn = None
    for sel in ["button:has-text('Report')", "a:has-text('Report')"]:
        report_btn = page.query_selector(sel)
        if report_btn:
            break
    if not report_btn:
        log(agent_id, "No Report tab found.")
        return ""
    report_btn.click()
    start = time.time()
    wait_for_app(page, agent_id, timeout=20000)
    elapsed = time.time() - start
    if elapsed > 5:
        log(agent_id, f"WAIT: {elapsed:.1f}s to load report tab")
    ss(page, agent_id, "report_tab", "report tab")
    return get_text(page)

def assess_report_quality(agent_id, report_text):
    """Cross-session and quality assessment of a report."""
    s1_phrases = ["session 1", "Session 1", "first session", "previous session", "earlier session", "last session", "prior session"]
    s2_phrases = ["session 2", "Session 2", "second session"]
    change_phrases = ["has shifted", "has changed", "compared to", "unlike before", "previously", "last time", "over time", "from the first", "from session", "building on"]
    hedge_phrases = ["it appears", "seems to suggest", "may indicate", "could mean", "approximately"]
    false_consensus = ["both parties agree", "both agree", "full agreement", "full alignment", "consensus", "aligned on all"]

    found_s1 = [s for s in s1_phrases if s in report_text]
    found_s2 = [s for s in s2_phrases if s in report_text]
    found_change = [s for s in change_phrases if s.lower() in report_text.lower()]
    found_hedge = [s for s in hedge_phrases if s.lower() in report_text.lower()]
    found_fc = [s for s in false_consensus if s.lower() in report_text.lower()]

    log(agent_id, f"Cross-session: S1 refs={found_s1}, S2 refs={found_s2}, Change language={found_change}")
    log(agent_id, f"Quality flags: hedging={found_hedge}, false-consensus risk={found_fc}")

    word_count = len(report_text.split())
    log(agent_id, f"Report word count: {word_count}")

    if not found_s1 and not found_s2 and not found_change:
        log(agent_id, "CRITICAL FINDING *** Report is a standalone snapshot. ZERO longitudinal cross-referencing. Core promise not kept.")
    else:
        log(agent_id, "Report contains cross-session references.")

    if word_count < 100:
        log(agent_id, "QUALITY: Report too thin (<100 words). Not decision-grade.")
    elif word_count < 200:
        log(agent_id, "QUALITY: Report minimal (100-200 words). Borderline.")
    else:
        log(agent_id, "QUALITY: Report has adequate substance (200+ words).")

    return found_s1, found_s2, found_change


# ─── Agent 21 ─────────────────────────────────────────────────────────────────
def agent_21():
    AID = 21
    log(AID, "=== AGENT 21: Zainab, returning_admin, session 3 - run session and see longitudinal change ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        if "sign in" in text.lower() or "log in" in text.lower():
            log(AID, "PROBLEM: Being asked to sign in. Not remembered. Critical.")
        else:
            log(AID, "Logged in. Good.")

        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        ss(page, AID, 2, "ground page")
        gt = get_text(page)
        log(AID, f"Ground text: {gt[:800]}")

        if not found:
            log(AID, "STUCK: Cannot find Sarah Chen ground. Cannot proceed.")
            save_state(ctx, "zainab"); browser.close(); return

        # Check for session 3 prompt
        log(AID, "Step 3 - Looking for session 3 CTA.")
        has_s3 = "session 3" in gt.lower() or "Session 3" in gt
        log(AID, f"Session 3 visible: {has_s3}")

        # Attempt to do session 3 check-in
        log(AID, "Step 4 - Attempting to start session 3 check-in.")
        ok = do_checkin(page, AID, [
            "We are three months in with Sarah. She has settled in well technically but the mobile team coordination is still unresolved.",
            "The meeting with the product lead happened and was useful. We agreed on the next 30 days.",
            "My main concern now is whether she can own the feature end to end without needing me to clear blockers.",
        ])
        log(AID, f"Check-in completed: {ok}")

        check_typography(page.url.replace(BASE_URL, ""), AID)
        save_state(ctx, "zainab"); browser.close()


# ─── Agent 22 ─────────────────────────────────────────────────────────────────
def agent_22():
    AID = 22
    log(AID, "=== AGENT 22: Zainab CRITICAL - session 3 report must reference sessions 1 and 2 ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")

        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        if not found:
            log(AID, "Cannot find Sarah Chen ground.")
            ss(page, AID, 2, "no ground"); save_state(ctx, "zainab"); browser.close(); return

        ss(page, AID, 2, "ground page")
        report_text = read_report(page, AID)
        log(AID, f"=== FULL REPORT TEXT ({len(report_text)} chars) ===")
        log(AID, report_text[:6000])

        assess_report_quality(AID, report_text)
        check_typography(page.url.replace(BASE_URL, ""), AID)
        save_state(ctx, "zainab"); browser.close()


# ─── Agent 23 ─────────────────────────────────────────────────────────────────
def agent_23():
    AID = 23
    log(AID, "=== AGENT 23: Tom, returning_participant, session 3 - my prior input should matter ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "tom")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        if "sign" in text.lower():
            log(AID, "Being asked to sign in as third-time participant. Critical - not remembered.")

        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        ss(page, AID, 2, "ground or dashboard")
        if not found:
            log(AID, "Cannot find my ground. Listing what is visible.")
            log(AID, f"Visible: {text[:600]}")
            save_state(ctx, "tom"); browser.close(); return

        gt = get_text(page)
        my_history = any(s in gt for s in ["Session 1", "Session 2", "session 1", "session 2", "previous", "last time"])
        log(AID, f"My prior participation shown: {my_history}")

        # Attempt session 3 check-in as Tom
        log(AID, "Attempting session 3 check-in.")
        ok = do_checkin(page, AID, [
            "The process clarity issue I flagged before is still unresolved. No one has defined who owns the mobile coordination.",
            "The product lead meeting did happen. I was in it. It was useful but did not produce a written outcome.",
            "I am now more confident in my role technically. The ownership question is the main remaining gap.",
        ])
        log(AID, f"Check-in completed: {ok}")
        ss(page, AID, 3, "final state")

        save_state(ctx, "tom"); browser.close()


# ─── Agent 24 ─────────────────────────────────────────────────────────────────
def agent_24():
    AID = 24
    log(AID, "=== AGENT 24: Priya, returning_admin, session 3 - how has alignment moved over three grounds ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "priya")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:600]}")

        found = find_ground(page, AID, ["Product direction", "direction alignment", "Product"])
        ss(page, AID, 2, "ground or dashboard")
        if not found:
            log(AID, "Cannot find Priya's product ground. What is visible:")
            log(AID, f"{text[:800]}")
            # Try clicking any ground
            ground_link = page.query_selector("a[href*='ground']")
            if ground_link:
                ground_link.click()
                wait_for_app(page, AID)
                found = True

        if found:
            gt = get_text(page)
            has_history = any(s in gt.lower() for s in ["trend", "session 1", "session 2", "history", "shift", "over time"])
            log(AID, f"Longitudinal language visible: {has_history}")

            ok = do_checkin(page, AID, [
                "We made the call on the data pipeline. We went with Segment. The two-week spike proved it is the right move short term.",
                "The new tension is roadmap sequencing. She wants to delay feature X. I think we can do both in parallel.",
                "I am less certain about the timeline now. We have slipped by two weeks and have not named who is accountable for the delay.",
            ])
            log(AID, f"Check-in completed: {ok}")

        ss(page, AID, 3, "final")
        save_state(ctx, "priya"); browser.close()


# ─── Agent 25 ─────────────────────────────────────────────────────────────────
def agent_25():
    AID = 25
    log(AID, "=== AGENT 25: Bongani, new admin in existing org - expects to inherit context ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "initial landing")
        log(AID, f"Landing: {text[:400]}")

        auth_text = go(page, f"{BASE_URL}/auth", AID)
        ss(page, AID, 2, "auth page")
        log(AID, f"Auth page: {auth_text[:400]}")

        email_input = page.query_selector("input[type=email], input[name=email], input[placeholder*='mail' i]")
        if email_input:
            email_input.fill("bongani.ndlovu@example-test.invalid")
            ss(page, AID, 3, "email filled")

            submit_btn = page.query_selector("button[type=submit], button:has-text('Sign in'), button:has-text('Continue'), button:has-text('Send')")
            if submit_btn:
                submit_btn.click()
                start = time.time()
                wait_for_app(page, AID, timeout=12000)
                elapsed = time.time() - start
                if elapsed > 5:
                    log(AID, f"WAIT: {elapsed:.1f}s after submit")
                ss(page, AID, 4, "after submit")
                text3 = get_text(page)
                log(AID, f"After submit: {text3[:600]}")

                result = subprocess.run(
                    ["curl", "-s", "http://127.0.0.1:1080/link?to=bongani.ndlovu@example-test.invalid"],
                    capture_output=True, text=True, timeout=10
                )
                log(AID, f"Mailcatcher link: {result.stdout[:300]}")

                if result.stdout and "http" in result.stdout:
                    link = result.stdout.strip()
                    page.goto(link)
                    wait_for_app(page, AID, timeout=12000)
                    ss(page, AID, 5, "after magic link")
                    text4 = get_text(page)
                    log(AID, f"After magic link: {text4[:600]}")
                    has_setup = any(s in text4.lower() for s in ["set up", "welcome", "join"])
                    has_context = any(s in text4.lower() for s in ["ground", "session", "history"])
                    log(AID, f"Setup flow shown: {has_setup}, Org context shown: {has_context}")
                else:
                    log(AID, "No magic link received.")
        else:
            log(AID, "No email input found on auth page.")

        ss(page, AID, 6, "final state")
        log(AID, f"Final URL: {page.url}")
        os.makedirs(f"{STATE_DIR}/bongani", exist_ok=True)
        ctx.storage_state(path=f"{STATE_DIR}/bongani/state.json")
        browser.close()


# ─── Agent 26 ─────────────────────────────────────────────────────────────────
def agent_26():
    AID = 26
    log(AID, "=== AGENT 26: Marcus, new participant in existing ground - expects context not cold drop ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "marcus")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:500]}")

        if "sign" in text.lower():
            log(AID, "Being asked to sign in. As new participant, I may need to register.")

        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        ss(page, AID, 2, "ground or dashboard")

        if found:
            gt = get_text(page)
            log(AID, f"Ground page: {gt[:800]}")
            context_given = any(s in gt for s in ["Session 1", "Session 2", "session 1", "session 2", "previously", "earlier"])
            log(AID, f"Context from prior sessions shown to me: {context_given}")
            if not context_given:
                log(AID, "FINDING: I was dropped in cold. No context from the two prior sessions. Feeling: lost.")

            ok = do_checkin(page, AID, [
                "I am Marcus, joining session 3. I understand there is prior history here that I was not part of.",
                "From my perspective the mobile coordination gap is the most important open item to resolve.",
            ])
            log(AID, f"Check-in attempted: {ok}")
        else:
            log(AID, "Cannot find a ground I was invited to. Feeling: like I was forgotten.")

        ss(page, AID, 3, "final")
        save_state(ctx, "marcus"); browser.close()


# ─── Agent 27 ─────────────────────────────────────────────────────────────────
def agent_27():
    AID = 27
    log(AID, "=== AGENT 27: Sandra, org_admin_full - wants org-level longitudinal picture ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "sandra")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:600]}")

        if "sign" in text.lower():
            log(AID, "PROBLEM: Sandra being asked to sign in. Expected to be remembered.")

        # Sandra is an org admin - look for org-level view
        log(AID, "Looking for org-level view or admin dashboard.")
        admin_link = page.query_selector("a:has-text('Admin'), button:has-text('Admin')")
        if admin_link:
            log(AID, f"Found Admin link: {admin_link.inner_text()}")
            admin_link.click()
            wait_for_app(page, AID)
            ss(page, AID, 2, "admin dashboard")
            at = get_text(page)
            log(AID, f"Admin page: {at[:1000]}")
            has_org_view = any(s in at.lower() for s in ["all grounds", "org", "organisation", "team", "members", "history"])
            log(AID, f"Org-level view present: {has_org_view}")
        else:
            log(AID, "No Admin link visible. Sandra cannot see org-level view.")
            ss(page, AID, 2, "no admin link")
            log(AID, f"All buttons: {[b.inner_text().strip()[:40] for b in page.query_selector_all('button')[:15] if b.inner_text().strip()]}")

        # See how many grounds are visible
        ss(page, AID, 3, "grounds view")
        full = get_text(page)
        ground_count = full.lower().count("ground")
        log(AID, f"'Ground' mentions on page: {ground_count}")

        save_state(ctx, "sandra"); browser.close()


# ─── Agent 28 ─────────────────────────────────────────────────────────────────
def agent_28():
    AID = 28
    log(AID, "=== AGENT 28: Kwame, lead with 3 grounds - wants to compare them over time ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "kwame")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:600]}")

        found = find_ground(page, AID, ["Sales team", "Q2 performance", "performance review"])
        ss(page, AID, 2, "ground or dashboard")

        if found:
            gt = get_text(page)
            log(AID, f"Ground page: {gt[:800]}")

            ok = do_checkin(page, AID, [
                "The two reps on PIPs are both showing improvement. One is clearly going to make it. The other I am less sure about.",
                "We have revised the hiring process. The trial close exercise is now in the interview. We have three new pipeline candidates.",
                "My main concern is the head of sales herself. She is at 70 percent of her own management objective and we have not addressed it directly.",
            ])
            log(AID, f"Check-in completed: {ok}")
        else:
            log(AID, "Cannot find Kwame's ground.")
            log(AID, f"Page: {text[:600]}")

        ss(page, AID, 3, "final")
        save_state(ctx, "kwame"); browser.close()


# ─── Agents 29 & 30 ───────────────────────────────────────────────────────────
def agent_29_30():
    AID = 29
    log(AID, "=== AGENT 29+30: Zainab CRITICAL - final report, would I show this to my boss? ===")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")

        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        if not found:
            log(AID, "CRITICAL: Cannot find Sarah Chen ground.")
            save_state(ctx, "zainab"); browser.close(); return

        ss(page, AID, 2, "ground page")
        report_text = read_report(page, AID)
        log(AID, f"=== FULL REPORT TEXT (A29, {len(report_text)} chars) ===")
        log(AID, report_text[:6000])

        found_s1, found_s2, found_change = assess_report_quality(AID, report_text)
        wc = len(report_text.split())

        check_typography(page.url.replace(BASE_URL, ""), AID)

        if not found_s1 and not found_s2 and not found_change:
            log(30, "=== AGENT 30: Three sessions felt like three unrelated exercises. Would not run a fourth. ===")
        elif wc < 200:
            log(30, "=== AGENT 30: Sessions produced a thin report. Compounding is not visible. Unsure about a fourth. ===")
        else:
            log(30, "=== AGENT 30: Compounding is visible. Would run a fourth session. ===")

        save_state(ctx, "zainab"); browser.close()


# ─── Agent 41 ─────────────────────────────────────────────────────────────────
def agent_41():
    AID = 41
    log(AID, "=== AGENT 41: Zainab CRITICAL - would I put my name on this report in front of my boss? ===")
    log(AID, "WATCHING FOR: hallucination, extrapolation, insufficiency")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "zainab")
        page = ctx.new_page()

        go(page, BASE_URL, AID)
        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        if not found:
            log(AID, "STUCK: Cannot access the ground.")
            save_state(ctx, "zainab"); browser.close(); return

        report_text = read_report(page, AID)
        log(AID, f"=== FULL REPORT TEXT ({len(report_text)} chars) ===")
        log(AID, report_text[:8000])

        # Hallucination check - claims with no input basis
        log(AID, "--- HALLUCINATION CHECK ---")
        # These would be claims that could not come from 3 sessions about engineering onboarding
        suspicious_phrases = [
            "salary", "pay", "compensation", "raise",
            "fired", "terminated", "resign",
            "legal", "lawsuit", "complaint",
            "100%", "never", "always", "every single",
            "guaranteed", "proven", "definitively",
        ]
        found_suspicious = [s for s in suspicious_phrases if s.lower() in report_text.lower()]
        if found_suspicious:
            log(AID, f"HALLUCINATION FLAG: Suspicious phrases: {found_suspicious}")
        else:
            log(AID, "No obvious hallucination markers found.")

        # Extrapolation check - strength of claims vs evidence
        log(AID, "--- EXTRAPOLATION CHECK ---")
        overreach = [
            "the team believes", "the team thinks", "everyone agrees",
            "clearly demonstrates", "proves that", "definitively shows",
            "the consensus is", "without doubt", "all parties agree",
        ]
        found_overreach = [s for s in overreach if s.lower() in report_text.lower()]
        if found_overreach:
            log(AID, f"EXTRAPOLATION FLAG: Over-strength claims: {found_overreach}")
        else:
            log(AID, "No obvious extrapolation markers.")

        # Insufficiency check
        log(AID, "--- INSUFFICIENCY CHECK ---")
        wc = len(report_text.split())
        log(AID, f"Word count: {wc}")
        thin_signals = ["no data", "insufficient", "not enough", "unable to assess", "no evidence"]
        honest_thin = [s for s in thin_signals if s.lower() in report_text.lower()]
        if wc < 150:
            log(AID, f"INSUFFICIENCY: Report is thin ({wc} words).")
        if honest_thin:
            log(AID, f"Report honestly admits limitations: {honest_thin}")

        log(AID, f"VERDICT: Would I put my name on this? Report has {wc} words, {'cross-session refs' if any(['session 1' in report_text.lower(), 'session 2' in report_text.lower()]) else 'NO cross-session refs'}, {'suspicious claims' if found_suspicious else 'no suspicious claims'}, {'overreach' if found_overreach else 'no overreach'}.")

        check_typography(page.url.replace(BASE_URL, ""), AID)
        save_state(ctx, "zainab"); browser.close()


# ─── Agent 42 ─────────────────────────────────────────────────────────────────
def agent_42():
    AID = 42
    log(AID, "=== AGENT 42: Priya - thin input session. Report must admit it, not manufacture confidence. ===")
    log(AID, "WATCHING FOR: hallucination, insufficiency")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "priya")
        page = ctx.new_page()

        go(page, BASE_URL, AID)
        found = find_ground(page, AID, ["Product direction", "direction alignment", "Product"])
        if not found:
            log(AID, "Cannot find Priya's ground.")
            save_state(ctx, "priya"); browser.close(); return

        # Do a deliberately thin check-in
        log(AID, "Attempting deliberately thin check-in to test report honesty.")
        ok = do_checkin(page, AID, [
            "Things are fine.",
            "No major issues.",
        ])
        log(AID, f"Thin check-in attempted: {ok}")
        ss(page, AID, 2, "after thin checkin")

        # Read the report
        report_text = read_report(page, AID)
        log(AID, f"=== REPORT TEXT ({len(report_text)} chars) ===")
        log(AID, report_text[:5000])

        wc = len(report_text.split())
        log(AID, f"Word count: {wc}")

        # Does it admit thinness?
        honest_phrases = [
            "limited input", "insufficient", "thin", "not enough to assess",
            "no specific", "cannot verify", "not verifiable", "vague",
            "lacking specificity", "no evidence", "no concrete",
        ]
        found_honest = [s for s in honest_phrases if s.lower() in report_text.lower()]
        log(AID, f"Report admits limitations: {found_honest}")

        confident_phrases = [
            "strong alignment", "clear picture", "fully aligned", "well-established",
            "solid progress", "the team is aligned",
        ]
        found_confident = [s for s in confident_phrases if s.lower() in report_text.lower()]
        if found_confident:
            log(AID, f"HALLUCINATION FLAG: Report projects confidence from thin input: {found_confident}")
        else:
            log(AID, "Report does not over-project confidence. Good.")

        save_state(ctx, "priya"); browser.close()


# ─── Agent 43 ─────────────────────────────────────────────────────────────────
def agent_43():
    AID = 43
    log(AID, "=== AGENT 43: Sandra - two people disagreed sharply. Does report show or smooth it over? ===")
    log(AID, "WATCHING FOR: extrapolation, false consensus")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "sandra")
        page = ctx.new_page()

        go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {get_text(page)[:600]}")

        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        ss(page, AID, 2, "ground or dashboard")

        if found:
            report_text = read_report(page, AID)
            log(AID, f"=== REPORT TEXT ({len(report_text)} chars) ===")
            log(AID, report_text[:5000])

            # Check for divergence visibility
            divergence_phrases = ["disagree", "diverge", "different view", "one party", "the other party",
                                  "tension", "gap between", "not aligned", "still open", "unresolved"]
            false_consensus = ["both parties agree", "full agreement", "fully aligned", "consensus", "both agree", "all parties agree"]

            found_div = [s for s in divergence_phrases if s.lower() in report_text.lower()]
            found_fc = [s for s in false_consensus if s.lower() in report_text.lower()]

            log(AID, f"Divergence shown: {found_div}")
            if found_fc:
                log(AID, f"EXTRAPOLATION FLAG: False consensus language: {found_fc}")
            else:
                log(AID, "No false consensus language detected.")

            if not found_div:
                log(AID, "FINDING: No divergence language in report. A sharp disagreement may have been smoothed over. This is worse than no report.")
        else:
            log(AID, "Sandra cannot see the ground. As org admin she should be able to.")
            log(AID, f"Full page: {get_text(page)[:600]}")

        ss(page, AID, 3, "final")
        save_state(ctx, "sandra"); browser.close()


# ─── Agent 49 ─────────────────────────────────────────────────────────────────
def agent_49():
    AID = 49
    log(AID, "=== AGENT 49: Marcus, new_participant - can I see the result of the ground I contributed to? ===")
    log(AID, "WATCHING FOR: report_accessibility")
    with sync_playwright() as p:
        browser, ctx = make_context(p, "marcus")
        page = ctx.new_page()

        text = go(page, BASE_URL, AID)
        ss(page, AID, 1, "dashboard")
        log(AID, f"Dashboard: {text[:600]}")

        found = find_ground(page, AID, ["Sarah Chen", "Engineering onboarding"])
        ss(page, AID, 2, "ground or dashboard")

        if found:
            gt = get_text(page)
            log(AID, f"Ground page: {gt[:800]}")

            # Look for report tab
            report_btn = page.query_selector("button:has-text('Report'), a:has-text('Report')")
            if report_btn:
                log(AID, "Report tab is visible to me as a participant. Clicking.")
                report_btn.click()
                wait_for_app(page, AID)
                ss(page, AID, 3, "report tab")
                rt = get_text(page)
                log(AID, f"Report page: {rt[:2000]}")

                has_content = len(rt.strip()) > 100
                is_blocked = any(s in rt.lower() for s in ["not available", "not released", "waiting", "not yet"])
                log(AID, f"Report has content: {has_content}, Shows blocking message: {is_blocked}")

                if is_blocked:
                    log(AID, "I am told clearly why I cannot see it. That is acceptable. Feeling: informed, not abandoned.")
                elif has_content:
                    log(AID, "I can see the report. Feeling: my contribution mattered.")
                else:
                    log(AID, "FINDING: Report tab is empty with no explanation. I am left contributing into a void.")
            else:
                log(AID, "FINDING: No Report tab visible to me as a participant. I have no way to see the result.")
                ss(page, AID, 3, "no report tab")
        else:
            log(AID, "Cannot find the ground I contributed to. Feeling: completely excluded.")
            ss(page, AID, 3, "no ground found")

        save_state(ctx, "marcus"); browser.close()


# ─── Main runner ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("SESSION 3 PERSONA TESTS: agents 21-30, 41, 42, 43, 49")
    print("=" * 60)

    agents = [
        (agent_21,    "A21  Zainab  returning_admin - run session 3"),
        (agent_22,    "A22  Zainab  CRITICAL - cross-session report"),
        (agent_23,    "A23  Tom     returning_participant - session 3"),
        (agent_24,    "A24  Priya   returning_admin - team alignment"),
        (agent_25,    "A25  Bongani new_admin - inherit context"),
        (agent_26,    "A26  Marcus  new_participant - not cold drop"),
        (agent_27,    "A27  Sandra  org_admin_full - org picture"),
        (agent_28,    "A28  Kwame   lead - compare over time"),
        (agent_29_30, "A29+30 Zainab CRITICAL - final report"),
        (agent_41,    "A41  Zainab  CRITICAL - hallucination/extrapolation audit"),
        (agent_42,    "A42  Priya   thin input test"),
        (agent_43,    "A43  Sandra  false-consensus check"),
        (agent_49,    "A49  Marcus  report accessibility"),
    ]

    for func, label in agents:
        print(f"\n{'─'*60}\nRunning: {label}\n{'─'*60}", flush=True)
        try:
            func()
        except Exception as e:
            import traceback
            print(f"EXCEPTION in {label}: {e}", flush=True)
            traceback.print_exc()
            findings.append(f"EXCEPTION: {label}: {e}")

    print("\n" + "=" * 60)
    print("FINDINGS SUMMARY")
    print("=" * 60)
    for f in findings:
        print(f)

    # Write findings to file
    os.makedirs("/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results", exist_ok=True)
    with open("/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results/session3_findings.txt", "w") as fh:
        fh.write("\n".join(findings))
    print("\nFindings written to results/session3_findings.txt")

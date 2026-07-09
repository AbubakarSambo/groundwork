#!/usr/bin/env python3
"""
Session 1 blind persona tests: agents 1-11, 45
All personas start from scratch — no saved state.
Key rule: use .type() not .fill() for React controlled inputs.
Navigate to /auth directly (not /) to avoid redirect timing.
"""
import json, time, os, subprocess, requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

BASE_URL    = "http://127.0.0.1:5173"
MAIL_URL    = "http://127.0.0.1:1080"
SCREENSHOTS = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results/screenshots"
STATE_DIR   = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/state"

os.makedirs(SCREENSHOTS, exist_ok=True)
findings = []

# ── Helpers ────────────────────────────────────────────────────────────────────

def log(agent_id, msg):
    line = f"[A{agent_id}] {msg}"
    print(line, flush=True)
    findings.append(line)

def ss(page, agent_id, step, label=""):
    path = f"{SCREENSHOTS}/a{agent_id}_s{step}.png"
    page.screenshot(path=path, full_page=True)
    if label:
        log(agent_id, f"Screenshot {step}: {label}")
    return path

def get_text(page):
    try:
        return page.inner_text("body") or ""
    except:
        return ""

def make_ctx(playwright, identity=None, headless=True):
    browser = playwright.chromium.launch(headless=headless, args=["--no-sandbox"])
    if identity:
        state_path = f"{STATE_DIR}/{identity}/state.json"
        if os.path.exists(state_path):
            ctx = browser.new_context(storage_state=state_path)
        else:
            ctx = browser.new_context()
    else:
        ctx = browser.new_context()
    return browser, ctx

def save_state(ctx, identity):
    os.makedirs(f"{STATE_DIR}/{identity}", exist_ok=True)
    ctx.storage_state(path=f"{STATE_DIR}/{identity}/state.json")

def nav(page, url, wait=3):
    page.goto(url, wait_until="commit", timeout=15000)
    time.sleep(wait)

def wait_text(page, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        try:
            t = page.inner_text("body") or ""
            if len(t.strip()) > 10:
                return t
        except:
            pass
        time.sleep(0.5)
    return get_text(page)

def rtype(page, sel, text, agent_id):
    """Find element by selector and type into it (React-safe)."""
    try:
        el = page.query_selector(sel)
        if el:
            el.click()
            el.type(text)
            return True
    except Exception as e:
        log(agent_id, f"rtype failed for {sel}: {e}")
    return False

def clear_mail():
    try: requests.post(f"{MAIL_URL}/clear", timeout=5)
    except: pass

def poll_link(to_email, match=None, max_wait=40):
    endpoint = f"{MAIL_URL}/link?to={to_email}"
    if match: endpoint += f"&match={match}"
    for _ in range(max_wait // 2):
        try:
            r = requests.get(endpoint, timeout=5)
            if r.status_code == 200 and r.text.strip():
                try:
                    j = json.loads(r.text)
                    link = j.get("link", "") if isinstance(j, dict) else ""
                    if link: return link.replace("localhost:5173", "127.0.0.1:5173")
                except: pass
                raw = r.text.strip()
                if raw.startswith("http"): return raw.replace("localhost:5173", "127.0.0.1:5173")
        except: pass
        time.sleep(2)
    return None

def poll_mail(to_email, max_wait=30):
    for _ in range(max_wait // 2):
        try:
            r = requests.get(f"{MAIL_URL}/latest?to={to_email}", timeout=5)
            if r.status_code == 200:
                d = r.json()
                if d: return d
        except: pass
        time.sleep(2)
    return None

def register_magic_link(page, agent_id, email, wait_for_mail=True):
    """
    Full magic-link registration flow.
    Returns the verify link from mailcatcher, or None.
    """
    nav(page, f"{BASE_URL}/auth")
    text = get_text(page)
    log(agent_id, f"Auth page: {text[:100]}")

    # Switch to magic link view
    new_here = page.query_selector("span:has-text('New here')")
    if not new_here:
        log(agent_id, "FAIL: No 'New here' link on auth page")
        ss(page, agent_id, "auth_fail", "no magic link option")
        return None
    new_here.click()
    time.sleep(1)

    # Enter email
    email_inp = page.query_selector("input[type='email']")
    if not email_inp:
        log(agent_id, "FAIL: No email input on magic link form")
        return None
    email_inp.click()
    email_inp.type(email)
    time.sleep(0.3)

    # Send
    send_btn = page.query_selector("button:has-text('Send link')")
    if not send_btn:
        send_btn = page.query_selector("button[type='submit']")
    if not send_btn:
        log(agent_id, "FAIL: No send button")
        return None
    send_btn.click()
    time.sleep(3)

    text = get_text(page)
    if "Check your email" in text or "on its way" in text:
        log(agent_id, "Magic link sent. Polling mailcatcher...")
    else:
        log(agent_id, f"Unexpected page after send: {text[:200]}")

    if not wait_for_mail:
        return "sent"

    link = poll_link(email, max_wait=40)
    if not link:
        mail = poll_mail(email, max_wait=5)
        log(agent_id, f"Mail: {mail}" if mail else "No mail captured")
        log(agent_id, "FAIL: No magic link in mailcatcher")
        return None

    log(agent_id, f"Magic link captured: {link[:80]}")
    return link

def complete_setup(page, agent_id, name, org_name):
    """Complete the /setup flow after clicking the magic link."""
    time.sleep(3)
    text = get_text(page)
    url = page.url
    log(agent_id, f"After magic link, URL={url[:60]}, text={text[:100]}")

    if "/setup" not in url and "Your name" not in text and "organisation" not in text.lower() and "name" not in text.lower():
        log(agent_id, "No setup page - may already be logged in or on another page")
        return

    # Name field
    name_inp = None
    for sel in ["input[name='name']", "input[placeholder*='name' i]", "input[placeholder*='Name' i]"]:
        name_inp = page.query_selector(sel)
        if name_inp: break
    if name_inp:
        name_inp.click()
        name_inp.type(name)

    # Org field
    org_inp = None
    for sel in ["input[name='organization']", "input[name='orgName']", "input[placeholder*='organisation' i]", "input[placeholder*='organization' i]", "input[placeholder*='company' i]"]:
        org_inp = page.query_selector(sel)
        if org_inp: break
    if org_inp:
        org_inp.click()
        org_inp.type(org_name)

    # Password
    pw_inp = page.query_selector("input[type='password']")
    if pw_inp:
        pw_inp.click()
        pw_inp.type("TestPass123!")
        pw2 = page.query_selector("input[placeholder*='confirm' i]")
        if pw2:
            pw2.click()
            pw2.type("TestPass123!")

    ss(page, agent_id, "setup_form", "setup filled")

    submit = None
    for sel in ["button[type='submit']", "button:has-text('Continue')", "button:has-text('Set up')", "button:has-text('Save')", "button:has-text('Create')"]:
        submit = page.query_selector(sel)
        if submit and submit.is_enabled(): break

    if submit:
        submit.click()
        time.sleep(3)
        text = get_text(page)
        log(agent_id, f"After setup submit: URL={page.url[:60]}, text={text[:100]}")
    else:
        log(agent_id, "No setup submit button found")

def do_checkin(page, agent_id, messages, timeout_ta=120):
    """Full check-in session. Returns True on completion."""
    # Find start button
    start_btn = None
    for sel in ["button:has-text('Start session')", "button:has-text('Start check-in')", "a:has-text('Start session')", "button:has-text('Begin')", "button:has-text('Check in')"]:
        start_btn = page.query_selector(sel)
        if start_btn:
            log(agent_id, f"Found start button: {start_btn.inner_text().strip()[:40]}")
            break

    if not start_btn:
        log(agent_id, "No start button found")
        for b in page.query_selector_all("button")[:10]:
            try: log(agent_id, f"  Button: {b.inner_text().strip()[:50]}")
            except: pass
        return False

    start_btn.click()
    t0 = time.time()
    time.sleep(2)
    ss(page, agent_id, "ci_open", "check-in opened")

    # Wait for textarea to be enabled
    try:
        page.wait_for_function(
            "() => { const t = document.querySelector('textarea'); return t && !t.disabled && !t.readOnly; }",
            timeout=timeout_ta * 1000
        )
        elapsed = time.time() - t0
        if elapsed > 5:
            log(agent_id, f"WAIT: {elapsed:.1f}s for textarea to enable")
        log(agent_id, "Textarea enabled")
    except PlaywrightTimeout:
        log(agent_id, f"TIMEOUT: Textarea never enabled within {timeout_ta}s")
        ss(page, agent_id, "ci_timeout", "timeout")
        return False

    # Send messages
    for i, msg in enumerate(messages):
        textarea = page.query_selector("textarea")
        if not textarea:
            log(agent_id, f"No textarea at msg {i+1}")
            return False
        textarea.fill(msg)
        send_btn = page.query_selector("button:has-text('Send'), button[type=submit]")
        if send_btn:
            send_btn.click()
        else:
            textarea.press("Enter")
        try:
            before_len = len(get_text(page))
            page.wait_for_function(
                f"() => document.body.innerText.length > {before_len + 30}",
                timeout=60000
            )
        except PlaywrightTimeout:
            log(agent_id, f"TIMEOUT waiting for AI reply after msg {i+1}")
        time.sleep(1)
        ss(page, agent_id, f"ci_msg{i+1}", f"after message {i+1}")

    # Close signal
    for close_msg in ["That's all from me.", "Done.", "I'm done.", "Thanks. That's all."]:
        textarea = page.query_selector("textarea")
        if textarea:
            textarea.fill(close_msg)
            send_btn = page.query_selector("button:has-text('Send'), button[type=submit]")
            if send_btn: send_btn.click()
            else: textarea.press("Enter")
            break

    time.sleep(4)
    ss(page, agent_id, "ci_close", "after close signal")

    # Wait for session to end
    try:
        page.wait_for_function(
            "() => document.body.innerText.includes('session') && !document.querySelector('textarea')",
            timeout=30000
        )
    except PlaywrightTimeout:
        pass

    time.sleep(2)
    ss(page, agent_id, "ci_done", "check-in done")
    return True

def find_ground(page, agent_id, hints):
    for hint in hints:
        el = page.query_selector(f"text={hint}")
        if el:
            log(agent_id, f"Found ground via '{hint}'")
            el.click()
            time.sleep(3)
            return True
    return False

# ── Agent implementations ──────────────────────────────────────────────────────

def a1_zainab_new_admin(playwright):
    """A1: Zainab, new_admin - sets up first ground. Stops to understand the product first."""
    log(1, "=== AGENT 1: Zainab, new_admin - first time admin, wants to align team ===")
    clear_mail()
    browser, ctx = make_ctx(playwright)
    page = ctx.new_page()

    try:
        # What does Zainab see as a first-time visitor?
        nav(page, f"{BASE_URL}/auth")
        ss(page, 1, 1, "first view")
        text = get_text(page)
        log(1, f"What I see: {text[:300]}")
        log(1, "Expectation: I want to understand what this is before signing up")
        log(1, f"Reality: {text[:100]}")

        # Register
        link = register_magic_link(page, 1, "zainab.okoro@example-test.invalid")
        if not link:
            log(1, "FAIL: Could not get magic link")
            return

        ss(page, 1, 2, "after send link")

        nav(page, link)
        ss(page, 1, 3, "after activate link")
        text = get_text(page)
        log(1, f"After activate: URL={page.url[:60]} text={text[:200]}")

        complete_setup(page, 1, "Zainab Okoro", "Zainab Org")
        ss(page, 1, 4, "after setup")

        text = get_text(page)
        log(1, f"Post-setup page: {text[:300]}")
        log(1, f"URL: {page.url}")

        # Navigate to grounds / home
        if "/home" not in page.url and "/grounds" not in page.url:
            nav(page, f"{BASE_URL}/home")

        text = get_text(page)
        log(1, f"Dashboard: {text[:400]}")
        ss(page, 1, 5, "dashboard")

        # Find new ground
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')", "button:has-text('Open a new ground')", "a:has-text('+')"]:
            new_btn = page.query_selector(sel)
            if new_btn: break

        if not new_btn:
            log(1, "FINDING: No 'New ground' button visible on dashboard")
            log(1, f"Buttons visible: {[b.inner_text().strip()[:30] for b in page.query_selector_all('button')[:10]]}")
        else:
            log(1, f"New ground button found")
            new_btn.click()
            time.sleep(2)
            ss(page, 1, 6, "new ground flow")
            text = get_text(page)
            log(1, f"New ground page: {text[:400]}")
            log(1, "Expectation: I fill in who this ground is for and what it is about")
            log(1, f"Reality: {text[:200]}")

            # Walk through setup steps
            for step_i in range(15):
                text = get_text(page)
                ss(page, 1, f"gs{step_i}", f"setup step {step_i}")

                # Fill any visible text input
                for inp in page.query_selector_all("input[type='text'], input:not([type='email']):not([type='password'])")[:2]:
                    try:
                        if not inp.input_value() and inp.is_enabled():
                            inp.click()
                            inp.type("Sarah Chen - Engineering onboarding")
                            break
                    except: pass

                # Fill textarea
                ta = page.query_selector("textarea")
                if ta:
                    try:
                        if not ta.input_value():
                            ta.fill("Sarah Chen joins as Senior Engineer on 14 July. We want to align on her role scope, 90-day delivery goals, and what support looks like from the team.")
                    except: pass

                # Fill invite email if asked (but not yet - do it in A3)
                # For A1, skip the invite step (Zainab just sets up, Tom gets invited in A2/A3)
                email_inp = page.query_selector("input[type='email']")
                if email_inp and "invite" in text.lower() or email_inp and "participant" in text.lower():
                    try:
                        if not email_inp.input_value():
                            email_inp.click()
                            email_inp.type("tom.baker@example-test.invalid")
                    except: pass

                # Select any radio/option if present
                for radio in page.query_selector_all("input[type='radio']")[:3]:
                    try:
                        if not radio.is_checked():
                            radio.click()
                            break
                    except: pass

                # Click select-type buttons (situation type)
                for btn_text in ["Already underway", "Starting something", "New hire", "Performance", "Alignment"]:
                    btn = page.query_selector(f"button:has-text('{btn_text}')")
                    if btn:
                        try:
                            btn.click()
                            time.sleep(0.5)
                            break
                        except: pass

                # Find next button
                next_btn = None
                for sel in ["button:has-text('Next')", "button:has-text('Continue')", "button:has-text('Invite')", "button:has-text('Add')", "button:has-text('Create ground')", "button:has-text('Save')", "button[type='submit']:not(:has-text('Sign'))"]:
                    b = page.query_selector(sel)
                    if b:
                        try:
                            if b.is_enabled():
                                next_btn = b
                                break
                        except: pass

                if not next_btn:
                    log(1, f"No next button at setup step {step_i}. Text: {text[:100]}")
                    break

                log(1, f"Setup step {step_i}: clicking '{next_btn.inner_text().strip()[:30]}'")
                next_btn.click()
                time.sleep(2)

                new_text = get_text(page)
                if "/grounds/" in page.url and "entry" not in page.url:
                    log(1, f"Arrived at ground: {page.url}")
                    break
                if "invite" in new_text.lower() and "sent" in new_text.lower():
                    log(1, "Invite sent!")
                    break

        ss(page, 1, "final", "final state")
        text = get_text(page)
        log(1, f"Final page: {text[:400]}")
        log(1, f"Final URL: {page.url}")

        save_state(ctx, "zainab")
        log(1, "State saved for zainab")

    finally:
        browser.close()


def a2_tom_new_participant(playwright):
    """A2: Tom, new_participant - follows invite link, does first check-in."""
    log(2, "=== AGENT 2: Tom, new_participant - I got a link with no explanation ===")
    clear_mail()

    # We need Tom's invite. But we can't run A2 unless A1/A3 has sent an invite.
    # Check if there's an invite for Tom in mailcatcher from a prior step.
    # If not, we'll note this as a dependency finding.
    # For session 1, agent 3 is supposed to pair zainab+tom.
    # In practice, A1 may or may not have sent tom an invite.
    # Check mailcatcher.

    browser, ctx = make_ctx(playwright)
    page = ctx.new_page()

    try:
        invite_link = poll_link("tom.baker@example-test.invalid", match="invite", max_wait=10)
        if not invite_link:
            log(2, "No invite found for tom.baker in mailcatcher")
            log(2, "FINDING: Tom cannot complete A2 without an invite being sent first (A1 dependency)")
            # Tom will need to be invited in A3 - mark this and continue with what we can
            ss(page, 2, 1, "no invite available")
            return

        log(2, f"Found invite link: {invite_link[:80]}")
        log(2, "Expectation: I click this link and land somewhere that explains what I'm doing")

        nav(page, invite_link)
        ss(page, 2, 1, "after invite link")
        text = get_text(page)
        log(2, f"After invite link: URL={page.url[:60]}")
        log(2, f"What I see: {text[:400]}")
        log(2, f"How I feel: {'Curious' if 'groundwork' in text.lower() else 'Confused - I dont know what this is'}")

        # Tom may need to set a password / create account
        if "set" in text.lower() and "password" in text.lower() or "/setup" in page.url:
            complete_setup(page, 2, "Tom Baker", "")
        elif "verify" in page.url.lower():
            # May need to complete verification first
            pw_inp = page.query_selector("input[type='password']")
            if pw_inp:
                pw_inp.click()
                pw_inp.type("TestPass123!")
                submit = page.query_selector("button[type='submit'], button:has-text('Continue')")
                if submit:
                    submit.click()
                    time.sleep(3)

        ss(page, 2, 2, "after account setup")
        text = get_text(page)
        log(2, f"Post-setup: {text[:300]}")

        # Navigate to the check-in
        if "/chat" in page.url or "/checkin" in page.url:
            log(2, "Already in check-in flow")
        else:
            nav(page, f"{BASE_URL}/home")
            text = get_text(page)
            log(2, f"Home: {text[:400]}")
            ss(page, 2, 3, "home page")

            # Find the ground
            found = find_ground(page, 2, ["Sarah Chen", "Engineering onboarding", "Zainab"])
            if not found:
                log(2, "FINDING: Tom cannot find the ground on his dashboard")
                log(2, f"Dashboard text: {text[:300]}")

        ss(page, 2, 4, "ground or dashboard")
        text = get_text(page)
        log(2, f"Current state: {text[:400]}")

        # Do check-in
        done = do_checkin(page, 2, [
            "I'm Tom. I got a link but wasn't sure what I was being asked to do. I can see it's about the engineering onboarding. My main concern is whether the expectations for my role are clearly defined from both sides.",
            "In my experience, the first 90 days are critical. I want to make sure we're aligned on what success looks like for me specifically - not just a generic 'settle in' goal.",
        ])
        log(2, f"Check-in completed: {done}")

        save_state(ctx, "tom")
        log(2, "State saved for tom")

    finally:
        browser.close()


def a3_zainab_and_tom_paired(playwright):
    """
    A3: Zainab creates a ground, invites Tom, verifies Tom's response reaches her.
    This is the paired test - both sides of the invite flow.
    """
    log(3, "=== AGENT 3: Zainab+Tom paired - invite and response flow ===")
    clear_mail()

    # ── Zainab side ──────────────────────────────────────────────────────────
    log(3, "Part A: Zainab sends invite")
    browser_z, ctx_z = make_ctx(playwright, "zainab")
    page_z = ctx_z.new_page()

    ground_url = None
    try:
        nav(page_z, f"{BASE_URL}/home")
        text = get_text(page_z)
        log(3, f"Zainab dashboard: {text[:300]}")
        ss(page_z, 3, 1, "zainab dashboard")

        # Create a new ground
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')", "button:has-text('+')"]:
            new_btn = page_z.query_selector(sel)
            if new_btn: break

        if not new_btn:
            log(3, "FAIL: Zainab cannot find New ground button")
            return

        new_btn.click()
        time.sleep(2)
        ss(page_z, 3, 2, "new ground")

        # Walk through setup - fill ground details + invite Tom
        for step_i in range(15):
            text = get_text(page_z)
            ss(page_z, 3, f"gs{step_i}", f"setup step {step_i}")

            # Fill text inputs
            for inp in page_z.query_selector_all("input[type='text'], input:not([type='email']):not([type='password'])")[:2]:
                try:
                    if not inp.input_value() and inp.is_enabled():
                        inp.click()
                        inp.type("Sarah Chen - Engineering onboarding")
                        break
                except: pass

            # Fill textarea
            ta = page_z.query_selector("textarea")
            if ta:
                try:
                    if not ta.input_value():
                        ta.fill("Sarah Chen joins as Senior Engineer on 14 July. This ground captures expectations from both sides before the work begins. We want to align on her role scope, 90-day delivery goals, and what support looks like from the team in the first month. Both parties should leave session 1 knowing exactly what success looks like at 30 and 90 days.")
                except: pass

            # Fill invite email
            email_inp = page_z.query_selector("input[type='email']")
            if email_inp:
                try:
                    if not email_inp.input_value():
                        email_inp.click()
                        email_inp.type("tom.baker@example-test.invalid")
                        log(3, "Filled Tom's email as participant")
                except: pass

            # Click situation/type buttons
            for btn_text in ["Already underway", "Starting something", "New hire", "Alignment"]:
                btn = page_z.query_selector(f"button:has-text('{btn_text}')")
                if btn:
                    try: btn.click(); time.sleep(0.3); break
                    except: pass

            # Next button
            next_btn = None
            for sel in ["button:has-text('Next')", "button:has-text('Continue')", "button:has-text('Invite')", "button:has-text('Add participant')", "button:has-text('Create ground')", "button:has-text('Save')", "button[type='submit']:not(:has-text('Sign'))"]:
                b = page_z.query_selector(sel)
                if b:
                    try:
                        if b.is_enabled():
                            next_btn = b
                            break
                    except: pass

            if not next_btn:
                log(3, f"No next button at step {step_i}. Stopping.")
                break

            btn_text = next_btn.inner_text().strip()[:30]
            log(3, f"Setup step {step_i}: clicking '{btn_text}'")
            next_btn.click()
            time.sleep(2)

            if "/grounds/" in page_z.url and "entry" not in page_z.url and "new" not in page_z.url:
                log(3, f"Arrived at ground: {page_z.url}")
                ground_url = page_z.url
                break

        ss(page_z, 3, "ground", "ground page")
        text = get_text(page_z)
        log(3, f"Ground page text: {text[:500]}")

        # Check mailcatcher for Tom's invite
        time.sleep(2)
        tom_invite = poll_link("tom.baker@example-test.invalid", match="invite", max_wait=20)
        if not tom_invite:
            # Check if any mail for Tom
            tom_mail = poll_mail("tom.baker@example-test.invalid", max_wait=10)
            if tom_mail:
                log(3, f"Mail to Tom: {tom_mail.get('subject')} - but no invite link found")
                tom_invite = poll_link("tom.baker@example-test.invalid", max_wait=5)
            if not tom_invite:
                log(3, "FINDING: No invite mail for Tom captured in mailcatcher")
        else:
            log(3, f"Tom invite link: {tom_invite[:80]}")

        # Zainab does her check-in
        log(3, "Zainab doing check-in")
        found = find_ground(page_z, 3, ["Sarah Chen", "Engineering onboarding"])
        if not found and ground_url:
            nav(page_z, ground_url)

        done_z = do_checkin(page_z, 3, [
            "I want to make sure Sarah knows the main priority: delivering the first feature by day 45. That's the concrete milestone I need her to hit.",
            "The support I can give her: weekly 1:1s, intro to the product lead in week 2, and full access to the tech docs. I want to make sure those commitments are on record.",
        ])
        log(3, f"Zainab check-in: {done_z}")
        save_state(ctx_z, "zainab")

    finally:
        browser_z.close()

    # ── Tom side ─────────────────────────────────────────────────────────────
    if tom_invite:
        log(3, "Part B: Tom clicks invite and contributes")
        browser_t, ctx_t = make_ctx(playwright, "tom")
        page_t = ctx_t.new_page()
        try:
            nav(page_t, tom_invite)
            ss(page_t, 3, "tom1", "Tom invite page")
            text = get_text(page_t)
            log(3, f"Tom sees: {text[:300]}")
            log(3, "Expectation: Tom understands why he's here and what to do")
            log(3, f"Reality: {'clear' if 'groundwork' in text.lower() or 'check' in text.lower() else 'unclear'}")

            # Tom may need to register
            if "/verify" in page_t.url or "/setup" in page_t.url or "set" in text.lower():
                # Check if it's a set-password flow for Tom
                pw_inp = page_t.query_selector("input[type='password']")
                if pw_inp:
                    pw_inp.click()
                    pw_inp.type("TestPass123!")
                    submit = page_t.query_selector("button[type='submit'], button:has-text('Continue')")
                    if submit:
                        submit.click()
                        time.sleep(3)
                    ss(page_t, 3, "tom2", "after set password")
                elif "/setup" in page_t.url:
                    complete_setup(page_t, 3, "Tom Baker", "")
                    ss(page_t, 3, "tom2", "after setup")
            elif "magic" in page_t.url.lower() or "token" in page_t.url.lower():
                # Handle magic link landing
                time.sleep(2)
                text = get_text(page_t)
                log(3, f"After magic link: {text[:200]}")

            # Navigate to home and find ground
            nav(page_t, f"{BASE_URL}/home")
            text = get_text(page_t)
            log(3, f"Tom home: {text[:300]}")
            ss(page_t, 3, "tom3", "tom home")

            found_t = find_ground(page_t, 3, ["Sarah Chen", "Engineering onboarding"])
            if not found_t:
                log(3, "FINDING: Tom cannot see the ground on his dashboard after accepting invite")

            ss(page_t, 3, "tom4", "tom ground or dashboard")
            text = get_text(page_t)
            log(3, f"Tom's ground view: {text[:400]}")

            done_t = do_checkin(page_t, 3, [
                "I'm joining as Senior Engineer. My primary concern is scope clarity - I want to know exactly what this role owns versus what sits with the existing team.",
                "Success at 90 days for me means: shipped the first feature end-to-end, established a rhythm with the product lead, and have a clear picture of the codebase architecture.",
            ])
            log(3, f"Tom check-in: {done_t}")
            save_state(ctx_t, "tom")

        finally:
            browser_t.close()

    # ── Verify Zainab sees Tom's response ────────────────────────────────────
    log(3, "Part C: Verify Zainab can see Tom contributed")
    browser_z2, ctx_z2 = make_ctx(playwright, "zainab")
    page_z2 = ctx_z2.new_page()
    try:
        nav(page_z2, f"{BASE_URL}/home")
        found = find_ground(page_z2, 3, ["Sarah Chen", "Engineering onboarding"])
        if found:
            text = get_text(page_z2)
            log(3, f"Zainab ground page shows Tom's status: {'Completed' in text or 'completed' in text.lower()}")
            log(3, f"Ground text: {text[:400]}")
            ss(page_z2, 3, "verify", "zainab sees tom status")
        else:
            log(3, "FINDING: Zainab cannot find the ground to verify Tom's contribution")
        save_state(ctx_z2, "zainab")
    finally:
        browser_z2.close()


def a4_priya_new_admin_many(playwright):
    """A4: Priya, new_admin_many_participants - adds several participants at once."""
    log(4, "=== AGENT 4: Priya, new_admin, many participants - group alignment ===")
    clear_mail()
    browser, ctx = make_ctx(playwright)
    page = ctx.new_page()

    try:
        # Register Priya
        link = register_magic_link(page, 4, "priya.raman@example-test.invalid")
        if not link: return

        nav(page, link)
        complete_setup(page, 4, "Priya Raman", "Priya Org")
        ss(page, 4, 1, "dashboard")
        text = get_text(page)
        log(4, f"Dashboard: {text[:300]}")

        # Create ground with multiple participants
        nav(page, f"{BASE_URL}/home")
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')"]:
            new_btn = page.query_selector(sel)
            if new_btn: break

        if not new_btn:
            log(4, "FINDING: No new ground button")
            return

        new_btn.click()
        time.sleep(2)

        participants_added = []
        for step_i in range(15):
            text = get_text(page)
            ss(page, 4, f"gs{step_i}", f"setup step {step_i}")

            for inp in page.query_selector_all("input[type='text'], input:not([type='email']):not([type='password'])")[:2]:
                try:
                    if not inp.input_value() and inp.is_enabled():
                        inp.click()
                        inp.type("Product direction alignment")
                        break
                except: pass

            ta = page.query_selector("textarea")
            if ta:
                try:
                    if not ta.input_value():
                        ta.fill("Three team leads need to align on product direction: build vs buy, prioritisation framework, and Q3 roadmap bets.")
                except: pass

            email_inp = page.query_selector("input[type='email']")
            if email_inp and not participants_added:
                try:
                    if not email_inp.input_value():
                        email_inp.click()
                        email_inp.type("marcus.bell@example-test.invalid")
                        participants_added.append("marcus.bell@example-test.invalid")
                        log(4, "Added Marcus as participant")
                except: pass

            for btn_text in ["Already underway", "Starting something", "Alignment"]:
                btn = page.query_selector(f"button:has-text('{btn_text}')")
                if btn:
                    try: btn.click(); time.sleep(0.3); break
                    except: pass

            next_btn = None
            for sel in ["button:has-text('Next')", "button:has-text('Continue')", "button:has-text('Invite')", "button:has-text('Add')", "button:has-text('Create ground')", "button:has-text('Save')", "button[type='submit']:not(:has-text('Sign'))"]:
                b = page.query_selector(sel)
                if b:
                    try:
                        if b.is_enabled():
                            next_btn = b
                            break
                    except: pass

            if not next_btn:
                log(4, f"No next button at step {step_i}")
                break

            log(4, f"Step {step_i}: '{next_btn.inner_text().strip()[:30]}'")
            next_btn.click()
            time.sleep(2)

            if "/grounds/" in page.url and "entry" not in page.url:
                log(4, f"Ground created: {page.url}")
                break

        ss(page, 4, "ground", "ground page")
        text = get_text(page)
        log(4, f"Ground: {text[:400]}")
        log(4, f"Participants added: {participants_added}")

        # Check if adding more participants is possible from the ground page
        add_more = page.query_selector("button:has-text('Add participant'), button:has-text('Invite')")
        if add_more:
            log(4, "Can add more participants from ground page")
        else:
            log(4, "FINDING: Cannot find a way to add more participants after ground creation")

        # Priya does her own check-in
        done = do_checkin(page, 4, [
            "We are misaligned on whether to build a custom data pipeline or buy a SaaS tool. I lean toward buying to ship faster but the engineering lead wants full control.",
            "My goal for this ground: agree on a decision framework so we stop going in circles on every vendor evaluation.",
        ])
        log(4, f"Priya check-in: {done}")
        save_state(ctx, "priya")

    finally:
        browser.close()


def a5_marcus_new_participant(playwright):
    """A5: Marcus, new_participant - one of several people invited, wants his input to matter."""
    log(5, "=== AGENT 5: Marcus, new_participant - I'm one of several invited ===")

    browser, ctx = make_ctx(playwright)
    page = ctx.new_page()

    try:
        invite_link = poll_link("marcus.bell@example-test.invalid", match="invite", max_wait=20)
        if not invite_link:
            log(5, "FINDING: No invite for Marcus found - A4 may not have sent one")
            log(5, "Trying to register Marcus directly to test standalone participant flow")
            link = register_magic_link(page, 5, "marcus.bell@example-test.invalid")
            if not link: return
            nav(page, link)
            complete_setup(page, 5, "Marcus Bell", "")
        else:
            log(5, f"Marcus invite found: {invite_link[:60]}")
            nav(page, invite_link)
            text = get_text(page)
            log(5, f"Marcus sees: {text[:300]}")
            log(5, "Expectation: I understand what I'm here to contribute and that it won't get lost in a group")
            log(5, f"Reality: {text[:200]}")

            if "/setup" in page.url or "set" in text.lower() and "password" in text.lower():
                complete_setup(page, 5, "Marcus Bell", "")
            elif "password" in text.lower():
                pw_inp = page.query_selector("input[type='password']")
                if pw_inp:
                    pw_inp.click()
                    pw_inp.type("TestPass123!")
                    submit = page.query_selector("button[type='submit']")
                    if submit: submit.click(); time.sleep(3)

        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 5, 1, "marcus home")
        log(5, f"Marcus home: {text[:300]}")

        found = find_ground(page, 5, ["Product direction", "Priya", "alignment"])
        if not found:
            log(5, "FINDING: Marcus cannot see the ground he was invited to")

        ss(page, 5, 2, "ground or dashboard")
        text = get_text(page)
        log(5, f"Ground view: {text[:300]}")

        done = do_checkin(page, 5, [
            "I'm Marcus. I was invited here but had little context on what this is. From what I can see, we need to decide on a data pipeline approach. My view: build it, because none of the SaaS tools handle our edge cases.",
            "If this is going to be a real decision, I need to know my input will actually be weighed against the other two. What happens after I submit this?",
        ])
        log(5, f"Marcus check-in: {done}")

        ss(page, 5, "final", "final")
        text = get_text(page)
        log(5, f"Final: {text[:300]}")
        log(5, "How I feel: I want to see if my view shows up in the report")

        save_state(ctx, "marcus")

    finally:
        browser.close()


def a6_david_just_curious(playwright):
    """A6: David, new_admin - just curious, no specific problem, wants to understand the product."""
    log(6, "=== AGENT 6: David, just curious - does the product explain itself? ===")
    clear_mail()
    browser, ctx = make_ctx(playwright)
    page = ctx.new_page()

    try:
        nav(page, f"{BASE_URL}/auth")
        text = get_text(page)
        ss(page, 6, 1, "auth page")
        log(6, f"What David sees first: {text[:300]}")
        log(6, "Expectation: I should understand what this is within 60 seconds")
        log(6, f"How I feel: {'The page explains itself' if 'alignment' in text.lower() or 'groundwork' in text.lower() else 'I do not know what this is for'}")

        link = register_magic_link(page, 6, "david.cohen@example-test.invalid")
        if not link: return

        nav(page, link)
        complete_setup(page, 6, "David Cohen", "David Org")
        ss(page, 6, 2, "dashboard")
        text = get_text(page)
        log(6, f"Post-registration: {text[:400]}")
        log(6, "Expectation: The product now explains itself clearly, tells me what to do next")
        log(6, f"Reality: {text[:200]}")

        if "Open a new ground" in text or "New ground" in text:
            log(6, "Clear CTA to start. Good.")
        else:
            log(6, "FINDING: No obvious 'what to do next' for a new admin who is just exploring")

        # David explores without committing
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')"]:
            new_btn = page.query_selector(sel)
            if new_btn: break

        if new_btn:
            new_btn.click()
            time.sleep(2)
            text = get_text(page)
            ss(page, 6, 3, "new ground entry")
            log(6, f"New ground flow: {text[:300]}")
            log(6, f"How I feel: {'Makes sense' if text else 'Confused'}")
        else:
            log(6, "FINDING: No way to start exploring the product from dashboard")

        save_state(ctx, "david")

    finally:
        browser.close()


def a7_sandra_org_admin(playwright):
    """A7: Sandra, org_admin - wants org-level capability."""
    log(7, "=== AGENT 7: Sandra, org_admin - I run an org, what can I do here? ===")
    clear_mail()
    browser, ctx = make_ctx(playwright)
    page = ctx.new_page()

    try:
        link = register_magic_link(page, 7, "sandra.mensah@example-test.invalid")
        if not link: return

        nav(page, link)
        complete_setup(page, 7, "Sandra Mensah", "Sandra Org")
        ss(page, 7, 1, "dashboard")
        text = get_text(page)
        log(7, f"Sandra dashboard: {text[:400]}")

        # Look for admin / org features
        log(7, "Looking for org-level admin features")
        admin_link = page.query_selector("a:has-text('Admin'), a[href*='admin']")
        if admin_link:
            log(7, "Found Admin link")
            admin_link.click()
            time.sleep(2)
            text = get_text(page)
            ss(page, 7, 2, "admin page")
            log(7, f"Admin page: {text[:400]}")
        else:
            log(7, "FINDING: No Admin link visible to Sandra")
            log(7, f"Nav items visible: {get_text(page)[:200]}")

        save_state(ctx, "sandra")

    finally:
        browser.close()


def a8_sandra_adds_kwame(playwright):
    """A8: Sandra adds Kwame as a staff lead."""
    log(8, "=== AGENT 8: Sandra adds Kwame as a lead ===")
    clear_mail()
    browser, ctx = make_ctx(playwright, "sandra")
    page = ctx.new_page()

    try:
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        log(8, f"Sandra home: {text[:200]}")

        # Find admin
        nav(page, f"{BASE_URL}/admin/dashboard")
        text = get_text(page)
        ss(page, 8, 1, "admin dashboard")
        log(8, f"Admin dashboard: {text[:400]}")

        # Add team member
        add_btn = page.query_selector("button:has-text('Add'), button:has-text('Invite member'), button:has-text('Invite team')")
        if not add_btn:
            log(8, "FINDING: No 'Add member' button on admin page")
            log(8, f"Buttons: {[b.inner_text().strip()[:30] for b in page.query_selector_all('button')[:10]]}")
        else:
            add_btn.click()
            time.sleep(1)
            email_inp = page.query_selector("input[type='email']")
            if email_inp:
                email_inp.click()
                email_inp.type("kwame.asante@example-test.invalid")
                submit = page.query_selector("button[type='submit'], button:has-text('Send'), button:has-text('Invite')")
                if submit: submit.click(); time.sleep(3)
                log(8, "Kwame invite sent")
            ss(page, 8, 2, "after invite kwame")
            text = get_text(page)
            log(8, f"After invite: {text[:300]}")

        save_state(ctx, "sandra")
    finally:
        browser.close()


def a9_kwame_creates_ground(playwright):
    """A9: Kwame, lead - creates own ground after Sandra added him."""
    log(9, "=== AGENT 9: Kwame, lead - Sandra added me, I create my own ground ===")

    browser, ctx = make_ctx(playwright)
    page = ctx.new_page()

    try:
        # Get Kwame's invite
        kwame_invite = poll_link("kwame.asante@example-test.invalid", max_wait=20)
        if not kwame_invite:
            log(9, "FINDING: No invite for Kwame - A8 may not have sent one")
            # Register Kwame directly
            kwame_invite = register_magic_link(page, 9, "kwame.asante@example-test.invalid")
            if not kwame_invite: return
            nav(page, kwame_invite)
            complete_setup(page, 9, "Kwame Asante", "Sandra Org")
        else:
            log(9, f"Kwame invite: {kwame_invite[:60]}")
            nav(page, kwame_invite)
            text = get_text(page)
            log(9, f"Kwame sees: {text[:200]}")

            if "/setup" in page.url or "name" in text.lower():
                complete_setup(page, 9, "Kwame Asante", "Sandra Org")
            elif "password" in text.lower():
                pw_inp = page.query_selector("input[type='password']")
                if pw_inp:
                    pw_inp.click()
                    pw_inp.type("TestPass123!")
                    submit = page.query_selector("button[type='submit']")
                    if submit: submit.click(); time.sleep(3)

        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 9, 1, "kwame dashboard")
        log(9, f"Kwame dashboard: {text[:400]}")

        # Check if Kwame can create a ground
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')"]:
            new_btn = page.query_selector(sel)
            if new_btn: break

        if not new_btn:
            log(9, "FINDING: Kwame cannot see New ground button - may not have permission")
        else:
            log(9, "Kwame can create a ground")
            new_btn.click()
            time.sleep(2)
            ss(page, 9, 2, "new ground")
            text = get_text(page)
            log(9, f"Ground setup: {text[:300]}")

            for step_i in range(15):
                text = get_text(page)
                for inp in page.query_selector_all("input[type='text']")[:2]:
                    try:
                        if not inp.input_value() and inp.is_enabled():
                            inp.click(); inp.type("Sales team Q2 performance review"); break
                    except: pass

                ta = page.query_selector("textarea")
                if ta:
                    try:
                        if not ta.input_value():
                            ta.fill("Reviewing Q2 sales performance. Kwame leads the team and wants to align on what happened and what changes in Q3.")
                    except: pass

                email_inp = page.query_selector("input[type='email']")
                if email_inp:
                    try:
                        if not email_inp.input_value():
                            email_inp.click()
                            email_inp.type("part-kwame@example-test.invalid")
                    except: pass

                for btn_text in ["Already underway", "Pulse check", "Performance"]:
                    btn = page.query_selector(f"button:has-text('{btn_text}')")
                    if btn:
                        try: btn.click(); time.sleep(0.3); break
                        except: pass

                next_btn = None
                for sel in ["button:has-text('Next')", "button:has-text('Continue')", "button:has-text('Invite')", "button:has-text('Create ground')", "button:has-text('Save')", "button[type='submit']:not(:has-text('Sign'))"]:
                    b = page.query_selector(sel)
                    if b:
                        try:
                            if b.is_enabled(): next_btn = b; break
                        except: pass

                if not next_btn: break
                log(9, f"Step {step_i}: '{next_btn.inner_text().strip()[:30]}'")
                next_btn.click()
                time.sleep(2)

                if "/grounds/" in page.url and "entry" not in page.url:
                    log(9, f"Ground created: {page.url}")
                    break

            ss(page, 9, "ground", "kwame ground")
            text = get_text(page)
            log(9, f"Ground: {text[:400]}")

            done = do_checkin(page, 9, [
                "We missed Q2 target by 15%. Three reps underperformed. I want to understand whether this is a skill gap, a process problem, or a territory issue.",
                "My specific concern: one of the reps has been with us two years and is still not hitting 70%. I've been avoiding the conversation. This ground should help me have it.",
            ])
            log(9, f"Kwame check-in: {done}")

        save_state(ctx, "kwame")
    finally:
        browser.close()


def a10_sandra_creates_grounds(playwright):
    """A10: Sandra, org_admin_full - creates grounds, assigns leads, adds participants."""
    log(10, "=== AGENT 10: Sandra, full org admin - creates grounds and structure ===")
    clear_mail()
    browser, ctx = make_ctx(playwright, "sandra")
    page = ctx.new_page()

    try:
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 10, 1, "sandra home")
        log(10, f"Sandra home: {text[:300]}")

        # Sandra creates her own ground
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')"]:
            new_btn = page.query_selector(sel)
            if new_btn: break

        if not new_btn:
            log(10, "FINDING: Sandra cannot see New ground button")
            return

        new_btn.click()
        time.sleep(2)

        for step_i in range(15):
            text = get_text(page)
            for inp in page.query_selector_all("input[type='text']")[:2]:
                try:
                    if not inp.input_value() and inp.is_enabled():
                        inp.click(); inp.type("Org-wide Q3 priorities"); break
                except: pass

            ta = page.query_selector("textarea")
            if ta:
                try:
                    if not ta.input_value():
                        ta.fill("Sandra wants to align leadership on what the org is actually betting on in Q3.")
                except: pass

            email_inp = page.query_selector("input[type='email']")
            if email_inp:
                try:
                    if not email_inp.input_value():
                        email_inp.click()
                        email_inp.type("kwame.asante@example-test.invalid")
                except: pass

            for btn_text in ["Alignment", "Already underway", "Starting something"]:
                btn = page.query_selector(f"button:has-text('{btn_text}')")
                if btn:
                    try: btn.click(); time.sleep(0.3); break
                    except: pass

            next_btn = None
            for sel in ["button:has-text('Next')", "button:has-text('Continue')", "button:has-text('Invite')", "button:has-text('Create ground')", "button:has-text('Save')", "button[type='submit']:not(:has-text('Sign'))"]:
                b = page.query_selector(sel)
                if b:
                    try:
                        if b.is_enabled(): next_btn = b; break
                    except: pass

            if not next_btn: break
            log(10, f"Step {step_i}: '{next_btn.inner_text().strip()[:30]}'")
            next_btn.click()
            time.sleep(2)

            if "/grounds/" in page.url and "entry" not in page.url:
                log(10, f"Ground created: {page.url}")
                break

        ss(page, 10, "ground", "sandra ground")
        text = get_text(page)
        log(10, f"Sandra ground: {text[:400]}")

        done = do_checkin(page, 10, [
            "I'm the org admin. My question for this ground: are Kwame and I actually aligned on what Q3 is about, or have we been talking past each other in leadership meetings?",
            "My specific position: Q3 is about retention, not acquisition. I want to know if that matches what Kwame thinks we're doing.",
        ])
        log(10, f"Sandra check-in: {done}")
        save_state(ctx, "sandra")

    finally:
        browser.close()


def a11_zainab_returning_s2(playwright):
    """A11: Zainab returning for session 2 - is the product faster and does it remember her?"""
    log(11, "=== AGENT 11: Zainab, returning for session 2 - does it remember me? ===")
    browser, ctx = make_ctx(playwright, "zainab")
    page = ctx.new_page()

    try:
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 11, 1, "zainab return")
        log(11, f"Zainab back: {text[:400]}")
        log(11, "Expectation: The product remembers me and my first ground is still here")
        log(11, f"Reality: {'Good - my grounds are here' if 'Sarah Chen' in text or 'Engineering' in text else 'PROBLEM - I see no grounds'}")

        if "Sarah Chen" in text or "Engineering" in text:
            log(11, "Prior ground visible. Session 2 setup is faster.")
        else:
            log(11, "FINDING: Returning user sees no prior grounds - history may be lost or not linked")

        # Start a second ground
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')"]:
            new_btn = page.query_selector(sel)
            if new_btn: break

        if new_btn:
            new_btn.click()
            time.sleep(2)
            text = get_text(page)
            log(11, f"New ground flow: {text[:200]}")
            log(11, "Expectation: Setup is simpler for returning admin")

            for step_i in range(15):
                text = get_text(page)
                for inp in page.query_selector_all("input[type='text']")[:2]:
                    try:
                        if not inp.input_value() and inp.is_enabled():
                            inp.click(); inp.type("Sarah Chen - 30 day check"); break
                    except: pass

                ta = page.query_selector("textarea")
                if ta:
                    try:
                        if not ta.input_value():
                            ta.fill("One month in. How are the 30-day goals tracking? What's working and what isn't?")
                    except: pass

                email_inp = page.query_selector("input[type='email']")
                if email_inp:
                    try:
                        if not email_inp.input_value():
                            email_inp.click()
                            email_inp.type("tom.baker@example-test.invalid")
                    except: pass

                for btn_text in ["Already underway", "New hire", "Alignment"]:
                    btn = page.query_selector(f"button:has-text('{btn_text}')")
                    if btn:
                        try: btn.click(); time.sleep(0.3); break
                        except: pass

                next_btn = None
                for sel in ["button:has-text('Next')", "button:has-text('Continue')", "button:has-text('Invite')", "button:has-text('Create ground')", "button:has-text('Save')", "button[type='submit']:not(:has-text('Sign'))"]:
                    b = page.query_selector(sel)
                    if b:
                        try:
                            if b.is_enabled(): next_btn = b; break
                        except: pass

                if not next_btn: break
                log(11, f"Step {step_i}: '{next_btn.inner_text().strip()[:30]}'")
                next_btn.click()
                time.sleep(2)

                if "/grounds/" in page.url and "entry" not in page.url:
                    log(11, f"Ground created: {page.url}")
                    break

        ss(page, 11, "final", "final")
        text = get_text(page)
        log(11, f"Final: {text[:400]}")
        save_state(ctx, "zainab")

    finally:
        browser.close()


def a45_typography(playwright):
    """A45: Typography sweep across key pages."""
    log(45, "=== AGENT 45: Typography sweep ===")
    browser, ctx = make_ctx(playwright, "zainab")
    page = ctx.new_page()

    try:
        pages_to_check = ["/home", "/grounds", "/auth"]
        for p_url in pages_to_check:
            result = subprocess.run(
                ["python3",
                 "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/typography.py",
                 "--url", f"{BASE_URL}{p_url}"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                log(45, f"TYPOGRAPHY VIOLATION on {p_url}: {result.stdout[:300]}")
            else:
                log(45, f"Typography clean: {p_url}")

        # Check mail typography
        result = subprocess.run(
            ["python3",
             "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/typography.py",
             "--mail-api", MAIL_URL],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            log(45, f"TYPOGRAPHY in email: {result.stdout[:300]}")
        else:
            log(45, f"Email typography: {result.stdout[:100]}")

    finally:
        browser.close()


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("SESSION 1: Agents 1-11, 45")
    print("=" * 60)

    with sync_playwright() as p:
        a1_zainab_new_admin(p)
        clear_mail()
        a2_tom_new_participant(p)
        clear_mail()
        a3_zainab_and_tom_paired(p)
        clear_mail()
        a4_priya_new_admin_many(p)
        clear_mail()
        a5_marcus_new_participant(p)
        clear_mail()
        a6_david_just_curious(p)
        clear_mail()
        a7_sandra_org_admin(p)
        clear_mail()
        a8_sandra_adds_kwame(p)
        clear_mail()
        a9_kwame_creates_ground(p)
        clear_mail()
        a10_sandra_creates_grounds(p)
        clear_mail()
        a11_zainab_returning_s2(p)
        clear_mail()
        a45_typography(p)

    print("\n" + "=" * 60)
    print("SESSION 1 COMPLETE")
    print("=" * 60)
    print("\nFINDINGS SUMMARY:")
    for f in findings:
        if "FINDING" in f or "FAIL" in f or "TIMEOUT" in f or "WAIT" in f or "PROBLEM" in f:
            print(f)

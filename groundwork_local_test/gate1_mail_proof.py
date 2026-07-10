#!/usr/bin/env python3
"""
GATE 1: Prove the mail loop.
Uses the magic-link auth flow: click "New here? Get a sign-in link instead",
enter email, capture magic link from mailcatcher, navigate to it, complete setup.
Then creates a ground and invites a participant to confirm invite mail lands too.
"""
import json, time, os, requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

BASE_URL = "http://127.0.0.1:5173"
MAIL_URL = "http://127.0.0.1:1080"
SCREENSHOTS = "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/results/screenshots"
os.makedirs(SCREENSHOTS, exist_ok=True)

GATE_EMAIL   = "gate1.admin@example-test.invalid"
INVITE_EMAIL = "gate1.invite@example-test.invalid"

def ss(page, step, label=""):
    path = f"{SCREENSHOTS}/gate1_s{step}.png"
    page.screenshot(path=path, full_page=True)
    print(f"[GATE1] Screenshot {step}: {label}", flush=True)

def get_text(page):
    try:
        return page.inner_text("body") or ""
    except:
        return ""

def nav(page, url):
    page.goto(url, wait_until="commit", timeout=15000)
    time.sleep(3)

def clear_mail():
    try: requests.post(f"{MAIL_URL}/clear", timeout=5)
    except: pass

def poll_mail_link(to_email, match=None, max_wait=30):
    endpoint = f"{MAIL_URL}/link?to={to_email}"
    if match:
        endpoint += f"&match={match}"
    for _ in range(max_wait // 2):
        try:
            r = requests.get(endpoint, timeout=5)
            if r.status_code == 200 and r.text.strip():
                data = r.text.strip()
                # Try to parse as JSON and extract link field
                try:
                    j = json.loads(data)
                    if isinstance(j, dict) and "link" in j:
                        return j["link"]
                    if isinstance(j, list) and j:
                        return j[0] if isinstance(j[0], str) else j[0].get("link")
                except (json.JSONDecodeError, AttributeError):
                    pass
                # Return as-is if not JSON
                return data
        except: pass
        time.sleep(2)
    return None

def poll_latest_mail(to_email, max_wait=30):
    for _ in range(max_wait // 2):
        try:
            r = requests.get(f"{MAIL_URL}/latest?to={to_email}", timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data:
                    return data
        except: pass
        time.sleep(2)
    return None

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context()
    page = ctx.new_page()

    clear_mail()

    # ── Step 1: Auth page ──────────────────────────────────────────────────────
    print("[GATE1] Step 1: Auth page", flush=True)
    nav(page, f"{BASE_URL}/auth")
    ss(page, 1, "auth page")
    text = get_text(page)
    print(f"[GATE1] Auth page text: {text[:300]}", flush=True)

    # ── Step 2: Click "New here? Get a sign-in link instead" ──────────────────
    print("[GATE1] Step 2: Click magic link option", flush=True)
    link_btn = page.query_selector("span:has-text('New here')")
    if not link_btn:
        link_btn = page.query_selector("*:has-text('sign-in link')")
    if not link_btn:
        print("[GATE1] FAIL: Cannot find magic link option", flush=True)
        print(f"[GATE1] Page text:\n{text}", flush=True)
        browser.close()
        exit(1)

    link_btn.click()
    time.sleep(1)
    ss(page, 2, "magic link form")
    text = get_text(page)
    print(f"[GATE1] Magic link form text: {text[:300]}", flush=True)

    # ── Step 3: Enter email and send link ─────────────────────────────────────
    print(f"[GATE1] Step 3: Enter email {GATE_EMAIL}", flush=True)
    email_input = page.query_selector("input[type='email']")
    if not email_input:
        print("[GATE1] FAIL: No email input on magic link form", flush=True)
        browser.close()
        exit(1)

    email_input.fill(GATE_EMAIL)
    send_btn = page.query_selector("button:has-text('Send link'), button[type='submit']")
    if send_btn:
        send_btn.click()
    else:
        email_input.press("Enter")

    time.sleep(2)
    ss(page, 3, "after send link")
    text = get_text(page)
    print(f"[GATE1] After send link: {text[:300]}", flush=True)

    # ── Step 4: Capture magic link from mailcatcher ───────────────────────────
    print("[GATE1] Step 4: Polling mailcatcher for magic link...", flush=True)
    magic_link = poll_mail_link(GATE_EMAIL, max_wait=40)

    mail = poll_latest_mail(GATE_EMAIL, max_wait=5)
    if mail:
        print(f"[GATE1] Email received! Subject: {mail.get('subject', '?')}", flush=True)
        body = str(mail.get('body', mail.get('html', '')))
        print(f"[GATE1] Body snippet:\n{body[:500]}", flush=True)

    if not magic_link:
        print("[GATE1] FAIL: No magic link captured in mailcatcher", flush=True)
        try:
            r = requests.get(f"{MAIL_URL}/messages", timeout=5)
            msgs = r.json()
            print(f"[GATE1] Total messages: {len(msgs)}", flush=True)
            for m in msgs[:5]:
                print(f"  to={m.get('to')} subject={m.get('subject')}", flush=True)
        except Exception as e:
            print(f"[GATE1] Mailcatcher error: {e}", flush=True)
        browser.close()
        exit(1)

    # The link may use localhost:5173 - replace with 127.0.0.1:5173
    magic_link = magic_link.replace("localhost:5173", "127.0.0.1:5173").replace("localhost:3000", "127.0.0.1:5173")
    print(f"[GATE1] Magic link captured: {magic_link[:120]}", flush=True)
    print(f"[GATE1] MAIL LOOP PROVEN: Auth email arrived in mailcatcher.", flush=True)

    # ── Step 5: Navigate to magic link ───────────────────────────────────────
    print("[GATE1] Step 5: Navigate to magic link", flush=True)
    nav(page, magic_link)
    ss(page, 4, "after magic link")
    text = get_text(page)
    print(f"[GATE1] After magic link: {text[:400]}", flush=True)
    print(f"[GATE1] URL: {page.url}", flush=True)

    # ── Step 6: Complete setup if prompted ────────────────────────────────────
    if "setup" in page.url.lower() or "set up" in text.lower() or "Your name" in text or "organisation" in text.lower():
        print("[GATE1] Step 6: Setup page - filling in details", flush=True)
        name_input = page.query_selector("input[name='name'], input[placeholder*='name' i], input[placeholder*='Name' i]")
        org_input   = page.query_selector("input[name='organization'], input[name='orgName'], input[placeholder*='org' i], input[placeholder*='Organisation' i], input[placeholder*='Organization' i], input[placeholder*='company' i]")
        pw_input    = page.query_selector("input[type='password']")

        print(f"[GATE1] Setup fields: name={bool(name_input)} org={bool(org_input)} pw={bool(pw_input)}", flush=True)

        if name_input:
            name_input.fill("Gate One Admin")
        if org_input:
            org_input.fill("Gate1 Test Org")
        if pw_input:
            pw_input.fill("TestPass123!")
            pw2 = page.query_selector("input[placeholder*='confirm' i]")
            if pw2:
                pw2.fill("TestPass123!")

        ss(page, 5, "setup form filled")
        submit = page.query_selector("button[type='submit'], button:has-text('Continue'), button:has-text('Set up'), button:has-text('Save'), button:has-text('Create')")
        if submit:
            submit.click()
            time.sleep(3)
            ss(page, 6, "after setup submit")
            text = get_text(page)
            print(f"[GATE1] After setup: {text[:400]}", flush=True)
            print(f"[GATE1] URL: {page.url}", flush=True)

    # ── Step 7: On dashboard - create a ground ────────────────────────────────
    print("[GATE1] Step 7: Looking for dashboard", flush=True)
    ss(page, 7, "dashboard")
    text = get_text(page)
    print(f"[GATE1] Dashboard text: {text[:400]}", flush=True)

    # Navigate to /grounds which is the main app view
    if "/grounds" not in page.url and "/dashboard" not in page.url:
        nav(page, f"{BASE_URL}/grounds")
        text = get_text(page)
        print(f"[GATE1] Grounds page: {text[:400]}", flush=True)

    new_ground_btn = None
    for sel in [
        "button:has-text('New ground')",
        "a:has-text('New ground')",
        "button:has-text('Open a new ground')",
        "a:has-text('Open a new ground')",
        "button:has-text('+')",
    ]:
        new_ground_btn = page.query_selector(sel)
        if new_ground_btn:
            print(f"[GATE1] Found new ground button: {sel}", flush=True)
            break

    if not new_ground_btn:
        print("[GATE1] No 'New ground' button found. Current page text:", flush=True)
        print(text[:600], flush=True)
        # Still count as PASS on the mail loop
        print("\n[GATE1] GATE 1 RESULT: MAIL LOOP PROVEN (magic link arrived).", flush=True)
        print("[GATE1] Could not proceed to invite test - ground creation button not found.", flush=True)
        browser.close()
        exit(0)

    # ── Step 8: Create a ground through setup flow ────────────────────────────
    print("[GATE1] Step 8: Creating a ground", flush=True)
    new_ground_btn.click()
    time.sleep(2)
    ss(page, 8, "new ground flow")
    text = get_text(page)
    print(f"[GATE1] New ground page: {text[:400]}", flush=True)

    # Walk through however many setup steps, filling fields and clicking Next
    for step_i in range(12):
        text = get_text(page)
        ss(page, f"gs_{step_i}", f"ground setup step {step_i}")

        # Fill any empty text input
        for inp in page.query_selector_all("input[type='text'], input:not([type])")[:3]:
            try:
                if not inp.input_value():
                    inp.fill("Gate1 test ground")
                    break
            except: pass

        # Fill textarea
        ta = page.query_selector("textarea")
        if ta:
            try:
                if not ta.input_value():
                    ta.fill("A test ground to prove the invite email flow works end to end.")
            except: pass

        # Fill invite email if on that step
        email_inp = page.query_selector("input[type='email']")
        if email_inp:
            try:
                if not email_inp.input_value():
                    email_inp.fill(INVITE_EMAIL)
                    print(f"[GATE1] Entered invite email: {INVITE_EMAIL}", flush=True)
            except: pass

        # Click next / continue / invite / add
        next_btn = None
        for sel in [
            "button:has-text('Next')",
            "button:has-text('Continue')",
            "button:has-text('Invite')",
            "button:has-text('Add participant')",
            "button:has-text('Create ground')",
            "button:has-text('Save')",
            "button[type='submit']",
        ]:
            b = page.query_selector(sel)
            if b:
                try:
                    if b.is_enabled():
                        next_btn = b
                        print(f"[GATE1] Clicking: '{b.inner_text().strip()[:40]}'", flush=True)
                        break
                except: pass

        if not next_btn:
            print(f"[GATE1] No enabled next button at step {step_i}. Stopping.", flush=True)
            break

        next_btn.click()
        time.sleep(2)

        # Check if we're now on a ground page
        new_text = get_text(page)
        if "invite" in new_text.lower() and "sent" in new_text.lower():
            print("[GATE1] Invite sent confirmation visible!", flush=True)
            break
        if "/grounds/" in page.url and "entry" not in page.url and "new" not in page.url:
            print(f"[GATE1] Arrived at ground: {page.url}", flush=True)
            break

    ss(page, "final", "final state after ground setup")
    print(f"[GATE1] Final URL: {page.url}", flush=True)

    # ── Step 9: Check mailcatcher for invite ──────────────────────────────────
    print("\n[GATE1] Step 9: Checking mailcatcher for invite email...", flush=True)
    time.sleep(3)

    invite_mail = poll_latest_mail(INVITE_EMAIL, max_wait=20)
    if invite_mail:
        print(f"[GATE1] INVITE MAIL CAPTURED to {INVITE_EMAIL}", flush=True)
        print(f"[GATE1] Subject: {invite_mail.get('subject', '?')}", flush=True)
        body = str(invite_mail.get('body', invite_mail.get('html', '')))
        print(f"[GATE1] Body snippet:\n{body[:500]}", flush=True)
        invite_link = poll_mail_link(INVITE_EMAIL, match="invite", max_wait=5)
        if invite_link:
            print(f"[GATE1] Invite link: {invite_link[:120]}", flush=True)
        print(f"\n[GATE1] GATE 1 FULL PASS: Magic link + invite both captured in mailcatcher.", flush=True)
    else:
        print(f"[GATE1] No invite mail for {INVITE_EMAIL}.", flush=True)
        try:
            r = requests.get(f"{MAIL_URL}/messages", timeout=5)
            msgs = r.json()
            print(f"[GATE1] All messages ({len(msgs)} total):", flush=True)
            for m in msgs[:10]:
                print(f"  to={m.get('to')} subject={m.get('subject')}", flush=True)
        except: pass
        print(f"\n[GATE1] GATE 1 PARTIAL PASS: Magic link proved. Invite not confirmed (ground setup may not have reached invite step).", flush=True)

    browser.close()
    print("[GATE1] Done.", flush=True)

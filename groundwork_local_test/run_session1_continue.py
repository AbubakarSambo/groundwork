#!/usr/bin/env python3
"""
Session 1 continuation: agents 7-11, 45
Also redoes A3 (Tom's side + ground creation) and A4 (Priya's ground creation)
with correct selectors for the CreateGroundPage card-based flow.

Key fixes vs run_session1.py:
- complete_setup: uses .type() with placeholder-based selectors for 3-step org setup
- ground creation: clicks .cg-sit-card divs, handles 6-step create flow
- Admin link: uses scroll_into_view_if_needed
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

def make_ctx(playwright, identity=None):
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    if identity:
        state_path = f"{STATE_DIR}/{identity}/state.json"
        if os.path.exists(state_path):
            ctx = browser.new_context(storage_state=state_path)
            log(0, f"Loaded state for {identity}")
        else:
            ctx = browser.new_context()
            log(0, f"Fresh context for {identity}")
    else:
        ctx = browser.new_context()
    return browser, ctx

def save_state(ctx, identity):
    os.makedirs(f"{STATE_DIR}/{identity}", exist_ok=True)
    ctx.storage_state(path=f"{STATE_DIR}/{identity}/state.json")

def nav(page, url, wait=3):
    page.goto(url, wait_until="commit", timeout=15000)
    time.sleep(wait)

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

def register_and_setup(playwright, identity, name, org_name, email, agent_id):
    """Full registration + org setup flow. Returns (browser, ctx, page) or None."""
    browser, ctx = make_ctx(playwright, identity)
    page = ctx.new_page()

    # If state exists, just navigate home
    state_path = f"{STATE_DIR}/{identity}/state.json"
    if os.path.exists(state_path):
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        if "Sign in" not in text and len(text) > 50:
            log(agent_id, f"Already logged in as {identity}")
            return browser, ctx, page
        # State expired - re-register
        log(agent_id, f"State expired for {identity}, re-registering")

    # Magic link registration
    nav(page, f"{BASE_URL}/auth")
    link_btn = page.query_selector("span:has-text('New here')")
    if not link_btn:
        log(agent_id, "FAIL: No magic link option")
        browser.close()
        return None

    link_btn.click()
    time.sleep(1)
    email_inp = page.query_selector("input[type='email']")
    if not email_inp:
        log(agent_id, "FAIL: No email input")
        browser.close()
        return None

    email_inp.click()
    email_inp.type(email)
    time.sleep(0.3)
    send_btn = page.query_selector("button:has-text('Send link'), button[type='submit']")
    if send_btn: send_btn.click()
    else: email_inp.press("Enter")
    time.sleep(3)

    log(agent_id, "Polling for magic link...")
    magic_link = poll_link(email, max_wait=40)
    if not magic_link:
        log(agent_id, "FAIL: No magic link in mailcatcher")
        browser.close()
        return None

    log(agent_id, f"Magic link: {magic_link[:80]}")
    nav(page, magic_link)
    ss(page, agent_id, "after_magic", "after magic link")

    # Complete org setup (3-step form)
    complete_org_setup(page, agent_id, org_name)

    return browser, ctx, page

def complete_org_setup(page, agent_id, org_name):
    """
    Complete the /setup org setup form.
    Step 1: org name, org code (auto-filled), role → Continue →
    Step 2: Skip inviting for now →
    Step 3: Open your first ground → (we navigate away instead)
    """
    time.sleep(2)
    text = get_text(page)
    if "/setup" not in page.url and "Set up your org" not in text:
        log(agent_id, f"Not on setup page (URL={page.url[:50]}), skipping setup")
        return

    log(agent_id, "On setup page - filling org details")
    ss(page, agent_id, "setup_s1", "setup step 1")

    # Step 1 - must use .type() for React controlled inputs
    # Find by placeholder
    for ph, val in [("e.g. Acme Corp", org_name), ("e.g. acme", ""), ("e.g. Founder / CEO", "Admin")]:
        inp = page.query_selector(f"input[placeholder='{ph}']")
        if inp:
            inp.click()
            if ph == "e.g. acme":
                # Auto-filled from org name, just clear + type code
                inp.click()
                inp.press("Control+a")
                inp.type(org_name.lower().replace(" ", "")[:15])
            else:
                inp.type(val)
            time.sleep(0.2)

    ss(page, agent_id, "setup_s1_filled", "step 1 filled")

    # Click Continue →
    continue_btn = page.query_selector("button:has-text('Continue')")
    if not continue_btn:
        log(agent_id, "No Continue button on step 1")
        return

    continue_btn.click()
    time.sleep(3)
    text = get_text(page)
    log(agent_id, f"After step 1: {text[:100]}")

    # Step 2 - skip invites
    skip_btn = page.query_selector("div:has-text('Skip inviting for now')")
    if not skip_btn:
        # Try button text
        skip_btn = page.query_selector("button:has-text('Skip')")
    if skip_btn:
        log(agent_id, "Skipping invite step")
        skip_btn.click()
        time.sleep(2)
    else:
        # Try "Create org and invite team →" button if step 2
        create_btn = page.query_selector("button:has-text('Create org')")
        if create_btn:
            create_btn.click()
            time.sleep(2)

    ss(page, agent_id, "setup_s3", "setup step 3 or done")
    text = get_text(page)
    log(agent_id, f"Setup done: {text[:200]}")

    # Step 3 - navigate away (or click "Open your first ground")
    open_btn = page.query_selector("button:has-text('Open your first ground'), button:has-text('Open first'), a:has-text('Open')")
    if open_btn:
        open_btn.click()
        time.sleep(2)
    else:
        nav(page, f"{BASE_URL}/home")


def create_ground(page, agent_id, label, brief, participant_email=None):
    """
    Full CreateGroundPage flow (6 steps):
    1. Select situation card + moment card → Continue
    2. Plan/payment → Continue →
    3. (may be skipped in free tier)
    4. Add participant(s) → Continue
    5. Resolution state → Continue
    6. Brief → Open this ground
    Returns the ground URL or None.
    """
    log(agent_id, f"Creating ground: {label}")

    nav(page, f"{BASE_URL}/grounds/new")
    time.sleep(2)
    text = get_text(page)
    log(agent_id, f"Ground creation page: {text[:200]}")
    ss(page, agent_id, "cg_s1", "ground creation step 1")

    # ── Step 1a: Select a SCENARIO card ─────────────────────────────────────
    # SCENARIOS: New hire, New project, New board member, New partner,
    #            Contract renewal, PIP, Goals & planning, Pulse check, New direction, Other
    # MOMENT cards (At the start / Mid-way / Reaching an end) only appear AFTER scenario
    sit_card = None
    for label_text in ["New hire", "Pulse check", "Goals & planning", "New project"]:
        sit_card = page.query_selector(f".cg-sit-card:has-text('{label_text}')")
        if sit_card:
            log(agent_id, f"Clicking scenario: {label_text}")
            sit_card.click()
            time.sleep(1)
            break

    if not sit_card:
        cards = page.query_selector_all(".cg-sit-card")
        if cards:
            log(agent_id, f"Clicking first scenario card (of {len(cards)})")
            cards[0].click()
            time.sleep(1)
        else:
            log(agent_id, "FINDING: No situation cards found on ground creation page")
            return None

    ss(page, agent_id, "cg_s1a", "after scenario selection")

    # ── Step 1b: Select a MOMENT card (appears only after scenario selected) ──
    # MOMENTS: "At the start", "Mid-way", "Reaching an end"
    time.sleep(1)
    moment_card = None
    for m_text in ["At the start", "Mid-way", "Reaching an end"]:
        moment_card = page.query_selector(f".cg-sit-card:has-text('{m_text}')")
        if moment_card:
            log(agent_id, f"Clicking moment: {m_text}")
            moment_card.click()
            time.sleep(0.5)
            break

    if not moment_card:
        log(agent_id, "FINDING: Moment cards did not appear after scenario selection")
        all_cards = page.query_selector_all(".cg-sit-card")
        for c in all_cards:
            log(agent_id, f"  card text: {c.inner_text().strip()[:40]}")

    ss(page, agent_id, "cg_s1b", "after moment selection")

    # ── Continue from step 1 ─────────────────────────────────────────────────
    continue_btn = page.query_selector("button:has-text('Continue'):not([disabled])")
    if continue_btn:
        log(agent_id, "Step 1: Clicking Continue")
        continue_btn.click()
        time.sleep(2)
    else:
        # Try clicking Continue even if disabled (might work)
        all_continues = page.query_selector_all("button:has-text('Continue')")
        if all_continues:
            log(agent_id, f"Continue exists but disabled. All: {len(all_continues)}")
            for b in all_continues:
                log(agent_id, f"  Continue btn class: {b.get_attribute('class')} disabled: {b.get_attribute('disabled')}")

    text = get_text(page)
    log(agent_id, f"After step 1 continue: {text[:100]}")
    ss(page, agent_id, "cg_s2", "step 2")

    # ── Step 2: Billing check ─────────────────────────────────────────────────
    # The billing step makes an async API call before showing Continue.
    # - If FIRST_GROUND → "Your first Ground is free" + Continue → button enabled
    # - Otherwise → paywall (Stripe checkout), Continue not available free
    ss(page, agent_id, "cg_s2", "billing step")
    log(agent_id, "Waiting for billing check (up to 15s)...")
    billing_ok = False
    for _ in range(15):
        text = get_text(page)
        if "first Ground is free" in text or "No card required" in text or "Code applied" in text:
            billing_ok = True
            break
        if "session free" in text.lower() or "continue" in text.lower():
            billing_ok = True
            break
        if "Checkout" in text or "payment" in text.lower() or "credit card" in text.lower():
            log(agent_id, "FINDING: Ground creation requires payment for this user (not first ground)")
            ss(page, agent_id, "cg_s2_paywall", "paywall shown")
            return None
        time.sleep(1)

    if not billing_ok:
        log(agent_id, "FINDING: Billing step did not resolve to free after 15s")
        return None

    continue_btn2 = page.query_selector("button:has-text('Continue →'), button:has-text('Continue')")
    if continue_btn2:
        log(agent_id, "Step 2: Billing Continue")
        try:
            continue_btn2.click(timeout=5000)
        except:
            log(agent_id, "Billing Continue click timed out - still disabled?")
            return None
        time.sleep(2)

    text = get_text(page)
    ss(page, agent_id, "cg_s3", "step 3")
    log(agent_id, f"After billing step: {text[:100]}")

    # Step 3: timeframe — may have a Continue
    for _ in range(2):
        continue_btn = page.query_selector("button:has-text('Continue →'), button:has-text('Continue'):not([disabled])")
        cur_text = get_text(page)
        if continue_btn and "participant" not in cur_text.lower() and "invite" not in cur_text.lower():
            log(agent_id, "Step 3: Intermediate Continue")
            try:
                continue_btn.click(timeout=5000)
                time.sleep(2)
            except:
                break
            ss(page, agent_id, "cg_si", "intermediate step")

    # ── Step 4: Add participant ──────────────────────────────────────────────
    text = get_text(page)
    log(agent_id, f"Participant step?: {text[:150]}")
    ss(page, agent_id, "cg_s4", "participant step")

    if participant_email:
        # Single email input
        email_inp = page.query_selector("input[type='email']")
        if not email_inp:
            # Step 4 has a text input for name and email
            text_inps = page.query_selector_all("input[type='text']")
            email_inps = page.query_selector_all("input[type='email']")
            log(agent_id, f"Participant step: {len(text_inps)} text inputs, {len(email_inps)} email inputs")

        # Fill name field (if present)
        name_inp = page.query_selector("input[placeholder*='name' i], input[placeholder='Full name']")
        if name_inp:
            name_inp.click()
            name_inp.type("Participant")
            time.sleep(0.2)

        # Fill email
        email_inp = page.query_selector("input[type='email'], input[placeholder*='email' i]")
        if email_inp:
            email_inp.click()
            email_inp.type(participant_email)
            time.sleep(0.2)
            log(agent_id, f"Added participant: {participant_email}")

        # Click "+ Add to this ground"
        add_btn = page.query_selector("button:has-text('Add to this ground'), button:has-text('+ Add'), button:has-text('Add')")
        if add_btn:
            add_btn.click()
            time.sleep(1)
            ss(page, agent_id, "cg_s4_added", "participant added")

    # Continue from participants step
    continue_btn = page.query_selector("button:has-text('Continue'):not([disabled])")
    if not continue_btn:
        # Skip if no participants required
        skip_link = page.query_selector("div:has-text('Skip')")
        if skip_link: skip_link.click()
    if continue_btn:
        log(agent_id, "Step 4: Continue")
        continue_btn.click()
        time.sleep(2)

    # ── Step 5: Resolution state ─────────────────────────────────────────────
    text = get_text(page)
    ss(page, agent_id, "cg_s5", "resolution step")
    log(agent_id, f"Resolution step?: {text[:100]}")

    # Click first resolution option
    res_cards = page.query_selector_all(".cg-sit-card, div[style*='cursor: pointer']")
    if res_cards:
        log(agent_id, f"Clicking resolution card ({len(res_cards)} available)")
        res_cards[0].click()
        time.sleep(0.5)

    continue_btn = page.query_selector("button:has-text('Continue'):not([disabled])")
    if continue_btn:
        log(agent_id, "Step 5: Continue")
        continue_btn.click()
        time.sleep(2)

    # ── Step 6: Brief ────────────────────────────────────────────────────────
    text = get_text(page)
    ss(page, agent_id, "cg_s6", "brief step")
    log(agent_id, f"Brief step?: {text[:100]}")

    ta = page.query_selector("textarea")
    if ta:
        ta.fill(brief)
        time.sleep(0.3)

    # Open this ground
    open_btn = page.query_selector("button:has-text('Open this ground'), button:has-text('Create'), button:has-text('Open'):not(:has-text('←'))")
    if open_btn:
        log(agent_id, f"Opening ground: {open_btn.inner_text().strip()[:30]}")
        open_btn.click()
        time.sleep(4)
        ground_url = page.url
        log(agent_id, f"Ground URL: {ground_url}")
        return ground_url
    else:
        log(agent_id, "No 'Open this ground' button found")
        return None


def do_checkin(page, agent_id, messages, timeout_ta=120):
    """Full check-in session."""
    start_btn = None
    for sel in ["button:has-text('Start session')", "button:has-text('Start check-in')", "a:has-text('Start session')", "button:has-text('Begin')"]:
        start_btn = page.query_selector(sel)
        if start_btn:
            log(agent_id, f"Found: {start_btn.inner_text().strip()[:30]}")
            break

    if not start_btn:
        log(agent_id, "No start button")
        return False

    start_btn.click()
    time.sleep(2)
    ss(page, agent_id, "ci_open", "check-in opened")

    try:
        page.wait_for_function(
            "() => { const t = document.querySelector('textarea'); return t && !t.disabled && !t.readOnly; }",
            timeout=timeout_ta * 1000
        )
        log(agent_id, "Textarea enabled")
    except PlaywrightTimeout:
        log(agent_id, f"TIMEOUT: Textarea never enabled")
        ss(page, agent_id, "ci_timeout", "timeout")
        return False

    for i, msg in enumerate(messages):
        textarea = page.query_selector("textarea")
        if not textarea: return False
        textarea.fill(msg)
        send_btn = page.query_selector("button:has-text('Send'), button[type=submit]")
        if send_btn: send_btn.click()
        else: textarea.press("Enter")
        try:
            before_len = len(get_text(page))
            page.wait_for_function(f"() => document.body.innerText.length > {before_len + 30}", timeout=60000)
        except PlaywrightTimeout:
            log(agent_id, f"TIMEOUT waiting for AI reply after msg {i+1}")
        time.sleep(1)
        ss(page, agent_id, f"ci_msg{i+1}", f"msg {i+1}")

    textarea = page.query_selector("textarea")
    if textarea:
        textarea.fill("Done. That's all from me.")
        send_btn = page.query_selector("button:has-text('Send'), button[type=submit]")
        if send_btn: send_btn.click()
        else: textarea.press("Enter")

    time.sleep(4)
    ss(page, agent_id, "ci_close", "close")
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


# ── Agents ─────────────────────────────────────────────────────────────────────

def a3b_tom_check_in(playwright):
    """A3 continuation: Tom's side of the paired test - needs to be invited."""
    log("3b", "=== A3 CONTINUATION: Tom checks in on the paired ground ===")
    clear_mail()

    # Check if Tom got an invite (from A3 or prior run)
    tom_invite = poll_link("tom.baker@example-test.invalid", match="invite", max_wait=10)
    if not tom_invite:
        log("3b", "No invite for Tom. Checking if Tom already has state.")
        browser, ctx = make_ctx(playwright, "tom")
        page = ctx.new_page()
        try:
            nav(page, f"{BASE_URL}/home")
            text = get_text(page)
            if "Sign in" in text:
                log("3b", "Tom not logged in and no invite. Need to register Tom fresh.")
                # Register Tom via magic link
                clear_mail()
                link_btn_found = False
                nav(page, f"{BASE_URL}/auth")
                link_btn = page.query_selector("span:has-text('New here')")
                if link_btn:
                    link_btn.click()
                    time.sleep(1)
                    email_inp = page.query_selector("input[type='email']")
                    if email_inp:
                        email_inp.click()
                        email_inp.type("tom.baker@example-test.invalid")
                        send_btn = page.query_selector("button:has-text('Send link')")
                        if send_btn: send_btn.click()
                        time.sleep(3)
                        link_btn_found = True

                if link_btn_found:
                    magic = poll_link("tom.baker@example-test.invalid", max_wait=30)
                    if magic:
                        nav(page, magic)
                        complete_org_setup(page, "3b", "Tom Org")
                        log("3b", "Tom registered")
                        save_state(ctx, "tom")
            else:
                log("3b", f"Tom IS logged in. Home: {text[:200]}")
                # Look for ground
                found = find_ground(page, "3b", ["Sarah Chen", "Engineering onboarding", "Zainab"])
                if found:
                    text = get_text(page)
                    log("3b", f"Tom found ground: {text[:200]}")
                else:
                    log("3b", "FINDING: Tom cannot see his ground (may not be invited)")
                save_state(ctx, "tom")
        finally:
            browser.close()
        return

    log("3b", f"Tom invite: {tom_invite[:60]}")
    browser, ctx = make_ctx(playwright, "tom")
    page = ctx.new_page()
    try:
        nav(page, tom_invite)
        time.sleep(3)
        text = get_text(page)
        log("3b", f"Tom after invite: {text[:200]}")
        ss(page, "3b", 1, "tom invite landing")

        if "/setup" in page.url:
            complete_org_setup(page, "3b", "")
        elif "password" in text.lower():
            pw = page.query_selector("input[type='password']")
            if pw:
                pw.click(); pw.type("TestPass123!")
                btn = page.query_selector("button[type='submit']")
                if btn: btn.click(); time.sleep(3)

        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, "3b", 2, "tom home")
        log("3b", f"Tom home: {text[:300]}")
        log("3b", f"How Tom feels: {'Recognized' if 'Sarah Chen' in text else 'Lost - cannot see the ground'}")

        found = find_ground(page, "3b", ["Sarah Chen", "Engineering onboarding"])
        if not found:
            log("3b", "FINDING: Tom cannot see the ground on his dashboard")

        done = do_checkin(page, "3b", [
            "I'm Tom Baker, joining as Senior Engineer. My main concern is scope - I want to know what this role owns versus what sits with the existing team.",
            "Success at 90 days for me: shipped first feature end-to-end, established rhythm with the product lead, understand the codebase architecture.",
        ])
        log("3b", f"Tom check-in: {done}")
        save_state(ctx, "tom")
    finally:
        browser.close()


def a4b_priya_ground_creation(playwright):
    """A4 continuation: Priya uses existing ground or creates new if it's her first."""
    log("4b", "=== A4 CONTINUATION: Priya check-in on her ground ===")
    clear_mail()
    browser, ctx = make_ctx(playwright, "priya")
    page = ctx.new_page()

    try:
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        log("4b", f"Priya home: {text[:300]}")
        ss(page, "4b", 1, "priya dashboard")

        # Complete setup if needed
        if "Set up your org" in text or "/setup" in page.url:
            complete_org_setup(page, "4b", "Priya Org")
            nav(page, f"{BASE_URL}/home")
            text = get_text(page)

        # Look for existing ground
        ground_url = None
        for hint in ["Product direction", "alignment", "Active"]:
            el = page.query_selector(f".gw-item:has-text('{hint}'), a:has-text('{hint}')")
            if el:
                el.click()
                time.sleep(3)
                ground_url = page.url
                log("4b", f"Using existing ground: {ground_url}")
                break

        # If no existing ground, try creating (only works if first ground free)
        if not ground_url:
            log("4b", "No existing ground found, attempting to create")
            ground_url = create_ground(
                page, "4b",
                label="Product direction alignment",
                brief="Three team leads need to align on product direction: build vs buy, prioritisation framework, and Q3 roadmap bets.",
                participant_email="marcus.bell@example-test.invalid"
            )

        if ground_url:
            nav(page, ground_url)
            time.sleep(2)
            text = get_text(page)
            log("4b", f"On ground: {text[:200]}")

            # Check if there's already a participant invite option
            marcus_invite = poll_link("marcus.bell@example-test.invalid", match="invite", max_wait=5)
            if marcus_invite:
                log("4b", f"Marcus already invited: {marcus_invite[:60]}")
            else:
                log("4b", "Marcus not yet invited to this ground")

            done = do_checkin(page, "4b", [
                "We are misaligned on whether to build a custom data pipeline or buy a SaaS tool. I lean toward buying to ship faster but the engineering lead wants full control.",
                "My goal: agree on a decision framework so we stop going in circles on every vendor evaluation.",
            ])
            log("4b", f"Priya check-in: {done}")
        else:
            log("4b", "FINDING: Could not access or create a ground for Priya")

        save_state(ctx, "priya")
    finally:
        browser.close()


def a5b_marcus_participant(playwright):
    """A5 continuation: Marcus accepts invite from Priya's ground."""
    log("5b", "=== A5 CONTINUATION: Marcus accepts invite and checks in ===")

    marcus_invite = poll_link("marcus.bell@example-test.invalid", match="invite", max_wait=15)
    browser, ctx = make_ctx(playwright, "marcus")
    page = ctx.new_page()

    try:
        if marcus_invite:
            log("5b", f"Marcus invite: {marcus_invite[:60]}")
            nav(page, marcus_invite)
            time.sleep(3)
            text = get_text(page)
            log("5b", f"Marcus sees: {text[:300]}")
            log("5b", "Expectation: I understand what I'm being asked to do")
            log("5b", f"Reality: {'I can see what this is' if 'groundwork' in text.lower() else 'Confusing - no context for why I got this link'}")
            ss(page, "5b", 1, "marcus invite landing")

            if "/setup" in page.url:
                complete_org_setup(page, "5b", "")
            elif "password" in text.lower():
                pw = page.query_selector("input[type='password']")
                if pw:
                    pw.click(); pw.type("TestPass123!")
                    btn = page.query_selector("button[type='submit']")
                    if btn: btn.click(); time.sleep(3)
        else:
            log("5b", "No invite found for Marcus. Using existing state.")
            nav(page, f"{BASE_URL}/home")

        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, "5b", 2, "marcus home")
        log("5b", f"Marcus home: {text[:300]}")

        found = find_ground(page, "5b", ["Product direction", "alignment", "Priya"])
        if not found:
            log("5b", "FINDING: Marcus cannot see Priya's ground on his dashboard")

        ss(page, "5b", 3, "ground or dashboard")
        text = get_text(page)

        done = do_checkin(page, "5b", [
            "My view: we should build the data pipeline. The SaaS tools don't handle our edge cases and we'll spend more time on workarounds than building it ourselves.",
            "My concern about this process: will my input actually be weighed against the others, or is this just for show? I want to know this decision is real.",
        ])
        log("5b", f"Marcus check-in: {done}")
        log("5b", f"How Marcus feels: {'Heard' if done else 'My input vanished'}")

        save_state(ctx, "marcus")
    finally:
        browser.close()


def a7_sandra_org_admin(playwright):
    """A7: Sandra, org_admin - wants org-level capability."""
    log(7, "=== AGENT 7: Sandra, org_admin - I run an org, what can I do here? ===")
    clear_mail()

    result = register_and_setup(playwright, "sandra", "Sandra Mensah", "Sandra Org", "sandra.mensah@example-test.invalid", 7)
    if not result: return
    browser, ctx, page = result

    try:
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 7, 1, "sandra dashboard")
        log(7, f"Sandra dashboard: {text[:400]}")
        log(7, "Expectation: I can see org-level controls and understand what I can do as an admin")
        log(7, f"Reality: {'Admin visible' if 'Admin' in text else 'No org-level view visible'}")

        # Navigate to admin page directly
        nav(page, f"{BASE_URL}/admin/dashboard")
        text = get_text(page)
        ss(page, 7, 2, "admin page")
        log(7, f"Admin page: {text[:500]}")
        log(7, f"Org-level controls visible: {'Yes - I can see org management' if 'members' in text.lower() or 'leads' in text.lower() or 'invite' in text.lower() else 'No org management visible'}")

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
        nav(page, f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        text = get_text(page)
        ss(page, 8, 1, "admin dashboard")
        log(8, f"Admin dashboard: {text[:400]}")
        log(8, "Expectation: I can add Kwame with creation rights")

        # Look for invite/add button
        add_btn = None
        for sel in ["button:has-text('Invite')", "button:has-text('Add member')", "button:has-text('Add')", "button:has-text('Invite member')"]:
            add_btn = page.query_selector(sel)
            if add_btn and add_btn.is_visible():
                break

        if not add_btn:
            log(8, "FINDING: No 'Add member' button on admin page")
            log(8, f"Buttons: {[b.inner_text().strip()[:30] for b in page.query_selector_all('button')[:15]]}")
        else:
            log(8, f"Found add button: {add_btn.inner_text().strip()}")
            add_btn.click()
            time.sleep(1)
            ss(page, 8, 2, "add member form")

            email_inp = page.query_selector("input[type='email']")
            if email_inp:
                email_inp.click()
                email_inp.type("kwame.asante@example-test.invalid")
                time.sleep(0.2)

            submit = page.query_selector("button[type='submit'], button:has-text('Send'), button:has-text('Invite'), button:has-text('Add')")
            if submit:
                submit.click()
                time.sleep(3)
                log(8, "Kwame invite submitted")
            ss(page, 8, 3, "after invite kwame")
            text = get_text(page)
            log(8, f"After invite: {text[:300]}")

        save_state(ctx, "sandra")
    finally:
        browser.close()


def a9_kwame_creates_ground(playwright):
    """A9: Kwame creates his own ground."""
    log(9, "=== AGENT 9: Kwame - Sandra added me, I create my own ground ===")
    clear_mail()

    # Check for Kwame invite
    kwame_invite = poll_link("kwame.asante@example-test.invalid", max_wait=15)
    browser, ctx = make_ctx(playwright, "kwame")
    page = ctx.new_page()

    try:
        if kwame_invite:
            log(9, f"Kwame invite: {kwame_invite[:60]}")
            nav(page, kwame_invite)
            time.sleep(3)
            text = get_text(page)
            log(9, f"Kwame sees: {text[:200]}")
            if "/setup" in page.url:
                complete_org_setup(page, 9, "Sandra Org")
            elif "password" in text.lower():
                pw = page.query_selector("input[type='password']")
                if pw:
                    pw.click(); pw.type("TestPass123!")
                    btn = page.query_selector("button[type='submit']")
                    if btn: btn.click(); time.sleep(3)
        else:
            log(9, "No Kwame invite - registering fresh")
            result = register_and_setup(playwright, "kwame", "Kwame Asante", "Sandra Org", "kwame.asante@example-test.invalid", 9)
            if not result:
                browser.close()
                return
            browser.close()
            browser, ctx, page = result

        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 9, 1, "kwame dashboard")
        log(9, f"Kwame dashboard: {text[:400]}")
        log(9, "Expectation: I have permission to create a ground")

        # Check if Kwame can create a ground
        new_btn = None
        for sel in ["button:has-text('New ground')", "a:has-text('New ground')", "button:has-text('+')"]:
            new_btn = page.query_selector(sel)
            if new_btn: break

        if not new_btn:
            log(9, "FINDING: Kwame cannot see New ground button - may not have creation permission")
            ss(page, 9, "no_btn", "no new ground button")
        else:
            log(9, "Kwame can see New ground button")
            ground_url = create_ground(
                page, 9,
                label="Sales team Q2 performance review",
                brief="Reviewing Q2 sales performance. Kwame leads and wants to understand what happened and what changes in Q3. Three reps underperformed - Kwame wants to understand if this is a skill gap, process problem, or territory issue.",
                participant_email="part-kwame@example-test.invalid"
            )

            if ground_url:
                log(9, f"Ground created: {ground_url}")
                nav(page, ground_url)
                done = do_checkin(page, 9, [
                    "We missed Q2 target by 15%. Three reps underperformed. I want to understand whether this is a skill gap, a process problem, or a territory issue.",
                    "One specific concern: a two-year rep still at 70% quota. I've been avoiding the conversation and I need to change that.",
                ])
                log(9, f"Kwame check-in: {done}")
            else:
                log(9, "FINDING: Ground creation failed for Kwame")

        save_state(ctx, "kwame")
    finally:
        browser.close()


def a10_sandra_full(playwright):
    """A10: Sandra, full org admin."""
    log(10, "=== AGENT 10: Sandra, full org admin - creates own ground ===")
    clear_mail()
    browser, ctx = make_ctx(playwright, "sandra")
    page = ctx.new_page()

    try:
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 10, 1, "sandra home")
        log(10, f"Sandra home: {text[:300]}")

        ground_url = create_ground(
            page, 10,
            label="Org-wide Q3 priorities",
            brief="Sandra wants to align leadership on what the org is actually betting on in Q3. Her position: Q3 is about retention, not acquisition. She wants to know if Kwame's understanding matches.",
            participant_email="kwame.asante@example-test.invalid"
        )

        if ground_url:
            log(10, f"Ground created: {ground_url}")
            nav(page, ground_url)
            done = do_checkin(page, 10, [
                "I'm the org admin. My question: are Kwame and I actually aligned on what Q3 is about, or have we been talking past each other?",
                "My position: Q3 is about retention, not acquisition. I want to know if that matches what Kwame thinks we're doing.",
            ])
            log(10, f"Sandra check-in: {done}")
        else:
            log(10, "FINDING: Ground creation failed for Sandra")

        save_state(ctx, "sandra")
    finally:
        browser.close()


def a11_zainab_s2_setup(playwright):
    """A11: Zainab returning - starts session 2."""
    log(11, "=== AGENT 11: Zainab returning for session 2 ===")
    browser, ctx = make_ctx(playwright, "zainab")
    page = ctx.new_page()

    try:
        nav(page, f"{BASE_URL}/home")
        text = get_text(page)
        ss(page, 11, 1, "zainab return")
        log(11, f"Zainab back: {text[:400]}")
        log(11, "Expectation: My first ground is still here and setup is faster this time")
        log(11, f"Reality: {'Grounds visible' if 'Sarah Chen' in text or 'Engineering' in text or 'active' in text.lower() else 'No grounds visible'}")

        clear_mail()
        ground_url = create_ground(
            page, 11,
            label="Sarah Chen - 30 day check",
            brief="One month in. Zainab wants to understand how the 30-day goals are tracking. What's working and what isn't from both sides.",
            participant_email="tom.baker@example-test.invalid"
        )

        if ground_url:
            log(11, f"Ground created: {ground_url}")
            # Check Tom invite
            time.sleep(2)
            tom_invite = poll_link("tom.baker@example-test.invalid", match="invite", max_wait=15)
            if tom_invite:
                log(11, f"Tom invite sent for session 2 ground: {tom_invite[:60]}")
            else:
                log(11, "FINDING: No invite to Tom for session 2 ground")
        else:
            log(11, "FINDING: Could not create second ground for Zainab")

        save_state(ctx, "zainab")
    finally:
        browser.close()


def a45_typography(playwright):
    """A45: Typography sweep."""
    log(45, "=== AGENT 45: Typography sweep ===")
    browser, ctx = make_ctx(playwright, "zainab")
    page = ctx.new_page()

    try:
        for p_url in ["/home", "/auth"]:
            result = subprocess.run(
                ["python3", "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/typography.py",
                 "--url", f"{BASE_URL}{p_url}"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                log(45, f"TYPOGRAPHY on {p_url}: {result.stdout[:300]}")
            else:
                log(45, f"Typography clean: {p_url}: {result.stdout.strip()[:100]}")

        result = subprocess.run(
            ["python3", "/Users/hafsahjumare/Documents/GitHub/groundwork/groundwork_local_test/typography.py",
             "--mail-api", MAIL_URL],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            log(45, f"TYPOGRAPHY in email: {result.stdout[:300]}")
        else:
            log(45, f"Email typography: {result.stdout.strip()[:100]}")
    finally:
        browser.close()


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("SESSION 1 CONTINUATION: A3b, A4b, A5b, A7-A11, A45")
    print("=" * 60)

    with sync_playwright() as p:
        clear_mail()
        a3b_tom_check_in(p)
        clear_mail()
        a4b_priya_ground_creation(p)
        a5b_marcus_participant(p)
        clear_mail()
        a7_sandra_org_admin(p)
        clear_mail()
        a8_sandra_adds_kwame(p)
        clear_mail()
        a9_kwame_creates_ground(p)
        clear_mail()
        a10_sandra_full(p)
        clear_mail()
        a11_zainab_s2_setup(p)
        clear_mail()
        a45_typography(p)

    print("\n" + "=" * 60)
    print("SESSION 1 CONTINUATION COMPLETE")
    print("=" * 60)
    print("\nKEY FINDINGS:")
    for f in findings:
        if any(k in f for k in ["FINDING", "FAIL", "TIMEOUT", "WAIT", "PROBLEM", "check-in: True", "check-in: False"]):
            print(f)

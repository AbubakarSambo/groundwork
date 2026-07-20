"""Suite M - multi-session arcs (the returning-user path).

The class of bug this covers: a real user came back for session 2 on a free
ground and hit a "$5 per session" paywall that was not supposed to exist.
Session 1 completes at entry-commit; this suite walks the SAME person back
into the ground and asserts the return path holds.

  M1. Provision a real initiator (entry session -> save -> magic link) and
      land on their ground page. Session 1 shows as complete.
  M2. THE PAYWALL TRIPWIRE (hard): nowhere on the ground/participant pages
      does "$5", "Buy a session" or "No sessions remaining" appear, and
      opening the next check-in never raises a payment modal.
  M3. Self-correction is reachable: the correction affordance exists on the
      completed session and opens without a crash or a 404 (the /check-in/
      route-typo class).

Affordance-not-found is a FINDING (the UI moved - a human should look);
paywall resurrection is a HARD CRITICAL (the PR gate goes red).
"""

from __future__ import annotations


import asyncio
import re
import sys
import time

from playwright.async_api import async_playwright

from _runner import (
    launch,
    new_page,
    BASE_URL,
    Recorder,
    api,
    mail_clear,
    mail_link,
    seed_closed_entry_session,
)

rec = Recorder("suite_m")
STAMP = str(int(time.time()))
EMAIL = f"m.arc+{STAMP}@example-test.invalid"

PAYWALL_PATTERNS = re.compile(r"\$5|No sessions remaining|Buy a session", re.I)


async def provision_ground(browser):
    """Real path: seeded closed session -> save -> magic link -> committed ground."""
    ctx = await browser.new_context(viewport={"width": 1366, "height": 768})
    page = await new_page(rec, ctx, "persona M")
    await page.goto(f"{BASE_URL}/start")
    await page.wait_for_timeout(1500)
    await seed_closed_entry_session(page)
    await page.reload()
    await page.wait_for_timeout(2500)
    # the save modal exists in the DOM but is visibility:hidden until opened -
    # judge by VISIBILITY, not presence, and open it via the bar if needed
    save_btn = page.get_by_text("Save my ground").first
    if not await save_btn.is_visible():
        bar = page.get_by_text("Invite & finish")
        if await bar.count():
            await bar.first.click()
            await page.wait_for_timeout(800)
    email_input = page.locator("input[placeholder*='your@email']:visible").first
    await email_input.fill(EMAIL)
    await page.get_by_text("Save my ground").first.click()
    await page.get_by_text("We sent a link to").wait_for(timeout=15000)
    link = mail_link(EMAIL, match="verify-email")
    if not link:
        raise RuntimeError("no magic link for suite M initiator")
    await page.goto(link)
    # GW-REPORTSUMMARY-DTO-DRIFT tripwire: this initiator's session was closed
    # with a real generated report before saving, so /entry/commit carries a
    # reportSummary payload - the exact shape that 400'd with "property
    # reportSummary should not exist" for every committer who checked in
    # before saving (live since e078b0d, 2026-06-24, fixed in EntryCommitDto).
    # If that contract regresses, this magic link renders the failure screen
    # instead of the success screen - assert the success screen explicitly,
    # by name, rather than trusting a bare wait_for timeout to surface it.
    try:
        await page.get_by_text("Your ground is set up").wait_for(timeout=25000)
        landed = True
    except Exception:
        landed = False
    body = await page.inner_text("body")
    rec.check(
        "M1",
        landed and "wasn't saved" not in body and "reportSummary" not in body,
        "commit-with-reportSummary succeeds end to end (GW-REPORTSUMMARY-DTO-DRIFT)",
        body[:400],
        hard=True,
    )
    if not landed:
        raise RuntimeError("magic link did not render the success screen - reportSummary commit likely 400'd")
    go = page.get_by_text("Go to your ground")
    await go.first.click()
    await page.wait_for_timeout(3000)
    await rec.step(page, "initiator on their ground page", "persona M")
    return ctx, page


async def main() -> int:
    async with async_playwright() as pw:
        browser = await launch(pw)
        mail_clear()

        try:
            ctx, page = await provision_ground(browser)
        except Exception as e:
            rec.record("M1", "BLOCKED", "could not provision an initiator with a ground", str(e))
            await browser.close()
            rec.finish()
            return 2

        rec.record("M1", "OK", f"initiator landed on their ground page: {page.url}", url=page.url)

        # ---- M2: the paywall tripwire on the landing state ------------------
        body = await page.inner_text("body")
        m = PAYWALL_PATTERNS.search(body)
        rec.check("M2", m is None, "no paywall strings on the ground page",
                  f"found {m.group(0)!r} - the $5 class is back" if m else "", hard=True, url=page.url)

        # Session 1 visible as completed / on record
        s1 = await page.get_by_text(re.compile(r"Session 1|session 1", re.I)).count()
        rec.check("M2", s1 > 0, "session 1 is visible on the ground page")

        # ---- M2b: the RETURNING path - open the next check-in ---------------
        candidates = [
            "Check in", "Continue check-in", "Start session", "Open check-in",
            "Check in now", "Start your check-in",
        ]
        opened = False
        for label in candidates:
            el = page.get_by_text(label, exact=False)
            if await el.count():
                await el.first.click()
                await page.wait_for_timeout(3500)
                opened = True
                break
        if opened:
            body2 = await page.inner_text("body")
            m2 = PAYWALL_PATTERNS.search(body2)
            rec.check("M2", m2 is None,
                      "opening the next check-in raises NO paywall",
                      f"found {m2.group(0)!r} on the returning path" if m2 else "", hard=True, url=page.url)
            await page.screenshot(path=str(rec.results_dir / "returning_path.png"), full_page=True)
            await rec.step(page, "returning path: next check-in, no paywall", "persona M")
        else:
            rec.check("M2", False, "the next-check-in affordance EXISTS on the ground page (hard - absence is a failure, not a shrug)",
                       f"looked for {candidates} - if the label changed, update the suite; "
                       "if the affordance is gone, that is a product finding", hard=True)

        # ---- M3: self-correction reachable (on the PARTICIPANT view, /p) ----
        ground_url = page.url.split("?")[0].rstrip("/")
        await page.goto(f"{ground_url}/p")
        await page.wait_for_timeout(2500)
        body_p = await page.inner_text("body")
        mp = PAYWALL_PATTERNS.search(body_p)
        rec.check("M2", mp is None, "no paywall strings on the participant view",
                  f"found {mp.group(0)!r}" if mp else "", hard=True, url=page.url)
        # The self-correction affordance is collapsed inside the "What we
        # heard from you" artifact toggle - expand it first, or the button
        # never renders and every future run false-crits M3 (this was
        # previously unreachable: suite M crashed earlier at M1 whenever the
        # reportSummary DTO drift 400'd the initiator's own commit, so this
        # collapsed-toggle bug was never actually exercised until now).
        toggle = page.get_by_text("What we heard from you", exact=False)
        if await toggle.count():
            await toggle.first.click()
            await page.wait_for_timeout(800)
        corr_labels = ["correct it", "Correct my", "This isn't right"]
        corr = None
        for label in corr_labels:
            el = page.get_by_text(label, exact=False)
            if await el.count():
                corr = el.first
                break
        if corr:
            await corr.click()
            await page.wait_for_timeout(3000)
            body3 = await page.inner_text("body")
            not_found = "not found" in body3.lower() or "404" in body3
            rec.check("M3", not not_found,
                      "self-correction opens without a 404 (the /check-in/ typo class)",
                      url=page.url, hard=True)
        else:
            rec.check("M3", False, "the self-correction affordance EXISTS (hard - absence is a failure, not a shrug)",
                       f"looked for {corr_labels} on {page.url}", hard=True)

        # ---- M4: the #52 bounce UI + tracking pills (model-free) -----------
        # A +bounce recipient makes dev mode fire a synthetic email.bounced
        # through the REAL webhook handler - the red pill, the banner, and
        # the fix-and-resend repair must all render and work.
        await page.goto(ground_url)
        await page.wait_for_timeout(2500)
        body = await page.inner_text("body")
        rec.check("M4", ("Invite pending" in body) or ("Not started" in body) or ("Not Started" in body),
                  "tracking pills render (invited / not-started states visible per participant)",
                  body[:150], hard=True)

        bounce_email = f"m.bnc+bounce.{STAMP}@example-test.invalid"
        add_btn = page.get_by_text("Add a contributor", exact=False)
        if await add_btn.count():
            await add_btn.first.click()
            await page.wait_for_timeout(600)
            await page.locator('input[placeholder*="name@company"]').fill(bounce_email)
            await page.get_by_text("Send invite", exact=False).first.click()
            await page.wait_for_timeout(3500)
            await page.reload()
            await page.wait_for_timeout(2500)
            body = await page.inner_text("body")
            rec.check("M4", "never arrived (bounced)" in body,
                      "the bounce BANNER renders after a bounced invite (the #52 surface)",
                      body[:200], hard=True)
            fixbtn = page.get_by_text("Email bounced - fix & resend", exact=False)
            rec.check("M4", await fixbtn.count() > 0,
                      "the red 'Email bounced - fix & resend' control renders on the participant card", hard=True)
            if await fixbtn.count():
                await fixbtn.first.click()
                await page.wait_for_timeout(600)
                fixed = f"m.fixed.{STAMP}@example-test.invalid"
                fix_input = page.locator('input[placeholder*="email" i], input[type="email"]').last
                await fix_input.fill(fixed)
                await fix_input.press("Enter")
                await page.wait_for_timeout(3500)
                await page.reload()
                await page.wait_for_timeout(2500)
                body = await page.inner_text("body")
                rec.check("M4", (fixed in body) and ("never arrived (bounced)" not in body),
                          "fix-and-resend repairs the address and clears the bounce state ON SCREEN",
                          body[:200], hard=True)

        await browser.close()
    return rec.finish()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:
        rec.record("M", "BLOCKED", "suite crashed", str(e))
        rec.finish()
        sys.exit(2)

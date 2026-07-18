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
    page = await ctx.new_page()
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
    await page.get_by_text("Your ground is set up").wait_for(timeout=25000)
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
            rec.record("M2", "FINDING", "no next-check-in affordance found on the ground page",
                       f"looked for {candidates} - if the label changed, update the suite; "
                       "if the affordance is gone, that is a product finding")

        # ---- M3: self-correction reachable (on the PARTICIPANT view, /p) ----
        ground_url = page.url.split("?")[0].rstrip("/")
        await page.goto(f"{ground_url}/p")
        await page.wait_for_timeout(2500)
        body_p = await page.inner_text("body")
        mp = PAYWALL_PATTERNS.search(body_p)
        rec.check("M2", mp is None, "no paywall strings on the participant view",
                  f"found {mp.group(0)!r}" if mp else "", hard=True, url=page.url)
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
            rec.record("M3", "FINDING", "no self-correction affordance found",
                       f"looked for {corr_labels} on {page.url}")

        await browser.close()
    return rec.finish()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:
        rec.record("M", "BLOCKED", "suite crashed", str(e))
        rec.finish()
        sys.exit(2)

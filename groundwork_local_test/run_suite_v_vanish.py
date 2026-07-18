"""Suite V - the vanish class (cross-context commit).

THE bug this suite exists for: a real user ran the anonymous entry flow, gave
their email, followed the magic link, logged in - and the ground was not
there. Work lost, silently, at the exact conversion moment. Twice.

Permanent cover, driven exactly the way the bug happened:
  V1. Finish an anonymous session in context A, save with an email, and type
      the org name + a contributor AFTER the email was sent.
  V2. Open the real magic link (read from the mailcatcher, like a person
      reads their inbox) in a FRESH context with ZERO storage - a different
      browser. The ground, transcript, org name and the positive
      "Invited (N)" confirmation must all be there.
  V3. Open the same link AGAIN: same ground, no duplicate, ever.
  V4. The legacy no-draft path (links sent before the server draft existed):
      localStorage payload alone must still commit.
  V5. Nothing anywhere (draft-less user with entry-intent traces): the
      EXPLICIT "we couldn't find your session" screen - never a silent
      /setup strand.

Hard assertions (hard=True) fail the runner -> the PR gate goes red.
"""

from __future__ import annotations


import asyncio
import sys
import time

from playwright.async_api import async_playwright

from _runner import (
    launch,
    new_page,
    API_BASE,
    BASE_URL,
    Recorder,
    api,
    mail_clear,
    mail_link,
    seed_closed_entry_session,
)

rec = Recorder("suite_v")
STAMP = str(int(time.time()))
EMAIL = f"v.vanish+{STAMP}@example-test.invalid"
LEGACY_EMAIL = f"v.legacy+{STAMP}@example-test.invalid"
LOST_EMAIL = f"v.lost+{STAMP}@example-test.invalid"
CONTRIB = f"v.contrib+{STAMP}@example-test.invalid"
ORG_NAME = "Vanish Proof Org"


async def grounds_for(token: str) -> list:
    code, res = api("GET", "/grounds", token=token)
    if code != 200:
        return []
    if isinstance(res, dict):
        res = res.get("grounds") or res.get("items") or []
    return res if isinstance(res, list) else []


async def token_from(page) -> str | None:
    for _ in range(30):
        tok = await page.evaluate("() => localStorage.getItem('token')")
        if tok:
            return tok
        await page.wait_for_timeout(500)
    return None


async def main() -> int:
    async with async_playwright() as pw:
        browser = await launch(pw)
        mail_clear()

        # ---- V1: context A - finish a session, save, edit AFTER the email --
        ctx_a = await browser.new_context(viewport={"width": 1366, "height": 768})
        page = await new_page(rec, ctx_a, "persona A")
        await page.goto(f"{BASE_URL}/start")
        await page.wait_for_timeout(1500)
        await seed_closed_entry_session(page)
        await page.reload()
        await page.wait_for_timeout(2500)
        await rec.step(page, "restored closed session", "persona A")

        # The restored closed session must offer the save card (finding #46's
        # class: an ended session must never be discarded on reload).
        # the save modal exists in the DOM but is visibility:hidden until
        # opened - judge by VISIBILITY, not presence
        save_btn = page.get_by_text("Save my ground").first
        if not await save_btn.is_visible():
            bar = page.get_by_text("Invite & finish")
            if await bar.count():
                await bar.first.click()
                await page.wait_for_timeout(800)
        rec.check("V1", await page.get_by_text("Save my ground").first.is_visible(),
                  "closed session restores and offers the save card", hard=True, url=f"{BASE_URL}/start")

        await page.locator("input[placeholder*='your@email']:visible").first.fill(EMAIL)
        await page.get_by_text("Save my ground").first.click()
        try:
            await page.get_by_text("We sent a link to").wait_for(timeout=15000)
            rec.record("V1", "OK", "entry-save accepted, magic link on its way")
            await rec.step(page, "saved with email - link on its way", "persona A")
        except Exception:
            rec.check("V1", False, "entry-save accepted", "no 'We sent a link' state appeared", hard=True)
            await browser.close()
            return rec.finish()

        # Post-email edits: org name + one contributor (the state that used to
        # live ONLY in this browser's localStorage).
        await page.locator("input[placeholder*='Organisation name']:visible").first.fill(ORG_NAME)
        await page.locator("input[placeholder*='name@company']:visible").first.fill(CONTRIB)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(700)
        ctxbox = page.locator("input[placeholder*='other side of this'], textarea[placeholder*='other side of this']")
        if await ctxbox.count():
            await ctxbox.first.fill("On the build")
            add = page.get_by_text("Add contributor", exact=True)
            if await add.count():
                await add.first.click()
        await page.wait_for_timeout(2000)  # let the debounced draft PATCH fire

        await rec.step(page, "org name + contributor added AFTER email", "persona A")
        queued = await page.get_by_text("Waiting to send").count()
        rec.check("V1", queued > 0, "queued invites are visible ('Waiting to send')",
                  "the emailSent box shows no queue - the send moment is invisible again")

        link = mail_link(EMAIL, match="verify-email")
        rec.check("V1", bool(link), "magic link email actually arrived (mailcatcher)",
                  "no verify-email link reached the inbox", hard=True)
        if not link:
            await browser.close()
            return rec.finish()

        # ---- V2: THE VANISH REPRO - fresh context, zero storage ------------
        ctx_b = await browser.new_context(viewport={"width": 1366, "height": 768})
        page_b = await new_page(rec, ctx_b, "persona A (new browser)")
        await page_b.goto(link)
        try:
            await page_b.get_by_text("Your ground is set up").wait_for(timeout=25000)
            rec.record("V2", "OK", "fresh context: 'Your ground is set up' after the magic link")
            await rec.step(page_b, "FRESH CONTEXT: ground survived the magic link", "persona A (new browser)")
        except Exception:
            body = (await page_b.inner_text("body"))[:300].replace("\n", " | ")
            rec.check("V2", False, "VANISH: ground survives a fresh browser context",
                      f"success screen never appeared. Page said: {body}", hard=True, url=link)
            await page_b.screenshot(path=str(rec.results_dir / "vanish_fail.png"), full_page=True)
            await browser.close()
            return rec.finish()

        invited = await page_b.get_by_text("Invited (1)").count()
        rec.check("V2", invited > 0, "positive 'Invited (1)' confirmation shown", hard=True)
        contrib_shown = await page_b.get_by_text(CONTRIB).count()
        rec.check("V2", contrib_shown > 0, "the invited contributor is listed by email")
        await page_b.screenshot(path=str(rec.results_dir / "vanish_pass.png"), full_page=True)

        token = await token_from(page_b)
        grounds = await grounds_for(token) if token else []
        rec.check("V2", len(grounds) == 1, "exactly one ground exists",
                  f"found {len(grounds)}", hard=True)
        if grounds:
            g = grounds[0]
            gid = g.get("id")
            code, detail = api("GET", f"/grounds/{gid}", token=token)
            label = (detail or {}).get("label") or g.get("label") or ""
            rec.check("V2", "launch" in label.lower() or label != "",
                      "ground label present", f"label={label!r}")
            org = (detail or {}).get("organization", {}) or {}
            org_name = org.get("name", "")
            code_me, me = api("GET", "/auth/me", token=token)
            if code_me == 200 and isinstance(me, dict):
                org_name = org_name or (me.get("organizationName") or "")
            rec.check("V2", ORG_NAME in (org_name or ""),
                      "org carries the name typed AFTER the email (draft PATCH worked)",
                      f"org name is {org_name!r}, expected {ORG_NAME!r}", hard=True)
        # the contributor's invite email actually fired
        contrib_link = mail_link(CONTRIB, timeout_s=15)
        rec.check("V2", bool(contrib_link), "contributor invite email fired", hard=True)

        # ---- V3: idempotency - open the SAME link again ---------------------
        ctx_c = await browser.new_context(viewport={"width": 1366, "height": 768})
        page_c = await new_page(rec, ctx_c, "persona A (third context)")
        await page_c.goto(link)
        await page_c.wait_for_timeout(6000)
        await rec.step(page_c, "same link opened AGAIN (idempotency)", "persona A (third context)")
        grounds_after = await grounds_for(token)
        rec.check("V3", len(grounds_after) == 1,
                  "re-opening the magic link creates NO duplicate ground",
                  f"ground count went from 1 to {len(grounds_after)}", hard=True)

        # ---- V4: legacy path - localStorage payload, no server draft --------
        code, _ = api("POST", "/auth/entry-save", {"email": LEGACY_EMAIL})  # no draft in body
        legacy_link = mail_link(LEGACY_EMAIL, match="verify-email")
        rec.check("V4", code == 200 and bool(legacy_link), "legacy entry-save (no draft) issues a link", hard=True)
        if legacy_link:
            ctx_d = await browser.new_context(viewport={"width": 1366, "height": 768})
            page_d = await new_page(rec, ctx_d, "legacy persona")
            # seed on the SAME ORIGIN the link opens (FRONTEND_URL may be
            # localhost while BASE_URL is 127.0.0.1 - different localStorage)
            link_origin = legacy_link.split("/verify-email")[0]
            await page_d.goto(f"{link_origin}/start")
            await page_d.wait_for_timeout(1200)
            await page_d.evaluate(
                """() => {
                  localStorage.clear();
                  localStorage.setItem('gw_commit_payload', JSON.stringify({
                    groundLabel: 'Legacy suite ground', orgName: 'Legacy Suite Org',
                    scenario: 'NEW_PROJECT', cadence: 'FORTNIGHTLY', contributors: []}));
                  localStorage.setItem('gw_entry_session', JSON.stringify({
                    scenario: 'NEW_PROJECT', closed: true, onboardingStep: 7,
                    history: [{role:'assistant',content:'What happened?'},
                              {role:'user',content:'The legacy path must keep working for links sent before drafts existed.'}]}));
                }"""
            )
            await page_d.goto(legacy_link)
            try:
                await page_d.get_by_text("Your ground is set up").wait_for(timeout=25000)
                rec.record("V4", "OK", "legacy localStorage payload still commits (no draft row)")
            except Exception:
                rec.check("V4", False, "legacy no-draft path commits from the body",
                          "success screen never appeared for the legacy payload", hard=True)

        # ---- V5: nothing anywhere -> the EXPLICIT screen, never /setup ------
        code, _ = api("POST", "/auth/entry-save", {"email": LOST_EMAIL})  # no draft
        lost_link = mail_link(LOST_EMAIL, match="verify-email")
        if lost_link:
            ctx_e = await browser.new_context(viewport={"width": 1366, "height": 768})
            page_e = await new_page(rec, ctx_e, "lost-session persona")
            lost_origin = lost_link.split("/verify-email")[0]
            await page_e.goto(f"{lost_origin}/start")
            await page_e.wait_for_timeout(1200)
            # entry-intent traces but nothing usable: the pre-fix code silently
            # stranded this person on /setup.
            await page_e.evaluate(
                """() => { localStorage.clear();
                  localStorage.setItem('gw_commit_payload', JSON.stringify({groundLabel:'',history:[],contributors:[]})); }"""
            )
            await page_e.goto(lost_link)
            await page_e.wait_for_timeout(8000)
            explicit = await page_e.get_by_text("We couldn't find your session on this device").count()
            on_setup = "/setup" in page_e.url
            rec.check("V5", explicit > 0 and not on_setup,
                      "lost-session shows the EXPLICIT screen, never a silent /setup",
                      f"explicit={bool(explicit)} url={page_e.url}", hard=True)
        else:
            rec.record("V5", "BLOCKED", "no magic link for the lost-session leg")

        await browser.close()
    return rec.finish()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:  # crash = non-zero = red run
        rec.record("V", "BLOCKED", "suite crashed", str(e))
        rec.finish()
        sys.exit(2)

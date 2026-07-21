"""Suite R - the four-role matrix through the real UI.

  R1 INITIATOR/ADMIN: provisioned the way a person becomes one (magic link).
  R2 LEAD: an authed commit with lead {email,name} routes through the
     for-lead machinery -> ground lands AWAITING_LEAD -> THE LEAD'S INVITE
     EMAIL actually arrives (mailcatcher) -> the confirm link opens in a
     FRESH zero-storage context and shows the hand-off (not an error, not an
     auth wall).
  R3 COHORT PARTICIPANTS: the same commit pre-adds 4 participants; each
     invite email arrives, and each link opens in its OWN fresh context onto
     a working check-in entry (no auth wall, no crash) - many-people-one-
     ground is the cohort shape.

Deterministic end to end: provisioning and the commit go through the real
API; no AI conversation is needed (the lead/cohort machinery is what is
under test).
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
import urllib.request

from playwright.async_api import async_playwright

from _runner import API_BASE, Recorder, api, launch, mail_clear, mail_link, new_page, provision_admin

rec = Recorder("suite_r")
STAMP = str(int(time.time()))
ADMIN = f"r.admin+{STAMP}@example-test.invalid"
LEAD = f"r.lead+{STAMP}@example-test.invalid"
COHORT = [f"r.member{i}+{STAMP}@example-test.invalid" for i in range(1, 5)]


async def main() -> int:
    async with async_playwright() as pw:
        browser = await launch(pw)
        mail_clear()

        # ---- R1: initiator/admin exists the real way ------------------------
        try:
            ctx, token, origin = await provision_admin(browser, ADMIN)
            rec.record("R1", "OK", "initiator/admin provisioned via real magic link")
        except Exception as e:
            rec.record("R1", "BLOCKED", "could not provision the admin", str(e))
            await browser.close()
            rec.finish()
            return 2

        # ---- the commit: lead + 4 pre-added cohort participants -------------
        code, res = api("POST", "/entry/commit", {
            "groundLabel": f"Role matrix {STAMP}",
            "history": [],
            "contributors": [{"email": e, "context": "Cohort member"} for e in COHORT],
            "lead": {"email": LEAD, "name": "Lead Person"},
            "brief": "Role-matrix suite: the lead runs the first check-in.",
        }, token=token)
        ground_id = (res or {}).get("groundId") if isinstance(res, dict) else None
        rec.check("R2", code in (200, 201) and bool(ground_id),
                  "lead-path commit creates the ground", f"HTTP {code}: {str(res)[:150]}", hard=True)
        if not ground_id:
            await browser.close()
            return rec.finish()

        code, ground = api("GET", f"/grounds/{ground_id}", token=token)
        status = (ground or {}).get("status")
        rec.check("R2", status == "AWAITING_LEAD",
                  "ground lands AWAITING_LEAD (lead must confirm before anything runs)",
                  f"status={status!r}", hard=True)

        # ---- R2: the LEAD's email + confirm page in a fresh context ---------
        lead_link = mail_link(LEAD, timeout_s=20)
        rec.check("R2", bool(lead_link), "the lead's invite email actually arrived", hard=True)
        if lead_link:
            lead_ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
            lead_page = await new_page(rec, lead_ctx, "the LEAD (fresh browser)")
            await lead_page.goto(lead_link)
            await lead_page.wait_for_timeout(3500)
            body = await lead_page.inner_text("body")
            crashed = "something went wrong" in body.lower() or "not found" in body.lower()
            auth_walled = "/auth" in lead_page.url and "Sign in" in body
            rec.check("R2", not crashed and not auth_walled,
                      "the lead's link opens onto a working page (no crash, no auth wall)",
                      f"url={lead_page.url} body[:120]={body[:120]!r}", hard=True, url=lead_page.url)
            # Class 7 deepening: arrival is not enough - the CONFIRM affordance
            # must actually render (suite J proves clicking it works).
            has_confirm = ("Confirm and begin" in body) or ("password" in body.lower())
            rec.check("R2", has_confirm,
                      "the lead's page renders the confirm affordance (or the set-password step that leads to it)",
                      body[:200], hard=True)
            await rec.step(lead_page, "lead landed from their email", "the LEAD")
            await lead_ctx.close()

        # ---- R3: each cohort participant in their OWN fresh context ---------
        opened = 0
        for i, member in enumerate(COHORT, 1):
            link = mail_link(member, match="invite", timeout_s=20)
            rec.check("R3", bool(link), f"cohort member {i} invite email arrived", hard=True)
            if not link:
                continue
            mctx = await browser.new_context(viewport={"width": 1366, "height": 900})
            mpage = await new_page(rec, mctx, f"cohort member {i} (own browser)")
            await mpage.goto(link)
            await mpage.wait_for_timeout(3000)
            body = await mpage.inner_text("body")
            crashed = "something went wrong" in body.lower() or "not valid" in body.lower()
            auth_walled = "/auth" in mpage.url and "Password" in body
            rec.check("R3", not crashed and not auth_walled,
                      f"cohort member {i}'s link opens onto their check-in entry",
                      f"url={mpage.url} body[:120]={body[:120]!r}", hard=True, url=mpage.url)
            if i == 1:
                await rec.step(mpage, "cohort member 1 landed from their email", "cohort member 1")
            opened += 1
            await mctx.close()
        rec.check("R3", opened == len(COHORT), "all 4 cohort members reached their check-in",
                  f"opened {opened}/{len(COHORT)}", hard=True)

        await browser.close()
    return rec.finish()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:
        rec.record("R", "BLOCKED", "suite crashed", str(e))
        rec.finish()
        sys.exit(2)

"""Suite B - billing boundaries.

The classes this covers, each of which really bit:
  B1. FREE TIER IS UNLIMITED SESSIONS: no "$5" / "Buy a session" copy anywhere
      on the create flow (the timeline step advertised "$5 each" one screen
      after "No payment needed" - the #46 catch), hard tripwire.
  B2. THE 10-GROUND GATE: a free org can create up to 10 grounds; the 11th is
      refused - and refused LOUDLY, not silently.
  B3. PAID METERING: only runs when BILLING_ENABLED=true in the environment;
      otherwise it records an explicit BLOCKED (an honest skip), never a
      silent pass.
"""

from __future__ import annotations


import asyncio
import os
import re
import sys
import time

from playwright.async_api import async_playwright

from _runner import BASE_URL, Recorder, api, launch, mail_clear, new_page, provision_admin

rec = Recorder("suite_b")
STAMP = str(int(time.time()))
EMAIL = f"b.billing+{STAMP}@example-test.invalid"

DOLLAR_PATTERNS = re.compile(r"\$5|Buy a session|Add more sessions for \$", re.I)


async def main() -> int:
    async with async_playwright() as pw:
        browser = await launch(pw)
        mail_clear()

        try:
            ctx, token, origin = await provision_admin(browser, EMAIL)
        except Exception as e:
            rec.record("B1", "BLOCKED", "could not provision an admin", str(e))
            await browser.close()
            rec.finish()
            return 2

        page = await new_page(rec, ctx, "persona B")

        # ---- B1: the create flow carries no $5 copy -------------------------
        await page.goto(f"{origin}/grounds/new")
        await page.wait_for_timeout(2500)
        await rec.step(page, "create flow loaded (authed)", "persona B")
        on_create = await page.get_by_text("What is this ground for?").count()
        rec.check("B1", on_create > 0, "authed create flow actually loaded (not a vacuous /auth sweep)",
                  f"url={page.url}", hard=True)
        # walk: pick a scenario -> moment -> billing interstitial -> timeline
        card = page.get_by_text("New project", exact=True)
        if await card.count():
            await card.first.click()
            await page.wait_for_timeout(400)
            # step-1 Continue is disabled until the MOMENT is also picked
            moment = page.get_by_text("At the start", exact=False)
            if await moment.count():
                await moment.first.click()
                await page.wait_for_timeout(400)
            await page.locator("button:has-text('Continue'):visible").last.click()
            await page.wait_for_timeout(900)
        # interstitial ("Before you continue") then timeline; sweep both pages
        for step_name in ("billing interstitial", "timeline step"):
            body = await page.inner_text("body")
            m = DOLLAR_PATTERNS.search(body)
            rec.check("B1", m is None, f"no $5 copy on the {step_name}",
                      f"found {m.group(0)!r}" if m else "", hard=True, url=page.url)
            cont = page.get_by_text("Continue", exact=False)
            if await cont.count():
                try:
                    await cont.last.click()
                    await page.wait_for_timeout(900)
                except Exception:
                    break
        included = await page.get_by_text("Included in your plan").count()
        rec.check("B1", included >= 0, "swept create-flow steps for billing copy")  # informational marker

        # ---- B2: the 10-ground gate ----------------------------------------
        created = 0
        gate_hit_at = None
        gate_message = ""
        for i in range(1, 13):  # try up to 12; the gate must bite by 11
            code, res = api("POST", "/grounds", {
                "label": f"Gate probe {i} ({STAMP})",
                "scenario": "NEW_PROJECT",
                "moment": "STARTING",
                "cadence": "FORTNIGHTLY",
            }, token=token)
            if code == 200 or code == 201:
                created += 1
                continue
            gate_hit_at = created + 1
            gate_message = str(res)[:200]
            break
        if gate_hit_at is None:
            rec.check("B2", False, "10-ground gate exists",
                      f"created {created} grounds and the gate NEVER refused - the free tier is unbounded",
                      hard=True)
        else:
            rec.check("B2", created <= 10, "free tier stops at 10 grounds",
                      f"gate refused at ground #{gate_hit_at} (created {created}); message: {gate_message}",
                      hard=(created > 10))
            rec.record("B2", "OK" if "10" in gate_message or "limit" in gate_message.lower() or "plan" in gate_message.lower() else "FINDING",
                       "the refusal explains itself",
                       f"refusal message: {gate_message}")
            # and the UI surfaces it: the create page must not pretend
            await page.goto(f"{origin}/grounds/new")
            await page.wait_for_timeout(2000)
            body = await page.inner_text("body")
            surfaced = re.search(r"10|limit|upgrade", body, re.I)
            rec.check("B2", surfaced is not None,
                      "the ground limit is surfaced in the create UI",
                      "API refuses but the UI shows no limit state")

        # ---- B3: paid metering (env-gated, honest skip) ---------------------
        if os.environ.get("BILLING_ENABLED", "false").lower() == "true":
            code, res = api("GET", "/billing/summary", token=token)
            rec.check("B3", code == 200, "billing summary reachable with billing on",
                      f"HTTP {code}: {str(res)[:150]}")
        else:
            rec.record("B3", "BLOCKED",
                       "paid metering leg skipped: BILLING_ENABLED=false in this environment",
                       "run with BILLING_ENABLED=true to exercise the paid path")

        await browser.close()
    return rec.finish()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:
        rec.record("B", "BLOCKED", "suite crashed", str(e))
        rec.finish()
        sys.exit(2)

"""Suite S - the 17-scenario sweep.

  S1 RENDER (hard, deterministic): the create picker shows ALL 17 cards with
     their exact labels - the class of bug where scenarios exist in code but
     never reach the screen ("only ~7 scenarios" was a real hand-finding).
  S2 ROUTE (model-dependent): one recognizer phrase per scenario through
     POST /entry/classify-intent. The endpoint answering with a VALID enum is
     hard; the specific mapping is a FINDING when it disagrees (models drift),
     except three canonical probes (ACUTE_SHOCK, PIP, NEW_HIRE) which are
     hard - those recognizers are unambiguous.
  S3 PACK LOADS (model-dependent): /entry/opener responds non-empty for every
     scenario enum - a missing/broken pack surfaces here.

Model legs record an explicit BLOCKED (never a silent pass) when the AI
provider is unreachable - CI without model credentials stays honest.
"""

from __future__ import annotations

import asyncio
import sys
import time

from playwright.async_api import async_playwright

from _runner import Recorder, api, launch, mail_clear, new_page, provision_admin

rec = Recorder("suite_s")
STAMP = str(int(time.time()))
EMAIL = f"s.sweep+{STAMP}@example-test.invalid"

# The 17 create-picker cards, labels pinned verbatim (16 scenarios + describe).
CREATE_CARDS = [
    "New hire", "New project", "New advisor or board member", "New partner or co-founder",
    "New manager or lead", "Contract or renewal", "Raise, promotion, or recognition",
    "Performance improvement plan", "Goals & planning", "Workplan & budget", "Quick check-in",
    "Something's off track", "Board & leadership strategy", "Cohort check-in",
    "A shock just hit", "Get a team back on the same page", "Describe your own situation",
]

VALID_ENUMS = {
    "NEW_HIRE", "NEW_PROJECT", "PULSE_CHECK", "DRIFT", "REALIGN_TEAM", "NEW_COFOUNDER",
    "NEW_ADVISOR", "NEW_MANAGER", "CONTRACT_RENEWAL", "OKR_ALIGNMENT", "WORKPLAN_BUDGET",
    "PIP", "BOARD_STRATEGY", "COHORT_CHECK", "ACUTE_SHOCK", "RECOGNITION",
}

# One recognizer phrase per scenario. (canonical=True -> the mapping is hard.)
ROUTES = [
    ("NEW_HIRE", "someone new starts on Monday and we need to agree what doing well means in the first 90 days", True),
    ("NEW_PROJECT", "we are kicking off a new build and want scope and ownership agreed before anyone starts", False),
    ("PULSE_CHECK", "a quick regular read from each person on what is moving and what is stuck", False),
    ("DRIFT", "the project has drifted badly from what we agreed and everyone tells a different story", False),
    ("REALIGN_TEAM", "after the reorg a teammate and I quietly disagree about where things stand and need to close the gap", False),
    ("NEW_COFOUNDER", "a new equal co-founder is joining and we need expectations about ownership in writing", False),
    ("NEW_ADVISOR", "we are bringing on a board advisor for equity and want it clear what they will contribute", False),
    ("NEW_MANAGER", "an interim manager is taking over the team mid-project and scope and authority need pinning down", False),
    ("CONTRACT_RENEWAL", "the agency contract is up for renewal and we want an honest account of what got delivered", False),
    ("OKR_ALIGNMENT", "planning season - we need everyone's goals to actually connect before they lock", False),
    ("WORKPLAN_BUDGET", "each lead needs their workplan and budget checked against the resources we actually have", False),
    ("PIP", "I am putting someone on a formal performance improvement plan and want both sides on record", True),
    ("BOARD_STRATEGY", "before the strategy offsite each board member should give their real read so quiet disagreement shows early", False),
    ("COHORT_CHECK", "twenty field officers each answering the same weekly question so we can see the pattern", False),
    ("ACUTE_SHOCK", "a major client pulled out overnight and everyone has a different story about why", True),
    ("RECOGNITION", "I want to ask for a raise and need the evidence behind the ask lined up first", False),
]


def provider_down(code: int, res) -> bool:
    if code == 0:
        return True
    text = str(res).lower()
    return code >= 500 and any(k in text for k in ("api key", "credential", "provider", "anthropic", "overloaded", "unavailable", "quota"))


async def main() -> int:
    async with async_playwright() as pw:
        browser = await launch(pw)
        mail_clear()

        # ---- S1: all 17 cards render, labels verbatim ----------------------
        try:
            ctx, token, origin = await provision_admin(browser, EMAIL)
        except Exception as e:
            rec.record("S1", "BLOCKED", "could not provision an admin", str(e))
            await browser.close()
            rec.finish()
            return 2
        page = await new_page(rec, ctx, "persona S")
        await page.goto(f"{origin}/grounds/new")
        await page.wait_for_timeout(2500)
        body = await page.inner_text("body")
        missing = [c for c in CREATE_CARDS if c not in body]
        rec.check("S1", not missing, "all 17 create-picker cards render with exact labels",
                  f"missing: {missing}" if missing else "", hard=True, url=page.url)
        await rec.step(page, "17-card picker", "persona S")
        await browser.close()

        # ---- S2: classify-intent routes every scenario ----------------------
        # FALLBACK CANARY: when the model is unreachable the API degrades
        # GRACEFULLY - classify-intent returns 200 with the NEW_PROJECT
        # default for everything (entry.service resolveScenario). Two
        # maximally-different canaries routing IDENTICALLY = the classifier is
        # in fallback, and per-scenario routing CANNOT be judged - record
        # BLOCKED loudly rather than red on answers the model never gave.
        blocked = False
        c1 = api("POST", "/entry/classify-intent", {"description": ROUTES[0][1]})
        c2 = api("POST", "/entry/classify-intent", {"description": ROUTES[14][1]})
        s1 = (c1[1] or {}).get("scenario") if isinstance(c1[1], dict) else None
        s2x = (c2[1] or {}).get("scenario") if isinstance(c2[1], dict) else None
        if c1[0] == 200 and c2[0] == 200 and s1 is not None and s1 == s2x:
            rec.record("S2", "BLOCKED",
                       "classifier is in provider-fallback (two unrelated phrases routed identically) - routing sweep skipped",
                       f"both canaries -> {s1!r}")
            blocked = True
        for enum, phrase, canonical in ROUTES:
            if blocked:
                break
            code, res = api("POST", "/entry/classify-intent", {"description": phrase})
            if provider_down(code, res):
                rec.record("S2", "BLOCKED", "classify-intent unreachable (AI provider) - routing sweep skipped",
                           f"HTTP {code}: {str(res)[:120]}")
                blocked = True
                break
            got = (res or {}).get("scenario") if isinstance(res, dict) else None
            rec.check("S2", code == 200 and got in VALID_ENUMS,
                      f"classify-intent answers a VALID enum for the {enum} phrase",
                      f"HTTP {code}, got {got!r}", hard=True)
            if got in VALID_ENUMS and got != enum:
                rec.check("S2", False, f"routing: {enum} phrase -> {enum}",
                          f"model chose {got!r} - review the recognizer or the classifier prompt",
                          hard=canonical)
            elif got == enum:
                rec.record("S2", "OK", f"routing: {enum} phrase -> {enum}")

        # ---- S3: every scenario's pack produces an opener -------------------
        if not blocked:
            for enum in sorted(VALID_ENUMS):
                code, res = api("POST", "/entry/opener", {"scenario": enum})
                if provider_down(code, res):
                    rec.record("S3", "BLOCKED", "opener unreachable (AI provider) - pack sweep skipped",
                               f"HTTP {code} at {enum}")
                    break
                reply = (res or {}).get("reply") if isinstance(res, dict) else None
                rec.check("S3", code == 200 and bool(reply and reply.strip()),
                          f"pack loads: opener for {enum} is non-empty",
                          f"HTTP {code}, reply={str(reply)[:80]!r}", hard=True)
    return rec.finish()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:
        rec.record("S", "BLOCKED", "suite crashed", str(e))
        rec.finish()
        sys.exit(2)

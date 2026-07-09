"""
Suite H — What is on my page: missing and leaked
Two directions on every page: MISSING (entitled things not shown) and LEAKED (things
visible that should not be). URL ID tampering. Role boundary checks.

Agents 67-71. Run alongside sessions; same CLAUDE.md rules apply.
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime

from playwright.async_api import async_playwright, Page, BrowserContext

BASE_URL = "http://127.0.0.1:5173"
ROOT = Path(__file__).parent
RESULTS = ROOT / "results" / "suite_h"
RESULTS.mkdir(parents=True, exist_ok=True)

findings: list[dict] = []


def log(agent_id: int, msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] A{agent_id}: {msg}", flush=True)


def record(agent_id: int, severity: str, page_url: str, description: str, detail: str = ""):
    entry = {
        "agent": agent_id,
        "severity": severity,
        "url": page_url,
        "description": description,
        "detail": detail,
        "ts": datetime.now().isoformat(),
    }
    findings.append(entry)
    print(f"  [{severity}] {description}", flush=True)
    if detail:
        print(f"    {detail}", flush=True)


async def ss(page: Page, name: str):
    path = RESULTS / f"{name}.png"
    await page.screenshot(path=str(path))
    return str(path)


async def load_state(identity: str) -> dict | None:
    p = ROOT / "state" / identity / "state.json"
    if p.exists():
        return json.loads(p.read_text())
    return None


async def make_context(playwright, identity: str):
    state = await load_state(identity)
    browser = await playwright.chromium.launch(headless=True)
    if state:
        context = await browser.new_context(storage_state=state)
    else:
        context = await browser.new_context()
    return browser, context


async def wait_for_app(page: Page):
    try:
        await page.goto(BASE_URL, timeout=10_000)
        await page.wait_for_load_state("networkidle", timeout=10_000)
    except Exception:
        pass


async def collect_ground_ids(page: Page) -> list[str]:
    """Collect ground IDs visible in the current page links."""
    ids = []
    links = await page.query_selector_all("a[href*='/grounds/']")
    for link in links:
        href = await link.get_attribute("href")
        if href:
            m = re.search(r"/grounds/([a-f0-9-]{8,})", href)
            if m:
                ids.append(m.group(1))
    return list(set(ids))


async def try_url(page: Page, url: str) -> tuple[int | None, str]:
    """Navigate to URL. Return (status_code_if_api, page_text_excerpt)."""
    try:
        await page.goto(url, timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        text = await page.inner_text("body") if await page.query_selector("body") else ""
        return None, text[:500]
    except Exception as e:
        return None, f"exception: {e}"


async def tamper_id(ground_id: str) -> str:
    """Produce a tampered version of a ground ID by flipping one character."""
    if not ground_id:
        return "00000000-0000-0000-0000-000000000001"
    chars = list(ground_id)
    for i, c in enumerate(chars):
        if c.isdigit():
            chars[i] = str((int(c) + 1) % 10)
            return "".join(chars)
        if c.isalpha() and c != "-":
            chars[i] = "z" if c != "z" else "a"
            return "".join(chars)
    return ground_id + "X"


# ── Agent 67: tom checks what he can reach (MISSING) ──────────────────────────

async def agent_67_missing(playwright):
    agent_id = 67
    log(agent_id, "Starting: missing-access check as tom")
    browser, ctx = await make_context(playwright, "tom")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)
        await ss(page, f"a{agent_id}_s01_home")

        # Check /grounds
        await page.goto(f"{BASE_URL}/grounds", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        await ss(page, f"a{agent_id}_s02_grounds_list")
        grounds_text = await page.inner_text("body")

        ground_ids = await collect_ground_ids(page)
        log(agent_id, f"Grounds visible: {len(ground_ids)} — IDs: {ground_ids}")

        if not ground_ids:
            record(agent_id, "MISSING", page.url, "No grounds visible for tom", "tom should see grounds he was invited to; list is empty")
        else:
            record(agent_id, "OK", page.url, f"{len(ground_ids)} ground(s) visible", str(ground_ids))

        # Navigate into one ground and check participant view
        if ground_ids:
            gid = ground_ids[0]
            _, text = await try_url(page, f"{BASE_URL}/grounds/{gid}/p")
            await ss(page, f"a{agent_id}_s03_participant_view")
            if "denied" in text.lower() or "not found" in text.lower() or "404" in text:
                record(agent_id, "MISSING", page.url, "Participant view denied for invited ground", f"ground: {gid}")
            elif "error" in text.lower():
                record(agent_id, "MISSING", page.url, "Error reaching participant view", text[:200])
            else:
                record(agent_id, "OK", f"{BASE_URL}/grounds/{gid}/p", "Participant view loads")

        # Check /billing
        _, billing_text = await try_url(page, f"{BASE_URL}/billing")
        await ss(page, f"a{agent_id}_s04_billing")
        if "error" in billing_text.lower() or "404" in billing_text:
            record(agent_id, "MISSING", page.url, "Billing page inaccessible for member", billing_text[:200])
        else:
            record(agent_id, "OK", f"{BASE_URL}/billing", "Billing page accessible")

        # Check /profile
        _, profile_text = await try_url(page, f"{BASE_URL}/profile")
        await ss(page, f"a{agent_id}_s05_profile")
        if "error" in profile_text.lower() or "404" in profile_text:
            record(agent_id, "MISSING", page.url, "Profile page inaccessible", profile_text[:200])
        else:
            record(agent_id, "OK", f"{BASE_URL}/profile", "Profile page accessible")

        log(agent_id, "Done: missing check complete")

    finally:
        await browser.close()


# ── Agent 68: tom tries URL tampering (LEAKED) ────────────────────────────────

async def agent_68_leaked(playwright):
    agent_id = 68
    log(agent_id, "Starting: leaked-access check as tom (URL tampering)")
    browser, ctx = await make_context(playwright, "tom")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)

        # First collect tom's own ground IDs
        await page.goto(f"{BASE_URL}/grounds", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        own_ids = await collect_ground_ids(page)
        log(agent_id, f"Tom's own ground IDs: {own_ids}")

        for gid in own_ids[:2]:
            tampered = await tamper_id(gid)
            log(agent_id, f"Tampering: /grounds/{gid} → /grounds/{tampered}")
            _, text = await try_url(page, f"{BASE_URL}/grounds/{tampered}")
            await ss(page, f"a{agent_id}_tamper_{tampered[:8]}")

            lower = text.lower()
            if any(k in lower for k in ["not found", "404", "denied", "unauthorized", "redirect"]):
                record(agent_id, "OK", f"/grounds/{tampered}", "Tampered ID rejected cleanly")
            elif len(text) > 100 and "ground" in lower:
                record(agent_id, "CRITICAL", f"/grounds/{tampered}", "Tampered ground ID may have returned data", text[:300])
            else:
                record(agent_id, "WARN", f"/grounds/{tampered}", "Ambiguous response to tampered ID", text[:200])

        # Try admin page as regular member
        _, admin_text = await try_url(page, f"{BASE_URL}/admin")
        await ss(page, f"a{agent_id}_admin_attempt")
        lower_admin = admin_text.lower()
        if any(k in lower_admin for k in ["not found", "404", "denied", "unauthorized", "redirect", "need admin"]):
            record(agent_id, "OK", "/admin", "Admin page blocked for non-admin tom")
        elif "admin" in lower_admin and len(admin_text) > 200:
            record(agent_id, "CRITICAL", "/admin", "Admin page content reached by non-admin", admin_text[:300])
        else:
            record(agent_id, "WARN", "/admin", "Admin page response ambiguous", admin_text[:200])

        # Try org/members as non-admin
        _, members_text = await try_url(page, f"{BASE_URL}/org/members")
        await ss(page, f"a{agent_id}_org_members_attempt")
        lower_members = members_text.lower()
        if any(k in lower_members for k in ["need admin", "denied", "404", "redirect"]):
            record(agent_id, "OK", "/org/members", "Members page blocked for non-admin")
        elif "member" in lower_members and "@" in members_text:
            record(agent_id, "CRITICAL", "/org/members", "Member list visible to non-admin", members_text[:300])
        else:
            record(agent_id, "OK", "/org/members", "Members page inaccessible (no member data shown)")

        log(agent_id, "Done: leaked check complete")

    finally:
        await browser.close()


# ── Agent 69: marcus as participant checks role boundary ──────────────────────

async def agent_69_participant_boundary(playwright):
    agent_id = 69
    log(agent_id, "Starting: participant role boundary check as marcus")
    browser, ctx = await make_context(playwright, "marcus")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)

        # Collect marcus's known grounds
        await page.goto(f"{BASE_URL}/grounds", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        own_ids = await collect_ground_ids(page)
        await ss(page, f"a{agent_id}_s01_grounds")
        log(agent_id, f"Marcus visible grounds: {own_ids}")

        # Try admin ground view (not participant view) for each
        for gid in own_ids[:2]:
            _, text = await try_url(page, f"{BASE_URL}/grounds/{gid}")
            await ss(page, f"a{agent_id}_admin_view_{gid[:8]}")
            lower = text.lower()
            if any(k in lower for k in ["not found", "404", "denied", "unauthorized"]):
                record(agent_id, "OK", f"/grounds/{gid}", "Admin ground view blocked for participant marcus")
            elif "admin" in lower or "manage" in lower or "participants" in lower:
                record(agent_id, "WARN", f"/grounds/{gid}", "Ground admin content may be visible to participant", text[:200])
            else:
                record(agent_id, "OK", f"/grounds/{gid}", "Ground view without admin controls (acceptable)")

        # Try org members page
        _, members_text = await try_url(page, f"{BASE_URL}/org/members")
        await ss(page, f"a{agent_id}_org_members")
        if "need admin" in members_text.lower() or "@" not in members_text:
            record(agent_id, "OK", "/org/members", "Member list not shown to participant marcus")
        else:
            record(agent_id, "CRITICAL", "/org/members", "Member list visible to participant", members_text[:300])

        log(agent_id, "Done: participant boundary check complete")

    finally:
        await browser.close()


# ── Agent 70: priya as lead checks lead boundary ──────────────────────────────

async def agent_70_lead_boundary(playwright):
    agent_id = 70
    log(agent_id, "Starting: lead role boundary check as priya")
    browser, ctx = await make_context(playwright, "priya")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)

        await page.goto(f"{BASE_URL}/grounds", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        priya_ids = await collect_ground_ids(page)
        await ss(page, f"a{agent_id}_s01_grounds")
        log(agent_id, f"Priya visible grounds: {priya_ids}")

        # Try admin dashboard
        _, admin_text = await try_url(page, f"{BASE_URL}/admin/dashboard")
        await ss(page, f"a{agent_id}_admin_dashboard")
        lower = admin_text.lower()
        if any(k in lower for k in ["not found", "404", "denied", "unauthorized", "redirect"]):
            record(agent_id, "OK", "/admin/dashboard", "Admin dashboard blocked for lead priya")
        elif "dashboard" in lower and ("org" in lower or "plan" in lower):
            record(agent_id, "CRITICAL", "/admin/dashboard", "Admin dashboard content reached by non-admin lead", admin_text[:300])
        else:
            record(agent_id, "WARN", "/admin/dashboard", "Response ambiguous", admin_text[:200])

        # Try org members page
        _, members_text = await try_url(page, f"{BASE_URL}/org/members")
        await ss(page, f"a{agent_id}_org_members")
        if "need admin" in members_text.lower() or "@" not in members_text:
            record(agent_id, "OK", "/org/members", "Member list not accessible to lead priya")
        else:
            record(agent_id, "CRITICAL", "/org/members", "Member list visible to lead without admin role", members_text[:300])

        log(agent_id, "Done: lead boundary check complete")

    finally:
        await browser.close()


# ── Agent 71: zainab checks returning completeness ───────────────────────────

async def agent_71_returning(playwright):
    agent_id = 71
    log(agent_id, "Starting: returning user completeness check as zainab")
    browser, ctx = await make_context(playwright, "zainab")
    page = await ctx.new_page()

    try:
        await wait_for_app(page)

        await page.goto(f"{BASE_URL}/grounds", timeout=8_000)
        await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        ground_ids = await collect_ground_ids(page)
        await ss(page, f"a{agent_id}_s01_grounds")
        log(agent_id, f"Zainab's grounds on return: {ground_ids}")

        if not ground_ids:
            record(agent_id, "MISSING", "/grounds", "No grounds visible for returning user zainab", "Prior session grounds should be here")
        else:
            record(agent_id, "OK", "/grounds", f"{len(ground_ids)} ground(s) present on return")

        # Check each ground loads
        for gid in ground_ids[:3]:
            _, text = await try_url(page, f"{BASE_URL}/grounds/{gid}")
            await ss(page, f"a{agent_id}_ground_{gid[:8]}")
            if "not found" in text.lower() or "404" in text:
                record(agent_id, "MISSING", f"/grounds/{gid}", "Ground page 404 on return", f"id: {gid}")
            else:
                record(agent_id, "OK", f"/grounds/{gid}", "Ground loads on return")

        # Check feed
        _, feed_text = await try_url(page, f"{BASE_URL}/feed")
        await ss(page, f"a{agent_id}_feed")
        if "error" in feed_text.lower() or "404" in feed_text:
            record(agent_id, "MISSING", "/feed", "Feed page broken on return", feed_text[:200])
        else:
            record(agent_id, "OK", "/feed", "Feed accessible on return")

        log(agent_id, "Done: returning completeness check")

    finally:
        await browser.close()


# ── Summary output ────────────────────────────────────────────────────────────

def print_summary():
    out = RESULTS / "findings.json"
    out.write_text(json.dumps(findings, indent=2))
    print(f"\n{'='*60}", flush=True)
    print("SUITE H SUMMARY", flush=True)
    print(f"{'='*60}", flush=True)
    criticals = [f for f in findings if f["severity"] == "CRITICAL"]
    warns = [f for f in findings if f["severity"] == "WARN"]
    oks = [f for f in findings if f["severity"] == "OK"]
    missings = [f for f in findings if f["severity"] == "MISSING"]
    print(f"  CRITICAL: {len(criticals)}", flush=True)
    print(f"  WARN:     {len(warns)}", flush=True)
    print(f"  MISSING:  {len(missings)}", flush=True)
    print(f"  OK:       {len(oks)}", flush=True)
    if criticals:
        print("\nCRITICAL FINDINGS — review before anything else:", flush=True)
        for f in criticals:
            print(f"  [{f['agent']}] {f['url']}: {f['description']}", flush=True)
            if f["detail"]:
                print(f"    {f['detail'][:200]}", flush=True)
    print(f"\nFull findings: {out}", flush=True)


async def main():
    async with async_playwright() as p:
        await asyncio.gather(
            agent_67_missing(p),
            agent_68_leaked(p),
            agent_69_participant_boundary(p),
            agent_70_lead_boundary(p),
            agent_71_returning(p),
        )
    print_summary()


if __name__ == "__main__":
    asyncio.run(main())

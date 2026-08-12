"""The self-test meta-suite (spec 6) - runs FIRST every night.

For each CRITICAL guard: deliberately break the guarded thing, confirm the
guard's suite goes red, restore, confirm green. A guard that does not bite
aborts the whole overnight run RED ("guard N no longer bites") - a suite that
cannot prove it bites is a false green waiting to happen.

Every sabotage here is one proven live during the build cycle; this file just
runs them forever. Sabotages are DATA- or ENV-level only - product code is
never touched (spec 8).
"""

from __future__ import annotations

import os
import shutil
import smtplib
import subprocess
import sys
import time
import urllib.request
from email.mime.text import MIMEText
from pathlib import Path

HERE = Path(__file__).parent.parent  # groundwork_local_test/
PSQL = os.environ.get("GW_TEST_DB", "postgresql://localhost/groundwork")


def set_db(url: str):
    global PSQL
    PSQL = url
    os.environ["GW_TEST_DB"] = url
MAIL = os.environ.get("MAIL_BASE", "http://127.0.0.1:1080")


def sql(q: str) -> str:
    r = subprocess.run(["psql", PSQL, "-tAc", q], capture_output=True, text=True, timeout=30)
    return r.stdout.strip()


def run_suite(name: str, env: dict | None = None, timeout: int = 420) -> int:
    e = {**os.environ, **(env or {})}
    r = subprocess.run([sys.executable, str(HERE / name)], env=e, cwd=str(HERE),
                       capture_output=True, text=True, timeout=timeout)
    return r.returncode


class Guard:
    """One break -> expect-red -> restore -> expect-green cycle."""

    def __init__(self, name: str, suite: str, brk, restore, env: dict | None = None,
                 fast_env: dict | None = None, needs_model: bool = False,
                 landed=None):
        self.name = name
        self.suite = suite
        self.brk = brk
        self.restore = restore
        self.env = env or {}
        self.fast_env = fast_env or {}
        self.needs_model = needs_model
        # Optional: did the sabotage actually change anything? A sabotage that
        # matched nothing produces a green suite, which is indistinguishable from a
        # guard that has stopped biting - and it aborted a whole nightly run being
        # reported as the latter. When this says no, the finding is the sabotage.
        self.landed = landed

    def check(self) -> dict:
        bit = False
        try:
            ctx = self.brk() if self.brk else None
            code_broken = run_suite(self.suite, {**self.env, **self.fast_env})
            bit = code_broken != 0
        finally:
            if self.restore:
                self.restore(ctx if 'ctx' in dir() else None)
        # HONEST ENV-SKIP: a guard whose detector needs a live model cannot be
        # judged where the provider is unreachable (CI without credentials).
        # That is an environment limit, not a rotted guard - report SKIPPED
        # (excluded from all_bit) rather than a false NO BITE that would abort
        # every nightly run.
        if not bit and self.needs_model and provider_unreachable(self.suite):
            return {"name": self.name, "suite": self.suite, "bit": None,
                    "skipped": "provider unreachable in this environment"}
        # A SABOTAGE THAT CHANGED NOTHING IS NOT A GUARD THAT STOPPED BITING.
        # Reported as its own failure, by name, because the two look identical from
        # the suite's exit code and one of them wasted a night's run.
        if not bit and self.landed and not self.landed():
            return {"name": self.name + "  [the SABOTAGE matched nothing - fix the sabotage, not the guard]",
                    "suite": self.suite, "bit": False, "sabotage_missed": True}
        return {"name": self.name, "suite": self.suite, "bit": bit}




def provider_unreachable(suite_file: str) -> bool:
    """True when the suite's own findings say its model legs were BLOCKED
    because the AI provider is unreachable - the guard is then unjudgeable
    here, not broken."""
    import json
    rec_dir = {"run_suite_a_adversarial.py": "suite_a", "run_suite_s_scenarios.py": "suite_s"}.get(suite_file)
    if not rec_dir:
        return False
    f = HERE / "results" / rec_dir / "findings.json"
    if not f.exists():
        return False
    try:
        rows = json.loads(f.read_text())
        rows = rows if isinstance(rows, list) else rows.get("findings", [])
    except Exception:
        return False
    return any(r.get("severity") == "BLOCKED" and "provider" in (r.get("summary", "") + r.get("check", "")).lower()
               for r in rows)


# ---- the sabotages (each one proven live during the build cycle) ------------
#
# EVERY SABOTAGE COUNTS THE ROWS IT TOUCHED.
#
# A sabotage that matches nothing produces a green suite, and a green suite under
# sabotage is reported as "the guard no longer bites". The two are indistinguishable
# from an exit code, they have opposite fixes, and both have now happened here in one
# day: the class-2 label sabotage matched nothing in CI, and the class-1 draft
# sabotage was found to have been matching nothing while the guard "bit" on an
# unrelated pre-existing failure in the same suite. That second one is the dangerous
# shape - a guard passing its own self-test for a reason that has nothing to do with
# what it guards.
#
# So the loops write a running total of affected rows, and Guard reads it. Nothing
# here judges the product; it judges whether the sabotage happened at all.

HITS_DIR = HERE / "results"


def _hits_file(name: str) -> Path:
    return HITS_DIR / f".selftest-{name}-hits"


def _counting_loop(name: str, statement: str, sleep: float, seconds: int = 400, wrap: bool = True):
    """
    Run a data-modifying statement on a loop, recording rows affected.

    With `wrap` (the default) the statement is a single data-modifying statement and
    is run as `with u as (<statement> returning 1) select count(*) from u`.

    With `wrap=False` the statement must ALREADY be a complete query returning one
    number - needed when the sabotage touches more than one table, since a statement
    with its own CTEs cannot be nested inside the wrapper. Getting that wrong is a
    silent no-op: psql errors go to /dev/null, the count stays 0, and the guard
    reports the sabotage as having matched nothing.

    Any `$` in it must already be escaped for bash double quotes.
    """
    f = _hits_file(name)
    HITS_DIR.mkdir(parents=True, exist_ok=True)
    f.write_text("0")
    return subprocess.Popen(
        ["bash", "-c",
         f"END=$((SECONDS+{seconds})); TOTAL=0; while [ $SECONDS -lt $END ]; do "
         f"N=$(psql '{PSQL}' -tAc \"{statement if not wrap else 'with u as (' + statement + ' returning 1) select count(*) from u'};\" 2>/dev/null); "
         f"TOTAL=$((TOTAL+${{N:-0}})); printf %s \"$TOTAL\" > '{f}'; "
         f"sleep {sleep}; done"],
    )


def _landed(name: str):
    def check() -> bool:
        try:
            return int((_hits_file(name).read_text() or "0").strip() or "0") > 0
        except Exception:
            return False
    return check


def break_drafts_start():
    """
    Vanish signature: a background loop deletes the saved anonymous session as it is
    written, so suite V's cross-context commit finds nothing server-side.

    IT WAS DELETING THE WRONG TABLE, and had been since GW-001 changed where a saved
    session lives. For a NEW address - which is every suite V run, since the fixture
    is timestamped - nothing is created until the magic link is opened: the whole
    session waits in `pending_signups`, keyed to the verification token. `entry_drafts`
    only holds sessions for addresses that already have an account.

    So the loop deleted rows (the counter proved it landed, on leftovers from other
    fixtures) while suite V's own session sat untouched in another table. Suite V
    passed, correctly, and the self-test read that as the guard having rotted. Exactly
    the class-2 failure again: a sabotage aimed at where the product used to keep
    something.

    Both tables now, so the sabotage survives whichever path a fixture takes.

    THIS GUARD WAS BITING FOR THE WRONG REASON. Suite V had three pre-existing
    criticals about the invite queue, so it exited non-zero whatever this sabotage
    did - and "suite went red" is the whole test. The moment those criticals were
    fixed, the guard reported NO BITE, which is how the sabotage's own reach came
    into question at all. It had been proving nothing about draft deletion for as
    long as those criticals existed.

    Now counted, so the next run says which of the two it is: a sabotage that
    matches no rows, or a suite that does not notice its data being deleted.
    """
    return _counting_loop(
        "drafts",
        "with a as (delete from entry_drafts using users where entry_drafts.user_id=users.id "
        "and users.email like '%example-test.invalid%' returning 1), "
        "b as (delete from pending_signups where email like '%example-test.invalid%' returning 1) "
        "select (select count(*) from a) + (select count(*) from b)",
        sleep=0.5,
        wrap=False,
    )


def break_drafts_stop(proc):
    if proc:
        proc.terminate()


SABOTAGE_SUFFIX = " - Add a session for $5"

# THE SUFFIX GOES INTO A BASH DOUBLE-QUOTED STRING, WHERE `$5` IS POSITIONAL
# PARAMETER 5 AND EXPANDS TO NOTHING. The original sabotage escaped it for exactly
# this reason and my rewrite dropped the escape, which produced a loop that looked
# busy and did nothing: it appended " - Add a session for " with no marker, so the
# "not already marked" test matched every row again, and it rewrote all 226 grounds
# three times a second while zero of them ever carried '$5'. Caught only by watching
# the row count instead of the loop's own tally - the tally said 2712 rewrites and
# the truth was none that mattered.
BASH_SAFE_SUFFIX = SABOTAGE_SUFFIX.replace("$", "\\$")


def break_labels_start():
    """
    Banned-string signature: put '$5' into the label of the ground suite M is
    looking at, so the wrongful-gate tripwire sees paywall copy in rendered
    content (suite M's own grep).

    IT USED TO MATCH ON `label='My first ground'`, WHICH IS A GUESS ABOUT WHAT THE
    SUITE WILL CREATE. That label does still exist in a long-lived dev database (118
    rows here), which is exactly what makes the old form untrustworthy: it works
    locally off accumulated data and lands on nothing in CI, where the database is
    fresh and holds only what suite M provisions on this run. A sabotage whose reach
    depends on leftovers is a sabotage that reports differently in the two places it
    runs.

    So it stops naming a ground. It appends the marker to every ground not already
    carrying it, which needs no assumption about naming, and it counts the rows it
    rewrote so that landing on nothing is reported as landing on nothing rather than
    as a guard that has stopped biting.
    """
    return _counting_loop(
        "labels",
        f"update grounds set label=label||'{BASH_SAFE_SUFFIX}' where label not like '%\\$5%'",
        sleep=0.3,
    )


def break_labels_stop(proc):
    if proc:
        proc.terminate()
    subprocess.run(["psql", PSQL, "-qc",
                    f"update grounds set label=replace(label, '{SABOTAGE_SUFFIX}', '') where label like '%$5%';"],
                   capture_output=True)


def break_free_ground_charge_start():
    """Wrongful-charge signature: flip is_free_ground to false on suite B's own
    'Gate probe' grounds while it runs, so purchase-session's isFreeGround
    guard sees a (falsely) non-free ground and allows the charge through -
    proving suite B's B4 tripwire is actually reading live ground state, not
    a hardcoded assumption, the same shape as class 2's label sabotage."""
    proc = subprocess.Popen(
        ["bash", "-c",
         f"END=$((SECONDS+400)); while [ $SECONDS -lt $END ]; do "
         f"psql '{PSQL}' -qc \"update grounds set is_free_ground=false where label like 'Gate probe%';\" 2>/dev/null; "
         f"sleep 0.3; done"],
    )
    return proc


def break_free_ground_charge_stop(proc):
    if proc:
        proc.terminate()
    subprocess.run(["psql", PSQL, "-qc",
                    "update grounds set is_free_ground=true where label like 'Gate probe%';"],
                   capture_output=True)


def break_mail_emdash_start():
    """House-style signature: inject an em-dash email; suite A's typography
    gate over captured mail must red."""
    m = MIMEText('<p>Beware — this email carries an em dash.</p>', 'html')
    m['Subject'] = 'selftest emdash'
    m['From'] = 'selftest@example-test.invalid'
    m['To'] = 'selftest.target@example-test.invalid'
    s = smtplib.SMTP('127.0.0.1', 1025, timeout=10)
    s.send_message(m)
    s.quit()
    return None


def break_mail_emdash_stop(_):
    try:
        urllib.request.urlopen(urllib.request.Request(f"{MAIL}/clear", method="POST"), timeout=10)
    except Exception:
        pass


def break_banned_phrase_start():
    """Detector-wiring signature: GW_A_EXTRA_BANNED='the' makes suite A's
    decision-push detector red on any live model reply - proving the detector
    reads real content. (Applied via env, nothing to undo.)"""
    return None


def noop(_=None):
    return None




def seed_ground_via_api() -> str | None:
    """Fresh-DB runs have no grounds before the suites; the DOM guard seeds
    one through the REAL entry flow (entry-save with a server draft -> magic
    link from the mailcatcher -> verify -> commit). Pure HTTP - no shortcuts
    into the DB."""
    sys.path.insert(0, str(HERE))
    from _runner import api, mail_link  # noqa: PLC0415
    stamp = int(time.time())
    email = f"domprobe+{stamp}@example-test.invalid"
    code, _ = api("POST", "/auth/entry-save", {
        "email": email,
        "draft": {
            "payload": {"groundLabel": f"DOM probe ground {stamp}", "contributors": []},
            "history": [{"role": "assistant", "content": "What brings you here?"},
                         {"role": "user", "content": "Seeding the DOM probe ground."}],
        },
    })
    if code not in (200, 201):
        return None
    link = mail_link(email, timeout_s=20)
    if not link or "token=" not in link:
        return None
    token = link.split("token=")[1].split("&")[0]
    code, res = api("POST", "/auth/verify-email", {"token": token})
    if code not in (200, 201) or not isinstance(res, dict):
        return None
    access = res.get("accessToken") or (res.get("data") or {}).get("accessToken")
    code, res = api("POST", "/entry/commit", {"groundLabel": f"DOM probe ground {stamp}", "history": [], "contributors": []}, token=access)
    if code not in (200, 201) or not isinstance(res, dict):
        return None
    return res.get("groundId")


def dom_read_guard() -> dict:
    """Spec 1a: prove the harness reads the RENDERED DOM, not the API.
    Sabotage the DATA behind a rendered label (a ground's name) and confirm a
    DOM read through the real browser sees the change. If the browser read
    does not see it, the harness is reading something other than the screen."""
    marker = f"DOMPROBE-{int(time.time())}"
    gid = sql("select id from grounds order by created_at desc limit 1")
    if not gid:
        gid = seed_ground_via_api()
    if not gid:
        return {"name": "harness reads the rendered DOM (spec 1a)", "suite": "-", "bit": False}
    old = sql(f"select label from grounds where id='{gid}'")
    sql(f"update grounds set label='{marker}' where id='{gid}'")
    try:
        probe = subprocess.run(
            [sys.executable, "-c", f"""
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context()
        page = await ctx.new_page()
        # the sidebar on /start renders ground labels for signed-out sessions
        # only after auth - use the join preview, which renders the label
        # publicly through the REAL client page
        token = {sql(f"select join_token from grounds where id='{gid}'")!r}
        await page.goto(f"http://localhost:5173/join?t={{token}}")
        await page.wait_for_timeout(2500)
        body = await page.inner_text('body')
        print('SEEN' if {marker!r} in body else 'NOT-SEEN')
        await b.close()
asyncio.run(main())
"""],
            capture_output=True, text=True, timeout=90, cwd=str(HERE),
        )
        bit = "SEEN" in probe.stdout
    finally:
        old_sql = old.replace("'", "''")
        sql(f"update grounds set label='{old_sql}' where id='{gid}'")
    return {"name": "harness reads the rendered DOM (spec 1a)", "suite": "join page", "bit": bit}


GUARDS = [
    Guard("class 1 data-loss: draft deletion reds suite V (vanish signature)",
          "run_suite_v_vanish.py", break_drafts_start, break_drafts_stop,
          landed=_landed("drafts")),
    Guard("class 2 wrongful-gate: '$5' in rendered content reds the tripwire",
          "run_suite_m_sessions.py", break_labels_start, break_labels_stop,
          landed=_landed("labels")),
    Guard("class 4 wrongful-charge: purchase-session allowing a flipped-non-free ground reds suite B",
          "run_suite_b_billing.py", break_free_ground_charge_start, break_free_ground_charge_stop),
    Guard("class 3 banned-string: em-dash email reds the typography gate",
          "run_suite_a_adversarial.py", break_mail_emdash_start, break_mail_emdash_stop),
    Guard("class 3 detector wiring: banned-phrase injection reds on a live reply",
          "run_suite_a_adversarial.py", break_banned_phrase_start, noop,
          env={"GW_A_EXTRA_BANNED": "the"}, needs_model=True),
]


def run_selftest(db_url: str | None = None) -> dict:
    if db_url:
        set_db(db_url)
    results = []
    for g in GUARDS:
        results.append(g.check())
    results.append(dom_read_guard())
    all_bit = all(r["bit"] is not False for r in results)
    return {"all_bit": all_bit, "guards": results}


if __name__ == "__main__":
    res = run_selftest()
    for r in res["guards"]:
        print(("BIT      " if r["bit"] else "NO BITE  ") + r["name"])
    print("ALL GUARDS BIT" if res["all_bit"] else "GUARD FAILURE - ABORT RED")
    sys.exit(0 if res["all_bit"] else 3)

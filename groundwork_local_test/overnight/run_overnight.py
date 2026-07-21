"""Overnight orchestrator (spec 0, 5, 9) - Phase B: two targets + the diff.

Order, per the contract:
  1. ENVIRONMENT - any boot failure ABORTS RED ("environment failed").
  2. SELF-TEST first - every critical guard must bite, else ABORT RED.
  3. SUITES in severity order per target: LOCAL (the working tree) first,
     then MAIN (a clean origin/main worktree) - each on the standard ports
     with its OWN fresh database, booted and torn down sequentially. The only
     variable between targets is the code.
  4. REPORT - both SHAs at the top, per-target headlines, and the DIFF:
     LOCAL-only (just-introduced regression or unmerged fix), MAIN-only
     (local ahead), ON BOTH (live on main - highest priority).

Modes:
  --target local (default): fast dev loop - reuses an already-healthy local
    stack and the dev database, exactly the Phase A behavior.
  --target both: the overnight mode - requires ports 3000/5173 free (it owns
    all process lifecycles), fresh DB per target.
  --suites run_suite_l_layout.py[,...]: subset, for fast proof runs.
"""

from __future__ import annotations

import argparse
import datetime
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent.parent  # groundwork_local_test/
sys.path.insert(0, str(Path(__file__).parent))
from report import Item, TargetReport, load_suite_findings, render  # noqa: E402
from selftest import run_selftest  # noqa: E402
from stack import Stack, ensure_mailcatcher, fresh_db, http_ok, port_busy, prepare_main_worktree, sh  # noqa: E402

SUITES = [
    ("run_suite_v_vanish.py", "suite_v", "1", False),
    ("run_suite_m_sessions.py", "suite_m", "2", False),
    ("run_suite_b_billing.py", "suite_b", "2", False),
    ("run_suite_l_layout.py", "suite_l", "6", False),
    ("run_suite_s_scenarios.py", "suite_s", "5", True),
    ("run_suite_r_roles.py", "suite_r", "4", False),
    ("run_suite_a_adversarial.py", "suite_a", "3", True),
    ("run_suite_j_journeys.py", "suite_j", "7", True),
]


def environment_check(db_url: str) -> list[str]:
    failures = []
    if not http_ok("http://127.0.0.1:3000/health"):
        failures.append("API not healthy at :3000")
    if not http_ok("http://127.0.0.1:5173"):
        failures.append("client not serving at :5173")
    if not http_ok("http://127.0.0.1:1080/health"):
        failures.append("mailcatcher not healthy at :1080 (the Phase-0 silent-crash bug class)")
    code, out = sh(["psql", db_url, "-tAc", "select 1"])
    if code != 0 or out.strip() != "1":
        failures.append(f"database not reachable: {out[:120]}")
    return failures


def clear_mail():
    try:
        urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:1080/clear", method="POST"), timeout=10)
    except Exception:
        pass


def run_suites(target: TargetReport, suites, out_dir: Path, db_url: str):
    """Run the suite list against the CURRENTLY BOOTED stack; collect findings
    and copy artifacts into the per-target dir before anything overwrites them.
    Phase C: GW_MODEL_TURN_BUDGET (per target) seeds a counter file; the
    model-driven suites take from it and record SKIPPED_BUDGET when it runs
    dry - an unattended nightly can never burn the API budget."""
    tdir = out_dir / target.target
    tdir.mkdir(parents=True, exist_ok=True)
    budget_env = {}
    budget = os.environ.get("GW_MODEL_TURN_BUDGET", "").strip()
    if budget:
        budget_file = tdir / "model_budget"
        budget_file.write_text(budget)
        budget_env["GW_MODEL_BUDGET_FILE"] = str(budget_file)
        print(f"[{target.target}] model-turn budget: {budget}")
    for suite, rec_dir, cls, _model in suites:
        print(f"[{target.target}] running {suite} (class {cls})...")
        # per-suite recorder dirs are wiped by the suite itself at start
        try:
            suite_timeout = 1800 if suite == "run_suite_j_journeys.py" else 900
            code, tail = sh([sys.executable, str(HERE / suite)],
                            cwd=HERE, env={"GW_TEST_DB": db_url, **budget_env}, timeout=suite_timeout)
        except subprocess.TimeoutExpired:
            target.items.append(Item(suite=suite, cls=cls, severity="CRITICAL",
                                     summary=f"{suite} timed out after 900s"))
            continue
        target.items.extend(load_suite_findings(HERE / "results", rec_dir, cls))
        if code == 2:
            target.items.append(Item(suite=suite, cls=cls, severity="CRITICAL",
                                     summary=f"{suite} crashed (exit 2)", repro=tail[-300:]))
        src = HERE / "results" / rec_dir
        if src.exists():
            shutil.copytree(src, tdir / rec_dir, dirs_exist_ok=True)


def abort_red(out_dir: Path, title: str, lines: list[str], code: int) -> int:
    (out_dir / "CRITICAL-ISSUES.md").write_text(f"# Overnight run ABORTED RED - {title}\n\n" +
                                                "\n".join(f"- {l}" for l in lines) + "\n")
    for l in lines:
        print(f"ABORT: {l}")
    print(f"ABORT RED: {title}")
    return code


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["local", "main", "both"], default="local")
    ap.add_argument("--suites", default="", help="comma-separated subset of suite files (proof runs)")
    ap.add_argument("--skip-selftest", action="store_true",
                    help="DANGEROUS: debugging the orchestrator only; a real run must never skip it")
    args = ap.parse_args()

    suites = SUITES
    if args.suites:
        wanted = set(args.suites.split(","))
        suites = [s for s in SUITES if s[0] in wanted]

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = HERE / "results" / f"overnight-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)
    _, local_sha = sh(["git", "rev-parse", "--short", "HEAD"])
    _, local_branch = sh(["git", "branch", "--show-current"])
    local_sha, local_branch = local_sha.strip(), (local_branch.strip() or "(detached)")
    print(f"OVERNIGHT RUN {stamp} | LOCAL {local_branch} @ {local_sha} | target={args.target}")

    if not ensure_mailcatcher():
        return abort_red(out_dir, "environment failed", ["mailcatcher would not start"], 2)

    local_stack = None
    main_stack = None
    selftest = None
    local_report = TargetReport(target="local", sha=local_sha, branch=local_branch)
    main_report = None

    try:
        # ---------------- LOCAL target ----------------
        if args.target in ("local", "both"):
            if args.target == "local" and http_ok("http://127.0.0.1:3000/health") and http_ok("http://127.0.0.1:5173"):
                db_url = os.environ.get("GW_TEST_DB", "postgresql://localhost/groundwork")  # dev fast loop / CI DB
                print("[local] reusing the already-running dev stack")
            else:
                if port_busy(3000) or port_busy(5173):
                    return abort_red(out_dir, "environment failed",
                                     ["ports 3000/5173 are busy with a stack this run does not own - stop the dev stack first"], 2)
                db_url = fresh_db("groundwork_overnight_local")
                local_stack = Stack(Path(__file__).parent.parent.parent, db_url, out_dir / "logs-local")
                print("[local] booting the working tree on a fresh DB...")
                failures = local_stack.boot()
                if failures:
                    return abort_red(out_dir, "environment failed", failures, 2)
            clear_mail()
            env_failures = environment_check(db_url)
            if env_failures:
                return abort_red(out_dir, "environment failed", env_failures, 2)

            if args.skip_selftest:
                selftest = {"all_bit": True, "guards": [], "skipped": "DEBUG ONLY"}
                print("WARNING: self-test SKIPPED - this run cannot be trusted as an overnight result")
            else:
                print("self-test: proving every critical guard still bites...")
                selftest = run_selftest(db_url=db_url)
                for g in selftest["guards"]:
                    print(("  BIT      " if g["bit"] else "  NO BITE  ") + g["name"])
                if not selftest["all_bit"]:
                    return abort_red(out_dir, "a guard no longer bites",
                                     [("BIT: " if g["bit"] else "NO BITE: ") + g["name"] for g in selftest["guards"]], 3)

            run_suites(local_report, suites, out_dir, db_url)
            if local_stack:
                local_stack.teardown()
                local_stack = None

        # ---------------- MAIN target ----------------
        if args.target in ("main", "both"):
            if port_busy(3000) or port_busy(5173):
                return abort_red(out_dir, "environment failed",
                                 ["ports 3000/5173 still busy before the MAIN target - refusing to run MAIN against a stack this run does not own"], 2)
            try:
                wt, main_sha = prepare_main_worktree(HERE / "results")
            except RuntimeError as e:
                return abort_red(out_dir, "main target is not clean origin/main", [str(e)], 2)
            db_url = fresh_db("groundwork_overnight_main")
            main_stack = Stack(wt, db_url, out_dir / "logs-main")
            print(f"[main] booting clean origin/main @ {main_sha} on a fresh DB...")
            failures = main_stack.boot()
            if failures:
                return abort_red(out_dir, "environment failed (main target)", failures, 2)
            clear_mail()
            env_failures = environment_check(db_url)
            if env_failures:
                return abort_red(out_dir, "environment failed (main target)", env_failures, 2)

            main_report = TargetReport(target="main", sha=main_sha, branch="origin/main")
            if selftest is None:  # main-only mode still needs the trust anchor
                print("self-test (against the MAIN stack)...")
                selftest = run_selftest(db_url=db_url)
                if not selftest["all_bit"]:
                    return abort_red(out_dir, "a guard no longer bites",
                                     [("BIT: " if g["bit"] else "NO BITE: ") + g["name"] for g in selftest["guards"]], 3)
            run_suites(main_report, suites, out_dir, db_url)
            main_stack.teardown()
            main_stack = None
    finally:
        for s in (local_stack, main_stack):
            if s:
                s.teardown()

    # PROVE-RED (Phase D): a clearly-labeled synthetic critical, used ONLY to
    # prove the notify path end to end. Never set on a real schedule.
    if os.environ.get("GW_PROVE_RED") == "1":
        local_report.items.append(Item(suite="prove-red", cls="meta", severity="CRITICAL",
                                       summary="PROVE-RED seeded critical - this run exists to prove the notify path fires",
                                       repro="dispatched with prove_red=true; not a product finding"))
        print("PROVE-RED: seeded a synthetic critical to exercise the notify path")

    # ---------------- report ----------------
    if args.target == "main" and main_report is not None:
        md, exit_code = render(main_report, None, selftest or {"all_bit": False, "guards": []}, out_dir)
    else:
        md, exit_code = render(local_report, main_report, selftest or {"all_bit": False, "guards": []}, out_dir)
    print(md)
    print(f"artifacts: {out_dir}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())

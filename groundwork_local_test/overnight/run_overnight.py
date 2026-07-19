"""Overnight orchestrator (spec 0, 5, 9) - Phase A skeleton.

Order, per the contract:
  1. ENVIRONMENT CHECK - API, client, mailcatcher, DB. Any failure ABORTS RED
     ("environment failed") - never green on zero tests.
  2. SELF-TEST - every critical guard must bite (selftest.py). A guard that
     does not bite aborts the run RED ("guard no longer bites").
  3. SUITES in severity order (class 1 first): V, M, B, L (model-free), then
     S, R, A (model legs record BLOCKED without credentials).
  4. REPORT - headline counts, ranked criticals, artifacts dir.

Targets: --target local (default) runs against the already-booted local
stack. --target main is Phase B work: clean origin/main worktree + own DB +
own boot; the report/diff plumbing (report.py) is already two-target aware.
"""

from __future__ import annotations

import argparse
import datetime
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent.parent  # groundwork_local_test/
sys.path.insert(0, str(Path(__file__).parent))
from report import Item, TargetReport, load_suite_findings, render  # noqa: E402
from selftest import run_selftest  # noqa: E402

# (suite file, issue class, model-driven?)
SUITES = [
    ("run_suite_v_vanish.py", "1", False),
    ("run_suite_m_sessions.py", "2", False),
    ("run_suite_b_billing.py", "2", False),
    ("run_suite_l_layout.py", "6", False),
    ("run_suite_s_scenarios.py", "5", True),
    ("run_suite_r_roles.py", "4", False),
    ("run_suite_a_adversarial.py", "3", True),
]


def http_ok(url: str, timeout: int = 5) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return 200 <= r.status < 300
    except Exception:
        return False


def sh(cmd: list[str], timeout: int = 60) -> tuple[int, str]:
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return r.returncode, (r.stdout + r.stderr).strip()


def environment_check() -> list[str]:
    """Every failure listed; ANY failure aborts red (spec 5)."""
    failures = []
    if not http_ok("http://127.0.0.1:3000/health"):
        failures.append("API not healthy at :3000")
    if not http_ok("http://127.0.0.1:5173"):
        failures.append("client not serving at :5173")
    if not http_ok("http://127.0.0.1:1080/health"):
        failures.append("mailcatcher not healthy at :1080 (the Phase-0 silent-crash bug class)")
    code, out = sh(["psql", "postgresql://localhost/groundwork", "-tAc", "select 1"])
    if code != 0 or out.strip() != "1":
        failures.append(f"database not reachable: {out[:120]}")
    return failures


def git_info() -> tuple[str, str]:
    _, sha = sh(["git", "rev-parse", "--short", "HEAD"])
    _, branch = sh(["git", "branch", "--show-current"])
    return sha, branch or "(detached)"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["local"], default="local",
                    help="'main' target lands in Phase B - the report/diff plumbing is already two-target aware")
    ap.add_argument("--skip-selftest", action="store_true",
                    help="DANGEROUS: only for debugging the orchestrator itself; a real run must never skip it")
    args = ap.parse_args()

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = HERE / "results" / f"overnight-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)
    sha, branch = git_info()
    print(f"OVERNIGHT RUN {stamp} | LOCAL {branch} @ {sha}")

    # ---- 1. environment: abort red, never green on zero tests --------------
    env_failures = environment_check()
    if env_failures:
        (out_dir / "CRITICAL-ISSUES.md").write_text(
            "# Overnight run ABORTED RED - environment failed\n\n" +
            "\n".join(f"- {f}" for f in env_failures) + "\n")
        for f in env_failures:
            print(f"ENV FAIL: {f}")
        print("ABORT RED: environment failed (no tests were run - this is not a green)")
        return 2

    # ---- 2. self-test: every guard must bite --------------------------------
    if args.skip_selftest:
        selftest = {"all_bit": True, "guards": [], "skipped": "DEBUG ONLY"}
        print("WARNING: self-test SKIPPED - this run cannot be trusted as an overnight result")
    else:
        print("self-test: proving every critical guard still bites...")
        selftest = run_selftest()
        for g in selftest["guards"]:
            print(("  BIT      " if g["bit"] else "  NO BITE  ") + g["name"])
        if not selftest["all_bit"]:
            (out_dir / "CRITICAL-ISSUES.md").write_text(
                "# Overnight run ABORTED RED - a guard no longer bites\n\n" +
                "\n".join(f"- {'BIT' if g['bit'] else 'NO BITE'}: {g['name']}" for g in selftest["guards"]) + "\n")
            print("ABORT RED: a guard no longer bites - the rest of the run cannot be trusted")
            return 3

    # ---- 3. suites, severity order ------------------------------------------
    local = TargetReport(target="local", sha=sha, branch=branch)
    for suite, cls, _model in SUITES:
        print(f"running {suite} (class {cls})...")
        try:
            code, tail = sh([sys.executable, str(HERE / suite)], timeout=600)
        except subprocess.TimeoutExpired:
            local.items.append(Item(suite=suite, cls=cls, severity="CRITICAL",
                                    summary=f"{suite} timed out after 600s"))
            continue
        local.items.extend(load_suite_findings(HERE / "results", suite.replace("run_", "").replace(".py", ""), cls))
        if code == 2:
            local.items.append(Item(suite=suite, cls=cls, severity="CRITICAL",
                                    summary=f"{suite} crashed (exit 2)", repro=tail[-300:]))

    # copy per-suite artifacts (screenshots, steps) into the run dir
    for suite, _, _ in SUITES:
        src = HERE / "results" / suite.replace("run_", "").replace(".py", "")
        if src.exists():
            shutil.copytree(src, out_dir / src.name, dirs_exist_ok=True)

    # ---- 4. report -----------------------------------------------------------
    md, exit_code = render(local, None, selftest, out_dir)
    print(md.split("\n## LOCAL", 1)[0])
    c = local.counts()
    print(f"HEADLINE: {c['critical']} critical, {c['finding']} findings, {c['flaky']} flaky, "
          f"{c['blocked']} blocked, {c['skipped_budget']} skipped-budget")
    print(f"artifacts: {out_dir}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())

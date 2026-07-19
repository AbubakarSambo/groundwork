"""Overnight report - the severity model and the artifact contract (spec 3, 7).

The headline is always: N critical, M findings, K flaky, S skipped-budget.
Critical never hides among findings; the report leads with the critical list,
each with a repro line and screenshot path. Both target SHAs print at the top
so "what am I looking at" is answered before any result.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path

# Suite-recorder severities that count as CRITICAL for the overnight run.
CRITICAL_SEVERITIES = {"CRITICAL"}
# BLOCKED from a suite = that leg could not run; surfaced in its own bucket,
# never counted as pass (spec 5: never green on zero tests).
FINDING_SEVERITIES = {"MISSING", "FINDING", "WARN"}


@dataclass
class Item:
    suite: str
    cls: str  # issue class 1-6 (spec section 2), or "meta"
    severity: str  # CRITICAL | FINDING | FLAKY | BLOCKED | SKIPPED_BUDGET | OK
    summary: str
    repro: str = ""
    screenshot: str = ""


@dataclass
class TargetReport:
    target: str  # "local" | "main"
    sha: str
    branch: str
    items: list[Item] = field(default_factory=list)

    def counts(self) -> dict[str, int]:
        buckets = {"critical": 0, "finding": 0, "flaky": 0, "blocked": 0, "skipped_budget": 0, "ok": 0}
        for it in self.items:
            if it.severity in CRITICAL_SEVERITIES:
                buckets["critical"] += 1
            elif it.severity == "FLAKY":
                buckets["flaky"] += 1
            elif it.severity == "BLOCKED":
                buckets["blocked"] += 1
            elif it.severity == "SKIPPED_BUDGET":
                buckets["skipped_budget"] += 1
            elif it.severity in FINDING_SEVERITIES:
                buckets["finding"] += 1
            else:
                buckets["ok"] += 1
        return buckets


def load_suite_findings(results_dir: Path, suite: str, cls: str) -> list[Item]:
    """Read a suite's findings.json (the existing recorder shape) into Items."""
    f = results_dir / suite / "findings.json"
    if not f.exists():
        # A suite that produced NO findings file did not run - that is never
        # silence; the orchestrator turns it into an environment abort.
        return [Item(suite=suite, cls=cls, severity="CRITICAL",
                     summary=f"{suite} produced no findings.json - the suite did not run",
                     repro="check the orchestrator log for this suite's stdout")]
    items: list[Item] = []
    raw = json.loads(f.read_text())
    rows = raw if isinstance(raw, list) else raw.get("findings", [])
    for row in rows:
        sev = row.get("severity", "OK")
        items.append(Item(
            suite=suite, cls=cls, severity=sev,
            summary=row.get("check", "") or row.get("summary", ""),
            repro=row.get("detail", ""),
            screenshot=row.get("screenshot", "") or row.get("url", ""),
        ))
    return items


def render(local: TargetReport, main: TargetReport | None, selftest_result: dict, out_dir: Path) -> tuple[str, int]:
    """Render CRITICAL-ISSUES.md + report.json. Returns (markdown, exit_code)."""
    lines: list[str] = []
    lines.append("# Overnight persona suite - run report")
    lines.append("")
    lines.append(f"- LOCAL:  `{local.branch}` @ `{local.sha}`")
    if main:
        lines.append(f"- MAIN:   `origin/main` @ `{main.sha}`")
    lines.append("")

    # self-test first - the trust anchor
    bit = selftest_result.get("all_bit", False)
    lines.append(f"## Self-test: {'ALL GUARDS BIT' if bit else 'GUARD FAILURE - RUN UNTRUSTWORTHY'}")
    for g in selftest_result.get("guards", []):
        lines.append(f"- {'BIT' if g['bit'] else 'DID NOT BITE'}: {g['name']}")
    lines.append("")

    def emit(target: TargetReport):
        c = target.counts()
        lines.append(f"## {target.target.upper()}: {c['critical']} critical, {c['finding']} findings, "
                     f"{c['flaky']} flaky, {c['blocked']} blocked, {c['skipped_budget']} skipped-budget")
        crits = [i for i in target.items if i.severity in CRITICAL_SEVERITIES]
        for i in crits:
            lines.append(f"- 🔴 [class {i.cls}] {i.suite}: {i.summary}")
            if i.repro:
                lines.append(f"  - repro: {i.repro}")
            if i.screenshot:
                lines.append(f"  - screenshot: {i.screenshot}")
        for sev, mark in (("FLAKY", "🌗"), ("BLOCKED", "⚪")):
            for i in target.items:
                if i.severity == sev:
                    lines.append(f"- {mark} {i.suite}: {i.summary}")
        lines.append("")

    emit(local)
    if main:
        emit(main)
        # the DIFF - the valuable part (spec 0)
        lines.append("## DIFF (per critical/finding)")
        def keyset(t: TargetReport, sevs):
            return {f"{i.suite}|{i.summary}" for i in t.items if i.severity in sevs}
        lc, mc = keyset(local, CRITICAL_SEVERITIES), keyset(main, CRITICAL_SEVERITIES)
        for k in sorted(lc - mc):
            lines.append(f"- LOCAL ONLY (just-introduced regression or unmerged fix): {k}")
        for k in sorted(mc - lc):
            lines.append(f"- MAIN ONLY (local ahead - fix not merged): {k}")
        for k in sorted(lc & mc):
            lines.append(f"- ON BOTH (LIVE ON MAIN - highest priority): {k}")
        if not (lc or mc):
            lines.append("- neither target has criticals - clean")
        lines.append("")

    md = "\n".join(lines)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "CRITICAL-ISSUES.md").write_text(md)
    (out_dir / "report.json").write_text(json.dumps({
        "selftest": selftest_result,
        "local": {"sha": local.sha, "branch": local.branch, "counts": local.counts(), "items": [asdict(i) for i in local.items]},
        "main": ({"sha": main.sha, "counts": main.counts(), "items": [asdict(i) for i in main.items]} if main else None),
    }, indent=2))

    exit_code = 0
    if not bit:
        exit_code = 3  # guard no longer bites - untrustworthy
    elif local.counts()["critical"] or (main and main.counts()["critical"]):
        exit_code = 1
    return md, exit_code

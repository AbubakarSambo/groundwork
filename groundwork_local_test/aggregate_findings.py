"""
Aggregate every suite's findings.json into one ranked markdown issues list.

Reads results/**/findings.json (and suite_e's report shape), normalizes them,
sorts by severity, and writes:
  - results/ISSUES.md        (human-readable, for a GitHub issue body / job summary)
  - results/issues.json      (machine-readable)

Severity order (most serious first): CRITICAL, MISSING, FINDING, WARN, BLOCKED, DATA/OK.
Exit code is the number of CRITICAL findings (capped at 250) so CI can branch on it.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent
RESULTS = ROOT / "results"

SEVERITY_ORDER = {
    "CRITICAL": 0,
    "MISSING": 1,
    "FINDING": 2,
    "WARN": 3,
    "BLOCKED": 4,
    "DATA": 5,
    "OK": 6,
}
SEVERITY_EMOJI = {
    "CRITICAL": "🔴",
    "MISSING": "🟠",
    "FINDING": "🟡",
    "WARN": "🟡",
    "BLOCKED": "⚪",
    "DATA": "ℹ️",
    "OK": "🟢",
}
# What we surface in the issues list. OK/DATA are counted but not listed as issues.
ISSUE_SEVERITIES = {"CRITICAL", "MISSING", "FINDING", "WARN", "BLOCKED"}


def normalize(raw: dict, source: str) -> list[dict]:
    """Turn one findings.json's content into a flat list of normalized findings."""
    out = []

    # Suite E shape: {agent_id: {persona, mood, verdict, reason, findings, steps:[...]}}
    if isinstance(raw, dict) and all(
        isinstance(v, dict) and "verdict" in v for v in raw.values()
    ):
        for aid, r in raw.items():
            sev = "FINDING" if (r.get("findings") or 0) > 0 else "OK"
            if r.get("verdict") == "CRASHED":
                sev = "BLOCKED"
            out.append({
                "agent": aid,
                "severity": sev,
                "title": f"Onboarding as '{r.get('persona')}': {r.get('verdict')}",
                "detail": r.get("reason", ""),
                "source": source,
            })
            # Surface individual step findings
            for step in r.get("steps", []):
                if step.get("finding"):
                    out.append({
                        "agent": aid,
                        "severity": "FINDING",
                        "title": f"[{r.get('persona')}] {step.get('step')}",
                        "detail": f"Expected: {step.get('expected')} | Got: {step.get('actual','')[:200]}",
                        "source": source,
                    })
        return out

    # Standard shape: list of {agent, severity, check/description, result/..., detail}
    if isinstance(raw, list):
        for f in raw:
            if not isinstance(f, dict):
                continue
            sev = (f.get("severity") or "FINDING").upper()
            title = (
                f.get("check")
                or f.get("description")
                or f.get("title")
                or f.get("result")
                or "(untitled)"
            )
            result = f.get("result") or f.get("url") or ""
            title_full = f"{title}: {result}" if result and result != title else title
            out.append({
                "agent": f.get("agent", "?"),
                "suite": f.get("suite", ""),
                "severity": sev,
                "title": title_full,
                "detail": f.get("detail", ""),
                "source": source,
            })
    return out


def main():
    all_findings = []
    files = sorted(RESULTS.rglob("findings.json"))
    for fp in files:
        try:
            raw = json.loads(fp.read_text())
        except Exception as e:
            all_findings.append({
                "agent": "?", "severity": "BLOCKED",
                "title": f"Could not parse {fp.relative_to(RESULTS)}",
                "detail": str(e), "source": str(fp.relative_to(RESULTS)),
            })
            continue
        source = fp.parent.name
        all_findings.extend(normalize(raw, source))

    # Sort by severity, then source
    all_findings.sort(key=lambda f: (SEVERITY_ORDER.get(f["severity"], 9), f.get("source", "")))

    issues = [f for f in all_findings if f["severity"] in ISSUE_SEVERITIES]
    counts = {}
    for f in all_findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    criticals = [f for f in issues if f["severity"] == "CRITICAL"]

    # --- Write machine-readable ---
    (RESULTS / "issues.json").write_text(json.dumps({
        "generated": datetime.now().isoformat(),
        "counts": counts,
        "issues": issues,
    }, indent=2))

    # --- Write markdown ---
    lines = []
    lines.append("## Persona test findings")
    lines.append("")
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines.append(f"_Generated {ts} from {len(files)} suite result file(s)._")
    lines.append("")

    # Summary line
    summary_bits = []
    for sev in ["CRITICAL", "MISSING", "FINDING", "WARN", "BLOCKED", "OK"]:
        if counts.get(sev):
            summary_bits.append(f"{SEVERITY_EMOJI[sev]} {counts[sev]} {sev.lower()}")
    lines.append("**" + "  ·  ".join(summary_bits) + "**" if summary_bits else "_No findings recorded._")
    lines.append("")

    if criticals:
        lines.append("### 🔴 Critical — review first")
        lines.append("")
        lines.append("These leak data, lose money, or lose the user. Do not merge over them.")
        lines.append("")
        for f in criticals:
            src = f.get("source", "")
            agent = f.get("agent", "?")
            lines.append(f"- **[{src} · agent {agent}]** {f['title']}")
            if f.get("detail"):
                lines.append(f"  - {str(f['detail'])[:300]}")
        lines.append("")

    other = [f for f in issues if f["severity"] != "CRITICAL"]
    if other:
        lines.append("### Other issues")
        lines.append("")
        lines.append("| Severity | Suite | Agent | Issue |")
        lines.append("|---|---|---|---|")
        for f in other:
            emoji = SEVERITY_EMOJI.get(f["severity"], "")
            title = str(f["title"]).replace("|", "\\|")[:160]
            lines.append(f"| {emoji} {f['severity']} | {f.get('source','')} | {f.get('agent','?')} | {title} |")
        lines.append("")

    if not issues:
        lines.append("✅ No issues surfaced. All checks passed or were informational only.")
        lines.append("")

    (RESULTS / "ISSUES.md").write_text("\n".join(lines))

    # Console echo
    print("\n".join(lines))
    print(f"\nWrote {RESULTS / 'ISSUES.md'} and {RESULTS / 'issues.json'}", file=sys.stderr)

    # Exit code = number of criticals (capped) so CI can gate/branch
    sys.exit(min(len(criticals), 250))


if __name__ == "__main__":
    main()

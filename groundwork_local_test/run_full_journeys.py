"""
Full end-to-end journey runner — drives REAL check-ins via the API and judges the
generated reports. This is where the substantive findings come from: false consensus,
minority-voice survival, hallucination, silent attrition, and typography in AI output.

Uses zainab (an org ADMIN) as the initiator so we can create grounds, add participants,
generate reports, and read them back. Participants are fresh test emails accepted via
their invite tokens, then driven turn by turn.

Findings are appended to results/full/findings.json (normalized shape for the aggregator).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from datetime import datetime

from _harness import (
    get_report_polling, release_report,
    token_for, create_ground, add_participant, accept_invite,
    drive_checkin, generate_report, get_report, scan_typography,
)

ROOT = Path(__file__).parent
RESULTS = ROOT / "results" / "full"
RESULTS.mkdir(parents=True, exist_ok=True)

findings: list[dict] = []


def record(agent, severity, check, result, detail=""):
    findings.append({"agent": agent, "suite": "FULL", "severity": severity,
                     "check": check, "result": result, "detail": str(detail)[:400]})
    flag = f" [{severity}]" if severity != "OK" else ""
    print(f"  A{agent}{flag} {check}: {result}", flush=True)
    if detail and severity != "OK":
        print(f"      {str(detail)[:200]}", flush=True)


def report_text(rep: dict) -> str:
    """Flatten a report object to text for scanning."""
    if not rep:
        return ""
    return json.dumps(rep, ensure_ascii=False)


# ── Journey 1: false consensus + minority voice (6 participants, engineered split) ──

def journey_1_split(admin):
    agent = 80
    print(f"\n[Journey 1] 6-participant engineered split — false consensus + minority", flush=True)
    gid = create_ground(admin, "Team direction check", "PULSE_CHECK", "STARTING",
                        "Should we adopt the new deployment process across the team.")
    if not gid:
        record(agent, "BLOCKED", "Create ground", "Could not create ground as admin")
        return
    record(agent, "OK", "Create ground", gid)

    # 4 lean YES, 2 lean NO; one NO is the lone-right-voice with a concrete safety reason.
    people = [
        ("p1", "Positive", ["The new process is great, much smoother than before.",
                            "Deploys feel faster and I trust it.", "No concerns, fully on board."]),
        ("p2", "Positive", ["Yes I like it, it saves time on releases.",
                           "The rollout has been smooth for me.", "Sounds good, no objections."]),
        ("p3", "Positive", ["Works well for my team day to day.",
                           "I have not hit any problems with it.", "Agreed, let's adopt it."]),
        ("p4", "Positive", ["I'm in favour, it is a clear improvement.",
                           "The tooling is easier to use now.", "No objections from me."]),
        ("p5", "Concerned", ["I'm a little worried but I guess it's fine.",
                            "I don't want to be the one holding things up.", "I'll go along with the group."]),
        ("p6_right", "Concerned", [
            "I have to flag something concrete: the new process skips the staging rollback step, "
            "so a bad deploy cannot be reverted.",
            "That is a real safety gap the others may not have hit yet because they haven't had a failure.",
            "I am not against change, but this specific gap will cause an outage. Please do not smooth this over."]),
    ]
    voices = {}
    for name, stance, msgs in people:
        email = f"j1.{name}@example-test.invalid"
        itok = add_participant(admin, gid, email, "Team member")
        if not itok:
            record(agent, "WARN", f"Add {name}", "Could not add / get invite token")
            continue
        acc = accept_invite(itok, name)
        cid = acc.get("checkInId")
        if not cid:
            record(agent, "WARN", f"Accept {name}", "No checkInId returned")
            continue
        res = drive_checkin(acc["accessToken"], cid, msgs)
        voices[name] = {"stance": stance, "msgs": msgs, "completed": res["completed"]}
        # typography in the AI replies shown to this participant
        for reply in res["replies"]:
            for nm, ch, ctx in scan_typography(reply):
                record(agent, "FINDING", "Typography in AI reply", f"{nm} in check-in text", ctx)
                break
    record(agent, "OK", "Participants driven", f"{len(voices)}/6 completed check-ins")

    generate_report(admin, gid)
    release_report(admin, gid)
    rep = get_report_polling(admin, gid)
    if not rep:
        record(agent, "BLOCKED", "Report", "No report returned after generate")
        return
    txt = report_text(rep).lower()
    (RESULTS / "journey1_report.json").write_text(json.dumps(rep, indent=2, ensure_ascii=False))

    # Typography in the report itself
    typo = scan_typography(report_text(rep))
    if typo:
        record(agent, "FINDING", "Typography in report", f"{len(typo)} house-style violation(s)",
               "; ".join(f"{n}:{c}" for n, c, _ in typo[:5]))
    else:
        record(agent, "OK", "Typography in report", "clean")

    # False consensus: does the report acknowledge the split, or smooth to agreement?
    split_ack = any(w in txt for w in ["disagree", "split", "divid", "concern", "objection",
                                       "not everyone", "however", "but ", "minority", "dissent"])
    consensus_claim = any(w in txt for w in ["everyone agrees", "the team agrees", "full agreement",
                                            "unanimous", "all participants agree", "consensus"])
    if consensus_claim and not split_ack:
        record(agent, "CRITICAL", "False consensus", "Report claims agreement but a real split existed",
               "4 for / 2 against; report language reads as consensus")
    elif split_ack:
        record(agent, "OK", "Split acknowledged", "Report surfaces disagreement/concern")
    else:
        record(agent, "WARN", "Split unclear", "Report neither claims consensus nor names the split")

    # Minority voice: does the concrete rollback/safety gap survive into the report?
    if any(w in txt for w in ["rollback", "revert", "staging", "safety", "outage"]):
        record(agent, "OK", "Minority voice preserved", "The lone concrete concern reached the report")
    else:
        record(agent, "CRITICAL", "Minority voice lost", "The lone right voice (rollback/outage gap) is absent from the report",
               "One participant raised a concrete safety gap; it did not survive synthesis")

    # Per-participant attribution: with 6 distinct people, can the report tell them apart?
    parties = (rep.get("engagement") or {}).get("parties") or []
    labels = [p.get("label") for p in parties]
    distinct = len(set(labels))
    if len(parties) >= 3 and distinct <= 2:
        record(agent, "FINDING", "No per-participant attribution",
               f"{len(parties)} parties tracked but only {distinct} distinct labels (non-initiators all 'Team member')",
               "Report cannot attribute positions to individuals or track an individual's arc over time")
    else:
        record(agent, "OK", "Per-participant attribution", f"{distinct} distinct labels for {len(parties)} parties")


# ── Journey 2: silent attrition (5 added, 2 never check in) ──

def journey_2_attrition(admin):
    agent = 81
    print(f"\n[Journey 2] attrition — 5 added, 2 never check in", flush=True)
    gid = create_ground(admin, "Quarterly alignment", "PULSE_CHECK", "STARTING",
                        "Are we aligned on the quarter's priorities.")
    if not gid:
        record(agent, "BLOCKED", "Create ground", "Could not create ground")
        return
    completed = 0
    for i in range(5):
        email = f"j2.p{i}@example-test.invalid"
        itok = add_participant(admin, gid, email, "Team member")
        if not itok:
            continue
        acc = accept_invite(itok, f"P{i}")
        cid = acc.get("checkInId")
        if not cid:
            continue
        if i < 3:  # only 3 of 5 actually check in
            drive_checkin(acc["accessToken"], cid,
                         ["Priorities look right to me overall.",
                          "I'm aligned with the direction for the quarter.",
                          "Nothing else to flag, I'm on board."])
            completed += 1
    record(agent, "OK", "Attrition setup", f"{completed}/5 checked in, 2 silent")

    generate_report(admin, gid)
    release_report(admin, gid)
    rep = get_report_polling(admin, gid)
    if not rep:
        record(agent, "BLOCKED", "Report", "No report after generate")
        return
    txt = report_text(rep).lower()
    (RESULTS / "journey2_report.json").write_text(json.dumps(rep, indent=2, ensure_ascii=False))

    # Does the report notice that 2 people never responded?
    notes_attrition = any(w in txt for w in ["did not", "have not", "hasn't", "not yet", "no response",
                                             "pending", "awaiting", "2 of", "3 of", "outstanding",
                                             "yet to", "missing", "incomplete"])
    claims_whole_team = any(w in txt for w in ["the team", "everyone", "all participants", "the group agrees"])
    if claims_whole_team and not notes_attrition:
        record(agent, "CRITICAL", "Silent attrition", "Report speaks for the whole team while 2/5 never responded",
               "Non-response reported as if it were consensus")
    elif notes_attrition:
        record(agent, "OK", "Attrition noticed", "Report flags that not everyone responded")
    else:
        record(agent, "WARN", "Attrition unclear", "Report does not obviously claim whole-team consensus, but does not flag gaps")


# ── Journey 3: hallucination probe (vague input, check for invented specifics) ──

def journey_3_hallucination(admin):
    agent = 82
    print(f"\n[Journey 3] hallucination probe — vague input, look for invented specifics", flush=True)
    gid = create_ground(admin, "Status pulse", "PULSE_CHECK", "STARTING",
                        "General check on how things are going.")
    if not gid:
        record(agent, "BLOCKED", "Create ground", "Could not create ground")
        return
    # Deliberately vague, no numbers, no names, no dates.
    itok = add_participant(admin, gid, "j3.only@example-test.invalid", "Team member")
    if not itok:
        record(agent, "BLOCKED", "Add participant", "Could not add participant")
        return
    acc = accept_invite(itok, "Solo")
    cid = acc.get("checkInId")
    drive_checkin(acc["accessToken"], cid,
                 ["Things are okay I guess.", "Nothing specific to report really.",
                  "No, nothing else comes to mind."])

    generate_report(admin, gid)
    release_report(admin, gid)
    rep = get_report_polling(admin, gid)
    if not rep:
        record(agent, "BLOCKED", "Report", "No report after generate")
        return
    txt = report_text(rep)
    (RESULTS / "journey3_report.json").write_text(json.dumps(rep, indent=2, ensure_ascii=False))

    # Invented specifics: numbers/percentages/dates the participant never gave.
    numbers = re.findall(r"\b\d+%|\b\d+ (?:people|percent|weeks|days|members|of the)", txt)
    if numbers:
        record(agent, "FINDING", "Possible hallucinated specifics",
               f"Report contains figures the vague input never provided", str(numbers[:6]))
    else:
        record(agent, "OK", "No invented figures", "Report did not fabricate numbers from vague input")

    # Insufficiency: with near-empty input, does the report over-claim?
    if any(w in txt.lower() for w in ["strong alignment", "clear consensus", "high confidence", "the team believes"]):
        record(agent, "FINDING", "Overreach on thin input",
               "Report makes strong claims from near-empty contribution",
               "Vague 'things are okay' should not become strong alignment")
    else:
        record(agent, "OK", "No overreach", "Report stayed proportionate to thin input")


def main():
    admin = token_for("zainab")
    if not admin:
        print("FATAL: no admin token for zainab", file=sys.stderr)
        sys.exit(1)
    journey_1_split(admin)
    journey_2_attrition(admin)
    journey_3_hallucination(admin)

    (RESULTS / "findings.json").write_text(json.dumps(findings, indent=2))
    print("\n" + "=" * 60)
    print("FULL JOURNEYS SUMMARY")
    print("=" * 60)
    for sev in ["CRITICAL", "FINDING", "WARN", "BLOCKED", "OK"]:
        n = [f for f in findings if f["severity"] == sev]
        if n:
            print(f"  {sev}: {len(n)}")
    print(f"\nFindings: {RESULTS / 'findings.json'}")


if __name__ == "__main__":
    main()

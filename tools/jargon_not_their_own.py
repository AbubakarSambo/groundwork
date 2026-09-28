#!/usr/bin/env python3
"""
Jargon in Groundwork's turns, not counting the person's own word used back to them.

Hafsah's decision, 28 September 2026: "Jargon that is the person's own word, used back to them,
doesn't count as jargon. Groundwork must never bring in jargon nobody used."

tools/score_run.py is protected by this kit's safety rules, so it is not edited. This counter uses
its own word list (score_run.JARGON) and its own reading of the run files, and differs in one
thing only: a jargon word in a Groundwork turn to a person does not count when that person had
already used the same word themselves, in any form ("escalated" covers "escalate"), in this
check-in or an earlier one of theirs. Every other jargon word counts, as before.

    python3 tools/jargon_not_their_own.py <run-folder> [<run-folder> ...]
"""
import glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
import score_run  # noqa: E402

WORD = re.compile(score_run.JARGON, re.I)


def stem(w: str) -> str:
    """One form for every form of the same word: the list is short, so seven letters tell them apart
    ("escalate", "escalated", "escalation" are all "escalat"; "deliverable" and "deliverables" are
    "deliver")."""
    w = w.lower()
    if len(w) > 3 and w.endswith("s"):
        w = w[:-1]
    return w[:7]


def count(folder: str):
    files = sorted(glob.glob(os.path.join(folder, "raw", "*.json")) or glob.glob(os.path.join(folder, "*.json")))
    total = theirs = 0
    brought_in = {}
    for f in files:
        try:
            d = json.load(open(f))
        except Exception:
            continue
        said_so_far = {}  # person -> stems they have used, growing through the run
        for s in d.get("sessions", []):
            for p in s.get("people", []):
                who = p.get("name") or p.get("key")
                used = said_so_far.setdefault(who, set())
                for t in p.get("turns", []):
                    text = t.get("text", "") or ""
                    if t.get("from") == "GROUNDWORK":
                        for m in WORD.finditer(text):
                            total += 1
                            if stem(m.group(0)) in used:
                                theirs += 1
                            else:
                                brought_in[m.group(0).lower()] = brought_in.get(m.group(0).lower(), 0) + 1
                    else:
                        for m in WORD.finditer(text):
                            used.add(stem(m.group(0)))
    return total, theirs, brought_in


if __name__ == "__main__":
    for folder in sys.argv[1:]:
        total, theirs, brought_in = count(folder)
        print(f"{folder}: jargon in Groundwork's turns {total} as the checker counts it; "
              f"{theirs} of them the person's own word used back; "
              f"{total - theirs} brought in by Groundwork: {dict(sorted(brought_in.items(), key=lambda x: -x[1]))}")

#!/usr/bin/env python3
"""
Scores a 24-scenario run (the raw/*.json files written by journey/all-24/run.ts).

It counts three things:
  1. PROBLEMS in what people read (reports, boards, conversations). These must go DOWN to zero.
  2. ENGINE VALUE: things the engine does well today. These must NOT go down.
  3. CONVERSATION STANDARD: how well Groundwork's side of the check-in reads.

Usage:
  python3 tools/score_run.py <run-folder-with-raw>                     # print the scores
  python3 tools/score_run.py <run-folder> --save docs/baseline.json    # save them as the baseline
  python3 tools/score_run.py <run-folder> --against docs/baseline.json # compare, and fail if anything got worse
"""
import json, glob, re, sys, os, statistics

PROBLEMS = {
 "slot names glued to answers": r"(said this was for:|What they report:|Where they say they stand now:|What they say is in the way:|reported this:|named this as being in the way:)",
 "internal labels shown (initiator, Participant A, the person who set this up)": r"\b(the initiator|The initiator|Participants? [A-Z](?:, [A-Z])*(?:,? and [A-Z])?\b|the person who set this up)",
 "machine table words shown (FIELD:, standing:, by kind -, answered ·)": r"(FIELD:|standing: |by kind - | · answered )",
 "sentence starting in lower case": r"(?<=[a-z])(?<!\bvs)(?<!\betc)(?<!e\.g)(?<!i\.e)\. (?!e\.g|i\.e)[a-z]{2,}\b",
 "\"nothing contradicts\" then differences": r"nothing in any single account contradicts",
 "name with a stray full stop": r"\"participantLabel\": \"[A-Z][a-z]+ [A-Z][a-z]+\.\"",
 "\"1 people\"": r"\b1 people\b|\b1 of 1 people\b",
 "role description used as a name": r"\. Target \d+ [a-z ]+this quarter\.|(?<=[a-z])\. Target \d+",
 "text cut mid-word": r"[A-Za-z]\.\.\.\.|[a-z]{1,3}\.\.\.$|\b[a-z]\.\.\.\.",
}
JARGON = r"\b(bottlenecks?|pipeline|stakeholders?|alignment|leverage|deliverables?|escalat\w*|cadence|KPIs?|synergy|bandwidth|actionable|vs)\b"

def served_text(d):
    """Every piece of text a person can read, as (where, text)."""
    out = []
    for s in d.get("sessions", []):
        for p in s.get("people", []):
            for t in p.get("turns", []):
                if t.get("from") == "GROUNDWORK":
                    out.append(("conversation", t.get("text", "")))
        for rk in ("leadReport", "participantReport"):
            r = s.get(rk) or {}
            if r:
                keep = {k: r.get(k) for k in ("sharedPicture", "theOpening", "centralQuestion", "theJudgement", "findings", "divergences", "agreements", "theTable", "overTime")}
                out.append((rk, json.dumps(keep, ensure_ascii=False)))
        for bk in ("board", "participantBoard"):
            b = s.get(bk) or {}
            if b:
                out.append((bk, json.dumps({k: b.get(k) for k in ("howItIsGoing", "theJudgement", "theTable", "overTime", "divergence", "objectives")}, ensure_ascii=False)))
    return out

def score(folder):
    files = sorted(glob.glob(os.path.join(folder, "raw", "*.json")) or glob.glob(os.path.join(folder, "*.json")))
    if not files:
        sys.exit(f"No run files found in {folder} (looked for raw/*.json)")
    prob = {k: 0 for k in PROBLEMS}; prob_where = {k: set() for k in PROBLEMS}
    prob["participant report carries the lead's judgement"] = 0
    prob["report with no judgement"] = 0
    value = {"proof asked for (turns)": 0, "past words brought back (turns)": 0, "specific detail asked for (turns)": 0,
             "blocker checked: who, what was tried, by when (turns)": 0, "differences found (reports)": 0,
             "agreements found (reports)": 0, "per-person findings (reports)": 0, "patterns found": 0,
             "commitments recorded": 0, "central question present (reports)": 0, "judgement present (reports)": 0}
    conv = {"Groundwork turns": 0, "turns that ask more than one question": 0, "curt turns (under 5 words, not a question)": 0,
            "jargon in Groundwork's turns": 0, "jargon in reports and boards": 0}
    words = []
    for f in files:
        d = json.load(open(f)); name = os.path.basename(f)[:-5]
        for where, t in served_text(d):
            tt = t.replace("\\n", "\n").replace('\\"', '"')
            for k, p in PROBLEMS.items():
                c = len(re.findall(p, tt))
                if c: prob[k] += c; prob_where[k].add(name)
            j = len(re.findall(JARGON, tt, re.I))
            if where == "conversation":
                conv["jargon in Groundwork's turns"] += j
            else:
                conv["jargon in reports and boards"] += j
        for i, s in enumerate(d.get("sessions", [])):
            lr = s.get("leadReport") or {}; pr = s.get("participantReport") or {}
            if lr:
                if (lr.get("theJudgement") or {}).get("theGap"): value["judgement present (reports)"] += 1
                else: prob["report with no judgement"] += 1
                value["differences found (reports)"] += len(lr.get("divergences") or [])
                value["agreements found (reports)"] += len(lr.get("agreements") or [])
                value["per-person findings (reports)"] += len(lr.get("findings") or [])
                if lr.get("centralQuestion"): value["central question present (reports)"] += 1
            if pr and (pr.get("theJudgement") or {}).get("theGap"):
                prob["participant report carries the lead's judgement"] += 1
            value["patterns found"] += len(s.get("patterns") or [])
            value["commitments recorded"] += len(s.get("commitments") or [])
            for p in s.get("people", []):
                for t in p.get("turns", []):
                    if t.get("from") != "GROUNDWORK": continue
                    x = t.get("text", ""); conv["Groundwork turns"] += 1; words.append(len(x.split()))
                    if x.count("?") > 1: conv["turns that ask more than one question"] += 1
                    if len(x.split()) < 5 and "?" not in x: conv["curt turns (under 5 words, not a question)"] += 1
                    if re.search(r"\b(photo|picture|document|screenshot|receipt|statement|proof|a copy|send (me|it|us)|attach|upload)\b", x, re.I): value["proof asked for (turns)"] += 1
                    if i > 0 and re.search(r"\b(last time|you said|yesterday|last week|previously|you told me|you mentioned)\b", x, re.I): value["past words brought back (turns)"] += 1
                    if re.search(r"\b(how many|how much|which|what date|what day|when exactly|by when|what number)\b", x, re.I): value["specific detail asked for (turns)"] += 1
                    if re.search(r"\b(who (exactly|is it|are you waiting)|what have you tried|what did you try|by when|what date)\b", x, re.I): value["blocker checked: who, what was tried, by when (turns)"] += 1
    conv["average words per Groundwork turn"] = round(statistics.mean(words), 1) if words else 0
    return {"files": len(files), "problems": prob, "problems_in_scenarios": {k: len(v) for k, v in prob_where.items()}, "engine_value": value, "conversation": conv}

def table(title, d, base=None, better="down"):
    lines = [f"\n## {title}\n", "| What | Now |" + (" Baseline | Change |" if base else ""), "| --- | --- |" + (" --- | --- |" if base else "")]
    for k, v in d.items():
        if base is not None and k in base:
            b = base[k]; ch = v - b
            lines.append(f"| {k} | {v} | {b} | {'+' if ch > 0 else ''}{ch} |")
        else:
            lines.append(f"| {k} | {v} |" + (" | |" if base else ""))
    return "\n".join(lines)

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    s = score(sys.argv[1])
    base = None
    if "--save" in sys.argv:
        json.dump(s, open(sys.argv[sys.argv.index("--save") + 1], "w"), indent=1, ensure_ascii=False)
    if "--against" in sys.argv:
        base = json.load(open(sys.argv[sys.argv.index("--against") + 1]))
    print(f"# Scores for {s['files']} scenarios")
    print(table("Problems in what people read (must go down to zero)", s["problems"], base and base["problems"]))
    print(table("Engine value (must not go down)", s["engine_value"], base and base["engine_value"]))
    print(table("The conversation", s["conversation"], base and base["conversation"]))
    if base:
        worse = []
        for k, v in s["engine_value"].items():
            b = base["engine_value"].get(k, 0)
            if b and v < b * 0.9: worse.append(f"engine value dropped: {k} ({b} to {v})")
        for k, v in s["problems"].items():
            if v > base["problems"].get(k, 0): worse.append(f"problem rose: {k} ({base['problems'].get(k,0)} to {v})")
        for k in ("turns that ask more than one question", "curt turns (under 5 words, not a question)", "jargon in Groundwork's turns"):
            if s["conversation"][k] > base["conversation"].get(k, 0): worse.append(f"conversation got worse: {k}")
        print("\n## Verdict\n")
        print("WORSE THAN THE BASELINE:\n- " + "\n- ".join(worse) if worse else "Nothing got worse than the baseline.")
        sys.exit(1 if worse else 0)

#!/usr/bin/env python3
"""
WHAT EACH PERSON WOULD BE SHOWN, BEFORE AND AFTER E2, B2, K3 AND B11 ARE JUDGED ONCE (decision 75, item 42, 2 October 2026).

The same method as what-each-person-is-shown-read-twice.py (decision 68): two readings of the same conversations, each
walked through the product's own rules, compared with each other, with "real" patterns taken only from the detector's
reads that neither reading used (a period counts when at least half of those reads keep the code; real at three periods).

Reads, from each run folder given:
  - the detector's stored reads (comma list), merged by check-in, copies of five;
  - shown-judged<TAG>.json, written by `JUDGED_WALK=1 ... journey/the-detector-read-twice.ts <folder>`:
    "before" is the code as committed before the change, "after" with the four judged once.

Prints the totals, then the same for each of E2, B2, K3 and B11, then the spread between arrangements, and the model
calls per check-in.

Usage (from api/):
  python3 journey/what-each-person-is-shown-judged-once.py <tag> product-reads-5-four.json,product-reads-5-extra.json journey/all-24/six-a journey/all-24/six-b
"""
import json, os, sys
from collections import Counter, defaultdict

NEVER_SHOWN = {'E4', 'F5'}
FOUR = ['E2', 'B2', 'K3', 'B11']
PER, SHOWN_AT = 5, 3
tag, files, folders = sys.argv[1], sys.argv[2].split(','), sys.argv[3:]


def shown(counted):
    return {c for c, n in counted.items() if n >= SHOWN_AT and c not in NEVER_SHOWN}


WAYS = ('before', 'after')
totals = {w: Counter() for w in WAYS}
per_code = {w: {c: Counter() for c in FOUR} for w in WAYS}
per_arr = {w: defaultdict(Counter) for w in WAYS}
flips = {w: Counter() for w in WAYS}
readings = more_before = more_after = judged = 0
for folder in folders:
    reads = {}
    for f in files:
        for d in json.load(open(os.path.join(folder, f))):
            reads.setdefault(d['checkInId'], {**d, 'reads': []})['reads'].extend(d['reads'])
    per_person = defaultdict(list)
    for d in reads.values():
        per_person[f"{d['scenario']}::{d['person']}"].append(d)
    data = json.load(open(os.path.join(folder, f'shown-judged{tag}.json')))
    readings += data['tally']['readings']; more_before += data['tally']['before']['more']
    more_after += data['tally']['after']['more']; judged += data['tally']['after']['judged']
    arrangements = [[[int(x) for x in r.split('+')] for r in a.split('/')] for a in data['arrangements'].split(';')]
    copies_in_all = max(len(d['reads']) for d in reads.values()) // PER
    for row in data['rows']:
        used = {c for r in arrangements[row['arrangement']] for c in r}
        ref_copies = [c for c in range(copies_in_all) if c not in used]
        counted = Counter()
        for d in per_person[row['person']]:
            rs = [r for c in ref_copies for r in d['reads'][c * PER:(c + 1) * PER]]
            v = Counter(c for r in rs for c in set(r))
            for code, n in v.items():
                if rs and 2 * n >= len(rs):
                    counted[code] += 1
        real = shown(counted)
        for way in WAYS:
            a, b = (shown(Counter(x)) for x in row[way])
            for t, keep in [(totals[way], lambda c: True), (per_arr[way][(folder, row['arrangement'])], lambda c: True)] + \
                           [(per_code[way][c0], (lambda c0: lambda c: c == c0)(c0)) for c0 in FOUR]:
                A, B, R = {c for c in a if keep(c)}, {c for c in b if keep(c)}, {c for c in real if keep(c)}
                t['same'] += len(A & B); t['either'] += len(A | B)
                t['real'] += 2 * len(R); t['real_found'] += len(A & R) + len(B & R)
                t['beyond'] += len(A - R) + len(B - R); t['shown'] += len(A) + len(B)
            totals[way]['people'] += 1; totals[way]['people_same'] += a == b
            per_arr[way][(folder, row['arrangement'])]['people'] += 1
            per_arr[way][(folder, row['arrangement'])]['people_same'] += a == b
            for c in a ^ b:
                flips[way][c] += 1

pct = lambda x, y: f"{round(100 * x / y)}%" if y else "n/a"
for way in WAYS:
    t = totals[way]
    print(f"\n{way.upper()} ({'as committed before the change' if way == 'before' else 'E2, B2, K3 and B11 judged once across their periods'})")
    print(f"  Person-and-pattern pairs shown the same in both readings: {t['same']} of {t['either']} ({pct(t['same'], t['either'])}).")
    print(f"  People shown exactly the same patterns: {t['people_same']} of {t['people']} ({pct(t['people_same'], t['people'])}).")
    print(f"  Real patterns still found: {t['real_found']} of {t['real']} ({pct(t['real_found'], t['real'])}).")
    print(f"  Shown beyond the real ones: {t['beyond']}, of {t['shown']} shown in all (summed over both readings).")
    print(f"  Patterns that differed between readings: " + ', '.join(f"{c} {n}" for c, n in flips[way].most_common()))
    for c in FOUR:
        u = per_code[way][c]
        print(f"    {c}: shown the same {u['same']} of {u['either']} ({pct(u['same'], u['either'])}); real found {u['real_found']} of {u['real']}; beyond the real {u['beyond']}; shown in all {u['shown']}.")

print("\nSpread between arrangements (each folder and pairing on its own): real found, then shown the same")
for way in WAYS:
    rf = [u['real_found'] for u in per_arr[way].values()]
    sm = [round(100 * u['same'] / u['either']) if u['either'] else 0 for u in per_arr[way].values()]
    print(f"  {way}: real found {min(rf)} to {max(rf)} per arrangement; shown the same {min(sm)}% to {max(sm)}%")
print("  real found, after minus before, per arrangement: " + ', '.join(
    str(per_arr['after'][k]['real_found'] - per_arr['before'][k]['real_found']) for k in per_arr['before']))

print(f"\nDetector reads per check-in: before {5 + 5 * more_before / max(1, readings):.1f} (five more reads on {more_before} of {readings} check-in readings); "
      f"after {5 + 5 * more_after / max(1, readings):.1f} (on {more_after}), plus {5 * judged / max(1, readings):.1f} judgement calls "
      f"(a judgement on {judged} of {readings}), so {5 + 5 * (more_after + judged) / max(1, readings):.1f} in all. The detector's confirming calls are not counted, as before.")

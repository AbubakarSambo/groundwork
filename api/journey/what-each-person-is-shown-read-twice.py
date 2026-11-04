#!/usr/bin/env python3
"""
WHAT EACH PERSON WOULD BE SHOWN, THE SAME CONVERSATIONS READ TWICE, BEFORE AND AFTER (decision 68, 1 October 2026).

Reads, from each run folder given:
  - the stored reads written by `PRODUCT=1 COPIES=<n> TAG=<tag> npx ts-node -T journey/the-detector-read-twice.ts <folder>`
    (every check-in read many times through the product's own whatOneReadKeeps, in copies of five), merged by check-in;
  - shown<TAG>.json, written from them by `MORE=1 READS=<files> ARRANGEMENTS=... TAG=<tag> ...`, which walks every
    person's periods through the product's own rule (whatCountsThisPeriod): "before" is three of five, as before
    the change; "after" is the same, except a split period on a pattern not yet shown is decided on ten reads.

A person is shown a pattern once it is counted in at least three periods; E4 and F5 are shown to nobody.

For each arrangement, two readings of the same conversations are compared with each other. "Real" patterns come
only from the copies of reads that neither reading used: a period counts when at least half of those reads keep
the code, and a pattern is real at three such periods. So the reference never shares a read with what it judges.

Usage (from api/):
  python3 journey/what-each-person-is-shown-read-twice.py <shown tag> <reads files, comma list> journey/all-24/six-a journey/all-24/six-b
"""
import json, os, sys
from collections import Counter, defaultdict

NEVER_SHOWN = {'E4', 'F5'}
PER, SHOWN_AT = 5, 3
stag, files, folders = sys.argv[1], sys.argv[2].split(','), sys.argv[3:]


def shown(counted):
    return {c for c, n in counted.items() if n >= SHOWN_AT and c not in NEVER_SHOWN}


totals = {w: Counter() for w in ('before', 'after')}
flips = {w: Counter() for w in ('before', 'after')}
more_taken = readings = 0
for folder in folders:
    reads = {}
    for f in files:
        for d in json.load(open(os.path.join(folder, f))):
            reads.setdefault(d['checkInId'], {**d, 'reads': []})['reads'].extend(d['reads'])
    per_person = defaultdict(list)
    for d in reads.values():
        per_person[f"{d['scenario']}::{d['person']}"].append(d)
    data = json.load(open(os.path.join(folder, f'shown{stag}.json')))
    more_taken += data['moreTaken']; readings += data['checkInReadings']
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
        for way in ('before', 'after'):
            a, b = (shown(Counter(x)) for x in row[way])
            t = totals[way]
            t['same'] += len(a & b); t['either'] += len(a | b)
            t['people'] += 1; t['people_same'] += a == b
            t['real'] += 2 * len(real); t['real_found'] += len(a & real) + len(b & real)
            t['beyond'] += len(a - real) + len(b - real)
            t['shown'] += len(a) + len(b)
            for c in a ^ b:
                flips[way][c] += 1

pct = lambda x, y: f"{round(100 * x / y)}%" if y else "n/a"
for way, t in totals.items():
    print(f"\n{way.upper()} ({'three of five reads' if way == 'before' else 'a split period on a pattern not yet shown is decided on ten reads'})")
    print(f"  Person-and-pattern pairs shown the same in both readings: {t['same']} of {t['either']} ({pct(t['same'], t['either'])}).")
    print(f"  People shown exactly the same patterns: {t['people_same']} of {t['people']} ({pct(t['people_same'], t['people'])}).")
    print(f"  Real patterns still found: {t['real_found']} of {t['real']} ({pct(t['real_found'], t['real'])}).")
    print(f"  Shown beyond the real ones: {t['beyond']}, of {t['shown']} shown in all (summed over both readings).")
    print(f"  Patterns that differed between readings: " + ', '.join(f"{c} {n}" for c, n in flips[way].most_common()))
print(f"\nFive more reads were taken on {more_taken} of {readings} check-in readings ({pct(more_taken, readings)}), "
      f"so {5 + 5 * more_taken / max(1, readings):.1f} detector reads per check-in on average, against 5 before.")

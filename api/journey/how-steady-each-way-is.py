#!/usr/bin/env python3
"""
HOW STEADY EACH WAY OF READING PATTERNS IS (Hafsah, 30 September 2026).

Reads many-reads.json, written by `MANY=1 npx ts-node -T journey/the-detector-read-twice.ts <run>`:
every check-in read 6 times at the model's normal setting and 6 times at the steady setting
(temperature 0, fixed seed). Nothing is called here; it only compares what was read.

Five ways of reading are compared, each made twice from separate reads so they can be compared
with themselves:
  - one normal read
  - one steady read
  - normal, both of two reads agree (a pattern kept only when both reads keep it)
  - normal, most of three reads agree (kept when at least 2 of 3 keep it)
  - steady, most of three reads agree

Steadiness: across a whole scenario, how many person-and-pattern pairs the two copies share, out of
all pairs either found (the same measure as run-19 against run-20, 15%, and the first read-twice, 39%).
Also: on how many check-ins the two copies kept exactly the same patterns.

Still finding real patterns: the reference is every pattern at least half of all 12 reads kept on
that check-in. For each way, the share of those it finds (first copy), and how many it finds that
the reference does not.

Usage (from api/): python3 journey/how-steady-each-way-is.py journey/all-24/run-20/many-reads.json
"""
import json, sys
from collections import defaultdict

rows = [r for r in json.load(open(sys.argv[1]))]
def ok(reads): return [set(x['kept']) for x in reads if 'kept' in x]

def most(reads, k):
    out = set()
    for c in set().union(*reads) if reads else set():
        if sum(c in r for r in reads) >= k: out.add(c)
    return out

WAYS = {
    'one normal read':                 lambda n, s: (n[0], n[1]),
    'one steady read':                 lambda n, s: (s[0], s[1]),
    'normal, both of two agree':       lambda n, s: (n[0] & n[1], n[2] & n[3]),
    'normal, most of three agree':     lambda n, s: (most(n[0:3], 2), most(n[3:6], 2)),
    'steady, most of three agree':     lambda n, s: (most(s[0:3], 2), most(s[3:6], 2)),
}

usable = []
for r in rows:
    n, s = ok(r['normal']), ok(r['steady'])
    if len(n) == 6 and len(s) == 6:
        usable.append((r, n, s))
print(f"Check-ins with all 12 reads: {len(usable)} of {len(rows)}.")

for name, way in WAYS.items():
    pairsA, pairsB = defaultdict(set), defaultdict(set)
    same = 0; ref_total = 0; ref_hit = 0; extra = 0
    for r, n, s in usable:
        a, b = way(n, s)
        if a == b: same += 1
        for c in a: pairsA[r['scenario']].add(f"{r['person']}::{c}")
        for c in b: pairsB[r['scenario']].add(f"{r['person']}::{c}")
        allreads = n + s
        ref = {c for c in set().union(*allreads) if sum(c in x for x in allreads) >= 6}
        ref_total += len(ref); ref_hit += len(ref & a); extra += len(a - ref)
    shared = sum(len(pairsA[k] & pairsB[k]) for k in set(pairsA) | set(pairsB))
    union = sum(len(pairsA[k] | pairsB[k]) for k in set(pairsA) | set(pairsB))
    found = sum(len(v) for v in pairsA.values())
    print(f"\n{name}")
    print(f"  steadiness: {shared} of {union} person-and-pattern pairs the same ({round(100*shared/union) if union else 100}%); "
          f"exactly the same patterns on {same} of {len(usable)} check-ins ({round(100*same/len(usable))}%)")
    print(f"  still finding real patterns: {ref_hit} of {ref_total} found ({round(100*ref_hit/ref_total) if ref_total else 100}%), "
          f"{extra} found that most reads did not; {found} person-and-pattern pairs in all")

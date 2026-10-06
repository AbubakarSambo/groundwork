#!/usr/bin/env python3
"""
THE SECOND ROUND (Hafsah, 30 September 2026): five steady reads by majority, and the steady
setting with the smallest thinking budget. Reads many-reads-2.json (MANY=1 MANY_MORE=1), and takes
"real patterns" from the first round's many-reads.json (at least half of its 12 reads), so the
reference is independent of the reads being judged.

Usage (from api/): python3 journey/how-steady-each-way-is-2.py journey/all-24/run-20
"""
import json, sys, os
from collections import defaultdict
folder = sys.argv[1]
r2 = json.load(open(os.path.join(folder, 'many-reads-2.json')))
r1 = {r['checkInId']: r for r in json.load(open(os.path.join(folder, 'many-reads.json')))}
def ok(rs): return [set(x['kept']) for x in rs if 'kept' in x]
def most(rs, k):
    u = set().union(*rs) if rs else set(); return {c for c in u if sum(c in r for r in rs) >= k}
WAYS = {
    'one steady read':                              lambda s, t: (s[0], s[1]),
    'steady, most of three agree':                  lambda s, t: (most(s[0:3], 2), most(s[3:6], 2)),
    'steady, most of five agree':                   lambda s, t: (most(s[0:5], 3), most(s[5:10], 3)),
    'steady with little thinking, one read':        lambda s, t: (t[0], t[1]),
    'steady with little thinking, most of three':   lambda s, t: (most(t[0:3], 2), most(t[3:6], 2)),
}
usable = []
for r in r2:
    s, t = ok(r['steady']), ok(r['steadyLittleThinking'])
    first = r1.get(r['checkInId'])
    if len(s) == 10 and len(t) == 6 and first:
        allreads = ok(first['normal']) + ok(first['steady'])
        if len(allreads) == 12:
            ref = {c for c in set().union(*allreads) if sum(c in x for x in allreads) >= 6}
            usable.append((r, s, t, ref))
print(f"Check-ins with every read: {len(usable)} of {len(r2)}.")
for name, way in WAYS.items():
    A, B = defaultdict(set), defaultdict(set); same = hit = tot = extra = 0
    for r, s, t, ref in usable:
        a, b = way(s, t)
        same += a == b
        for c in a: A[r['scenario']].add(f"{r['person']}::{c}")
        for c in b: B[r['scenario']].add(f"{r['person']}::{c}")
        tot += len(ref); hit += len(ref & a); extra += len(a - ref)
    keys = set(A) | set(B)
    sh = sum(len(A[k] & B[k]) for k in keys); un = sum(len(A[k] | B[k]) for k in keys)
    print(f"\n{name}\n  the same: {sh} of {un} pairs ({round(100*sh/un) if un else 100}%); exactly the same on {same} of {len(usable)} check-ins"
          f"\n  real patterns still found: {hit} of {tot} ({round(100*hit/tot) if tot else 100}%); {extra} found that the first round's reads mostly did not")

"""
OTHER WAYS OF DECIDING A PERIOD, TRIED ON THE STORED READS (9 October 2026, pattern steadiness). No model call.
Reads six-a and six-b (135 check-ins, 30 reads each, in six copies of five) and compares rules by the share of
shown person-and-pattern pairs two readings (disjoint copies) agree on. Run: python3 journey/pattern-rules-on-stored-reads.py
R0 is the product. R1 adds five reads on a borderline ten; R15 decides everything on fifteen reads (the most reads can give).
"""
import json, os, sys, itertools
from collections import Counter, defaultdict
B=os.path.join(os.path.dirname(os.path.abspath(__file__)),'all-24')+'/'
NEVER={'E4','F5'}; SHOWN=3
def load(folder):
    r={}
    for f in ['product-reads-5-four.json','product-reads-5-extra.json']:
        for d in json.load(open(B+folder+'/'+f)):
            r.setdefault(d['checkInId'],{**d,'reads':[]})['reads'].extend(d['reads'])
    pp=defaultdict(list)
    for d in r.values(): pp[d['scenario']+'::'+d['person']].append(d)
    return pp
DATA={}
for f in ['six-a','six-b']:
    for k,v in load(f).items(): DATA[f+'|'+k]=sorted(v,key=lambda d:d['period'])
def votes(reads): 
    c=Counter()
    for r in reads:
        for x in set(r): c[x]+=1
    return c
def could(counted,period): return len({p for p in counted if p<period})<SHOWN
def copy(d,c): return d['reads'][c*5:(c+1)*5]
# rules: decide(code, copies_reads_list(list of lists of 5 reads), counted_before, period, state)-> bool ; copies available lazily
def R0(d,copies,counted,period,hyst=None):
    first=copy(d,copies[0]); v=votes(first); out=set(); 
    split={c for c,n in v.items() if n in (2,3) and could(counted.get(c,[]),period)}
    more=copy(d,copies[1]) if split else []
    allv=votes(first+more)
    for c,n in v.items():
        if c in split:
            n2=allv[c]; t=len(first+more)
            if 2*n2>t or (2*n2==t and n>=3): out.add(c)
        elif n>=3: out.add(c)
    return out
def R1(d,copies,counted,period,hyst=None):
    # R0, then borderline (4,5,6 of 10) on a code that could change -> 5 more, majority of 15
    first=copy(d,copies[0]); v=votes(first)
    split={c for c,n in v.items() if n in (2,3) and could(counted.get(c,[]),period)}
    if not split: return {c for c,n in v.items() if n>=3}
    ten=first+copy(d,copies[1]); v10=votes(ten); out={c for c,n in v.items() if n>=3 and c not in split}
    for c in split:
        n=v10[c]
        if n in (4,5,6):
            fifteen=votes(ten+copy(d,copies[2]))
            if fifteen[c]*2>15: out.add(c)
        elif 2*n>10: out.add(c)
    return out
def R2(d,copies,counted,period,hyst=None):
    # broader trigger: 1..4 of 5; decide on 10 majority, tie -> first
    first=copy(d,copies[0]); v=votes(first)
    split={c for c,n in v.items() if 1<=n<=4 and could(counted.get(c,[]),period)}
    more=copy(d,copies[1]) if split else []
    allv=votes(first+more); out=set()
    for c,n in v.items():
        if c in split:
            n2=allv[c]; t=10
            if 2*n2>t or (2*n2==t and n>=3): out.add(c)
        elif n>=3: out.add(c)
    return out
def R3(d,copies,counted,period,hyst=None):
    # hysteresis: a code already counted in the previous period needs only 4 of 10 (lenient) to continue; new needs >5 of 10
    first=copy(d,copies[0]); v=votes(first)
    prev = lambda c: (period-1) in counted.get(c,[])
    split={c for c,n in v.items() if n in (2,3) and could(counted.get(c,[]),period)}
    more=copy(d,copies[1]) if split else []
    allv=votes(first+more); out=set()
    for c,n in v.items():
        if c in split:
            n2=allv[c]
            if prev(c): ok = n2>=4
            else: ok = (2*n2>10) or (2*n2==10 and n>=3)
            if ok: out.add(c)
        elif n>=3: out.add(c)
    return out
def R4(d,copies,counted,period,hyst=None):
    # all 10 reads always: majority of 10 (>5), tie -> not counted (stricter, no first5 coin)
    first=copy(d,copies[0]); v=votes(first)
    split={c for c,n in v.items() if n in (2,3) and could(counted.get(c,[]),period)}
    more=copy(d,copies[1]) if split else []
    allv=votes(first+more); out=set()
    for c,n in v.items():
        if c in split:
            if allv[c]*2>10: out.add(c)
        elif n>=3: out.add(c)
    return out
def walk(list_,rule,copies):
    counted={}
    for d in list_:
        for c in rule(d,copies,counted,d['period']): 
            counted.setdefault(c,[])
            if d['period'] not in counted[c]: counted[c].append(d['period'])
    return {c for c,p in counted.items() if len(set(p))>=SHOWN and c not in NEVER}
def real(list_):
    cnt=Counter()
    for d in list_:
        rs=d['reads']; v=votes(rs)
        for c,n in v.items():
            if 2*n>=len(rs): cnt[c]+=1
    return {c for c,n in cnt.items() if n>=SHOWN and c not in NEVER}
def evaluate(rule,ncopies,label):
    # pairs of disjoint copy tuples from 6 copies
    perms=[]
    allc=range(6)
    for a in itertools.combinations(allc,ncopies):
        rest=[c for c in allc if c not in a]
        for b in itertools.combinations(rest,ncopies):
            if a<b: perms.append((a,b))
    same=either=ps=pn=found=rtot=beyond=shown=0
    for key,lst in DATA.items():
        rl=real(lst)
        for a,b in perms:
            for A,Bc in ((a,b),(b,a)) if False else ((a,b),):
                x=walk(lst,rule,A); y=walk(lst,rule,Bc)
                same+=len(x&y); either+=len(x|y); pn+=1; ps+= x==y
                found+=len(x&rl)+len(y&rl); rtot+=2*len(rl); beyond+=len(x-rl)+len(y-rl); shown+=len(x)+len(y)
    print(f"{label:8s} agree {same}/{either}={100*same/either:.1f}%  peopleSame {100*ps/pn:.1f}%  real found {found}/{rtot}={100*found/rtot:.1f}%  shown {shown/pn/2:.2f}/person-reading  beyond {beyond/pn/2:.3f}", flush=True)

R15=lambda d,copies,counted,period,hyst=None:(lambda rs:{c for c,n in votes(rs).items() if 2*n>len(rs)})(sum((copy(d,c) for c in copies),[]))
if __name__=='__main__':
    for rule,n,label in ((R0,3,'R0 product'),(R1,3,'R1 +5 borderline'),(R15,3,'R15 all fifteen'),(R4,2,'R4 tie not counted'),(R3,2,'R3 lenient continue')):
        evaluate(rule,n,label)

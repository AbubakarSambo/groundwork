import json,sys,itertools
from collections import Counter,defaultdict
D='/private/tmp/claude-501/-Users-hafsahjumare-Documents-GitHub-groundwork/07911d55-6a97-42f4-b510-275738a692f2/scratchpad/next/api/journey/all-24/'
NEVER={'E4','F5'}; SHOWN=3
def load(f):
    r={}
    for d in json.load(open(D+f)): r[d['checkInId']]=d
    return r
def votes(reads):
    c=Counter()
    for r in reads:
        for x in set(r): c[x]+=1
    return c
def could(counted,period): return len({p for p in counted if p<period})<SHOWN
def copy(d,c): return d['reads'][c*5:(c+1)*5]
def R0(d,copies,counted,period):
    first=copy(d,copies[0]); v=votes(first); out=set()
    split={c for c,n in v.items() if n in (2,3) and could(counted.get(c,[]),period)}
    more=copy(d,copies[1]) if split else []
    allv=votes(first+more)
    for c,n in v.items():
        if c in split:
            n2=allv[c]; t=len(first+more)
            if 2*n2>t or (2*n2==t and n>=3): out.add(c)
        elif n>=3: out.add(c)
    return out
def walk(lst,copies):
    counted={}
    for d in lst:
        for c in R0(d,copies,counted,d['period']):
            counted.setdefault(c,[])
            if d['period'] not in counted[c]: counted[c].append(d['period'])
    return {c for c,p in counted.items() if len(set(p))>=SHOWN and c not in NEVER}
def real(lst):
    cnt=Counter()
    for d in lst:
        rs=d['reads']; v=votes(rs)
        for c,n in v.items():
            if 2*n>=len(rs): cnt[c]+=1
    return {c for c,n in cnt.items() if n>=SHOWN and c not in NEVER}
def evaluate(data,label):
    pp=defaultdict(list)
    for d in data.values(): pp[d['scenario']+'::'+d['person']].append(d)
    arr=[((0,1),(2,3)),((0,2),(1,3)),((0,3),(1,2))]
    same=either=ps=pn=found=rtot=beyond=shown=0; mentions=0; nreads=0
    for key,lst in pp.items():
        lst=sorted(lst,key=lambda d:d['period']); rl=real(lst)
        for a,b in arr:
            x=walk(lst,a); y=walk(lst,b)
            same+=len(x&y); either+=len(x|y); pn+=1; ps+= x==y
            found+=len(x&rl)+len(y&rl); rtot+=2*len(rl); beyond+=len(x-rl)+len(y-rl); shown+=len(x)+len(y)
    for d in data.values():
        for r in d['reads']: mentions+=len(set(r)); nreads+=1
    print(f"{label:8s} people {len(pp)} check-ins {len(data)}  agree {same}/{either}={100*same/either:.1f}%  peopleSame {100*ps/pn:.1f}%  real found {found}/{rtot}={100*found/rtot:.1f}%  shown {shown/pn/2:.2f}/person-reading  beyond {beyond/pn/2:.3f}  kept codes per read {mentions/nreads:.2f}")
if __name__=='__main__':
    folder=sys.argv[1]; b=load(folder+'/product-reads-5-four.json'); a=load(folder+'/'+sys.argv[2])
    ids=set(a)&set(b)
    for lab,src in (('before',b),('after',a)):
        sub={k:{**v,'reads':v['reads'][:20]} for k,v in src.items() if k in ids}
        evaluate(sub,lab)

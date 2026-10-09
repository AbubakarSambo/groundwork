import re,sys
t=open(sys.argv[1]).read()
tot_codes=tot_split=0; agree=[]; mentions=0; n_ci=0
for blk in t.split('CHECK-IN ')[1:]:
    lines=blk.split('\n'); head=lines[0]; N=int(re.search(r': (\d+) extractions',head).group(1))
    codes=[]
    for l in lines[1:]:
        m=re.match(r'  ([A-Z]\d+)(?: \(not confirmed\))?: named in (\d+) of (\d+)',l)
        if m: codes.append((m.group(1),int(m.group(2))))
    n_ci+=1
    sp=[c for c,n in codes if 2<=n<=N-2]
    ag=[(n*(n-1)+(N-n)*(N-n-1))/(N*(N-1)) for c,n in codes]
    print(head[:20],'N',N,'codes named',len(codes),'split(2..N-2)',len(sp),'mean pair agreement %.2f'%(sum(ag)/max(1,len(ag))),'mentions',sum(n for c,n in codes),' sure(>=0.8N):',sum(1 for c,n in codes if n>=0.8*N))
    tot_codes+=len(codes); tot_split+=len(sp); agree+=ag; mentions+=sum(n for c,n in codes)
print('TOTAL check-ins',n_ci,'codes named',tot_codes,'split',tot_split,'(%.0f%%)'%(100*tot_split/tot_codes),'mean pair agreement %.3f'%(sum(agree)/len(agree)),'mentions',mentions)

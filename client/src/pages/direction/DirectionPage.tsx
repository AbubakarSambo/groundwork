import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { directionApi, type DirectionRead } from '@/api/direction'
import { groundsApi } from '@/api/grounds'
import { Page, PageTitle, Section, Note, EdgeList, EdgeRow, Tag, Button } from '@/components/gw/ui'
import { useAuthStore } from '@/stores/auth'
import { NotFoundPage } from '@/pages/notfound/NotFoundPage'

const EDGE = { rec: 'ready', att: 'look', con: 'concern' } as const
const fail = (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Try again.')

/**
 * DIRECTION (Release 6; the Check-in Reports file's "Direction: the company" and "Direction: a team's brief, and recommitting"). Three
 * tabs: the company (now, what changed, what it means for each team, has the organisation realigned), a team (its brief, each person
 * recommits, the team's check-in questions now), and the loop (how it is checked every two weeks, and the revisions). Everybody in the
 * organisation reads it; an admin sets a new direction; each team's lead approves and writes the brief; each person recommits.
 */
export function DirectionPage() {
  const q = useQuery({ queryKey: ['direction'], queryFn: directionApi.read, retry: false })
  const [tab, setTab] = useState<string>('company')
  const [editing, setEditing] = useState(false)
  const org = (useAuthStore((s) => s.user) as any)?.organization?.name ?? ''
  const d = q.data?.direction
  if (q.isLoading) return <Page><PageTitle title="Direction" /><Note>Loading the direction.</Note></Page>
  /* Off for this organisation: the page is not there, and nothing says a switch exists (switches are Groundwork's own, 25 October). */
  if (!q.data?.on) return <NotFoundPage />
  const teamTab = d?.teams.find((t) => t.groundId === tab)
  return (
    <Page>
      <PageTitle eyebrow={`${org ? `${org}, company` : 'Company'} direction${d?.setBy ? `, set by ${d.setBy}` : ''}`} title={teamTab ? `Direction for ${teamTab.title}` : 'Direction'} />
      {d && (
        <div className="views" role="tablist" aria-label="Direction">
          <a role="tab" href="#company" aria-selected={tab === 'company'} className={tab === 'company' ? 'on' : ''} onClick={(e) => { e.preventDefault(); setTab('company') }}>Company</a>
          {d.teams.map((t) => <a key={t.groundId} role="tab" href={`#${t.groundId}`} aria-selected={tab === t.groundId} className={tab === t.groundId ? 'on' : ''} onClick={(e) => { e.preventDefault(); setTab(t.groundId) }}>{t.title}</a>)}
          <a role="tab" href="#loop" aria-selected={tab === 'loop'} className={tab === 'loop' ? 'on' : ''} onClick={(e) => { e.preventDefault(); setTab('loop') }}>The loop</a>
        </div>
      )}
      {!d && !editing && <Note>{q.data.mayChange ? 'There is no direction yet.' : 'Nobody has set the company’s direction yet.'}</Note>}
      {q.data.mayChange && !editing && <button type="button" className="gw-link t-small gw-start" onClick={() => setEditing(true)}>{d ? 'Set a new direction' : 'Set the direction'}</button>}
      {editing && <SetTheDirection current={q.data} onDone={() => setEditing(false)} />}
      {d && tab === 'company' && <TheCompany d={d} />}
      {d && teamTab && <TheTeam groundId={teamTab.groundId} youLeadIt={!!teamTab.youLeadIt} />}
      {d && tab === 'loop' && <TheLoop d={d} />}
    </Page>
  )
}

function TheCompany({ d }: { d: NonNullable<DirectionRead['direction']> }) {
  const qc = useQueryClient()
  const approve = useMutation({ mutationFn: (groundId: string) => directionApi.approve(groundId), onSuccess: () => qc.invalidateQueries({ queryKey: ['direction'] }), onError: fail })
  return (
    <>
      <Section heading="Now">
        <div className="g4">{d.now.map((x) => <div key={x.title} className="panel pad gw-col-6"><b>{x.title}</b><p className="t-small">{x.says}</p></div>)}</div>
      </Section>
      <Section heading="What changed" note={d.setOn}>
        {/* One element beside the number (fix plan, pattern 8): the label and the text were two grid cells, so the text fell into the number's 22px column, one word per line. */}
        <ol className="gw-numbered">{d.whatChanged.map((x) => <li key={x.n}><span><b>{x.label}</b> {x.says}</span></li>)}</ol>
      </Section>
      <Section heading="What it means for each team" note="Worked out for each team, approved by its lead">
        <EdgeList label="What it means for each team">
          {d.teams.map((t) => (
            <EdgeRow key={t.groundId} kind={t.approved ? 'decide' : 'look'} reason={null} title={t.title} detail={t.says}
              actions={<>{<Tag tone={t.approved ? 'proven' : 'attention'}>{t.tag}</Tag>}{t.youLeadIt && !t.approved && <Button kind="secondary" size="small" onClick={() => approve.mutate(t.groundId)} disabled={approve.isPending}>Approve it for your team</Button>}</>} />
          ))}
        </EdgeList>
      </Section>
      <Section heading="Has the organisation actually realigned?" note={`Checked every two weeks. Next on ${d.nextCheckOn}`}>
        {d.realigned.length
          ? <EdgeList label="Has the organisation realigned">{d.realigned.map((r) => <EdgeRow key={r.title + r.says} kind="look" reason={null} title={r.title} detail={r.says} />)}</EdgeList>
          : <p className="t-body">Yes. Every team has agreed what it means for them, and every goal has been continued, changed or stopped.</p>}
      </Section>
    </>
  )
}

function TheTeam({ groundId, youLeadIt }: { groundId: string; youLeadIt: boolean }) {
  const b = useQuery({ queryKey: ['direction-brief', groundId], queryFn: () => directionApi.brief(groundId), retry: false })
  const [editing, setEditing] = useState(false)
  if (b.isError) return <Note>Only the people in this team can read its brief.</Note>
  if (!b.data) return null
  const x = b.data
  return (
    <>
      <Section heading={`${x.lead ? `${x.lead}’s brief` : 'The brief'}`} note="Before the team heard">
        <p className="t-body">{x.says}</p>
        {x.items.length > 0 ? <div className="panel"><EdgeList label="The brief">{x.items.map((i) => <EdgeRow key={i.verb + i.says} kind={EDGE[i.tone] as any} reason={null} title={i.verb} detail={i.says} />)}</EdgeList></div> : <Note>{youLeadIt ? 'Write what your team stops, continues, changes and starts.' : 'The lead has not written the brief yet.'}</Note>}
        {(x.unclear || x.approvedSays) && <p className="t-small mut">{[x.unclear ? `Unclear ownership. ${x.unclear}` : '', x.approvedSays ?? ''].filter(Boolean).join(' ')}</p>}
        {youLeadIt && !editing && <button type="button" className="gw-link t-small gw-start" onClick={() => setEditing(true)}>{x.items.length ? 'Change the brief' : 'Write the brief'}</button>}
        {youLeadIt && editing && <WriteTheBrief groundId={groundId} raw={x.raw ?? null} onDone={() => setEditing(false)} />}
      </Section>
      <YouRecommit groundId={groundId} />
      {x.questionsNow.length > 0 && (
        <Section heading="This team’s check-in questions now" note="They follow the direction">
          {x.questionsNow.map((q) => <p key={q} className="t-body">{q}</p>)}
        </Section>
      )}
    </>
  )
}

/** Each person recommits: their own goals in this team, each continued, changed or stopped. A goal stopped or changed is never counted as missed. */
function YouRecommit({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const m = useQuery({ queryKey: ['direction-mine'], queryFn: directionApi.mine, retry: false })
  const [changing, setChanging] = useState<string | null>(null)
  const [words, setWords] = useState(''); const [number, setNumber] = useState('')
  const act = useMutation({
    mutationFn: (v: { objectiveId: string; outcome: 'continue' | 'change' | 'stop' }) => directionApi.recommit({ ...v, ...(v.outcome === 'change' ? { newName: words, newTarget: number ? Number(number) : null } : {}) }),
    onSuccess: (r) => { toast.success(r.says); setChanging(null); setWords(''); setNumber(''); qc.invalidateQueries({ queryKey: ['direction-mine'] }); qc.invalidateQueries({ queryKey: ['direction'] }) },
    onError: fail,
  })
  const goals = (m.data?.goals ?? []).filter((g) => g.groundId === groundId)
  if (!goals.length) return null
  return (
    <Section heading="Each person recommits" note="Your own goals here">
      <EdgeList label="Your goals">
        {goals.map((g) => (
          <EdgeRow key={g.id} kind={g.decided ? 'ready' : 'look'} reason={null} title={g.name}
            detail={g.decided ? `You ${g.decided === 'continued' ? 'continued it' : g.decided === 'modified' ? 'changed it' : 'stopped it'} under the new direction.` : 'Continue it, change it, or stop it. A goal you stop or change is not counted as missed.'}
            actions={!g.decided ? (changing === g.id
              ? <form className="gw-col-6" onSubmit={(e) => { e.preventDefault(); act.mutate({ objectiveId: g.id, outcome: 'change' }) }}>
                  <input className="input" aria-label="What it becomes" placeholder="What it becomes" value={words} onChange={(e) => setWords(e.target.value)} />
                  <input className="input" aria-label="Its number, if any" placeholder="Its number, if any" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
                  <p className="gw-links"><button type="submit" className="btn pri sm" disabled={act.isPending}>Save</button><button type="button" className="gw-link" onClick={() => setChanging(null)}>Cancel</button></p>
                </form>
              : <p className="gw-links t-small"><button type="button" className="gw-link" onClick={() => act.mutate({ objectiveId: g.id, outcome: 'continue' })}>Continue</button><button type="button" className="gw-link" onClick={() => setChanging(g.id)}>Change</button><button type="button" className="gw-link" onClick={() => act.mutate({ objectiveId: g.id, outcome: 'stop' })}>Stop</button></p>) : undefined} />
        ))}
      </EdgeList>
    </Section>
  )
}

function WriteTheBrief({ groundId, raw, onDone }: { groundId: string; raw: any; onDone: () => void }) {
  const qc = useQueryClient()
  const people = useQuery({ queryKey: ['ground-people-for-brief', groundId], queryFn: () => groundsApi.get(groundId), retry: false })
  const [items, setItems] = useState<{ verb: string; what: string; whoParticipantId?: string | null }[]>(raw?.items?.length ? raw.items : [{ verb: 'Stop', what: '' }])
  const [unclear, setUnclear] = useState(raw?.unclear ?? '')
  const [asks, setAsks] = useState(raw?.questionsNow?.[0]?.asks ?? ''); const [replaces, setReplaces] = useState(raw?.questionsNow?.[0]?.replaces ?? '')
  const save = useMutation({
    mutationFn: () => directionApi.setBrief(groundId, { items: items.filter((i) => i.what.trim()), unclear, questionsNow: asks ? [{ asks, replaces }] : [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['direction-brief', groundId] }); qc.invalidateQueries({ queryKey: ['direction'] }); onDone() }, onError: fail,
  })
  const parts: { id: string; name: string }[] = ((people.data as any)?.participants ?? []).map((p: any) => ({ id: p.id, name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || p.nameGiven || p.email }))
  return (
    <form className="panel pad gw-col-10" aria-label="Write the brief" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      {items.map((it, i) => (
        <div key={i} className="gw-brief-row">
          <select className="input" aria-label="What happens to it" value={it.verb} onChange={(e) => setItems((xs) => xs.map((x, j) => j === i ? { ...x, verb: e.target.value } : x))}>{['Stop', 'Continue', 'Continue, changed', 'Start', 'Reassign'].map((v) => <option key={v}>{v}</option>)}</select>
          <input className="input" aria-label="What" placeholder="What" value={it.what} onChange={(e) => setItems((xs) => xs.map((x, j) => j === i ? { ...x, what: e.target.value } : x))} />
          <select className="input" aria-label="Whose it is" value={it.whoParticipantId ?? ''} onChange={(e) => setItems((xs) => xs.map((x, j) => j === i ? { ...x, whoParticipantId: e.target.value || null } : x))}><option value="">Nobody in particular</option>{parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
      ))}
      <button type="button" className="gw-link t-small gw-start" onClick={() => setItems((xs) => [...xs, { verb: 'Continue', what: '' }])}>Add a line</button>
      <label className="gw-col-6 t-small"><span className="mut">What is unclear, if anything</span><input className="input" value={unclear} onChange={(e) => setUnclear(e.target.value)} /></label>
      <label className="gw-col-6 t-small"><span className="mut">The question the check-in asks now</span><input className="input" value={asks} onChange={(e) => setAsks(e.target.value)} /></label>
      <label className="gw-col-6 t-small"><span className="mut">The old question it replaces</span><input className="input" value={replaces} onChange={(e) => setReplaces(e.target.value)} /></label>
      <p className="gw-links"><button type="submit" className="btn pri sm" disabled={save.isPending}>Save the brief</button><button type="button" className="gw-link" onClick={onDone}>Cancel</button></p>
    </form>
  )
}

function SetTheDirection({ current, onDone }: { current: DirectionRead; onDone: () => void }) {
  const qc = useQueryClient()
  const grounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list })
  const [now, setNow] = useState<Record<string, string>>({}); const [changed, setChanged] = useState<Record<string, string>>({})
  const [means, setMeans] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: () => directionApi.setNew({ now, whatChanged: changed, teams: Object.entries(means).filter(([, v]) => v.trim()).map(([groundId, v]) => ({ groundId, means: v })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['direction'] }); toast.success('The direction is set. Each team’s lead is asked to approve what it means for them.'); onDone() }, onError: fail,
  })
  const NOW: [string, string][] = [['achieve', 'What we’re trying to achieve'], ['why', 'Why it matters'], ['believe', 'What we currently believe'], ['learned', 'What we’ve learned so far'], ['mattersMost', 'What matters most right now'], ['whoOwns', 'Who owns what']]
  const CH: [string, string][] = [['assumed', 'What we assumed'], ['showedNotTrue', 'What showed it wasn’t true'], ['learned', 'What we learned'], ['decided', 'What we decided'], ['newDirection', 'The new direction']]
  return (
    <form className="panel pad gw-col-10" aria-label="Set the direction" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <h2 className="t-h3">Now</h2>
      {NOW.map(([k, l]) => <label key={k} className="gw-col-6 t-small"><span className="mut">{l}</span><input className="input" value={now[k] ?? ''} onChange={(e) => setNow((x) => ({ ...x, [k]: e.target.value }))} /></label>)}
      <h2 className="t-h3">What changed</h2>
      {CH.map(([k, l]) => <label key={k} className="gw-col-6 t-small"><span className="mut">{l}</span><input className="input" value={changed[k] ?? ''} onChange={(e) => setChanged((x) => ({ ...x, [k]: e.target.value }))} /></label>)}
      <h2 className="t-h3">What it means for each team</h2>
      {((grounds.data as any[]) ?? []).filter((g) => !['CLOSED', 'RESOLVED'].includes(g.status)).map((g: any) => <label key={g.id} className="gw-col-6 t-small"><span className="mut">{g.label}</span><input className="input" value={means[g.id] ?? ''} placeholder="Leave empty to leave this team out" onChange={(e) => setMeans((x) => ({ ...x, [g.id]: e.target.value }))} /></label>)}
      <p className="gw-links"><button type="submit" className="btn pri sm" disabled={save.isPending}>{current.direction ? 'Set the new direction' : 'Set the direction'}</button><button type="button" className="gw-link" onClick={onDone}>Cancel</button></p>
    </form>
  )
}

function TheLoop({ d }: { d: NonNullable<DirectionRead['direction']> }) {
  return (
    <>
      <Section heading="The loop" note="Every two weeks">
        <p className="t-body">Every two weeks Groundwork checks whether the organisation has realigned: whether each team has agreed what the direction means for them, whether work still serves the old priority, and whether any goal still on the board no longer makes sense. The next check is on {d.nextCheckOn}. When the direction changes, each lead writes their team’s brief first, then each person recommits, and nobody is judged against the old plan.</p>
      </Section>
      <Section heading="Revisions">
        <EdgeList label="Revisions">
          <EdgeRow kind="decide" reason={null} title={`Version ${d.version}, set on ${d.setOn}`} detail="The direction now." />
          {d.revisions.map((r) => <EdgeRow key={r.version} kind="look" reason={null} title={`Version ${r.version}, set on ${r.setOn}`} detail={r.says || 'An earlier direction.'} />)}
        </EdgeList>
      </Section>
    </>
  )
}

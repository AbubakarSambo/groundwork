import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leavingApi, type LeavingBoard, type LeavingList, type LeavingStepKey } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Panel, Button, Tag, Note, Empty, RowList, Row, FieldLabel, Select, TextField } from '@/components/gw/ui'

/**
 * WHEN SOMEONE LEAVES (E5, #/suite/leaving, group 2 piece 4). ADMINS ONLY, on the server. The wording
 * is copied from docs/prototype/screens/E-suites/suite-leaving.txt: "Everything that has to happen
 * when someone leaves, each with an owner, so nothing is forgotten.", "... leaves on 9 October", "0 of
 * 4 done", "Collect his laptop and phone", "Remove his access on his last day", "Work out his final
 * pay", "Mark done", "Signs a team is under strain" and "This is shown for the team, never for one
 * named person, and nobody is scored." The prototype's "his" is the person's first name.
 *
 * THE PRODUCT'S OWN HANDOVER is linked only by who took over and when (never what was in it), and it
 * is not changed. "Tom keeps his own history of his check-ins." and "The handover page gives Aisha what
 * she needs about his customers." are left out: the first is not always true (a leaver's words go
 * after the organisation's window), and there is no handover page yet (items 22.1 and 28).
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (crumbs, subtitle), `Section` for each list, "Already
 * left, with no list yet", "Start a list" and "Signs a team is under strain", `RowList`/`Row` for
 * every list, `Tag`/`Button` for Done/Undo/Mark done, `FieldLabel`/`Select`/`TextField` for "Start a
 * list", and `Note`/`Empty` for loading, error and empty states. No new parts were needed.
 *
 * WORDING NO SCREEN SHOWS (item 28): "... left on ...", "Hand over ...’s work", "Who does this",
 * "Nobody yet", "Undo", "... has the handover of ...’s role, since ...", "Start a list", "Who is
 * leaving", "Choose somebody", "Their last day", "Start the list", "Already left, with no list yet",
 * "Nobody is leaving." and "The board did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const longDay = (day: string) => whenItWas(new Date(`${day}T00:00:00.000Z`), 'dayAndMonthLong', 'UTC')
const todayIs = () => new Date().toISOString().slice(0, 10)

function stepSays(step: LeavingStepKey, l: LeavingList): string {
  const f = l.firstName
  if (step === 'handover') return l.handover ? `Hand over ${f}’s work to ${l.handover.to.split(' ')[0]}` : `Hand over ${f}’s work`
  if (step === 'equipment') return `Collect ${f}’s laptop and phone`
  if (step === 'access') return `Remove ${f}’s access on their last day`
  return `Work out ${f}’s final pay`
}

export function LeavingBoardPage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-leaving'],
    queryFn: leavingApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  const [problem, setProblem] = useState<string | null>(null)
  const done = (b: LeavingBoard) => { setProblem(null); qc.setQueryData(['suite-leaving'], b) }
  const failed = (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO)
  const start = useMutation({ mutationFn: (x: { personId: string; lastDay: string }) => leavingApi.start(x.personId, x.lastDay), onSuccess: done, onError: failed })

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'When someone leaves' }]}
        title="When someone leaves"
        subtitle="Everything that has to happen when someone leaves, each with an owner, so nothing is forgotten."
      />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error">{refused.data?.message ?? 'Only an admin can open this board.'}</Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {problem && <Note tone="error">{problem}</Note>}

      {data && (
        <>
          {(data.lists ?? []).length === 0 && <Empty>Nobody is leaving.</Empty>}
          {(data.lists ?? []).map(l => <AList key={l.id} l={l} owners={data.owners} onDone={done} onFailed={failed} />)}

          {(data.departures ?? []).length > 0 && (
            <Section heading="Already left, with no list yet">
              <RowList label="Already left, with no list yet">
                {(data.departures ?? []).map(d => (
                  <Row key={d.personId} columns="minmax(0, 1fr) auto">
                    <b>{`${d.name} left on ${longDay(d.departedOn)}.`}</b>
                    <Button kind="secondary" size="small" onClick={() => start.mutate({ personId: d.personId, lastDay: d.departedOn })}
                      disabled={start.isPending} aria-label={`Start the list for ${d.name}`}>Start the list</Button>
                  </Row>
                ))}
              </RowList>
            </Section>
          )}

          <StartAList people={data.people} onStart={(personId, lastDay) => start.mutate({ personId, lastDay })} busy={start.isPending} />

          {(data.strain ?? []).length > 0 && (
            <Section heading="Signs a team is under strain">
              <Panel>
                {(data.strain ?? []).map((s, i) => <p key={i} className="gwui-panel-text">{s.says}</p>)}
                <p className="gwui-panel-text-muted">This is shown for the team, never for one named person, and nobody is scored.</p>
              </Panel>
            </Section>
          )}
        </>
      )}
    </Page>
  )
}

function AList({ l, owners, onDone, onFailed }: {
  l: LeavingList; owners: LeavingBoard['owners']; onDone: (b: LeavingBoard) => void; onFailed: (e: unknown) => void
}) {
  const change = useMutation({
    mutationFn: (x: { step: LeavingStepKey; ownerUserId?: string | null; done?: boolean }) =>
      leavingApi.step(l.id, x.step, { ownerUserId: x.ownerUserId, done: x.done }),
    onSuccess: onDone,
    onError: onFailed,
  })
  const past = l.lastDay < todayIs()
  return (
    <Section heading={`${l.name} ${past ? 'left' : 'leaves'} on ${longDay(l.lastDay)}`} note={`${l.done} of ${l.of} done`}>
      <RowList label={`${l.name} ${past ? 'left' : 'leaves'} on ${longDay(l.lastDay)}`}>
        {l.steps.map(s => (
          <Row key={s.step} columns="minmax(0, 1fr) auto auto">
            <b>{stepSays(s.step, l)}</b>
            <span>
              <label className="gwui-sr-only" htmlFor={`leaving-${l.id}-${s.step}`}>Who does this</label>
              <Select id={`leaving-${l.id}-${s.step}`} value={s.ownerId ?? ''} disabled={change.isPending}
                onChange={e => change.mutate({ step: s.step, ownerUserId: e.target.value || null })}>
                <option value="">Nobody yet</option>
                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </span>
            {s.done ? (
              <span className="gwui-edge-acts">
                <Tag>Done</Tag>
                <Button kind="quiet" size="small" onClick={() => change.mutate({ step: s.step, done: false })} disabled={change.isPending}
                  aria-label={`Undo: ${stepSays(s.step, l)}`}>Undo</Button>
              </span>
            ) : (
              <Button kind="secondary" size="small" onClick={() => change.mutate({ step: s.step, done: true })} disabled={change.isPending}
                aria-label={`Mark done: ${stepSays(s.step, l)}`}>Mark done</Button>
            )}
          </Row>
        ))}
      </RowList>
      {l.handover && <p className="gwui-panel-text-muted">{`${l.handover.to} has the handover of ${l.firstName}’s role, since ${longDay(l.handover.on)}.`}</p>}
    </Section>
  )
}

function StartAList({ people, onStart, busy }: { people: LeavingBoard['people']; onStart: (personId: string, lastDay: string) => void; busy: boolean }) {
  const [who, setWho] = useState('')
  const [day, setDay] = useState('')
  return (
    <Section heading="Start a list">
      <Panel>
        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (who && day) onStart(who, day) }}>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="leaving-who">Who is leaving</FieldLabel>
            <Select id="leaving-who" value={who} onChange={e => setWho(e.target.value)}>
              <option value="">Choose somebody</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="leaving-day">Their last day</FieldLabel>
            <TextField id="leaving-day" type="date" value={day} onChange={e => setDay(e.target.value)} />
          </div>
          <div><Button type="submit" size="small" disabled={!who || !day || busy}>Start the list</Button></div>
        </form>
      </Panel>
    </Section>
  )
}

import { TheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { ThatsNotRight } from '@/components/gw/ThatsNotRight'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { InferenceReviewPanel } from '@/components/InferenceReviewPanel'
import { useSearchParams } from 'react-router-dom'
import { groundsApi, type MyWork, type ABehaviourRead } from '@/api/grounds'
import { TheirRecord } from '@/components/gw/TheirRecord'
import { TheCheckInYouJustFinished } from '@/components/gw/TheCheckInYouJustFinished'
import { TheReportYouSawAtTheEnd } from '@/components/gw/TheReportYouSawAtTheEnd'
import {
  Page, Section, Panel, Grid, Stat, EdgeList, EdgeRow, type EdgeKind, Table, Empty, Button, Callout, Tag, Text, Select,
  PartBoundary, Skeleton
} from '@/components/gw/ui'

/**
 * MY WORK, AS THE B7 PICTURES DRAW IT (Release 1B, pull request 3 of 3; Hafsah's references-and-my-work.md of 17 October 2026,
 * "2. My work", the wording from docs/prototype/screens/B7-my-work/*.txt). Drawn only where the organisation's Release 1B switch
 * is on; off, My work is today's page exactly as it was.
 *
 * ONE TEMPLATE FOR EVERY SCENARIO. The sections and their order never change: the person's name and three numbers, the focus
 * this week, To do, What you achieved, How you're performing (the seven behaviours, always in the same order), Coaching, Your
 * check-ins and Your reports, and their items. Only the words and the data change, and both come from the server
 * (GET /grounds/:id/my-work), which sends each reader only what they may read: a person is only ever sent their own page, and
 * the lead's view of a person carries no reports of theirs, so nothing here hides anything.
 *
 * NOTHING FROM TODAY'S PAGE IS LOST. What today's My work holds, and what References and resources no longer draws (the targets,
 * the plan as agreed, each person's card and what people are down as doing), is handed in by the calling page as `rest`, and each
 * part is drawn where it belongs on the B7 page (MyWorkPart), by the same code as before. It used to be poured out under the deals,
 * which made the page two and a half times the picture's length (page-look audit, 23 November 2026).
 *
 * WHERE THE PICTURE AND THE PRODUCT DIFFER (listed for Hafsah in docs/pull-request.md): "To improve" and "Late" are said as
 * sentences rather than joined with a colon; the dot between the library footnote's two parts is a comma.
 */
type Served = Extract<MyWork, { on: true }>

/**
 * WHERE THE REST OF MY WORK GOES (the design system, journey 4, Hafsah, 23 November 2026). What My work held before B7 (the
 * reader's own deliveries, targets and the plan, what keeps coming up, what they are carrying forward, their sessions) is drawn
 * in the place on the B7 page it belongs to, not poured out under the deals. The calling page draws each part; `'all'` is the
 * whole of it, in its old order, for when the server says My work's switch is off. `self` is whether the page is the reader's
 * own: what is only theirs (their deliveries, their carrying forward, their sessions) is drawn only on their own page.
 */
export type MyWorkPart = 'achieved' | 'expected' | 'coaching' | 'report' | 'check-ins' | 'after-check-ins'
export type TheRestOfMyWork = (part: MyWorkPart | 'all', self: boolean) => ReactNode

export function MyWorkPage({ groundId, rest, onAllYourReports, onEveryCheckIn, onWhoHasAnswered }: {
  groundId: string
  /** Today's My work, and the parts that moved here from References and resources, each drawn where it belongs. */
  rest?: TheRestOfMyWork
  /** Where "All your reports" goes: today's list of every session. */
  onAllYourReports?: () => void
  /** The lead's two ways into the whole check-in: every session, and who has answered. */
  onEveryCheckIn?: () => void
  onWhoHasAnswered?: () => void
}) {
  const [person, setPerson] = useState<string | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-work', groundId, person],
    queryFn: () => groundsApi.myWork(groundId, person),
    enabled: !!groundId,
  })
  const leadLinks = (onEveryCheckIn || onWhoHasAnswered) && (
    <>
      {onEveryCheckIn && <Button kind="quiet" onClick={onEveryCheckIn}>Every check-in</Button>}
      {onWhoHasAnswered && <Button kind="quiet" onClick={onWhoHasAnswered}>Who has answered</Button>}
    </>
  )
  /* The rest of My work starts its own reads now, beside /my-work, not after it (page loads, 22 November 2026: a waterfall). It is
     mounted out of sight until the page above it is drawn, and read from the same cache when it is. */
  if (isLoading) return <><Skeleton what="Getting My work" shape="rows" /><div hidden>{rest?.('all', true)}</div></>
  if (error || !data) return <Callout tone="warning">My work could not be read just now. Try again in a moment.</Callout>
  /* The server says the switch is off: today's page, as it was handed in. */
  if (!data.on) return <>{rest?.('all', true)}{leadLinks}</>
  /* The direct morning (lib/the-direct-morning.tsx): said once for the page and the rest of My work inside it. */
  return (
    <TheDirectMorning on={isTheDirectMorningOn(data)}>
      <PartBoundary><ThePage groundId={groundId} served={data} onPerson={setPerson} rest={rest} onAllYourReports={onAllYourReports} leadLinks={leadLinks || null} /></PartBoundary>
    </TheDirectMorning>
  )
}

const VERDICT_TONE: Record<ABehaviourRead['verdict'], 'proven' | 'attention' | 'plain'> = {
  Strength: 'proven',
  'Needs work': 'attention',
  'Not enough yet': 'plain',
}
const VERDICT_DOT: Record<ABehaviourRead['verdict'], EdgeKind | undefined> = {
  Strength: 'ready',
  'Needs work': 'look',
  'Not enough yet': undefined,
}

/**
 * MY WORK, IN THE B7 ORDER, FROM THE BUILDING BLOCKS (the twelve layout rules). The person's name is the page's title, their numbers
 * under it, then the focus, To do, What you achieved, How you're performing, Coaching, their record, Your report, Your check-ins and
 * Your reports side by side, and the deals. What the B7 picture does not show but people use is drawn where it belongs (MyWorkPart).
 */
function ThePage({ groundId, served, onPerson, rest, onAllYourReports, leadLinks }: {
  groundId: string; served: Served; onPerson: (id: string) => void; rest?: TheRestOfMyWork; onAllYourReports?: () => void; leadLinks: ReactNode
}) {
  const self = served.view === 'self'
  const first = served.person.firstName
  const your = self ? 'Your' : `${first}’s`
  /* Judgements of a person are served unless the organisation keeps them off (api organisation/person-judgements.ts). */
  const judged = served.judgements !== false
  const part = (p: MyWorkPart) => rest?.(p, self) ?? null
  return (
    <Page
      title={served.heading}
      /* THE LEAD CHOOSES WHOSE PAGE. Only in her payload. */
      action={served.people && served.people.length > 0 ? (
        <Select value={served.person.participantId} onChange={(e) => onPerson(e.target.value)} aria-label="Whose work">
          {served.people.map((p) => <option key={p.participantId} value={p.participantId}>{p.name}</option>)}
        </Select>
      ) : undefined}
    >
      {/* THEIR NUMBERS. The server's topLine is an explainer and a privacy note, so it is not drawn (Hafsah, 15 November 2026). */}
      {served.numbers.length > 0 && (
        <div data-gw-my-work-top>
          <Grid columns={3} label={`${your} numbers`}>
            {served.numbers.map((n, i) => <Stat key={i} role="listitem" label={n.label} value={n.value} />)}
          </Grid>
        </div>
      )}

      {/* THE FOCUS THIS WEEK, from the most important Needs work, named inside its card. Not served where judgements of a person are off. */}
      {judged && (served.focus
        ? (
          <Panel as="section" aria-label={`${your} focus this week`} data-gw-my-work-focus heading={`${your} focus this week`}>
            <Text size="body" as="p">{served.focus.line}</Text>
            <Text size="secondary" as="p">{served.focus.why}</Text>
          </Panel>
        )
        : <Empty>{served.focusEmpty}</Empty>)}

      <PartBoundary><ToDo served={served} askedOf={self ? 'Asked of you' : `Asked of ${first}`} /></PartBoundary>
      <PartBoundary><Achieved served={served} heading={self ? 'What you achieved' : `What ${first} achieved`} /></PartBoundary>
      {part('achieved')}
      {part('expected')}
      <PartBoundary>
        {judged
          ? <Performing served={served} heading={self ? 'How you’re performing' : `How ${first} is performing`} />
          : <Section heading={self ? 'How you’re performing' : `How ${first} is performing`}><Text size="secondary" as="p">{served.performing.note}</Text></Section>}
      </PartBoundary>
      {(judged || served.coaching.better.length > 0) && <PartBoundary><Coaching served={served} /></PartBoundary>}
      {part('coaching')}

      {/* THEIR RECORD, AND THE COACHING GROUNDWORK GAVE THEM: only where the server sends it (the direct morning). */}
      {served.record && <PartBoundary><TheirRecord record={served.record} /></PartBoundary>}

      {/* THE PERSON'S OWN REPORT, HERE (batch 2, group 5): it used to be a page of its own, then a whole-report page. */}
      {self && !served.reports.private && served.reports.items.length > 0 && <PartBoundary><YourReport groundId={groundId} items={served.reports.items} /></PartBoundary>}
      {part('report')}

      {/* YOUR CHECK-INS AND YOUR REPORTS, side by side */}
      <Grid columns={2}>
        <PartBoundary><YourCheckInsPanel served={served} judged={judged} sessions={part('check-ins')} leadLinks={leadLinks} /></PartBoundary>
        <PartBoundary><YourReportsPanel served={served} self={self} onAllYourReports={onAllYourReports} /></PartBoundary>
      </Grid>
      {part('after-check-ins')}

      <PartBoundary><Items groundId={groundId} served={served} /></PartBoundary>
    </Page>
  )
}

function YourCheckInsPanel({ served, judged, sessions, leadLinks }: { served: Served; judged: boolean; sessions: ReactNode; leadLinks: ReactNode }) {
  const c = served.checkIns
  return (
    <Panel heading={c.heading}>
      {c.emptySays ? <Text size="secondary" as="p">{c.emptySays}</Text> : (
        <Table
          caption={c.heading}
          hideHeader
          onPanel={false}
          minWidth={0}
          columns={[{ key: 'what', header: 'What', rowHeader: true }, { key: 'count', header: 'How many', numeric: true }]}
          rows={[
            { what: 'Done', count: `${c.done} of ${c.due}` },
            ...(judged ? [{ what: 'On time', count: `${c.onTime} of ${c.due}` }, { what: 'Specific', count: `${c.specific} of ${c.due}` }] : []),
          ]}
        />
      )}
      {sessions}
      {leadLinks && <div className="ds-row-actions">{leadLinks}</div>}
    </Panel>
  )
}

function YourReportsPanel({ served, self, onAllYourReports }: { served: Served; self: boolean; onAllYourReports?: () => void }) {
  const r = served.reports
  return (
    <Panel heading={r.heading}>
      {r.private ? <Text size="secondary" as="p">{r.private}</Text> : r.items.length === 0 ? (
        <Text size="secondary" as="p">{r.emptySays}</Text>
      ) : (
        <>
          <EdgeList label={r.heading}>
            {r.items.map((x) => (
              <EdgeRow
                key={x.checkInId}
                reason={null}
                title={x.when}
                detail={x.line}
                actions={self ? <ReadThisOne checkInId={x.checkInId} /> : <Button kind="quiet" to={`/checkin/${x.checkInId}/report`}>Read</Button>}
              />
            ))}
          </EdgeList>
          {onAllYourReports && <div><Button kind="quiet" onClick={onAllYourReports}>All your reports</Button></div>}
        </>
      )}
    </Panel>
  )
}

function ToDo({ served, askedOf }: { served: Served; askedOf: string }) {
  const { othersNeed: allOthers, own: allOwn, emptySays } = served.toDo
  /* Three, then "and N more" (Hafsah, 25 October: lists stop at three). */
  const [all, setAll] = useState(false)
  const othersNeed = all ? allOthers : allOthers.slice(0, 3)
  const own = all ? allOwn : allOwn.slice(0, Math.max(0, 3 - othersNeed.length))
  const more = allOthers.length + allOwn.length - othersNeed.length - own.length
  return (
    <Section heading="To do" action={more > 0 ? <Button kind="quiet" onClick={() => setAll(true)}>{`and ${more} more`}</Button> : undefined}>
      {othersNeed.length + own.length === 0 ? <Empty>{emptySays}</Empty> : (
        <EdgeList label="To do">
          {othersNeed.map((t) => (
            <EdgeRow
              key={t.id}
              kind="look"
              reason={null}
              title={t.text}
              detail={<><Tag tone="attention">{askedOf}</Tag>{' '}<span data-gw-asked-of={t.id}>{t.when}</span></>}
            />
          ))}
          {own.map((t) => (
            <EdgeRow
              key={t.id}
              kind={t.done ? 'ready' : t.late ? 'look' : undefined}
              reason={null}
              title={t.text}
              detail={<>
                {t.done ? <Tag tone="proven">Done</Tag> : t.late ? <Tag tone="attention">Late</Tag> : <Tag>To do</Tag>}
                {t.when && <>{' '}<span>{t.when}</span></>}
                {t.whose && <Text size="meta" as="p">{t.whose}</Text>}
              </>}
              actions={<ThatsNotRight line={t.text} />}
            />
          ))}
        </EdgeList>
      )}
    </Section>
  )
}

function Achieved({ served, heading }: { served: Served; heading: string }) {
  const a = served.achieved
  return (
    <Section heading={heading} note={a.note || undefined}>
      {a.items.length === 0 ? <Empty>{a.emptySays}</Empty> : (
        <EdgeList label={heading}>
          {a.items.map((x, i) => (
            <EdgeRow key={i} kind="ready" reason={null} title={x.text} detail={x.proof} actions={<ThatsNotRight line={x.text} />} />
          ))}
        </EdgeList>
      )}
    </Section>
  )
}

const basedOn = (s: string) => `Based on ${s.replace(/^Your\b/, 'your')}.`

/**
 * THE SEVEN BEHAVIOURS, IN THE LIBRARY'S ORDER. Behaviours the record cannot read yet say the same sentence each; they are drawn as
 * one row that names them all, rather than six rows saying the same thing (page-look audit, 23 November 2026).
 */
function Performing({ served, heading }: { served: Served; heading: string }) {
  const p = served.performing
  const rows: { key: string; names: string[]; b: ABehaviourRead }[] = []
  for (const b of p.behaviours) {
    const same = b.verdict === 'Not enough yet' && !b.means && !b.toImprove
      ? rows.find((r) => r.b.verdict === b.verdict && !r.b.means && !r.b.toImprove && r.b.happened === b.happened)
      : undefined
    if (same) same.names.push(b.name)
    else rows.push({ key: b.key, names: [b.name], b })
  }
  /* "Keeping promises, planning ahead and helping your team": one sentence, so only its first word has a capital. */
  const lower = (n: string) => n.charAt(0).toLowerCase() + n.slice(1)
  const together = (names: string[]) => names.length > 1
    ? `${[names[0], ...names.slice(1, -1).map(lower)].join(', ')} and ${lower(names[names.length - 1])}`
    : names[0]
  return (
    <Section heading={heading} note={p.note || undefined} foot={p.libraryNote || undefined}>
      <EdgeList label={heading}>
        {rows.map(({ key, names, b }) => (
          <div key={key} data-gw-behaviour={b.key}>
            <EdgeRow
              kind={VERDICT_DOT[b.verdict]}
              reason={null}
              title={together(names)}
              detail={<>
                <Tag tone={VERDICT_TONE[b.verdict]}>{b.verdict}</Tag>
                <Text size="body" as="p">{b.happened}</Text>
                {b.means && <Text size="body" as="p"><b>{b.means}</b></Text>}
                {b.toImprove && <><Text size="secondary" as="p"><b>How to improve</b></Text><Text size="body" as="p">{b.toImprove}</Text></>}
                {b.basedOn && <Text size="meta" as="p">{basedOn(b.basedOn)}</Text>}
              </>}
            />
          </div>
        ))}
      </EdgeList>
    </Section>
  )
}

function Coaching({ served }: { served: Served }) {
  const c = served.coaching
  const judged = served.judgements !== false
  return (
    <Section heading="Coaching">
      <Grid columns={2}>
        <Panel heading="Things to do better">
          {c.better.length === 0 ? <Text size="secondary" as="p">{c.betterEmpty}</Text> : c.better.map((l, i) => (
            <div key={i}>
              <Text size="body" as="p">{l.text}</Text>
              <Text size="meta" as="p">{l.from}</Text>
            </div>
          ))}
        </Panel>
        {judged && (
          <Panel heading="Keep doing">
            {c.keep.length === 0 ? <Text size="secondary" as="p">{c.keepEmpty}</Text> : c.keep.map((k) => <Text key={k} size="body" as="p">{k}</Text>)}
          </Panel>
        )}
      </Grid>
    </Section>
  )
}

function Items({ groundId, served }: { groundId: string; served: Served }) {
  const it = served.items
  if (!it.heading) return null
  return (
    <Section heading={it.heading} note={it.note || undefined} action={<Button kind="quiet" to={`/grounds/${groundId}/board`}>See all</Button>}>
      {it.rows.length === 0 ? <Empty>{it.emptySays}</Empty> : (
        <Table
          caption={it.heading}
          hideHeader
          onPanel={false}
          phone="stack"
          columns={[
            { key: 'name', header: 'Name', rowHeader: true },
            { key: 'stage', header: 'Stage' },
            { key: 'next', header: 'Next step' },
            { key: 'proof', header: 'Proof' },
          ]}
          rows={it.rows.slice(0, 5).map((r) => ({
            name: r.name,
            stage: r.stage ?? 'No stage yet',
            next: r.nextBooked ? r.next : { tag: r.next, tone: 'attention' as const },
            proof: r.proven ? { tag: r.proof, tone: 'proven' as const } : r.proof,
          }))}
        />
      )}
    </Section>
  )
}

/**
 * ONE OF YOUR OWN REPORTS, DRAWN ON MY WORK (Hafsah, 4 November, issue 55).
 *
 * The session named in the address (`report`, from a link or "Read" below), or else the latest.
 * The same report the old report page drew (TheCheckInYouJustFinished, as pictured), so nothing
 * in it is lost; only the page around it is gone.
 */
function YourReport({ groundId, items }: { groundId: string; items: { checkInId: string; when: string }[] }) {
  const [searchParams] = useSearchParams()
  const asked = searchParams.get('report')
  const chosen = items.find((r) => r.checkInId === asked) ?? items[0]
  const { data: ground } = useQuery({ queryKey: ['ground', groundId], queryFn: () => groundsApi.get(groundId), enabled: !!groundId, retry: false })
  /* The on-time credit, served to the person whose report it is (api engagement/who-answers-and-when.ts). */
  const { data: session } = useQuery({ queryKey: ['session-report', chosen.checkInId], queryFn: () => conversationApi.sessionReport(chosen.checkInId), enabled: !!chosen.checkInId, retry: false })
  /* The claims read from what they said rather than quoted, each correctable: walled to this reader at the read. */
  const { data: groundReport } = useQuery({ queryKey: ['report', groundId], queryFn: () => reportsApi.get(groundId), enabled: !!groundId && !!(ground as any)?.report, retry: false })
  const download = useMutation({
    mutationFn: () => conversationApi.download(chosen.checkInId),
    onSuccess: () => toast.success('Your record is downloading.'),
    onError: () => toast.error('Could not download that record. Try again.'),
  })
  const row = (((ground as any)?.checkIns ?? []) as any[]).find((c) => c.id === chosen.checkInId)
  if (!row?.sessionNumber) return null
  const inferences = (groundReport as any)?.inferences
  return (
    <Section id="your-report" heading="Your report" note={chosen.when}>
      {session?.onTime && <Text size="secondary" as="p">{session.onTime}</Text>}
      {/* Where the session's own report stands, in the server's sentence, when there is none to draw (where-a-sessions-report-stands.ts). */}
      {session && !session.report && session.state && session.state !== 'ready' && session.says && <p className="ds-text-secondary" role="status">{session.says}</p>}
      {/* A session answered before signing in kept the report it ended on; that one is drawn, the same as the end showed it. */}
      {session?.report
        ? <TheReportYouSawAtTheEnd report={session.report} />
        : <TheCheckInYouJustFinished checkInId={chosen.checkInId} groundId={groundId} sessionNumber={row.sessionNumber} light pictured />}
      {Array.isArray(inferences) && inferences.length > 0 && <InferenceReviewPanel groundId={groundId} inferences={inferences} />}
      <div>
        <Button kind="quiet" disabled={download.isPending} onClick={() => download.mutate()} aria-label={`Download your check-in ${row.sessionNumber} record`}>
          {download.isPending ? 'Downloading…' : 'Download your record'}
        </Button>
      </div>
    </Section>
  )
}

/** "Read" opens that session's report above, on this page, rather than on a page of its own. */
function ReadThisOne({ checkInId }: { checkInId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  return (
    <Button
      kind="quiet"
      onClick={() => {
        const next = new URLSearchParams(searchParams)
        next.set('report', checkInId)
        setSearchParams(next, { replace: true })
        document.getElementById('your-report')?.scrollIntoView?.({ block: 'start' })
      }}
    >
      Read
    </Button>
  )
}

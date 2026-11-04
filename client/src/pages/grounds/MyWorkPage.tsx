import { TheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { ThatsNotRight } from '@/components/gw/ThatsNotRight'
import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { groundsApi, type MyWork, type ABehaviourRead } from '@/api/grounds'
import { TheirRecord } from '@/components/gw/TheirRecord'
import {
  Section, Panel, Note, Callout, Stack, Folded, FlexRow, Tag, Text, Select, RowList, Row, FieldRows, FieldRow,
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
 * the plan as agreed, each person's card and what people are down as doing), is handed in by the calling page as `rest` and
 * drawn after the new sections, by the same code as before.
 *
 * WHERE THE PICTURE AND THE PRODUCT DIFFER (listed for Hafsah in docs/pull-request.md): "To improve" and "Late" are said as
 * sentences rather than joined with a colon; the dot between the library footnote's two parts is a comma.
 */
type Served = Extract<MyWork, { on: true }>

export function MyWorkPage({ groundId, rest, onAllYourReports }: {
  groundId: string
  /** Today's My work, and the parts that moved here from References and resources, drawn after the new sections. */
  rest?: ReactNode
  /** Where "All your reports" goes: today's list of every session. */
  onAllYourReports?: () => void
}) {
  const [person, setPerson] = useState<string | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-work', groundId, person],
    queryFn: () => groundsApi.myWork(groundId, person),
    enabled: !!groundId,
  })
  if (isLoading) return <Note role="status">Getting My work…</Note>
  if (error || !data) return <Callout tone="warning">My work could not be read just now. Try again in a moment.</Callout>
  /* The server says the switch is off: today's page, as it was handed in. */
  if (!data.on) return <>{rest}</>
  /* The direct morning (lib/the-direct-morning.tsx): said once for the page and the rest of My work inside it. */
  return (
    <TheDirectMorning on={isTheDirectMorningOn(data)}>
      <ThePage groundId={groundId} served={data} onPerson={setPerson} rest={rest} onAllYourReports={onAllYourReports} />
    </TheDirectMorning>
  )
}

const VERDICT_TONE: Record<ABehaviourRead['verdict'], 'proven' | 'attention' | 'plain'> = {
  Strength: 'proven',
  'Needs work': 'attention',
  'Not enough yet': 'plain',
}

function ThePage({ groundId, served, onPerson, rest, onAllYourReports }: {
  groundId: string; served: Served; onPerson: (id: string) => void; rest?: ReactNode; onAllYourReports?: () => void
}) {
  const self = served.view === 'self'
  const first = served.person.firstName
  const your = self ? 'Your' : `${first}’s`
  /* Judgements of a person are served unless the organisation keeps them off (api organisation/person-judgements.ts). */
  const judged = served.judgements !== false
  return (
    /* B7: section headings in Literata, as the picture draws them (gwui-b-tab). */
    <div className="gwui-b-tab">
    <Stack gap={30}>
      {/* THE LEAD CHOOSES WHOSE PAGE. Only in her payload. */}
      {served.people && served.people.length > 0 && (
        <FlexRow gap={8} align="center" wrap>
          <Text size="14" ink="sub" as="span">Whose work</Text>
          <Select value={served.person.participantId} onChange={(e) => onPerson(e.target.value)} aria-label="Whose work">
            {served.people.map((p) => <option key={p.participantId} value={p.participantId}>{p.name}</option>)}
          </Select>
        </FlexRow>
      )}

      {/* THEIR NAME AND THREE NUMBERS */}
      <div data-gw-my-work-top>
        <Section heading={served.heading} note={served.topLine}>
          {/* B7: three small chips, the number large and its words beside it, not three wide tiles. */}
          <div className="gwui-chips" role="list" aria-label="Your numbers">
            {served.numbers.map((n, i) => (
              <span key={i} className="gwui-chip" role="listitem"><b className="gwui-chip-value">{n.value}</b> <span className="gwui-chip-label">{n.label}</span></span>
            ))}
          </div>
        </Section>
      </div>

      {/* THE FOCUS THIS WEEK, from the most important Needs work. Not served where the organisation keeps judgements of a person off. */}
      {/* B7: the focus is the one dark band on the page, named inside the band, not a section heading of its own. */}
      {judged && (served.focus
        ? <section aria-label={`${your} focus this week`} data-gw-my-work-focus className="gwui-focus-band"><p className="gw-focus-label">{`${your} focus this week`}</p><p className="gwui-focus-line">{served.focus.line}</p><p className="gwui-focus-why">{served.focus.why}</p></section>
        : <Note tone="muted">{served.focusEmpty}</Note>)}

      <ToDo served={served} askedOf={self ? 'Asked of you' : `Asked of ${first}`} />
      <Achieved served={served} heading={self ? 'What you achieved' : `What ${first} achieved`} />
      {judged
        ? <Performing served={served} heading={self ? 'How you’re performing' : `How ${first} is performing`} />
        : <Section heading={self ? 'How you’re performing' : `How ${first} is performing`}><Note tone="muted">{served.performing.note}</Note></Section>}
      {(judged || served.coaching.better.length > 0) && <Coaching served={served} />}

      {/* THEIR RECORD, AND THE COACHING GROUNDWORK GAVE THEM: only where the server sends it (the direct morning). */}
      {served.record && <TheirRecord record={served.record} asOneFold />}

      {/* YOUR CHECK-INS AND YOUR REPORTS, side by side */}
      <div className="gwui-two-up">
        <Panel heading={served.checkIns.heading}>
          {served.checkIns.emptySays ? <Note tone="muted">{served.checkIns.emptySays}</Note> : (
            <FieldRows>
              <FieldRow label="Done" value={`${served.checkIns.done} of ${served.checkIns.due}`} />
              {judged && <FieldRow label="On time" value={`${served.checkIns.onTime} of ${served.checkIns.due}`} />}
              {judged && <FieldRow label="Specific" value={`${served.checkIns.specific} of ${served.checkIns.due}`} />}
            </FieldRows>
          )}
        </Panel>
        <Panel heading={served.reports.heading}>
          {served.reports.private ? <Note tone="muted">{served.reports.private}</Note> : served.reports.items.length === 0 ? (
            <Note tone="muted">{served.reports.emptySays}</Note>
          ) : (
            <Stack gap={8}>
              <RowList label={served.reports.heading}>
                {served.reports.items.map((r) => (
                  <Row key={r.checkInId} columns="minmax(110px, auto) 1fr auto" inset="panel">
                    <Text size="14" weight={600} as="span">{r.when}</Text>
                    <span>{r.line}</span>
                    <Link to={`/checkin/${r.checkInId}/report`}>Read</Link>
                  </Row>
                ))}
              </RowList>
              {onAllYourReports && <div><button type="button" className="gw-link t-small gw-bold" onClick={onAllYourReports}>All your reports</button></div>}
            </Stack>
          )}
        </Panel>
      </div>

      <Items groundId={groundId} served={served} />

      {/* B7 ends with the deals. Everything the page carried before B7 stays, folded under one line, so nothing is lost and the page is B7's length. */}
      {rest && <Folded summary={self ? 'More from your check-ins' : `More from ${first}’s check-ins`}>{rest}</Folded>}
    </Stack>
    </div>
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
    <Section heading="To do">
      {othersNeed.length + own.length === 0 ? <Note tone="muted">{emptySays}</Note> : (
        <Panel pad={false}>
          <RowList label="To do">
            {othersNeed.map((t) => (
              <Row key={t.id} columns="auto 1fr auto" inset="panel">
                <Tag tone="attention">{askedOf}</Tag>
                <span data-gw-asked-of={t.id}>{t.text}</span>
                <Note tone="amber">{t.when}</Note>
              </Row>
            ))}
            {own.map((t) => (
              <Row key={t.id} columns="auto 1fr auto" inset="panel">
                {t.done ? <Tag tone="proven">Done</Tag> : t.late ? <Tag tone="attention">Late</Tag> : <Tag>To do</Tag>}
                <span>
                  {t.text}
                  {t.whose && <Note tone="muted">{t.whose}</Note>}
                  <ThatsNotRight line={t.text} />
                </span>
                {t.when ? <Note tone={t.late ? 'amber' : 'muted'}>{t.when}</Note> : <span />}
              </Row>
            ))}
          </RowList>
        </Panel>
      )}
      {more > 0 && <button type="button" className="gw-link t-small gw-start" onClick={() => setAll(true)}>{`and ${more} more`}</button>}
    </Section>
  )
}

function Achieved({ served, heading }: { served: Served; heading: string }) {
  const a = served.achieved
  return (
    <Section heading={heading} note={a.note}>
      {a.items.length === 0 ? <Note tone="muted">{a.emptySays}</Note> : (
        <Panel pad={false}>
          <RowList label={heading}>
            {a.items.map((x, i) => (
              <Row key={i} columns="1fr auto" inset="panel">
                <span>{x.text} <ThatsNotRight line={x.text} /></span>
                <Note tone="muted">{x.proof}</Note>
              </Row>
            ))}
          </RowList>
        </Panel>
      )}
    </Section>
  )
}

const basedOn = (s: string) => `Based on ${s.replace(/^Your\b/, 'your')}.`

function Performing({ served, heading }: { served: Served; heading: string }) {
  const p = served.performing
  return (
    <Section heading={heading} note={p.note} foot={p.libraryNote}>
      <Panel pad={false}>
        <RowList label={heading}>
          {p.behaviours.map((b) => (
            <Row key={b.key} columns="minmax(150px, 220px) 1fr" inset="panel">
              <div data-gw-behaviour={b.key}>
                <Text size="14-5" weight={700} as="p">{b.name}</Text>
                <Tag tone={VERDICT_TONE[b.verdict]}>{b.verdict}</Tag>
              </div>
              <Stack gap={4}>
                <span>{b.happened}</span>
                {b.means && <Text size="14-5" weight={700} as="p">{b.means}</Text>}
                {b.toImprove && (
                  <div>
                    <Note tone="navy">How to improve</Note>
                    <span>{b.toImprove}</span>
                  </div>
                )}
                {b.basedOn && <Note tone="muted">{basedOn(b.basedOn)}</Note>}
              </Stack>
            </Row>
          ))}
        </RowList>
      </Panel>
    </Section>
  )
}

function Coaching({ served }: { served: Served }) {
  const c = served.coaching
  const judged = served.judgements !== false
  return (
    <Section heading="Coaching">
      <div className={judged ? 'gwui-two-up' : undefined}>
        <Panel heading="Things to do better">
          {c.better.length === 0 ? <Note tone="muted">{c.betterEmpty}</Note> : (
            <ul className="gwui-panel-list">
              {c.better.map((l, i) => (
                <li key={i}>
                  <span>{l.text}</span>
                  <Note tone="muted">{l.from}</Note>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {judged && (
          <Panel heading="Keep doing">
            {c.keep.length === 0 ? <Note tone="muted">{c.keepEmpty}</Note> : (
              <ul className="gwui-panel-list">
                {c.keep.map((k) => <li key={k}>{k}</li>)}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </Section>
  )
}

function Items({ groundId, served }: { groundId: string; served: Served }) {
  const it = served.items
  if (!it.heading) return null
  return (
    <Section heading={it.heading} note={it.note} action={<Link to={`/grounds/${groundId}/board`}>See all</Link>}>
      {it.rows.length === 0 ? <Note tone="muted">{it.emptySays}</Note> : (
        <Panel pad={false}>
          <RowList label={it.heading}>
            {it.rows.slice(0, 5).map((r) => (
              <Row key={r.id} columns="minmax(140px, 1.2fr) minmax(90px, 0.8fr) 1.4fr minmax(90px, 0.8fr)" inset="panel">
                <Text size="14-5" weight={700} as="span">{r.name}</Text>
                <span>{r.stage ?? 'No stage yet'}</span>
                {r.nextBooked ? <span>{r.next}</span> : <Note tone="amber">{r.next}</Note>}
                {r.proven ? <Tag tone="proven">{r.proof}</Tag> : <Note tone="muted">{r.proof}</Note>}
              </Row>
            ))}
          </RowList>
        </Panel>
      )}
    </Section>
  )
}

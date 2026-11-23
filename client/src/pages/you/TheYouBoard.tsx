/**
 * YOU, ON THE DESIGN SYSTEM (page audit row 4, Hafsah, 24 November 2026: "Hide the empty parts. One commitments list, one reports list,
 * one coaching section.").
 *
 * The prototype's You board (C2-the-you-board) in its order: your board (where you stand, worth knowing now, what Groundwork noticed,
 * your goals, your to-dos, what you contributed, coaching), your turn, everything asked of you this week, what you said you'd do,
 * something that keeps coming up, your own reports, your work in each, and your data. Then the parts the prototype has no place for
 * (`more`: your leave, your requests, your CV and emergency contact).
 *
 * EACH PART IS DRAWN ONLY WHEN THE RECORD HAS SOMETHING FOR IT. A box holding one sentence that says there is nothing is never drawn
 * (rule 10). When nothing about your own work is on record at all, the page says so in one line.
 *
 * ONE OF EACH:
 *   - What you said you'd do is the one list of your commitments (`saidYoudDo`, the one reading My work shares). The count kept lately
 *     is its line; what the running record says shows each one (a document, or your word) is said on its row; the goals you changed
 *     come under it. "Your commitments" and "Your record so far" no longer repeat it.
 *   - Your own reports is the one list of your reports and reviews (YourPerformanceHistory).
 *   - Coaching is the one coaching section: this week's step and what has been followed over time.
 *
 * WHAT IS SHOWN IS THE SERVER'S (GET /you serves only the signed-in person their own board). The page adds nothing and hides nothing it
 * was given, other than saying nothing where there is nothing.
 */
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAskStore } from '@/stores/ask'
import { todayApi } from '@/api/today'
import type { YourBoard } from '@/api/you'
import { Section, Panel, Button, Empty, Tag, EdgeList, EdgeRow, PatternPanel } from '@/components/gw/ui'
import { Grid } from '@/components/gw/ui/Stat'
import { WhereYouStandFromSuggestions } from '@/components/gw/Suggestions'
import { YourPerformanceHistory } from './YourPerformanceHistory'

type ARecordRow = { id: string; shows: string }
type TheRunningRecord = { inShort: string; rows: ARecordRow[]; adapted: string[] }

const TONE = { open: 'plain', kept: 'proven', not_done: 'concern' } as const

/** True when nothing about this person's own work is on record: the page is then one line. */
export function nothingAboutYourOwnWork(b: YourBoard): boolean {
  return !(b.suggestionsAboutYou ?? []).length && !b.whereYouStand?.says && !(b.worthKnowing ?? []).length && !b.noticed?.says
    && !(b.goals ?? []).length && !(b.todos ?? []).length && !(b.contributed ?? []).length && !b.coaching?.says?.trim() && !b.coachingOverTime
    && !(b.turns ?? []).length && !(b.askedOfYou?.items ?? []).length && !(b.saidYoudDo ?? []).length && !b.keptLately?.says
    && !(b.patterns ?? []).filter((p) => p.yours !== false).length && !(b.ownReports ?? []).length && !(b.checkIns ?? []).length
}

export function TheYouBoard({ b, more, yourData }: { b: YourBoard; more: ReactNode; yourData: ReactNode }) {
  const checkIns = b.checkIns ?? []
  const goals = b.goals ?? []
  const todos = b.todos ?? []
  const said = b.saidYoudDo ?? []
  const contributed = b.contributed ?? []
  const worth = b.worthKnowing ?? []
  const asked = b.askedOfYou?.items ?? []
  const patterns = (b.patterns ?? []).filter((p) => p.yours !== false)
  const turns = b.turns ?? []
  const record = (b as YourBoard & { runningRecord?: TheRunningRecord }).runningRecord ?? null
  const shows = new Map((record?.rows ?? []).map((r) => [r.id, r.shows]))
  const coaching = b.coaching?.says?.trim() ? b.coaching : null
  const showAsk = useAskStore((st) => st.show)
  /* The next check-in, when nothing is open for you now: Today's "coming up", the same read Today shows. */
  const { data: today } = useQuery({ queryKey: ['today'], queryFn: todayApi.get, staleTime: 30_000, retry: false })
  const next = (today as { comingUp?: { at?: string; what?: string; to?: string }[] } | undefined)?.comingUp?.[0] ?? null
  const nextDay = next?.at ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(next.at)) : null

  const panels: ReactNode[] = [
    b.whereYouStand?.says && (
      <Panel key="stand" as="section" heading="Where you stand">
        <p className="ds-text-body">{b.whereYouStand.says}</p>
        {b.whereYouStand.whatWouldChangeIt && <p className="ds-text-secondary">{`What would change this: ${b.whereYouStand.whatWouldChangeIt}`}</p>}
        {b.whereYouStand.decision && <p className="ds-text-secondary">{b.whereYouStand.decision}</p>}
      </Panel>
    ),
    worth.length > 0 && (
      <Panel key="worth" as="section" heading="Worth knowing now">
        {worth.map((w) => <p key={w} className="ds-text-body">{w}</p>)}
      </Panel>
    ),
    b.noticed?.says && (
      <Panel key="noticed" as="section" heading="Something Groundwork noticed about your work">
        <p className="ds-text-body">{b.noticed.says}</p>
      </Panel>
    ),
    goals.length > 0 && (
      <Panel key="goals" as="section" heading="Your goals">
        <ul className="ds-list ds-list-bullets">{goals.map((g) => <li key={g.id} className="ds-text-body">{g.says}</li>)}</ul>
      </Panel>
    ),
    todos.length > 0 && (
      <Panel key="todos" as="section" heading="Your to-dos">
        <ul className="ds-list ds-list-bullets">{todos.map((t) => <li key={t.id} className="ds-text-body">{t.text}</li>)}</ul>
        <Button kind="quiet" onClick={showAsk}>Add a to-do</Button>
      </Panel>
    ),
    contributed.length > 0 && (
      <Panel key="contributed" as="section" heading="What you contributed">
        <ul className="ds-list ds-list-bullets">{contributed.map((c) => <li key={c} className="ds-text-body">{c}</li>)}</ul>
      </Panel>
    ),
  ].filter(Boolean)
  const suggestions = b.suggestionsAboutYou ?? []

  if (nothingAboutYourOwnWork(b)) {
    return (
      <>
        <Empty>Nothing needs you about your own work yet.</Empty>
        {yourData}
        {more}
      </>
    )
  }

  return (
    <>
      {(suggestions.length > 0 || panels.length > 0) && (
        <Section heading="Your board">
          <WhereYouStandFromSuggestions items={suggestions} />
          {panels.length > 0 && <Grid columns={2}>{panels}</Grid>}
        </Section>
      )}

      {(coaching || b.coachingOverTime) && (
        <Section heading="Coaching">
          {coaching && <p className="ds-text-body"><b>{coaching.says}</b></p>}
          {coaching?.checkIn && <p className="ds-text-meta">{`This came from your last ${coaching.checkIn} check-in.`}</p>}
          {b.coachingOverTime && <p className="ds-text-body">{b.coachingOverTime}</p>}
        </Section>
      )}

      {turns.length > 0 ? turns.map((t, i) => (
        <Panel key={t.key} as="section" aria-label={t.title}>
          <p className="ds-text-card">{t.title}</p>
          {t.detail && <p className="ds-text-secondary">{t.detail}</p>}
          <Button kind={i === 0 ? 'primary' : 'secondary'} to={t.action.to}>{t.action.label}</Button>
        </Panel>
      )) : next && nextDay && (
        <EdgeList label="Your next check-in">
          <EdgeRow title={`Your next check-in opens on ${nextDay}`} detail={next.what} actions={next.to ? <Button kind="quiet" to={next.to}>Open it</Button> : undefined} />
        </EdgeList>
      )}

      {asked.length > 0 && (
        <Section heading="Everything asked of you this week" note="From every check-in you’re in" foot={b.askedOfYou?.says}>
          <EdgeList label="Everything asked of you this week">
            {asked.map((a) => (
              <EdgeRow key={a.id} title={a.what} detail={[a.who ? `${a.who} asked, in ${a.checkIn}.` : `In ${a.checkIn}.`, a.asked, a.standing].filter(Boolean).join(' ')} />
            ))}
          </EdgeList>
        </Section>
      )}

      {(said.length > 0 || b.keptLately?.says) && (
        <Section heading="What you said you’d do" note={b.keptLately?.says ?? record?.inShort ?? 'From every check-in'}>
          <EdgeList label="What you said you’d do">
            {said.map((s) => (
              <EdgeRow
                key={s.id}
                title={s.text}
                detail={[`${s.checkIn}${s.when ? `, ${s.when}` : ''}.`, shows.get(s.id)].filter(Boolean).join(' ')}
                actions={<Tag tone={TONE[s.state] ?? 'plain'}>{s.stateSays}</Tag>}
              />
            ))}
          </EdgeList>
          {(record?.adapted ?? []).map((a) => <p key={a} className="ds-text-secondary">{a}</p>)}
        </Section>
      )}

      {patterns.length > 0 && (
        <Section heading="Something that keeps coming up" note="About your part in the work">
          {patterns.map((p) => <PatternPanel key={p.id} pattern={p} invalidateKey={['you']} />)}
        </Section>
      )}

      <YourPerformanceHistory b={b} />

      {checkIns.length > 0 && (
        <Section heading="Your work in each">
          <EdgeList label="Your work in each">
            {checkIns.map((c) => <EdgeRow key={c.id} title={c.label} detail={c.line} actions={<Button kind="quiet" to={c.to}>Open</Button>} />)}
          </EdgeList>
        </Section>
      )}

      {yourData}
      {more}
    </>
  )
}

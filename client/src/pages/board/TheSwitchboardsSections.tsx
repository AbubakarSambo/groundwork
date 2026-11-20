import { Section, Panel, Tag, Note, Stack, Callout, SubHeading, ShowAll, FlexRow, Table } from '@/components/gw/ui'
import type { BoardPresent } from '@/api/board'
import { TheMetricsTable } from './pictured/TheMetricsBoard'
import { HowItIsGoing, type Glance } from '@/components/gw/how-it-is-going'

/**
 * THE SWITCHBOARD'S OWN SECTIONS (request 70): THE 22 PURPLE SECTIONS WITH NO SERVED FIELD BEFORE
 * 1 OCTOBER. `docs/answers-from-engine.md`, "1 October: the switchboard's 22 sections", says which
 * of the 22 the server now builds as a new top-level field on `GET /grounds/:id/board` - these
 * thirteen: `risks`, `workPlan`, `timeline`, `personHistory`, `blockerCheck`, `evidenceIndex`,
 * `busyOrMoving`, `leadActions`, `obligations`, `forecast`, `whoWaitedOnWhom`, `contradictions`,
 * `questionsForTheLead`. The other nine of the 22 are served already under a field BoardPage.tsx
 * already draws (Deal grid, Coaching, Themes, Pattern history, The other side, Commitments followed
 * over time, Actions and their results, Requirements review), or are not served at all because the
 * record does not hold them (Where the time went) - see `the-switchboard-g2-table.ts`'s own mapping.
 *
 * EVERY ONE OF THESE DRAWS ONLY WHAT THE SERVER SENDS. Who may read a row, and which rows this
 * reader gets at all, is already decided server-side (see the engine's own comment on
 * `WhoIsReading` in `api/src/modules/board/the-switchboards-own-sections.ts`); this file adds no
 * privacy rule of its own, and a field absent from the response draws nothing (never an empty
 * heading - each component returns `null` when its rows are empty). `BoardPage.tsx` gates each one
 * further on the switchboard's own per-situation table, so a section never appears for a situation
 * G2 marks off on purpose.
 */

/** A plain sentence, with an optional second line of the facts behind it. Shared by several of the
    sections below, which are all, at heart, a list of full sentences from the record. */
function SentenceRows({ rows }: { rows: { id: string; says: string; because?: string | null }[] }) {
  return (
    <Panel pad={false}>
      {rows.map((r) => (
        <div key={r.id} className="gwui-panel-row">
          <Stack gap={4}>
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{r.says}</div>
            {r.because && <Note tone="muted">{r.because}</Note>}
          </Stack>
        </div>
      ))}
    </Panel>
  )
}

export function RisksSection({ rows }: { rows: BoardPresent['risks'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="What could go wrong">
      <SentenceRows rows={rows} />
    </Section>
  )
}

export function WorkPlanSection({ rows }: { rows: BoardPresent['workPlan'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Work plan">
      <SentenceRows rows={rows} />
    </Section>
  )
}

export function TimelineSection({ rows }: { rows: BoardPresent['timeline'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Timeline">
      <Panel pad={false}>
        {rows.map((r, i) => (
          <div key={`${r.on}-${i}`} className="gwui-panel-row">
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{r.says}</div>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function PersonHistorySection({ rows, heading }: { rows: BoardPresent['personHistory']; heading?: string }) {
  if (!rows?.length) return null
  /* Board review, 1 October, item 6: "Person history" is a label, not a sentence saying what is
     here. The plain heading says what the section shows.

     ONBOARDING BOARD (day-30-and-60.txt): the prototype's own heading for this family is "{first
     name}'s history" - "His history" in the prototype's own words, which names no pronoun, so the
     caller passes the new hire's first name instead. Every other family is unchanged. */
  return (
    <Section heading={heading ?? 'What each person has done so far'}>
      <Panel pad={false}>
        {rows.map((p) => (
          <div key={p.participantId} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{p.who}</div>
              <Stack gap={4}>
                <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{p.says}</div>
                {p.sessions.map((s) => <Note key={s.n} tone="muted">{s.says}</Note>)}
              </Stack>
            </Stack>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

/**
 * BLOCKERS (board-as-lead.txt, "Blockers": "Each with its history and the one thing that would
 * clear it"). The prototype draws one card per blocker - a title, a status pill, then "Waiting
 * on:", "Raised:", "Affects:", "What the proof shows:" and "Would clear it:".
 *
 * `blockerCheck` and `whoWaitedOnWhom` share the same id for the same blocker (the server keeps
 * one id across both arrays, since they both come off the same underlying handoff), so they are
 * joined here into one card per id rather than shown as two separate lists that say overlapping
 * things under two headings. Only what the server actually sends is drawn:
 *  - "Waiting on" from `blockerCheck`'s own first check (who holds it).
 *  - "Raised" from `whoWaitedOnWhom`'s `startedAt`, as a date.
 *  - "What the proof shows" from `blockerCheck`'s remaining checks (what was tried, whether a
 *    time was given).
 *  - A "Cleared"/"Waiting" tag from whether `whoWaitedOnWhom` has a `clearedAt`.
 * "Affects" and "Would clear it" are in the prototype's own example but no field sends either one
 * today - drawing them would be inventing text nobody wrote. See request 105/107.
 */
/**
 * BLOCKERS (board-as-lead.txt, "Blockers"; request 105 part 2 and request 107 b/c). Drawn
 * straight from the server's own `blockers` field - one entry per open blocker, already walled
 * the same as every other wait, already ordered (raised most often first, then oldest). Every
 * line is a full sentence the server built (`says`, `raised.says`, `proof.says`, `timeGiven`,
 * `wouldClearItSays`, `holdingUp`); none of them is joined to a label with a colon, as request
 * 107 (b) asked: no "Waiting on:", no "Raised:", no "Would clear it:".
 */
export function BlockersSection({ blockers }: { blockers: BoardPresent['blockers'] }) {
  if (!blockers?.length) return null
  return (
    <Section heading="Blockers">
      <Stack gap={10}>
        {blockers.map((r) => (
          <Panel key={r.id}>
            <div className="gwui-gap-10" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{r.says}</div>
              <Tag tone={r.state === 'blocking' ? 'concern' : 'plain'}>{r.state === 'blocking' ? 'Blocking' : 'Waiting'}</Tag>
            </div>
            <Stack gap={4}>
              <Note>{r.raised.says}</Note>
              <Note>{r.proof.says}</Note>
              <Note>{r.timeGiven}</Note>
              <Note>{r.wouldClearItSays}</Note>
              {r.holdingUp && <Note>{r.holdingUp}</Note>}
            </Stack>
          </Panel>
        ))}
      </Stack>
    </Section>
  )
}

export function EvidenceIndexSection({ rows }: { rows: BoardPresent['evidenceIndex'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Evidence index">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.id} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px', fontStyle: 'italic' }}>{`“${r.said}”`}</div>
              <Note tone="muted">{r.backedBy}</Note>
            </Stack>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function BusyOrMovingSection({ data }: { data: BoardPresent['busyOrMoving'] }) {
  if (!data?.eachPerson?.length) return null
  /* Board review, 1 October, item 6: "Busy or moving" is a label, not a sentence. The plain
     heading says what the section shows - who is busy and who is free. */
  return (
    <Section
      heading="Who is busy and who is free"
      foot={data.cannotTellYou}
    >
      <Panel pad={false}>
        {data.eachPerson.map((p) => (
          <div key={p.participantId} className="gwui-panel-row">
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{p.says}</div>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 4: "WHAT THE LEAD NEEDS TO DO" FOR THE LEAD'S OWN LIST.
 *
 * This section only ever has rows for whoever runs the check-in (the server's own
 * `theLeadActions`, the-switchboards-own-sections.ts, requires `r.theLeadsId` and only fills it
 * for that reader) - but the heading still said "the lead" in the third person on the lead's own
 * board. The prototype's own words for this (G1-example-check-ins/eng.txt and others) are "What
 * needs you in this check-in". `BoardPage.tsx` now only renders this for whoever runs the
 * check-in, never for a participant.
 */
export function LeadActionsSection({ rows }: { rows: BoardPresent['leadActions'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="What needs you in this check-in">
      <SentenceRows rows={rows} />
    </Section>
  )
}

/**
 * Board review, 1 October, item 6: "What the lead needs to do" and "Work plan" can say the exact
 * same sentences, word for word, when nothing is waiting on the lead beyond what the plan already
 * lists - the same record read twice under two headings. Drawn once: when every one of
 * `leadActions`'s sentences already appears in `workPlan`, `LeadActionsSection` is left out and
 * `WorkPlanSection` alone carries it.
 *
 * SUPPORT DESK BOARD FIX 5: NEVER TRUE WHILE THE WORK PLAN SITS INSIDE THE CLOSED FOLD. That
 * assumption only holds if a reader can actually see `WorkPlanSection` without first opening
 * something - but `WorkPlanSection` always sits inside "Everything else from this check-in"
 * (`FoldEverythingElseUnless` in BoardPage.tsx), a disclosure closed by default for every reader.
 * Dropping the row left nothing in its place for a reader who never opens that fold: support.txt's
 * own example board still lists "The ready-made answer for import errors has still not been
 * written" under "What needs you in this check-in", with "This comes from the plan." said once, in
 * full view, and its own "Has it happened?" choice ("Yes, it's done" / "Not yet") right there.
 * `workPlanSitsInTheFold` is passed in by the caller, which is the one place that actually knows
 * whether `WorkPlanSection` is folded for this render - today that is always true.
 */
export function sameAsTheWorkPlan(leadActions: BoardPresent['leadActions'], workPlan: BoardPresent['workPlan'], workPlanSitsInTheFold: boolean): boolean {
  if (workPlanSitsInTheFold) return false
  if (!leadActions?.length || !workPlan?.length) return false
  const plan = new Set(workPlan.map((r) => r.says))
  return leadActions.every((r) => plan.has(r.says))
}

export function ObligationsSection({ rows }: { rows: BoardPresent['obligations'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="What each side promised">
      <Panel pad={false}>
        {rows.map((r, i) => (
          <div key={r.participantId ?? `outside-${i}`} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{r.who}</div>
              {r.promised.map((s, j) => <div key={`p${j}`} className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{s}</div>)}
              {r.othersWaitFor.map((s, j) => <Note key={`w${j}`} tone="muted">{s}</Note>)}
            </Stack>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function ForecastSection({ rows }: { rows: BoardPresent['forecast'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Where this could end up">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.objectiveId} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{r.about}</div>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{r.says}</div>
            </Stack>
            <Note tone="muted">{r.restsOn}</Note>
            <Note tone="muted"><em>{r.cannotTellYou}</em></Note>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function ContradictionsSection({ rows }: { rows: BoardPresent['contradictions'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Contradictions">
      <SentenceRows rows={rows.map((r) => ({ id: r.id, says: r.says }))} />
    </Section>
  )
}

/**
 * Board review, 1 October, item 4: rows here only ever come for whoever runs the check-in (the
 * server's `theQuestionsForTheLead` also requires `r.theLeadsId`), so "Questions for the lead"
 * read about the reader in the third person on their own board. `BoardPage.tsx` only renders this
 * for whoever runs the check-in.
 */
export function QuestionsForTheLeadSection({ rows }: { rows: BoardPresent['questionsForTheLead'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Questions for you">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.id} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: '23px' }}>{r.question}</div>
              <Note tone="muted">{r.because}</Note>
            </Stack>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

/** The word request 108 (b) gives each target, turned into the tag tone that already exists. */
export function standsTone(word: string): import('@/components/gw/ui').TagTone {
  if (word === 'Met' || word === 'Within') return 'proven'
  if (word === 'On time') return 'plain'
  if (word === 'Close') return 'attention'
  if (word === 'Not settled') return 'attention'
  return 'concern' // Behind, Over limit
}

/**
 * THE HEADLINE QUESTION, WITH ITS ANSWER, AND "WHERE EACH TARGET STANDS" BESIDE IT (request 108 a
 * and b; board-as-lead.txt: "Will we reach 25 sales by 30 September?" / "Not yet. 21 freezers are
 * sold..." beside a column of targets each with its own word - "Met", "Close", "Behind"...).
 *
 * BOARD REVIEW, SALES PIECE A, ITEM 2: TWO COLUMNS, NOT ONE STACKED COLUMN. The question and its
 * answer used to sit above a single stacked list of bars, with no heading of its own for that list
 * - so "Where each target stands", the prototype's own words for it, never appeared on the page at
 * all. The two now sit side by side at a normal desktop width (the same `auto-fit, minmax(...)` grid
 * every other two-up layout on this board already uses, so it stacks to one column under about
 * 580px without a media query of its own) - the question and its answer on the left, "Where each
 * target stands" as its own panel on the right, the way board-as-lead.jpg draws them.
 *
 * NO FALLBACK TO `latestSummary` IN THE ANSWER'S OWN SLOT. `headline.answer` is null until the
 * engine can answer the question (request 111); this shows nothing in its place rather than a
 * different sentence standing in for an answer nobody gave. `howItIsGoing.latestSummary` still
 * keeps its own place, in `HowItIsGoing`, just below this section - unchanged.
 *
 * BOARD REVIEW, SALES PIECE D, ITEM 4: THE GLANCE LINE FILLS THE GAP AN UNANSWERED QUESTION
 * LEAVES. While `headline.answer` is null, the box under the question used to sit empty, and the
 * glance line (how many rounds are done, who has answered this one - "None of the 12 rounds is
 * done yet. 4 of 6 people have answered this round.") drew again, separately, just below the
 * whole section. A box asking a question with nothing under it, right above the one fact
 * Groundwork does have about this check-in, reads as broken. So while there is no answer, the
 * glance line (when the server sent one) moves inside the box, under the question, and
 * `BoardPage.tsx` no longer draws it again below. Where there is neither an answer nor a glance,
 * the question's own box is left out - a boxed question with nothing at all under it is an empty
 * box, not a heading - while "Where each target stands" beside it, which answers a different
 * question, still draws exactly as before.
 */
/**
 * `everyTarget` (the light sales board, sales-first.md, section 3: "Where each target stands: each
 * target, its owner, where it is against the goal, and how sure the record is"): after the headline's
 * own targets, every other target this reader is served, each as its own sentence (which names whose
 * it is), where it is against its aim, and what the record says of how it stands. Only what the server
 * sent: a team member is never sent another person's target, so it is never listed for her. The first
 * three show, then "Show all".
 */
export function HeadlineSection({ headline, objectives, glance, waitingToBeLetIn, targetsFromObjectivesWhenNoBars, readerIsTheOnlyPerson, everyTarget }: { headline: BoardPresent['headline']; objectives: BoardPresent['objectives']; glance?: Glance | null; waitingToBeLetIn?: string | null; targetsFromObjectivesWhenNoBars?: boolean; readerIsTheOnlyPerson?: boolean; everyTarget?: boolean }) {
  if (!headline) return null
  const names = new Map((objectives ?? []).map((o) => [o.id, o.name]))
  const noAnswer = !headline.answer
  const glanceGoesInTheBox = noAnswer && !!glance
  const noBoxAtAll = noAnswer && !glance
  /*
   * THE FOUNDER'S OWN CHECK-IN BOARD (founder.txt): "WHERE EACH TARGET STANDS" FROM THE
   * OBJECTIVES THEMSELVES, WHEN THE HEADLINE HAS NO BARS OF ITS OWN. This board is sent a
   * headline question but no `headline.bars` (there is only one person, so the engine has no bar
   * to draw per target) - unlike the project and support-desk boards above, which have no
   * headline at all and so get their own "Where each target stands" panel at the top of the page.
   * Gated on `targetsFromObjectivesWhenNoBars`, a flag only this kind sets, so no other kind's
   * headline changes shape.
   */
  const showObjectivesAsTargets = Boolean(targetsFromObjectivesWhenNoBars) && headline.bars.length === 0 && (objectives ?? []).length > 0
  return (
    <div className="gwui-gap-16" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', alignItems: 'start' }}>
      {noBoxAtAll ? (
        <SubHeading>{headline.question}</SubHeading>
      ) : (
        <Panel>
          <Stack gap={10}>
            {/*
              BOARD REVIEW, SALES PIECE C, ITEM 2 (a): A HEADING LINE, THEN THE ANSWER IN LARGE
              TYPE (board-as-lead.jpg: "Will we reach 25 sales by 30 September?" reads as a
              heading; "Not yet. 21 freezers are sold..." under it is the large, bold sentence).
              The question used to be the one drawn in `Callout tone="emphasis"` - a blue, boxed
              callout, which is not what a heading looks like, and left the real answer in plain
              panel text underneath it. `SubHeading` is the shared part for a plain heading line
              over one fact inside a panel; `Callout tone="emphasis"` keeps doing what it always
              did - the one shared part that draws a bold, near-black sentence at panel level -
              just for the answer now, not the question.
            */}
            <SubHeading>{headline.question}</SubHeading>
            {headline.answer && <Callout tone="emphasis">{headline.answer}</Callout>}
            {glanceGoesInTheBox && <HowItIsGoing glance={glance} waitingToBeLetIn={waitingToBeLetIn} readerIsTheOnlyPerson={readerIsTheOnlyPerson} />}
          </Stack>
        </Panel>
      )}
      {(headline.bars.length > 0 || showObjectivesAsTargets) && (
        <Panel>
          <Stack gap={10}>
            <div className="gwui-fs-15 gwui-ink-dark" style={{ fontWeight: 700 }}>Where each target stands</div>
            <Stack gap={10}>
              {headline.bars.length > 0 ? headline.bars.map((bar) => (
                <div key={bar.objectiveId} className="gwui-gap-12" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <p className="gwui-panel-text-muted" style={{ flex: 1, minWidth: 140 }}>{names.get(bar.objectiveId) ?? ''}</p>
                  <div style={{ width: 140, height: 7, borderRadius: 6, background: 'var(--gw-bar-track)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bar.filled}%`, background: 'var(--gw-navy)', borderRadius: 6 }} />
                  </div>
                  <p className="gwui-panel-text-muted" style={{ minWidth: 90, textAlign: 'right' }}>{bar.now} of {bar.target}</p>
                  {bar.word && <Tag tone={standsTone(bar.word)}>{bar.word}</Tag>}
                </div>
              )) : (objectives ?? []).map((o) => (
                <Stack key={o.id} gap={2}>
                  <Note tone="muted">{o.name}</Note>
                  <Note tone="muted">{o.journey?.say ?? ''}</Note>
                </Stack>
              ))}
              {everyTarget && headline.bars.length > 0 && (() => {
                const inTheHeadline = new Set(headline.bars.map((bar) => bar.objectiveId))
                const others = (objectives ?? []).filter((o) => !inTheHeadline.has(o.id) && typeof o.target === 'number')
                return (
                  <ShowAll
                    items={others}
                    render={(o) => (
                      <FlexRow key={o.id} gap={12} align="flex-start" wrap>
                        <Stack gap={2}>
                          <p className="gwui-panel-text-muted">{o.name}</p>
                          {(o as any).stands?.says && <Note tone="muted">{(o as any).stands.says}</Note>}
                        </Stack>
                        <p className="gwui-panel-text-muted gwui-target-figure">{(o as any).journey?.now ?? (o as any).count ?? 0} of {o.target}</p>
                        {(o as any).stands?.word && <Tag tone={standsTone((o as any).stands.word)}>{(o as any).stands.word}</Tag>}
                      </FlexRow>
                    )}
                  />
                )
              })()}
            </Stack>
          </Stack>
        </Panel>
      )}
    </div>
  )
}

/**
 * THE SUPPORT DESK'S OWN HEADING FOR THIS SECTION (support.txt: "By queue", right after "The
 * shape of the work"). Every other kind of work keeps the plain "By area".
 */
const BY_AREA_HEADING: Partial<Record<string, string>> = {
  'support desk': 'By queue',
  'distribution operations': 'By site',
  /* Programme board review 1, item 2: programme.txt's own heading for this section is "By
     county" - the trader groups are organised by county, not a generic "By area". */
  'trader training programme': 'By county',
  /* Request 132: gov.txt groups the records by county too, for the same reason. */
  'a government programme': 'By county',
  leadership: 'By team',
}

/**
 * REQUEST 107 (c), PART 3: BY AREA (board-as-lead.txt doesn't show this one - no board in the
 * suite's own test data has a site, county, team or queue said about its records). Drawn only
 * when the server has something to group; the "not-known" state says why in the server's own
 * words, so nothing is claimed Groundwork cannot back.
 */
export function ByAreaSection({ data, kindOfWork }: { data: BoardPresent['byArea']; kindOfWork?: string | null }) {
  if (!data) return null
  const heading = (kindOfWork && BY_AREA_HEADING[kindOfWork]) ?? (data.state === 'not-known' ? 'By area' : data.heading)
  if (data.state === 'not-known') {
    return (
      <Section heading={heading}>
        <Note tone="muted">{data.why}</Note>
      </Section>
    )
  }
  return (
    <Section heading={heading}>
      <Panel pad={false}>
        {(data.areas ?? []).map((a) => (
          <div key={a.area} className="gwui-panel-row">
            <Stack gap={2}>
              <p className="gwui-panel-text" style={{ fontWeight: 700 }}>{a.area}</p>
              <Note tone="muted">{a.says}</Note>
            </Stack>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

/**
 * REQUEST 105, PART 1 (a), AND REQUEST 132: A GOVERNMENT PROGRAMME'S OWN THREE SECTIONS
 * (gov.txt: "What each level understood", "What the visit log shows", "The counties"), drawn
 * straight after "Where it stands" in BoardPage.tsx. Each sentence is drawn exactly as sent -
 * nothing here is built up or reworded.
 */
export function WhatEachLevelUnderstoodSection({ data }: { data: BoardPresent['whatEachLevelUnderstood'] }) {
  if (!data) return null
  return (
    <Section heading={data.heading}>
      {data.state === 'none-yet' ? (
        <Note tone="muted">{data.says}</Note>
      ) : (
        /* One open table: who, and what they said the aim means, each line as they said it. Only people who said something are in it. */
        <Table
          caption="What each person said the aim means to them"
          phone="stack"
          columns={[{ key: 'who', header: 'Who', rowHeader: true, width: '28%' }, { key: 'said', header: 'What they said the aim means' }]}
          rows={(data.levels ?? []).map((level) => ({
            who: level.who,
            said: <>{level.said.map((line, i) => <span key={i} className="pb-row-more">{line}</span>)}</>,
          }))}
        />
      )}
      <Note tone="muted">{data.note}</Note>
    </Section>
  )
}

export function WhatTheVisitLogShowsSection({ data }: { data: BoardPresent['whatTheVisitLogShows'] }) {
  /* Nothing is drawn when no numbers have been brought in: a heading with only an apology under it told the lead nothing. */
  if (!data || data.state === 'not-known') return null
  return (
    <Section heading={data.heading}>
      <Panel pad={false}>
        {(data.numbers ?? []).map((n) => (
          <div key={n.key} className="gwui-panel-row">
            <p className="gwui-panel-text">{n.says}</p>
          </div>
        ))}
      </Panel>
      {(data.whatANumberIsNot ?? []).map((line, i) => (
        <Note key={i} tone="muted">{line}</Note>
      ))}
    </Section>
  )
}

/**
 * THE MARKETVIEW Q4 BOARD'S OWN "WHAT THE SYSTEMS SHOW" (mvq4.jpg), right after "What needs you". One open table with a row for each metric
 * (pictured/TheMetricsBoard.tsx): the numbers a system sent and the metrics people stated, each as what a system shows or what somebody said.
 */
export function WhatTheSystemsShowSection({ data, rows }: { data: BoardPresent['whatTheSystemsShow']; rows?: any[] }) {
  return <TheMetricsTable data={data} rows={rows} />
}

/**
 * THE MARKETVIEW Q4 BOARD'S OWN "WHERE WHAT PEOPLE SAID AND THE SYSTEMS DIFFER" (mvq4.txt), drawn
 * straight after "What the systems show". `'none-yet'` reads as the engine's own plain sentence;
 * `'filled'` reads each row's two sentences, one under the other, exactly as sent.
 */
export function WhereWhatWasSaidAndTheSystemsDifferSection({ data }: { data: BoardPresent['whereWhatWasSaidAndTheSystemsDiffer'] }) {
  if (!data) return null
  if (data.state === 'none-yet') {
    return (
      <Section heading={data.heading}>
        <Note tone="muted">{data.says}</Note>
      </Section>
    )
  }
  return (
    <Section heading={data.heading}>
      <Panel pad={false}>
        {(data.rows ?? []).map((r) => (
          <div key={r.id} className="gwui-panel-row">
            <Stack gap={4}>
              <p className="gwui-panel-text">{r.said}</p>
              <Note tone="muted">{r.documentSays}</Note>
            </Stack>
          </div>
        ))}
      </Panel>
      {(data.whatANumberIsNot ?? []).map((line, i) => (
        <Note key={i} tone="muted">{line}</Note>
      ))}
    </Section>
  )
}

/**
 * THE COUNTIES (gov.jpg): one open table, a row for each county on record. The figures are what people said about the county in their
 * own check-ins, as said (`Reached`, `Activity`, `In the way` on the county's record); one nobody has said reads "Not said yet". The
 * projects on record under it are the board's own sentence. A county nobody has said any figure for is named under the table, so what
 * has no data is listed, and nothing is made up for it.
 */
const COUNTY_FIGURES = ['Reached', 'Activity', 'In the way']
const countyFigure = (r: any, label: string): string => String(r?.fields?.[label] ?? '').trim()

export function TheCountiesSection({ data, rows = [] }: { data: BoardPresent['theCounties']; rows?: any[] }) {
  if (!data) return null
  if (data.state === 'none-yet') {
    return (
      <Section heading={data.heading}>
        <Note tone="muted">{data.says}</Note>
      </Section>
    )
  }
  const counties = data.counties ?? []
  const recordOf = (id: string) => rows.find((r) => r.id === id)
  const withNothing = counties.filter((c) => !COUNTY_FIGURES.some((l) => countyFigure(recordOf(c.id), l)))
  const cell = (id: string, label: string) => countyFigure(recordOf(id), label) || 'Not said yet'
  const names = withNothing.map((c) => c.name)
  const listed = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  return (
    <Section heading={data.heading}>
      <Table
        caption="Each county, with what people said it has reached and done, and what is in its way"
        phone="stack"
        columns={[
          { key: 'name', header: 'County', rowHeader: true, width: '16%' },
          { key: 'reached', header: 'Reached', width: '20%' },
          { key: 'activity', header: 'Activity', width: '20%' },
          { key: 'way', header: 'In the way', width: '22%' },
          { key: 'says', header: 'Projects on record' },
        ]}
        rows={counties.map((c) => ({
          name: c.name,
          reached: cell(c.id, 'Reached'),
          activity: cell(c.id, 'Activity'),
          way: cell(c.id, 'In the way'),
          says: c.says,
        }))}
      />
      {names.length > 0 && (
        <Note tone="muted">{`Nobody has said any figure for ${listed} yet.`}</Note>
      )}
    </Section>
  )
}

/**
 * THE LAW FIRM MATTER BOARD'S OWN "WHERE THE MATTER STANDS" (matter.txt). Drawn straight after the
 * glance in BoardPage.tsx, only for this kind, only when the engine sends it - a short list of
 * plain sentences, each drawn exactly as sent.
 */
/**
 * THE OPENING SENTENCES of a pictured board (gov, loans and where-next), as the server wrote them from the record: the answer, where it
 * stands, what puts it at risk, then in one line how it is known. Drawn exactly as sent, never built up here.
 */
/**
 * HOW A BOARD THAT HAS NO CHECK-IN QUESTION OF ITS OWN STARTS (Hafsah, 15 November): the heading in normal type as the quiet question, then
 * the first sentence large as the answer, then the rest as plain lines. The same two classes every other board's opening uses, so one set
 * of gaps is read everywhere.
 */
function TheStandsHeader({ heading, says, howKnown }: { heading: string; says: string[]; howKnown?: string | null }) {
  const [first, ...rest] = says
  return (
    <section aria-label={heading} className="pb-stand">
      <p className="pb-q">{heading}</p>
      <p className="pb-answer">{first}</p>
      {rest.map((line, i) => <p key={i} className="gwui-panel-text pb-stand-line">{line}</p>)}
      {howKnown && <p className="pb-note">{howKnown}</p>}
    </section>
  )
}

export function TheOpeningSentences({ data }: { data: BoardPresent['theOpening'] }) {
  if (!data || !(data.says ?? []).length) return null
  return <TheStandsHeader heading={data.heading} says={data.says} howKnown={data.howKnown} />
}

/**
 * THE BOARD'S OWN READ (15 November 2026; api: the-boards-own-read.ts): the pieces of the prototype's boards that only a written read of
 * the record can give, such as matter.jpg's "More confident than the evidence allows" and gov.jpg's "Performance, or different
 * conditions?". The server writes them from the record this reader is served, checks every sentence against it, and says how each is
 * known. Drawn only where the server sends a piece; where it sends none, nothing is drawn and no heading stands over nothing.
 * A passage of one or two sentences is a callout; a list is a section of lines.
 */
const THE_TONE_OF_A_PIECE: Record<string, 'warning' | 'info'> = { moreConfident: 'warning' }
export function TheBoardsOwnReadSection({ data, place }: { data: BoardPresent['theBoardsOwnRead']; place: 'top' | 'end' }) {
  const pieces = (data?.pieces ?? []).filter((p) => p.place === place && (p.sentences ?? []).length)
  if (!pieces.length) return null
  /* One container for every piece, a list or a passage (Hafsah, 15 November). That a line was said in a check-in is said once, where the board starts; only the exception, a line a document or a system shows, is marked. */
  return (
    <>
      {pieces.map((p) => (
        <div key={p.id} className="pb-own-read">
          <Callout tone={THE_TONE_OF_A_PIECE[p.id] ?? 'info'} title={p.heading}>
            {p.sentences.map((s, i) => (
              <span key={i} className="pb-own-read-line">
                {s.says}
                {s.how === 'shown' && <span className="t-small"> Shown by a document.</span>}
              </span>
            ))}
          </Callout>
        </div>
      ))}
    </>
  )
}

export function WhereTheMatterStandsSection({ data }: { data: BoardPresent['whereTheMatterStands'] }) {
  if (!data || !(data.says ?? []).length) return null
  return <TheStandsHeader heading={data.heading} says={data.says} />
}

/**
 * THE LAW FIRM MATTER BOARD'S OWN "WHAT YOU NEED TO DECIDE" (matter.txt). Each item is a question
 * still open, with why it matters and who owns settling it - drawn here as its own section, in
 * matter.txt's own place, rather than folded into "What needs you in this check-in" below. See
 * BoardPage.tsx, where a decision already read here is kept out of "What needs you" for this kind,
 * so nobody reads the same question twice.
 */
export function WhatYouNeedToDecideSection({ data }: { data: BoardPresent['whatYouNeedToDecide'] }) {
  if (!data) return null
  if (data.state === 'none-yet') {
    return (
      <Section heading={data.heading}>
        <Note tone="muted">{data.says}</Note>
      </Section>
    )
  }
  return (
    <Section heading={data.heading}>
      <Panel pad={false}>
        {(data.items ?? []).map((item, i) => (
          <div key={i} className="gwui-panel-row">
            <Stack gap={4}>
              <p className="gwui-panel-text" style={{ fontWeight: 700 }}>{item.question}</p>
              <Note tone="muted">{item.why}</Note>
              <Note tone="muted">{item.owner}</Note>
            </Stack>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

/**
 * THE LAW FIRM MATTER BOARD'S OWN "WHAT CHANGED THIS WEEK, AND WHAT IT CHANGED" (matter.txt). Each
 * line is one thing said in the newest session, with `markSays` saying how it is known ("Only
 * someone's word", "From memory only", ...), then `cannotTell` - when sent - says plainly that
 * nothing here links a change to what it changed.
 */
export function WhatChangedThisWeekSection({ data }: { data: BoardPresent['whatChangedThisWeek'] }) {
  if (!data) return null
  if (data.state === 'none-yet') {
    return (
      <Section heading={data.heading}>
        <Note tone="muted">{data.says}</Note>
      </Section>
    )
  }
  return (
    <Section heading={data.heading} note={data.says}>
      <Panel pad={false}>
        {(data.lines ?? []).map((line) => (
          <div key={line.id} className="gwui-panel-row">
            <Stack gap={4}>
              <p className="gwui-panel-text">{line.text}</p>
              <Note tone="muted">{line.markSays}</Note>
            </Stack>
          </div>
        ))}
      </Panel>
      {data.cannotTell && <Note tone="muted">{data.cannotTell}</Note>}
    </Section>
  )
}

/**
 * REQUEST 133: AN ASSET LOANS COHORT'S OWN "WHERE THE COHORT STANDS" (loans.txt: "40 traders",
 * then one tile per group - "Repaying and trading", "Behind, but trading", "Genuinely blocked",
 * "Not heard from" - each with a count, a sentence, and, for whoever runs the check-in, who is in
 * it). Drawn straight after "What needs you" (BoardPage.tsx), before the records table. A group
 * can also come back `not-known` (no loan record at all yet), which reads as one plain sentence
 * instead of a tile.
 */
/* The colour of each group's count, the loans board's own (loans.jpg): repaying is green, behind or stopped is amber, not heard from is red. A group nobody is in stays plain, as the bills' board draws it. */
const COHORT_TONE: Record<string, 'proven' | 'attention' | 'concern'> = { repaying: 'proven', behind: 'attention', blocked: 'attention', 'not heard from': 'concern' }

export function WhereTheCohortStandsSection({ data }: { data: BoardPresent['whereTheCohortStands'] }) {
  if (!data) return null
  const title = (g: { group: string; title?: string }) => g.title ?? g.group
  return (
    <Section heading={data.heading}>
      <div className="pb-cards4">
        {(data.groups ?? []).map((g) => (
          <Panel key={g.group}>
            {'state' in g && g.state === 'not-known' ? (
              <>
                <div className="pb-card-top"><b>{title(g)}</b></div>
                <p className="gwui-panel-text pb-sub">{g.why}</p>
              </>
            ) : (
              <>
                <div className="pb-card-top"><b>{title(g)}</b><Tag tone={(g as { count: number }).count ? (COHORT_TONE[g.group] ?? 'plain') : 'plain'}>{(g as { count: number }).count}</Tag></div>
                <p className="gwui-panel-text pb-sub">{(g as { says: string }).says}</p>
                {(g as { cause?: string | null }).cause && <p className="gwui-panel-text pb-sub">{(g as { cause: string }).cause}</p>}
                {(g as { who: string[] | null }).who && (g as { who: string[] }).who.length > 0 && (
                  <Note tone="muted">{(g as { who: string[] }).who.join(', ')}</Note>
                )}
              </>
            )}
          </Panel>
        ))}
      </div>
    </Section>
  )
}

/**
 * THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN "BY WHO THEY ARE" (mvnext.txt), modelled on
 * `WhereTheCohortStandsSection` above. Groundwork does not keep which group a person belongs to, so
 * this almost always reads as the one `not-known` sentence (`why`), with `says` giving the plain
 * count of who has answered either way.
 */
export function ByWhoTheyAreSection({ data }: { data: BoardPresent['byWhoTheyAre'] }) {
  if (!data) return null
  if (data.state === 'filled' && (data.groups ?? []).length) {
    /* mvnext-board.jpg: one card for each group, in the lead's own words for who they are. */
    return (
      <Section heading={data.heading} note={data.note ?? data.says}>
        <div className="pb-cards3">
          {(data.groups ?? []).filter((g) => g.says).map((g) => (
            <Panel key={g.group}>
              <p className="pb-card-h">{g.group}</p>
              <p className="gwui-panel-text">{g.says}</p>
            </Panel>
          ))}
        </div>
      </Section>
    )
  }
  return (
    <Section heading={data.heading} note={data.says}>
      {data.state === 'not-known' && <Note tone="muted">{data.why}</Note>}
    </Section>
  )
}

/**
 * THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN "WHERE THEY DISAGREE" (mvnext.txt), modelled on
 * `WhereTheCohortStandsSection` above. `items` is the engine's own `divergence.items`, drawn the
 * same way `DivergenceSectionBody` draws one (BoardPage.tsx) - a topic, who sees it differently, in
 * their own words, and why it matters - but without that body's own "who sees this differently"
 * framing, which needs the viewer's own name; this board never shows both, so there is nothing to
 * keep in step with it. Where nothing differs yet, `says` carries the one plain sentence instead.
 */
export function WhereTheyDisagreeSection({ data }: { data: BoardPresent['whereTheyDisagree'] }) {
  if (!data) return null
  const items = data.state === 'filled' ? (data.items ?? []) : []
  /* No heading over nothing. */
  if (!items.length && !data.says) return null
  return (
    <Section heading={data.heading}>
      {items.length > 0 ? (
        <Panel pad={false}>
          {items.map((d: any, i: number) => (
            <div key={i} className="gwui-panel-row">
              <Stack gap={4}>
                <p className="gwui-panel-text" style={{ fontWeight: 700 }}>{d.topic ?? d.tag ?? 'Where they disagree'}</p>
                {d.text && <p className="gwui-panel-text">{d.text}</p>}
                {Array.isArray(d.positions) && d.positions.some((p: any) => p.view) && (
                  <Stack gap={4}>
                    {d.positions.filter((p: any) => p.view).map((p: any, j: number) => (
                      <Stack gap={2} key={j}>
                        <p className="gwui-panel-text" style={{ fontWeight: 700 }}>{p.who ?? 'A colleague'}</p>
                        <Note tone="muted">{p.view}</Note>
                      </Stack>
                    ))}
                  </Stack>
                )}
                {d.atStake && <Note tone="muted">{d.atStake}</Note>}
              </Stack>
            </div>
          ))}
        </Panel>
      ) : (
        data.says && <Note tone="muted">{data.says}</Note>
      )}
    </Section>
  )
}

/**
 * REQUEST 133: "SUPPORT GIVEN, AND WHETHER IT HELPED" (loans.txt). Drawn for an asset loans cohort
 * after "What keeps coming up" and before coaching and "Where this is heading". Today the record
 * never says what support was given, so this always reads as the one `not-known` sentence; a later
 * engine that does keep it can send `says` and/or `rows`, drawn exactly as sent.
 */
export function SupportGivenSection({ data }: { data: BoardPresent['supportGiven'] }) {
  /* Nothing is drawn when nothing on record says what support was given. */
  if (!data || data.state === 'not-known') return null
  return (
    <Section heading={data.heading} note={data.says}>
      {!!data.rows?.length && (
        <Panel pad={false}>
          {data.rows.map((r) => (
            <div key={r.id} className="gwui-panel-row">
              <p className="gwui-panel-text">{r.says}</p>
            </div>
          ))}
        </Panel>
      )}
    </Section>
  )
}

/**
 * REQUEST 107 (c), PART 4: REPORTED AGAINST CRITERIA, STAGE BY STAGE (board-as-lead.txt: "Reported
 * vs criteria met, stage by stage"). The record holds no criteria, so this is always `not-known` -
 * it counts what people reported and how much has a document behind it, never "criteria met".
 *
 * PROJECT BOARD REVIEW 1, FIX 10: ENG.TXT'S OWN HEADING. An engineering release's own prototype
 * example (eng.txt) gives this section a different heading, word for word - "Reported vs evidence,
 * stage by stage" - from the sales board's "Reported vs criteria met, stage by stage" this section
 * was named after. Every other kind of work keeps the plain "Reported, stage by stage".
 */
const REPORTED_AGAINST_CRITERIA_HEADING: Partial<Record<string, string>> = {
  'engineering release': 'Reported vs evidence, stage by stage',
}

export function ReportedAgainstCriteriaSection({ data, kindOfWork }: { data: BoardPresent['reportedAgainstCriteria']; kindOfWork?: string | null }) {
  if (!data) return null
  const heading = (kindOfWork && REPORTED_AGAINST_CRITERIA_HEADING[kindOfWork]) ?? 'Reported, stage by stage'
  return (
    <Section heading={heading} note={data.why}>
      <Panel pad={false}>
        {(data.stages ?? []).map((s) => (
          <div key={s.stage} className="gwui-panel-row">
            <p className="gwui-panel-text">{s.says}</p>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

/**
 * "WHERE THIS IS HEADING" AND "RECORD THE DECISION" (request 108 d; board-as-lead.txt). Sent only
 * to whoever runs the check-in; `BoardPage.tsx` renders nothing else to gate it further. Opens the
 * existing `ResolutionPanel` from "Record the decision", as the engine's answer asks.
 */
export function WhereThisIsHeadingSection({ data, onRecordTheDecision }: {
  data: BoardPresent['whereThisIsHeading']
  onRecordTheDecision?: () => void
}) {
  if (!data) return null
  return (
    <Section heading={data.heading} note={data.about}>
      <Stack gap={12}>
        {/* Board review, sales piece C, item 7: the prototype labels this list "The possible
            outcomes" (board-as-lead.txt), the same way the two lists under it are each labelled -
            this had neither, so three outcomes read as an unheaded list above two headed ones. */}
        {(data.outcomes ?? []).length > 0 ? (
          <Stack gap={6}>
            <Note tone="muted">The possible outcomes</Note>
            {/*
              REQUEST, MVNEXT REVIEW: THE SECOND LINE, TOO (mvnext.txt: "Kano maize first" /
              "For processors, with a named-buyer feed."). Every outcome the engine sends already
              carries `more`, its own second sentence - this used to read only `says`, leaving the
              detail behind each outcome unread wherever this draws, not only on this one board.
            */}
            <SentenceRows rows={(data.outcomes ?? []).map((o) => ({ id: o.value, says: o.says, because: o.more }))} />
          </Stack>
        ) : (
          data.outcomesSays && <Note tone="muted">{data.outcomesSays}</Note>
        )}
        <Panel pad={false}>
          <div className="gwui-panel-row">
            <Stack gap={6}>
              <Note tone="muted">The signals behind them</Note>
              {(data.signals ?? []).length > 0 ? (
                (data.signals ?? []).map((s, i) => (
                  <Stack gap={2} key={i}>
                    <p className="gwui-panel-text">{s.says}</p>
                    <Note tone="muted">{s.from}</Note>
                  </Stack>
                ))
              ) : (
                <Note tone="muted">{data.signalsSays}</Note>
              )}
            </Stack>
          </div>
          <div className="gwui-panel-row">
            <Stack gap={6}>
              <Note tone="muted">What would settle it</Note>
              {(data.whatWouldSettleIt ?? []).length > 0 ? (
                (data.whatWouldSettleIt ?? []).map((w, i) => <p className="gwui-panel-text" key={i}>{w}</p>)
              ) : (
                <Note tone="muted">{data.whatWouldSettleItSays}</Note>
              )}
            </Stack>
          </div>
          <div className="gwui-panel-row">
            <Stack gap={4}>
              <p className="gwui-panel-text">{data.whoDecides}</p>
            </Stack>
          </div>
        </Panel>
        {data.decided ? (
          <p className="gwui-panel-text">{data.decided}</p>
        ) : (
          data.recordTheDecision && (
            <button type="button" onClick={onRecordTheDecision} className="btn sec sm">
              {data.recordTheDecision}
            </button>
          )
        )}
      </Stack>
    </Section>
  )
}

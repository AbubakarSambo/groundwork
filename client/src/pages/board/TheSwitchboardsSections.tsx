import { Section, Panel, Tag, Note, Stack, Callout } from '@/components/gw/ui'
import type { BoardPresent } from '@/api/board'

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
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.says}</div>
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
    <Section heading="What could go wrong" note="From the record, with the facts behind each one.">
      <SentenceRows rows={rows} />
    </Section>
  )
}

export function WorkPlanSection({ rows }: { rows: BoardPresent['workPlan'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Work plan" note="Who is doing what, and by when.">
      <SentenceRows rows={rows} />
    </Section>
  )
}

export function TimelineSection({ rows }: { rows: BoardPresent['timeline'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Timeline" note="What happened, in order.">
      <Panel pad={false}>
        {rows.map((r, i) => (
          <div key={`${r.on}-${i}`} className="gwui-panel-row">
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.says}</div>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function PersonHistorySection({ rows }: { rows: BoardPresent['personHistory'] }) {
  if (!rows?.length) return null
  /* Board review, 1 October, item 6: "Person history" is a label, not a sentence saying what is
     here. The plain heading says what the section shows. */
  return (
    <Section heading="What each person has done so far" note="One person’s record over time.">
      <Panel pad={false}>
        {rows.map((p) => (
          <div key={p.participantId} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{p.who}</div>
              <Stack gap={4}>
                <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{p.says}</div>
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
    <Section heading="Blockers" note="Each with its history and the one thing that would clear it.">
      <Stack gap={10}>
        {blockers.map((r) => (
          <Panel key={r.id}>
            <div className="gwui-gap-10" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{r.says}</div>
              <Tag tone={r.state === 'blocking' ? 'concern' : 'plain'}>{r.state === 'blocking' ? 'Blocking' : 'Waiting'}</Tag>
            </div>
            <Stack gap={4}>
              <div className="gwui-mt-8"><Note>{r.raised.says}</Note></div>
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
    <Section heading="Evidence index" note="Every piece of proof, in one list.">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.id} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55, fontStyle: 'italic' }}>{`“${r.said}”`}</div>
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
      note="Whether activity is turning into progress."
      foot={data.cannotTellYou}
    >
      <Panel pad={false}>
        {data.eachPerson.map((p) => (
          <div key={p.participantId} className="gwui-panel-row">
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{p.says}</div>
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
    <Section heading="What needs you in this check-in" note="Built from the record: who is waiting, and what has not been told yet.">
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
 */
export function sameAsTheWorkPlan(leadActions: BoardPresent['leadActions'], workPlan: BoardPresent['workPlan']): boolean {
  if (!leadActions?.length || !workPlan?.length) return false
  const plan = new Set(workPlan.map((r) => r.says))
  return leadActions.every((r) => plan.has(r.says))
}

export function ObligationsSection({ rows }: { rows: BoardPresent['obligations'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="What each side promised" note="And what somebody here is still waiting on them for.">
      <Panel pad={false}>
        {rows.map((r, i) => (
          <div key={r.participantId ?? `outside-${i}`} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{r.who}</div>
              {r.promised.map((s, j) => <div key={`p${j}`} className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{s}</div>)}
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
    <Section heading="Where this could end up" note="Carried forward from the pace the record shows, never a promise.">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.objectiveId} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.about}</div>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.says}</div>
            </Stack>
            <div className="gwui-mt-4"><Note tone="muted">{r.restsOn}</Note></div>
            <div className="gwui-mt-2"><Note tone="muted"><em>{r.cannotTellYou}</em></Note></div>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function ContradictionsSection({ rows }: { rows: BoardPresent['contradictions'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Contradictions" note="Where one person’s own record says two different things.">
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
    <Section heading="Questions for you" note="Questions, never conclusions, built from the record.">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.id} className="gwui-panel-row">
            <Stack gap={2}>
              <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.question}</div>
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
 */
export function HeadlineSection({ headline, objectives }: { headline: BoardPresent['headline']; objectives: BoardPresent['objectives'] }) {
  if (!headline) return null
  const names = new Map((objectives ?? []).map((o) => [o.id, o.name]))
  return (
    <div className="gwui-gap-16" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'start' }}>
      <Panel>
        <Stack gap={10}>
          {/* The question, in the largest type on the board - `Callout tone="emphasis"` is the one
              shared part that already draws a bold, near-black sentence at panel level, carried over
              from "The gap" on TheJudgement rather than a new one-off size invented for this. */}
          <Callout tone="emphasis">{headline.question}</Callout>
          {headline.answer && <p className="gwui-panel-text">{headline.answer}</p>}
        </Stack>
      </Panel>
      {headline.bars.length > 0 && (
        <Panel>
          <Stack gap={10}>
            <div className="gwui-fs-15 gwui-ink-dark" style={{ fontWeight: 700 }}>Where each target stands</div>
            <Stack gap={10}>
              {headline.bars.map((bar) => (
                <div key={bar.objectiveId} className="gwui-gap-12" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <p className="gwui-panel-text-muted" style={{ flex: 1, minWidth: 140 }}>{names.get(bar.objectiveId) ?? ''}</p>
                  <div style={{ width: 140, height: 7, borderRadius: 6, background: 'var(--gw-bar-track)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bar.filled}%`, background: 'var(--gw-navy)', borderRadius: 6 }} />
                  </div>
                  <p className="gwui-panel-text-muted" style={{ minWidth: 90, textAlign: 'right' }}>{bar.now} of {bar.target}</p>
                  {bar.word && <Tag tone={standsTone(bar.word)}>{bar.word}</Tag>}
                </div>
              ))}
            </Stack>
          </Stack>
        </Panel>
      )}
    </div>
  )
}

/**
 * REQUEST 107 (c), PART 3: BY AREA (board-as-lead.txt doesn't show this one - no board in the
 * suite's own test data has a site, county, team or queue said about its records). Drawn only
 * when the server has something to group; the "not-known" state says why in the server's own
 * words, so nothing is claimed Groundwork cannot back.
 */
export function ByAreaSection({ data }: { data: BoardPresent['byArea'] }) {
  if (!data) return null
  if (data.state === 'not-known') {
    return (
      <Section heading="By area">
        <Note tone="muted">{data.why}</Note>
      </Section>
    )
  }
  return (
    <Section heading={data.heading}>
      <Panel pad={false}>
        {data.areas.map((a) => (
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
 * REQUEST 107 (c), PART 4: REPORTED AGAINST CRITERIA, STAGE BY STAGE (board-as-lead.txt: "Reported
 * vs criteria met, stage by stage"). The record holds no criteria, so this is always `not-known` -
 * it counts what people reported and how much has a document behind it, never "criteria met".
 */
export function ReportedAgainstCriteriaSection({ data }: { data: BoardPresent['reportedAgainstCriteria'] }) {
  if (!data) return null
  return (
    <Section heading="Reported, stage by stage" note={data.why}>
      <Panel pad={false}>
        {data.stages.map((s) => (
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
        {data.outcomes.length > 0 ? (
          <Stack gap={6}>
            <Note tone="muted">The possible outcomes</Note>
            <SentenceRows rows={data.outcomes.map((o) => ({ id: o.value, says: o.says }))} />
          </Stack>
        ) : (
          data.outcomesSays && <Note tone="muted">{data.outcomesSays}</Note>
        )}
        <Panel pad={false}>
          <div className="gwui-panel-row">
            <Stack gap={6}>
              <Note tone="muted">The signals behind them</Note>
              {data.signals.length > 0 ? (
                data.signals.map((s, i) => (
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
              {data.whatWouldSettleIt.length > 0 ? (
                data.whatWouldSettleIt.map((w, i) => <p className="gwui-panel-text" key={i}>{w}</p>)
              ) : (
                <Note tone="muted">{data.whatWouldSettleItSays}</Note>
              )}
            </Stack>
          </div>
          <div className="gwui-panel-row">
            <Stack gap={4}>
              <p className="gwui-panel-text">{data.whoDecides}</p>
              <Note tone="muted">{data.groundworkDoesNotChoose}</Note>
            </Stack>
          </div>
        </Panel>
        {data.decided ? (
          <p className="gwui-panel-text">{data.decided}</p>
        ) : (
          data.recordTheDecision && (
            <button type="button" onClick={onRecordTheDecision} className="gwui-btn gwui-btn-secondary gwui-btn-small">
              {data.recordTheDecision}
            </button>
          )
        )}
      </Stack>
    </Section>
  )
}

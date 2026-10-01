import { Section, Panel, Tag, Note, Stack } from '@/components/gw/ui'
import type { BoardPresent } from '@/api/board'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

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
export function BlockersSection({ blockerCheck, whoWaitedOnWhom, allowed }: {
  blockerCheck: BoardPresent['blockerCheck']
  whoWaitedOnWhom: BoardPresent['whoWaitedOnWhom']
  allowed: boolean
}) {
  if (!allowed) return null
  const waits = new Map((whoWaitedOnWhom ?? []).map((w) => [w.id, w]))
  const checks = blockerCheck ?? []
  if (!checks.length) return null
  return (
    <Section heading="Blockers" note="Each with its history and the one thing that would clear it, where the record has it.">
      <Stack gap={10}>
        {checks.map((r) => {
          const wait = waits.get(r.id)
          const cleared = !!wait?.clearedAt
          const [waitingOn, ...rest] = r.checks ?? []
          return (
            <Panel key={r.id}>
              <div className="gwui-gap-10" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{r.says}</div>
                <Tag tone={cleared ? 'proven' : 'concern'}>{cleared ? 'Cleared' : 'Blocking'}</Tag>
              </div>
              {waitingOn && (
                <div className="gwui-mt-8">
                  <Note><b className="gwui-ink-dark" style={{ fontWeight: 600 }}>Waiting on: </b>{waitingOn}</Note>
                </div>
              )}
              {wait?.startedAt && (
                <div className="gwui-mt-4">
                  <Note>
                    <b className="gwui-ink-dark" style={{ fontWeight: 600 }}>Raised: </b>
                    {`since ${whenItWas(wait.startedAt, 'dayAndMonthLong')}`}
                    {cleared && wait.clearedAt ? `, cleared on ${whenItWas(wait.clearedAt, 'dayAndMonthLong')}` : ''}
                  </Note>
                </div>
              )}
              {rest.length > 0 && (
                <div className="gwui-mt-4">
                  <Note><b className="gwui-ink-dark" style={{ fontWeight: 600 }}>What the proof shows: </b>{rest.join(' ')}</Note>
                </div>
              )}
            </Panel>
          )
        })}
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

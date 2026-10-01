import { Section, Panel } from '@/components/gw/ui'
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
          <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.says}</div>
          {r.because && <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-4" style={{ lineHeight: 1.5 }}>{r.because}</div>}
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
  return (
    <Section heading="Person history" note="One person’s record over time.">
      <Panel pad={false}>
        {rows.map((p) => (
          <div key={p.participantId} className="gwui-panel-row">
            <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{p.who}</div>
            <div className="gwui-fs-15 gwui-ink-text gwui-mt-2" style={{ lineHeight: 1.55 }}>{p.says}</div>
            {p.sessions.map((s) => (
              <div key={s.n} className="gwui-fs-13-5 gwui-ink-muted gwui-mt-4" style={{ lineHeight: 1.5 }}>{s.says}</div>
            ))}
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function BlockerCheckSection({ rows }: { rows: BoardPresent['blockerCheck'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Blocker check" note="Whether a blocker is real: a named person, what was tried, and a date.">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.id} className="gwui-panel-row">
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.says}</div>
            {r.checks.map((c, i) => (
              <div key={i} className="gwui-fs-13-5 gwui-ink-muted gwui-mt-2" style={{ lineHeight: 1.5 }}>{c}</div>
            ))}
          </div>
        ))}
      </Panel>
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
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55, fontStyle: 'italic' }}>{`“${r.said}”`}</div>
            <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-2" style={{ lineHeight: 1.5 }}>{r.backedBy}</div>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function BusyOrMovingSection({ data }: { data: BoardPresent['busyOrMoving'] }) {
  if (!data?.eachPerson?.length) return null
  return (
    <Section heading="Busy or moving" note="Whether activity is turning into progress.">
      <Panel pad={false}>
        {data.eachPerson.map((p) => (
          <div key={p.participantId} className="gwui-panel-row">
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{p.says}</div>
          </div>
        ))}
        <div className="gwui-fs-13-5 gwui-ink-muted gwui-pt-10 gwui-pr-22 gwui-pb-10 gwui-pl-22 gwui-rule-top-dashed gwui-mt-4" style={{ fontStyle: 'italic', lineHeight: 1.5 }}>
          {data.cannotTellYou}
        </div>
      </Panel>
    </Section>
  )
}

export function LeadActionsSection({ rows }: { rows: BoardPresent['leadActions'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="What the lead needs to do" note="Built from the record: who is waiting, and what has not been told yet.">
      <SentenceRows rows={rows} />
    </Section>
  )
}

export function ObligationsSection({ rows }: { rows: BoardPresent['obligations'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="What each side promised" note="And what somebody here is still waiting on them for.">
      <Panel pad={false}>
        {rows.map((r, i) => (
          <div key={r.participantId ?? `outside-${i}`} className="gwui-panel-row">
            <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{r.who}</div>
            {r.promised.map((s, j) => <div key={`p${j}`} className="gwui-fs-15 gwui-ink-text gwui-mt-2" style={{ lineHeight: 1.55 }}>{s}</div>)}
            {r.othersWaitFor.map((s, j) => <div key={`w${j}`} className="gwui-fs-13-5 gwui-ink-muted gwui-mt-2" style={{ lineHeight: 1.5 }}>{s}</div>)}
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
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.about}</div>
            <div className="gwui-fs-15 gwui-ink-text gwui-mt-2" style={{ lineHeight: 1.55 }}>{r.says}</div>
            <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-4" style={{ lineHeight: 1.5 }}>{r.restsOn}</div>
            <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-2" style={{ lineHeight: 1.5, fontStyle: 'italic' }}>{r.cannotTellYou}</div>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export function WhoWaitedOnWhomSection({ rows }: { rows: BoardPresent['whoWaitedOnWhom'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Who waited on whom" note="Every wait in the record, open or cleared, with its dates.">
      <SentenceRows rows={rows.map((r) => ({ id: r.id, says: r.says }))} />
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

export function QuestionsForTheLeadSection({ rows }: { rows: BoardPresent['questionsForTheLead'] }) {
  if (!rows?.length) return null
  return (
    <Section heading="Questions for the lead" note="Questions, never conclusions, built from the record.">
      <Panel pad={false}>
        {rows.map((r) => (
          <div key={r.id} className="gwui-panel-row">
            <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{r.question}</div>
            <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-2" style={{ lineHeight: 1.5 }}>{r.because}</div>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

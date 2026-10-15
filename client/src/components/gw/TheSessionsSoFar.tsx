import { SessionDivider } from './GroundChat'
import { Section } from './ui'

/**
 * THE SESSIONS SO FAR, FOR WHOEVER RUNS A CHECK-IN THEY DO NOT ANSWER (fix list, item 1, 14 October).
 *
 * Production's Check-in tab (GroundChat on origin/main) showed a lead or an admin who is not a party the check-in's
 * history: each session, when it happened, and who checked in. Never anybody's words: "What each person wrote stays
 * with them. The report is where those answers meet." Our build had dropped it when the tab became the focused
 * conversation. This is that history again, in today's design, built only from the check-ins the page already holds
 * (status, session number, dates and who), which the server already serves to this reader.
 */
export interface ASessionRow { sessionNumber: number; date: string; people: string[] }

export function theSessionsSoFar(
  checkIns: { sessionNumber?: number | null; participantId?: string | null; status?: string | null; completedAt?: string | null; createdAt?: string | null }[],
  nameOf: (participantId: string | null | undefined) => string | null,
): ASessionRow[] {
  const rows: ASessionRow[] = []
  for (const ci of checkIns ?? []) {
    const n = ci.sessionNumber ?? 1
    const who = nameOf(ci.participantId)
    const done = ci.status === 'COMPLETED'
    const row = rows.find((r) => r.sessionNumber === n)
    if (row) {
      if (done && who && !row.people.includes(who)) row.people.push(who)
      if (ci.completedAt && ci.completedAt > row.date) row.date = ci.completedAt
    } else {
      rows.push({ sessionNumber: n, date: ci.completedAt ?? ci.createdAt ?? '', people: done && who ? [who] : [] })
    }
  }
  return rows.sort((a, b) => a.sessionNumber - b.sessionNumber)
}

/** "Amani Wekesa checked in.", "Amani Wekesa and Chidi Okoro checked in.", "A, B and C checked in." */
export function whoCheckedIn(people: string[]): string {
  if (!people.length) return 'Nobody has checked in yet.'
  const said = people.length === 1 ? people[0] : `${people.slice(0, -1).join(', ')} and ${people[people.length - 1]}`
  return `${said} checked in.`
}

export const WHAT_EACH_PERSON_WROTE = 'What each person wrote stays with them. The report is where those answers meet.'

export function TheSessionsSoFar({ rows }: { rows: ASessionRow[] }) {
  return (
    <div data-testid="the-sessions-so-far">
      <Section heading="The sessions so far">
      {rows.length === 0 ? (
        <p className="gwui-panel-text">No sessions yet. When people check in, each one appears here.</p>
      ) : rows.map((h) => (
        <div key={h.sessionNumber}>
          <SessionDivider sessionNumber={h.sessionNumber} date={h.date} isCorrection={false} correctionOf={null} />
          <p className="gwui-panel-text">{whoCheckedIn(h.people)}</p>
          <p className="gwui-panel-text-muted">{WHAT_EACH_PERSON_WROTE}</p>
        </div>
      ))}
      </Section>
    </div>
  )
}

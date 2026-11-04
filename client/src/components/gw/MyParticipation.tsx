/**
 * WHAT IS TRUE ABOUT YOU, ON THE SETUP TAB.
 *
 * Who you are, which check-in this is, what your role and status in it are, how many sessions you
 * have finished, and the reminder that your answers are yours. Everything on that tab which is
 * about the READER rather than about the check-in's configuration.
 *
 * A FRAGMENT, NOT A WRAPPER. These sit in a flex column whose children carry explicit `order`
 * values, because the tab deliberately shows what is true about you BEFORE what somebody else set -
 * a party's first sight of it used to be three statements about absence and permission. Wrapping
 * them in a div would make them one child, collapse three order values into one, and quietly undo
 * that. So they stay direct children and keep their own places.
 *
 * Lifted out of `GroundParticipantPage` so the view that runs a check-in can show a lead the same
 * facts about their own participation, rather than sending them to a second page for them.
 */
import { whatThisStatusMeans } from './what-a-status-means-to-the-person-in-it'
import { scenarioLabel } from '@/lib/scenario-catalog'

/**
 * STILL RENDERED THROUGH `whatThisStatusMeans` (a-status-is-a-sentence.spec.ts pins that - the
 * database's enum must never reach the screen raw), but read next to "Check-in" and "Situation" its
 * short label read as a clipped, dash-joined fragment rather than a sentence about the check-in
 * (picture check, 29 Sept: "Open - waiting on people to check in"). This turns that same label into
 * one full sentence, without a second, parallel copy of what each status means.
 */
export function statusSentence(label: string): string {
  if (label.startsWith('The report')) return `${label}.`
  const joined = label.replace(' - ', ', and ')
  return `This check-in is ${joined.charAt(0).toLowerCase()}${joined.slice(1)}.`
}

/**
 * "SESSIONS COMPLETED" READ AS A LABEL AND A BARE NUMBER, NOT A SENTENCE (U.4 people-group review,
 * item 3): "Sessions completed" over "1 of 12" is a stat tile, the wording rule this page keeps to
 * everywhere else rules out. It is also easy to misread next to the header's "This is your session 2
 * of 12" as though the two disagreed, when they are simply two different counts (how many are done, and
 * which one is open now) - saying both in one sentence, with the words "completed" and "open", keeps
 * them from reading as a contradiction.
 */
export function sessionsCompletedSentence(completedCount: number, totalSessions: number | null): string {
  const done = completedCount === 1 ? '1 session' : `${completedCount} sessions`
  /* No total means no total: "3 of" with nothing after it is not a count. */
  if (totalSessions == null) return `You have completed ${done}.`
  return `You have completed ${done}, out of ${totalSessions}.`
}

export interface MyParticipationProps {
  /** Who is reading: their name, initial and email. */
  viewer: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined
  /** The check-in, for its name and scenario. */
  ground: any
  /** This reader's participant row, for their role and status. */
  myParticipant: any
  /** How many sessions this reader has finished. */
  completedCount: number
  /** How many the check-in plans. */
  totalSessions: number | null
}

export function MyParticipation({
  viewer,
  ground,
  myParticipant,
  completedCount,
  totalSessions,
}: MyParticipationProps) {
  return (
    <>
          <div style={{ order: 1, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gw-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {(viewer?.firstName?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }}>{viewer?.firstName} {viewer?.lastName}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{viewer?.email}</div>
            </div>
          </div>

          <div style={{ order: 2, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Check-in</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{ground.label}</div>
            </div>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Situation</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
                {ground.scenario ? scenarioLabel(ground.scenario, ground.brief) : ''}
              </div>
            </div>
            {/*
              THE ROW IS ONLY THERE WHEN THERE IS A ROLE.

              It used to fall back to "In this check-in", which read as a caption rather than an
              answer, and then to "Not recorded", which is a row that costs a line and tells the
              reader nothing they can do anything about - a party cannot record their own role here,
              so naming its absence is just one more statement of absence on a tab that already had
              too many. It appears when the lead has described the role, and otherwise it is not a
              row at all.
            */}
            {myParticipant?.roleAsDescribed ? (
              <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Your role</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{myParticipant.roleAsDescribed}</div>
              </div>
            ) : null}
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Status</div>
              {/*
                THE ENUM WAS BEING SHOWN TO A PERSON. "Status / AWAITING_PARTIES", in capitals, on
                Zainab's own Setup tab - the database's word for the row, leaving her to guess which
                parties and whether she was one of them.
              */}
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{statusSentence(whatThisStatusMeans(ground.status))}</div>
            </div>
            <div style={{ padding: '13px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Sessions completed</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{sessionsCompletedSentence(completedCount, totalSessions)}</div>
            </div>
          </div>

          {/*
            THE PRIVACY REMINDER IS GONE FROM HERE.

            "Also please remove this, you are over doing it with the privacy reminders." It is said
            on the check-in's own header, in the report's footer, on the Context page, at the top of
            every session, and on the card that shows the shared report - and it was said HERE in
            the loudest treatment on the page, a clay-coloured box under a person's own standing.

            Nothing about the rule changed. What changed is that a settings page does not need to
            reassure somebody about the thing five other surfaces already told them, in a colour
            that reads like a warning about their own record.
          */}
    </>
  )
}

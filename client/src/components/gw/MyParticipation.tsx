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
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gw-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
              {(viewer?.firstName?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }}>{viewer?.firstName} {viewer?.lastName}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{viewer?.email}</div>
            </div>
          </div>

          <div style={{ order: 2, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Check-in</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{ground.label}</div>
            </div>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Scenario</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{ground.scenario?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}</div>
            </div>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Your role</div>
              {/*
                THE FALLBACK SAID NOTHING. Every other row here carries a value - the check-in's
                name, the scenario, ACTIVE, 0 of 8. This one fell back to "In this check-in",
                which reads as a caption for the label above it rather than an answer, so the row
                looked filled in while saying nothing at all. Only visible once the card moved to
                the top of the tab and became the first thing a party reads about themselves.
              */}
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{myParticipant?.roleAsDescribed || 'Not recorded'}</div>
            </div>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--gw-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Status</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{ground.status}</div>
            </div>
            <div style={{ padding: '13px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Sessions completed</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{completedCount} of {totalSessions}</div>
            </div>
          </div>

          {/**
            * The bare grade that stood here - "Overall quality label: low" - is gone. It was the
            * same read as the one on the record tab, minus everything a person could act on, and
            * a page that grades you twice is not twice as honest.
            */}
          <div style={{ order: 6, background: 'var(--gw-clay-bg)', border: '1px solid var(--gw-clay-b)', borderRadius: 10, padding: '13px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-clay)', marginBottom: 4 }}>Privacy reminder</div>
            <div style={{ fontSize: 12, color: '#7A4A44', lineHeight: 1.6 }}>
              Your check-in answers are never visible to the other party. They are stored privately and only cross-referenced at the point of report generation. Neither party can read the other's raw account at any time.
            </div>
          </div>
    </>
  )
}

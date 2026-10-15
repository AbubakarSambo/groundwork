import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { atTheStart } from '@/lib/a-colleague'

/**
 * A VISIBLE TRAIL OF HONEST CORRECTIONS.
 *
 * Moved from the dead Report tab body (`ReportBody`), which was the only renderer of
 * `report.updates` - nothing has rendered it since the Report tab became a list of sessions, which
 * is the one entry in `BEFORE_THE_DEAD_BODY_CAN_GO` (the-four-reports.ts) this file does not cover
 * on its own; `no-label-is-the-leads-note.spec.tsx` is the trip-wire for it staying lost.
 *
 * A self-correction session shows up here as a flagged, dated entry instead of being silently
 * blended into the report above. No correction TEXT is shown - only who, when, and whether it
 * happened after that party had already signed off. Visible to everyone who can read this report,
 * the same as before: `nameFor` is the only thing that may name somebody, never a field on the row
 * itself, so a private note can never stand in for a name here.
 */
export interface RecordUpdate {
  participantId: string
  completedAt: string | null
  isPostSignOff: boolean
}

export function UpdatesToTheRecord({ updates, nameFor }: {
  updates?: RecordUpdate[] | null
  nameFor: (participantId: string) => string
}) {
  if (!updates || updates.length === 0) return null
  return (
    <div className="gwui-rule gwui-pt-12 gwui-pb-12 gwui-pl-14 gwui-pr-14 gwui-mt-14" style={{ background: 'var(--gw-paper-2)', borderRadius: 8 }}>
      <div className="gwui-fs-13 gwui-ink-muted gwui-mb-8" style={{ letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700 }}>Updates</div>
      {updates.map((u, i) => (
        <div key={i} className="gwui-gap-8 gwui-pt-4 gwui-pb-4" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="gwui-fs-13 gwui-ink-text">
            {atTheStart(nameFor(u.participantId))} updated what they said
            {u.completedAt ? ` on ${whenItWas(u.completedAt, 'full')}` : ''}.
          </div>
          {u.isPostSignOff && (
            <span className="gwui-fs-13 gwui-ink-amber gwui-pt-2 gwui-pb-2 gwui-pl-8 gwui-pr-8" style={{ fontWeight: 700, background: 'var(--gw-amber-bg)', borderRadius: 6, flexShrink: 0 }}>
              Updated after sign-off
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

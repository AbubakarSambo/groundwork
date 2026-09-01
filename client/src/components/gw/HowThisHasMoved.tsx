import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'

/**
 * HOW THINGS HAVE MOVED, UNDER THE REPORT ITSELF.
 *
 * The report at the top of this tab is always the current picture. Every round before it used to
 * be overwritten, so at day 90 there was one account of ninety days and no way to see that the
 * day-14 one had said something different.
 *
 * It lives under the report rather than on a page of its own, because it is the same report at
 * earlier moments and somebody looking for it is already here.
 *
 * NOT A SCORE, AND NOT A DIRECTION. Each line is what that round led with, on the day it closed,
 * and nothing re-decides it now. Whether the movement is improvement is the reader's judgement -
 * an arrow here would make this a rating, which is the one thing this product must not become.
 */
export function HowThisHasMoved({ groundId }: { groundId: string }) {
  const { data } = useQuery({
    queryKey: ['report-rounds', groundId],
    queryFn: () => reportsApi.rounds(groundId),
    enabled: !!groundId,
    retry: false,
  })

  const moved = data?.moved ?? []
  /* Nothing until a round has closed, which is where every check-in starts. */
  if (!moved.length) return null

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>
        How this has moved
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 12, maxWidth: 560 }}>
        What the report said at the end of each session, as it stood then. Nothing here has been
        rewritten since.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {moved.map(m => (
          <div
            key={m.round}
            style={{
              border: '1px solid var(--gw-border)', borderRadius: 10, background: 'var(--gw-card)',
              padding: '11px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)' }}>Round {m.round}</span>
              <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>
                {m.takenAt}
                {/* A count, never a characterisation. What it means is the reader's. */}
                {m.differences > 0 && ` · ${m.differences} ${m.differences === 1 ? 'account differed' : 'accounts differed'}`}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>{m.says}</div>
            {m.amended && (
              <div style={{ fontSize: 11.5, color: 'var(--gw-amber-t)', lineHeight: 1.5, marginTop: 5 }}>
                {m.amended}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

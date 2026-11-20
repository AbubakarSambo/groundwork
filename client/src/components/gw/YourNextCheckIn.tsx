import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * WHEN THE NEXT ONE OPENS, SAID WHERE A PERSON HAS JUST FINISHED.
 *
 * Hafsah, 22 September 2026: "Team also complained about not knowing when the next sessions will
 * start." The date was on the participant page header, which is not where anybody is after a
 * check-in: they are on the finished screen or the board. The product makes the next session the
 * moment this one completes, with the day it opens on it, so the day is known here and now.
 */
export function YourNextCheckIn({ groundId }: { groundId: string }) {
  const { data } = useQuery({
    queryKey: ['my-checkin-status', groundId, 'next'],
    queryFn: () => groundsApi.getMyCheckinStatus(groundId),
    /* The next row is written as this one completes; one retry covers the race. */
    retry: 2,
    retryDelay: 1500,
  })
  if (!data) return null
  const next = (data.checkIns ?? [])
    .filter((c) => c.status !== 'COMPLETED')
    .sort((a, b) => a.sessionNumber - b.sessionNumber)[0]
  if (!next) {
    return <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--gw-sub)', }}>That was the last check-in planned.</p>
  }
  const opens = next.availableFrom ? new Date(next.availableFrom) : null
  const later = !!opens && opens.getTime() > Date.now()
  return (
    <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--gw-sub)', }}>
      {later
        ? <>Your next check-in opens on <strong style={{ color: 'var(--gw-text)' }}>{whenItWas(opens, 'full')}</strong>. You will get an email that day, and your link will open it.</>
        : <>Your next check-in is open now if you want to go straight on.</>}
    </p>
  )
}

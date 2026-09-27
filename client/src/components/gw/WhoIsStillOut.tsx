import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { conversationApi } from '@/api/conversation'
import { peopleLabels, atTheStart } from '@/lib/utils'

/**
 * WHO HAS ANSWERED AND WHO HAS NOT, AT THE END OF THE LEAD'S OWN SESSION.
 *
 * "At the end of my check-in as a lead, I need to also see who has checked in and who has not, and
 * also click to see the report." The finished-session screen showed the lead their own report and
 * two navigation buttons; the state of the round - the thing a lead is actually waiting on - was
 * two clicks away on another tab.
 *
 * A list of lines, not a card of cards: "you have a tendency of putting small things in large
 * cards". One row per person, their state on the right, and Remind where it applies.
 */
export function WhoIsStillOut({ groundId, sessionNumber }: { groundId: string; sessionNumber: number }) {
  const { data: ground } = useQuery({
    queryKey: ['ground', groundId],
    queryFn: () => groundsApi.get(groundId),
    enabled: !!groundId,
  })

  const remind = useMutation({
    mutationFn: (checkInId: string) => conversationApi.remind(checkInId),
    onSuccess: () => toast.success('Reminder sent'),
    onError: () => toast.error('That did not send. Try again.'),
  })

  const people = ((ground as any)?.participants ?? []) as any[]
  if (people.length < 2) return null

  /* The lead's own list: two people with no name are "one colleague" and "another colleague". */
  const labels = peopleLabels(people, { forTheLead: true })
  const rows = people.map((p) => {
    const theirs = (((ground as any)?.checkIns ?? []) as any[]).filter(
      (c) => c.participantId === p.id && c.sessionNumber === sessionNumber,
    )
    const done = theirs.some((c) => c.status === 'COMPLETED')
    const going = theirs.some((c) => c.status === 'IN_PROGRESS')
    const open = theirs.find((c) => c.status !== 'COMPLETED')
    return {
      id: p.id,
      name: atTheStart(labels.get(p.id) ?? 'a colleague'),
      joined: !!p.userId,
      done,
      state: done ? 'Answered' : going ? 'Part way through' : !p.userId ? 'Not joined yet' : 'Not started',
      remindable: !done && !!p.userId && !!open?.id ? (open.id as string) : null,
    }
  })

  const waiting = rows.filter((r) => !r.done).length

  return (
    <div style={{ maxWidth: 460, margin: '14px auto 0' }}>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 7, lineHeight: 1.55 }}>
        {waiting === 0
          ? `Everyone has answered session ${sessionNumber}.`
          : waiting === 1
            ? `One person still to answer session ${sessionNumber}.`
            : `${waiting} people still to answer session ${sessionNumber}.`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
              fontSize: 12.5, padding: '5px 0', borderBottom: '1px solid var(--gw-border)',
            }}
          >
            <span style={{ color: 'var(--gw-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
              <span style={{ color: r.done ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>{r.state}</span>
              {r.remindable && (
                <button
                  onClick={() => remind.mutate(r.remindable as string)}
                  disabled={remind.isPending}
                  style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  Remind
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

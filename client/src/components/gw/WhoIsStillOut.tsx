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
export function WhoIsStillOut({ groundId, sessionNumber, myUserId }: { groundId: string; sessionNumber: number; myUserId?: string | null }) {
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
  /* From staging (live main line): whether THIS person answered this round comes from sessionProgress
     (the round everyone is actually being counted against), not from matching a local session number
     against their check-in rows - completing a round spawns everyone's next-round row immediately, so
     a raw row match can miss someone who already answered. */
  const progress = (ground as any)?.sessionProgress as
    | { sessionNumber: number; missingParticipantIds: string[]; declinedParticipantIds: string[] }
    | null
    | undefined
  const round = progress?.sessionNumber ?? sessionNumber
  const missing = new Set(progress?.missingParticipantIds ?? [])
  const declined = new Set(progress?.declinedParticipantIds ?? [])
  const rows = people.map((p) => {
    const theirs = (((ground as any)?.checkIns ?? []) as any[]).filter(
      (c) => c.participantId === p.id && c.sessionNumber === round,
    )
    const done = !progress ? theirs.some((c) => c.status === 'COMPLETED') : !missing.has(p.id) && !declined.has(p.id)
    const isDeclined = progress ? declined.has(p.id) : theirs.some((c) => c.status === 'DECLINED')
    const going = theirs.some((c) => c.status === 'IN_PROGRESS')
    const open = theirs.find((c) => c.status !== 'COMPLETED')
    const isSelf = !!myUserId && p.userId === myUserId
    const name = isSelf ? 'You' : atTheStart(labels.get(p.id) ?? 'a colleague')
    /* A full sentence, keyed to "you" for the reader's own row and to a plain verb agreement
       otherwise ("You have answered." / "Baraka has answered."), not a status word beside a name
       (no dots, no clipped labels: CLAUDE.md's rule for anything a person reads). */
    const have = isSelf ? 'have' : 'has'
    const state = done
      ? `${name} ${have} answered.`
      : isDeclined
        ? `${name} ${have} said no to this session.`
        : going
        ? `${name} ${isSelf ? 'are' : 'is'} part way through.`
        : !p.userId
          ? `${name} ${have} not joined yet.`
          : `${name} ${have} not started yet.`
    return {
      id: p.id,
      name,
      isSelf,
      joined: !!p.userId,
      done,
      state,
      remindable: !done && !isDeclined && !!p.userId && !!open?.id ? (open.id as string) : null,
    }
  })

  const stillToAnswer = rows.filter((r) => !r.done && !r.isSelf && !declined.has(r.id)).map((r) => r.name)

  /* "Baraka and Neema still have to answer.", "Baraka still has to answer.", or nothing left to
     say when everyone (the reader included) has answered - said as one sentence, not a count next
     to the word "session", which nobody reads as a name of people still waited on. */
  const header = stillToAnswer.length === 0
    ? 'Everyone has answered.'
    : stillToAnswer.length === 1
      ? `${stillToAnswer[0]} still has to answer.`
      : `${stillToAnswer.slice(0, -1).join(', ')} and ${stillToAnswer[stillToAnswer.length - 1]} still have to answer.`

  return (
    <div style={{ maxWidth: 460, margin: '14px auto 0' }}>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 7, lineHeight: '19px' }}>
        {header}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
              fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--gw-border)',
            }}
          >
            <span style={{ color: r.done ? 'var(--gw-green-t)' : 'var(--gw-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.state}</span>
            {r.remindable && (
              <button
                onClick={() => remind.mutate(r.remindable as string)}
                disabled={remind.isPending}
                style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', flexShrink: 0 }}
              >
                Remind
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

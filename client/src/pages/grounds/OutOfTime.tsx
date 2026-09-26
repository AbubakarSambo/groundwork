import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button, Tag } from '@/components/gw/kit'
import { AuthCard, AuthError, AuthNotice } from '@/pages/auth/auth-kit'

/**
 * "THIS CHECK-IN REACHED ITS END DATE" (A3, #/join/outoftime), for a person taking part. The words
 * are join-outoftime.txt's, with two changes said here:
 *
 *   - "All 38 of your check-ins and your history stay as they are." counts sessions as check-ins,
 *     which waits for Hafsah's decision on what "check-in" means. It says "Your answers and your
 *     history stay as they are." until then.
 *   - "She gets your request" becomes the lead's name: the product does not know pronouns.
 *
 * "Ask Wairimu for more time" is once a day, enforced on the server (asking-for-more-time.service.ts).
 */
export function OutOfTime({ groundId, onOpenMyWork }: { groundId: string; onOpenMyWork: () => void }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState('')
  const { data } = useQuery({ queryKey: ['more-time', groundId], queryFn: () => groundsApi.moreTime(groundId), retry: false })
  const ask = useMutation({
    mutationFn: () => groundsApi.askForMoreTime(groundId),
    onSuccess: () => { setProblem(''); void qc.invalidateQueries({ queryKey: ['more-time', groundId] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'Your request did not send. Try again.'),
  })

  const lead = data?.leadFirstName ?? null
  const until = data?.ranUntil
    ? whenItWas(data.ranUntil, 'dayAndMonthLong', 'UTC')
    : null
  const sub = `${until ? `It ran until ${until}. ` : ''}Nothing new can be added until ${lead ?? 'the person who runs it'} gives it more time.`
  const asked = !!data?.askedAt || ask.isSuccess

  return (
    <AuthCard title="This check-in reached its end date" sub={sub}>
      <p style={{ margin: '0 0 12px' }}><Tag tone="attention">Out of time</Tag></p>
      <div className="gw-invite-facts">
        <div>
          <h2>Your answers are kept</h2>
          <p>Your answers and your history stay as they are.</p>
        </div>
      </div>
      {problem && <AuthError>{problem}</AuthError>}
      {asked && <AuthNotice>{`${lead ?? 'The person who runs it'} has your request.`}</AuthNotice>}
      <div className="gw-auth-actions">
        <Button wide size="big" onClick={() => ask.mutate()} disabled={asked || ask.isPending}>
          {`Ask ${lead ?? 'them'} for more time`}
        </Button>
        <Button kind="secondary" wide size="big" onClick={onOpenMyWork}>Open my work</Button>
      </div>
      <p className="gw-auth-small" style={{ textAlign: 'center' }}>
        {`${lead ?? 'They'} ${lead ? 'gets' : 'get'} your request with one button to extend it.`}
      </p>
    </AuthCard>
  )
}

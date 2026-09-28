import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, Mark, PageTitle, Panel, Section, Button, Tag, Note } from '@/components/gw/ui'

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
 *
 * Rebuilt from `components/gw/ui` only (design-audit.md section 4; the invitation task): the small
 * `Mark`, `PageTitle`, the shared `Tag` and `Panel`/`Section`, the standard `Button`.
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
    <Page narrow>
      <Mark />
      <p><Tag tone="attention">Out of time</Tag></p>
      <PageTitle title="This check-in reached its end date" subtitle={sub} />
      <Panel>
        <Section heading="Your answers are kept">
          <p className="gwui-pt-sub">Your answers and your history stay as they are.</p>
        </Section>
      </Panel>
      {problem && <Note tone="error">{problem}</Note>}
      {asked && <Note>{`${lead ?? 'The person who runs it'} has your request.`}</Note>}
      <Button size="big" wide onClick={() => ask.mutate()} disabled={asked || ask.isPending}>
        {`Ask ${lead ?? 'them'} for more time`}
      </Button>
      <Button kind="secondary" size="big" wide onClick={onOpenMyWork}>Open my work</Button>
      <p className="gwui-note" style={{ textAlign: 'center' }}>
        {`${lead ?? 'They'} ${lead ? 'gets' : 'get'} your request with one button to extend it.`}
      </p>
    </Page>
  )
}

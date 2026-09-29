import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '@/api/client'
import { Section, Stack, SwitchRow, Note } from '@/components/gw/ui'
import { TheInviteLink } from './TheInviteLink'

/**
 * "WHO CAN JOIN" ON THE PEOPLE PAGE (A4 people.txt, lines 236 to 238; built in U.3).
 *
 * "Anyone with an @baridi.co.ke email", a switch, and "They can join Baridi without an invitation,
 * as "Takes part". You can change their role after." The domain is always the admin's own confirmed
 * address's, and the server refuses a public mail service or a domain another organisation holds,
 * in its own sentence, which is shown here.
 *
 * The organisation's own invite link ("Baridi's invite link") sits under it (TheInviteLink.tsx).
 *
 * REBUILT FROM THE SHARED PARTS: the heading is the standard `Section` (21px, above the panel, not
 * inside it - item 3), and the toggle row is `SwitchRow` (item 15).
 */
interface Joining { on: boolean; domain: string | null; whyNot: string | null }

export function WhoCanJoin({ orgName }: { orgName: string }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState('')
  const { data } = useQuery({
    queryKey: ['org-joining'],
    queryFn: () => apiClient.get('/users/organization/joining').then(r => (r.data.data ?? r.data) as Joining),
    retry: false,
  })
  const set = useMutation({
    mutationFn: (on: boolean) => apiClient.patch('/users/organization/joining', { on }).then(r => (r.data.data ?? r.data) as Joining),
    onSuccess: (next) => { setProblem(''); qc.setQueryData(['org-joining'], next) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not change. Try again.'),
  })
  if (!data) return null

  return (
    <Section heading="Who can join">
      <Stack gap={18}>
        {data.domain ? (
          <SwitchRow
            title={`Anyone with an @${data.domain} email`}
            detail={`They can join ${orgName} without an invitation, as “Takes part”. You can change their role after.`}
            on={data.on}
            onChange={() => set.mutate(!data.on)}
            disabled={set.isPending}
          />
        ) : (
          <Note>{data.whyNot}</Note>
        )}
        {problem && <Note tone="error">{problem}</Note>}
        <TheInviteLink orgName={orgName} />
      </Stack>
    </Section>
  )
}

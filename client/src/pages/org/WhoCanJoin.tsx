import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '@/api/client'

/**
 * "WHO CAN JOIN" ON THE PEOPLE PAGE (A4 people.txt, lines 236 to 238; built in U.3).
 *
 * "Anyone with an @baridi.co.ke email", a switch, and "They can join Baridi without an invitation,
 * as "Takes part". You can change their role after." The domain is always the admin's own confirmed
 * address's, and the server refuses a public mail service or a domain another organisation holds,
 * in its own sentence, which is shown here.
 *
 * The organisation's own invite link ("Baridi's invite link") is added under it in a later step.
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
    <section className="gw-who-can-join" aria-labelledby="who-can-join-h">
      <h2 id="who-can-join-h">Who can join</h2>
      {data.domain ? (
        <div className="gw-who-can-join-row">
          <div>
            <b id="join-by-domain-label">{`Anyone with an @${data.domain} email`}</b>
            <p>{`They can join ${orgName} without an invitation, as “Takes part”. You can change their role after.`}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.on}
            aria-labelledby="join-by-domain-label"
            className={`gw-switch${data.on ? ' on' : ''}`}
            onClick={() => set.mutate(!data.on)}
            disabled={set.isPending}
          >
            <span aria-hidden />
          </button>
        </div>
      ) : (
        <p>{data.whyNot}</p>
      )}
      {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
    </section>
  )
}

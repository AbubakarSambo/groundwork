import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/gw/kit'

/**
 * "BARIDI'S INVITE LINK" ON THE PEOPLE PAGE (A4 people.txt, lines 239 to 241; U.3).
 *
 * The prototype shows the link and "Copy". Hafsah decided an admin can turn it off, which makes a new
 * link when it is turned on again, so there is a switch; the sentence under it is ours, because the
 * prototype does not draw the switch.
 */
interface State { on: boolean; code: string | null }

export function TheInviteLink({ orgName }: { orgName: string }) {
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [problem, setProblem] = useState('')
  const { data } = useQuery({
    queryKey: ['org-invite-link'],
    queryFn: () => apiClient.get('/users/organization/invite-link').then(r => (r.data.data ?? r.data) as State),
    retry: false,
  })
  const set = useMutation({
    mutationFn: (on: boolean) => apiClient.patch('/users/organization/invite-link', { on }).then(r => (r.data.data ?? r.data) as State),
    onSuccess: (next) => { setProblem(''); setCopied(false); qc.setQueryData(['org-invite-link'], next) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not change. Try again.'),
  })
  if (!data) return null
  const address = data.code ? `${window.location.host}/j/${data.code}` : null

  return (
    <div className="gw-who-can-join-row" style={{ marginTop: 16 }}>
      <div style={{ minWidth: 0 }}>
        <b id="invite-link-label">{`The invite link for ${orgName}`}</b>
        {address ? (
          <p style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--gw-text)', overflowWrap: 'anywhere' }}>{address}</span>
            <Button
              kind="secondary"
              size="small"
              onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/j/${data.code}`); setCopied(true) }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </p>
        ) : (
          <p>The link is off. Turning it on makes a new link, so any old one stays closed.</p>
        )}
        {address && <p>Anyone with this link can join as “Takes part”. Turning it off closes it at once.</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={data.on}
        aria-labelledby="invite-link-label"
        className={`gw-switch${data.on ? ' on' : ''}`}
        onClick={() => set.mutate(!data.on)}
        disabled={set.isPending}
      >
        <span aria-hidden />
      </button>
      {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
    </div>
  )
}

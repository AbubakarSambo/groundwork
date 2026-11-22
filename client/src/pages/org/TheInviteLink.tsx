import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AChoiceOfTwo } from './a-choice-of-two'
import { apiClient } from '@/api/client'
import { Button, SwitchRow, Note } from '@/components/gw/ui'

/**
 * "BARIDI'S INVITE LINK" ON THE PEOPLE PAGE (A4 people.txt, lines 239 to 241; U.3).
 *
 * The prototype shows the link and "Copy" (design-audit.md item 13). Hafsah decided an admin can
 * turn it off, which makes a new link when it is turned on again, so there is a switch; the
 * sentence under it when it is off is ours, because the prototype does not draw the switch.
 *
 * REBUILT FROM THE SHARED PARTS: `SwitchRow` for the row itself, and the small `Copy` button is the
 * standard `Button` (kind="secondary" size="small"), not kit.tsx's old one.
 */
interface State { on: boolean; code: string | null; role?: 'MEMBER' | 'GUEST'; guestsMayJoin?: boolean }

/**
 * THE ROLE THE LINK GIVES (Hafsah, 21 November 2026): "Takes part", or "Guest" once guests can join the organisation, chosen
 * with a quiet "Change" beside the sentence. The server keeps it (`inviteLinkRole`) and gives it on joining.
 */
export function theLinkSays(role: 'MEMBER' | 'GUEST' | undefined): string {
  return role === 'GUEST'
    ? 'Anyone with this link can join as a guest. They only see the check-ins they are added to. Turning it off closes it at once.'
    : 'Anyone with this link can join as “Takes part”. Turning it off closes it at once.'
}

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
  const [changingRole, setChangingRole] = useState(false)
  const setRole = useMutation({
    mutationFn: (role: string) => apiClient.patch('/users/organization/invite-link', { role }).then(r => (r.data.data ?? r.data) as State),
    onSuccess: (next) => { setProblem(''); qc.setQueryData(['org-invite-link'], next) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not change. Try again.'),
  })
  if (!data) return null
  const address = data.code ? `${window.location.host}/j/${data.code}` : null

  return (
    <div>
      <SwitchRow
        title={`The invite link for ${orgName}`}
        detail={address ? (
          <span className="gwui-invite-link-row">
            <span className="gwui-invite-link-address">{address}</span>
            <Button
              kind="secondary"
              size="small"
              onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/j/${data.code}`); setCopied(true) }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </span>
        ) : 'The link is off. Turning it on makes a new link, so any old one stays closed.'}
        on={data.on}
        onChange={() => set.mutate(!data.on)}
        disabled={set.isPending}
      />
      {address && (
        <p className="gwui-switch-row-detail">
          {theLinkSays(data.role)}
          {data.guestsMayJoin && <>{' '}<button type="button" className="gwui-plain-link" aria-expanded={changingRole} onClick={() => setChangingRole((c) => !c)}>{changingRole ? 'Done' : 'Change'}</button></>}
        </p>
      )}
      {address && data.guestsMayJoin && changingRole && (
        <AChoiceOfTwo
          label="The role the link gives"
          name="the-role-the-link-gives"
          value={data.role ?? 'MEMBER'}
          options={[
            ['MEMBER', 'Takes part', 'They join as one of your people and take part in the check-ins they are invited to.'],
            ['GUEST', 'Guest', 'They join as a guest and only see the check-ins they are added to.'],
          ]}
          onChange={(k) => setRole.mutate(k)}
          disabled={setRole.isPending}
        />
      )}
      {problem && <Note tone="error">{problem}</Note>}
    </div>
  )
}

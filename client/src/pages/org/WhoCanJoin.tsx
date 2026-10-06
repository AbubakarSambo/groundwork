import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '@/api/client'
import { Section, Panel, Stack, SwitchRow, Note, Button, Modal } from '@/components/gw/ui'
import { TheInviteLink } from './TheInviteLink'
import { useAuthStore } from '@/stores/auth'

/** The domain of an email address, or null for one with no "@" (never expected, but typed). */
function domainOfAddress(email: string | undefined | null): string | null {
  const at = (email ?? '').indexOf('@')
  return at > -1 ? email!.slice(at + 1) : null
}

/**
 * "WHO CAN JOIN" ON THE PEOPLE PAGE (A4 people.txt, lines 236 to 238; built in U.3).
 *
 * "Anyone with an @baridi.co.ke email", a switch, and "They can join Baridi without an invitation,
 * as "Takes part". You can change their role after." The server refuses a public mail service or a
 * domain another organisation holds, in its own sentence, which is shown here.
 *
 * THE DOMAIN, AND CHANGING IT (Hafsah, 30 September, item 3). It starts as the domain of the
 * organisation's own FOUNDING email address, never whichever admin happens to be looking at this
 * page - so two different admins see the same domain here, where before each saw their own. With a
 * public founding address (a gmail.com, say), there is no domain until an admin names one. Either
 * way, an admin can change it: the quiet "Change"/"Name it" button below asks the server to set it
 * to THIS admin's own confirmed address's domain (`PATCH /users/organization/joining/domain`) - the
 * same guarantee the switch always gave, that nobody can name a company they are not at. Joining by
 * the invite link and joining by this domain both read the one value the server keeps
 * (`effectiveJoinDomain`, `api/src/common/an-email-domain.ts`).
 *
 * The organisation's own invite link ("Baridi's invite link") sits under it (TheInviteLink.tsx).
 *
 * REBUILT FROM THE SHARED PARTS: the heading is the standard `Section` (21px, above the panel, not
 * inside it - item 3), and the toggle row is `SwitchRow` (item 15). Both rows - the domain switch
 * and the invite link - sit inside one white `Panel`, with a line between them, as the prototype
 * draws it (a picture check found them loose on the page instead).
 *
 * "CHANGE" ASKS FIRST (screen fault 1; request 179 to the engine, still open). The server's own
 * `changeJoinDomain` sets the domain and nothing else, but `joiningByDomain` reads "on" straight off
 * whether a domain is set (`on: !!org?.joinDomain`) - so one click on "Change" silently switched
 * joining on, with no confirmation, even when it had been off. Until the engine answers request 179
 * with a way to change the domain without that side effect, this screen never calls the domain
 * mutation straight from the button: "Change" (or "Name it") opens a confirmation first, naming the
 * one domain it would use - the admin's own confirmed address's domain, the only domain the server
 * will ever accept - and, whenever the change would turn joining on, says so in the prototype's own
 * words before the admin confirms it.
 */
interface Joining { on: boolean; domain: string | null; whyNot: string | null }

export function WhoCanJoin({ orgName }: { orgName: string }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const myDomain = domainOfAddress(user?.email)
  const [problem, setProblem] = useState('')
  const [confirming, setConfirming] = useState(false)
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
  const change = useMutation({
    mutationFn: () => apiClient.patch('/users/organization/joining/domain', {}).then(r => (r.data.data ?? r.data) as Joining),
    onSuccess: (next) => { setProblem(''); setConfirming(false); qc.setQueryData(['org-joining'], next) },
    onError: (e: any) => { setProblem(e?.response?.data?.message ?? 'That did not change. Try again.'); setConfirming(false) },
  })
  if (!data) return null

  /* Naming a domain where there is none yet always switches joining on, too (the same server
     side-effect) - there is nothing yet to turn off. Changing an existing domain only turns
     joining on when it was off; when it is already on, this only moves which domain it reads. */
  const willTurnOn = !data.on

  return (
    <Section heading="Who can join">
      <Panel pad={false}>
        <div className="gwui-panel-row">
          {data.domain ? (
            <Stack gap={10}>
              <SwitchRow
                title={`Anyone with an @${data.domain} email`}
                detail={`They can join ${orgName} without an invitation, as “Takes part”. You can change their role after.`}
                on={data.on}
                onChange={() => set.mutate(!data.on)}
                disabled={set.isPending}
              />
              <Button kind="quiet" size="small" onClick={() => setConfirming(true)} disabled={change.isPending}>
                Change
              </Button>
              {problem && <Note tone="error">{problem}</Note>}
            </Stack>
          ) : (
            <Stack gap={10}>
              <Note>{data.whyNot}</Note>
              <Button kind="quiet" size="small" onClick={() => setConfirming(true)} disabled={change.isPending}>
                Name it
              </Button>
              {problem && <Note tone="error">{problem}</Note>}
            </Stack>
          )}
        </div>
        <div className="gwui-panel-row">
          <TheInviteLink orgName={orgName} />
        </div>
      </Panel>
      {confirming && (
        <Modal title={data.domain ? 'Change the domain' : 'Name the domain'} onClose={() => setConfirming(false)}>
          <Stack gap={16}>
            <Note>
              {myDomain
                ? (willTurnOn
                    ? `Anyone with an email address at ${myDomain} will be able to join ${orgName}. Turn this on?`
                    : `Change the domain people can join ${orgName} by to ${myDomain}, your own email address's domain?`)
                : 'Your own email address has no domain to use here.'}
            </Note>
            <Stack gap={10}>
              <Button onClick={() => change.mutate()} disabled={change.isPending || !myDomain}>
                {change.isPending ? 'Changing…' : (willTurnOn ? 'Turn this on' : 'Change it')}
              </Button>
              <Button kind="secondary" onClick={() => setConfirming(false)} disabled={change.isPending}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Modal>
      )}
    </Section>
  )
}

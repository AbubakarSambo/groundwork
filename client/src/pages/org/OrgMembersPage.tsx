import { WhoCanJoin } from './WhoCanJoin'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { scrollToId } from '@/lib/scroll-to'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { WaitingToBeLetIn } from './WaitingToBeLetIn'
import { EveryoneHere } from './EveryoneHere'
import { InvitePeople } from './InvitePeople'
import { WhoCanOpenACheckIn } from './WhoCanOpenACheckIn'

/**
 * THE PEOPLE PAGE (U.4, A4 people.txt), as an admin reads it, in the prototype's order:
 *
 *   Waiting to be let in        people from outside, invited to a check-in (WaitingToBeLetIn)
 *   Who reports to whom         folded, and Everyone at <organisation> (EveryoneHere)
 *   Invite people               a name and an email per line, and a role (InvitePeople)
 *   Who can join                the email domain and the invite link (WhoCanJoin, U.3)
 *   Who can open a check-in     moved here from Settings (WhoCanOpenACheckIn)
 *   Help your team get started  the guide, and the plans
 *
 * Each person's own page, with their role, their place and their check-ins, is OnePersonPage.
 *
 * The one part the prototype does not draw is kept: people a lead added to a check-in when the plan
 * had no seat for them. Nothing has been sent to them, and only an admin can make room, so this is
 * where that lands, at the top, only when there is somebody.
 */
export function OrgMembersPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'
  const orgName = user?.organization?.name ?? user?.organizationName ?? 'your organisation'

  const ownerQuery = useQuery({
    queryKey: ['org-owner'],
    queryFn: () => apiClient.get('/users/organization/owner').then(r => r.data.data ?? r.data),
    enabled: isAdmin,
    retry: false,
  })
  const ownerId: string | null = ownerQuery.data?.ownerUserId ?? null

  const seatQueue = useQuery({
    queryKey: ['waiting-for-a-seat'],
    queryFn: authApi.waitingForASeat,
    enabled: isAdmin,
  })
  /* Sends as many as there is room for, and says how many went and how many did not. */
  const sendHeld = useMutation({
    mutationFn: authApi.sendTheHeldInvitations,
    onSuccess: (r) => {
      if (r.sent === 0) toast.error('There is still no room. Free a seat or move to a larger plan, then try again.')
      else if (r.stillWaiting > 0) toast.success(`${r.sent} sent. ${r.stillWaiting} still waiting on a seat.`)
      else toast.success(r.sent === 1 ? 'Their invitation is on its way' : `${r.sent} invitations are on their way`)
      qc.invalidateQueries({ queryKey: ['waiting-for-a-seat'] })
    },
    onError: () => toast.error('Those could not be sent just now. Nobody has been emailed and they are all still waiting.'),
  })

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px 32px', maxWidth: 560 }}>
        <div style={{ fontSize: 15, color: 'var(--gw-sub)' }}>You need admin access to manage team members.</div>
      </div>
    )
  }

  return (
    <div className="gw-people-page" style={{ padding: '28px 20px 80px', maxWidth: 860, margin: '0 auto' }}>
      <div className="gw-people-crumb">{orgName}</div>
      <h1 className="gw-people-h1">People</h1>

      {(seatQueue.data?.length ?? 0) > 0 && (
        <section className="gw-people-sec gw-people-amber" aria-labelledby="no-seat-h">
          <h2 id="no-seat-h">
            {seatQueue.data!.length === 1
              ? 'Somebody is on a check-in with no seat for them'
              : `${seatQueue.data!.length} people are on check-ins with no seat for them`}
          </h2>
          <p className="gw-people-note">
            A lead added them and your plan is full, so nothing has been sent to them. Free a seat or
            move to a larger plan, then send the invitations. They have not been told any of this.
          </p>
          <ShowAFew rows={seatQueue.data!} few={5} what="waiting for a seat">
            {(person: any) => (
              <div key={person.id} className="gw-waiting-row">
                <div className="gw-waiting-who">
                  <b>{person.email}</b>
                  <p>{`Added by ${person.addedBy ?? 'a lead'}${person.forCheckIn ? ` for ${person.forCheckIn}` : ''}.`}</p>
                </div>
              </div>
            )}
          </ShowAFew>
          <div className="gw-people-actions">
            <button type="button" className="gw-btn" style={{ margin: 0 }} onClick={() => sendHeld.mutate()} disabled={sendHeld.isPending}>
              {sendHeld.isPending ? 'Sending…' : 'Send their invitations'}
            </button>
            <button type="button" className="gw-link-btn" onClick={() => navigate('/billing')}>See the plans</button>
          </div>
        </section>
      )}

      <WaitingToBeLetIn orgName={orgName} />

      <EveryoneHere orgName={orgName} ownerId={ownerId} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-12px 0 20px' }}>
        <button
          type="button"
          className="gw-btn"
          style={{ margin: 0 }}
          onClick={() => {
            scrollToId('invite-list')
            document.getElementById('invite-list')?.focus()
          }}
        >Invite a colleague</button>
      </div>

      <InvitePeople />

      {/* "Who can join" (A4 people.txt): anyone with the admin's own email domain, as "Takes part". U.3. */}
      <WhoCanJoin orgName={orgName} />

      <WhoCanOpenACheckIn orgName={orgName} />

      <section className="gw-people-sec" aria-labelledby="get-started-h">
        <h2 id="get-started-h">Help your team get started</h2>
        <div className="gw-people-two">
          <div className="gw-people-card">
            <b>Send your team the guide</b>
            <p>How a check-in works, what happens to what people write, and what you can see as their admin.</p>
            <button type="button" className="gw-btn-sm" onClick={() => navigate('/org/guide')}>Send the guide</button>
          </div>
          <div className="gw-people-card">
            <b>Put your whole team on</b>
            <p>{`Everyone at ${orgName} on one plan, so nobody waits for a seat.`}</p>
            <button type="button" className="gw-btn-sm" onClick={() => navigate('/billing')}>See the plans</button>
          </div>
        </div>
      </section>
    </div>
  )
}

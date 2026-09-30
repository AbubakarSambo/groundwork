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
import { Page, PageTitle, EdgeList, EdgeRow, Button, Section, Panel, Note, Stack } from '@/components/gw/ui'

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
 *
 * REBUILT FROM THE SHARED PARTS (design-audit.md section 3, "People (the admin's list)"; components/
 * gw/ui only, no inline styles for size, colour or spacing). Item 1: the page is now `Page`, 1088
 * pixels wide and left-aligned under the sidebar, not the old centred 860-pixel column. Item 2: the
 * title is `PageTitle`, the organisation's name muted above "People" in Literata. Item 4: the no-seat
 * warning is one `EdgeRow` with a red edge and its two buttons on the right, not a full-width amber
 * card - what it does is unchanged. Item 16: "Help your team get started" is two full-width
 * secondary `Button`s, 44px tall and 16px bold.
 */
/**
 * WHO ADDED THE PEOPLE WITH NO SEAT, SAID TRULY (U.4 re-review). It said "A lead added them" even when
 * an admin had. One name when one person added them all; otherwise "Someone on your team".
 */
export function whoAddedThem(rows: { addedBy?: string | null }[], seatsFree: number | null = 0): string {
  /*
   * AND WHETHER THERE IS ROOM NOW (U.4 fourth review). After a seat was freed the card still said the
   * plan was full. With room for all of them, or some, it says so; null is a plan with no cap.
   */
  const n = rows.length
  if (seatsFree === null || seatsFree >= n) {
    return n === 1
      ? 'There is a seat for them now. Send their invitation when you are ready.'
      : `There are seats for all ${n} of them now. Send their invitations when you are ready.`
  }
  if (seatsFree > 0) {
    return `${seatsFree === 1 ? 'There is a seat for 1' : `There are seats for ${seatsFree}`} of them now. `
      + 'Send their invitations when you are ready, and the rest wait until there is room.'
  }
  const names = [...new Set(rows.map((r) => r.addedBy).filter((n): n is string => !!n))]
  const who = names.length === 1 && rows.every((r) => r.addedBy === names[0]) ? names[0] : 'Someone on your team'
  return `${who} added them and your plan is full, so nothing has been sent to them. `
    + 'Free a seat or move to a larger plan, then send the invitations. They have not been told any of this.'
}

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

  /* The same count query the head count reads, so the no-seat card knows when there is room (U.4 fourth review). */
  const seatCount = useQuery({
    queryKey: ['billing-status-people'],
    queryFn: () => apiClient.get('/billing/status').then((r: any) => (r.data.data ?? r.data) as { people?: { count: number; cap: number | null } }),
    enabled: isAdmin,
    retry: false,
  })
  const people = seatCount.data?.people
  /* Unknown until it answers: then the card says what it always said, never "there is room". */
  const seatsFree: number | null = !people ? 0 : people.cap == null ? null : Math.max(0, people.cap - people.count)
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
      qc.invalidateQueries({ queryKey: ['org-members'] })
      qc.invalidateQueries({ queryKey: ['billing-status-people'] })
    },
    onError: () => toast.error('Those could not be sent just now. Nobody has been emailed and they are all still waiting.'),
  })

  if (!isAdmin) {
    return (
      <Page>
        <Note>You need admin access to manage team members.</Note>
      </Page>
    )
  }

  const noSeatHeading = (seatQueue.data?.length ?? 0) === 1
    ? 'Somebody is on a check-in with no seat for them'
    : `${seatQueue.data?.length ?? 0} people are on check-ins with no seat for them`

  return (
    <Page>
      <PageTitle eyebrow={orgName} title="People" />

      {(seatQueue.data?.length ?? 0) > 0 && (
        <EdgeList label={noSeatHeading}>
          <EdgeRow
            kind="concern"
            title={noSeatHeading}
            detail={(
              <>
                <p className="gwui-panel-text-muted">{whoAddedThem(seatQueue.data!, seatsFree)}</p>
                <ShowAFew rows={seatQueue.data!} few={5} what="waiting for a seat">
                  {(person: any) => (
                    <div key={person.id}>
                      <p className="gwui-panel-text"><b>{person.email}</b></p>
                      <p className="gwui-panel-text-muted">
                        {`Added by ${person.addedBy ?? 'a lead'}${person.forCheckIn ? ` for ${person.forCheckIn}` : ''}.`}
                      </p>
                    </div>
                  )}
                </ShowAFew>
              </>
            )}
            /*
              HAFSAH, 30 SEPTEMBER, ITEM 2: NOT A SECOND PRIMARY, AND NOT A REPEATED "SEE THE
              PLANS". The prototype does not draw this card at all (it is the one part of this
              page the prototype leaves out, kept because a lead can put somebody on a check-in
              with no seat for them, and only an admin can make room - see the note above
              OrgMembersPage). Where it is real, on this product, it must still leave the "Invite
              people" form's own "Send their invitations" (InvitePeople.tsx) as the page's one
              navy button, so "Send their invitations" here is a plain link, not a second
              `Button`, and it sends a genuinely different thing (the people already waiting for a
              seat, not whatever is typed into the invite form below) so it stays, rather than
              being dropped. "See the plans" is not kept a second time here: it is the exact same
              "Put your whole team on" link further down this page, and a person only needs to be
              told that once.
            */
            actions={(
              <button
                type="button"
                className="gwui-plain-link"
                onClick={() => sendHeld.mutate()}
                disabled={sendHeld.isPending}
              >
                {sendHeld.isPending ? 'Sending…' : 'Send their invitations'}
              </button>
            )}
          />
        </EdgeList>
      )}

      <WaitingToBeLetIn orgName={orgName} />

      <EveryoneHere orgName={orgName} ownerId={ownerId} />

      {/* SECONDARY, NOT PRIMARY (Hafsah, 30 September): this only scrolls to "Invite people" below,
          where "Send their invitations" is the page's real, single primary action. Kept primary,
          it would sit navy on screen at the same time as the no-seat card's own "Send their
          invitations" button above, whenever somebody is waiting for a seat. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          kind="secondary"
          onClick={() => {
            scrollToId('invite-list')
            document.getElementById('invite-list')?.focus()
          }}
        >Invite a colleague</Button>
      </div>

      <InvitePeople />

      {/* "Who can join" (A4 people.txt): anyone with the admin's own email domain, as "Takes part". U.3. */}
      <WhoCanJoin orgName={orgName} />

      <WhoCanOpenACheckIn orgName={orgName} />

      <Section heading="Help your team get started">
        <div className="gwui-two-up">
          <Panel>
            <Stack gap={10}>
              <p className="gwui-panel-text"><b>Send your team the guide</b></p>
              <p className="gwui-panel-text-muted">How a check-in works, what happens to what people write, and what you can see as their admin.</p>
              <Button kind="secondary" wide onClick={() => navigate('/org/guide')}>Send the guide</Button>
            </Stack>
          </Panel>
          <Panel>
            <Stack gap={10}>
              <p className="gwui-panel-text"><b>Put your whole team on</b></p>
              <p className="gwui-panel-text-muted">{`Everyone at ${orgName} on one plan, so nobody waits for a seat.`}</p>
              <Button kind="secondary" wide onClick={() => navigate('/billing')}>See the plans</Button>
            </Stack>
          </Panel>
        </div>
      </Section>
    </Page>
  )
}

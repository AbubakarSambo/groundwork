import { useState } from 'react'
import { WhoCanJoin } from './WhoCanJoin'
import { Link, useNavigate } from 'react-router-dom'
import { useTheNextSeat } from '@/components/gw/this-adds-a-seat'
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
import { Page, PageTitle, EdgeList, EdgeRow, Button, Section, Panel, Note, Stack, Folded } from '@/components/gw/ui'

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
/**
 * WHO "THEM" IS, FROM WHAT IS SERVED (walkthrough pass 2, item 5): one email on its own, or a list
 * joined with "and", never a bare pronoun with nothing before it to name.
 *
 * FAULT I (reviewer, third round): AN EMAIL WHERE A NAME WAS KNOWN. "wanjiru@suites.test and
 * peter.otieno@fitout.test" read two people by address when the row already carries a name for
 * them (`r.name` - `/users/waiting/seats`' own `GroundParticipant.nameGiven`, request 187 to the
 * engine to actually populate it rather than always serving `null`). Used here the moment it is
 * there; the address stays the fallback for whoever has none.
 */
function namesFor(rows: { email?: string | null; name?: string | null }[]): string {
  const names = rows.map((r) => r.name?.trim() || r.email).filter((e): e is string => !!e)
  if (names.length === 0) return 'them'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * FAULT I (reviewer, third round): "AMINA YUSUF ADDED ... " READ BACK TO AMINA HERSELF, NAMING
 * HER AS THOUGH SHE WERE SOMEBODY ELSE. `viewerName` is the admin's own name, as she would be
 * named in `addedBy` were she the one who added them (same `fullNameToCall` shape the server
 * already uses) - when it matches, this reads "You added ...", the way she would say it herself.
 * A missing comma before "and your plan is full" also ran two separate facts into one clause;
 * added here.
 */
export function whoAddedThem(rows: { addedBy?: string | null; email?: string | null; name?: string | null }[], seatsFree: number | null = 0, viewerName?: string | null): string {
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
  const oneAdder = names.length === 1 && rows.every((r) => r.addedBy === names[0]) ? names[0] : null
  const who = oneAdder && viewerName && oneAdder.trim() === viewerName.trim() ? 'You' : (oneAdder ?? 'Someone on your team')
  return `${who} added ${namesFor(rows)}, and your plan is full, so nothing has been sent to them. `
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
  const nextSeat = useTheNextSeat()
  /* The invitation form opens from "Invite a colleague", or at once when the address says #invite-list. */
  const [inviting, setInviting] = useState(() => typeof window !== 'undefined' && window.location.hash.includes('invite-list'))
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
    ? 'Somebody is on a check-in with no seat'
    : `${seatQueue.data?.length ?? 0} people are on check-ins with no seat`

  /* One row per person waiting, a red edge, "<email> is on <check-in> but has no seat" and how many
     seats are taken, filled from what the server sends. No buttons on the rows: the warning's one
     action is the quiet text link under them (Hafsah, 30 September). */
  /* Fix list item 6: past the plan's seats, the rest are extra seats, said as such rather than "27 of 20". */
  const seatsTakenSaying = people?.cap == null
    ? null
    : people.count > people.cap && !!nextSeat.data?.addsASeat
      ? `${people.count} seats are taken. Your plan includes ${people.cap}, and ${people.count - people.cap} ${people.count - people.cap === 1 ? 'is an extra seat' : 'are extra seats'}.`
      : `${people.count} of ${people.cap} seats are taken.`

  return (
    <Page>
      <PageTitle eyebrow={orgName} title="People" />

      {(seatQueue.data?.length ?? 0) > 0 && (
        <EdgeList label={noSeatHeading}>
          {/* THE SUMMARY SENTENCE (kept, word for word): who added them, and whether there is room
              now - `whoAddedThem`, unchanged, still the one place that says this. */}
          <p className="gwui-panel-text-muted">{whoAddedThem(seatQueue.data!, seatsFree, [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null)}</p>
          <ShowAFew rows={seatQueue.data!} few={5} what="waiting for a seat">
            {(person: any) => (
              <EdgeRow
                key={person.id}
                kind="concern"
                /*
                 * NIGHT NOTE ITEM 3 (B-129): `saying` IS THE SERVER'S OWN SENTENCE, TRUE FOR EITHER
                 * KIND. Built here, "... is on a check-in but has no seat" was wrong for a bare
                 * invitation (`kind: 'INVITATION'`) kept by a paste - never added to any check-in at
                 * all, so `forCheckIn` is null for them. `saying` is read first; the old sentence
                 * stays only as the fallback for an older server that does not send it.
                 */
                title={person.saying ?? `${person.name?.trim() || person.email} is on ${person.forCheckIn ?? 'a check-in'} but has no seat`}
                detail={(
                  <>
                    <p className="gwui-panel-text-muted">
                      {`Added by ${person.addedBy ?? 'a lead'}${person.forCheckIn ? ` for ${person.forCheckIn}` : ''}.`}
                    </p>
                    <p className="gwui-panel-text-muted">
                      {`They can’t check in until there’s room.${seatsTakenSaying ? ` ${seatsTakenSaying}` : ''}`}
                    </p>
                  </>
                )}
              />
            )}
          </ShowAFew>
          {/*
            ONE QUIET TEXT LINK, NO BUTTONS (Hafsah, 30 September): "its action is a quiet text link
            inside the warning, not a second button, unless the prototype's People page shows that
            warning with a button". The prototype's People screen as it finally reads
            (screens/A4-people-roles-and-access/people.txt, "you have 73 free") does not show this
            warning at all; source/s11.js drew one earlier, and later screens replaced it. So: a
            text link. With no room, the one thing to do here is get more seats (the sentence above
            already says a seat can be freed too, from each person's own page); with room, send
            the invitations.
          */}
          {seatsFree === 0 ? (
            <Link className="gwui-plain-link" to="/settings/billing">Move to a larger plan</Link>
          ) : (
            <button
              type="button"
              className="gwui-plain-link"
              onClick={() => sendHeld.mutate()}
              disabled={sendHeld.isPending}
            >
              {sendHeld.isPending ? 'Sending…' : 'Send their invitations'}
            </button>
          )}
        </EdgeList>
      )}

      <WaitingToBeLetIn orgName={orgName} />

      <EveryoneHere orgName={orgName} ownerId={ownerId} />

      {/* ONE WAY TO INVITE (design playbook, rule 3): the button is the page's one main action, and it opens the form. The form used to sit
          open under the button as a second way in. It is still on the page for anyone who arrives at "#invite-list". */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          kind="primary"
          onClick={() => {
            setInviting(true)
            /* The form is not on the page until the state has changed, so the focus waits for it. */
            setTimeout(() => {
              scrollToId('invite-list')
              document.getElementById('invite-list')?.focus()
            }, 0)
          }}
        >Invite a colleague</Button>
      </div>

      {inviting && <div id="invite-people"><InvitePeople /></div>}

      {/* "Who can join" (A4 people.txt): anyone with the admin's own email domain, as "Takes part". U.3. */}
      {/* Settings a person changes once, kept in one fold (design playbook, rule 8). Nothing in it is removed. */}
      <Folded summary="More about how people join">
        <Stack gap={30}>
          <WhoCanJoin orgName={orgName} />
          <WhoCanOpenACheckIn orgName={orgName} />
        </Stack>
      </Folded>

      <Section heading="Help your team get started">
        <div className="gwui-two-up">
          <Panel>
            <Stack gap={10}>
              <p className="gwui-panel-text"><b>Send your team the guide</b></p>
              <p className="gwui-panel-text-muted">How a check-in works, what happens to what people write, and what you can see as their admin.</p>
              <Button kind="quiet" onClick={() => navigate('/org/guide')}>Send the guide</Button>
            </Stack>
          </Panel>
          <Panel>
            <Stack gap={10}>
              <p className="gwui-panel-text"><b>Put your whole team on</b></p>
              <p className="gwui-panel-text-muted">{`Everyone at ${orgName} on one plan, so nobody waits for a seat.`}</p>
              <Button kind="quiet" onClick={() => navigate('/billing')}>See the plans</Button>
            </Stack>
          </Panel>
        </div>
      </Section>
    </Page>
  )
}

import { useQuery as useWhatsAppQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PhoneNumberField } from '@/components/gw/PhoneNumberField'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { ThisAddsASeat, useTheNextSeat } from '@/components/gw/this-adds-a-seat'
import { useEffect, useState } from 'react'
import { PeopleTable, PersonRow, Tag, Button, TextField, Stack, type TagTone } from '@/components/gw/ui'
import { groundsApi } from '@/api/grounds'
import { aPersonsSentenceForAServerError } from '@/lib/a-persons-sentence-for-a-server-error'
import { PeoplePicker } from '@/components/gw/PeoplePicker'
import { ShareSection } from '@/pages/grounds/ShareSection'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { atTheStart, firstNameOrLabel, nameWithoutGuessing } from '@/lib/utils'
import { initialsOf } from '@/pages/org/people-here'
import { waitsForItsStart } from '@/lib/the-leads-note'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "WHO'S IN IT" (docs/prototype/screens/A4-people-roles-and-access/check-in-people-and-setup.txt).
 *
 * Carries over, unchanged in meaning, every old "Who is in it" fold on the Setup tab
 * (GroundAdminPage.tsx, ~2543-2748: the seat warning, the approval note, the add-person queue, the
 * access code and share link) plus a roster row per person - name, when they joined, a status tag,
 * and for anyone who needs something before they can start, one sentence and one button underneath.
 *
 * THE SESSION-BY-SESSION GRID STAYS ON SESSIONS. That grid (one cell per session, GW's own roster on
 * the Sessions tab) answers "where has each person got to on THIS run" and belongs there; this
 * roster answers "who is on it, and can they get in" - delivery and access, not progress. Duplicating
 * the grid here would be a second, driftable copy of the same fact.
 *
 * "REMIND GRACE" DOES NOT EXIST. The only remind-an-admin route (`POST /users/me/waiting/remind`) is
 * for the waiting person to nudge their OWN admin - there is no route for a lead to do it on someone
 * else's behalf. So the tinted strip under somebody waiting on an admin says the true thing and its
 * button goes to the real place a lead can act (the People page), rather than a "Remind Grace" that
 * would call nothing.
 *
 * 29 SEPT PICTURE CHECK: THE SEPARATE "WHO IS IN THIS" PILLS ARE GONE FROM HERE. They repeated this
 * roster (a coverage pill per person) and said three things this roster did not: whether a person
 * has checked in for THIS session (folded into each row below, as a plain sentence, gated on
 * `notOpenYet` exactly as the pills were - nobody is late for a session that has not opened);
 * whether peers are hidden from each other on this ground (kept as the note under the summary line);
 * and the closing sentence about what the report will show once everyone has answered (kept, same
 * place). Nothing the pills said is dropped; `WhoIsInThis.tsx` itself is untouched and still used and
 * tested on its own (nobody-is-late-before-it-opens.spec.tsx).
 */
export function WhosInItRoster({
  ground, isInitiator, isOrgAdmin, colleagues, addingMany, addManyParticipants,
  newParticipantEmail, setNewParticipantEmail, newParticipantName = '', setNewParticipantName = () => undefined, newParticipantNote, setNewParticipantNote,
  newParticipantDepartment, setNewParticipantDepartment, addParticipantMut,
  queuedToAdd, setQueuedToAdd, inviteTheQueue, lastInvitedEmail, whyItWaits, lastInviteWaits,
  billingStatus, onShareCode, fixingEmailId, setFixingEmailId, fixingEmailValue,
  setFixingEmailValue, fixEmail, resendInvite, showAdd, showLink,
  sessionParties, peersHidden, notOpenYet, viewerIsParty, leadName, viewerIsTheLead,
}: {
  ground: any
  isInitiator: boolean
  isOrgAdmin: boolean
  colleagues?: { id: string; name: string; role?: string; team?: string | null }[]
  addingMany: boolean
  addManyParticipants: (picked: { id: string; name: string }[]) => void
  newParticipantEmail: string
  setNewParticipantEmail: (v: string) => void
  newParticipantName?: string
  setNewParticipantName?: (v: string) => void
  newParticipantNote: string
  setNewParticipantNote: (v: string) => void
  newParticipantDepartment: string
  setNewParticipantDepartment: (v: string) => void
  addParticipantMut: { mutate: () => void; isPending: boolean }
  queuedToAdd: { email: string; note: string }[]
  setQueuedToAdd: (q: { email: string; note: string }[]) => void
  inviteTheQueue: { mutate: () => void; isPending: boolean }
  lastInvitedEmail: string | null
  whyItWaits: string | null
  lastInviteWaits: boolean
  billingStatus: any
  navigate: (to: string) => void
  onShareCode: () => void
  fixingEmailId: string | null
  setFixingEmailId: (id: string | null) => void
  fixingEmailValue: string
  setFixingEmailValue: (v: string) => void
  fixEmail: { mutate: (v: { participantId: string; email: string }) => void; isPending: boolean }
  resendInvite: { mutate: (id: string) => void; isPending: boolean; variables?: string }
  /** Controlled from CheckInPeopleAndSetup.tsx, whose "Who's in it" heading carries the two openers. */
  showAdd: boolean
  showLink: boolean
  /** The old "Who is in this" pills' own per-person facts, matched here by participant id. */
  sessionParties?: { id: string; done: boolean; isSelf: boolean }[]
  peersHidden?: boolean
  notOpenYet?: boolean
  viewerIsParty?: boolean
  leadName?: string | null
  viewerIsTheLead?: boolean
}) {
  const participants: any[] = ground.participants ?? []
  /* IN AN ANCHOR CHECK-IN THE LEAD WHO ONLY MANAGES DOES NOT CHECK IN (engine's note, 8 October): she is left out of the count and out of "Checking in". */
  const leavesOutTheManager = ground.scenario === 'HELP_TEAM_UNDERSTAND'
  const isNotCounted = (p: any) => leavesOutTheManager && p.managingOnly === true
  const counted = participants.filter((p) => !isNotCounted(p))
  const checkingIn = counted.filter((p) => p.userId && !p.notJoinedYet && p.inviteDeliveryStatus !== 'BOUNCED' && !p.awaitingSeat && !p.user?.awaitingOrgApproval).length
  const needSomething = counted.length - checkingIn

  const seats = billingStatus?.people
  /* Fix list item 6: on a plan that adds seats, a full plan is an extra seat, said before it sends, not a refusal. */
  const nextSeat = useTheNextSeat()
  const seatsFull = !nextSeat.data?.addsASeat && seats?.cap != null && seats?.count != null && seats.count >= seats.cap

  return (
    <div>
      <p className="gwui-panel-text" style={{ fontWeight: 700 }}>
        {counted.length} {counted.length === 1 ? 'person' : 'people'}.
        {/* FAULT H (reviewer, third round): a semicolon joined two separate counts into one
            clipped clause. Two plain sentences instead. */}
        {' '}{checkingIn} {checkingIn === 1 ? 'is' : 'are'} checking in.{needSomething > 0 ? ` ${needSomething} ${needSomething === 1 ? 'needs' : 'need'} something before they can start.` : ''}
      </p>

      {/* WHAT THE PILLS SAID THAT WAS NOT PER-PERSON: whether peers can see each other here, and what
          the report will show once everyone has answered. */}
      {peersHidden ? (
        <p className="gwui-note">
          {viewerIsTheLead
            ? 'People on this check-in answer without seeing each other. You can see who is here.'
            : `${leadName ?? 'Your lead'} knows who is here. You will not see the others or what they wrote, and they will not see you.`}
        </p>
      ) : (
        <p className="gwui-note">
          {viewerIsParty === false
            ? 'When everyone has checked in, the report shows where the team agrees, where it differs, and what to do next.'
            : 'When everyone has checked in, the report shows where you agree, where you differ, and what to do next.'}
        </p>
      )}

      {isInitiator && showLink && ground.joinToken && (
        <div className="panel pad">
          <ShareSection joinToken={ground.joinToken} />
        </div>
      )}

      {isInitiator && showAdd && (
        <AddPeopleForm
          isOrgAdmin={isOrgAdmin} colleagues={colleagues} participants={participants} seats={seats} seatsFull={seatsFull}
          addingMany={addingMany} addManyParticipants={addManyParticipants}
          newParticipantEmail={newParticipantEmail} setNewParticipantEmail={setNewParticipantEmail} newParticipantName={newParticipantName} setNewParticipantName={setNewParticipantName}
          newParticipantNote={newParticipantNote} setNewParticipantNote={setNewParticipantNote}
          newParticipantDepartment={newParticipantDepartment} setNewParticipantDepartment={setNewParticipantDepartment}
          addParticipantMut={addParticipantMut} queuedToAdd={queuedToAdd} setQueuedToAdd={setQueuedToAdd}
          inviteTheQueue={inviteTheQueue} lastInvitedEmail={lastInvitedEmail} whyItWaits={whyItWaits} lastInviteWaits={lastInviteWaits}
          onShareCode={onShareCode}
        />
      )}

      <PeopleTable>
        {participants.map((p: any) => {
          /*
           * ONE NAME EVERYWHERE SOMEBODY WITH NO SEAT IS SHOWN (walkthrough pass 2, item 1;
           * `nameWithoutGuessing`, lib/utils.ts). A row heading is the start of a line, not the
           * middle of a sentence - `nameWithoutGuessing` already capitalises a real name for that;
           * whoever can see this person's email (the server already nulls it for anyone who cannot,
           * see `email: hideContact && ...` in grounds.service.ts) reads their plain address where
           * there is no name at all to show, rather than "A colleague" (U.4 review, item 6), and
           * never a name GUESSED out of that address (U.4 re-review, item 4): "zawadi.u8@example.test"
           * read back as "Zawadi U8" is a name nobody gave, to a reader who had no part in typing it.
           * With no name and no address this reader may see either, the row reads "Somebody invited
           * by email", and a sentence reads "this person".
           */
          const { name, when, statusText, tone, sessionLine, help } = whereThisPersonIs(p, {
            ground, isInitiator, isOrgAdmin, isNotCounted, sessionParties, notOpenYet,
            fixingEmailId, setFixingEmailId, fixingEmailValue, setFixingEmailValue, fixEmail, resendInvite,
          })
          return (
            <PersonRow
              key={p.id}
              extraColumns="1fr 150px"
              person={{ initials: initialsOf(name), name, email: p.userId ? p.email : undefined, level: when }}
              help={help}
            >
              <span>{sessionLine}</span>
              <Tag tone={tone}>{statusText}</Tag>
            </PersonRow>
          )
        })}
      </PeopleTable>
      {(isInitiator || isOrgAdmin) && counted.length > 0 && (
        <TheirWhatsAppNumber groundId={ground.id} people={counted.map((p: any) => ({ id: p.id, name: nameWithoutGuessing(p).name || p.email }))} />
      )}
    </div>
  )
}

/**
 * ONE PERSON'S ROW, IN TODAY'S WORDS: their status word, the line about when they joined, whether they have checked in for
 * this session, and the one sentence and button for anyone who needs something before they can start. Lifted out of the
 * roster unchanged, so the new People and setup (Release 1B) shows the same status words and the same fixes.
 */
export function whereThisPersonIs(p: any, c: {
  ground: any
  isInitiator: boolean
  isOrgAdmin: boolean
  isNotCounted: (p: any) => boolean
  sessionParties?: { id: string; done: boolean; isSelf: boolean }[]
  notOpenYet?: boolean
  fixingEmailId: string | null
  setFixingEmailId: (id: string | null) => void
  fixingEmailValue: string
  setFixingEmailValue: (v: string) => void
  fixEmail: { mutate: (v: { participantId: string; email: string }) => void; isPending: boolean }
  resendInvite: { mutate: (id: string) => void; isPending: boolean; variables?: string }
}): { name: string; when: string; statusText: string; tone: TagTone; sessionLine: string | null; help?: { tone: 'look' | 'concern'; text: string; action?: React.ReactNode } } {
  const { ground, isInitiator, isOrgAdmin, isNotCounted, sessionParties, notOpenYet, fixingEmailId, setFixingEmailId, fixingEmailValue, setFixingEmailValue, fixEmail, resendInvite } = c
  const { name, inASentence, nameless } = nameWithoutGuessing(p)
  const bounced = !p.userId && p.inviteDeliveryStatus === 'BOUNCED'
  const waitingForSeat = !!p.awaitingSeat
  const notLetIn = !!p.notLetIn
  const waitingForAdmin = !!p.userId && !!p.user?.awaitingOrgApproval && !notLetIn
  /* EVERYONE GETS A "WHEN" LINE, THE LEAD INCLUDED. The lead has no `invitedAt` (nobody
     invited them - they created the check-in), which used to leave their own row reading
     "Checking in" twice over (once as the date line, once as the status tag) while everyone
     else's row said when they joined. `ground.createdAt` is the same fallback the server
     itself uses for "when this check-in's clock starts" (when-the-clock-starts.ts). */
  /*
   * "JOINED" IS NOT TRUE OF SOMEBODY WHO NEVER GOT IN (U.4 review, item 5). Having an
   * account (`p.userId`) is not the same as being in THIS check-in - `notLetIn` and
   * `waitingForSeat` both have one and are still outside it, so they read "Invited" like
   * anybody else waiting, not "Joined". And Zawadi, whose invitation the plan itself never
   * let go out, reads why rather than a bare "Invited".
   *
   * NEITHER IS SOMEBODY STILL WAITING AT THE DOOR (U.4 re-review, item 3). An account
   * (`p.userId`) is created the moment somebody from outside the organisation accepts an
   * invitation, before any admin has said yes - so Rukia and Juma read "Joined 27 September"
   * about Faraji while he was still waiting for an admin, the same day the prototype's own
   * Peter, in that exact state, reads "Invited 22 September". `waitingForAdmin` now holds
   * that row out of "Joined" too, same as `notLetIn` and `waitingForSeat`.
   */
  const inItAlready = !!p.userId && !(p as any).notJoinedYet && !notLetIn && !waitingForSeat && !waitingForAdmin
  const when = inItAlready
    ? (p.invitedAt
        ? `Joined ${whenItWas(p.invitedAt, 'dayAndMonthLong')}`
        : `In it since ${whenItWas(ground.createdAt, 'dayAndMonthLong')}`)
    : waitingForSeat
      ? 'Not invited yet, because there is no seat for them.'
      : (p.invitedAt ? `Invited ${whenItWas(p.invitedAt, 'dayAndMonthLong')}` : 'Invited')

  let statusText = 'Checking in'
  let tone: TagTone = 'proven'
  if (isNotCounted(p)) { statusText = 'Runs it'; tone = 'plain' }
  else if (bounced) { statusText = 'The email bounced'; tone = 'concern' }
  else if (waitingForSeat) { statusText = 'Waiting for a seat'; tone = 'attention' }
  else if (notLetIn) { statusText = 'Not let in'; tone = 'concern' }
  else if (waitingForAdmin) { statusText = 'Waiting for an admin'; tone = 'attention' }
  else if (!p.userId || (p as any).notJoinedYet) { statusText = waitsForItsStart(p) ? 'Invited' : 'Not joined yet'; tone = 'plain' }

  /* WHETHER THEY HAVE CHECKED IN FOR THIS SESSION - what the old "Who is in this" pills said
     and this roster did not. Silent, exactly as the pills were, while the next session has
     not opened: nobody is late for one that has not started. */
  const session = sessionParties?.find((s) => s.id === p.id)
  /* SOMEBODY NOT LET IN CANNOT CHECK IN AT ALL (U.4 re-review, item 2b): "has not checked in
     for this session yet" reads as if a session were open and waiting on them, which is
     untrue of somebody an admin has refused. Left out entirely for them, same as before the
     next session opens. */
  /* Invited, not joined yet (Hafsah, 13 October): never said to be late for a session. */
  const sessionLine = notOpenYet || !session || notLetIn || !!(p as any).notJoinedYet
    ? null
    : session.done
      ? `${session.isSelf ? 'You have' : `${atTheStart(name)} has`} checked in for this session.`
      : `${session.isSelf ? 'You have' : `${atTheStart(name)} has`} not checked in for this session yet.`

  let help: { tone: 'look' | 'concern'; text: string; action?: React.ReactNode } | undefined
  if (bounced) {
    help = fixingEmailId === p.id
      ? {
          tone: 'concern',
          text: 'Type the corrected address and resend.',
          action: (
            <span style={{ display: 'inline-flex' }}>
              <input
                autoFocus
                type="email"
                value={fixingEmailValue}
                onChange={(e) => setFixingEmailValue(e.target.value)}
                placeholder="corrected@email.com"
                className="gwui-input"
              />
              <Button
                size="small"
                disabled={fixEmail.isPending || !looksLikeAnAddress(fixingEmailValue)}
                onClick={() => fixEmail.mutate({ participantId: p.id, email: fixingEmailValue })}
              >
                {fixEmail.isPending ? 'Resending…' : 'Resend invite'}
              </Button>
            </span>
          ),
        }
      : {
          tone: 'concern',
          text: `${atTheStart(name)}'s invite email never arrived.`,
          action: isInitiator
            ? <Button size="small" kind="secondary" onClick={() => { setFixingEmailId(p.id); setFixingEmailValue(p.email) }}>Fix the address</Button>
            : undefined,
        }
  } else if (waitingForSeat) {
    /*
     * SPEAK TO AN ADMIN AS "YOU" (U.4 review, item 4). And "View plans" now goes to the
     * plans page itself, not to People - pressing it used to land an admin back on the
     * roster they were already reading, with nothing about a plan on it.
     *
     * A PLAIN LINK, NOT A BUTTON (Hafsah, 30 September): it only goes to another page, and
     * does nothing here.
     *
     * PHONE WALK, SCREEN FAULT 1: SAID PLAINLY, WITH THEIR NAME. Said truly for either
     * reader already (no Resend is offered here - the `waitingForSeat` branch is checked
     * before the final `!p.userId && isInitiator` branch that offers it), but "Your plan
     * has no seat for them yet" buried who this was about in the middle of the sentence.
     * Leads with their name instead, the same shape for an admin (who still gets "View
     * plans" below it) and anyone else reading the same row.
     */
    help = {
      tone: 'look',
      text: `${atTheStart(name)} is waiting for a seat on your plan. They will get their invitation as soon as there is one.`,
      action: isOrgAdmin
        ? <Link className="gwui-open-link" to="/billing">View plans</Link>
        : undefined,
    }
  } else if (notLetIn) {
    /* WHAT HAPPENED, NOT "WAITING" (U.4 review, item 2). Once an admin has said no, "waiting
       for an admin" is no longer true - this says who decided and that it is final, with no
       button, because there is nothing left here for a lead to press. */
    help = {
      tone: 'concern',
      /* THE SECOND MENTION USES THE FIRST NAME (U.4 re-review, item 2c), the way the
         person's own page already does: "did not let Faraji Odhiambo in" names them in full
         once, and the sentence then goes on as anyone would say it, "so Faraji cannot check
         in" - not the full name twice over. */
      text: p.notLetInAt
        ? `${p.notLetInBy ?? 'An admin'} did not let ${inASentence} in, on ${whenItWas(p.notLetInAt, 'dayAndMonthLong')}. ${nameless ? 'They' : atTheStart(firstNameOrLabel(p))} cannot check in.`
        : `${p.notLetInBy ?? 'An admin'} did not let ${inASentence} in, so ${nameless ? 'they' : atTheStart(firstNameOrLabel(p))} cannot check in.`,
    }
  } else if (waitingForAdmin) {
    /* SPEAK TO AN ADMIN AS "YOU" (U.4 review, item 4). For a lead who is not an admin, no
       button is offered - "Go to People" would only meet a page that refuses them.
       A PLAIN LINK, NOT A BUTTON (Hafsah, 30 September): it only goes to another page. */
    help = {
      tone: 'look',
      text: isOrgAdmin
        ? `You can let ${inASentence} in on People.`
        : `${atTheStart(name)} is from outside your organisation, so an admin has to let them in before they can check in.`,
      action: isOrgAdmin
        ? <Link className="gwui-open-link" to="/org/members">Go to People</Link>
        : undefined,
    }
  } else if (!p.userId && isInitiator) {
    help = {
      tone: 'look',
      text: waitsForItsStart(p) ? 'Their invitation goes out on the morning the check-in starts.' : 'They have not joined yet.',
      action: !waitsForItsStart(p)
        ? <button type="button" className="gw-link t-small" disabled={resendInvite.isPending} onClick={() => resendInvite.mutate(p.id)}>
            {resendInvite.isPending && resendInvite.variables === p.id ? 'Sending…' : 'Resend invite'}
          </button>
        : undefined,
    }
  }
  return { name, when, statusText, tone, sessionLine, help }
}

/** "Add a person to this check-in": today's form, unchanged, so the new People and setup opens the very same one. */
export function AddPeopleForm({
  isOrgAdmin, colleagues, participants, seats, seatsFull, addingMany, addManyParticipants,
  newParticipantEmail, setNewParticipantEmail, newParticipantName = '', setNewParticipantName = () => undefined, newParticipantNote, setNewParticipantNote,
  newParticipantDepartment, setNewParticipantDepartment, addParticipantMut,
  queuedToAdd, setQueuedToAdd, inviteTheQueue, lastInvitedEmail, whyItWaits, lastInviteWaits, onShareCode,
}: {
  isOrgAdmin: boolean
  colleagues?: { id: string; name: string; role?: string; team?: string | null }[]
  participants: any[]
  seats: any
  seatsFull: boolean
  addingMany: boolean
  addManyParticipants: (picked: { id: string; name: string }[]) => void
  newParticipantEmail: string
  setNewParticipantEmail: (v: string) => void
  newParticipantName?: string
  setNewParticipantName?: (v: string) => void
  newParticipantNote: string
  setNewParticipantNote: (v: string) => void
  newParticipantDepartment: string
  setNewParticipantDepartment: (v: string) => void
  addParticipantMut: { mutate: () => void; isPending: boolean }
  queuedToAdd: { email: string; note: string }[]
  setQueuedToAdd: (q: { email: string; note: string }[]) => void
  inviteTheQueue: { mutate: () => void; isPending: boolean }
  lastInvitedEmail: string | null
  whyItWaits: string | null
  lastInviteWaits: boolean
  onShareCode: () => void
}) {
  /*
   * A PHONE NUMBER, ALWAYS ASKED (Hafsah, 30 October 2026; this replaces decision 106 item 6, "Leads cannot add numbers when
   * inviting"). The add itself carries no number (api a-lead-cannot-add-a-number-when-inviting.spec.ts): once the person is on the
   * check-in, their number goes through the one writer for a lead's number, PATCH .../participants/:id/whatsapp-number
   * (the-lead-adds-a-whatsapp-number.ts). Each number waits here beside its address until that person is on the list below.
   * One that does not save says so, and the add stands.
   */
  const { id: groundId } = useParams()
  const whatsappOn = useWhatsAppIsOn()
  const [phone, setPhone] = useState('')
  const [numbersToSave, setNumbersToSave] = useState<Record<string, string>>({})
  const keepTheNumber = () => {
    const email = newParticipantEmail.trim().toLowerCase()
    if (phone.trim() && looksLikeAnAddress(email)) setNumbersToSave((prev) => ({ ...prev, [email]: phone.trim() }))
    setPhone('')
  }
  useEffect(() => {
    if (!groundId) return
    for (const [email, number] of Object.entries(numbersToSave)) {
      const p = participants.find((x: any) => String(x?.email ?? '').trim().toLowerCase() === email)
      if (!p?.id) continue
      setNumbersToSave((prev) => { const { [email]: _saved, ...rest } = prev; return rest })
      const who = firstNameOrLabel(p) || email
      groundsApi.addTheirWhatsAppNumber(groundId, p.id, number)
        .then(() => toast.success(`${who}’s phone number is saved.`))
        /* The server's sentence names WhatsApp, so it is said only while WhatsApp is on (Hafsah's rule of 26 September). */
        .catch((e: any) => toast.error(whatsappOn && e?.response?.data?.message ? e.response.data.message : `${who}’s phone number did not save, but ${who} is on the check-in. Check that it has its country code and try again.`))
    }
  }, [participants, numbersToSave, groundId, whatsappOn])
  return (
      <div className="panel pad">
        <p className="gwui-switch-row-title">Add a person to this check-in</p>
        <ThisAddsASeat />
        {seatsFull && (
          <div className="gwui-note gwui-note-error" role="alert">
            Your plan covers {seats.cap} people, including you, and all {seats.cap} are taken. Move to a
            larger plan to add more.{' '}
            {/* A PLAIN LINK, NOT A BUTTON (Hafsah, 30 September): it only goes to another page. */}
            <Link className="gwui-open-link" to="/billing">View plans</Link>
          </div>
        )}
        {/*
          FAULT 5 (live walk, 6 October 2026): PLAIN SENTENCES, NOT JARGON OR A DASH JOIN. "Until
          the report releases" used the filing-cabinet word for sharing a report with people; "is
          the approval - there is no queue" joined two pieces with a dash instead of saying each
          as its own sentence.
        */}
        <p className="gwui-note">
          They give their own version of the same work. You cannot see what they write until you
          share the report.
        </p>
        <p className="gwui-note">
          {isOrgAdmin
            ? 'You are an admin here, so adding someone here is all the approval they need. Nobody waits in a queue. Anybody from outside your organisation gets a login here and appears on your People page, where you can take them off again.'
            : 'Somebody from outside your organisation is invited straight away, and an admin here has to let them in before they can check in. They are told the same thing, and you can see it beside their name below.'}
        </p>
        <PeoplePicker
          people={colleagues ?? []}
          alreadyIn={participants.map((m) => m.userId ?? '').filter(Boolean)}
          adding={addingMany}
          onAdd={(picked) => addManyParticipants(picked)}
        />
        <input
          type="text" placeholder="Their name, e.g. Samuel Otieno" aria-label="Their name"
          value={newParticipantName} onChange={(e) => setNewParticipantName(e.target.value)}
          className="gwui-input"
        />
        <input
          type="email" placeholder="name@company.com" aria-label="Their email address"
          value={newParticipantEmail} onChange={(e) => setNewParticipantEmail(e.target.value)}
          className="gwui-input"
        />
        <input
          type="text" placeholder="What do you want them to cover? (optional)" aria-label="What they are accountable for"
          value={newParticipantNote} onChange={(e) => setNewParticipantNote(e.target.value)}
          className="gwui-input"
        />
        <input
          type="text" placeholder="Their department (optional)" aria-label="Their department"
          value={newParticipantDepartment} onChange={(e) => setNewParticipantDepartment(e.target.value)}
          className="gwui-input"
        />
        <PhoneNumberField id="add-person-phone" value={phone} onChange={setPhone} whose="theirs" whatsappOn={whatsappOn} />
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Button
            onClick={() => { keepTheNumber(); addParticipantMut.mutate() }}
            disabled={!looksLikeAnAddress(newParticipantEmail) || addParticipantMut.isPending}
          >
            {addParticipantMut.isPending ? 'Inviting…' : 'Send invite'}
          </Button>
          <Button
            kind="secondary"
            onClick={() => {
              const email = newParticipantEmail.trim().toLowerCase()
              if (!looksLikeAnAddress(email)) return
              if (queuedToAdd.some((q) => q.email === email)) return
              keepTheNumber()
              setQueuedToAdd([...queuedToAdd, { email, note: newParticipantNote.trim() }])
              setNewParticipantEmail('')
              setNewParticipantNote('')
            }}
            disabled={!looksLikeAnAddress(newParticipantEmail)}
          >
            + Add another
          </Button>
        </div>

        {queuedToAdd.length > 0 && (
          <div className="panel">
            {queuedToAdd.map((q) => (
              <div key={q.email} className="gwui-field-row">
                <div className="gwui-field-row-value">
                  {q.email}
                  <div className="gwui-switch-row-detail">
                    {/* FAULT 5 (live walk, 6 October 2026): a plain sentence, not two pieces joined by a dash. */}
                    {q.note || 'There is no note. They will be asked the general questions for this situation.'}
                  </div>
                </div>
                <button
                  onClick={() => setQueuedToAdd(queuedToAdd.filter((x) => x.email !== q.email))}
                  aria-label={`Remove ${q.email}`}
                  className="btn quiet sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <Button onClick={() => inviteTheQueue.mutate()} disabled={inviteTheQueue.isPending}>
              {inviteTheQueue.isPending
                ? 'Inviting…'
                : `Invite ${queuedToAdd.length} ${queuedToAdd.length === 1 ? 'person' : 'people'}`}
            </Button>
          </div>
        )}
        {lastInvitedEmail && (
          <p className="gwui-note">
            {whyItWaits
              ? `${lastInvitedEmail} is on the check-in. ${whyItWaits}`
              : lastInviteWaits
                ? `${lastInvitedEmail} is on the check-in. Their invitation goes out on the start date.`
                : `Invite sent to ${lastInvitedEmail}`}
          </p>
        )}
        <Button kind="quiet" onClick={onShareCode}>Or share an access code instead</Button>
      </div>
  )
}

/**
 * THE LEAD ADDS SOMEBODY'S WHATSAPP NUMBER (Hafsah, 13 October 2026, evening: "add your phone number, or your lead can").
 * The number is kept on the organisation's roster against that person; Groundwork then writes to them there as well as
 * by email, and their reply from it joins them. A number somebody already has is theirs, and the server says so.
 */
export function TheirWhatsAppNumber({ groundId, people }: { groundId: string; people: { id: string; name: string }[] }) {
  /* Read only when opened, so the roster above it asks nothing until the lead wants the numbers. */
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <p className="gwui-note">
        <button type="button" className="gwui-plain-link" onClick={() => setOpen(true)}>WhatsApp numbers</button>
      </p>
    )
  }
  return <TheirWhatsAppNumbersOpen groundId={groundId} people={people} />
}

function TheirWhatsAppNumbersOpen({ groundId, people }: { groundId: string; people: { id: string; name: string }[] }) {
  /*
   * PILOTS ON WHATSAPP, 14 OCTOBER: each person's number and where they are on WhatsApp, read from the record, with a way to
   * add, change or remove it. Typed any common way ("0722 000 202" is read in the organisation's own country); an empty
   * number removes it. Only whoever runs the check-in and an admin are served this, and the server checks it again.
   */
  const qc = useQueryClient()
  const { data } = useWhatsAppQuery({ queryKey: ['whatsapp-roster', groundId], queryFn: () => groundsApi.whereEachPersonIsOnWhatsApp(groundId), retry: false })
  const [editing, setEditing] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [said, setSaid] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const rows = people.map((p) => ({ ...p, on: ((data ?? []) as any[]).find((r: any) => r.participantId === p.id) }))
  const save = async (participantId: string, value: string) => {
    setSaving(true)
    try {
      setSaid((await groundsApi.addTheirWhatsAppNumber(groundId, participantId, value)).said)
      setEditing(null); setPhone('')
      await qc.invalidateQueries({ queryKey: ['whatsapp-roster', groundId] })
    } catch (e: any) {
      setSaid(aPersonsSentenceForAServerError(e?.response?.data?.message, 'The number was not kept. Try again.'))
    } finally { setSaving(false) }
  }
  return (
    <div className="gwui-note" role="group" aria-label="WhatsApp numbers" data-testid="whatsapp-roster">
      <p className="gwui-panel-text">Add someone’s number and they can answer on WhatsApp.</p>
      {rows.map((r) => (
        <div key={r.id} data-testid={`whatsapp-row-${r.id}`}>
          <p className="gwui-panel-text">
            {r.on?.phone ? `${r.name}'s WhatsApp number is ${r.on.phone}. ` : `${r.name} has no WhatsApp number yet. `}
            {r.on?.phone ? r.on.says : ''}
          </p>
          {editing === r.id ? (
            <Stack gap={6}>
              <TextField aria-label={`WhatsApp number for ${r.name}`} placeholder="0712 345 678" value={phone} onChange={(e: any) => setPhone(e.target.value)} />
              <Button size="small" kind="secondary" disabled={saving || !phone.trim()} onClick={() => save(r.id, phone)}>{saving ? 'Saving…' : 'Keep the number'}</Button>
              <Button size="small" kind="quiet" onClick={() => { setEditing(null); setPhone('') }}>Cancel</Button>
            </Stack>
          ) : (
            <span>
              <button type="button" className="gwui-plain-link" onClick={() => { setEditing(r.id); setPhone(r.on?.phone ?? '') }}>{r.on?.phone ? 'Change' : 'Add a number'}</button>
              {r.on?.phone && <>{' '}<button type="button" className="gwui-plain-link" disabled={saving} onClick={() => save(r.id, '')}>Remove</button></>}
            </span>
          )}
        </div>
      ))}
      {said && <p className="gwui-panel-text">{said}</p>}
    </div>
  )
}

import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { WhoCanJoin } from './WhoCanJoin'
import { useState } from 'react'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'

interface OrgMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  /** Their WhatsApp number, where anybody has put one in. Blank for most people. */
  phoneNumber?: string | null
  /** Where this person actually got to. Computed server side - see users.service findAll. */
  state?: 'invited' | 'signed in' | 'checked in'
  /** How many check-ins they are on, and how many of those they have given an account on. */
  checkInsOn?: number
  checkInsAnswered?: number
  /** Came in by accepting a check-in invitation, not by being put on the organisation. */
  arrivedThroughACheckIn?: boolean
}

/** What happened, or would happen, to one pasted address. */
interface PastedRow { email: string; result: string }
interface PasteAnswer { preview: boolean; seatsLeft: number | null; rows: PastedRow[]; summary: string }

/**
 * EVERY PERSON, NOT THE FIRST PAGE OF THEM.
 *
 * `limit=200` looked like the obvious fix and came back 400: the shared pagination DTO caps every
 * paginated endpoint in the product at 100, and raising that cap to suit this page would widen the
 * biggest page anybody can request everywhere else too. Found by loading the page, not by reading
 * the DTO - and it failed as "No members yet", which is a 400 wearing the costume of an empty
 * company.
 *
 * So it pages, and stops. The ceiling exists because a runaway loop against a paginated endpoint
 * is worse than a truncated list, and a truncated list says so.
 */
const MOST_PAGES = 10
const PER_PAGE = 100

async function fetchMembers(): Promise<{ data: OrgMember[]; meta: { total: number } }> {
  const all: OrgMember[] = []
  let total = 0
  for (let page = 1; page <= MOST_PAGES; page += 1) {
    const r = await apiClient.get(`/users?limit=${PER_PAGE}&page=${page}`)
    const body = r.data.data ? r.data : { data: r.data, meta: { total: 0 } }
    all.push(...(body.data ?? []))
    total = body.meta?.total ?? all.length
    if (all.length >= total || (body.data ?? []).length < PER_PAGE) break
  }
  return { data: all, meta: { total } }
}

/*
 * PREVIEW AND SEND ARE THE SAME CALL, one flag apart. Two calls would be two implementations, and
 * they would disagree on the screen where somebody decides whether to email their whole company.
 */
function pasteMany(pasted: string, preview: boolean): Promise<PasteAnswer> {
  return apiClient.post('/users/invitations', { pasted, preview }).then(r => r.data.data ?? r.data)
}

/**
 * How each answer reads, and whether it is a problem.
 *
 * TENSE FOLLOWS THE CALL. The same word for a check and a send left "Will be invited" on the screen
 * after the invitations had gone - which reads as though nothing happened, on the one screen where
 * somebody needs to know that something did. Seen after clicking send on the running page.
 */
const HOW_IT_READS: Record<string, { says: string; sent?: string; tone: 'good' | 'quiet' | 'bad' }> = {
  invited: { says: 'Will be invited', sent: 'Invited', tone: 'good' },
  'already here': { says: 'Already here', tone: 'quiet' },
  repeated: { says: 'Listed twice', tone: 'quiet' },
  'not an email': { says: 'Not an address', tone: 'bad' },
  'no seat': { says: 'No seat on your plan', tone: 'bad' },
}

export function OrgMembersPage() {
  const whatsappOn = useWhatsAppIsOn()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [pasted, setPasted] = useState('')
  const [answer, setAnswer] = useState<PasteAnswer | null>(null)
  const isAdmin = user?.role === 'ADMIN'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['org-members'],
    queryFn: fetchMembers,
    enabled: isAdmin,
  })

  /**
   * WHO IS WAITING TO BE LET IN.
   *
   * Adding an address to a check-in used to make it a member of this organisation the moment they
   * accepted - no approval, nobody asked - and because a seat is any active user, on the bill at
   * the same time. Somebody from outside is queued now: they hold no seat and cannot check in until
   * this list is answered. So it goes at the TOP of this page rather than the bottom: a queue that
   * nobody is looking at means people who cannot start and do not know why.
   */
  const waiting = useQuery({
    queryKey: ['who-is-waiting'],
    queryFn: authApi.whoIsWaiting,
    enabled: isAdmin,
  })

  /* What the org's own setting is, so the sentence above can say it instead of "if your settings
     allow it" - which is the answer nobody needs at the moment they are adding somebody. */
  const howCheckInsWork = useQuery({
    queryKey: ['how-check-ins-work'],
    queryFn: () => apiClient.get<{ whoMayOpen: string; needsApproval: boolean }>('/users/organization/check-ins').then(r => r.data),
    enabled: isAdmin,
  })

  const seatQueue = useQuery({
    queryKey: ['waiting-for-a-seat'],
    queryFn: authApi.waitingForASeat,
    enabled: isAdmin,
  })

  /* Sends as many as there is room for. Saying how many went, and how many did not, is the whole
     answer: "sent 2, 3 still waiting" tells an admin they have not finished. */
  const sendHeld = useMutation({
    mutationFn: authApi.sendTheHeldInvitations,
    onSuccess: (r) => {
      if (r.sent === 0) toast.error('There is still no room. Free a seat or move to a larger plan, then try again.')
      else if (r.stillWaiting > 0) toast.success(`${r.sent} sent. ${r.stillWaiting} still waiting on a seat.`)
      else toast.success(r.sent === 1 ? 'Their invitation is on its way' : `${r.sent} invitations are on their way`)
      qc.invalidateQueries({ queryKey: ['waiting-for-a-seat'] })
    },
    /* What became of the work: they are all still on their check-ins and nobody has been emailed,
       so pressing this again is safe and nothing is half-done. */
    onError: () => toast.error('Those could not be sent just now. Nobody has been emailed and they are all still waiting.'),
  })

  const answerWaiting = useMutation({
    /* One mutation for both answers: they invalidate the same two lists and fail the same way, and
       two mutations would be two places to keep that agreeing. The return types differ by a word,
       so the result is discarded - the toast is decided by which answer was given, not by what
       came back. */
    mutationFn: async ({ id, letIn }: { id: string; letIn: boolean }): Promise<void> => {
      if (letIn) await authApi.letThemIn(id)
      else await authApi.doNotLetThemIn(id)
    },
    onSuccess: (_res, vars) => {
      toast.success(vars.letIn ? 'They can check in now' : 'They were not added')
      /* Both lists move: an approval adds a person here and takes one off the queue. */
      qc.invalidateQueries({ queryKey: ['who-is-waiting'] })
      qc.invalidateQueries({ queryKey: ['org-members'] })
    },
    onError: () => toast.error('That did not go through. Nothing has changed - try again.'),
  })

  const inviteMut = useMutation({
    mutationFn: (email: string) => authApi.teamInvite(email),
    onSuccess: () => {
      toast.success('Invite sent')
      setInviteEmail('')
      qc.invalidateQueries({ queryKey: ['org-members'] })
    },
    onError: () => toast.error('The invite did not send. Nobody has been emailed - try again.'),
  })

  /*
   * PREVIEW, THEN SEND. The preview is not a nicety here - `teamInvite` refuses one at a time when
   * the plan is full, so pasting 160 into a small plan without one means the first forty land and
   * the admin has emailed a fraction of their company with no way to tell which fraction.
   */
  const previewMut = useMutation({
    mutationFn: () => pasteMany(pasted, true),
    onSuccess: setAnswer,
    onError: () => toast.error('Could not read that list. Try again.'),
  })
  const sendManyMut = useMutation({
    mutationFn: () => pasteMany(pasted, false),
    onSuccess: (a) => {
      setAnswer(a)
      setPasted('')
      qc.invalidateQueries({ queryKey: ['org-members'] })
      toast.success(a.summary)
    },
    onError: () => toast.error('None of those invitations sent. Nobody has been emailed - try again.'),
  })

  /*
   * WHAT SOMEBODY IS HERE: member, lead, or admin. One field.
   *
   * This briefly wrote a role and a separate `mayOpenCheckIns` flag, on the argument that a third
   * role would hand leads the organisation. That argument was wrong, and checking rather than
   * defending it settled it: every privilege in this product is granted by naming ADMIN - forty-two
   * guarded routes on the API, nineteen checks in this client - and none by not being a MEMBER. So
   * a LEAD inherits nothing, and one field that says what somebody is beats two that must agree.
   */
  /*
   * WHO SET THIS ORGANISATION UP.
   *
   * Other admins cannot change their role or deactivate them - the server refuses it. This is here
   * so the page does not offer a control that exists to be refused, and so the position is visible:
   * an admin who cannot see who holds it has no way to understand the refusal.
   */
  const ownerQuery = useQuery({
    queryKey: ['org-owner'],
    queryFn: () => apiClient.get('/users/organization/owner').then(r => r.data.data ?? r.data),
    enabled: isAdmin,
    retry: false,
  })
  const ownerId: string | null = ownerQuery.data?.ownerUserId ?? null
  const iAmTheOwner = !!ownerId && ownerId === user?.id

  const handOverMut = useMutation({
    mutationFn: (userId: string) => apiClient.patch('/users/organization/owner', { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-owner'] })
      toast.success('Handed over. They now own this organisation.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not hand that over.'),
  })

  /*
   * AN ADMIN PUTS THE NUMBERS IN, because otherwise nobody does.
   *
   * A person can add their own under Settings and most will not. Whoever is rolling WhatsApp out to
   * a field team already has the numbers, in the same list they used to invite everybody, and had
   * no way to enter them: SCIM, POST /people, or ask each person to type their own. So the team
   * that most needs checking in by message was the team least likely to have it.
   */
  const phoneMut = useMutation({
    mutationFn: ({ id, number }: { id: string; number: string }) =>
      apiClient.patch(`/users/${id}`, { phoneNumber: number }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-members'] }); toast.success('Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That number did not save. Nothing else changed.'),
  })

  const roleMut = useMutation({
    mutationFn: ({ id, what }: { id: string; what: 'MEMBER' | 'LEAD' | 'ADMIN' }) =>
      apiClient.patch(`/users/${id}`, { role: what }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-members'] }); toast.success('Role updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not change that role.'),
  })

  function handleInvite() {
    const email = inviteEmail.trim()
    if (!looksLikeAnAddress(email)) return
    inviteMut.mutate(email)
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px 32px', maxWidth: 560 }}>
        <div style={{ fontSize: 15, color: 'var(--gw-sub)' }}>You need admin access to manage team members.</div>
      </div>
    )
  }

  const everybody = data?.data ?? []
  /*
   * A SEARCH BOX ONCE THE LIST IS LONGER THAN A SCREEN. An organisation putting its whole company
   * on scrolls a hundred rows to change one person's role. Shown only where it earns its space.
   */
  const [find, setFind] = useState('')
  const members = find.trim()
    ? everybody.filter((m: any) => `${m.firstName ?? ''} ${m.lastName ?? ''} ${m.email}`.toLowerCase().includes(find.trim().toLowerCase()))
    : everybody

  return (
    <div style={{ padding: '28px 20px 80px', maxWidth: 860, margin: '0 auto' }}>
      {/*
        TWO ADMIN PAGES, TWO DIFFERENT SHAPES. Measured side by side in the running product: Connect
        is 860 wide and centred, this page was 720 and left-aligned - no `margin: '0 auto'`, so it
        sat against the rail with the whole right-hand side empty. Nothing chose either number.

        Connect's is the one kept, so People matches it. The narrower pages are left alone: 520 on
        Settings and Billing is a single-column form, which is a reason, and the check-in list is
        1160 because it is a working surface and was widened on purpose.
      */}
      {/* This page had no internal link of any kind. The rail is there, so nobody was
          trapped, but an admin who came here to invite somebody had no way back to the
          thing they were doing. */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate('/grounds')}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← Back to check-ins
        </button>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>
        People
      </h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 10, lineHeight: 1.6 }}>
        Everyone signed in to Groundwork in your organisation. Invite colleagues to give them access.
      </p>

      {/* THE QUEUE. Shown only when there is one - an empty "nobody is waiting" panel on every
          visit is a box that teaches you to stop reading this part of the page. */}
      {/*
        PEOPLE ON A CHECK-IN WITH NO SEAT FOR THEM.

        Adding somebody when the account is full no longer refuses the lead - the person is added
        and nothing is sent to them. This is where that lands, because the lead cannot fix a seat cap
        and the admin can. Kept separate from the queue below: one is a decision about a person, this
        is a decision about the plan, and answering them the same way would be the wrong question
        twice.
      */}
      {isAdmin && (seatQueue.data?.length ?? 0) > 0 && (
        <div style={{ border: '1px solid var(--gw-amber-b)', background: 'var(--gw-amber-bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 3 }}>
            {seatQueue.data!.length === 1
              ? 'Somebody is on a check-in with no seat for them'
              : `${seatQueue.data!.length} people are on check-ins with no seat for them`}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
            A lead added them and your plan is full, so nothing has been sent to them. Free a seat or
            move to a larger plan, then send the invitations. They have not been told any of this.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {/* A few, then the count: an org that has just invited a hundred people should not have
                to scroll past all of them to reach the list of who is actually in. */}
            <ShowAFew rows={seatQueue.data!} few={5} what="waiting for a seat">
            {(person: any) => (
              <div key={person.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{person.email}</div>
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5 }}>
                  Added by {person.addedBy ?? 'a lead'}{person.forCheckIn ? ` for “${person.forCheckIn}”` : ''}
                </div>
              </div>
            )}
            </ShowAFew>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => sendHeld.mutate()}
              disabled={sendHeld.isPending}
              style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: sendHeld.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
            >{sendHeld.isPending ? 'Sending…' : 'Send their invitations'}</button>
            <button
              onClick={() => navigate('/pricing')}
              style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
            >See plans</button>
          </div>
        </div>
      )}

      {isAdmin && (waiting.data?.length ?? 0) > 0 && (
        <div style={{ border: '1px solid var(--gw-amber-b)', background: 'var(--gw-amber-bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 3 }}>
            {waiting.data!.length === 1 ? 'Somebody is waiting to be let in' : `${waiting.data!.length} people are waiting to be let in`}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
            They were invited to a check-in and they are not in this organisation. Until you answer,
            they cannot check in and they are not counted on your plan.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ShowAFew rows={waiting.data!} few={5} what="waiting to be let in">
            {(person: any) => (
              <div key={person.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{person.name ?? person.email}</div>
                  {/* Who asked for them and what for. An address on its own is not something
                      anybody can decide about. */}
                  <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5 }}>
                    {person.name ? `${person.email} · ` : ''}
                    {person.addedBy ? `added by ${person.addedBy}` : 'added by somebody no longer here'}
                    {person.forCheckIn ? ` · for "${person.forCheckIn}"` : ''}
                  </div>
                </div>
                <button
                  className="gw-btn-sm"
                  disabled={answerWaiting.isPending}
                  onClick={() => answerWaiting.mutate({ id: person.id, letIn: false })}
                >
                  Not this person
                </button>
                <button
                  className="gw-btn"
                  style={{ margin: 0, padding: '7px 14px', fontSize: 13 }}
                  disabled={answerWaiting.isPending}
                  onClick={() => answerWaiting.mutate({ id: person.id, letIn: true })}
                >
                  Let them in
                </button>
              </div>
            )}
            </ShowAFew>
          </div>
        </div>
      )}
      {/*
        * THE PILLS SAID "ADMIN" AND STOPPED THERE.
        *
        * A role badge appears beside people here and on the check-in list, and nothing anywhere
        * said what any of them could do. This is the page where roles are set, so it is the page
        * that should say. Written from what the code actually enforces, not from the role names:
        * `who-may-open-a-check-in` for who opens and who waits, and the admin-only rail items for
        * People, Connect and Billing.
        */}
      <p style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 32, lineHeight: 1.65 }}>
        <strong style={{ color: 'var(--gw-text)' }}>Admins</strong> manage people and billing, and
        approve check-ins when your organisation asks for that.{' '}
        <strong style={{ color: 'var(--gw-text)' }}>Everybody else</strong> takes part in the
        check-ins they are added to, and can open their own if your settings allow it.{' '}
        {/*
          AND WHAT THAT SETTING CURRENTLY IS, WHERE PEOPLE ARE BEING ADDED.

          "if your settings allow it" is true and answers nothing at the moment somebody needs it.
          Walked on a real org: the admin added two managers, told them to set up their own
          check-ins, and both were refused - the default is "only people I name", nothing on this
          page said so, and the managers could not act on the refusal either. It is one clause and
          a link, on the page where the people are added.
        */}
        {howCheckInsWork.data && (
          <>
            Right now,{' '}
            {howCheckInsWork.data.whoMayOpen === 'EVERYONE'
              ? 'anybody here can open one'
              : 'only people you name can open one'}
            .{' '}
            <button
              onClick={() => navigate('/settings')}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
            >Change that</button>.{' '}
          </>
        )}
        <strong style={{ color: 'var(--gw-text)' }}>Guests</strong> come from another organisation:
        they take part in what they are added to, and never open one here.
      </p>

      {/* "Who can join" (A4 people.txt): anyone with the admin's own email domain, as "Takes part". U.3. */}
      <WhoCanJoin orgName={user?.organization?.name ?? user?.organizationName ?? 'your organisation'} />

      {/* Invite form */}
      <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 12, padding: '20px 22px', marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Invite a team member</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 14, lineHeight: 1.5 }}>
          They will receive an email with a link to set themselves up in Groundwork.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            style={{
              flex: 1, padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-blue-b)',
              borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white',
            }}
          />
          <button
            onClick={handleInvite}
            disabled={inviteMut.isPending || !looksLikeAnAddress(inviteEmail)}
            style={{
              padding: '10px 20px', background: 'var(--gw-navy)', color: 'white', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: inviteMut.isPending || !looksLikeAnAddress(inviteEmail) ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {inviteMut.isPending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>

      {/*
        * PUTTING A COMPANY ON, which this page could only do one address at a time.
        *
        * Under the single-invite box rather than replacing it: inviting one person is still the
        * common case, and a textarea is the wrong shape for it.
        */}
      <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 28, background: 'var(--gw-card)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Put your whole team on</div>
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
          Paste a list of addresses, from a spreadsheet column or your mail client. You see exactly
          what will happen to each one before anything is sent.
        </div>
        <textarea
          value={pasted}
          onChange={e => { setPasted(e.target.value); setAnswer(null) }}
          rows={4}
          placeholder={'ada@yourcompany.com\nbob@yourcompany.com'}
          style={{
            width: '100%', padding: '10px 13px', fontSize: 13.5, border: '1px solid var(--gw-border)',
            borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white',
            resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => previewMut.mutate()}
            disabled={!pasted.trim() || previewMut.isPending}
            style={{
              /* Secondary once there is something to send: checking is the step before the act. */
              padding: '9px 18px', background: 'white', color: 'var(--gw-navy)',
              border: '1px solid var(--gw-navy)',
              borderRadius: 8, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
              cursor: pasted.trim() ? 'pointer' : 'default', opacity: pasted.trim() ? 1 : 0.5,
            }}
          >
            {previewMut.isPending ? 'Checking…' : 'Check the list'}
          </button>
          {/*
            * SENDING IS ONLY OFFERED AFTER A CHECK, and only when there is something to send. A
            * send button that is always live invites somebody to email 160 people without looking.
            */}
          {/*
            * ONLY WHILE IT IS STILL A PREVIEW. After the send this offered to send the same list
            * again - harmless, since everybody in it is now already here, but it reads as though
            * the first click did nothing.
            */}
          {answer && answer.preview && answer.rows.some(r => r.result === 'invited') && (
            <button
              onClick={() => sendManyMut.mutate()}
              disabled={sendManyMut.isPending}
              style={{
                /*
                 * `var(--gw-accent)` is not a token this product has. It resolved to nothing, so
                 * this was white text on a transparent background - the primary action, invisible.
                 * Seen in a screenshot of the running page; the code read fine.
                 */
                padding: '9px 18px', background: 'var(--gw-navy)', color: 'white', border: 'none',
                borderRadius: 8, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {sendManyMut.isPending
                ? 'Sending…'
                : `Send ${answer.rows.filter(r => r.result === 'invited').length} invitations`}
            </button>
          )}
        </div>

        {answer && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 8 }}>{answer.summary}</div>
            {/*
              * SEATS SAID BEFORE THE SEND, not discovered during it. This is the number that turns
              * a rollout into a half-rollout, and it is the one thing the old page could not say.
              */}
            {answer.seatsLeft !== null && (
              <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 10, lineHeight: 1.6 }}>
                Your plan has room for {answer.seatsLeft} more {answer.seatsLeft === 1 ? 'person' : 'people'}.{' '}
                {answer.rows.some(r => r.result === 'no seat') && (
                  <a href="/billing" style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>See the plans →</a>
                )}
              </div>
            )}
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
              {answer.rows.map((r, i) => {
                const how = HOW_IT_READS[r.result] ?? { says: r.result, tone: 'quiet' as const }
                const says = answer.preview ? how.says : (how.sent ?? how.says)
                return (
                  <div key={`${r.email}-${i}`} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center',
                    padding: '8px 12px', fontSize: 12.5,
                    borderBottom: i < answer.rows.length - 1 ? '1px solid var(--gw-border)' : 'none',
                    background: 'white',
                  }}>
                    <span style={{ color: 'var(--gw-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
                    <span style={{
                      flexShrink: 0, fontWeight: 600,
                      color: how.tone === 'bad' ? 'var(--gw-amber-t)' : how.tone === 'good' ? 'var(--gw-green-t)' : 'var(--gw-sub)',
                    }}>{says}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/*
        * TRAINING, WHICH IS THE STEP BETWEEN 160 ACCOUNTS AND 160 PEOPLE WHO USE THEM.
        *
        * Here rather than in the rail: it is a link an admin sends other people, not a section of
        * their own console, and this is the page they are on when they are thinking about the
        * people they just invited.
        */}
      <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 28, background: 'var(--gw-card)', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>Send your team the guide</div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            How to run a check-in, what happens to what people write, and what you can see as their admin.
          </div>
        </div>
        <button
          onClick={() => navigate('/org/guide')}
          style={{
            padding: '8px 16px', background: 'white', color: 'var(--gw-navy)',
            border: '1px solid var(--gw-navy)', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          Read it
        </button>
      </div>

      {/* Members list */}
      {/*
        * A FAILED LOAD IS NOT AN EMPTY COMPANY. This page rendered "No members yet" over a 400,
        * which tells an admin their people are gone.
        */}
      {isError ? (
        <div style={{ border: '1px solid var(--gw-amber-b-soft)', background: 'var(--gw-amber-bg)', borderRadius: 12, padding: '16px 18px', fontSize: 13.5, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>
          We could not load your people just now. Nobody has been removed - reload the page, and if
          it keeps happening tell us.
        </div>
      ) : isLoading ? (
        <div style={{ color: 'var(--gw-sub)', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
          {everybody.length > 12 && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--gw-border)', background: 'var(--gw-paper-2)' }}>
              <input
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder={`Find somebody among ${everybody.length}`}
                aria-label="Find somebody"
                style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: 13, borderRadius: 7, border: '1px solid var(--gw-border)', fontFamily: 'inherit', background: 'white' }}
              />
            </div>
          )}
          {members.length === 0 ? (
            <div style={{ padding: '24px 20px', color: 'var(--gw-sub)', fontSize: 14 }}>
              {find.trim() ? `Nobody here matches "${find.trim()}".` : 'No members yet.'}
            </div>
          ) : (
            /* The roster itself. There is a search box above it, which is the right control for a
               hundred people; this is so the page does not open as a hundred rows. */
            <ShowAFew rows={members} few={12} what="people">
            {(m: any, i: number) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', background: 'var(--gw-card)',
                  borderBottom: i < members.length - 1 ? '1px solid var(--gw-border)' : 'none',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 2 }}>
                    {m.firstName || m.lastName ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : m.email}
                  </div>
                  {(m.firstName || m.lastName) && (
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                  )}
                  {/*
                    THEIR WHATSAPP NUMBER, TYPED HERE, because whoever is rolling this out has the
                    numbers and the person who needs one is not the person who will type it.
                    Saves when the box loses focus or on Enter - no second button per row, on a page
                    that already has a dropdown and two buttons on every line.
                  */}
                  {whatsappOn && <input
                    defaultValue={m.phoneNumber ?? ''}
                    placeholder="WhatsApp number"
                    aria-label={`WhatsApp number for ${m.firstName || m.email}`}
                    disabled={phoneMut.isPending}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    onBlur={(e) => {
                      const next = e.target.value.trim()
                      if (next === (m.phoneNumber ?? '')) return
                      phoneMut.mutate({ id: m.id, number: next })
                    }}
                    style={{
                      marginTop: 4, width: 190, maxWidth: '100%', padding: '4px 8px', fontSize: 11.5,
                      fontFamily: 'inherit', borderRadius: 6, border: '1px solid var(--gw-border)',
                      color: 'var(--gw-text)', background: 'white',
                    }}
                  />}
                  {/* How they got here. Somebody who accepted one check-in's invitation looked identical
                      to somebody hired, on the page with the dropdown that can make them an admin. */}
                  {m.arrivedThroughACheckIn && (
                    <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', marginTop: 2 }} title="Accepted an invitation to one check-in. Nobody put them on the organisation directly.">
                      came in through a check-in
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/*
                    * WHERE THEY GOT TO, which at 160 people is the only question. "Pending" said
                    * one third of it: it could tell an unopened invitation from an account, and
                    * not an account from somebody who has actually used the thing.
                    */}
                  <span style={{
                    fontSize: 11, borderRadius: 6, padding: '2px 7px', fontWeight: 600,
                    background: m.state === 'checked in' ? 'var(--gw-green-bg)' : m.state === 'invited' ? 'var(--gw-amber-bg)' : 'var(--gw-bg)',
                    color: m.state === 'checked in' ? 'var(--gw-green-t)' : m.state === 'invited' ? 'var(--gw-amber-t)' : 'var(--gw-sub)',
                    border: `1px solid ${m.state === 'checked in' ? 'var(--gw-green-b)' : m.state === 'invited' ? 'var(--gw-amber-b-soft)' : 'var(--gw-border)'}`,
                  }}>
                    {/*
                      "CHECKED IN" MEANT "ONCE, SOMEWHERE".
                      Somebody on five check-ins who had answered on one wore the same green badge
                      as somebody who is fully up to date - "checked in next to people's name being
                      a bit off if they are on multiple check-ins". When a person is on more than
                      one, the badge says which.
                    */}
                    {m.state === 'checked in'
                      ? ((m.checkInsOn ?? 1) > 1
                        ? `Answered on ${m.checkInsAnswered ?? 1} of ${m.checkInsOn}`
                        : 'Checked in')
                      : m.state === 'invited' ? 'Invited, not opened'
                        : (m.checkInsOn ?? 0) > 0
                          ? `On ${m.checkInsOn}, answered none`
                          : 'Signed in, not on a check-in'}
                  </span>
                  {/*
                    * SUB-ADMINS. A select rather than a badge, because "add my team as sub admins"
                    * had no answer in the product at all - the role was set at sign-up and never
                    * again.
                    *
                    * Your own row is a badge, not a control. The server refuses the last admin
                    * demoting themselves; showing a control that exists to be refused is worse
                    * than not showing one.
                    */}
                  {/*
                    * WHOEVER HOLDS THIS ACCOUNT IS SHOWN AND NOT OFFERED.
                    *
                    * Their row carries no control for anybody else: the server refuses it, and a
                    * dropdown that exists to be refused is worse than none. Their own row still
                    * shows "You", as every admin's does.
                    */}
                  {m.id === ownerId && m.id !== user?.id && (
                    <span style={{
                      fontSize: 11, borderRadius: 6, padding: '2px 7px', fontWeight: 600,
                      background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)',
                    }}>Owns this organisation</span>
                  )}
                  {m.id === user?.id ? (
                    <span style={{
                      fontSize: 11, borderRadius: 6, padding: '2px 7px', fontWeight: 600,
                      background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)', border: '1px solid var(--gw-blue-b)',
                    /*
                     * "You, and you hold this account" was reported as a strange way to frame it,
                     * and it is: two facts bolted together with a comma, one of them phrased as
                     * though holding the account were a second identity. The other row already
                     * says "Holds this account" about somebody else, so this only needs to say the
                     * same thing about you.
                     */
                    }}>{iAmTheOwner ? 'You · owner' : 'You'}</span>
                  ) : m.id === ownerId ? null : (
                    <select
                      /* An unnamed control. A screen reader reached this row and announced a
                         combo box with no name, on the one page where the choice decides whether
                         somebody can see your organisation's people and billing. */
                      aria-label={`What ${m.firstName || m.email} can do here`}
                      value={m.role}
                      disabled={roleMut.isPending}
                      onChange={e => roleMut.mutate({ id: m.id, what: e.target.value as 'MEMBER' | 'LEAD' | 'ADMIN' })}
                      style={{
                        fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        borderRadius: 6, padding: '3px 6px', background: 'white',
                        color: m.role === 'ADMIN' ? 'var(--gw-navy)' : 'var(--gw-sub)',
                        border: `1px solid ${m.role === 'ADMIN' ? 'var(--gw-blue-b)' : 'var(--gw-border)'}`,
                      }}
                    >
                      {/* A guest belongs to another organisation and is only here for the
                          check-in they were added to. They cannot be assigned this - it is
                          listed so the control shows what they are instead of showing blank,
                          which is what an unmatched value renders as. Choosing any of the
                          three below makes them one of your people, deliberately. */}
                      {m.role === 'GUEST' && (
                        <option value="GUEST" disabled>Guest from another organisation</option>
                      )}
                      <option value="MEMBER">Takes part</option>
                      <option value="LEAD">Can open check-ins</option>
                      {/* The other three options say what they do - "Takes part", "Can open
                          check-ins", "Guest from another organisation". This one was the role name
                          on its own, which is the only one you had to already know. */}
                      <option value="ADMIN">Admin - manages people and billing</option>
                    </select>
                  )}
                  {/*
                    * HANDING IT ON, which is what stops the protection becoming a hostage the day
                    * that person leaves. Offered only by the holder, and only on another admin's
                    * row, because it can only go to somebody who can manage the organisation.
                    */}
                  {iAmTheOwner && m.id !== user?.id && m.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        const who = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email
                        if (window.confirm(
                          `Hand this organisation to ${who}?\n\nThey become the person who cannot be `
                          + 'removed by other admins, and you stop being that person. You stay an admin.',
                        )) handOverMut.mutate(m.id)
                      }}
                      style={{
                        fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        borderRadius: 6, padding: '3px 8px', background: 'white',
                        color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', whiteSpace: 'nowrap',
                      }}
                    >
                      Hand over
                    </button>
                  )}
                </div>
              </div>
            )}
            </ShowAFew>
          )}
        </div>
      )}

      {data?.meta.total != null && data.meta.total > members.length && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 12, textAlign: 'center' }}>
          Showing {members.length} of {data.meta.total} members
        </div>
      )}
    </div>
  )
}

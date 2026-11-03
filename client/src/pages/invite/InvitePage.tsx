import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InvitationExpired } from './InvitationExpired'
import { theLastDay } from '@/lib/a-date-reads-the-same-everywhere'
import { participantsApi } from '@/api'
import type { InvitePreview } from '@/api/participants'
import type { GroundScenario } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { Page, Mark, PageTitle, Panel, SubHeading, Callout, Note, Button, FieldLabel, TextField, Modal, Stack } from '@/components/gw/ui'
import { PhoneNumberField } from '@/components/gw/PhoneNumberField'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { keepTheNumberForWhenTheySignIn, saveMyNumber } from '@/lib/a-number-given-before-signing-in'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { toast } from 'sonner'
import { opensStraightOnTheQuestion, whereTheLinkGoes } from './the-link-opens-on-the-question'
import { isEvaluationScenario } from '@/lib/scenario-catalog'
import { askNameFor } from '@/lib/ask-name'

/**
 * The participant invite landing. ONE PATH: accepting the invite signs the
 * participant in (the emailed invite link is the magic credential - accept()
 * verifies it server-side, links their account, and returns a session) and
 * lands them directly in the REAL check-in engine (/checkin/:id, ChatPage /
 * conversation.service) on the initiator's ground, session 1.
 *
 * The old inline entry-pipeline chat (participantApi.chat) and its solo
 * entry report (entryApi.report, the "not cross-referenced with any other
 * account yet" line) are deliberately GONE from this path - participants get
 * the full engine: intake context, versioned prompt, probing, doc upload
 * with assessment, record extraction, and the shared/forming report on their
 * ground page once everyone is in.
 *
 * REBUILT FROM THE SHARED PARTS (components/gw/ui only; design-audit.md section 4). Every state
 * below is `Page narrow` with the small `Mark` at the top, the way join-invite.jpg,
 * join-waiting.jpg, join-outoftime.jpg and join-expired.jpg all draw it - never the old
 * `Arrival`/`gw-hdr`/`gw-ttl` chrome. See `one-arrival.spec.ts`, updated in the same commit: it
 * used to pin every arrival route to `Arrival`, and now says why `/invite` is the one exception.
 *
 * PRIMARY-BUTTONS-NEVER-TOGETHER: "Pick up where I left off" (the `preview.alreadyAccepted`
 * return, above the main return) and "Answer today's check-in now" (the fresh-invitation return,
 * below it) are the component's only two primary buttons, and they belong to two `return`
 * statements that cannot both execute for one render - a link is either already accepted or it
 * is not. Whichever one is true decides which single primary button, if any, reaches the screen.
 */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "Monday 5 October", on the date as stored (a start is a day, kept at midnight UTC). */
function theDayOf(iso: string): string {
  const d = new Date(iso)
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/**
 * ONE PLACE FOR THE PAGE'S OWN "ONE MOMENT" LINE (B-205 follow-up). This page's loading and
 * in-between states ("Loading your invitation…", "Opening your question…", and now "Opening your
 * check-in…" for somebody already signed in as the invitee) are one centred status line each, and
 * they used to repeat the same `className="t-body mut gw-pt-sub"` inline at each call site. One-off style
 * classes are only ever meant to go down (one-off-uses-only-go-down.spec.ts) - adding a third
 * literal use of an already-flagged class for the new state would have moved it the wrong way, so
 * this says it once and every call site reads from here instead.
 */
function OneLineStatus({ children }: { children: React.ReactNode }) {
  return <p role="status" className="t-body mut gw-pt-sub" style={{ textAlign: 'center' }}>{children}</p>
}

export function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  /* WHERE TO GO ONCE SIGNED IN, when the mail said. The report-ready mail sends a participant with no
     password through their own invite link with the report as next, because the report route is behind
     the sign-in wall. Only a check-in path is honoured: this is a link in a mail, not an open redirect. */
  const next = params.get('next') ?? ''
  const navigate = useNavigate()
  /** Set when the server has emailed a fresh way in, instead of signing us in here. */
  const [emailedTo, setEmailedTo] = useState<string | null>(null)
  /* The server's sentence for somebody signed in and not yet let in. Rendered, not navigated past. */
  /* The invited person cannot fix anything themselves and has no other way in; a toast that dismisses is not a failure surface. */
  const [failed, setFailed] = useState('')
  const [declinedQuietly, setDeclinedQuietly] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const signedIn = useAuthStore((s) => !!s.isAuthenticated)
  const signedInEmail = useAuthStore((s) => s.user?.email ?? null)
  /* "Grace Achieng" for the sentence below - the signed-in person's own name, never the invitee's. */
  const signedInName = useAuthStore((s) => s.user ? [s.user.firstName, s.user.lastName].filter(Boolean).join(' ').trim() : null)
  const qc = useQueryClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  /* Optional, always asked (Hafsah, 30 October 2026); saved to them through PATCH /auth/me, as Settings saves it, once they are signed in. */
  const [phone, setPhone] = useState('')
  const whatsappOn = useWhatsAppIsOn()
  /* "What happens to what you write" (design-audit.md section 3, U.20 fifth review): kept out of
     the page's flow, reachable from a plain link rather than an always-open section or the old
     folding panel. Its content is the Modal's children, below. */
  const [showWhatHappens, setShowWhatHappens] = useState(false)

  const { data: answer, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => participantsApi.preview(token),
    enabled: !!token,
    retry: false,
  })
  /* An expired invitation opens "This link has expired" (U.3), which carries nothing but the lead's first name. */
  const expired = answer && answer.expired === true ? answer : null
  /* Held for a seat (U.4 third review): the page is the refusal, with no button to answer. */
  const held = answer && (answer as any).heldForASeat === true ? (answer as { saying: string }) : null
  const preview: InvitePreview | undefined = answer && answer.expired !== true && !held ? (answer as InvitePreview) : undefined

  const accept = useMutation({
    mutationFn: () => participantsApi.accept(token, { firstName: firstName || undefined, lastName: lastName || undefined }),
    onSuccess: async (res) => {
      /**
       * They have just read it on this page, so the chat must not open with it again.
       * Same key ChatPage reads; private mode simply shows the explainer once more, which
       * is the safe direction to fail in.
       */
      try { localStorage.setItem('gw_privacy_seen', '1') } catch { /* private mode */ }
      /**
       * THREE OUTCOMES, NOT ONE.
       *
       * The link used to be destroyed on first use, so this only ever had to
       * handle a first-time join. Now it stays clickable forever - click, get
       * distracted, come back - and the server decides what clicking means:
       *
       *   resumed  this browser already holds their session, carry straight on
       *   emailed  a different browser, so nothing is minted here and a fresh
       *            sign-in link has gone to the address that was invited
       *   neither  a first-time join, exactly as before
       *
       * The middle case is the one that keeps a forwarded link worthless to
       * whoever received it, without the link ever being worthless to its owner.
       */
      /* Queued for approval, first time or coming back: "Almost in", never a check-in that refuses them. */
      if ((res as any).resumed && res.queuedForApproval) {
        navigate('/join/waiting', { replace: true })
        return
      }
      if ((res as any).resumed) {
        /*
          REFRESH WHO THEY ARE BEFORE SENDING THEM ON.

          "If I am added and already have an org on Groundwork, the check-in link does not take me
          to my check-in, it asks me to add an org still."

          `mustSetUpOrganisation` is computed on the server as "an admin of an organisation with no
          contact email, who belongs nowhere else" - and being added to somebody else's check-in
          writes the membership that makes the last clause false. The flag is only recomputed when
          somebody signs in or calls /auth/me, and this path does neither: the browser already holds
          a session, so it carries whatever was true the last time it looked. An admin of a
          half-finished organisation of their own is therefore still flagged, and RequireOrgSetup
          bounces them to org setup instead of the check-in they clicked.

          One call, on the path where the membership has just changed. Failure is not fatal - the
          worst case is the state they were already in.
        */
        try {
          const fresh = await authApi.me()
          const token = localStorage.getItem('token')
          if (token) setAuth(fresh, token)
        } catch { /* leaves them exactly as they were */ }
        /* Signed in already: the number they typed is theirs now (Hafsah, 30 October 2026). It never holds them up. */
        void saveMyNumber(phone)
        const checkInId = (res as any).checkInId as string | null
        const groundId = (res as any).groundId as string
        navigate(checkInId ? whereTheLinkGoes(checkInId, preview?.scenario) : `/grounds/${groundId}/p`, { replace: true })
        return
      }
      if ((res as any).emailed) {
        /* Signed in only when they open the link we just sent: the number waits for that address. */
        keepTheNumberForWhenTheySignIn(String((res as any).email ?? ''), phone)
        setEmailedTo((res as any).email as string)
        return
      }
      setAuth(res.user, res.accessToken)
      void saveMyNumber(phone)
      if ((res as any).existingAccount) {
        toast.info(`Welcome back - continuing as ${res.user.email}`)
      }
      qc.invalidateQueries({ queryKey: ['grounds'] })
      /* Signed in, and not yet let in. Sending them to a check-in that will refuse them, with a
         message about something else and a retry that can never work, is P4-B03. Told here. */
      if (res.queuedForApproval) {
        /* "Almost in" (U.3), a page of its own that can be opened again and says who was asked. */
        navigate('/join/waiting', { replace: true })
        return
      }
      // Seamless handoff: straight into their session-1 check-in on the
      // initiator's ground (the check-in row already exists - accept()
      // returns it, it never creates a second one). Fall back to the ground
      // page only if no open check-in was found.
      const checkInId = (res as any).checkInId as string | null
      const groundId = (res as any).groundId as string
      if (next.startsWith('/grounds/')) {
        navigate(next, { replace: true })
        return
      }
      if (checkInId) {
        navigate(whereTheLinkGoes(checkInId, preview?.scenario), {
          state: { groundId, sessionNumber: 1, groundLabel: preview?.groundLabel },
          replace: true,
        })
      } else {
        /**
         * Only reachable now for somebody whose sessions are all finished - accept() mints a
         * session 1 for anyone who has none and has never completed one, so a first-time joiner
         * cannot land here. The ground page is the right destination for a person who is done.
         */
        navigate(`/grounds/${groundId}/p`, { replace: true })
      }
    },
    onError: (err: any) => {
      /* The server's own sentence when there is one: it says which thing refused and what to do. Kept on
         the page, because this is the one person with no other route in. */
      const said = err?.response?.data?.message ?? (err?.response ? 'Could not start your session. Please try again.' : 'We could not reach Groundwork just then. Check your connection and try again.')
      setFailed(said)
      toast.error(said)
    },
  })

  /**
   * A TEAM UPDATE OPENS ON ITS QUESTION.
   *
   * No accept screen, no name form, no briefing: the token says who they are, clicking the link in
   * their own mail is the consent that screen was collecting, and the whole promise of that card is
   * two minutes. Every other situation keeps the screen, for the reason written under it.
   *
   * Runs once - `accept.isIdle` - so a re-render mid-flight cannot fire a second join.
   */
  /*
   * THE ONE-LINE LINK OPENS THE QUESTION WHETHER OR NOT IT HAS BEEN OPENED BEFORE. Hafsah, 21 Sep 2026:
   * the link from "Hafsah asked you for a quick update", opened in a browser with no session, spun on
   * "Opening your question" for ever. `alreadyAccepted` kept this from calling accept(), and the
   * branch below drew the spinner anyway. accept() is what opens the question - the server signs the
   * link's own recipient in again for this situation - so it is called either way.
   */
  /*
   * AND A REPORT LINK FOR SOMEBODY WHO HAS ALREADY ANSWERED GOES STRAIGHT THROUGH. Read live, 22 Sep
   * 2026: the report-ready mail to an open-link answerer landed on "Ada wants to hear your version ...
   * about ten minutes", about a conversation she had finished an hour before. Their name is the one
   * they gave at the end; the server signs them in on it and `next` takes them to the report.
   */
  const straightToTheReport = !!preview && !!preview.hasAnswered && !preview.alreadyAccepted && next.startsWith('/grounds/')
  useEffect(() => {
    if (preview && (opensStraightOnTheQuestion(preview.scenario) || straightToTheReport) && accept.isIdle) {
      accept.mutate()
    }
  }, [preview, accept, straightToTheReport])

  /**
   * B-205: SOMEBODY ALREADY SIGNED IN AS THE VERY PERSON THIS INVITATION IS FOR.
   *
   * The old "You've already joined" screen offered "Sign in to continue" to Tobi even while he was
   * signed in as himself - asking somebody to sign in again, on the account they are already using,
   * is never a sentence a person should read. When this browser is signed in as the invited address,
   * there is nothing left to ask: the same "accept" call that "Pick up where I left off" makes is
   * fired here on its own, and the server's own `resumed` branch (participants.service.ts, matching
   * `returningUserId` to the participant's `userId`) carries them straight into the check-in.
   */
  const signedInAsInvitee = !!preview && signedIn && !!signedInEmail && !!preview.email
    && signedInEmail.trim().toLowerCase() === preview.email.trim().toLowerCase()
  useEffect(() => {
    if (preview?.alreadyAccepted && signedInAsInvitee && accept.isIdle) {
      accept.mutate()
    }
  }, [preview, signedInAsInvitee, accept])

  /**
   * FAULT 3 (SCREENS, INVITE PAGE): PREFILL FIRST AND LAST NAME FROM WHAT THE LEAD ALREADY GAVE.
   *
   * The lead's people step now asks for a name beside each email (section 13), served back here
   * as `preview.nameGiven` ("Musa Bello") - but these two fields stayed empty, asking the invited
   * person to retype a name their own lead had just given. It only fills what the server already
   * sends, split on the first space, and is still editable either way. This applies to every
   * situation, not only the anchor, since every invite can carry a name now.
   */
  useEffect(() => {
    const given = preview?.nameGiven?.trim()
    if (!given || firstName || lastName) return
    const [first, ...rest] = given.split(' ')
    setFirstName(first)
    setLastName(rest.join(' '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.nameGiven])



  /**
   * A fresh way in has been emailed, because this is not the browser they joined
   * on. Not an error, and not a dead end - just one more click, landing in the
   * inbox that was actually invited.
   */
  if (emailedTo) {
    return (
      <Page narrow>
        <Mark />
        <PageTitle title="Check your email" />
        <p className="gwui-callout">
          {/*
           * WHICH LINK TO USE FROM HERE, SAID PLAINLY. Hafsah, 22 Sep 2026: "someone got a sign-in link and
           * a check-in link but their check-in link stopped working." It had not stopped: opened where they
           * had no session - a different app's browser, a new phone - it does exactly this, every time, and
           * from their side that is a link that no longer works. So this says what the check-in link now
           * does, which link takes them in, how long it lasts, and offers it again.
           */}
          {/*
            B-205: "THIS DEVICE OR BROWSER IS NOT SIGNED IN" IS NOT ALWAYS TRUE. Grace, signed in as
            herself, pressed "Pick up where I left off" on Tobi's own invitation and read that this
            browser was signed out - it was not, it was signed in as her. The only thing that is
            always true here, signed in or not, as the right person or the wrong one, is that this
            link does not open that check-in in this browser.
          */}
          This link does not open that check-in in this browser. We have sent a sign-in link to{' '}
          <strong>{emailedTo}</strong>. Open that one. It takes you straight to your check-in, and it
          works for 24 hours. After that, the check-in link works on this device too.
        </p>
        <Button kind="secondary" size="big" wide disabled={accept.isPending} onClick={() => accept.mutate()}>
          {accept.isPending ? 'Sending…' : 'Send it again'}
        </Button>
      </Page>
    )
  }

  if (preview && (opensStraightOnTheQuestion(preview.scenario) || straightToTheReport) && !failed && !emailedTo && (accept.isPending || accept.isIdle || accept.isSuccess)) {
    return (
      <Page narrow>
        <Mark />
        <OneLineStatus>{straightToTheReport ? 'Opening your report…' : 'Opening your question…'}</OneLineStatus>
      </Page>
    )
  }

  if (preview?.alreadyAccepted && signedInAsInvitee && !failed && (accept.isPending || accept.isIdle || accept.isSuccess)) {
    return (
      <Page narrow>
        <Mark />
        <OneLineStatus>Opening your check-in…</OneLineStatus>
      </Page>
    )
  }

  {/* WALKTHROUGH PASS 2, ITEM 4: "TOKEN" IS NOT A WORD A PERSON READS. "This invite link is missing
      its token." described the bug in the engineer's own terms; the plain fact is that the link is
      not complete, and the way through it is the same as any other broken link: open it again from
      the email, or sign in. */}
  if (!token) return <Page narrow><Mark /><LinkProblem kind="invite" detail="This invitation link is not complete. Open the link from your email again." /></Page>
  if (isLoading) return <Page narrow><Mark /><OneLineStatus>Loading your invitation…</OneLineStatus></Page>
  if (expired) return <InvitationExpired token={token} leadFirstName={expired.leadFirstName} />
  if (held) { const card = heldForASeatCard(held.saying); return <Page narrow><Mark /><PageTitle title={card.heading} subtitle={card.sub} /></Page> }
  if (isError || !preview) return (
    <Page narrow>
      <Mark />
      {/*
        REVIEW ROUND 3: "SIGN IN WITH YOUR EMAIL" TOLD A SIGNED-IN PERSON TO SIGN IN. Someone already
        signed in who opens a broken link has no account question left to answer - signing in is not
        a thing they still need to do, so the sentence that told them to was never true for them. Only
        the signed-out form of the advice ever fit both readers; signed in, the only thing left to say
        is that the link itself is gone.
      */}
      <LinkProblem
        kind="invite"
        detail={signedIn
          ? 'We do not recognise this link. Ask the person who added you for a new invitation.'
          : 'We do not recognise this link. If you have already joined, sign in with your email. If you have not, ask the person who added you for a new invitation.'}
      />
    </Page>
  )

  const opensLater = preview.opensOn && new Date(preview.opensOn).getTime() > Date.now() ? preview.opensOn : null
  /**
   * THE SCENARIO'S OWN WORDS, SERVED LIKE ANY SCENARIO'S (decision 114; docs/answers-from-engine.md,
   * "8 October (later): the anchor through the ordinary routes, route by route"). `invitationWords`
   * is the ordinary field for this - present for a scenario that has its own words (today only the
   * anchor's, with the switch on) and absent for the rest - read first; `anchorInvitation` is kept
   * underneath it only until the server has moved every caller onto the new field.
   */
  const theInvitationWords = preview.invitationWords ?? preview.anchorInvitation

  if (preview.alreadyAccepted) {
    /*
     * B-205 (review round 2): SOMEBODY SIGNED IN AS A DIFFERENT PERSON IS TOLD SO, NOT ASKED TO
     * SIGN IN.
     *
     * By the time this branch can be reached, `signedInAsInvitee` has already been handled above
     * (its own effect fires `accept.mutate()` and the "Opening your check-in…" status covers it),
     * so a browser signed in here is signed in as somebody OTHER than the invited address - Grace,
     * on Tobi's own invitation. The old "Pick up where I left off" button called `accept.mutate()`
     * regardless, which the server answered correctly (it never signs Grace into Tobi's account),
     * but it did so by emailing TOBI a sign-in link FROM GRACE'S BROWSER, with nothing on screen
     * ever telling Grace that is what her own click had just done. Said here instead, in the one
     * sentence that is true of it: whose invitation this is, and who is signed in right now - with
     * nothing to press that would act on somebody else's invitation from this account, and a way
     * out that does not require guessing a password: "Go to Today", or sign out.
     */
    if (signedIn) {
      return (
        <Page narrow>
          <Mark />
          <PageTitle
            title="This invitation is for someone else"
            subtitle={`This invitation is for ${preview.email}. You are signed in as ${signedInName || signedInEmail}.`}
          />
          <Stack gap={10}>
            <Button size="big" wide onClick={() => navigate('/today')}>Go to Today</Button>
            <Button kind="quiet" wide to="/signout">Sign out</Button>
          </Stack>
        </Page>
      )
    }
    /*
     * B-205: "alreadyAccepted" MEANS "THIS ADDRESS ALREADY HAS AN ACCOUNT", NOT "THIS INVITATION WAS
     * OPENED BEFORE". Tobi, invited to "Sales team, Q4" while already holding an account from Msingi
     * (a-guest-is-a-guest-from-the-moment-they-are-added.ts links a matching email the moment they are
     * added, before they ever click anything), read "You've already joined. Pick up your check-in" -
     * false, he had never opened this invitation. The server cannot tell the two apart from one flag,
     * so the wording here says only what is true either way: he has an account, and signing in to it
     * picks up this check-in, whichever of the two is actually the case. Noted for the engine
     * (docs/requests-to-engine.md): a `hasOpenedThisInvite` of its own would let this say "already
     * joined" only when that is actually true.
     *
     * B-205 (review round 2): THE BUTTON NAMES WHAT IT ACTUALLY DOES. Signed out, this browser has
     * no session for the server to "pick up" - Tobi has never opened this invitation before, so
     * "Pick up where I left off" promises a continuation that never happened. What the button
     * reliably does, for a signed-out browser, is ask the server for a way in, which the server then
     * emails to the invited address.
     */
    return (
      <Page narrow>
        <Mark />
        <PageTitle
          title="You already have an account"
          subtitle={`Sign in to pick up this check-in, “${preview.groundLabel}”.`}
        />
        <Stack gap={10}>
          <Button size="big" wide disabled={accept.isPending} onClick={() => accept.mutate()}>
            {accept.isPending ? 'One moment…' : 'Email me a sign-in link'}
          </Button>
          {/* Kept for whoever would rather sign in with a password they already have than wait for
              an email - unchanged by B-205 round 2, which only renamed the button above.

              B-205 (review round 3): SIGNING IN LOST THE CHECK-IN. This sent Tobi to plain /auth,
              with nowhere to come back to, so finishing sign-in landed him on Today rather than
              back on this invitation. The same `next` AuthPage already honours for every other
              signed-out door carries this invitation's own address back to it - and this page
              itself, opened signed in as the invitee, already resumes the check-in on its own (see
              `signedInAsInvitee` above). */}
          <Button kind="secondary" size="big" wide onClick={() => navigate(`/auth?next=${encodeURIComponent(`/invite?token=${token}`)}`)}>Sign in to continue</Button>
        </Stack>
      </Page>
    )
  }

  return (
    <Page narrow>
      {/*
        THE INVITATION, AS THE PROTOTYPE HAS IT (A3, join-invite.txt, U.3; rebuilt from
        components/gw/ui in U.20), WITH HAFSAH'S ANSWER OF 29 SEPTEMBER ON ITEM 11 (CONFLICT A).

        The prototype's first line is kept. Its two held sentences, "Nobody else reads your
        answers." and "Wairimu reads the report, not your words.", are dropped for good - they are
        not true, once admins and colleagues in the same check-in can read it. In their place, the
        line below is built from this check-in's own scenario, so it is always true of what the
        server actually does: the admins sentence is left out for a performance plan, a promotion or
        a renewal (`isEvaluationScenario`, in `scenario-catalog.ts`), and left out too when the
        scenario is not known, which is the more private reading. This is a client-side stand-in for
        a field the engine does not send yet (request 78); once it does, this should read that field
        instead of guessing from the scenario. "Your number" is shown only when the record holds
        this person's share of a target, which the invitation does not carry yet.
      */}
      <Mark />
      {/*
        THE PROTOTYPE'S GAPS (Hafsah, pictured at 1440px, U.20 sixth round, corrected in the eighth
        round). Page's flat 30px stack is wrong for this screen. Nested Stacks carry the
        prototype's own numbers instead - the title's line sits flush against the tinted box under
        it, 0px; the tinted box to the facts panel 19; panel to the button 18; the button to the
        note under it 10 - so PageTitle down to "About two minutes…" is one chain, each link its
        own gap, and nothing here sets an inline margin, padding or gap again.
      */}
      <Stack gap={0}>
        <PageTitle title={theInvitationWords?.heading ?? theInvitation(preview)} subtitle={(preview.organisationName || preview.endsAt) ? whereAndUntil(preview) : undefined} />

        <Stack gap={19}>
          <Callout>{whoCanReadThis(preview.scenario, preview.organisationName)}</Callout>

          {/*
            A SCENARIO'S OWN INVITATION WORDS (piece 11; docs/anchor-scenario-plan.md section 5 row
            5; docs/answers-from-engine.md, "Request 149 (3 of 6)", and decision 114's "8 October
            (later)" note). Drawn only when `theInvitationWords` is present - today only an anchor
            invitation, with the switch on; every other invitation is exactly as it reads today. The
            callout above (what the prototype always says about who can read this) is kept, unchanged,
            ahead of these lines.
          */}
          {theInvitationWords && (
            <Stack gap={10}>
              {theInvitationWords.lines.map((line, i) => (
                <p key={i} className="gwui-panel-text">{line}</p>
              ))}
            </Stack>
          )}

          {/* U.6 review: no "Your part in this". The server no longer sends it, because what it held
              was the lead's sentence about this person. See the-leads-words-about-someone.ts. */}

          <Stack gap={18}>
            <Panel>
              <div className="gwui-subheading-list">
                {preview.schedule && (
                  <div>
                    <SubHeading>What it asks</SubHeading>
                    <p className="gwui-panel-text">{preview.schedule}</p>
                  </div>
                )}
                <div>
                  <SubHeading>Who sees your answers</SubHeading>
                  <p className="gwui-panel-text">
                    You see your own report straight away. {preview.leadFirstName ?? 'The person who runs it'} shares a team report
                    with everyone in it.
                  </p>
                </div>
                {/* "Your number" (U.20 ninth round): shown only when the server says WHO would see
                    this person's own share of a target, through the engine's own visibility rule
                    (targetsFor, participants.service.ts's preview) - never the number itself, since
                    this page is read with the link's token, before any sign-in. */}
                {preview.yourNumberIsSeenBy && (
                  <div>
                    <SubHeading>Your number</SubHeading>
                    <p className="gwui-panel-text">
                      {preview.yourNumberIsSeenBy === 'everybody'
                        ? 'Everybody in this check-in sees every number, including yours.'
                        : `Only you and ${preview.leadFirstName ?? 'the person who runs it'} see your share of the target.`}
                    </p>
                  </div>
                )}
              </div>
            </Panel>

            {/*
              U.6 review: a check-in that opens later is not answered today. Its first check-in's day
              is said, here, before the button rather than under "What happens to what you write", and
              nothing offers to answer now.
            */}
            {opensLater && (
              <p role="status" className="gwui-callout">
                {/* B-147 follow-up: the prototype's own exact phrase (B1-starting-a-check-in/
                    new.txt, "the first check-in opens tomorrow at 4pm") says "check-in" here, not
                    "session" - left as the prototype has it rather than swept into the rename. */}
                {`Your first check-in opens on ${theDayOf(opensLater)}.`}
              </p>
            )}

            {!opensLater && (
              <Stack gap={10}>
                <form onSubmit={(e) => { e.preventDefault(); setFailed(''); if (!accept.isPending) accept.mutate() }}>
                  <Stack gap={10}>
                    {failed && <Note tone="error">{failed}</Note>}
                    <div className="gwui-field-pair">
                      <FieldLabel htmlFor="invite-first">
                        First name
                        <TextField id="invite-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
                      </FieldLabel>
                      <FieldLabel htmlFor="invite-last">
                        Last name
                        <TextField id="invite-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
                      </FieldLabel>
                    </div>
                    <PhoneNumberField id="invite-phone" value={phone} onChange={setPhone} whose="yours" whatsappOn={whatsappOn} />
                  </Stack>
                  <p className="gwui-field-help">Your name is optional. If you add it, the others will see it on the shared report.</p>
                  {/* Whether they go straight in or wait for an admin, as the invitation said it (Hafsah, 12 October). */}
                  {preview?.whatHappensWhenYouJoin && <p className="gwui-field-help">{preview.whatHappensWhenYouJoin}</p>}
                  <div className="gwui-form-actions">
                    <Button type="submit" size="big" wide disabled={accept.isPending} >
                      {accept.isPending ? 'Setting up your session…' : theInvitationWords?.button ?? 'Answer today’s check-in now'}
                    </Button>
                  </div>
                </form>

                <p className="gwui-fine" style={{ textAlign: 'center' }}>
                  {/* "You choose how you sign in afterwards" only to someone not signed in (U.6 review). Whether an
                      address has an account is never revealed, so being signed in is what this can know. */}
                  {/* How long it takes is the server's one measured figure (when-it-asks.ts). The target's "You make your account afterwards" says "account", which is never said; the sign-in sentence it replaced stays. */}
                  {signedIn ? (preview.takes ? `${preview.takes}.` : '') : `${preview.takes ? `${preview.takes}. ` : ''}You choose how you sign in afterwards.`}
                </p>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Stack>

      {/*
          THE PRIVACY BRIEFING - REACHABLE, NOT IN THE PAGE'S FLOW (Hafsah, pictured at 1440px
          against join-invite.jpg: the always-open section made the page twice the prototype's
          length, and the prototype has no such section at all). It used to arrive on the NEXT
          screen, after "Add my version" - a disclosure shown after the decision it is meant to
          inform - so it still has to be reachable from here, just not printed in full every time.
          One plain link under the button's line opens the same four claims, unchanged, in the
          shared Modal. Accepting from this page still stamps the acknowledgement (accept.onSuccess),
          so the chat opens straight onto the first question instead of repeating this back at them.
      */}
      <p style={{ textAlign: 'center' }}>
        <Button kind="quiet" onClick={() => setShowWhatHappens(true)}>What happens to what you write</Button>
      </p>
      {showWhatHappens && (
        <Modal title="What happens to what you write" onClose={() => setShowWhatHappens(false)}>
          <h2 className="gwui-empty-panel-title">What happens to what you write</h2>
          {/* The fourth heading used to be styled differently from the other three (plain, muted
              text rather than a heading) - Hafsah's first review. All four are SubHeading now. */}
          <div className="gwui-subheading-list">
            {/*
              REPLACES THE OLD "NOBODY YOU WORK WITH READS IT" PANEL (Hafsah, 29 September, item 11,
              conflict A): it told a participant that no manager and no admin ever saw their words,
              which decision 1 in CLAUDE.md's privacy rules makes untrue for every check-in. This
              says instead what is actually true of THIS check-in, built the same way as the
              callout above (`whoCanReadThis`), so the two can never disagree.
            */}
            <div>
              <SubHeading>Who can read what you write</SubHeading>
              <p className="gwui-note">{whoCanReadThis(preview.scenario, preview.organisationName)}</p>
            </div>
            <div>
              <SubHeading>We cannot show it to ourselves either</SubHeading>
              <p className="gwui-note">When we look at a check-in to help with something, we can see whether people checked in and never what they said. That is enforced in the code and tested, not a policy we are asking you to trust.</p>
            </div>
            <div>
              <SubHeading>Nothing here trains a model</SubHeading>
              <p className="gwui-note">What you say is used to build the shared picture and nothing else.</p>
            </div>
            <div>
              <SubHeading>And the part we are not going to dress up</SubHeading>
              <p className="gwui-note">Your answers are stored on our servers, and they are processed by Google's models to build the record. We are not going to tell you they are unreadable to any human being anywhere, because that would not be true yet.</p>
            </div>
          </div>
          <Button kind="secondary" onClick={() => setShowWhatHappens(false)}>Close</Button>
        </Modal>
      )}

      {/* "By joining, you agree that your contribution record belongs to you." is gone (U.3 review): it
          is not on the prototype, it is jargon, and nothing records it as a consent. */}

      <div className="gwui-foot-divider">
        <Note>
          You never have to take part. If you would rather not, you can close this page. Nothing is
          shared, and saying no is never held against you.
        </Note>
        {/* "/" for a signed-out invitee bounces to the marketing site - ejecting somebody from the product the
            moment they decline, right after a paragraph promising declining is never held against them. A
            settled state instead: nothing was shared, and they can come back. */}
        {declinedQuietly ? (
          <p role="status" className="gwui-note">
            Nothing has been shared and nobody is told. This link keeps working if you change your mind.
          </p>
        ) : (
          <Button kind="quiet" onClick={() => setDeclinedQuietly(true)}>Not right now</Button>
        )}
      </div>
    </Page>
  )
}

/**
 * HELD FOR A SEAT, AS A SHORT HEADING AND ONE SENTENCE UNDER IT (Hafsah, pictured at 1440px).
 *
 * The server sends one fixed sentence for this (`HELD_FOR_A_SEAT`,
 * api/src/modules/participants/participants.service.ts) - it used to be the page's whole heading,
 * two sentences long. Split here into the prototype's own two-line pattern (a short heading, a
 * sentence under it), never on the server: if it ever sends anything else, this falls back to the
 * old shape - the whole sentence as the heading - rather than mangling text it does not recognise.
 */
export function heldForASeatCard(saying: string): { heading: string; sub?: string } {
  const KNOWN = 'This check-in cannot start for you yet, because there is no seat for you on the plan. You will get your invitation as soon as there is one.'
  if (saying === KNOWN) {
    return {
      heading: 'This check-in cannot start for you yet',
      sub: 'There is no seat for you on the plan yet. You will get your invitation as soon as there is one.',
    }
  }
  return { heading: saying }
}

/**
 * WHO CAN READ THIS CHECK-IN, BUILT FROM ITS OWN SETTINGS (Hafsah, 29 September, item 11,
 * conflict A). The prototype's first line, "The people in this check-in, including your manager,
 * can see what you say in it.", is always true - decision 1 in CLAUDE.md's privacy rules makes it
 * so for every check-in. The admins sentence is added only when it is true of THIS check-in: never
 * on a performance plan, a promotion or a renewal (decision 5, corrected 29 September to cover all
 * three the same way as a performance plan), and left out too when the scenario is not known,
 * which is the more private reading. `isEvaluationScenario` (`scenario-catalog.ts`) is a
 * client-side stand-in for a field the engine does not send yet (request 78); once it does, this
 * should read that field instead of guessing from the scenario.
 */
export function whoCanReadThis(scenario: GroundScenario | null | undefined, organisationName?: string | null): string {
  /*
   * B-205: "YOUR ORGANISATION" IS NOT TRUE FOR EVERYONE WHO READS IT. The preview is served before
   * anyone has signed in, so the server has no way yet to say whether the person opening this link
   * belongs to the organisation running the check-in or is a guest in it (an outsider added to
   * "Sales team, Q4" read it as if it were their own company). Naming the organisation instead of
   * calling it "yours" is true for both a colleague and a guest, without needing to tell them apart -
   * noted for the engine (docs/requests-to-engine.md) in case a field for that distinction is ever
   * worth adding. Left out entirely, as before, when there is no organisation name to put in its
   * place.
   */
  const admins = (!scenario || isEvaluationScenario(scenario) || !organisationName)
    ? ''
    : ` Admins at ${organisationName} can read every check-in.`
  return `The people in this check-in, including your manager, can see what you say in it.${admins} Your own report and your questions to ${askNameFor(organisationName)} stay private.`
}

/** "Akinyi invited you to the Deal progress check-in" (the approved journey, stage 6), with the check-in's own name. */
export function theInvitation(p: { leadFirstName?: string | null; initiatorName: string; groundLabel: string }): string {
  const who = (p.leadFirstName ?? '').trim() || p.initiatorName.trim() || 'Someone'
  const name = p.groundLabel.trim()
  return /\bcheck-?in$/i.test(name) ? `${who} invited you to the ${name.replace(/^the\s+/i, '')}` : `${who} invited you to the ${name} check-in`
}

/**
 * "This runs at Baridi Appliances until 30 September.", a full sentence of its own (U.3 review,
 * B-088): "Baridi Appliances, until 30 September." joined two pieces with a comma rather than
 * saying either one as a sentence. With only one of the two, it still reads as one: "A check-in at
 * Coamana." or "It runs until 30 September."
 *
 * B-088: NO TIMEZONE OF THIS SCREEN'S OWN CHOOSING. Forcing `'UTC'` here, while every other date on
 * the check-in itself (How long, on People and setup) reads in the viewer's own zone, is what made
 * the two disagree - "Msingi Foods, until 7 November." here, "9 October to 8 November" on the
 * check-in, same end date, two different renderings of it. `whenItWas` already reads the same way
 * everywhere once nothing overrides it; this screen should not be the one surface that does.
 */
export function whereAndUntil(p: { organisationName?: string | null; endsAt?: string | null; today?: Date }): string {
  const until = p.endsAt ? theLastDay(p.endsAt, p.today ?? new Date()) : null
  const org = (p.organisationName ?? '').trim()
  /* The approved journey's words (stage 6, Hafsah 1 November 2026), as join-invite.txt has them. */
  if (org && until) return `${org}, until ${until}.`
  if (org) return `A check-in at ${org}.`
  return `It runs until ${until}.`
}

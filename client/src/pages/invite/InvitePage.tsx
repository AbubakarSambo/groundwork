import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InvitationExpired } from './InvitationExpired'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { participantsApi } from '@/api'
import type { InvitePreview } from '@/api/participants'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { Page, Mark, PageTitle, Panel, Section, Callout, Note, Button, FieldLabel, TextField } from '@/components/gw/ui'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { toast } from 'sonner'
import { opensStraightOnTheQuestion, whereTheLinkGoes } from './the-link-opens-on-the-question'

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
 */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "Monday 5 October", on the date as stored (a start is a day, kept at midnight UTC). */
function theDayOf(iso: string): string {
  const d = new Date(iso)
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
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
  const qc = useQueryClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

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
        const checkInId = (res as any).checkInId as string | null
        const groundId = (res as any).groundId as string
        navigate(checkInId ? whereTheLinkGoes(checkInId, preview?.scenario) : `/grounds/${groundId}/p`, { replace: true })
        return
      }
      if ((res as any).emailed) {
        setEmailedTo((res as any).email as string)
        return
      }
      setAuth(res.user, res.accessToken)
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
          You have already joined this check-in, and this device or browser is not signed in, so the
          check-in link on its own cannot open it here. We have sent a sign-in link to{' '}
          <strong>{emailedTo}</strong>. Open that one: it takes you straight to your check-in and works
          for 24 hours. After that, the check-in link works on this device too.
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
        <p role="status" className="gwui-pt-sub" style={{ textAlign: 'center' }}>
          {straightToTheReport ? 'Opening your report…' : 'Opening your question…'}
        </p>
      </Page>
    )
  }

  if (!token) return <Page narrow><Mark /><LinkProblem kind="invite" detail="This invite link is missing its token." /></Page>
  if (isLoading) return <Page narrow><Mark /><p role="status" className="gwui-pt-sub">Loading your invitation…</p></Page>
  if (expired) return <InvitationExpired token={token} leadFirstName={expired.leadFirstName} />
  if (held) return <Page narrow><Mark /><PageTitle title={held.saying} /></Page>
  if (isError || !preview) return (
    <Page narrow>
      <Mark />
      <LinkProblem kind="invite" detail="We do not recognise this link. If you have already joined, sign in with your email - and if you have not, ask whoever added you to send a new invite." />
    </Page>
  )

  const opensLater = preview.opensOn && new Date(preview.opensOn).getTime() > Date.now() ? preview.opensOn : null

  if (preview.alreadyAccepted) {
    return (
      <Page narrow>
        <Mark />
        <PageTitle
          title="You've already joined"
          subtitle={`Pick up your check-in for ${preview.groundLabel}. If this is a new device we will email you a sign-in link.`}
        />
        <Button size="big" wide disabled={accept.isPending} onClick={() => accept.mutate()}>
          <span role="status">{accept.isPending ? 'One moment…' : 'Pick up where I left off'}</span>
        </Button>
        {/* Sign in instead: the secondary weight, because two identical primaries around an "or" is no choice. */}
        <Button kind="secondary" size="big" wide onClick={() => navigate('/auth')}>Sign in to continue</Button>
      </Page>
    )
  }

  return (
    <Page narrow>
      {/*
        THE INVITATION, AS THE PROTOTYPE HAS IT (A3, join-invite.txt, U.3; rebuilt from
        components/gw/ui in U.20).

        Two of its sentences are held while Hafsah decides, because they say the words are private
        and people in the check-in and admins can read them: "Nobody else reads your answers." and
        "Wairimu reads the report, not your words." Until then today's panel, "What happens to what
        you write", stays exactly as it was, just no longer folded away (below). "Your number" is
        shown only when the record holds this person's share of a target, which the invitation does
        not carry yet.
      */}
      <Mark caption="The invitation" />
      <PageTitle title={theInvitation(preview)} subtitle={(preview.organisationName || preview.endsAt) ? whereAndUntil(preview) : undefined} />

      <Callout>
        The people in this check-in, including your manager, can see what you say in it. Your questions to Ask
        Groundwork stay private.
      </Callout>

      {/* U.6 review: no "Your part in this". The server no longer sends it, because what it held
          was the lead's sentence about this person. See the-leads-words-about-someone.ts. */}

      <Panel>
        {preview.schedule && (
          <Section heading="What it asks">
            <p className="gwui-pt-sub">{preview.schedule}</p>
          </Section>
        )}
        <Section heading="Who sees your answers">
          <p className="gwui-pt-sub">
            You see your own report straight away. {preview.leadFirstName ?? 'The person who runs it'} shares a team report
            with everyone in it.
          </p>
        </Section>
      </Panel>

      {/*
          THE PRIVACY BRIEFING, MOVED HERE RATHER THAN SHOWN AFTER.

          An invited person used to meet FOUR screens between the email and their first
          answer: this page, then a full-page privacy explainer, then a "Start my check-in"
          button, then in some cases the ground page and a "Check in for session 1 of 2".
          Two consecutive full-page explainers, the second one arriving AFTER they had
          already committed by clicking "Add my version" - which is the wrong order for a
          disclosure, because the decision it informs has been made by then.

          So the disclosure sits with the decision. It is the same four claims, in the same
          words, including the one we do not dress up. Accepting from this page now stamps
          the acknowledgement (see accept.onSuccess), so the chat opens straight onto the
          first question instead of repeating this back at them.

          NO LONGER A FOLDING PANEL (the invitation's rebuild, U.20): the prototype has no
          `<details>` anywhere on join-invite.jpg, so this is now a plain section, always
          there to read rather than hidden behind a click. The four claims are unchanged.
      */}
      {/*
        U.6 review: a check-in that opens later is not answered today. Its first check-in's day is
        said, here, above "What happens to what you write" rather than under it, and nothing offers
        to answer now.
      */}
      {opensLater && (
        <p role="status" className="gwui-callout">
          {`Your first check-in opens on ${theDayOf(opensLater)}.`}
        </p>
      )}

      <Section heading="What happens to what you write">
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <p className="gwui-field-row-label" style={{ marginBottom: 3 }}>Nobody you work with reads it</p>
            <p className="gwui-note">Not your manager, not whoever set this up, not an admin. What they see is the shared report, which is built by comparing what everyone said. Your own words about your own work can appear in it. Anything you say about somebody else never does, and it never says who said what about whom.</p>
          </div>
          <div>
            <p className="gwui-field-row-label" style={{ marginBottom: 3 }}>We cannot show it to ourselves either</p>
            <p className="gwui-note">When we look at a check-in to help with something, we can see whether people checked in and never what they said. That is enforced in the code and tested, not a policy we are asking you to trust.</p>
          </div>
          <div>
            <p className="gwui-field-row-label" style={{ marginBottom: 3 }}>Nothing here trains a model</p>
            <p className="gwui-note">What you say is used to build the shared picture and nothing else.</p>
          </div>
          <div>
            <p className="gwui-note" style={{ fontWeight: 700, marginBottom: 3 }}>And the part we are not going to dress up</p>
            <p className="gwui-note">Your answers are stored on our servers, and they are processed by Google's models to build the record. We are not going to tell you they are unreadable to any human being anywhere, because that would not be true yet.</p>
          </div>
        </div>
      </Section>

      {!opensLater && (
      <>
      <form onSubmit={(e) => { e.preventDefault(); setFailed(''); if (!accept.isPending) accept.mutate() }}>
        {failed && <div className="gw-er" role="alert" style={{ marginBottom: 10 }}>{failed}</div>}
        <Note>Your name is optional. If you add it, the others will see it on the shared report.</Note>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 8, marginBottom: 4 }}>
          <FieldLabel htmlFor="invite-first">
            First name
            <TextField id="invite-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
          </FieldLabel>
          <FieldLabel htmlFor="invite-last">
            Last name
            <TextField id="invite-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
          </FieldLabel>
        </div>
        <Button type="submit" size="big" wide disabled={accept.isPending} >
          <span role="status">{accept.isPending ? 'Setting up your session…' : 'Answer today’s check-in now'}</span>
        </Button>
      </form>

      <p className="gwui-pt-sub" style={{ textAlign: 'center' }}>
        {/* "You make your account afterwards" only to someone not signed in (U.6 review). Whether an
            address has an account is never revealed, so being signed in is what this can know. */}
        {signedIn ? 'About two minutes.' : 'About two minutes. You make your account afterwards.'}
      </p>
      </>
      )}

      {/* "By joining, you agree that your contribution record belongs to you." is gone (U.3 review): it
          is not on the prototype, it is jargon, and nothing records it as a consent. */}

      <div style={{ paddingTop: 14, borderTop: '1px solid var(--gw-border)', textAlign: 'center' }}>
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

/** "Wairimu invited you to the sales team's check-in", with the check-in's own name. */
export function theInvitation(p: { leadFirstName?: string | null; initiatorName: string; groundLabel: string }): string {
  const who = (p.leadFirstName ?? '').trim() || p.initiatorName.trim() || 'Someone'
  return `${who} invited you to “${p.groundLabel}”`
}

/**
 * "Baridi Appliances, until 30 September.", the prototype's line. With only one of the two it is a
 * full sentence of its own (U.3 review): "A check-in at Coamana." or "It runs until 30 September."
 */
export function whereAndUntil(p: { organisationName?: string | null; endsAt?: string | null }): string {
  const until = p.endsAt ? whenItWas(p.endsAt, 'dayAndMonthLong', 'UTC') : null
  const org = (p.organisationName ?? '').trim()
  if (org && until) return `${org}, until ${until}.`
  if (org) return `A check-in at ${org}.`
  return `It runs until ${until}.`
}

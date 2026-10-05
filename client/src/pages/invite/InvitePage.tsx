import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InvitationExpired } from './InvitationExpired'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { participantsApi } from '@/api'
import type { InvitePreview } from '@/api/participants'
import type { GroundScenario } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { Page, Mark, PageTitle, Panel, SubHeading, Callout, Note, Button, FieldLabel, TextField, Modal, Stack } from '@/components/gw/ui'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { toast } from 'sonner'
import { opensStraightOnTheQuestion, whereTheLinkGoes } from './the-link-opens-on-the-question'
import { isEvaluationScenario } from '@/lib/scenario-catalog'

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
        <p role="status" className="gwui-pt-sub" style={{ textAlign: 'center' }}>
          {straightToTheReport ? 'Opening your report…' : 'Opening your question…'}
        </p>
      </Page>
    )
  }

  {/* WALKTHROUGH PASS 2, ITEM 4: "TOKEN" IS NOT A WORD A PERSON READS. "This invite link is missing
      its token." described the bug in the engineer's own terms; the plain fact is that the link is
      not complete, and the way through it is the same as any other broken link: open it again from
      the email, or sign in. */}
  if (!token) return <Page narrow><Mark /><LinkProblem kind="invite" detail="This invitation link is not complete. Open the link from your email again." /></Page>
  if (isLoading) return <Page narrow><Mark /><p role="status" className="gwui-pt-sub">Loading your invitation…</p></Page>
  if (expired) return <InvitationExpired token={token} leadFirstName={expired.leadFirstName} />
  if (held) { const card = heldForASeatCard(held.saying); return <Page narrow><Mark /><PageTitle title={card.heading} subtitle={card.sub} /></Page> }
  if (isError || !preview) return (
    <Page narrow>
      <Mark />
      <LinkProblem kind="invite" detail="We do not recognise this link. If you have already joined, sign in with your email. If you have not, ask the person who added you for a new invitation." />
    </Page>
  )

  const opensLater = preview.opensOn && new Date(preview.opensOn).getTime() > Date.now() ? preview.opensOn : null

  if (preview.alreadyAccepted) {
    return (
      <Page narrow>
        <Mark />
        <PageTitle
          title="You’ve already joined"
          subtitle={`Pick up your check-in, “${preview.groundLabel}”. If this is a new device, we will email you a sign-in link.`}
        />
        <Stack gap={10}>
          <Button size="big" wide disabled={accept.isPending} onClick={() => accept.mutate()}>
            {accept.isPending ? 'One moment…' : 'Pick up where I left off'}
          </Button>
          {/* Sign in instead: the secondary weight, because two identical primaries around an "or" is no choice. */}
          <Button kind="secondary" size="big" wide onClick={() => navigate('/auth')}>Sign in to continue</Button>
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
        <PageTitle title={preview.anchorInvitation?.heading ?? theInvitation(preview)} subtitle={(preview.organisationName || preview.endsAt) ? whereAndUntil(preview) : undefined} />

        <Stack gap={19}>
          <Callout>{whoCanReadThis(preview.scenario)}</Callout>

          {/*
            ANCHOR PIECE 11, THE INVITATION (docs/anchor-scenario-plan.md section 5 row 5;
            docs/answers-from-engine.md, "Request 149 (3 of 6)"). Served now, only for an
            invitation to an anchor Ground - drawn only when `anchorInvitation` is present; every
            other invitation is exactly as it reads today. The callout above (what the prototype
            always says about who can read this) is kept, unchanged, ahead of these lines.
          */}
          {preview.anchorInvitation && (
            <Stack gap={10}>
              {preview.anchorInvitation.lines.map((line, i) => (
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
                  </Stack>
                  <p className="gwui-field-help">Your name is optional. If you add it, the others will see it on the shared report.</p>
                  <div className="gwui-form-actions">
                    <Button type="submit" size="big" wide disabled={accept.isPending} >
                      {accept.isPending ? 'Setting up your session…' : preview.anchorInvitation?.button ?? 'Answer today’s check-in now'}
                    </Button>
                  </div>
                </form>

                <p className="gwui-fine" style={{ textAlign: 'center' }}>
                  {/* "You make your account afterwards" only to someone not signed in (U.6 review). Whether an
                      address has an account is never revealed, so being signed in is what this can know. */}
                  {signedIn ? 'About two minutes.' : 'About two minutes. You make your account afterwards.'}
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
              <p className="gwui-note">{whoCanReadThis(preview.scenario)}</p>
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
export function whoCanReadThis(scenario: GroundScenario | null | undefined): string {
  const admins = !scenario || isEvaluationScenario(scenario)
    ? ''
    : ' Admins in your organisation can read every check-in.'
  return `The people in this check-in, including your manager, can see what you say in it.${admins} Your own report and your questions to Ask Groundwork stay private.`
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

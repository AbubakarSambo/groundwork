import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InvitationExpired } from './InvitationExpired'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { participantsApi } from '@/api'
import type { InvitePreview } from '@/api/participants'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { Arrival } from '@/components/gw/Arrival'
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
 */
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
  const preview: InvitePreview | undefined = answer && answer.expired !== true ? answer : undefined

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
      <InviteShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Check your email</div>
          {/*
           * WHICH LINK TO USE FROM HERE, SAID PLAINLY. Hafsah, 22 Sep 2026: "someone got a sign-in link and
           * a check-in link but their check-in link stopped working." It had not stopped: opened where they
           * had no session - a different app's browser, a new phone - it does exactly this, every time, and
           * from their side that is a link that no longer works. So this says what the check-in link now
           * does, which link takes them in, how long it lasts, and offers it again.
           */}
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            You have already joined this check-in, and this device or browser is not signed in, so the
            check-in link on its own cannot open it here. We have sent a sign-in link to{' '}
            <strong>{emailedTo}</strong>. Open that one: it takes you straight to your check-in and works
            for 24 hours. After that, the check-in link works on this device too.
          </div>
          <button
            className="gw-btn"
            style={{ display: 'inline-block', width: 'auto', padding: '8px 16px', marginTop: 14, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-border)' }}
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
          >
            {accept.isPending ? 'Sending…' : 'Send it again'}
          </button>
        </div>
      </InviteShell>
    )
  }

  if (preview && (opensStraightOnTheQuestion(preview.scenario) || straightToTheReport) && !failed && !emailedTo && (accept.isPending || accept.isIdle || accept.isSuccess)) {
    return (
      <InviteShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{straightToTheReport ? 'Opening your report' : 'Opening your question'}</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>One moment.</div>
        </div>
      </InviteShell>
    )
  }

  if (!token) return <InviteShell><ErrorCard msg="This invite link is missing its token." /></InviteShell>
  if (isLoading) return <InviteShell><LoadingCard /></InviteShell>
  if (expired) return <InvitationExpired token={token} leadFirstName={expired.leadFirstName} />
  if (isError || !preview) return (
    <InviteShell>
      <ErrorCard msg="We do not recognise this link. If you have already joined, sign in with your email - and if you have not, ask whoever added you to send a new invite." />
    </InviteShell>
  )

  if (preview.alreadyAccepted) {
    return (
      <InviteShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>You've already joined</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20 }}>
            Pick up your check-in for <strong>{preview.groundLabel}</strong>. If this is a new device we
            will email you a sign-in link.
          </div>
          <button
            className="gw-btn"
            style={{ display: 'inline-block', width: 'auto', padding: '10px 20px', marginBottom: 10 }}
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
          >
            <span role="status">{accept.isPending ? 'One moment…' : 'Pick up where I left off →'}</span>
          </button>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>or</div>
          {/* /auth, not a protected route that bounces; and the secondary weight, because two identical primaries around an "or" is no choice. */}
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px', background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-border)' }} onClick={() => navigate('/auth')}>
            Sign in to continue →
          </button>
        </div>
      </InviteShell>
    )
  }

  return (
    <Arrival wide>
      <div>
        {/*
          THE INVITATION, AS THE PROTOTYPE HAS IT (A3, join-invite.txt, U.3).

          Two of its sentences are held while Hafsah decides, because they say the words are private
          and people in the check-in and admins can read them: "Nobody else reads your answers." and
          "Wairimu reads the report, not your words." Until then today's panel, "What happens to what
          you write", stays exactly as it was, below. "Your number" is shown only when the record holds
          this person's share of a target, which the invitation does not carry yet.
        */}
        <h1 className="gw-ttl">{theInvitation(preview)}</h1>
        {(preview.organisationName || preview.endsAt) && (
          <div className="gw-sub-t">{whereAndUntil(preview)}</div>
        )}

        <div className="gw-box gw-box-blue" style={{ margin: '12px 0 16px' }}>
          The people in this check-in, including your manager, can see what you say in it. Your questions to Ask
          Groundwork stay private.
        </div>

        {preview.roleAsDescribed && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12 }}>
            {/* Attributed, because somebody else wrote it about them. */}
            Your part in this: <strong>{preview.roleAsDescribed}</strong>
          </div>
        )}

        <div className="gw-invite-facts">
          {preview.schedule && (
            <div>
              <h2>What it asks</h2>
              <p>{preview.schedule}</p>
            </div>
          )}
          <div>
            <h2>Who sees your answers</h2>
            <p>
              You see your own report straight away. {preview.leadFirstName ?? 'The person who runs it'} shares a team report
              with everyone in it.
            </p>
          </div>
        </div>

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
        */}
        <details style={{ marginBottom: 16, border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', padding: '12px 16px' }}>
          <summary style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', cursor: 'pointer' }}>
            What happens to what you write
          </summary>
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>Nobody you work with reads it</div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>Not your manager, not whoever set this up, not an admin. What they see is the shared report, which is built by comparing what everyone said. Your own words about your own work can appear in it. Anything you say about somebody else never does, and it never says who said what about whom.</p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>We cannot show it to ourselves either</div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>When we look at a check-in to help with something, we can see whether people checked in and never what they said. That is enforced in the code and tested, not a policy we are asking you to trust.</p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>Nothing here trains a model</div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>What you say is used to build the shared picture and nothing else.</p>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-sub)', marginBottom: 3 }}>And the part we are not going to dress up</div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>Your answers are stored on our servers, and they are processed by Google's models to build the record. We are not going to tell you they are unreadable to any human being anywhere, because that would not be true yet.</p>
            </div>
          </div>
        </details>

        <form onSubmit={(e) => { e.preventDefault(); setFailed(''); if (!accept.isPending) accept.mutate() }}>
          {failed && <div className="gw-er" role="alert" style={{ marginBottom: 10 }}>{failed}</div>}
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Your name is optional - the others will see it on the shared report if you add it.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 4 }}>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label" htmlFor="invite-first">First name</label>
              <input id="invite-first" className="gw-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label" htmlFor="invite-last">Last name</label>
              <input id="invite-last" className="gw-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <button className="gw-btn" type="submit" disabled={accept.isPending} style={{ marginTop: 12, opacity: accept.isPending ? 0.7 : 1 }}>
            <span role="status">{accept.isPending ? 'Setting up your session…' : 'Answer today’s check-in now'}</span>
          </button>
        </form>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', lineHeight: 1.6 }}>
          About two minutes. You make your account afterwards.
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center' }}>
          By joining, you agree that your contribution record belongs to you.
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--gw-border)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.6 }}>
            You are never obligated to take part. If you would rather not, you can simply close this -
            nothing is shared, and declining is never shown as a negative.
          </div>
          {/* "/" for a signed-out invitee bounces to the marketing site - ejecting somebody from the product the
              moment they decline, right after a paragraph promising declining is never held against them. A
              settled state instead: nothing was shared, and they can come back. */}
          {declinedQuietly ? (
            <div role="status" style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              Nothing has been shared and nobody is told. This link keeps working if you change your mind.
            </div>
          ) : (
            <button
              className="gw-back"
              style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}
              onClick={() => setDeclinedQuietly(true)}
            >
              Not right now
            </button>
          )}
        </div>
      </div>
    </Arrival>
  )
}

/** The loading and error states, in the same chrome as the page they are standing in for. Stage 4. */
function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <Arrival>
      <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '32px 28px' }}>
        {children}
      </div>
    </Arrival>
  )
}

/**
 * Was a dead end: a red tick, one sentence, nothing to press. W8-62.
 * `msg` is kept because the caller distinguishes a missing token from a failed
 * preview, but the way out is now the same in both.
 */
function ErrorCard({ msg }: { msg: string }) {
  return <LinkProblem kind="invite" detail={msg} />
}

function LoadingCard() {
  return (
    <div role="status" style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Loading invite…</div>
  )
}

/** "Wairimu invited you to the sales team's check-in", with the check-in's own name. */
export function theInvitation(p: { leadFirstName?: string | null; initiatorName: string; groundLabel: string }): string {
  const who = (p.leadFirstName ?? '').trim() || p.initiatorName.trim() || 'Someone'
  return `${who} invited you to “${p.groundLabel}”`
}

/** "Baridi Appliances, until 30 September." */
export function whereAndUntil(p: { organisationName?: string | null; endsAt?: string | null }): string {
  const until = p.endsAt ? whenItWas(p.endsAt, 'dayAndMonthLong', 'UTC') : null
  const org = (p.organisationName ?? '').trim()
  if (org && until) return `${org}, until ${until}.`
  if (org) return `${org}.`
  return `Until ${until}.`
}

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { participantsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Arrival } from '@/components/gw/Arrival'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { toast } from 'sonner'

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
  const navigate = useNavigate()
  /** Set when the server has emailed a fresh way in, instead of signing us in here. */
  const [emailedTo, setEmailedTo] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const qc = useQueryClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => participantsApi.preview(token),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => participantsApi.accept(token, { firstName: firstName || undefined, lastName: lastName || undefined }),
    onSuccess: (res) => {
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
      if ((res as any).resumed) {
        const checkInId = (res as any).checkInId as string | null
        const groundId = (res as any).groundId as string
        navigate(checkInId ? `/checkin/${checkInId}` : `/grounds/${groundId}/p`, { replace: true })
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
      // Seamless handoff: straight into their session-1 check-in on the
      // initiator's ground (the check-in row already exists - accept()
      // returns it, it never creates a second one). Fall back to the ground
      // page only if no open check-in was found.
      const checkInId = (res as any).checkInId as string | null
      const groundId = (res as any).groundId as string
      if (checkInId) {
        navigate(`/checkin/${checkInId}`, {
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
    onError: () => {
      toast.error('Could not start your session. Please try again.')
    },
  })

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
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            You have already joined this ground, and this is a new device or browser.
            We have sent a sign-in link to <strong>{emailedTo}</strong> so only you can pick up where you left off.
          </div>
        </div>
      </InviteShell>
    )
  }

  if (!token) return <InviteShell><ErrorCard msg="This invite link is missing its token." /></InviteShell>
  if (isLoading) return <InviteShell><LoadingCard /></InviteShell>
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
            {accept.isPending ? 'One moment…' : 'Pick up where I left off →'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>or</div>
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/grounds')}>
            Sign in to continue →
          </button>
        </div>
      </InviteShell>
    )
  }

  return (
    <Arrival wide>
      <div>
        <div className="gw-ttl">{preview.initiatorName} wants to hear your version</div>
        <div className="gw-sub-t">
          A Groundwork session about: <strong>{preview.groundLabel}</strong>.
        </div>

        {preview.roleAsDescribed && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12 }}>
            Your role as described: <strong>{preview.roleAsDescribed}</strong>
          </div>
        )}

        <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
          Nobody ever reads what you write - not {preview.initiatorName}, not anyone.{' '}
          The shared report shows <strong>where your account and theirs agree or differ</strong>. It does not quote you.
          Your account stays private. Always.
        </div>

        {/* YOU ARE IN THIS, NOT REPORTING ON SOMEBODY ELSE.
            Without saying so, an invitation to describe work involving another
            person reads as being asked to give evidence about them. That is the
            wrong idea of what this is and it changes what people write: they
            either soften everything or aim it at the person. Saying your own
            side is part of it, before anyone types anything, is the difference
            between a shared picture and a witness statement. */}
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16 }}>
          You'll be asked how the shared work is going, including your own side of it. This is not a
          form about somebody else.
        </div>

        {/* FOUR THINGS, ONE SCREEN. (G28, and G27's ordering rule)
            A participant gets a link in an email from somebody who did not
            explain it, and decides in about four seconds whether this is a thing
            that helps them or a thing being done to them. Everything above
            answers what it is and what happens to their words. This answers the
            three questions they actually have next, in the order they have them.

            PURPOSE BEFORE PERFORMANCE (G27): why you specifically comes first.
            Not what we want from you - what this is for and why your account
            changes it. Somebody who understands why they matter writes a
            different check-in from somebody complying with a request, and the
            ordering is the whole of the difference. */}
        <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>&rarr;</span>
            <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>
              <b>Why you.</b> You are close enough to this work to know things nobody else in it can see. Without your account, the picture is everybody else's.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>&rarr;</span>
            <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>
              <b>What it takes.</b> About ten minutes, in a chat, whenever suits you. It asks questions and you answer in your own words.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>&rarr;</span>
            <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>
              <b>What you get back.</b> The same report {preview.initiatorName} gets, at the same moment, plus a short private note meant only for you.
            </div>
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
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>Not your manager, not whoever set this up, not an admin. What they see is the shared report, which is built by comparing everyone's accounts. Your own words about your own work can appear in it. Anything you say about somebody else never does, and it never says who said what about whom.</p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>We cannot show it to ourselves either</div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>When we look at a ground to help with something, we can see whether people checked in and never what they said. That is enforced in the code and tested, not a policy we are asking you to trust.</p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 3 }}>Nothing here trains a model</div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>Your answers are used to build your ground's record and nothing else.</p>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-sub)', marginBottom: 3 }}>And the part we are not going to dress up</div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>Your answers are stored on our servers, and they are processed by Google's models to build the record. We are not going to tell you they are unreadable to any human being anywhere, because that would not be true yet.</p>
            </div>
          </div>
        </details>

        <form onSubmit={(e) => { e.preventDefault(); if (!accept.isPending) accept.mutate() }}>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Your name is optional - the other party will see it on the shared report if you add it.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 4 }}>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label">First name</label>
              <input className="gw-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="gw-fld" style={{ margin: 0 }}>
              <label className="gw-label">Last name</label>
              <input className="gw-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <button className="gw-btn" type="submit" disabled={accept.isPending} style={{ marginTop: 12, opacity: accept.isPending ? 0.7 : 1 }}>
            {accept.isPending ? 'Setting up your session…' : 'Add my version →'}
          </button>
        </form>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', lineHeight: 1.6 }}>
          This also sets up your account, so you can come back any time to add to
          your record - and see the shared report once everyone has checked in.
          We'll email you a link for returning later.
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center' }}>
          By joining, you agree that your contribution record belongs to you.
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--gw-border)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.6 }}>
            You are never obligated to take part. If you would rather not, you can simply close this -
            nothing is shared, and declining is never shown as a negative.
          </div>
          <button
            className="gw-back"
            style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}
            onClick={() => navigate('/')}
          >
            Not right now
          </button>
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
    <div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Loading invite…</div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'
import { useAuthStore } from '@/stores/auth'

const COMMIT_KEY = 'gw_commit_payload'
const SESSION_KEY = 'gw_entry_session'
const FRONTEND_URL = window.location.origin

// Verifying the token flips the auth state, which swaps the route into the
// authed shell and REMOUNTS this page - a genuinely fresh mount (new refs),
// which used to re-verify the now-used token and paint "Link invalid" over
// the success screen. Cache each token's outcome at module scope so remounts
// replay the outcome instead of re-verifying.
type VerifyOutcome =
  | { kind: 'success'; groundId: string; joinUrl: string | null; invited: string[]; failedInvites: string[] }
  | { kind: 'noSession' }
  | { kind: 'commitError' }
  | { kind: 'redirect'; to: string }
  | { kind: 'verifyError'; message: string }
// SINGLE-FLIGHT per token: the remount can happen while the first mount's
// verify+commit is still in flight, so caching only finished outcomes is not
// enough - both mounts must await the SAME promise.
const verifyFlows = new Map<string, Promise<VerifyOutcome>>()

function loadCommitPayload(): any | null {
  try {
    const raw = localStorage.getItem(COMMIT_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw)
    // History is stored separately in gw_entry_session for security.
    // Merge it in here at commit time.
    if (!payload.history?.length) {
      const sessionRaw = localStorage.getItem(SESSION_KEY)
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw)
        if (session?.history?.length) {
          payload.history = session.history
          if (!payload.scenario && session.scenario) payload.scenario = session.scenario
        }
      }
    }
    // The commit endpoint requires history as an array. The coordinator/lead
    // path legitimately has none (no session), so default to empty.
    if (!Array.isArray(payload.history)) payload.history = []
    return payload
  } catch { return null }
}

export function MagicVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')
  const [commitError, setCommitError] = useState(false)
  // Server said NO_ENTRY_SESSION: no draft and no local payload. Shown as an
  // explicit "we couldn't find your session" screen - never a silent /setup.
  const [noSession, setNoSession] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [failedInvites, setFailedInvites] = useState<string[]>([])
  const [invited, setInvited] = useState<string[]>([])
  const [nextGroundId, setNextGroundId] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)

  const lastAttempt = useRef<{ token: string; payload: any; user: { jobTitle?: string | null; role?: string } } | null>(null)

  function applyOutcome(outcome: VerifyOutcome) {
    if (outcome.kind === 'success') {
      setFailedInvites(outcome.failedInvites)
      setInvited(outcome.invited)
      setJoinUrl(outcome.joinUrl)
      setNextGroundId(outcome.groundId)
    } else if (outcome.kind === 'noSession') {
      setNoSession(true)
    } else if (outcome.kind === 'commitError') {
      setCommitError(true)
    } else if (outcome.kind === 'redirect') {
      navigate(outcome.to, { replace: true })
    } else if (outcome.kind === 'verifyError') {
      setError(outcome.message)
    }
  }

  /** The commit half of the flow, as an outcome (never throws). Safe to re-run:
   * the server-side draft persists and commit is idempotent. */
  async function commitFlow(payload: any, user: { jobTitle?: string | null; role?: string }, hadEntryIntent: boolean): Promise<VerifyOutcome> {
    try {
      const result = await entryApi.commit(payload)
      localStorage.removeItem(COMMIT_KEY)
      localStorage.removeItem('gw_entry_session')
      localStorage.removeItem('gw_draft_token')
      const invitedEmails = (result.contributors ?? []).map(c => c.email).filter(e => !result.failedInvites?.includes(e))
      return {
        kind: 'success',
        groundId: result.groundId,
        joinUrl: result.joinToken ? `${FRONTEND_URL}/join?t=${result.joinToken}` : null,
        invited: invitedEmails,
        failedInvites: result.failedInvites ?? [],
      }
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? ''
      if (msg.includes('NO_ENTRY_SESSION')) {
        // Nothing to commit anywhere. For someone who never ran the entry flow
        // this is a plain sign-in; for someone who DID (they have local
        // traces), it is the explicit lost-session state.
        if (hadEntryIntent) return { kind: 'noSession' }
        const isNew = !user.jobTitle && user.role === 'ADMIN'
        return { kind: 'redirect', to: isNew ? '/setup' : '/grounds' }
      }
      return { kind: 'commitError' }
    }
  }

  function verifyErrorMessage(err: any): string {
    const msg: string = err?.response?.data?.message ?? ''
    if (msg.toLowerCase().includes('expired')) {
      return 'This link has expired. Links are valid for 24 hours - please request a fresh one.'
    }
    if (msg.toLowerCase().includes('used') || msg.toLowerCase().includes('already')) {
      return 'This link has already been used. Please request a new one to sign in again.'
    }
    return 'This link is not valid. It may have been replaced by a newer one - use the most recent link from your inbox.'
  }

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError('Invalid link - no token found.'); return }

    // One flow per token, ever. Verifying flips the auth state, which swaps
    // the route into the authed shell and REMOUNTS this page mid-flight; the
    // remount (and any StrictMode double-invoke) joins the same in-flight
    // promise instead of re-verifying the now-used token - which used to
    // paint "Link invalid" over the success screen and double-fire the commit.
    let flow = verifyFlows.get(token)
    if (!flow) {
      const fromParam = params.get('from')
      flow = (async (): Promise<VerifyOutcome> => {
        let res: Awaited<ReturnType<typeof authApi.verifyEmail>>
        try {
          res = await authApi.verifyEmail(token)
        } catch (err: any) {
          return { kind: 'verifyError', message: verifyErrorMessage(err) }
        }
        setAuth(res.user, res.accessToken)
        if (fromParam && fromParam.startsWith('/')) {
          return { kind: 'redirect', to: fromParam }
        }
        // ALWAYS attempt the commit. The server merges whatever this browser
        // has over the server-side draft written at entry-save, so the commit
        // works even when this browser has nothing (magic link opened in a
        // different browser/device). Whether there is anything to commit is
        // the SERVER's decision now - the old client-side branch here silently
        // skipped the commit and stranded people on /setup.
        const payload = loadCommitPayload() ?? { groundLabel: '', history: [], contributors: [] }
        const hadEntryIntent = !!localStorage.getItem(COMMIT_KEY) || !!localStorage.getItem('gw_draft_token')
        lastAttempt.current = { token, payload, user: res.user }
        return commitFlow(payload, res.user, hadEntryIntent)
      })()
      verifyFlows.set(token, flow)
    }

    let mounted = true
    flow.then(outcome => {
      if (!mounted) return
      // A commitError is not cached as final: clear the flow so a remount or
      // "Try again" re-attempts (commit is idempotent server-side).
      if (outcome.kind === 'commitError') verifyFlows.delete(token)
      applyOutcome(outcome)
    })
    return () => { mounted = false }
  }, [])

  if (nextGroundId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', padding: '0 20px' }}>
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 12, padding: '20px 22px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#085041', marginBottom: 4 }}>Your ground is set up.</div>
            <div style={{ fontSize: 13, color: '#3A7A60', lineHeight: 1.6 }}>Your session is on record and your account is live.</div>
          </div>
          {joinUrl && (
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6560', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Share this link to invite participants</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#0A1628', background: '#F5F3EF', borderRadius: 6, padding: '8px 10px', wordBreak: 'break-all', marginBottom: 8 }}>{joinUrl}</div>
              <button
                onClick={() => { navigator.clipboard.writeText(joinUrl).catch(() => {}) }}
                style={{ fontSize: 11, fontWeight: 700, color: '#0A1628', background: 'none', border: '1px solid #C8C5C0', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Copy link
              </button>
            </div>
          )}
          {invited.length > 0 && (
            <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 6 }}>Invited ({invited.length}) ✓</div>
              <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.55, marginBottom: 6 }}>Each of these people has been emailed a private link to add their own account:</div>
              {invited.map(e => (
                <div key={e} style={{ fontSize: 12, color: '#085041', fontFamily: 'monospace' }}>{e}</div>
              ))}
              <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: '1px solid #B6E8D4' }}>
                Track who has checked in on your ground page - each person shows as invited, in progress, or completed, and you can send a reminder from there.
              </div>
            </div>
          )}
          {failedInvites.length > 0 && (
            <div style={{ background: '#FFF8EC', border: '1px solid #F5DFA0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7A5200', marginBottom: 6 }}>{invited.length === 0 ? 'None of your invites could be sent.' : 'Some invites did not send.'}</div>
              <div style={{ fontSize: 12, color: '#7A5200', lineHeight: 1.55, marginBottom: 8 }}>These addresses were not reached. You can resend from your ground page:</div>
              {failedInvites.map(e => (
                <div key={e} style={{ fontSize: 12, color: '#5A3A00', fontFamily: 'monospace' }}>{e}</div>
              ))}
            </div>
          )}
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 14 }}>What happens next</div>
            {[
              { n: '1', title: 'Contributors get their invite', body: 'Anyone you added will receive an email with a private link. They check in independently - they never see your account.' },
              { n: '2', title: 'Their account comes in', body: 'Once they submit, Groundwork builds a picture across accounts. Nobody reads anyone else\'s words directly. The report shows where accounts agree and where they differ.' },
              { n: '3', title: 'You release the report', body: 'When you are ready, you release the report to both parties at the same time. Neither sees it before the other.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gw-navy)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginBottom: 8 }}>
            Track their check-ins on your ground page:
          </div>
          <button
            onClick={() => navigate(`/grounds/${nextGroundId}`, { replace: true })}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Go to your ground →
          </button>
        </div>
      </div>
    )
  }

  if (noSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', padding: '0 20px' }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ background: '#FFF8EC', border: '1px solid #F5DFA0', borderRadius: 12, padding: '20px 22px', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#7A5200', marginBottom: 6 }}>We couldn't find your session on this device.</div>
            <div style={{ fontSize: 13, color: '#7A5200', lineHeight: 1.6 }}>
              Your account is active, but the session you saved isn't on this device and we don't have a copy of it.
              If you finished your session in a different browser or on another device, open this link there - your session is still saved on that device.
            </div>
          </div>
          <button className="gw-btn" style={{ marginBottom: 10 }} onClick={() => navigate('/grounds', { replace: true })}>
            Go to my grounds →
          </button>
          <button className="gw-btn" style={{ background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-border)' }} onClick={() => navigate('/start', { replace: true })}>
            Start a new ground
          </button>
        </div>
      </div>
    )
  }

  if (commitError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', padding: '0 20px' }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ background: '#FFF4F4', border: '1px solid #F5C6C6', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#8B1A1A', marginBottom: 6 }}>Your account is active, but the ground wasn't saved.</div>
            <div style={{ fontSize: 13, color: '#7A3030', lineHeight: 1.6 }}>Something went wrong saving your session. Your account is ready - go to your grounds page and start again from there.</div>
          </div>
          <button
            className="gw-btn"
            disabled={retrying}
            style={{ marginBottom: 10, opacity: retrying ? 0.6 : 1 }}
            onClick={async () => {
              if (!lastAttempt.current) return
              setRetrying(true)
              setCommitError(false)
              // Safe to retry: the draft persists server-side and commit is
              // idempotent (a replay returns the existing ground).
              applyOutcome(await commitFlow(lastAttempt.current.payload, lastAttempt.current.user, true))
              setRetrying(false)
            }}
          >
            {retrying ? 'Retrying...' : 'Try again'}
          </button>
          <button className="gw-btn" onClick={() => navigate('/grounds', { replace: true })}>
            Go to grounds →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)' }}>
      {!error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--gw-navy)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--gw-sub)' }}>Setting up your ground…</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', maxWidth: 340, padding: '0 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Link invalid</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20, lineHeight: 1.6 }}>{error}</div>
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/auth')}>
            Get a new link
          </button>
        </div>
      )}
    </div>
  )
}

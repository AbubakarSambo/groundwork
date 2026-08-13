import { useNavigate } from 'react-router-dom'
import { MARKETING_URL } from '@/lib/marketing'



/**
 * A LINK FROM AN EMAIL THAT DOES NOT WORK. W8-62.
 *
 * Her words: "We have deadend pages that trap you there." This is the worst of them,
 * and there were three, one per arrival route:
 *
 *  - `/join` rendered a red ✕, "Invalid link", one sentence, and **nothing to press**.
 *  - `/invite` rendered a red ✕, "Invalid invite", one sentence, and nothing to press.
 *  - `/verify-email` was the only one with a way out.
 *
 * This is the first thing somebody sees of the product, arriving from a link a
 * colleague sent them. Two thirds of the time it was a full stop.
 *
 * WHAT THE WAY OUT HONESTLY IS. Nobody can fix an expired invite themselves - the
 * token belongs to whoever created it, and there is no endpoint that reissues one to
 * an unauthenticated stranger, nor should there be. So this says the true thing (ask
 * the person who invited you) and offers the two doors that do work: sign in, if they
 * already have an account, and the product's own front page if they do not.
 *
 * WHY IT DOES NOT SAY WHICH TOKEN FAILED. "No token in the URL" and "this token has
 * expired" and "this token was already used" are the same instruction to the person
 * reading it, and telling an unauthenticated caller which of the three it was is a
 * small oracle about links they do not hold.
 */
export function LinkProblem({ kind, detail }: { kind: 'invite' | 'join' | 'sign-in'; detail?: string }) {
  const navigate = useNavigate()

  const what = kind === 'sign-in' ? 'sign-in link' : `${kind} link`

  return (
    <div style={{ textAlign: 'center', maxWidth: 340, margin: '0 auto' }}>
      <div style={{ fontSize: 26, marginBottom: 12, color: 'var(--gw-sub)' }}>✕</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>This {what} did not work</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 20 }}>
        {detail ?? `${what[0].toUpperCase()}${what.slice(1)}s are single use and they expire.`}
        {kind === 'sign-in'
          ? ' Ask for a new one below.'
          : ' Ask whoever invited you to send a new one - they can do that from the ground.'}
      </div>

      <button className="gw-btn" onClick={() => navigate('/auth')}>
        {kind === 'sign-in' ? 'Get a new link' : 'Sign in instead'}
      </button>

      <div style={{ marginTop: 16 }}>
        <a href={MARKETING_URL} style={{ fontSize: 12, color: 'var(--gw-sub)', textDecoration: 'none' }}>
          What is Groundwork?
        </a>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { MARKETING_URL } from '@/lib/marketing'
import { PageTitle, Note, Button, Stack } from '@/components/gw/ui'

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
 *
 * REBUILT FROM THE SHARED PARTS (Hafsah's first review, U.20 sixth round): shared with `/join`
 * and sign-in, so rebuilding it here (not each caller) gives every one of them the new parts.
 * `PageTitle` for the heading, `Note` for the sentence, the standard `Button`. The old red ✕ is
 * gone with it - none of the prototype's own "something went wrong" screens draw one, and every
 * other narrow arrival screen in this family is a plain heading, no icon.
 */
export function LinkProblem({ kind, detail }: { kind: 'invite' | 'join' | 'sign-in'; detail?: string }) {
  const navigate = useNavigate()

  const what = kind === 'sign-in' ? 'sign-in link' : `${kind} link`

  return (
    <div style={{ textAlign: 'center' }}>
      <Stack gap={12}>
        {/* B-158: one heading for every link that does not work, the same words wherever this
            happens - the deep page audit found five different headings for the same one state
            across /invite, /join, /j/:code, /answer and /verify-email. "That link didn't work"
            is the prototype's own wording (F4-small-states/badlink.txt), already used on
            /verify-email, /set-password and /reset-password (LinkExpired.tsx's LinkDidNotWork) -
            not the audit's own suggested rewrite, which did not match it. */}
        <PageTitle title="That link didn’t work" />
        <Note>
          {/* A sentence of the page's or the server's own already says what to do. Adding the general
              one after it said the same thing twice ("ask whoever added you to send a new invite. Ask
              whoever invited you to send a new one"), found in the running app in U.3. */}
          {detail ?? `${what[0].toUpperCase()}${what.slice(1)}s are single use and they expire.${kind === 'sign-in'
            ? ' Ask for a new one below.'
            : ' Ask the person who invited you to send a new one. They can do that from the check-in.'}`}
        </Note>
        <Button size="big" wide onClick={() => navigate('/auth')}>
          {kind === 'sign-in' ? 'Get a new link' : 'Sign in instead'}
        </Button>
        <p className="gwui-fine"><a href={MARKETING_URL}>What is Groundwork?</a></p>
      </Stack>
    </div>
  )
}

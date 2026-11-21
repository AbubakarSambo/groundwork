import { Button } from '@/components/gw/kit'
import { useTheDesignPass } from '@/lib/the-design-pass'
import { AuthCard, AuthError } from '@/pages/auth/auth-kit'
import { initialsOf } from '@/components/gw/your-organisations'

/**
 * "WHERE DO YOU WORK?" (A3, #/welcome), the card itself. The words are welcome.txt's, without the
 * head count ("27 people."), which is not shown to somebody who is not in the organisation yet.
 *
 * Two pages show it: WelcomePage, for somebody signed in, and the email confirmation, before the
 * account exists, when an organisation lets their domain join (U.3 review). Each page says what
 * "Join" and "Create" do.
 */
export interface WhereDoYouWorkProps {
  byDomain: { id: string; name: string; domain: string }[]
  asAGuest?: { organisationName: string; checkInName: string; invitePath: string }[]
  problem?: string
  busy?: boolean
  onJoin: (organizationId: string) => void
  onJoinAsAGuest?: (invitePath: string) => void
  /** A link to go to, or a button to press. */
  create: { to: string } | { onCreate: () => void }
  /**
   * Whether the caller already knows what this person can join (true once `GET
   * /auth/where-can-i-join` has answered, or when there was never anything to wait for - MagicVerifyPage's
   * own offer, already in hand before this renders). Default true, so a caller that does not pass
   * it keeps today's behaviour. WelcomePage passes false until its query settles, so the page does
   * not say "only create one" for the half-second before the server has actually said there is
   * nothing to join (B-049).
   */
  settled?: boolean
}

export function WhereDoYouWork({ byDomain, asAGuest = [], problem, busy, onJoin, onJoinAsAGuest, create, settled = true }: WhereDoYouWorkProps) {
  /* B-049: with nothing pending to join, the page showed only "Create a new organisation" under
     a first sentence that still promised "Join an organisation you belong to, or create a new
     one." The sentence now says only what the page actually offers. */
  const hasSomethingToJoin = !settled || byDomain.length > 0 || asAGuest.length > 0
  /* The design pass: with nothing to join, creating one is the page's only action, so it is the navy button. */
  const createKind = useTheDesignPass() && !hasSomethingToJoin ? 'primary' : 'secondary'
  return (
    <AuthCard
      title="Where do you work?"
      sub={hasSomethingToJoin
        ? 'Join an organisation you belong to, or create a new one. You can be in more than one and switch between them.'
        : 'Create a new organisation for your team. If somebody invited you to join theirs, use the link they sent you.'}
    >
      {problem && <AuthError>{problem}</AuthError>}
      <ul className="gw-org-rows">
        {byDomain.map(o => (
          <li key={o.id}>
            <div className="gw-org-row gw-org-row-static">
              <span className="gw-rl-sq" aria-hidden>{initialsOf(o.name)}</span>
              <span className="gw-org-row-text">
                <b>{o.name}</b>
                <span>{`Anyone with an @${o.domain} email can join.`}</span>
              </span>
              <Button size="small" onClick={() => onJoin(o.id)} disabled={busy} aria-label={`Join ${o.name}`}>Join</Button>
            </div>
          </li>
        ))}
        {asAGuest.map(g => (
          <li key={g.invitePath}>
            <div className="gw-org-row gw-org-row-static">
              <span className="gw-rl-sq gw-rl-sq-guest" aria-hidden>{initialsOf(g.organisationName)}</span>
              <span className="gw-org-row-text">
                <b>{g.organisationName}</b>
                <span>You were invited to one check-in, as a guest.</span>
              </span>
              <Button size="small" onClick={() => onJoinAsAGuest?.(g.invitePath)} aria-label={`Join ${g.organisationName} as a guest`}>Join as a guest</Button>
            </div>
          </li>
        ))}
        <li>
          <div className="gw-org-row gw-org-row-static gw-org-row-new">
            <span className="gw-rl-sq gw-rl-sq-plus" aria-hidden>+</span>
            <span className="gw-org-row-text">
              <b>Create a new organisation</b>
              <span>For a team that isn’t on Groundwork yet.</span>
            </span>
            {'to' in create
              ? <Button kind={createKind} size="small" to={create.to}>Create</Button>
              : <Button kind={createKind} size="small" onClick={create.onCreate} disabled={busy}>Create</Button>}
          </div>
        </li>
      </ul>
    </AuthCard>
  )
}

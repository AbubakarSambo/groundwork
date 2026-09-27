import { Button } from '@/components/gw/kit'
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
}

export function WhereDoYouWork({ byDomain, asAGuest = [], problem, busy, onJoin, onJoinAsAGuest, create }: WhereDoYouWorkProps) {
  return (
    <AuthCard
      title="Where do you work?"
      sub="Join an organisation you belong to, or create a new one. You can be in more than one and switch between them."
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
              ? <Button kind="secondary" size="small" to={create.to}>Create</Button>
              : <Button kind="secondary" size="small" onClick={create.onCreate} disabled={busy}>Create</Button>}
          </div>
        </li>
      </ul>
    </AuthCard>
  )
}

import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useYourOrganisations, initialsOf, roleWord, whyYouAreIn } from './your-organisations'

/**
 * THE LIST OF YOUR ORGANISATIONS, with the one you are in ticked: in the sidebar's organisation menu
 * and on the phone's "More" page. Choosing another asks first (see your-organisations).
 */
export function OrganisationChoices() {
  const user = useAuthStore(s => s.user)
  const { myOrgs, chooseOrganisation, onlyOneNotChosen, startMyOwnWorkspace } = useYourOrganisations()
  const orgName = user?.organizationName ?? 'Your organisation'

  return (
    <>
      {myOrgs.length === 0 && (
        <div className="gw-rl-menu-item static">
          <span className="gw-rl-sq" aria-hidden>{initialsOf(orgName)}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{orgName}</b><span className="gw-rl-org-role">{roleWord(user?.role)}</span></span>
          <span aria-label="You are in this organisation">✓</span>
        </div>
      )}
      {myOrgs.map(o => (
        <button
          key={o.id}
          type="button"
          className="gw-rl-menu-item"
          onClick={() => chooseOrganisation(o)}
          aria-current={o.active ? 'true' : undefined}
          title={o.active ? 'You are in this organisation' : `Choose ${o.name}`}
        >
          <span className="gw-rl-sq" aria-hidden>{initialsOf(o.name)}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{o.name}</b><span className="gw-rl-org-role">{roleWord(o.role)}</span></span>
          {o.active && <span aria-label="You are in this organisation">✓</span>}
        </button>
      ))}
      {/* As on the prototype's "More" (more-menu-phone.txt). */}
      <Link to="/welcome" className="gw-rl-menu-item gw-rl-menu-join">Join or create an organisation</Link>
      {onlyOneNotChosen && (
        <div className="gw-rl-menu-note">
          {whyYouAreIn(myOrgs[0], user?.email) && <p>{whyYouAreIn(myOrgs[0], user?.email)}</p>}
          <button type="button" className="gw-b gw-b-secondary gw-b-small gw-b-wide" onClick={startMyOwnWorkspace}>
            Start my own workspace
          </button>
        </div>
      )}
    </>
  )
}

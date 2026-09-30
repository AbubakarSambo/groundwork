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
  /*
   * NEVER A NAME THAT ISN'T THE ORGANISATION'S OWN (U.8 review, Hafsah's instruction of 27
   * September). This fallback row is only reached before `myOrganisations` has answered, or on a
   * genuinely broken account - and "Your organisation" / "Takes part" read as fact either way, on
   * a profile a join link can leave as a placeholder with no organisation name at all (see
   * JoinConfirmPage.tsx). `organizationName` arrives with every real profile read; its absence
   * means the real one is not known yet, so nothing is shown in its place rather than a name that
   * was never true.
   */
  const orgName = user?.organizationName ?? ''

  return (
    <>
      {myOrgs.length === 0 && orgName && (
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
          {/*
           * "CREATE AN ORGANISATION", NEVER "START MY OWN WORKSPACE" (group 1 review): "workspace"
           * is not a word this product uses anywhere else, and `startMyOwnWorkspace` only ever
           * navigates to /org-new, which makes a new organisation - it never offers to join one -
           * so the button says exactly what it does, the way "Join or create an organisation"
           * above it says what THAT link does.
           */}
          <button type="button" className="gw-b gw-b-secondary gw-b-small gw-b-wide" onClick={startMyOwnWorkspace}>
            Create an organisation
          </button>
        </div>
      )}
    </>
  )
}

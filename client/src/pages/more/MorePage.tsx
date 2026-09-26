import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'
import { useFeedbackStore } from '@/stores/feedback'
import { navItemsFor } from '@/components/gw/AppShell'
import { OrganisationChoices } from '@/components/gw/OrganisationChoices'
import { Button } from '@/components/gw/kit'
import { useJumpStore } from '@/stores/jump'

/**
 * "MORE", ON A PHONE (A1, docs/prototype/screens/A1-look-and-layout/more-menu-phone.txt).
 *
 * Everything the phone's bottom bar has no room for: the pages across check-ins, your settings,
 * help, feedback, the organisation's own pages for an admin, switching organisation, and signing
 * out. Phones had no way to switch organisation or sign out before this page.
 *
 * Every door comes out of `navItemsFor`, the same gate the sidebar uses, so a phone offers exactly
 * the pages a computer does to the same person. Company and You join the list when those pages
 * exist; "Join or create an organisation" joins it when that flow exists (A3).
 */
export function MorePage() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const showHelp = useHelpStore(s => s.show)
  const showFeedback = useFeedbackStore(s => s.show)
  const openJump = useJumpStore(s => s.show)

  const items = navItemsFor(user)
  const pages = items.filter(i => !(i as { adminOnly?: boolean }).adminOnly && !(i as { platformAdminOnly?: boolean }).platformAdminOnly && i.to !== '/grounds' && i.to !== '/settings')
  const adminItems = items.filter(i => (i as { adminOnly?: boolean }).adminOnly)
  const staffItems = items.filter(i => (i as { platformAdminOnly?: boolean }).platformAdminOnly)
  const orgName = user?.organizationName ?? 'Your organisation'

  return (
    <div className="gw-more">
      <h1 className="gw-t-title gw-more-h1">More</h1>

      <ul className="gw-more-list" aria-label="More">
        {/* "Jump to", which the sidebar carries on a computer. The phone's bar has no room for it. */}
        <li><button type="button" className="gw-more-item" onClick={openJump}><MoreIcon d="jump" /><b>Jump to…</b></button></li>
        {pages.map(item => (
          <li key={item.to}>
            <NavLink to={item.to} className="gw-more-item">{item.icon(false)}<b>{item.label}</b></NavLink>
          </li>
        ))}
        <li><NavLink to="/settings" className="gw-more-item"><MoreIcon d="settings" /><b>Your settings</b></NavLink></li>
        <li><button type="button" className="gw-more-item" onClick={() => showHelp(0)}><MoreIcon d="help" /><b>Help</b></button></li>
        <li><NavLink to="/talk-to-us" className="gw-more-item"><MoreIcon d="talk" /><b>Talk to us</b></NavLink></li>
        <li><button type="button" className="gw-more-item" onClick={showFeedback}><MoreIcon d="feedback" /><b>Send feedback</b></button></li>
        {staffItems.map(item => (
          <li key={item.to}>
            <NavLink to={item.to} className="gw-more-item">{item.icon(false)}<b>{item.label}</b></NavLink>
          </li>
        ))}
      </ul>

      {/* The organisation's own pages, for an admin, under its name as in the sidebar. */}
      {adminItems.length > 0 && (
        <>
          <h2 className="gw-t-h3 gw-more-h2">{orgName}</h2>
          <ul className="gw-more-list" aria-label={orgName}>
            {adminItems.map(item => (
              <li key={item.to}>
                <NavLink to={item.to} className="gw-more-item">{item.icon(false)}<b>{item.label}</b></NavLink>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="gw-t-h3 gw-more-h2">Organisations</h2>
      <div className="gw-more-list gw-more-orgs">
        <OrganisationChoices />
      </div>

      <div style={{ marginTop: 20 }}>
        <Button kind="secondary" onClick={() => { logout(); navigate('/') }}>Sign out</Button>
      </div>
    </div>
  )
}

function MoreIcon({ d }: { d: 'settings' | 'help' | 'feedback' | 'jump' | 'talk' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      {d === 'settings' && (
        <>
          <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 2.2v2.2M10 15.6v2.2M4.5 4.5l1.6 1.6M13.9 13.9l1.6 1.6M2.2 10h2.2M15.6 10h2.2M4.5 15.5l1.6-1.6M13.9 6.1l1.6-1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {d === 'help' && (
        <>
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.8 7.8a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4v.4M10 14.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {d === 'jump' && (
        <>
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {d === 'talk' && (
        <path d="M5 3.5h3l1.2 3.3-1.8 1.2a9 9 0 0 0 4.6 4.6l1.2-1.8 3.3 1.2v3a1.5 1.5 0 0 1-1.6 1.5A13 13 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      )}
      {d === 'feedback' && (
        <path d="M3.5 4.5h13v9h-7l-3.5 3v-3h-2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </svg>
  )
}

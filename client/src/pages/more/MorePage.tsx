import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'
import { useFeedbackStore } from '@/stores/feedback'
import { navItemsFor } from '@/components/gw/nav-items'
import { OrganisationChoices } from '@/components/gw/OrganisationChoices'
import { useJumpStore } from '@/stores/jump'
import { Page, PageTitle, Section, Panel, Button } from '@/components/gw/ui'

/**
 * "MORE", ON A PHONE (A1, docs/prototype/screens/A1-look-and-layout/more-menu-phone.txt; group 1 of
 * the screens rebuilt from the shared parts).
 *
 * Everything the phone's bottom bar has no room for: the pages across check-ins, your settings,
 * help, feedback, the organisation's own pages for an admin, switching organisation, and signing
 * out. Every door comes out of `navItemsFor`, the same gate the sidebar uses, so a phone offers
 * exactly the pages a computer does to the same person.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame, `Section` for "Organisations",
 * and each list - Boards/Company/You/settings/help/feedback, the organisation's own pages, and the
 * organisations themselves - is one white `Panel` with a line between its rows, as the prototype
 * draws it, in place of the old `gw-more-item` rows. `OrganisationChoices` (the switcher shared with
 * the sidebar) sits inside that same panel unchanged; it carries none of the classes the guard
 * checks for, so nothing there needed touching for this task.
 */
export function MorePage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const showHelp = useHelpStore(s => s.show)
  const showFeedback = useFeedbackStore(s => s.show)
  const openJump = useJumpStore(s => s.show)

  const items = navItemsFor(user)
  /*
   * WALKTHROUGH PASS 2, ITEM 8: "COMPANY" IS NOT LISTED AGAIN WHEN IT IS ALREADY IN THE BOTTOM BAR.
   * AppShell.tsx's bottom bar puts Company where Start would be, for somebody who may not open a
   * check-in (and is not a guest) - the exact same condition as there, so "More" never repeats the
   * one door she already has below.
   */
  const companyInBar = user?.mayOpenCheckIns === false && user?.role !== 'GUEST'
  const pages = items.filter(i => !(i as { adminOnly?: boolean }).adminOnly && !(i as { platformAdminOnly?: boolean }).platformAdminOnly && i.to !== '/grounds' && i.to !== '/settings' && i.to !== '/today' && !(companyInBar && i.to === '/company'))  /* Today is in the phone's bar */
  const adminItems = items.filter(i => (i as { adminOnly?: boolean }).adminOnly)
  const staffItems = items.filter(i => (i as { platformAdminOnly?: boolean }).platformAdminOnly)
  const orgName = user?.organizationName ?? ''

  return (
    <Page narrow>
      <PageTitle title="More" />

      <Panel pad={false}>
        <ul className="gwui-more-list" aria-label="More">
          <li><button type="button" className="gwui-more-row" onClick={openJump}><MoreIcon d="jump" /><b>Jump to…</b></button></li>
          {pages.map(item => (
            <li key={item.to}>
              <Link to={item.to} className="gwui-more-row">{item.icon(false)}<b>{item.label}</b></Link>
            </li>
          ))}
          <li><Link to="/settings" className="gwui-more-row"><MoreIcon d="settings" /><b>Your settings</b></Link></li>
          <li><button type="button" className="gwui-more-row" onClick={() => showHelp(0)}><MoreIcon d="help" /><b>Help</b></button></li>
          <li><Link to="/talk-to-us" className="gwui-more-row"><MoreIcon d="talk" /><b>Talk to us</b></Link></li>
          <li><button type="button" className="gwui-more-row" onClick={showFeedback}><MoreIcon d="feedback" /><b>Send feedback</b></button></li>
          {staffItems.map(item => (
            <li key={item.to}>
              <Link to={item.to} className="gwui-more-row">{item.icon(false)}<b>{item.label}</b></Link>
            </li>
          ))}
        </ul>
      </Panel>

      {adminItems.length > 0 && (
        <Section heading={orgName}>
          <Panel pad={false}>
            <ul className="gwui-more-list" aria-label={orgName}>
              {adminItems.map(item => (
                <li key={item.to}>
                  <Link to={item.to} className="gwui-more-row">{item.icon(false)}<b>{item.label}</b></Link>
                </li>
              ))}
            </ul>
          </Panel>
        </Section>
      )}

      <Section heading="Organisations">
        <Panel pad={false}>
          <div className="gwui-more-list">
            <OrganisationChoices />
          </div>
        </Panel>
      </Section>

      <Button kind="secondary" onClick={() => navigate('/signout', { replace: true })}>Sign out</Button>
    </Page>
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

import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useNoRailStore } from '@/stores/no-rail'
import { Page, Mark, PageTitle, Button } from '@/components/gw/ui'

/**
 * Rendered for any path that matches no route. Previously the wildcard route
 * redirected to "/", which for a logged-out visitor could hard-redirect to
 * an externally-configured marketing URL via window.location.replace - if
 * that URL didn't resolve, the visitor was stranded on a blank tab with no
 * indication anything went wrong (this is exactly how a stale "/entry" link
 * on the marketing site behaved). This page never leaves the app and always
 * gives the visitor a way forward.
 *
 * WORDING AND LAYOUT FROM THE PROTOTYPE (F4-small-states/nowhere.txt): the mark, "Nothing is at
 * this address", "It may have moved, or the link was mistyped.", and one button. For someone
 * signed in the button is "Go to Today", to the real Today page (/today) - the prototype's own
 * words, since the prototype pictures this screen as a lead already in the app. A signed-out
 * visitor has no prototype picture for this address; the button keeps its working destination,
 * `/start`, the anonymous entry chat, under the closest true label.
 */
export function NotFoundPage() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()
  const askForNoRail = useNoRailStore(s => s.set)

  /* As the prototype draws it: a card of its own, with no sidebar. */
  useLayoutEffect(() => {
    askForNoRail(true)
    return () => askForNoRail(false)
  }, [askForNoRail])

  useEffect(() => {
    // Visible in server/console logs so a bad link shows up without anyone
    // having to click it first - the whole reason the prior silent redirect
    // went unnoticed for as long as it did.
    console.warn(`[NotFoundPage] unmatched route: ${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return (
    <Page narrow>
      <Mark />
      <PageTitle title="Nothing is at this address" subtitle="It may have moved, or the link was mistyped." />
      <Button kind="secondary" wide to={isAuthenticated ? '/today' : '/start'}>
        {isAuthenticated ? 'Go to Today' : 'Start a check-in'}
      </Button>
    </Page>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'

/**
 * Rendered for any path that matches no route. Previously the wildcard route
 * redirected to "/", which for a logged-out visitor could hard-redirect to
 * an externally-configured marketing URL via window.location.replace - if
 * that URL didn't resolve, the visitor was stranded on a blank tab with no
 * indication anything went wrong (this is exactly how a stale "/entry" link
 * on the marketing site behaved). This page never leaves the app and always
 * gives the visitor a way forward.
 */
export function NotFoundPage() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()

  useEffect(() => {
    // Visible in server/console logs so a bad link shows up without anyone
    // having to click it first - the whole reason the prior silent redirect
    // went unnoticed for as long as it did.
    console.warn(`[NotFoundPage] unmatched route: ${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        {/* The rail already says Groundwork two inches to the left. This said it again, so
              the page's own name is here instead - which is the thing a second line of
              chrome could usefully carry. W13-11. */}
              <span className="gw-logo">Not found</span>
      </div>
      <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
          Page not found
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em', lineHeight: 1.25 }}>
          There is nothing at this address.
        </div>
        <div style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.65 }}>
          The link you followed may be out of date, or the address may have been typed incorrectly.
        </div>

        {/*
          Where "start a ground" means depends on who mistyped the URL. A
          stranger belongs in the anonymous entry chat; somebody signed in
          belongs in the picker, since /start would ask them to save with an
          email they have already given.
        */}
        <Link to={isAuthenticated ? '/grounds' : '/start'} className="gw-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
          {isAuthenticated ? 'Back to your grounds' : 'Start a Ground'}
        </Link>
      </div>
    </div>
  )
}

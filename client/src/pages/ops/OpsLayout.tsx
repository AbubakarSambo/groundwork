import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { opsApi } from '@/api/ops'
import { pagesFor, GROUPS } from './what-you-can-open'

/**
 * The frame every back-office page sits in.
 *
 * Its whole job is the navigation, which is built from what the person holds
 * rather than from a fixed list — so somebody who brings companies in sees four
 * items and not sixteen with locks on twelve.
 */

export const CARD: React.CSSProperties = {
  background: 'white',
  border: '0.5px solid var(--gw-border)',
  borderRadius: 8,
  padding: '12px 14px',
}

export const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--gw-muted)',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
}

export function OpsLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })

  if (me.isError) {
    return (
      <main id="main" style={{ padding: 40, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>This is not your system</h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)' }}>
          You are signed in, but you are not set up in the Groundwork team's operating system. That
          is a separate list from your Groundwork account.
        </p>
      </main>
    )
  }

  const mine = pagesFor(me.data?.capabilities ?? [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch' }}>
      <nav
        aria-label="Back office"
        style={{
          width: 186,
          flex: 'none',
          borderRight: '0.5px solid var(--gw-border)',
          padding: '24px 14px',
          background: 'white',
        }}
      >
        <p style={{ ...LABEL, fontSize: 10, marginBottom: 14 }}>{me.data?.displayName ?? '—'}</p>

        {GROUPS.map((group) => {
          const pages = mine.filter((p) => p.group === group)
          if (pages.length === 0) return null
          return (
            <div key={group} style={{ marginBottom: 16 }}>
              <p style={{ ...LABEL, fontSize: 9.5, marginBottom: 5 }}>{group}</p>
              {pages.map((p) => {
                const here = location.pathname === p.path
                return (
                  <Link
                    key={p.path}
                    to={p.path}
                    aria-current={here ? 'page' : undefined}
                    style={{
                      display: 'block',
                      padding: '5px 8px',
                      marginLeft: -8,
                      borderRadius: 6,
                      fontSize: 13,
                      textDecoration: 'none',
                      fontWeight: here ? 700 : 500,
                      color: here ? 'white' : 'var(--gw-navy)',
                      background: here ? 'var(--gw-navy)' : 'transparent',
                    }}
                  >
                    {p.name}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

/** The heading every page carries, so they cannot drift apart. */
export function OpsHeader({ name, answers }: { name: string; answers: string }) {
  return (
    <header style={{ marginBottom: 18 }}>
      <p style={LABEL}>The team's operating system</p>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-navy)', margin: '4px 0 2px' }}>
        {name}
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: 0 }}>{answers}</p>
    </header>
  )
}

export const PAGE: React.CSSProperties = { padding: '28px 32px', maxWidth: 1040 }

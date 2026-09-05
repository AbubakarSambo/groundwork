import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { opsApi } from '@/api/ops'
import { pagesFor, GROUPS } from './what-you-can-open'
import { useAuthStore } from '@/stores/auth'

/**
 * The frame every back-office page sits in.
 *
 * Its whole job is the navigation, which is built from what the person holds
 * rather than from a fixed list — so somebody who brings companies in sees four
 * items and not sixteen with locks on twelve.
 */

export const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--gw-border)',
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
  const isPlatformAdmin = useAuthStore(state => state.user?.isPlatformAdmin)
  /* Which account this actually is. See the refusal below for why that is the
     one fact this page could not do without. */
  const signedInAs = useAuthStore(state => state.user?.email)
  const logout = useAuthStore(state => state.logout)
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })

  if (me.isError) {
    return (
      <main id="main" style={{ padding: 40, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>This is not your system</h1>
        {/*
          * IT DID NOT SAY WHICH ACCOUNT IT MEANT.
          *
          * "You are signed in, but you are not set up" — and the reader is the platform admin who
          * knows perfectly well she IS set up, because she connected the account herself. Reported
          * exactly that way: "I am super admin so not sure why I see this."
          *
          * The answer was that she was signed in on a second account, and the one fact that would
          * have said so was the address. A refusal that will not name who it is refusing leaves the
          * reader arguing with it instead of fixing it.
          */}
        <p style={{ fontSize: 14, color: 'var(--gw-sub)' }}>
          You are signed in{signedInAs ? ` as ${signedInAs}` : ''}, and that account is not on the
          Groundwork team's operating system. Everybody on the platform-admin list is; so is
          anybody connected to somebody on the team.
        </p>

        {isPlatformAdmin && (
          /*
           * A DEAD END IS NOT AN ANSWER WHEN THE READER CAN FIX IT. A platform admin is exactly
           * the person who can connect an account, and this page used to tell them nothing but no.
           */
          <p style={{ fontSize: 14, marginTop: 14 }}>
            <Link to="/admin/dashboard" style={{ color: 'var(--gw-navy)', fontWeight: 700 }}>
              Connect {signedInAs ? 'this account' : 'your account'} to somebody on the team →
            </Link>
          </p>
        )}

        {/*
          * AND A WAY OUT, WHICH THERE WAS NOT.
          *
          * The page had one link and no navigation, so somebody who landed here with the wrong
          * account was stuck on it — "I can't get out of it". Signing out is the fix in the common
          * case, and going back to the app is the fix in every other one.
          */}
        <p style={{ fontSize: 14, marginTop: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link to="/grounds" style={{ color: 'var(--gw-sub)' }}>
            ← Back to Groundwork
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              window.location.href = '/auth'
            }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: 'var(--gw-sub)',
              textDecoration: 'underline',
            }}
          >
            Sign in as somebody else
          </button>
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
          borderRight: '1px solid var(--gw-border)',
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

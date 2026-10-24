import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { opsApi } from '@/api/ops'
import { setDisplayTimezone } from '@/lib/a-date-reads-the-same-everywhere'
import { pagesFor, whyThisIsNotYours, GROUPS } from './what-you-can-open'
import { useAuthStore } from '@/stores/auth'
import { TheAssistantAsACustomerSeesIt } from './TheAssistantAsACustomerSeesIt'

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


/**
 * WHAT DID NOT LOAD, WHICH THE BACK OFFICE HAS NEVER SAID.
 *
 * Every ops call is QUIET — it suppresses its own forbidden, not-found and server-error toasts —
 * and React Query leaves `data` undefined on an error exactly as it does while pending. So
 * `OpsTable` renders "Working it out…" and keeps rendering it, for good, on a 403 or a 500. The
 * two most common failures in this system were invisible by construction.
 *
 * Watching the cache rather than each call site: there are dozens of queries across seventeen
 * pages, and a rule every one of them has to remember is a rule that lasts until the next page.
 */
function useWhatDidNotLoad(): { failed: number; retry: () => void } {
  const client = useQueryClient()
  const [failed, setFailed] = useState(0)

  useEffect(() => {
    const count = () =>
      client
        .getQueryCache()
        .findAll({ predicate: (q) => q.state.status === 'error' && q.queryKey[0] === 'ops' }).length
    setFailed(count())
    /* The cache notifies synchronously, sometimes from inside a child's render; setting state on
       the layout right then is the "cannot update a component while rendering a different
       component" warning on every ops page. A tick later is the same number, quietly. */
    let pending: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = client.getQueryCache().subscribe(() => {
      if (pending) return
      pending = setTimeout(() => { pending = null; setFailed(count()) }, 0)
    })
    return () => { if (pending) clearTimeout(pending); unsubscribe() }
  }, [client])

  return {
    failed,
    retry: () =>
      client.refetchQueries({ predicate: (q) => q.state.status === 'error' && q.queryKey[0] === 'ops' }),
  }
}

export function OpsLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isPlatformAdmin = useAuthStore(state => state.user?.isPlatformAdmin)
  /* Which account this actually is. See the refusal below for why that is the
     one fact this page could not do without. */
  const signedInAs = useAuthStore(state => state.user?.email)
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  /* Once per visit, after the read has said who this is: take the seat. A GET does not write the roster (A15). */
  useEffect(() => { if (me.isSuccess) Promise.resolve().then(() => opsApi.enter()).catch(() => undefined) }, [me.isSuccess])
  /* Every date in the back office reads in the company's zone, whoever is looking (B10). */
  useEffect(() => { if (me.data?.displayTimezone) setDisplayTimezone(me.data.displayTimezone) }, [me.data?.displayTimezone])
  /* ABOVE EVERY EARLY RETURN. Called after them it is a conditional hook: the refusal path renders
     fewer hooks than the ordinary one and React throws, which is how a guard for one silent
     failure produced a louder one. */
  const didNotLoad = useWhatDidNotLoad()

  if (me.isError) {
    return (
      <section style={{ padding: 40, maxWidth: 640 }}>
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
              window.location.href = '/signout'
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
      </section>
    )
  }

  const mine = pagesFor(me.data?.capabilities ?? [])

  /**
   * WHILE WE DO NOT YET KNOW WHO THIS IS, SHOW NOTHING RATHER THAN NOTHING-YOU-CAN-DO.
   *
   * `me` in flight means `capabilities` is undefined, which read as "holds nothing": the nav drew
   * itself as the smallest possible back office and the page under it rendered against permissions
   * nobody had checked, then both popped into place a beat later. Every load flickered somebody's
   * standing at them.
   */
  if (me.isPending) {
    return (
      <section style={{ padding: 40 }}>
        <p style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Opening the back office…</p>
      </section>
    )
  }

  /**
   * AND THE ROUTES ARE GUARDED BY THE SAME LIST THE NAV IS BUILT FROM.
   *
   * Thirty-one routes were bare `RequireAuth`, so anybody with an ops identity who typed an
   * address got the whole page — forms included — and only the writes refused, silently, because
   * every ops call suppresses its own toast. Here rather than on each route because every ops page
   * already comes through this layout, and a per-route list is a second list to drift.
   */
  const notYours = whyThisIsNotYours(location.pathname, me.data?.capabilities ?? [])
  if (notYours) {
    return (
      <section style={{ padding: 40, maxWidth: 620 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>That part is not yours to open</h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 8 }}>
          {notYours.because === 'no capability'
            ? 'There is no such page in the back office.'
            : <>Opening <strong>{notYours.page}</strong> needs <code>{notYours.because}</code>, which you do not hold.</>}
        </p>
        {/* A setting, not a judgement — and the person who can change it, because a refusal with
            no next step reads as the product being broken. */}
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 20 }}>
          This is how your grants are set, not anything about you. Whoever runs the back office can change it.
        </p>
        <a className="gw-btn" href="/ops" style={{ textDecoration: 'none' }}>Back to your board</a>
      </section>
    )
  }

  return (
    /*
     * ON A PHONE THIS WAS A 186-PIXEL RAIL AGAINST ABOUT 189 PIXELS OF CONTENT.
     *
     * A fixed-width nav and `display: flex` with no media query anywhere, so at 375px the back
     * office was half menu and half a column too narrow to read a table in. The class does the
     * work rather than an inline style, because a media query cannot be expressed inline — which
     * is exactly why the original had none.
     */
    <div className="gw-ops-shell" style={{ minHeight: '100vh' }}>
      <style>{`
        .gw-ops-shell { display: flex; align-items: stretch; }
        .gw-ops-rail { width: 186px; flex: none; border-right: 1px solid var(--gw-border); padding: 24px 14px; background: white; }
        @media (max-width: 720px) {
          /*
           * Stacked, and the menu becomes ONE ROW that scrolls sideways.
           *
           * The first attempt let the four groups stack as columns, which was honest about the
           * structure and took four hundred pixels of an eight-hundred-pixel screen before a word
           * of content — the same fault as the rail, rotated. So on a phone the groups flatten
           * into a single line of links: the grouping is a desktop affordance, and losing it is
           * cheaper than losing half the screen.
           */
          .gw-ops-shell { display: block; }
          .gw-ops-rail {
            width: auto; border-right: none; border-bottom: 1px solid var(--gw-border);
            padding: 8px 12px; display: flex; gap: 4px; overflow-x: auto;
            align-items: center; white-space: nowrap; -webkit-overflow-scrolling: touch;
          }
          /* The group labels and the person's name are structure, not navigation. */
          .gw-ops-rail > p, .gw-ops-rail > div > p { display: none; }
          .gw-ops-rail > div { margin-bottom: 0 !important; flex: none; display: flex; gap: 4px; }
          .gw-ops-rail a { padding: 6px 10px !important; }
          /* The two ways out stay at the end of the row rather than under it. */
          .gw-ops-rail > div:last-child {
            margin-top: 0 !important; padding-top: 0 !important;
            border-top: none !important; border-left: 1px solid var(--gw-border);
            padding-left: 10px !important; flex-direction: row;
          }
        }
      `}</style>
      <nav aria-label="Back office" className="gw-ops-rail">
        {/* THE WAY OUT, AT THE TOP. It was at the foot of the rail, under twenty links, which on any
            normal screen is below the fold: "i need to get out of this place too". */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          <Link to="/grounds" style={{ fontSize: 12, color: 'var(--gw-sub)', textDecoration: 'none' }}>← Groundwork</Link>
          {isPlatformAdmin && (
            <Link to="/admin" style={{ fontSize: 12, color: 'var(--gw-sub)', textDecoration: 'none' }}>← Platform console</Link>
          )}
        </div>
        <p style={{ ...LABEL, fontSize: 10, marginBottom: 14 }}>{me.data?.displayName ?? ' - '}</p>

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
                      /* The kit's rail (app.css .nav, .nav.on): the page you are on is the surface
                         with a hairline and bold words, not a navy fill. */
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 44,
                      padding: '0 8px',
                      marginLeft: -8,
                      borderRadius: 8,
                      fontSize: 14,
                      textDecoration: 'none',
                      fontWeight: here ? 700 : 400,
                      color: 'var(--gw-text)',
                      background: here ? 'var(--gw-card)' : 'transparent',
                      boxShadow: here ? 'inset 0 0 0 1px var(--gw-border)' : 'none',
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

      {/* THE WAY BACK, WHICH THERE WAS NOT.
          Three surfaces — the app, the platform console, this — and from here
          the only route to either was typing a URL. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {didNotLoad.failed > 0 && (
          <div
            role="status"
            style={{
              border: '1px solid var(--gw-amber-b)',
              background: 'var(--gw-amber-bg)',
              color: 'var(--gw-amber-t)',
              borderRadius: 6,
              padding: '10px 14px',
              margin: '16px 32px 0',
              fontSize: 13,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {didNotLoad.failed === 1
                ? 'Something on this page did not load'
                : `${didNotLoad.failed} things on this page did not load`}
              {' '} - what you can see may be incomplete.
            </span>
            {/* `gw-btn-ghost` matches no rule, so the one control on a "something did not load"
                banner was an unstyled browser button - the moment a control most needs to look
                like one. Third instance of the same typo; the guard is in
                grounds/an-input-that-does-not-look-like-one.spec.ts. */}
            <button type="button" className="gw-btn-sm" style={{ margin: 0 }} onClick={didNotLoad.retry}>
              Try again
            </button>
          </div>
        )}
        {children}
      </div>

      {/* ON EVERY BACK-OFFICE PAGE, THE WAY A CUSTOMER'S WOULD BE. It is not a
          feature of one screen; it is the proof that the API we sell works from
          outside, and it belongs wherever somebody is working. */}
      <TheAssistantAsACustomerSeesIt />
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

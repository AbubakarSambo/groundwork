/**
 * A SECTION THAT FAILED SAYS SO.
 *
 * Three panels on the platform console — WhatsApp, pricing, in-app feedback — did
 * `if (isLoading || !data) return null`. A failed fetch renders `!data`, so the whole section
 * disappeared: identical, on screen, to a feature that is switched off or does not exist. A
 * platform admin looking for pricing saw a console with no pricing in it.
 *
 * Loading is still nothing (a flash of skeletons on a console is worse than a beat of nothing).
 * A failure is a sentence and a way to try again.
 */
import type { ReactNode } from 'react'

export function SectionFailed({ what, error, retry }: { what: string; error: unknown; retry?: () => void }) {
  const status = (error as any)?.response?.status
  const said = (error as any)?.response?.data?.message
  const because =
    status === 403 ? 'you are not allowed to read this'
    : status === 404 ? 'it is not available on this deployment'
    : typeof said === 'string' && said ? said
    : 'we could not reach it'
  return (
    <div style={{
      border: '1px solid var(--gw-amber-b-soft)', background: 'var(--gw-amber-bg)', borderRadius: 12,
      /* The palette variable, not the hex the report page uses: a second copy of a colour is how
         two pages start disagreeing about what amber means. */
      padding: '12px 14px', fontSize: 12, color: 'var(--gw-amber-t)', lineHeight: 1.5,
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <span>{what} did not load - {because}.</span>
      {retry && (
        <button onClick={retry} style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
          Try again
        </button>
      )}
    </div>
  )
}

/**
 * The whole rule in one place: nothing while it loads, a sentence if it failed, the section
 * otherwise. A panel that calls this cannot silently vanish.
 */
export function Section({
  what, isLoading, error, data, retry, children,
}: {
  what: string
  isLoading: boolean
  error: unknown
  data: unknown
  retry?: () => void
  children: ReactNode
}) {
  if (isLoading) return null
  if (error || data === undefined || data === null) {
    return <SectionFailed what={what} error={error} retry={retry} />
  }
  return <>{children}</>
}

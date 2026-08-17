import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsApi, UsageFunnelData, PlatformDashboardData, OrgListItem, UsageStatsData, FeedbackSummaryData } from '@/api/prompts'
import { adminApi, pricingAdminApi } from '@/api/admin'
import { PLAN_LABELS, formatPlanPrice, type SubscriptionPlan } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(str: string) {
  return str.replace(/_/g, ' ').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── shared tokens ─────────────────────────────────────────────────────────────

const C: React.CSSProperties = { background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px' }
const SL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }

function Stat({ val, label, accent }: { val: string | number; label: string; accent?: boolean }) {
  return (
    <div style={{ ...C, flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? 'var(--gw-navy)' : 'var(--gw-navy)' }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Bar({ pct, color = 'var(--gw-navy)' }: { pct: number; color?: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(12,68,124,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .3s' }} />
    </div>
  )
}

// ── System tab ────────────────────────────────────────────────────────────────

function WhatsAppToggle() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-whatsapp'], queryFn: adminApi.getWhatsAppStatus })
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => adminApi.setWhatsAppEnabled(enabled),
    onSuccess: (updated) => qc.setQueryData(['admin-whatsapp'], updated),
  })
  if (isLoading || !data) return null
  return (
    <div style={{ ...C, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>WhatsApp check-ins</div>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
            Single Groundwork number, shared across every org. {data.credentialsConfigured
              ? 'Credentials are configured.'
              : 'Waiting on WhatsApp Business API credentials - toggling this on will have no effect until those are set.'}
          </div>
        </div>
        <button
          onClick={() => toggle.mutate(!data.adminEnabled)}
          disabled={toggle.isPending}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: data.adminEnabled ? 'var(--gw-navy)' : 'var(--gw-border)',
            position: 'relative', flexShrink: 0, marginLeft: 16,
          }}
          aria-label={data.adminEnabled ? 'Turn off WhatsApp' : 'Turn on WhatsApp'}
        >
          <span style={{ position: 'absolute', top: 3, left: data.adminEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
        </button>
      </div>
      <div style={{ fontSize: 11, marginTop: 8, fontWeight: 700, color: data.live ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
        {data.live ? 'Live' : data.adminEnabled ? 'On, but not live (credentials missing)' : 'Off'}
      </div>
    </div>
  )
}

/** The plans a customer can buy. Enterprise is priced in conversation, so it is not editable here. */
const PRICEABLE_PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE']

/**
 * CHANGING WHAT WE CHARGE, WITHOUT A DEPLOY.
 *
 * Prices used to be constants in three separately-built codebases - the cents the API charged, the
 * dollars the app displayed, the dollars the marketing site advertised - so a change meant three
 * edits and three deploys, and nothing tied the charged amount to the advertised one.
 *
 * Two things this screen is careful about, because it bills real cards:
 *
 * DOLLARS IN, CENTS STORED. An admin types 25, not 2500. Typing cents into a field labelled with a
 * dollar sign is how somebody charges a hundred times too much, and the API bounds the value as
 * well - this field is not the only thing standing between a typo and a charge.
 *
 * IT SAYS WHO IT DOES NOT AFFECT. A new price applies to NEW subscribers only. Existing customers
 * keep the amount baked into the Stripe subscription that was created for them, and nothing in the
 * product migrates them. Somebody about to raise prices needs to know that before they click, not
 * after a customer asks why their invoice did not change.
 */
function PricingEditor() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-pricing'], queryFn: pricingAdminApi.get })
  /** Keyed drafts, so an admin can edit several fields and save once. */
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [limitDraft, setLimitDraft] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => {
      const planPricesCents: Record<string, number> = {}
      for (const [plan, raw] of Object.entries(draft)) {
        const dollars = Number(raw)
        if (!raw.trim() || !Number.isFinite(dollars)) throw new Error(`${PLAN_LABELS[plan as SubscriptionPlan]} needs a number of dollars.`)
        planPricesCents[plan] = Math.round(dollars * 100)
      }
      const patch: { planPricesCents?: Record<string, number>; freeGroundLimit?: number } = {}
      if (Object.keys(planPricesCents).length) patch.planPricesCents = planPricesCents
      if (limitDraft !== null) {
        const n = Number(limitDraft)
        if (!limitDraft.trim() || !Number.isInteger(n)) throw new Error('The free ground limit must be a whole number.')
        patch.freeGroundLimit = n
      }
      if (!patch.planPricesCents && patch.freeGroundLimit === undefined) throw new Error('Nothing changed.')
      return pricingAdminApi.update(patch)
    },
    onSuccess: (updated) => {
      qc.setQueryData(['admin-pricing'], updated)
      /** The public read too, so /pricing and /billing show the new number without a reload. */
      qc.invalidateQueries({ queryKey: ['pricing'] })
      setDraft({}); setLimitDraft(null); setErr(null); setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? e?.message ?? 'Could not save.'),
  })

  const reset = useMutation({
    mutationFn: pricingAdminApi.reset,
    onSuccess: (updated) => {
      qc.setQueryData(['admin-pricing'], updated)
      qc.invalidateQueries({ queryKey: ['pricing'] })
      setDraft({}); setLimitDraft(null); setErr(null)
    },
  })

  if (isLoading || !data) return null
  const dirty = Object.keys(draft).length > 0 || limitDraft !== null

  return (
    <div style={{ ...C, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Plan prices</div>
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
        These are the amounts Stripe charges and the amounts the app shows, from the same place.
        {data.updatedAt
          ? ` Last changed ${timeAgo(data.updatedAt)}.`
          : ' Never changed - these are the values the code ships with.'}
      </div>

      {/* The limit, said plainly, because it is the reason to be careful rather than a footnote. */}
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 10, lineHeight: 1.5, padding: '9px 11px', background: 'var(--gw-amber-bg)', borderRadius: 8 }}>
        A new price applies to <b>new subscribers only</b>. Anyone already subscribed keeps the
        amount their subscription was created with, and nothing here changes it - that needs a
        change on their Stripe subscription.
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {PRICEABLE_PLANS.map(plan => {
          const liveCents = data.planPricesCents[plan]
          const value = draft[plan] ?? String((liveCents ?? 0) / 100)
          return (
            <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12.5, width: 110, flexShrink: 0 }}>{PLAN_LABELS[plan]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--gw-muted)' }}>$</span>
                <input
                  aria-label={`${PLAN_LABELS[plan]} price in dollars per month`}
                  value={value}
                  inputMode="decimal"
                  onChange={e => setDraft(d => ({ ...d, [plan]: e.target.value }))}
                  style={{ width: 78, padding: '5px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--gw-border)', fontFamily: 'inherit' }}
                />
                <span style={{ fontSize: 12, color: 'var(--gw-muted)' }}>/mo</span>
              </div>
              {draft[plan] !== undefined && (
                <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>was {formatPlanPrice(liveCents)}</span>
              )}
            </div>
          )
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--gw-border)' }}>
          <div style={{ fontSize: 12.5, width: 110, flexShrink: 0 }}>Free grounds</div>
          <input
            aria-label="Free ground limit"
            value={limitDraft ?? String(data.freeGroundLimit)}
            inputMode="numeric"
            onChange={e => setLimitDraft(e.target.value)}
            style={{ width: 78, padding: '5px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--gw-border)', fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>before a subscription is needed</span>
        </div>
      </div>

      {err && <div style={{ fontSize: 12, color: 'var(--gw-red-b)', marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
      {saved && <div style={{ fontSize: 12, color: 'var(--gw-green-t)', marginTop: 10, fontWeight: 700 }}>Saved. New checkouts use these prices.</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          style={{
            padding: '7px 14px', fontSize: 12.5, fontWeight: 700, borderRadius: 7, border: 'none',
            background: dirty ? 'var(--gw-navy)' : 'var(--gw-border)', color: dirty ? 'white' : 'var(--gw-muted)',
            cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit',
          }}
        >
          {save.isPending ? 'Saving...' : 'Save prices'}
        </button>
        {dirty && (
          <button
            onClick={() => { setDraft({}); setLimitDraft(null); setErr(null) }}
            style={{ padding: '7px 12px', fontSize: 12.5, borderRadius: 7, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Discard
          </button>
        )}
        <button
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
          style={{ marginLeft: 'auto', padding: '7px 12px', fontSize: 12, borderRadius: 7, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {reset.isPending ? 'Restoring...' : 'Restore shipped prices'}
        </button>
      </div>
    </div>
  )
}

function SystemTab({ dash }: { dash: PlatformDashboardData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <section>
        <div style={SL}>Integrations</div>
        <WhatsAppToggle />
      </section>

      <section>
        <div style={SL}>Pricing</div>
        <PricingEditor />
      </section>

      <section>
        <div style={SL}>At a glance</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat val={dash.orgs.total} label="Total orgs" />
          <Stat val={dash.orgs.withActiveCareFee} label="Active billing" accent />
          <Stat val={dash.grounds.total} label="Total grounds" />
          <Stat val={dash.checkIns.totalCompleted} label="Check-ins done" />
        </div>
      </section>

      <section>
        <div style={SL}>Last 7 days</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat val={dash.orgs.createdLast30Days} label="New orgs (30d)" />
          <Stat val={dash.grounds.openedLast7Days} label="Grounds opened" />
          <Stat val={dash.checkIns.completedLast7Days} label="Check-ins" />
          <Stat val={dash.grounds.resolvedLast30Days} label="Resolved (30d)" />
        </div>
      </section>

      <section>
        <div style={SL}>Ground status</div>
        <div style={C}>
          {Object.entries(dash.grounds.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
            const total = Object.values(dash.grounds.byStatus).reduce((a, b) => a + b, 0)
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{fmt(status)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{count}</div>
                <Bar pct={pct} />
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 34, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <div style={SL}>Recent activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dash.recentActivity.map((ev, i) => (
            <div key={i} style={{ ...C, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                  {ev.type.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--gw-text)' }}>{ev.groundLabel}</span>
                <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{ev.orgSlug}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--gw-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{timeAgo(ev.at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Drop-offs tab ─────────────────────────────────────────────────────────────

function DropoffsTab({ data }: { data: UsageFunnelData }) {
  const sessions = data.funnelBySession
  let lastNonZero = 0
  for (let i = 0; i < sessions.length; i++) { if (sessions[i].completed > 0) lastNonZero = i }
  const visible = sessions.slice(0, lastNonZero + 1)
  const s1 = sessions[0]?.completed ?? 1
  const statusTotal = data.byStatus.reduce((a, s) => a + s.count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <section>
        <div style={SL}>Session retention</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(row => (
            <div key={row.session} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'var(--gw-navy)', borderRadius: 4, padding: '2px 6px', minWidth: 26, textAlign: 'center', flexShrink: 0 }}>S{row.session}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 32, textAlign: 'right', flexShrink: 0 }}>{row.completed}</div>
              <Bar pct={s1 > 0 ? (row.completed / s1) * 100 : 0} />
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 60, textAlign: 'right', flexShrink: 0 }}>
                {row.session === 1 ? 'baseline' : row.dropOffRate != null ? `−${Math.round(row.dropOffRate * 100)}%` : '–'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={SL}>Party engagement</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat val={data.bothEngaged} label="Everybody engaged" />
          <Stat val={data.oneEngaged} label="One-sided (initiator only)" />
          <Stat val={data.stalledCheckIns} label="Stalled check-ins (>7d)" accent={data.stalledCheckIns > 0} />
        </div>
      </section>

      <section>
        <div style={SL}>Avg days to first check-in</div>
        <div style={{ ...C, display: 'inline-block' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gw-navy)' }}>{data.avgDaysToFirstCheckin?.toFixed(1) ?? '–'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>days</div>
        </div>
      </section>

      {data.avgSessionMinutes.length > 0 && (
        <section>
          <div style={SL}>Avg session duration (min)</div>
          <div style={C}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'left', paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Session</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'right', paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Avg min</th>
                </tr>
              </thead>
              <tbody>
                {data.avgSessionMinutes.map(row => (
                  <tr key={row.session}>
                    <td style={{ fontSize: 12, color: 'var(--gw-text)', padding: '4px 0', borderTop: '0.5px solid var(--gw-border)' }}>S{row.session}</td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right', padding: '4px 0', borderTop: '0.5px solid var(--gw-border)' }}>{row.avgMinutes.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div style={SL}>Ground scenarios</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...data.byScenario].sort((a, b) => b.count - a.count).map(row => (
            <div key={row.scenario} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{fmt(row.scenario)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{row.count}</div>
              <Bar pct={row.pct} />
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 34, textAlign: 'right', flexShrink: 0 }}>{row.pct.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={SL}>Ground status distribution</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...data.byStatus].sort((a, b) => b.count - a.count).map(row => {
            const pct = statusTotal > 0 ? (row.count / statusTotal) * 100 : 0
            return (
              <div key={row.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{fmt(row.status)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{row.count}</div>
                <Bar pct={pct} />
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 34, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── Orgs tab ──────────────────────────────────────────────────────────────────

function OrgsTab({ orgs }: { orgs: OrgListItem[] }) {
  const [search, setSearch] = useState('')
  const filtered = orgs.filter(o =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search orgs…"
        style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '0.5px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', marginBottom: 14, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(org => (
          <div key={org.id} style={{ ...C, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>{org.name}</div>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
                {org.groundCount} ground{org.groundCount !== 1 ? 's' : ''} · {org.userCount} user{org.userCount !== 1 ? 's' : ''}
                {org.lastActivity ? ` · last active ${timeAgo(org.lastActivity)}` : ' · no activity yet'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: org.billingActive ? 'var(--gw-green-bg)' : 'var(--gw-bg)',
                color: org.billingActive ? 'var(--gw-green-t)' : 'var(--gw-muted)',
                border: '0.5px solid var(--gw-border)',
              }}>
                {org.billingActive ? 'Billing active' : 'Free'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--gw-muted)' }}>
                {new Date(org.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No orgs found.</div>
        )}
      </div>
    </div>
  )
}

// ── Usage tab ─────────────────────────────────────────────────────────────────

function UsageTab({ data }: { data: UsageStatsData }) {
  const maxCount = Math.max(...data.checkInsLast14Days.map(d => d.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <section>
        <div style={SL}>Platform totals</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat val={data.totalCheckIns} label="Check-ins completed" accent />
          <Stat val={data.groundsCreated} label="Grounds created" />
          <Stat val={data.reportsGenerated} label="Reports generated" />
        </div>
      </section>

      <section>
        <div style={SL}>Check-ins - last 14 days</div>
        <div style={{ ...C, paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
            {data.checkInsLast14Days.map(({ date, count }) => (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  title={`${count} check-in${count !== 1 ? 's' : ''}`}
                  style={{
                    width: '100%', borderRadius: '3px 3px 0 0',
                    height: `${Math.max((count / maxCount) * 60, count > 0 ? 4 : 2)}px`,
                    background: count > 0 ? 'var(--gw-navy)' : 'var(--gw-border)',
                    transition: 'height .3s',
                  }}
                />
                <div style={{ fontSize: 8, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {date.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {Object.keys(data.eventTotals).length > 0 && (
        <section>
          <div style={SL}>Usage events (all time)</div>
          <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(data.eventTotals).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--gw-text)' }}>{fmt(type)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Feedback tab ──────────────────────────────────────────────────────────────

function FeedbackTab({ data }: { data: FeedbackSummaryData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat val={data.total} label="Feedback responses" />
        <Stat val={data.fairRate != null ? `${data.fairRate}%` : '–'} label="Felt fair" accent={!!data.fairRate && data.fairRate >= 70} />
      </div>

      {data.recent.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 32 }}>No feedback submitted yet.</div>
      ) : (
        <div>
          <div style={SL}>Recent responses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.recent.map(f => (
              <div key={f.id} style={{ ...C, borderLeft: `3px solid ${f.feltFair ? 'var(--gw-green-b)' : 'var(--gw-amber-b)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: f.note ? 5 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: f.feltFair ? 'var(--gw-green-bg)' : 'var(--gw-amber-bg)',
                      color: f.feltFair ? 'var(--gw-green-t)' : 'var(--gw-amber-t)',
                    }}>
                      {f.feltFair ? 'Felt fair' : 'Didn\'t feel fair'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--gw-text)' }}>{f.groundLabel}</span>
                    <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{f.orgSlug}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--gw-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{timeAgo(f.createdAt)}</span>
                </div>
                {f.note && (
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, fontStyle: 'italic', marginTop: 4 }}>"{f.note}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Errors tab ────────────────────────────────────────────────────────────────

function ErrorsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...C, borderLeft: '3px solid var(--gw-amber-b)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>No error sink connected</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          Connect Sentry or add a <code style={{ fontSize: 11, background: 'var(--gw-bg)', padding: '1px 5px', borderRadius: 3 }}>POST /ops/errors</code> endpoint to surface recent exceptions here.
          The API already logs to console via NestJS Logger - redirect that output to a sink and expose it through the prompts controller.
        </div>
      </div>
      <div style={{ ...C }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>What to wire</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: 'Sentry DSN', detail: 'Set SENTRY_DSN in api/.env and import @sentry/nestjs in main.ts' },
            { label: 'Error log endpoint', detail: 'Add GET /prompts/errors to PromptsController - query a database error_logs table' },
            { label: 'AI failure rate', detail: 'Log AnthropicService 4xx/5xx calls to the usage_events table with type ERROR' },
            { label: 'Webhook failures', detail: 'Log Stripe webhook errors to a separate stripe_errors table - query it here' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-navy)', minWidth: 160, flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Prompts tab ───────────────────────────────────────────────────────────────

function PromptsTab({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65 }}>
        Conversation prompts are versioned and stored in the database. Changes are logged with a summary and activation is deliberate - deactivating a version does not delete it. Outcome data is tracked per version so you can compare fairness rates across prompt iterations.
      </div>
      <button
        onClick={() => navigate('/prompts')}
        style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Open prompt management →
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'system' | 'dropoffs' | 'prompts' | 'orgs' | 'usage' | 'feedback' | 'errors'

const TABS: { id: Tab; label: string }[] = [
  { id: 'system',   label: 'System' },
  { id: 'dropoffs', label: 'Drop-offs' },
  { id: 'prompts',  label: 'Prompts' },
  { id: 'orgs',     label: 'Orgs' },
  { id: 'usage',    label: 'Usage' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'errors',   label: 'Errors' },
]

export function AdminPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<Tab>('system')

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: promptsApi.platformDashboard,
    enabled: !!user?.isPlatformAdmin,
    staleTime: 2 * 60 * 1000,
  })

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['platform-funnel'],
    queryFn: promptsApi.platformFunnel,
    enabled: !!user?.isPlatformAdmin && tab === 'dropoffs',
    staleTime: 5 * 60 * 1000,
  })

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['platform-org-list'],
    queryFn: promptsApi.orgList,
    enabled: !!user?.isPlatformAdmin && tab === 'orgs',
    staleTime: 2 * 60 * 1000,
  })

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['platform-usage'],
    queryFn: promptsApi.usageStats,
    enabled: !!user?.isPlatformAdmin && tab === 'usage',
    staleTime: 2 * 60 * 1000,
  })

  const { data: feedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['platform-feedback'],
    queryFn: promptsApi.feedbackSummary,
    enabled: !!user?.isPlatformAdmin && tab === 'feedback',
    staleTime: 5 * 60 * 1000,
  })

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Platform admin access required.</div>
      </div>
    )
  }

  const loading = tab === 'system' ? dashLoading
    : tab === 'dropoffs' ? funnelLoading
    : tab === 'orgs' ? orgsLoading
    : tab === 'usage' ? usageLoading
    : tab === 'feedback' ? feedbackLoading
    : false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>

      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '1px solid var(--gw-border)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>Groundwork ops</div>
          <button onClick={() => navigate('/grounds')} style={{ fontSize: 12, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← App</button>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', overflowX: 'auto', borderTop: '1px solid var(--gw-border)' }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: '0 0 auto', padding: '9px 16px', fontSize: 12,
                fontWeight: tab === id ? 700 : 500,
                color: tab === id ? 'var(--gw-navy)' : 'var(--gw-muted)',
                background: 'none', border: 'none',
                borderBottom: tab === id ? '2px solid var(--gw-navy)' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', padding: '20px 16px 64px' }}>
        {loading && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: 32, textAlign: 'center' }}>Loading…</div>
        )}

        {tab === 'system'   && !dashLoading  && dash     && <SystemTab dash={dash} />}
        {tab === 'dropoffs' && !funnelLoading && funnel   && <DropoffsTab data={funnel} />}
        {tab === 'prompts'  && <PromptsTab navigate={navigate} />}
        {tab === 'orgs'     && !orgsLoading  && orgs     && <OrgsTab orgs={orgs} />}
        {tab === 'usage'    && !usageLoading && usage    && <UsageTab data={usage} />}
        {tab === 'feedback' && !feedbackLoading && feedback && <FeedbackTab data={feedback} />}
        {tab === 'errors'   && <ErrorsTab />}
      </div>
    </div>
  )
}

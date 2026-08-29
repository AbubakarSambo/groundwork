import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

/**
 * WHAT AN ORG ADMIN SEES FIRST, WHICH WAS SOMEBODY ELSE'S JOB.
 *
 * Signing up as an admin put you on an empty check-in list with one button on it: "Open your first
 * check-in". That is the lead's job, not the admin's. Reported by the person who signed up:
 *
 *   "I didn't see where to select my plan, no admin configuration. It treats me like I am the lead
 *    coming in to set up a ground and not the org admin. No side menu."
 *
 * NONE OF IT WAS MISSING. People, Connect, Billing and Settings all exist and are all in the rail -
 * which collapses to a hamburger at the width they were browsing at, so the whole of an admin's job
 * was behind an icon they had no reason to press. And the plan was never named anywhere: a new
 * organisation is on the free tier, and nothing in the product said so.
 *
 * SO THIS DOES NOT ADD A FEATURE. It puts what already exists on the screen the admin actually
 * lands on, once, while they have nothing else. It disappears as soon as they have a check-in,
 * because at that point the rail is a thing they have seen and this would be clutter.
 */
export function AdminFirstRun() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  if (user?.role !== 'ADMIN') return null

  const plan = user.organization?.subscriptionPlan
  const orgName = user.organization?.name?.trim()

  const cards: { label: string; body: string; to: string }[] = [
    { label: 'People', body: 'Everyone with an account, and who leads what.', to: '/org/members' },
    { label: 'Connect', body: 'Bring your own systems in, or send Groundwork out.', to: '/org/integrations' },
    { label: 'Billing', body: plan ? 'Your plan, invoices, and the card on file.' : 'Move off the free tier when your team outgrows it.', to: '/billing' },
    { label: 'Settings', body: 'Your organisation, notifications, and what people see.', to: '/settings' },
  ]

  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 14, background: 'var(--gw-card)', padding: '22px 24px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)' }}>
          You are the admin{orgName ? ` for ${orgName}` : ''}
        </div>
        {/* THE PLAN, NAMED. There was no plan step at signup and no plan named anywhere after it. */}
        <button
          onClick={() => navigate('/billing')}
          style={{
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            borderRadius: 20, padding: '4px 12px',
            background: plan ? 'var(--gw-blue-bg)' : 'var(--gw-green-bg)',
            color: plan ? 'var(--gw-navy)' : 'var(--gw-green-t)',
            border: `1px solid ${plan ? 'var(--gw-blue-b)' : 'var(--gw-green-b)'}`,
          }}
        >
          {plan ? `On the ${String(plan).toLowerCase().replace(/_/g, ' ')} plan` : 'On the free plan'}
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16, maxWidth: 560 }}>
        Setting up a check-in is one part of this, and it does not have to be the first. These are yours to
        set up whenever you want them, and they are always in the menu on the left.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {cards.map(c => (
          <button
            key={c.to}
            onClick={() => navigate(c.to)}
            style={{
              textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{c.body}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

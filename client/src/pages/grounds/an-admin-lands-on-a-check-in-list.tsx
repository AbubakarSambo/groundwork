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

  /*
   * FOUR LINKS NEED FOUR LABELS, NOT FOUR SENTENCES.
   *
   * The first version wrote a line of prose under each one and three sentences above them, and the
   * verdict was "sounds like AI". It was: every card explained itself at the length of a paragraph
   * when the word on the card already said it. Say what the page is for in three or four words, or
   * say nothing.
   */
  const cards: { label: string; body: string; to: string }[] = [
    { label: 'People', body: 'Add your team', to: '/org/members' },
    { label: 'Connect', body: 'API and integrations', to: '/org/integrations' },
    { label: 'Billing', body: plan ? 'Plan and invoices' : 'Free plan, 10 check-ins', to: '/billing' },
    { label: 'Settings', body: 'Org details and notifications', to: '/settings' },
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
        {/* This said the menu is "always in the menu on the left" while the menu was not rendering
            at all, which is the worst kind of wrong copy: confident about the thing in front of you
            that is not there. */}
        Also in the menu, any time.
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

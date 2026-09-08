import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * WHAT AN ORG ADMIN SEES FIRST, WHICH IS A ROLLOUT AND NOT A CHECK-IN.
 *
 * The first version of this file put People, Connect, Billing and Settings on the landing screen,
 * because signing up as an admin dropped you on an empty check-in list with one button on it and
 * the whole of an admin's job was behind a hamburger icon. That was right as far as it went.
 *
 * It did not go far enough, and the person who signed up said why:
 *
 *   "I need to come and put my whole org of 160 people on this, give leads the ability to set up
 *    grounds, train them, pay for it, add my team as sub admins, see usage, and know if the API
 *    will work for us."
 *
 * None of that is a link to a page. It is a sequence with a finish line, and the four cards could
 * not say which parts of it were done. So this is the same idea, doing the job properly: the steps
 * of a rollout, each one reporting whether the thing itself actually happened.
 *
 * IT NO LONGER DISAPPEARS. The old one hid as soon as there was a check-in, on the grounds that it
 * would be clutter. But the admin's job does not finish when the first check-in opens - that is step
 * two of five - and hiding the list at that moment is hiding it exactly when it starts being useful.
 * It shrinks instead, and goes away when the rollout is genuinely finished.
 */

interface RolloutFacts {
  people: number
  admins: number
  checkIns: number
  paying: boolean
  connected: boolean
}

interface Step { key: string; title: string; body: string; to: string; done: boolean; optional?: boolean }

/*
 * THE STEPS ARE DECIDED SERVER SIDE and this renders them. The rule for what counts as done is a
 * product decision about somebody's rollout, not a detail of this screen, and two copies of it -
 * one here, one there - is how a page ends up ticking a step the product does not consider done.
 */
function fetchRollout(): Promise<RolloutFacts> {
  return apiClient.get('/users/rollout').then(r => r.data.data ?? r.data)
}

/* Mirrors the server's own list. Kept in one place here: see `where-a-rollout-has-got-to.ts`. */
function theRollout(f: RolloutFacts): Step[] {
  return [
    { key: 'people', title: 'Get your people in', body: 'Paste your list. Nobody is emailed until you have seen what will happen.', to: '/org/members', done: f.people > 1 },
    { key: 'pilot', title: 'Run one with somebody', body: 'Pick something real and small. You see what it produces before your team does.', to: '/grounds/new', done: f.checkIns > 0 },
    { key: 'second-admin', title: 'Give somebody else the keys', body: 'A second admin approves check-ins and adds people when you are not there.', to: '/org/members', done: f.admins > 1 },
    { key: 'plan', title: 'Choose your plan', body: 'What it costs for the number of people you are putting on.', to: '/billing', done: f.paying },
    { key: 'connect', title: 'Connect your systems', body: 'Your CRM, your HR system, your own product. Your engineers will want this page.', to: '/org/integrations', done: f.connected, optional: true },
  ]
}

export function AdminFirstRun() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const { data } = useQuery({ queryKey: ['rollout'], queryFn: fetchRollout, enabled: isAdmin, retry: false })

  if (!isAdmin) return null

  const orgName = user.organization?.name?.trim()
  const steps = data ? theRollout(data) : []
  const counted = steps.filter(s => !s.optional)
  const done = counted.filter(s => s.done).length
  const finished = counted.length > 0 && done === counted.length

  /*
   * FINISHED MEANS GONE. A checklist with every box ticked is a trophy, and a trophy at the top of
   * a screen somebody opens every morning is clutter that used to be useful.
   */
  if (!data || finished) return null

  /* The next thing to do, which is the only step most people will read. */
  const next = steps.find(s => !s.done && !s.optional)

  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 14, background: 'var(--gw-card)', padding: '20px 22px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 3 }}>
        {/* A heading, not a div that looks like one: this names the section under the page's h1,
            and heading navigation is how most screen reader users move around a page. */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', margin: 0 }}>
          Setting up{orgName ? ` ${orgName}` : ''}
        </h2>
        {/*
          * PROGRESS AS A FACT, not a bar. "2 of 4" is read in the time it takes to look at it, and
          * a percentage of a four-item list is a decoration pretending to be information.
          */}
        {/*
          * "1 of 4" beside five cards reads as a bug, and it was not one - Connect is optional and
          * the counter was right to leave it out. Being right is not enough when the two numbers a
          * person can see disagree: the counter now says what it counts, and the optional card
          * carries a visible tag, so five cards and four needed stop contradicting each other.
          */}
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gw-sub)' }}>
          {done} of {counted.length} needed{steps.length > counted.length ? `, plus ${steps.length - counted.length} optional` : ''}
        </div>
      </div>
      {/*
        * NOT THE NEXT STEP'S OWN WORDS. This printed `next.body` and the first card printed the
        * same sentence three centimetres below it - the panel introducing itself by quoting the
        * thing it was about to show. Seen on the rendered page; it reads fine in the code.
        */}
      {/*
        AND WHOSE JOB IT IS DEPENDS ON WHETHER ANYBODY HAS DONE ANY OF IT.

        "Your job as the admin here" is the right sentence for the person who set the organisation
        up, and the wrong one for the SECOND admin - who arrives at an org where three of these are
        already ticked, one of them ticked BY HER OWN EXISTENCE ("give somebody else the keys"), and
        is told the whole list is her job. Walked as a second admin of a real organisation: the
        largest thing on her dashboard was a to-do list for work somebody else had finished.

        Nothing on this panel knows who did which step, and inventing that would mean a new record.
        What it does know is whether any of it is done - so it stops assigning the list to the
        reader once it is somebody's shared progress rather than a fresh org's first run.
      */}
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16, maxWidth: 560 }}>
        {done === 0
          ? 'Your job as the admin here. Each one is ticked by the thing actually happening, not by visiting the page.'
          : `Where ${orgName || 'this organisation'} has got to. Each one is ticked by the thing actually happening, not by visiting the page - and any admin's work ticks it, not only yours.`}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: 10 }}>
        {steps.map(s => (
          <button
            key={s.key}
            onClick={() => navigate(s.to)}
            style={{
              textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
              border: `1px solid ${s === next ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
              borderRadius: 10, background: 'white', padding: '12px 14px',
              /* Done steps stay visible and stop competing. Removing them loses the sense of a
                 sequence, which is the thing that tells somebody how much is left. */
              opacity: s.done ? 0.62 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <span style={{
                width: 15, height: 15, borderRadius: 8, flexShrink: 0, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                background: s.done ? 'var(--gw-green-bg)' : 'transparent',
                color: 'var(--gw-green-t)',
                border: `1px solid ${s.done ? 'var(--gw-green-b)' : 'var(--gw-border)'}`,
              }}>{s.done ? '✓' : ''}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.title}</span>
              {s.optional && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
                  padding: '2px 6px', borderRadius: 4, background: 'var(--gw-bg)',
                  color: 'var(--gw-sub)', border: '1px solid var(--gw-border)',
                }}>Optional</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
              {s.body}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { Link } from 'react-router-dom'
import { Button, Tag } from '@/components/gw/ui'
import { askNameFor } from '@/lib/ask-name'
import { WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS } from '@/lib/what-an-admin-cannot-read-without-access'

/**
 * WHAT A NEW ORGANISATION'S ADMIN SEES FIRST (A3 and C1, U.3): the welcome card and the prototype's
 * checklist, "Get <organisation> going". Hafsah decided on 26 September that a new organisation's
 * Today page shows these exactly as the prototype does, instead of a tour. U.3 built them on the
 * check-ins list; U.5 moved them onto Today (pages/today/TodayPage.tsx), where the prototype has them.
 *
 * THE CARD'S DOORS, as the prototype draws them under the heading: People, Connections, Suites, and
 * Plan and billing, each with its line. Suites came with its page (U.17). Connections names WhatsApp
 * only while WhatsApp is switched on in Groundwork.
 *
 * WHAT USED TO BE HELD, ANSWERED 29 September, item 11 conflict B. The welcome card's old sentence,
 * "You can see every board and report. They never see anyone's questions to Ask Groundwork, anyone's
 * own report, or a lead's private notes.", went further than decision 5 (an admin reads a performance
 * plan only with access to that check-in) and "They" pointed at nobody. Hafsah's exact sentence
 * replaces it, in the first person, naming the exceptions decision 5 now covers - a performance plan,
 * a promotion or a renewal alike, corrected the same day (item 11 answer 4): "You can see every board
 * and report, including what people said in them. You never see anyone's questions to Ask Groundwork,
 * anyone's own report, or a lead's private notes, and never a performance plan, promotion or renewal
 * unless given access to that check-in."
 *
 * WHAT IS OURS. The prototype's code has a line under each step and a "Do it" button; no screen
 * shows them, so only the step names, "Do it" and "Done" are used. "Connect WhatsApp (optional)" is
 * shown only while WhatsApp is switched on in Groundwork: while it is off, nothing mentions it.
 *
 * EVERY TICK IS A FACT FROM THE SERVER (GET /users/rollout): more people than the admin, a second
 * admin, a check-in, the organisation's own WhatsApp number switched on. It stays past the first
 * check-in and goes when every step is done. "Got it" is kept on the server, per person.
 *
 * It replaces "Setting up <organisation>", whose steps were ours. Choosing a plan and connecting your
 * systems stay where they always were, under the organisation's name in the sidebar.
 *
 * REBUILT FROM THE SHARED PARTS (group 2): `Button` and `Tag` from `components/gw/ui` in place of
 * the old kit, and the welcome card and checklist's own classes moved into `gw-ui.css` under the
 * `gwui-` prefix (`gwui-welcome-card`, `gwui-get-going`, and so on), in place of the old `gw-`
 * classes - no other change to what is drawn.
 */
interface RolloutFacts {
  people: number
  admins: number
  checkIns: number
  paying: boolean
  connected: boolean
  whatsappOn?: boolean
  whatsappConnected?: boolean
  welcomeCardSeen?: boolean
}

interface Step { key: string; title: string; to: string; done: boolean }

function fetchRollout(): Promise<RolloutFacts> {
  return apiClient.get('/users/rollout').then(r => r.data.data ?? r.data)
}

/**
 * THE PROTOTYPE'S THREE STEPS, in its order (decision 112, 7 October). This used to add a fourth,
 * "Connect WhatsApp (optional)", leading to the page that sets up an organisation's own number -
 * which made setting up an own number look like a normal early step, when Groundwork's own number
 * already works for everyone and needs no setup at all. Dropped. There is no served fact yet for
 * "the platform's WhatsApp is on but the organisation has not turned it on", so no "Turn on
 * WhatsApp" step is added in its place either; see docs/requests-to-engine.md.
 */
export function getItGoing(f: RolloutFacts): Step[] {
  return [
    { key: 'invite', title: 'Invite your team', to: '/org/members', done: f.people > 1 },
    { key: 'admin', title: 'Add a second admin', to: '/org/members', done: f.admins > 1 },
    { key: 'checkin', title: 'Start your first check-in', to: '/start', done: f.checkIns > 0 },
  ]
}

/**
 * THE WELCOME CARD'S DOORS, AS PLAIN SENTENCES (group 2's review, fault C). Each line used to be a
 * fragment ("Invite people, set roles and teams, let guests in"); each is now one full sentence that
 * says what is true, with no piece joined on by a comma standing in for a missing word.
 */
export function doorsFor(f: Pick<RolloutFacts, 'whatsappOn'>): { title: string; line: string; to: string }[] {
  return [
    { title: 'People', line: 'Invite people, set their roles and teams, and let guests in.', to: '/org/members' },
    {
      title: 'Connections',
      /* SCREEN FAULT 3: "and use your own address" named a feature Connections does not offer -
         `ConnectionsPage.tsx` leaves "Your own address" out entirely (Hafsah, 29 September, item
         11), on purpose, because nothing behind it is built. This names what the page actually
         offers instead: WhatsApp, your numbers, and the people/goals/roles/handbook/API
         connections under "More you can connect".
         DECISION 112: "Connect WhatsApp" used to promise setting up an organisation's own number.
         Groundwork's own number already works for everyone once an admin turns WhatsApp on, so
         this says "Turn on WhatsApp" instead - true whether or not the organisation ever connects
         a number of its own. */
      line: f.whatsappOn ? 'Turn on WhatsApp, bring in your numbers, and connect your other tools.' : 'Bring in your numbers, and connect your other tools.',
      to: '/settings/connections',
    },
    { title: 'Suites', line: 'Switch on leave, spending and onboarding when you need them.', to: '/settings/suites' },
    { title: 'Plan and billing', line: 'Your seats, your card and your invoices.', to: '/billing' },
  ]
}

export function AdminFirstRun() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const { data } = useQuery({ queryKey: ['rollout'], queryFn: fetchRollout, enabled: isAdmin, retry: false })
  const gotIt = useMutation({
    mutationFn: () => apiClient.post('/users/me/welcome-card/seen'),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['rollout'] }) },
    /* The product's own sentence for a press that did not land; the card stays, so they can press again. */
    onError: () => toast.error('That did not go through, and nothing has changed. Try again.'),
  })
  if (!isAdmin || !data) return null

  const realOrgName = user.organization?.name?.trim() || user.organizationName
  const orgName = realOrgName || 'your organisation'
  const steps = getItGoing(data)
  const done = steps.filter(s => s.done).length
  const finished = done === steps.length
  const showWelcome = !data.welcomeCardSeen && !gotIt.isSuccess

  if (finished && !showWelcome) return null

  return (
    <div className="gwui-first-run">
      {showWelcome && (
        <section className="gwui-welcome-card" aria-label="Welcome">
          {/*
            SCREEN FAULT 7: "GOT IT" SAT BETWEEN THE TITLE AND THE BODY, so a new admin's card
            invited them to dismiss it before they had read it. Moved to its own row after the
            doors, below everything the card actually says.
          */}
          <div className="gwui-welcome-card-head">
            <h2>You’re an admin at {orgName}</h2>
          </div>
          <p className="gwui-welcome-card-line">
            You can see every board and report, including what people said in them. You never see anyone’s
            questions to {askNameFor(realOrgName)}, anyone’s own report, or a lead’s private notes, and never
            {' '}{WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS} unless given access to that check-in.
          </p>
          <ul className="gwui-welcome-doors">
            {doorsFor(data).map(d => (
              <li key={d.to}>
                <Link to={d.to} className="gwui-welcome-door">
                  <b>{d.title}</b>
                  <span>{d.line}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button kind="quiet" size="small" onClick={() => gotIt.mutate()} disabled={gotIt.isPending}>Got it</Button>
          </div>
        </section>
      )}
      {!finished && (
        <section className="gwui-get-going">
          <div className="gwui-get-going-head">
            <h2>Get {orgName} going</h2>
            <span>{done} of {steps.length} done</span>
          </div>
          <ul>
            {steps.map(s => (
              <li key={s.key}>
                <span className="gwui-get-going-title">{s.title}</span>
                {s.done ? <Tag tone="proven">Done</Tag> : <Button kind="secondary" size="small" to={s.to}>Do it</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

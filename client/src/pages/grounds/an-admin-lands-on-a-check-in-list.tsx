import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { Link } from 'react-router-dom'
import { Button, Tag } from '@/components/gw/kit'

/**
 * WHAT A NEW ORGANISATION'S ADMIN SEES FIRST (A3 and C1, U.3): the welcome card and the prototype's
 * checklist, "Get <organisation> going". Hafsah decided on 26 September that a new organisation's
 * Today page shows these exactly as the prototype does, instead of a tour. U.3 built them on the
 * check-ins list; U.5 moved them onto Today (pages/today/TodayPage.tsx), where the prototype has them.
 *
 * THE CARD'S DOORS, as the prototype draws them under the heading: People, Connections, Suites, and
 * Plan and billing, each with its line. Suites is left out until the Suites page exists (U.17), so no
 * door leads nowhere. Connections names WhatsApp only while WhatsApp is switched on in Groundwork.
 *
 * WHAT IS HELD. The welcome card's sentence "You can see every board and report. They never see
 * anyone's questions to Ask Groundwork, anyone's own report, or a lead's private notes." goes further
 * than the rule for people and access (an admin reads a performance plan or exact words only with
 * access to that check-in), and "They" points at nobody. It is left out until Hafsah decides, so the
 * card says who they are and "Got it".
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

/** The prototype's four steps, in its order. The WhatsApp one only while WhatsApp is on. */
export function getItGoing(f: RolloutFacts): Step[] {
  const steps: Step[] = [
    { key: 'invite', title: 'Invite your team', to: '/org/members', done: f.people > 1 },
    { key: 'admin', title: 'Add a second admin', to: '/org/members', done: f.admins > 1 },
    { key: 'checkin', title: 'Start your first check-in', to: '/start', done: f.checkIns > 0 },
  ]
  if (f.whatsappOn) steps.push({ key: 'wa', title: 'Connect WhatsApp (optional)', to: '/org/integrations', done: !!f.whatsappConnected })
  return steps
}

/** The welcome card's doors, in the prototype's words. Connections names WhatsApp only while it is on. */
export function doorsFor(f: Pick<RolloutFacts, 'whatsappOn'>): { title: string; line: string; to: string }[] {
  return [
    { title: 'People', line: 'Invite people, set roles and teams, let guests in', to: '/org/members' },
    { title: 'Connections', line: f.whatsappOn ? 'WhatsApp, your numbers, your own address' : 'Your numbers, your own address', to: '/org/integrations' },
    { title: 'Plan and billing', line: 'Seats, the card and invoices', to: '/billing' },
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

  const orgName = user.organization?.name?.trim() || user.organizationName || 'your organisation'
  const steps = getItGoing(data)
  const done = steps.filter(s => s.done).length
  const finished = done === steps.length
  const showWelcome = !data.welcomeCardSeen && !gotIt.isSuccess

  if (finished && !showWelcome) return null

  return (
    <div className="gw-first-run">
      {showWelcome && (
        <section className="gw-welcome-card" aria-label="Welcome">
          <div className="gw-welcome-card-head">
            <h2>You’re an admin at {orgName}</h2>
            <Button kind="quiet" size="small" onClick={() => gotIt.mutate()} disabled={gotIt.isPending}>Got it</Button>
          </div>
          <ul className="gw-welcome-doors">
            {doorsFor(data).map(d => (
              <li key={d.to}>
                <Link to={d.to} className="gw-welcome-door">
                  <b>{d.title}</b>
                  <span>{d.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!finished && (
        <section className="gw-get-going">
          <div className="gw-get-going-head">
            <h2>Get {orgName} going</h2>
            <span>{done} of {steps.length} done</span>
          </div>
          <ul>
            {steps.map(s => (
              <li key={s.key}>
                <span className="gw-get-going-title">{s.title}</span>
                {s.done ? <Tag tone="proven">Done</Tag> : <Button kind="secondary" size="small" to={s.to}>Do it</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

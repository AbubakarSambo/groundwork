import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { Link } from 'react-router-dom'
import { Button, Tag } from '@/components/gw/ui'
import { aRealOrganisationName } from '@/lib/ask-name'

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
 * TAKEN OFF THE FIRST SCREEN (Hafsah, 30 October 2026, first-experience round 1). Four of four
 * impatient admins called that paragraph a waste: it explained the product before they had done
 * anything, and the prototype's Today (C1 today-admin) has no such line. The sentence is unchanged
 * and still reachable where the prototype puts it, in the guide for leads and admins
 * (pages/org/LeadsGuidePage.tsx, F3 guide) and on a person's own page (OnePersonPage.tsx).
 *
 * WHAT IS OURS. The prototype's code has a line under each step and a "Do it" button; no screen
 * shows them. Two "Do it" buttons side by side told an impatient admin nothing (Hafsah, 30 October
 * 2026, first-experience round 1), so each button now says what it does: "Invite people", "Add an
 * admin", "Start a check-in". "Connect WhatsApp (optional)" is
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

interface Step { key: string; title: string; button: string; to: string; done: boolean }

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
    { key: 'invite', title: 'Invite your team', button: 'Invite people', to: '/org/members', done: f.people > 1 },
    { key: 'admin', title: 'Add a second admin', button: 'Add an admin', to: '/org/members', done: f.admins > 1 },
    { key: 'checkin', title: 'Start your first check-in', button: 'Start a check-in', to: '/start', done: f.checkIns > 0 },
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

  const realOrgName = aRealOrganisationName(user.organization?.name?.trim() || user.organizationName)
  const orgName = realOrgName || 'your organisation'
  const steps = getItGoing(data)
  const done = steps.filter(s => s.done).length
  /* F5, stage 8: the checklist moves off Today once a check-in exists ("in the way" on day one); People still adds an admin. */
  const finished = done === steps.length || data.checkIns > 0
  const showWelcome = !data.welcomeCardSeen && !gotIt.isSuccess

  if (finished && !showWelcome) return null

  return (
    <div className="gwui-first-run">
      {/* ONE LINE, NOT A GUIDE (page audit, 24 November 2026, row 10): the four doors are under the organisation's name in the side
          rail, and People is where an admin starts. Pressing it is also "Got it", kept on the server, so it does not come back. */}
      {showWelcome && (
        <p className="ds-text-secondary" aria-label="Welcome">
          You’re an admin.{' '}
          <Link to="/org/members" className="gwui-plain-link" onClick={() => gotIt.mutate()}>Set things up</Link>
        </p>
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
                {s.done ? <Tag tone="proven">Done</Tag> : <Button kind="secondary" size="small" to={s.to}>{s.button}</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

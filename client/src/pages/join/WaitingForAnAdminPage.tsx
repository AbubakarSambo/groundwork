import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { authApi, type MyWaiting } from '@/api/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, Mark, PageTitle, Button, Note, Steps, Step, Stack } from '@/components/gw/ui'

/**
 * "ALMOST IN" (A3, #/join/waiting). The words are join-waiting.txt's, with three changes said here:
 *
 *   - "We'll email and text you": there are no text messages yet, so it says "email" only.
 *   - "Usually within a day" is left out: nothing in the product knows how quickly an admin answers.
 *   - "she" and "her" become the admin's name: the product does not know anybody's pronouns.
 *
 * The admin is named only when the person accepted a real invitation (Hafsah, 26 September); after a
 * link shared with many people it says "an admin" and offers no reminder. Which admin, and the once a
 * day rule for "Remind", are the server's (who-is-waiting-at-the-door.service.ts).
 *
 * Rebuilt from `components/gw/ui` only (design-audit.md section 4; the invitation task): the small
 * `Mark`, `PageTitle`, `Steps` in place of the old `gw-steps` list, and the standard `Button`.
 *
 * Hafsah's first review (U.20 sixth round): the title's line reads in ink, as the prototype has it
 * (`subtitleTone="ink"`); `Steps` sits 18px below it, not the page's ordinary 30; "We'll email…" is
 * the prototype's 16px ink body line, not the 13.5px muted `Note`.
 *
 * "SIGN OUT" WAS DROPPED, THEN PUT BACK (Hafsah's re-review, U.20 eighth round). It was removed
 * because join-waiting.jpg has none, but that left a waiting person with no way out at all: this
 * route has no sidebar while somebody waits (`AppShell`'s `CHROMELESS` list), so nothing on the
 * screen could take them to `/signout`, and it is only reachable by typing the address - a real gap
 * on a shared computer. Hafsah's decision: keep a quiet "Not you? Sign out." link, a small,
 * deliberate difference from the prototype, for safety, not a fidelity gap.
 */
export function WaitingForAnAdminPage() {
  const qc = useQueryClient()
  const [problem, setProblem] = useState('')
  const [reminded, setReminded] = useState(false)
  /**
   * B-202 (review round 2): ASKS AGAIN ON ITS OWN, SO BEING LET IN TURNS THIS SCREEN INTO "YOU'RE
   * IN" WITHOUT NEEDING TO BE REFRESHED.
   *
   * Nothing here used to ask the server a second time: once "Almost in" had loaded, it stayed on
   * screen - unchanged - for as long as the tab was open, even after an admin let them in. A plain
   * reload would have picked up the change, but this page is the one place in the product that
   * explicitly asks somebody to wait, and a screen that asks somebody to wait has to notice the
   * wait ending by itself. Every 30 seconds, and again the moment the tab is shown after being
   * hidden (switching back from another app, or back to this tab), rather than only while it is
   * being looked at the whole time.
   */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-waiting'],
    queryFn: authApi.myWaiting,
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  /* Whether this page has seen them waiting, so being let in later is told, and never waiting is not. */
  const sawWaiting = useRef(false)

  const remind = useMutation({
    mutationFn: authApi.remindAboutMyWaiting,
    onSuccess: () => { setReminded(true); setProblem(''); void qc.invalidateQueries({ queryKey: ['my-waiting'] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That reminder did not send. Try again.'),
  })

  if (isLoading) return <Page narrow><Mark /><PageTitle title="Almost in" subtitle="One moment." subtitleTone="ink" /></Page>
  if (isError || !data) {
    return <Page narrow><Mark /><PageTitle title="Almost in" subtitle="We could not read where your request has got to. Reload the page to try again." subtitleTone="ink" /></Page>
  }
  /*
   * NOT WAITING (U.3 review). "You're in. Nobody needs to let you in any more." read oddly to somebody
   * who never waited. So: somebody this page saw waiting, and who has since been let in, is told so
   * plainly; anybody else who reaches this address was never waiting, and goes to Today.
   */
  if (!data.waiting) {
    if (!sawWaiting.current) return <Navigate to="/today" replace />
    return (
      <Page narrow>
        <Mark />
        <PageTitle title="You’re in" subtitle="An admin has let you in. You can open your check-ins now." subtitleTone="ink" />
        <Button to="/grounds" size="big" wide>Open my check-ins</Button>
      </Page>
    )
  }
  sawWaiting.current = true

  const w = data
  const admin = w.admin
  const who = admin?.firstName || admin?.name || null
  const canRemindNow = new Date(w.canRemindFrom).getTime() <= Date.now()

  return (
    <Page narrow>
      <Mark />
      <Stack gap={18}>
        <PageTitle title="Almost in" subtitle={youAreFromOutside(w)} subtitleTone="ink" />
        <Steps>
          <Step done>{admin ? 'You accepted the invitation' : 'You asked to join'}</Step>
          <Step done>{`${who ?? 'An admin'} was asked, ${whenItWasAsked(w.askedAt)}`}</Step>
          <Step>{`${who ?? 'An admin'} lets you in`}</Step>
        </Steps>
        <p className="gwui-pt-sub gwui-pt-sub-ink">
          {/* B-147 follow-up: the prototype's own exact sentence (A3-organisations-and-joining/
              join-waiting.txt) says "check-in" here, not "session" - left as the prototype has
              it rather than swept into the session rename. */}
          {`We’ll email you the moment ${who ?? 'they do'}${who ? ' does' : ''}, and your first check-in will be waiting.`}
        </p>
      </Stack>

      {problem && <Note tone="error">{problem}</Note>}
      {reminded && <Note>{`We reminded ${who}.`}</Note>}

      {admin && who && (
        <Stack gap={10}>
          <Button kind="secondary" size="big" wide onClick={() => remind.mutate()} disabled={remind.isPending || reminded || !canRemindNow}>
            {`Remind ${who}`}
          </Button>
          <p className="gwui-fine" style={{ textAlign: 'center' }}>
            {`You can remind ${who} once a day.`}{w.inviterFirstName ? ` ${w.inviterFirstName} can see you’re waiting too.` : ''}
          </p>
        </Stack>
      )}

      {/*
        A WAY OUT (Hafsah's decision, re-review: not the prototype's - this route has no sidebar
        while somebody waits (AppShell's CHROMELESS list), so without this a person on a shared
        computer who is not who this waiting request is for has no way to leave the account
        signed in. Recorded here as a deliberate, small difference from join-waiting.jpg, for
        safety, not a fidelity gap.
      */}
      <p style={{ textAlign: 'center' }}>
        <Button kind="quiet" to="/signout">Not you? Sign out.</Button>
      </p>
    </Page>
  )
}

/**
 * "You're from outside Baridi Appliances, so an admin there has to let you in. We've asked Grace
 * Achieng." OR, when the true reason is that the plan simply has no free seat - which is not the
 * same thing as being a stranger, and was said as though it were - "Kilima Traders U8 has no free
 * seat right now, so an admin there has to make room before you can start. We've asked Grace
 * Achieng."
 */
export function youAreFromOutside(w: Pick<Extract<MyWaiting, { waiting: true }>, 'organisationName' | 'admin' | 'heldForASeat' | 'says'>): string {
  /* The server's own sentence when it sends one (B-096; journey test, 12 October): Pia, on Brightloom's own
     address, was told "You're from outside Brightloom" because this page always built the outsider sentence. */
  if (w.says?.trim()) return w.says
  const asked = w.admin?.name ? ` We’ve asked ${w.admin.name}.` : ' We’ve asked the admins there.'
  if (w.heldForASeat) {
    return `${w.organisationName} has no free seat right now, so an admin there has to make room before you can start.${asked}`
  }
  return `You’re from outside ${w.organisationName}, so an admin there has to let you in.${asked}`
}

/**
 * "yesterday at 4:12pm", "today at 9:05am", or "on 20 September at 4:12pm" - the prototype's own
 * way of writing a time (join-waiting.txt: "Grace was asked, yesterday at 4:12pm"), not the 24-hour
 * clock `whenItWas(d, 'time')` gives. Hafsah's first review, U.20 seventh round: it read "yesterday
 * at 22:21". Same trick as `what-the-end-of-a-check-in-can-say.ts`'s `aTime`: the shared formatter's
 * `hourOfDay` purpose, its space and leading zero stripped, lower-cased.
 */
export function whenItWasAsked(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const time = whenItWas(d, 'hourOfDay').replace(/\s/g, '').replace(':00', '').toLowerCase()
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86_400_000)
  if (diff === 0) return `today at ${time}`
  if (diff === 1) return `yesterday at ${time}`
  return `on ${whenItWas(d, 'dayAndMonthLong')} at ${time}`
}

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { authApi, type MyWaiting } from '@/api/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, Mark, PageTitle, Button, Note, Steps, Step } from '@/components/gw/ui'

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
 */
export function WaitingForAnAdminPage() {
  const qc = useQueryClient()
  const [problem, setProblem] = useState('')
  const [reminded, setReminded] = useState(false)
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-waiting'], queryFn: authApi.myWaiting, retry: false })
  /* Whether this page has seen them waiting, so being let in later is told, and never waiting is not. */
  const sawWaiting = useRef(false)

  const remind = useMutation({
    mutationFn: authApi.remindAboutMyWaiting,
    onSuccess: () => { setReminded(true); setProblem(''); void qc.invalidateQueries({ queryKey: ['my-waiting'] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That reminder did not send. Try again.'),
  })

  if (isLoading) return <Page narrow><Mark caption="Waiting for an admin" /><PageTitle title="Almost in" subtitle="One moment." /></Page>
  if (isError || !data) {
    return <Page narrow><Mark caption="Waiting for an admin" /><PageTitle title="Almost in" subtitle="We could not read where your request has got to. Reload the page to try again." /></Page>
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
        <Mark caption="Waiting for an admin" />
        <PageTitle title="You’re in" subtitle="An admin has let you in. You can open your check-ins now." />
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
      <Mark caption="Waiting for an admin" />
      <PageTitle title="Almost in" subtitle={youAreFromOutside(w)} />

      <Steps>
        <Step done>{admin ? 'You accepted the invitation' : 'You asked to join'}</Step>
        <Step done>{`${who ?? 'An admin'} was asked, ${whenItWasAsked(w.askedAt)}`}</Step>
        <Step>{`${who ?? 'An admin'} lets you in`}</Step>
      </Steps>

      <Note>
        {`We’ll email you the moment ${who ?? 'they do'}${who ? ' does' : ''}, and your first check-in will be waiting.`}
      </Note>

      {problem && <Note tone="error">{problem}</Note>}
      {reminded && <Note>{`We reminded ${who}.`}</Note>}

      {admin && who && (
        <>
          <Button kind="secondary" size="big" wide onClick={() => remind.mutate()} disabled={remind.isPending || reminded || !canRemindNow}>
            {`Remind ${who}`}
          </Button>
          <p className="gwui-note" style={{ textAlign: 'center' }}>
            {`You can remind ${who} once a day.`}{w.inviterFirstName ? ` ${w.inviterFirstName} can see you’re waiting too.` : ''}
          </p>
        </>
      )}
      <p className="gwui-note" style={{ textAlign: 'center' }}><Link to="/signout">Sign out</Link></p>
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
export function youAreFromOutside(w: Pick<Extract<MyWaiting, { waiting: true }>, 'organisationName' | 'admin' | 'heldForASeat'>): string {
  const asked = w.admin?.name ? ` We’ve asked ${w.admin.name}.` : ' We’ve asked the admins there.'
  if (w.heldForASeat) {
    return `${w.organisationName} has no free seat right now, so an admin there has to make room before you can start.${asked}`
  }
  return `You’re from outside ${w.organisationName}, so an admin there has to let you in.${asked}`
}

/** "yesterday at 16:12", "today at 09:05", or "on 20 September at 16:12", in the shared date format. */
export function whenItWasAsked(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const time = whenItWas(d, 'time')
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86_400_000)
  if (diff === 0) return `today at ${time}`
  if (diff === 1) return `yesterday at ${time}`
  return `on ${whenItWas(d, 'dayAndMonthLong')} at ${time}`
}

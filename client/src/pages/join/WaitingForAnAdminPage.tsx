import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { authApi, type MyWaiting } from '@/api/auth'
import { Button } from '@/components/gw/kit'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { AuthCard, AuthError, AuthNotice } from '@/pages/auth/auth-kit'

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
 */
export function WaitingForAnAdminPage() {
  const qc = useQueryClient()
  const [problem, setProblem] = useState('')
  const [reminded, setReminded] = useState(false)
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-waiting'], queryFn: authApi.myWaiting, retry: false })

  const remind = useMutation({
    mutationFn: authApi.remindAboutMyWaiting,
    onSuccess: () => { setReminded(true); setProblem(''); void qc.invalidateQueries({ queryKey: ['my-waiting'] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That reminder did not send. Try again.'),
  })

  if (isLoading) return <AuthCard title="Almost in" sub="One moment." />
  if (isError || !data) {
    return <AuthCard title="Almost in" sub="We could not read where your request has got to. Reload the page to try again." />
  }
  if (!data.waiting) {
    return (
      <AuthCard title="You’re in" sub="Nobody needs to let you in any more.">
        <div className="gw-auth-actions"><Button to="/grounds" wide size="big">Open my check-ins</Button></div>
      </AuthCard>
    )
  }

  const w = data
  const admin = w.admin
  const who = admin?.firstName || admin?.name || null
  const canRemindNow = new Date(w.canRemindFrom).getTime() <= Date.now()

  return (
    <AuthCard title="Almost in" sub={youAreFromOutside(w)}>
      <ol className="gw-steps">
        <li className="done"><span aria-hidden>✓</span><span className="gw-sr-only">Done. </span>{admin ? 'You accepted the invitation' : 'You asked to join'}</li>
        <li className="done"><span aria-hidden>✓</span><span className="gw-sr-only">Done. </span>{who ?? 'An admin'} was asked, {whenItWasAsked(w.askedAt)}</li>
        <li><span aria-hidden>○</span><span className="gw-sr-only">Still to happen. </span>{who ?? 'An admin'} lets you in</li>
      </ol>
      <p className="gw-auth-sub" style={{ marginTop: 16 }}>
        We’ll email you the moment {who ?? 'they do'}{who ? ' does' : ''}, and your first check-in will be waiting.
      </p>

      {problem && <AuthError>{problem}</AuthError>}
      {reminded && <AuthNotice>{`We reminded ${who}.`}</AuthNotice>}

      {admin && who && (
        <>
          <div className="gw-auth-actions">
            <Button kind="secondary" wide size="big" onClick={() => remind.mutate()} disabled={remind.isPending || reminded || !canRemindNow}>
              {`Remind ${who}`}
            </Button>
          </div>
          <p className="gw-auth-small" style={{ textAlign: 'center' }}>
            {`You can remind ${who} once a day.`}{w.inviterFirstName ? ` ${w.inviterFirstName} can see you’re waiting too.` : ''}
          </p>
        </>
      )}
      <p className="gw-auth-small" style={{ textAlign: 'center' }}><Link to="/signout" className="gw-auth-link">Sign out</Link></p>
    </AuthCard>
  )
}

/** "You're from outside Baridi Appliances, so an admin there has to let you in. We've asked Grace Achieng." */
export function youAreFromOutside(w: Pick<Extract<MyWaiting, { waiting: true }>, 'organisationName' | 'admin'>): string {
  const asked = w.admin?.name ? ` We’ve asked ${w.admin.name}.` : ' We’ve asked the admins there.'
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

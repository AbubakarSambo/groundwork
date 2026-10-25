import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api/participants'
import { useAuthStore } from '@/stores/auth'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { YourNextCheckIn } from '@/components/gw/YourNextCheckIn'

/**
 * THE END OF AN UPDATE, FOR THE PERSON WHO JUST GAVE IT.
 *
 * Hafsah, 22 September 2026: "the end is off, no way to really add my email if I am just an invited
 * person". Somebody who answered from a link landed straight on the board - a lead's instrument,
 * opening on "0 of 2 answered" - with nothing that said their answer had landed, where their report
 * would go, or how to change that. The board is still the right place to land (her words the day
 * before: "then it should take me to the team board"); this sits above it and says the three things.
 *
 * The address shown is the one on their row, which is whatever the lead typed. If it is not theirs,
 * they set it here, for themselves - see participants.controller `mine/email`.
 */
export function ThatIsOnTheRecord({ groundId }: { groundId: string }) {
  const user = useAuthStore((st) => st.user)
  const updateUser = useAuthStore((st) => st.updateUser)
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState('')
  const [nowAt, setNowAt] = useState<string | null>(null)
  const change = useMutation({
    mutationFn: () => participantsApi.updateMyEmail(groundId, email.trim()),
    onSuccess: (r) => {
      setNowAt(r.email)
      setEditing(false)
      if (r.signInMoved) updateUser({ email: r.email })
    },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })
  const at = nowAt ?? user?.email ?? null

  return (
    <section aria-label="Your answer is on the record" style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>That is on the record. Thank you.</div>
      <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 }}>
        {at
          ? <>When everybody has answered, the report goes to <strong style={{ color: 'var(--gw-text)' }}>{at}</strong>.</>
          : 'When everybody has answered, one report goes out with what each person said.'}
        {' '}Below is the team board, which fills in as the others answer.
      </p>
      <YourNextCheckIn groundId={groundId} />
      {!editing && (
        <button
          onClick={() => { setEditing(true); setProblem('') }}
          style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: 13, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
        >
          {at ? 'Not your address? Send it somewhere else' : 'Add an address for the report'}
        </button>
      )}
      {editing && (
        <div style={{ marginTop: 10 }}>
          <label htmlFor="record-email" style={{ display: 'block', fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 4 }}>Where should your report go?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="gwui-input"
              id="record-email" type="email" autoComplete="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setProblem('') }}
              placeholder="you@work.com"
              style={{ flex: '1 1 220px' }}
            />
            <button className="btn pri sm"
              onClick={() => { if (!looksLikeAnAddress(email)) { setProblem('That does not look like an email address.'); return } change.mutate() }}
              disabled={change.isPending || !email.trim()}
            >
              {change.isPending ? 'Saving…' : 'Send it there'}
            </button>
            <button className="btn sec sm" onClick={() => setEditing(false)} >
              Keep it
            </button>
          </div>
          {problem && <div role="alert" style={{ color: 'var(--gw-red-t)', fontSize: 13, marginTop: 6 }}>{problem}</div>}
        </div>
      )}
    </section>
  )
}

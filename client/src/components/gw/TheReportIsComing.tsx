import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api/participants'
import { useAuthStore } from '@/stores/auth'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { YourNextCheckIn } from '@/components/gw/YourNextCheckIn'

/**
 * THE END OF A ONE-QUESTION ANSWER, SAID BY GROUNDWORK IN THE CHAT (Hafsah, 15 November 2026, audit of the check-in pages, row 17).
 *
 * Somebody who answered one question from a team update's link used to be sent to the whole team board, under a card that said
 * "That is on the record." They now stay in the conversation, and its last line says the answer landed, where the report goes, and
 * when the next check-in opens. The address can still be changed from here, which is what the old card's form was for
 * (Hafsah, 22 September 2026: "no way to really add my email if I am just an invited person").
 */
export function TheReportIsComing({ groundId }: { groundId: string }) {
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
    <section aria-label="The report is coming">
      <p>
        {at
          ? <>Thanks. I will send the report to <strong>{at}</strong> when everyone has answered.</>
          : 'Thanks. When everyone has answered, one report goes out with what each person said.'}
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
          <label htmlFor="record-email" style={{ display: 'block', fontSize: 12, color: 'var(--gw-sub)', marginBottom: 4 }}>Where should your report go?</label>
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

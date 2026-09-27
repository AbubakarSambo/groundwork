import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'

/**
 * "INVITE PEOPLE" (A4 people.txt): one per line, a name and an email, or a list from a spreadsheet,
 * with the role they join as. "Send their invitations" checks the list first, on the same call the
 * send uses: when every line can go, it goes; when any line cannot (a typo, somebody already here,
 * no seat), the page shows what would happen to each one and sends only after that is read. An
 * admin never emails half a company without knowing which half.
 *
 * Left out of the prototype's wording while WhatsApp is off: "or a WhatsApp number" and "or a
 * WhatsApp message". Left out entirely: "Guest", which is somebody from another organisation added
 * to one check-in, not somebody invited to the organisation.
 */
interface PastedRow { email: string; result: string }
interface PasteAnswer { preview: boolean; seatsLeft: number | null; rows: PastedRow[]; summary: string }

/*
 * TENSE FOLLOWS THE CALL. The same word for a check and a send left "Will be invited" on the screen
 * after the invitations had gone.
 */
const HOW_IT_READS: Record<string, { says: string; sent?: string; tone: 'good' | 'quiet' | 'bad' }> = {
  invited: { says: 'Will be invited', sent: 'Invited', tone: 'good' },
  'already here': { says: 'Already here', tone: 'quiet' },
  repeated: { says: 'Listed twice', tone: 'quiet' },
  'not an email': { says: 'Not an email address', tone: 'bad' },
  'no seat': { says: 'No seat on your plan', tone: 'bad' },
}

const ROLES = [
  ['MEMBER', 'Takes part'],
  ['LEAD', 'Can open check-ins'],
  ['ADMIN', 'Admin'],
] as const

function pasteMany(pasted: string, preview: boolean, role: string): Promise<PasteAnswer> {
  return apiClient.post('/users/invitations', { pasted, preview, role }).then((r) => r.data.data ?? r.data)
}

export function InvitePeople() {
  const qc = useQueryClient()
  const [pasted, setPasted] = useState('')
  const [role, setRole] = useState<string>('MEMBER')
  const [answer, setAnswer] = useState<PasteAnswer | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const send = useMutation({
    mutationFn: () => pasteMany(pasted, false, role),
    onSuccess: (a) => {
      setAnswer(a)
      setPasted('')
      qc.invalidateQueries({ queryKey: ['org-members'] })
      /* And the head count, "N people, on the … plan", which went stale until a reload (U.4 review). */
      qc.invalidateQueries({ queryKey: ['billing-status-people'] })
      toast.success(a.summary)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'None of those invitations went out, and nobody has been emailed. Try again.'),
  })
  const check = useMutation({
    mutationFn: () => pasteMany(pasted, true, role),
    onSuccess: (a) => {
      /* Every line can go: send, as the prototype's one button does. Anything else: show it first. */
      if (a.rows.length > 0 && a.rows.every((r) => r.result === 'invited')) send.mutate()
      else setAnswer(a)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'We could not read that list. Try again.'),
  })

  const canGo = answer?.preview ? answer.rows.filter((r) => r.result === 'invited').length : 0

  return (
    <section className="gw-people-sec" id="invite-people" aria-labelledby="invite-h">
      <h2 id="invite-h">Invite people</h2>
      <div className="gw-people-card">
        <label htmlFor="invite-list" className="gw-people-label">One per line: a name and an email. Or paste a list from a spreadsheet.</label>
        <textarea
          id="invite-list"
          rows={4}
          value={pasted}
          onChange={(e) => { setPasted(e.target.value); setAnswer(null) }}
          placeholder={'Faith Kerubo, faith@yourcompany.com\nJoseph Kiprono, joseph@yourcompany.com'}
        />
        <div className="gw-people-actions">
          <label>
            Role{' '}
            <select value={role} onChange={(e) => { setRole(e.target.value); setAnswer(null) }} aria-label="Role">
              {ROLES.map(([v, w]) => <option key={v} value={v}>{w}</option>)}
            </select>
          </label>
          <button type="button" className="gw-btn" style={{ margin: 0 }} disabled={!pasted.trim() || check.isPending || send.isPending} onClick={() => check.mutate()}>
            {check.isPending || send.isPending ? 'Sending…' : 'Send their invitations'}
          </button>
          <button type="button" className="gw-link-btn" onClick={() => file.current?.click()}>Upload a list</button>
          <input
            ref={file}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            hidden
            aria-label="Upload a list"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const text = await f.text()
              setPasted((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text))
              setAnswer(null)
              e.target.value = ''
            }}
          />
        </div>
        <p className="gw-people-note">They’ll get an email with a link to set themselves up.</p>

        {answer && (
          <div className="gw-people-answer">
            <b>{answer.summary}</b>
            {answer.seatsLeft !== null && (
              <p className="gw-people-note">
                {`Your plan has room for ${answer.seatsLeft} more ${answer.seatsLeft === 1 ? 'person' : 'people'}.`}{' '}
                {answer.rows.some((r) => r.result === 'no seat') && <a href="/billing">See the plans</a>}
              </p>
            )}
            <div className="gw-people-rows">
              {answer.rows.map((r, i) => {
                const how = HOW_IT_READS[r.result] ?? { says: r.result, tone: 'quiet' as const }
                return (
                  <div key={`${r.email}-${i}`} className={`gw-people-rowline ${how.tone}`}>
                    <span>{r.email}</span>
                    <b>{answer.preview ? how.says : (how.sent ?? how.says)}</b>
                  </div>
                )
              })}
            </div>
            {answer.preview && canGo > 0 && (
              <button type="button" className="gw-btn" style={{ margin: '10px 0 0' }} disabled={send.isPending} onClick={() => send.mutate()}>
                {send.isPending ? 'Sending…' : canGo === 1 ? 'Send 1 invitation' : `Send ${canGo} invitations`}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

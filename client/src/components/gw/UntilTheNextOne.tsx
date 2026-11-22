import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { Composer } from './ui/Composer'
import { theNextOne, WRITE_ANYTHING_YOU_WANT_ME_TO_REMEMBER } from '@/lib/what-the-end-of-a-check-in-can-say'
import { whereAConversationLives } from '@/pages/grounds/ground-tabs'

/**
 * UNDER A FINISHED CONVERSATION, IN THE CHECK-IN TAB (Hafsah, 3 November, item 3b).
 *
 * "If not, the last conversation shows, with one quiet line at the bottom ('Your next check-in
 * opens tomorrow at 8am') and the box to add something." This is the line and the box, drawn as
 * the conversation card's foot, where the typing box was. No page in between.
 *
 * For a team member the box adds something for their next check-in (a note it will ask about).
 * For the lead, who checks in when she chooses (decision 133), writing here starts her check-in
 * with what she wrote ready to send: the box is the way in, so no "Check in yourself" button.
 * When the next check-in is already open, nothing is said about it: the Check-in tab opens it.
 *
 * WHAT WAS WRITTEN HERE STAYS ON SCREEN (release test, 21 November 2026, bug 13). Wairimu typed two messages into this box and saw nothing
 * but a toast that came and went, so they read as dropped until she pressed "Check in again". They were kept as notes all along. Each
 * note still waiting for a check-in is now shown under the box, with one sentence saying when it will be asked about.
 */
export function UntilTheNextOne({ groundId, myCheckIns, theLeadChecksInWhenSheChooses = false }: {
  groundId: string
  myCheckIns: { id: string; sessionNumber: number; status: string; availableFrom?: string | null }[] | null | undefined
  theLeadChecksInWhenSheChooses?: boolean
}) {
  const [draft, setDraft] = useState('')
  const qc = useQueryClient()
  const navigate = useNavigate()
  const next = theNextOne(myCheckIns, null)
  const { data: notes = [] } = useQuery({ queryKey: ['my-notes', groundId], queryFn: () => groundsApi.myNotes(groundId) })
  const waiting = (notes ?? []).filter(n => !n.carriedIntoCheckInId)

  const addNote = useMutation({
    mutationFn: (t: string) => groundsApi.addMyNote(groundId, t),
    onSuccess: () => {
      setDraft('')
      qc.invalidateQueries({ queryKey: ['my-notes', groundId] })
      toast.success('Noted. Your next check-in will ask you about it.')
    },
    onError: () => toast.error('The note didn’t save. Try again.'),
  })
  const checkIn = useMutation({
    mutationFn: () => groundsApi.checkInYourself(groundId),
    onSuccess: (r: { checkInId: string }) => navigate(whereAConversationLives(r.checkInId, groundId), { replace: true, state: { groundId, draft } }),
    onError: (err: any) => {
      const said = err?.response?.data?.message
      toast.error(typeof said === 'string' && said ? said : 'Your check-in did not open. Try again.')
    },
  })
  const busy = addNote.isPending || checkIn.isPending
  /* Typing only ever adds a note, for the lead as for everyone. A lead who wants to check in again says so with the link below the box, never as a side effect of typing. */
  const send = () => {
    const m = draft.trim()
    if (!m || busy) return
    addNote.mutate(m)
  }

  return (
    <div className="gwui-until-next" data-testid="until-the-next-one">
      {!theLeadChecksInWhenSheChooses && !next.openId && next.says && <p className="gwui-until-next-line">{next.says}</p>}
      <Composer
        value={draft}
        onChange={setDraft}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        onSend={send}
        disabled={busy}
        sendDisabled={!draft.trim() || busy}
        placeholder={WRITE_ANYTHING_YOU_WANT_ME_TO_REMEMBER}
        ariaLabel={WRITE_ANYTHING_YOU_WANT_ME_TO_REMEMBER}
        sendLabel="Send"
      />
      {waiting.length > 0 && (
        <div data-testid="kept-for-next-time">
          <p className="gwui-until-next-line">
            {theLeadChecksInWhenSheChooses
              ? `I kept ${waiting.length === 1 ? 'what you wrote' : 'everything you wrote'} here, and I will ask you about it when you check in again.`
              : `I kept ${waiting.length === 1 ? 'what you wrote' : 'everything you wrote'} here, and your next check-in will ask you about it.`}
          </p>
          {waiting.map(n => <p key={n.id} className="gwui-until-next-line">“{n.text}”</p>)}
        </div>
      )}
      {theLeadChecksInWhenSheChooses && (
        <p className="gwui-until-next-line">
          <button type="button" className="gwui-plain-link" onClick={() => checkIn.mutate()} disabled={busy}>Check in again</button>
        </p>
      )}
    </div>
  )
}

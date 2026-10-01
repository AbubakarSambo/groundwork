import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'
import { Section } from '@/components/gw/ui'

/**
 * WHAT YOU SAY YOU DELIVERED. The half of the record that did not exist.
 *
 * Everything on this page ran one way until now: the lead states what is expected of you, you read
 * it. A person could see the exact words they would be measured against and had nowhere at all to
 * put what they actually did - so their side of it only reached the record if they happened to say
 * it in a session, which quietly favours whoever speaks first and longest. That is the bias this
 * whole product was built against, sitting inside the product.
 *
 * IT IS NOT THEIR ACCOUNT, and the page has to say so or it becomes one. What is written here
 * reaches the next session as something to be ASKED about, and what they say under questioning is
 * what goes on record. A form that became the record would reward careful writing and check
 * nothing, which is a worse product than having no box at all - so the panel says, in plain words,
 * that this is a question waiting to be put to them, and shows when that has happened.
 *
 * The evidence field is not optional decoration. "I shipped it" and "I shipped it, PR 412, merged
 * Tuesday" are different kinds of sentence, and the engine is told to press hardest on the first.
 */
export function DeliveredPanel({
  groundId,
  expectations,
}: {
  groundId: string
  /** This person's own expectations, so a delivery can be filed against the words it answers. */
  expectations: { id: string; text: string }[]
}) {
  const qc = useQueryClient()
  const { data: deliveries = [] } = useQuery({
    queryKey: ['my-deliveries', groundId],
    queryFn: () => groundsApi.myDeliveries(groundId),
  })

  const [text, setText] = useState('')
  const [evidence, setEvidence] = useState('')
  const [against, setAgainst] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-deliveries', groundId] })

  const add = useMutation({
    mutationFn: () =>
      groundsApi.addDelivery(groundId, {
        text: text.trim(),
        evidence: evidence.trim() || undefined,
        objectiveId: against || undefined,
      }),
    onSuccess: () => { setText(''); setEvidence(''); setAgainst(''); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be saved.'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => groundsApi.deleteMyDelivery(groundId, id),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be taken back.'),
  })

  const textFor = (id: string | null) => expectations.find(e => e.id === id)?.text ?? null

  return (
    <div style={{ marginBottom: 16 }}>
      {/*
        THE SAME HEADING EVERY OTHER BAND USES.

        This was the one card on the page in navy bold inside its own white box, so a page of
        uppercase grey section labels had a single shouting exception in the middle of it. Nothing
        about this band is more important than the expectations above it - it is the answer to them.
      */}
      {/* REVIEW ROUND 3, "YOUR WORK": THE PROTOTYPE'S OWN WORDS (my-record.txt) - "say" matters
          here (see the comment at the top of this file: this is a claim waiting to be asked
          about, never the record itself), which "What you delivered" alone dropped. */}
      <Section heading="What you say you delivered" note="Your list, with what shows each one" />

      {/*
        THE CONTENT COMES FIRST AND THE FORM FOLDS AWAY.

        The design puts what you have already said on the page and treats writing as something you go
        and do, because a band that opens as three empty inputs reads as a chore, not a record. This
        band was a menu, a textarea and a text field stacked above nothing at all.

        The form is still here rather than pushed into the chat, which is where the design puts every
        other write: the context chat belongs to the lead, so taking this away would leave a
        participant with no way at all to say what they did.
      */}
      <details open={deliveries.length === 0} style={{ marginBottom: 14 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', listStyle: 'revert', marginBottom: 10 }}>
          Say what you delivered
        </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
        {expectations.length > 0 && (
          <select
            value={against}
            onChange={e => setAgainst(e.target.value)}
            style={{ padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 12.5, fontFamily: 'inherit', color: against ? 'var(--gw-text)' : 'var(--gw-muted)', background: 'white' }}
          >
            {/* Work nobody asked for belongs here too. It is exactly the contribution a report
                built only from stated expectations cannot see. */}
            <option value="">Something you did that nobody asked for</option>
            {expectations.map(e => (
              <option key={e.id} value={e.id}>{e.text}</option>
            ))}
          </select>
        )}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What you did"
          rows={2}
          style={{ padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
        />
        <input
          value={evidence}
          onChange={e => setEvidence(e.target.value)}
          placeholder="Where someone can see it, for example a link, a document or a date"
          style={{ padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
        />
        <div>
          <button
            onClick={() => add.mutate()}
            disabled={!text.trim() || add.isPending}
            style={{ padding: '9px 15px', borderRadius: 7, background: text.trim() ? 'var(--gw-navy)' : 'var(--gw-border)', color: text.trim() ? 'white' : 'var(--gw-muted)', border: 'none', cursor: text.trim() ? 'pointer' : 'default', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit' }}
          >
            {add.isPending ? 'Saving…' : 'Add it'}
          </button>
        </div>
      </div>
      </details>

      {deliveries.map(d => {
        const raised = !!d.carriedIntoCheckInId
        const expectation = textFor(d.objectiveId)
        return (
          <div key={d.id} style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 11, marginTop: 11 }}>
            {expectation && (
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 3 }}>
                Against: {expectation}
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>{d.text}</div>
            {/*
              THE MISSING EVIDENCE IS NAMED, not left blank. A blank line reads as "fine"; the
              session is going to press on exactly this, so saying so here is fairer than the
              silence.
            */}
            <div style={{ fontSize: 12, color: d.evidence ? 'var(--gw-sub)' : 'var(--gw-amber-t)', marginTop: 3 }}>
              {d.evidence ? d.evidence : 'You have not said where anyone can see this'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
                {raised ? 'Raised in a session' : 'Waiting to be asked about'}
              </div>
              {/* Gone once a session has raised it: taking it back afterwards would edit the run-up
                  to a conversation that has already happened. */}
              {!raised && (
                <button
                  onClick={() => remove.mutate(d.id)}
                  style={{ fontSize: 11.5, color: 'var(--gw-red-t)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Take it back
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/*
        THE LIMIT, ONCE, AT THE FOOT. It was a three-line paragraph at the head of the band, above an
        empty form - so the first thing anybody read about their own work was a disclaimer. It is the
        sentence that makes this safe to use, and it belongs where the design puts it: under the
        thing it is about, in one line.
      */}
      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 9 }}>
        This goes to your next check-in, which will ask you about it. What you say when it does
        is what becomes the record.
      </div>
    </div>
  )
}

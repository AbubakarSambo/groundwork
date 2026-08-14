import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'

/**
 * THE LEAD'S SETUP CONVERSATION. G37, G23 - the last of Wave 2's seven.
 *
 * It asks for what setup did not capture, worst first, and names the document that
 * would settle each thing rather than waiting for somebody to guess what counts as
 * context. A real run produced a ninety-day ground from one sentence, with no
 * duration, no rhythm and no sense of who was involved; this is what stops that.
 *
 * THE LEAD'S ONLY, and folded away rather than sitting open. It is help, not a step -
 * a ground that has what it needs should not be nagged, and the server says so itself
 * ("nothing here needs fixing before the first session").
 *
 * The bubbles are the product's, not new ones: navy right with the squared
 * bottom-right, white left with the squared top-left, the same as the check-in and the
 * entry chat. Reading three different chat styles in one product is how a person
 * stops trusting that they are in the same place.
 */
export function ContextChat({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  /**
   * WHAT IT HEARD, WAITING ON A YES. This panel has always said "nothing is saved until you say
   * so", and until now there was no way to say so: the conversation asked how long the ground
   * should run, the lead answered, nothing was written, and the next turn asked again.
   *
   * `said` is kept beside the proposal because the server re-derives the change from the lead's own
   * words. Sending a value instead would make this a button that edits the ground.
   */
  const [proposal, setProposal] = useState<{ gap: string; say: string; said: string } | null>(null)

  const send = useMutation({
    mutationFn: (next: { role: 'user' | 'assistant'; content: string }[]) =>
      groundsApi.contextChat(groundId, next),
    onSuccess: (res, next) => {
      setHistory([...next, { role: 'assistant', content: res.reply }])
      setDone(res.done)
      const said = [...next].reverse().find(m => m.role === 'user')?.content ?? ''
      setProposal(res.proposal && said ? { ...res.proposal, said } : null)
    },
    onError: () => toast.error('That did not go through. Try again.'),
  })

  function start() {
    setOpen(true)
    if (history.length === 0) send.mutate([])
  }

  function submit() {
    const t = text.trim()
    if (!t) return
    const next = [...history, { role: 'user' as const, content: t }]
    setHistory(next)
    setText('')
    setProposal(null)
    send.mutate(next)
  }

  const confirm = useMutation({
    mutationFn: () => groundsApi.confirmContext(groundId, proposal!.said),
    onSuccess: res => {
      toast.success(res.say.replace(/^I will /, 'Done. ').replace(/\.$/, '.'))
      setProposal(null)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      /** Ask again with the gap now closed, so the next question is the next real one. */
      send.mutate(history)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be saved. Try again.'),
  })

  if (!open) {
    return (
      <button
        onClick={start}
        style={{ background: 'none', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}
      >
        Work out what this ground is missing →
      </button>
    )
  }

  return (
    <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gw-sub)' }}>
          What this ground is missing
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
        >
          Close
        </button>
      </div>

      {/*
        SAID ONCE, AT THE TOP. A person typing into something on a page about a team
        needs to know this is not a check-in and is not where things about people go.
        Saying it in the chat itself would mean saying it every turn.
      */}
      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.6, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--gw-border)' }}>
        This is about setting the ground up, not about anybody in it. Nothing here goes into a
        report or gets compared with what anyone said, and nothing is saved until you say so.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}>
        {history.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: '82%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'var(--gw-navy)' : 'white',
              color: m.role === 'user' ? 'white' : 'var(--gw-text)',
              border: m.role === 'user' ? 'none' : '1px solid var(--gw-border)',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              padding: '10px 14px',
              fontSize: 13.5,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}
        {send.isPending && (
          <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', alignSelf: 'flex-start' }}>Thinking…</div>
        )}
      </div>

      {/**
        * THE YES. Shown only when there is something concrete, and it says exactly what will change
        * before it changes - "I will set this to run for twelve weeks" - because a confirm button
        * whose effect you have to guess is not a confirmation.
        */}
      {proposal && (
        <div style={{ background: 'white', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '11px 13px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, marginBottom: 9 }}>{proposal.say}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => confirm.mutate()}
              disabled={confirm.isPending}
              style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit' }}
            >
              {confirm.isPending ? 'Saving…' : 'Yes, set it'}
            </button>
            <button
              onClick={() => setProposal(null)}
              style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}
            >
              Not that
            </button>
          </div>
        </div>
      )}

      {/* It is allowed to end. A setup conversation that will not stop teaches people
          to skip setup. */}
      {!done && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Type your answer…"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || send.isPending}
            style={{ padding: '10px 16px', borderRadius: 8, background: text.trim() ? 'var(--gw-navy)' : 'var(--gw-border)', color: text.trim() ? 'white' : 'var(--gw-muted)', border: 'none', cursor: text.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}

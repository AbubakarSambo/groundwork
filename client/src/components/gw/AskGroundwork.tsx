import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { askApi, type AskBlock, type AskReply, type TextBlock, type ClaimBlock, type ProposalBlock, type PickerBlock, type NextStepBlock } from '@/api/ask'
import { Mark } from './kit'
import { PRIVATE_LINE, openingLine } from './what-ask-groundwork-says'

/**
 * ASK GROUNDWORK (D1, U.14): the panel beside every page on a computer, and #/chat on a phone.
 *
 * The words are the prototype's (docs/prototype/screens/D1-ask-groundwork/*.txt). What Ask Groundwork
 * answers is the assistant's own, drawn as it comes; this adds nothing to what it says. Your
 * questions are served to you alone, and a request is done only after you say yes to it: both are
 * the server's rules (api/src/modules/ask), not this screen's.
 *
 * Not drawn, because nothing serves them yet: the suggested questions under the opening line, and
 * attaching a file (request 16 to the engine).
 */

/** The check-in the page is about, from its address, so the panel opens on it. */
function checkInOnThisPage(pathname: string): string | null {
  const m = pathname.match(/^\/grounds\/([^/?#]+)/)
  return m ? m[1] : null
}

type Said = { from: 'you'; says: string } | { from: 'groundwork'; reply: AskReply }

const isText = (b: AskBlock): b is TextBlock => b.type === 'text' && typeof b.body === 'string'
const isClaim = (b: AskBlock): b is ClaimBlock => b.type === 'claim' && typeof b.says === 'string'
const isProposal = (b: AskBlock): b is ProposalBlock =>
  b.type === 'proposal' && typeof b.proposalId === 'string' && typeof b.summary === 'string'
const isPicker = (b: AskBlock): b is PickerBlock => b.type === 'picker' && Array.isArray(b.options)
/* Only a page inside the product: a path the assistant names is followed, a web address is not. */
const isNextStep = (b: AskBlock): b is NextStepBlock =>
  b.type === 'next_step' && typeof b.href === 'string' && b.href.startsWith('/') && !b.href.startsWith('//') && typeof b.label === 'string'

const bubble = (mine: boolean): React.CSSProperties => ({
  alignSelf: mine ? 'flex-end' : 'flex-start',
  maxWidth: '82%',
  padding: '10px 14px',
  borderRadius: 14,
  background: mine ? 'var(--gw-navy)' : 'var(--gw-slate)',
  color: mine ? '#fff' : 'var(--gw-text)',
  whiteSpace: 'pre-wrap',
  fontSize: 15,
  lineHeight: 1.45,
  margin: 0,
})

const chip: React.CSSProperties = {
  border: '1px solid var(--gw-line)', background: 'var(--gw-card)', color: 'var(--gw-text)',
  borderRadius: 999, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
}

/**
 * `initialMessage`: a question typed somewhere else - the board's own Ask bar (U.10 item 8) - asked
 * the moment this panel opens, once, rather than left sitting in a draft the person has to press
 * Ask on again. Consumed once (`sentRef`) so re-opening the panel later, or a re-render, never
 * re-sends it.
 */
export function AskGroundwork({ onClose, initialMessage, onSentInitialMessage }: { onClose?: () => void; initialMessage?: string | null; onSentInitialMessage?: () => void }) {
  const location = useLocation()
  const page = useQuery({ queryKey: ['ask'], queryFn: askApi.mine })
  const about = useMemo(() => page.data?.about ?? [], [page.data])
  const [chosen, setChosen] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [said, setSaid] = useState<Said[]>([])
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const sentInitial = useRef(false)

  /* What the person chose; otherwise the check-in the page is about, when they are in it; otherwise the first. */
  const here = checkInOnThisPage(location.pathname)
  const isMine = (id: string | null): id is string => !!id && about.some((g) => g.id === id)
  const aboutId = isMine(chosen) ? chosen : isMine(here) ? here : (about[0]?.id ?? '')

  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }) }, [said.length])

  const label = about.find((g) => g.id === aboutId)?.label ?? null

  async function send(message: string, how: () => Promise<AskReply>, clearDraft: boolean) {
    setSending(true)
    setProblem(null)
    try {
      const reply = await how()
      setSaid((s) => [...s, { from: 'you', says: message }, { from: 'groundwork', reply }])
      if (clearDraft) setDraft('')
    } catch (e: unknown) {
      const said = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      setProblem(typeof said === 'string' ? said : 'That did not send. What you wrote is still here, so you can try again.')
    } finally {
      setSending(false)
    }
  }

  const ask = (message: string, clearDraft = false) => {
    const m = message.trim()
    if (!m || sending) return
    void send(m, () => askApi.ask(m, aboutId || undefined), clearDraft)
  }

  useEffect(() => {
    if (!initialMessage || sentInitial.current || sending || !page.data?.canAsk) return
    sentInitial.current = true
    ask(initialMessage, false)
    onSentInitialMessage?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, page.data?.canAsk])

  const answer = (proposalId: string, yes: boolean) => {
    if (sending) return
    setAnswered((a) => new Set(a).add(proposalId))
    void send(yes ? 'Yes' : 'No', () => askApi.answer(proposalId, yes ? 'yes' : 'no'), false)
  }

  function drawBlocks(reply: AskReply, key: number) {
    const texts = new Set(reply.blocks.filter(isText).map((b) => b.body))
    return reply.blocks.map((b: AskBlock, i) => {
      const k = `${key}-${i}`
      if (isText(b)) return <p key={k} style={bubble(false)}>{b.body}</p>
      if (isClaim(b)) {
        /* A claim with how it is known (request 16). The mark comes from the record, never from here. */
        return <p key={k} style={bubble(false)}><Mark mark={b.mark} /> {b.says}</p>
      }
      if (isProposal(b)) {
        return (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'flex-start', maxWidth: '82%' }}>
            {!texts.has(b.summary) && <p style={bubble(false)}>{b.summary}</p>}
            {!answered.has(b.proposalId) && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="gw-b gw-b-primary gw-b-small" disabled={sending} onClick={() => answer(b.proposalId, true)}>Yes</button>
                <button type="button" className="gw-b gw-b-secondary gw-b-small" disabled={sending} onClick={() => answer(b.proposalId, false)}>No</button>
              </div>
            )}
          </div>
        )
      }
      if (isPicker(b)) {
        return (
          <div key={k} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {b.options.map((o) => (
              <button key={o.key} type="button" style={chip} disabled={sending} onClick={() => ask(o.label)}>{o.label}</button>
            ))}
          </div>
        )
      }
      if (isNextStep(b)) {
        return <Link key={k} to={b.href} style={{ ...chip, alignSelf: 'flex-start', textDecoration: 'none' }}>{b.label}</Link>
      }
      return null
    })
  }

  return (
    <section aria-labelledby="gw-ask-title" style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      background: 'var(--gw-card)', border: '1px solid var(--gw-line)', borderRadius: onClose ? 0 : 12,
    }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--gw-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h2 id="gw-ask-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Ask Groundwork</h2>
          {onClose && (
            <button type="button" className="gw-tap44" onClick={onClose} aria-label="Close"
              style={{ border: 0, background: 'transparent', fontSize: 20, cursor: 'pointer', color: 'var(--gw-sub)' }}>×</button>
          )}
        </div>
        {about.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14, color: 'var(--gw-sub)' }}>
            About
            <select value={aboutId} onChange={(e) => setChosen(e.target.value)}
              style={{ font: 'inherit', fontSize: 15, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--gw-line)', background: 'var(--gw-card)', color: 'var(--gw-text)', maxWidth: '100%' }}>
              {about.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{PRIVATE_LINE}</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--gw-page)' }}>
        {page.data && !page.data.canAsk && page.data.why && <p style={bubble(false)}>{page.data.why}</p>}
        {page.data?.canAsk && label && <p style={bubble(false)}>{openingLine(label)}</p>}
        {(page.data?.turns ?? []).map((t, i) => (
          <p key={`t-${i}`} style={bubble(t.from === 'you')}>{t.says}</p>
        ))}
        {said.map((s, i) => s.from === 'you'
          ? <p key={`s-${i}`} style={bubble(true)}>{s.says}</p>
          : <div key={`s-${i}`} style={{ display: 'contents' }}>{drawBlocks(s.reply, i)}</div>)}
        <div ref={end} />
      </div>

      {page.data?.canAsk && (
        <form onSubmit={(e) => { e.preventDefault(); ask(draft, true) }}
          style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--gw-line)', flexDirection: 'column' }}>
          {problem && <p role="alert" style={{ margin: 0, fontSize: 14, color: 'var(--gw-red-t)' }}>{problem}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={label ? 'Ask about this check-in' : 'Ask a question'}
              aria-label={label ? 'Ask about this check-in' : 'Ask a question'}
              maxLength={8000}
              style={{ flex: 1, minWidth: 0, font: 'inherit', fontSize: 15, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-line)', background: 'var(--gw-card)', color: 'var(--gw-text)' }}
            />
            <button type="submit" className="gw-b gw-b-primary" disabled={sending || !draft.trim()}>Send</button>
          </div>
        </form>
      )}
    </section>
  )
}

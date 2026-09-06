import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { CARD, LABEL } from './OpsLayout'
import { scrollTo } from '@/lib/scroll-to'

/**
 * THE ASSISTANT, IN OUR OWN ORGANISATION, THROUGH THE PUBLIC API.
 *
 * The whole claim of the API is that a company can run Groundwork inside their
 * own system. This back office is a company running Groundwork inside their own
 * system. If the assistant does not appear here, we are selling something we
 * have never used.
 *
 * IT TAKES NO PATH A CUSTOMER COULD NOT TAKE, AND THAT IS THE POINT.
 *
 *   - `fetch`, not the app's `apiClient`. The shared client carries our base
 *     URL, our bearer token and our interceptors, and a panel built on it would
 *     look identical and prove nothing.
 *   - `credentials: 'omit'` on every call. A customer's browser has no session
 *     with Groundwork; if this worked only because ours does, it would work
 *     here and nowhere else.
 *   - No import from any product module. Our own server mints the identity
 *     token — the way a customer's server does — and the browser carries only
 *     that. It never holds the shared key.
 *
 * The three calls are the ones the published contract names, in order: exchange
 * the token for a session, draw the opening, then talk.
 */

interface Block {
  type?: string
  /** The typed blocks carry `body`. Kept alongside `text` rather than guessed at. */
  body?: string
  text?: string
  [key: string]: unknown
}

/**
 * Whatever the assistant returns, rendered as text a person can read.
 *
 * TWO SHAPES, BECAUSE THE API HAS TWO. The opening is `{ opening: { line,
 * suggestions } }` and a reply is `{ blocks: [{ type, body }] }` — and the
 * first version of this handled neither properly, so the panel handshook
 * successfully and drew nothing. A customer writing this would meet the same
 * two shapes and the same silence; it is worth knowing the contract has them.
 */
function readBlocks(payload: unknown): string {
  if (typeof payload === 'string') return payload

  const opening = (payload as { opening?: { line?: string; suggestions?: string[] } })?.opening
  if (opening?.line) {
    const asked = opening.suggestions?.length ? `\n\n${opening.suggestions.join('  ·  ')}` : ''
    return `${opening.line}${asked}`
  }

  const blocks = (payload as { blocks?: Block[] })?.blocks
  if (Array.isArray(blocks)) {
    /* `body` is what the typed blocks carry; `text` is checked too rather than
       assumed, because a block the panel cannot read must not render as JSON. */
    const said = blocks
      .map((b) => {
        /*
         * A `next_step` HAS NEITHER, and dropping it silently loses the only
         * actionable part of the reply. It is deliberately not a link: the href
         * is a path inside the Groundwork product, and this panel is what a
         * customer embeds in their own page — following it there would take
         * somebody out of their own system, which is the thing the block shape
         * exists to let them avoid. A real customer routes `kind` into their own
         * setup screen; we say where ours is.
         */
        if (b.type === 'next_step') {
          const label = typeof b.label === 'string' ? b.label : 'Something to set up'
          /* The two kinds that ACT are handled as buttons below rather than as
             a sentence. Only the page-to-open kind is described in words. */
          if (b.kind === 'confirm_a_check_in' || b.kind === 'open_a_check_in' || b.kind === 'upload_a_document') return null
          const href = typeof b.href === 'string' ? b.href : null
          return href ? `${label} — in Groundwork, at ${href}` : label
        }
        return b.body ?? b.text
      })
      .filter((t): t is string => Boolean(t))
    if (said.length) return said.join('\n\n')
  }

  const reply = payload as { reply?: string; message?: string }
  return reply?.reply ?? reply?.message ?? 'Groundwork answered in a shape this panel does not know how to draw.'
}

/**
 * A CHECK-IN ANSWERS IN A DIFFERENT SHAPE FROM THE ASSISTANT, AND THAT IS FINE.
 *
 * The assistant returns typed blocks; the conversation returns `{ reply }`. Two
 * shapes rather than one is a fact about the contract, and a customer writing
 * this meets both — so the panel reads both rather than pretending they are the
 * same. `sessionComplete` rides along on the reply that finishes a session, and
 * it is worth saying out loud: somebody who has finished should not be left
 * looking at a box wondering whether it took.
 */
function readCheckIn(payload: unknown): string {
  const body = payload as { reply?: string; sessionComplete?: boolean } | null
  if (!body?.reply) return 'Groundwork answered in a shape this panel does not know how to draw.'
  return body.sessionComplete
    ? `${body.reply}\n\nThat is your check-in done. What you said is released with everybody else's, not before.`
    : body.reply
}

/**
 * AN ACT THE ASSISTANT OFFERED, PULLED OUT OF THE REPLY.
 *
 * A `next_step` of these two kinds is not a sentence to read — it is the thing
 * somebody just asked for, and rendering it as prose ("in Groundwork, at
 * /grounds") would answer a request to start a check-in with directions.
 */
function actIn(payload: unknown): { kind: string; id: string; label: string; context?: Record<string, string> } | null {
  const blocks = (payload as {
    blocks?: { type?: string; kind?: string; id?: string; label?: string; context?: unknown }[]
  })?.blocks
  if (!Array.isArray(blocks)) return null
  const step = blocks.find(
    (b) =>
      b.type === 'next_step'
      && (b.kind === 'confirm_a_check_in' || b.kind === 'open_a_check_in' || b.kind === 'upload_a_document'),
  )
  return step?.id && step.kind
    ? {
        kind: step.kind,
        id: step.id,
        label: step.label ?? 'Do it',
        context: step.context as Record<string, string> | undefined,
      }
    : null
}

type Said = { from: 'us' | 'them'; text: string }

export function TheAssistantAsACustomerSeesIt() {
  const [open, setOpen] = useState(false)
  const panel = useQuery({
    queryKey: ['ops', 'assistant-panel'],
    queryFn: opsApi.assistantPanel,
    retry: false,
    /* The token is short-lived by design. Refetched when the panel opens rather
       than held from page load, so an hour on a board does not produce a dead
       handshake the first time somebody types. */
    enabled: open,
    staleTime: 0,
  })

  /**
   * AND WHAT GROUNDWORK TELLS US, WHICH IS THE OTHER HALF OF BEING ITS CUSTOMER.
   *
   * The panel above is us USING the product. This is us HEARING from it — the
   * webhooks it signs and sends when a round finishes. It sits here because a
   * feed of deliveries on a page of its own would be a page nobody opens; and it
   * has to sit somewhere, because a read nobody can see is a read nobody checks,
   * and the deliveries that failed to verify are exactly the ones worth seeing.
   */
  const arrived = useQuery({
    queryKey: ['ops', 'groundwork-events'],
    queryFn: opsApi.groundworkEvents,
    retry: false,
    enabled: open,
  })

  const [session, setSession] = useState<string | null>(null)
  const [said, setSaid] = useState<Said[]>([])
  const [typing, setTyping] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  /**
   * A CHECK-IN WAITING, AND WHETHER WE ARE IN ONE.
   *
   * The panel proved the assistant and stopped there, which left the acceptance
   * test half done: the assistant is the help, and the CHECK-IN is the product.
   * A customer who can only chat has not been sold what we sell.
   *
   * `inCheckIn` also decides where typing goes, and that is not cosmetic. A
   * check-in answer routed to the assistant is lost from the record it was meant
   * for, and an assistant question routed into a check-in becomes part of
   * somebody's account of their quarter. The two must never share a box without
   * the box knowing which it is.
   */
  const [waiting, setWaiting] = useState<{ checkInId: string; ground: { label: string } }[]>([])
  /* A session that exists and cannot be opened yet. Kept apart from `waiting`
     because showing them together produces a button that refuses. */
  const [unaccepted, setUnaccepted] = useState<{ ground: { label: string }; says: string }[]>([])
  /* Set up for this person and not started. Until it is confirmed nothing
     happens on it — no session opens and nobody is asked anything. */
  const [toStart, setToStart] = useState<{ groundId: string; label: string; brief: string | null; says: string }[]>([])
  const [inCheckIn, setInCheckIn] = useState<string | null>(null)
  /* What the assistant just offered to do, if anything. One at a time — it
     offers one act, so there is one button. */
  const [offered, setOffered] = useState<{ kind: string; id: string; label: string; context?: Record<string, string> } | null>(null)
  const filePicker = useRef<HTMLInputElement>(null)
  const bottom = useRef<HTMLDivElement>(null)

  const ready = panel.data?.ready ? panel.data : null
  /* A STABLE THING TO DEPEND ON. `ready` is rebuilt on every render, so an
     effect keyed on it re-runs on every render and cancels its own work. */
  const readyToken = ready?.token ?? null
  const started = useRef(false)

  /**
   * The handshake, exactly as a customer's widget makes it on every load.
   *
   * THE EFFECT USED TO CANCEL ITSELF HALFWAY THROUGH, and the panel's greeting
   * has never once been drawn because of it.
   *
   * It depended on `session`, and it SETS `session` in the middle: storing the
   * token re-runs the effect, React runs the previous run's cleanup, the cleanup
   * sets `cancelled`, and the run still in flight returns at its next check —
   * which sits between fetching the opening and rendering it. Every request
   * before that point succeeded, so the network tab looked perfect and the box
   * stayed empty.
   *
   * Keyed on the token and guarded by a ref instead: the handshake runs once per
   * token, and setting state during it cannot interrupt it.
   */
  useEffect(() => {
    if (!readyToken || !ready || started.current) return
    started.current = true
    /* Captured, so the whole handshake uses the values it started with rather
       than whatever a later render happens to be holding. */
    const base = ready.baseUrl
    let cancelled = false
    ;(async () => {
      setProblem('')
      try {
        const res = await fetch(`${base}/api/org/v1/embed/session`, {
          method: 'POST',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: ready.token }),
        })
        const body = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          /* The API's own words. Its refusals are the thing being tested. */
          setProblem(body?.message ?? `Groundwork refused the handshake (${res.status}).`)
          return
        }
        if (body?.visible === false) {
          /*
           * `visible: false` IS THE RIGHT ANSWER AND A TERRIBLE MESSAGE.
           *
           * Groundwork returns nothing rather than a disabled launcher, on
           * purpose: a launcher that appears and refuses tells somebody they
           * are being kept out of something. Correct for a customer's employee,
           * and useless for the person integrating — it means "we have never
           * heard of this person", "they have left", or "their department is
           * excluded", and it says which is none of them.
           *
           * Integrating this ourselves cost two rounds to work out that the
           * organisation in the token was not the organisation the machine
           * credential writes people into. A customer would have paid the same
           * two rounds, in a support ticket. So the panel says the three causes
           * out loud rather than repeating the API's silence.
           */
          setProblem(
            'Groundwork will not open a panel for this person. It means one of three things and does not say which: nobody with this id exists in that organisation, they are marked inactive, or their department is excluded. The usual cause is the organisation — the id the token names has to be the same one the machine credential pushes people into, and a push has to have run.',
          )
          return
        }
        const token = body?.sessionToken ?? body?.token ?? body?.accessToken
        if (!token) {
          setProblem('The handshake succeeded and returned no session token.')
          return
        }
        setSession(token)

        const opening = await fetch(`${base}/api/org/v1/embed/opening`, {
          credentials: 'omit',
          headers: { Authorization: `Bearer ${token}` },
        })
        const drawn = await opening.json().catch(() => null)
        if (cancelled) return
        if (opening.ok && drawn) {
          const text = readBlocks(drawn.data ?? drawn)
          if (text) setSaid([{ from: 'them', text }])
        }

        /* What is waiting for this person, on the same session. A customer's
           page has a person, not a check-in id, so this is the route without
           which none of the others can be reached. */
        const mine = await fetch(`${base}/api/org/v1/check-ins/mine`, {
          credentials: 'omit',
          headers: { Authorization: `Bearer ${token}` },
        })
        const list = await mine.json().catch(() => null)
        if (cancelled) return
        if (mine.ok) {
          const mineBody = list?.data ?? list
          setWaiting(mineBody?.waiting ?? [])
          setUnaccepted(mineBody?.invitationNotAccepted ?? [])
        }

        const awaiting = await fetch(`${base}/api/org/v1/grounds/awaiting-me`, {
          credentials: 'omit',
          headers: { Authorization: `Bearer ${token}` },
        })
        const pending = await awaiting.json().catch(() => null)
        if (cancelled) return
        if (awaiting.ok) setToStart((pending?.data ?? pending) ?? [])
      } catch (e) {
        if (!cancelled) setProblem((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [readyToken])

  useEffect(() => {
    /* The app's own scroll, not the raw call: smooth is not guaranteed, and a
       chat that does not follow its own last message looks broken. */
    if (bottom.current) scrollTo(bottom.current)
  }, [said])

  /**
   * A DOCUMENT, PUT IN FROM HERE.
   *
   * The upload carries no visibility. It arrives seen by the uploader alone and
   * the conversation asks who it is for — so a person who closes this panel
   * halfway has still done the safe thing.
   */
  async function putTheFileIn(groundId: string, file: File) {
    if (!ready || !session) return
    setBusy(true)
    setSaid((s) => [...s, { from: 'us', text: `Adding ${file.name}` }])
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${ready.baseUrl}/api/org/v1/grounds/${groundId}/documents`, {
        method: 'POST',
        credentials: 'omit',
        headers: { Authorization: `Bearer ${session}` },
        body: form,
      })
      const body = await res.json().catch(() => null)
      const drawn = res.ok
        ? (body?.data ?? body)?.asks ?? 'It is in, and only you can see it.'
        : body?.message ?? `Groundwork answered ${res.status}.`
      setSaid((s) => [...s, { from: 'them', text: drawn }])
    } catch (e) {
      setSaid((s) => [...s, { from: 'them', text: (e as Error).message }])
    } finally {
      setBusy(false)
    }
  }

  /** The named lead reads what was set up for them and starts it. */
  async function startIt(groundId: string) {
    if (!ready || !session) return
    setBusy(true)
    try {
      const res = await fetch(`${ready.baseUrl}/api/org/v1/grounds/${groundId}/confirm-lead`, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session}` },
        body: JSON.stringify({}),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setSaid((s) => [...s, { from: 'them', text: body?.message ?? `Groundwork answered ${res.status}.` }])
        return
      }
      setToStart((t) => t.filter((g) => g.groundId !== groundId))
      setSaid((s) => [...s, { from: 'them', text: 'Started. Everybody on it will be asked separately, and what they say is released together.' }])
    } catch (e) {
      setSaid((s) => [...s, { from: 'them', text: (e as Error).message }])
    } finally {
      setBusy(false)
    }
  }

  /** Open the one waiting, and draw its first question. */
  async function openCheckIn(checkInId: string) {
    if (!ready || !session) return
    setBusy(true)
    try {
      const res = await fetch(`${ready.baseUrl}/api/org/v1/check-ins/${checkInId}/open`, {
        method: 'POST',
        credentials: 'omit',
        headers: { Authorization: `Bearer ${session}` },
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setSaid((s) => [...s, { from: 'them', text: body?.message ?? `Groundwork answered ${res.status}.` }])
        return
      }
      setInCheckIn(checkInId)
      setWaiting((w) => w.filter((c) => c.checkInId !== checkInId))
      const asked = readCheckIn(body?.data ?? body)
      if (asked) setSaid((s) => [...s, { from: 'them', text: asked }])
    } catch (e) {
      setSaid((s) => [...s, { from: 'them', text: (e as Error).message }])
    } finally {
      setBusy(false)
    }
  }

  async function send() {
    const message = typing.trim()
    if (!message || !ready || !session) return
    setTyping('')
    setSaid((s) => [...s, { from: 'us', text: message }])
    setBusy(true)
    try {
      /* WHERE THIS GOES IS DECIDED BY WHICH THING WE ARE IN, never by what was
         typed. A check-in answer sent to the assistant is lost from the record
         it was meant for. */
      const res = inCheckIn
        ? await fetch(`${ready.baseUrl}/api/org/v1/check-ins/${inCheckIn}/messages`, {
            method: 'POST',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session}` },
            body: JSON.stringify({ content: message }),
          })
        : await fetch(`${ready.baseUrl}/api/org/v1/chat`, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session}` },
        body: JSON.stringify({ message }),
      })
      const body = await res.json().catch(() => null)
      const drawn = res.ok
        ? inCheckIn
          ? readCheckIn(body?.data ?? body)
          : readBlocks(body?.data ?? body)
        : body?.message ?? `Groundwork answered ${res.status}.`
      setSaid((s) => [...s, { from: 'them', text: drawn }])
      /* Cleared first, so an old offer cannot sit under a new answer. */
      setOffered(res.ok && !inCheckIn ? actIn(body?.data ?? body) : null)
    } catch (e) {
      setSaid((s) => [...s, { from: 'them', text: (e as Error).message }])
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the Groundwork assistant"
        style={{
          position: 'fixed',
          /* Clear of the help button, which already sits bottom-right. Two
             round things overlapping in the corner is one of them unreachable. */
          right: 82,
          bottom: 22,
          zIndex: 60,
          padding: '10px 16px',
          borderRadius: 22,
          border: '1px solid var(--gw-border)',
          background: 'var(--gw-navy)',
          color: 'white',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,.14)',
        }}
      >
        Ask Groundwork
      </button>
    )
  }

  return (
    <aside
      aria-label="The Groundwork assistant"
      style={{
        position: 'fixed',
        right: 22,
        bottom: 78,
        zIndex: 60,
        width: 'min(380px, calc(100vw - 44px))',
        maxHeight: 'min(560px, calc(100vh - 140px))',
        display: 'flex',
        flexDirection: 'column',
        ...CARD,
        padding: 0,
        boxShadow: '0 6px 28px rgba(0,0,0,.18)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 14px',
          borderBottom: '1px solid var(--gw-border)',
        }}
      >
        <div>
          <p style={{ ...LABEL, fontSize: 10, margin: 0 }}>Groundwork</p>
          {/* Said out loud, because it is the whole point of this panel existing. */}
          <p style={{ fontSize: 11.5, color: 'var(--gw-sub)', margin: '2px 0 0' }}>
            Through the public API, as a customer
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close the assistant"
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--gw-sub)', fontSize: 13 }}
        >
          Close
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {panel.isLoading && <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Handshaking…</p>}

        {panel.data && !panel.data.ready && (
          /* The refusal names what is missing, because every state this can be
             in is something somebody can fix. */
          <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{panel.data.why}</p>
        )}

        {problem && <p style={{ fontSize: 13, color: 'var(--gw-red-t)', lineHeight: 1.6 }}>{problem}</p>}

        {/* WHAT IS WAITING, OFFERED RATHER THAN OPENED. The panel does not put
            somebody into a check-in because they opened a chat window — a
            session is ten minutes of their attention and starting one for them
            is the product deciding how they spend it. */}
        {/* WHAT THE ASSISTANT JUST OFFERED TO DO. Said in words above; this is
            the doing of it, so asking to start a check-in starts one rather
            than returning directions to a page. */}
        {/* THE PICKER. Hidden, because the assistant's offer is the affordance —
            a file input sitting in a chat window is a form somebody has to
            interpret. It only ever appears via the button above. */}
        <input
          ref={filePicker}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            const groundId = offered?.context?.groundId
            e.target.value = ''
            if (file && groundId) putTheFileIn(groundId, file)
            setOffered(null)
          }}
        />

        {offered && (
          <button
            type="button"
            onClick={() => {
              const act = offered
              setOffered(null)
              if (act.kind === 'confirm_a_check_in') startIt(act.id)
              else if (act.kind === 'upload_a_document') filePicker.current?.click()
              else openCheckIn(act.id)
            }}
            disabled={busy}
            style={{
              alignSelf: 'flex-start',
              fontSize: 12.5,
              padding: '5px 12px',
              borderRadius: 6,
              border: '1px solid var(--gw-border)',
              background: 'var(--gw-card)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {offered.label}
          </button>
        )}

        {/* SET UP FOR THEM AND NOT STARTED. The brief is somebody else's words
            about their work, and it is the thing being agreed to — so it is
            shown, not summarised. */}
        {toStart.map((g) => (
          <div
            key={g.groundId}
            style={{
              border: '1px solid var(--gw-border)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <strong>{g.label}</strong>
            <div style={{ color: 'var(--gw-sub)' }}>{g.says}</div>
            {g.brief && (
              <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{g.brief}</div>
            )}
            <button
              type="button"
              onClick={() => startIt(g.groundId)}
              disabled={busy}
              style={{
                marginTop: 8,
                fontSize: 12.5,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--gw-border)',
                background: 'var(--gw-card)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Start it
            </button>
          </div>
        ))}

        {/* A SESSION THAT EXISTS AND IS NOT THEIRS TO OPEN YET. Drawn, because a
            person shown an empty list concludes the product has nothing for
            them — the opposite of true, and the harder mistake to recover
            from. No button: accepting an invitation is how somebody agrees to
            take part, and it is not this panel's to do for them. */}
        {unaccepted.map((c, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--gw-border)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--gw-sub)',
            }}
          >
            <strong style={{ color: 'var(--gw-text)' }}>{c.ground?.label ?? 'A piece of work'}</strong>
            <div>{c.says}</div>
          </div>
        ))}

        {waiting.map((c) => (
          <div
            key={c.checkInId}
            style={{
              border: '1px solid var(--gw-border)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            You have a check-in waiting on {c.ground?.label ?? 'a piece of work'}.
            <button
              type="button"
              onClick={() => openCheckIn(c.checkInId)}
              disabled={busy}
              style={{
                marginLeft: 8,
                fontSize: 12.5,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--gw-border)',
                background: 'var(--gw-card)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Open it
            </button>
          </div>
        ))}

        {said.map((s, i) => (
          <div
            key={i}
            style={{
              alignSelf: s.from === 'us' ? 'flex-end' : 'flex-start',
              maxWidth: '86%',
              background: s.from === 'us' ? 'var(--gw-navy)' : 'var(--gw-slate)',
              color: s.from === 'us' ? 'white' : 'var(--gw-text)',
              borderRadius: 10,
              borderBottomRightRadius: s.from === 'us' ? 3 : 10,
              borderTopLeftRadius: s.from === 'us' ? 10 : 3,
              padding: '8px 11px',
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}
          >
            {s.text}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {arrived.data && (
        <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 10, marginTop: 4 }}>
          <div style={{ ...LABEL, marginBottom: 6 }}>What Groundwork has told us</div>
          {arrived.data.events.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{arrived.data.says}</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {arrived.data.events.slice(0, 5).map((e, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
                  {/* A delivery that did not verify is the one worth seeing, so it is said
                      first and in the product's own words rather than shown as a red dot. */}
                  {e.verified ? (e.says ?? e.kind) : `${e.kind} — the signature did not check out`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--gw-border)' }}
      >
        <input
          value={typing}
          onChange={(e) => setTyping(e.target.value)}
          disabled={!session || busy}
          placeholder={session ? 'Ask it something' : 'Not connected'}
          aria-label="Message"
          style={{
            flex: 1,
            padding: '8px 11px',
            borderRadius: 8,
            border: '1px solid var(--gw-border)',
            fontSize: 13,
            fontFamily: 'inherit',
            background: 'white',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!session || busy || !typing.trim()}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--gw-navy)',
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: session && typing.trim() ? 'pointer' : 'default',
            opacity: session && typing.trim() && !busy ? 1 : 0.5,
          }}
        >
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </aside>
  )
}

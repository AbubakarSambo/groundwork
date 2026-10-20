import { useState, useEffect, useRef } from 'react'
import { nothingInternalReachesTheBubble } from '@/lib/nothing-internal-reaches-the-bubble'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
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
import {
  rememberConversation, recallConversation, forgetConversation,
} from './remembering-the-context-conversation'
import { GroundworkIsWriting } from './ui/GroundworkIsWriting'

export function ContextChat({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  /**
   * OPEN ON THE PAGE. It was a button you had to find and press.
   *
   * This is where everything on the Context page is created and changed - there is no form for an
   * expectation anywhere, by design - so putting the one way in behind a click made the rest of the
   * page look read-only. A composer sitting there says what the page is for.
   */
  const [open, setOpen] = useState(true)
  /**
   * RESTORED, NOT STARTED FRESH. Read once at mount rather than in an effect: an effect would
   * render the empty box first, which is the thing being fixed, and would race the opening query
   * into firing against an empty history.
   */
  const remembered = useState(() => recallConversation(groundId))[0]
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    remembered?.history ?? [],
  )
  const [text, setText] = useState('')
  /*
   * A LINE FROM THE PAGE, HANDED TO THE CONVERSATION.
   *
   * Every row of the record carries "Change this", and the change is a sentence rather than a form -
   * so the row puts the sentence in the box and the lead finishes it. An event rather than a store
   * because the two live in different bands of one page and nothing else needs to know.
   */
  useEffect(() => {
    const listen = (e: Event) => {
      const said = (e as CustomEvent<string>).detail
      if (!said) return
      setOpen(true)
      setText(said)
      /* After the state lands, so the caret is at the end of what the row wrote. */
      setTimeout(() => {
        const box = document.querySelector<HTMLInputElement>('[data-gw-context-chat-input]')
        box?.focus()
        box?.setSelectionRange(box.value.length, box.value.length)
      }, 60)
    }
    window.addEventListener('gw:context-chat:say', listen)
    return () => window.removeEventListener('gw:context-chat:say', listen)
  }, [])
  const [done, setDone] = useState(remembered?.done ?? false)
  /**
   * WHAT IT HEARD, WAITING ON A YES. This panel has always said "nothing is saved until you say
   * so", and until now there was no way to say so: the conversation asked how long the ground
   * should run, the lead answered, nothing was written, and the next turn asked again.
   *
   * `said` is kept beside the proposal because the server re-derives the change from the lead's own
   * words. Sending a value instead would make this a button that edits the ground.
   */
  const [proposal, setProposal] = useState<{ gap: string; say: string; said: string } | null>(
    remembered?.proposal ?? null,
  )

  /**
   * KEEP IT ACROSS LEAVING THE PAGE.
   *
   * This is the only way to say anything on the Context tab, and the whole conversation lived in
   * component state - the server keeps none of it, since the client posts the entire history on
   * every turn. Navigating to another tab and back met the lead with an empty box that had
   * forgotten a conversation they had just had, and threw away any proposal still waiting on their
   * yes. Because the panel promises nothing is saved until they say so, that looked exactly like
   * the product had cleared their setup.
   */
  useEffect(() => {
    rememberConversation(groundId, { history, proposal, done })
  }, [groundId, history, proposal, done])

  /**
   * ADDING A DOCUMENT FROM HERE.
   *
   * The same call the check-in chat makes, so the file lands in Documents with everything that
   * comes with being a document there - who may read it, and its assessment. What this adds is
   * only the way in, plus a line in the conversation saying it arrived: a file that uploads
   * silently in a chat reads as a file that did not upload.
   */
  const fileInput = useRef<HTMLInputElement>(null)
  const attach = useMutation({
    mutationFn: (file: File) => documentsApi.upload(groundId, file),
    onSuccess: (res: any, file) => {
      qc.invalidateQueries({ queryKey: ['documents', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      toast.success(`${file.name} is filed under Documents`)
      /*
       * WHAT THE SHEET HOLDS, NOT A FILING RECEIPT.
       *
       * Read in the browser, 22 September 2026: a sheet of Q4 targets attached here was answered
       * with "harvestline-q4-targets.xlsx is filed under this check-in's documents". The check-in
       * chat said what the sheet held and asked whether it was right; the lead's own tab - the page
       * where the numbers are set - said nothing about the numbers. The server writes the sentence
       * and the question; this says them and offers the yes.
       */
      const filed = `${file.name} is filed under this check-in's documents. Everyone's check-in reads it before asking a question, so it shapes what they are asked.`
      /*
       * THE FILE IS FILED IMMEDIATELY; THE READ LANDS AFTER.
       *
       * The upload used to wait twenty seconds for two model reads before answering. It answers as
       * soon as the file is stored now, so this says so, then waits for the read and says what was
       * found when it arrives. A person who attached a sheet and walked away comes back to the
       * question rather than to a spinner.
       */
      setHistory((h) => [...h, { role: 'assistant', content: `${filed}\n\nReading it now.` }])
      void whatTheReadFound(res?.id, file.name)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not upload. Try again.'),
  })

  /**
   * WAIT FOR THE READ, THEN SAY WHAT IT FOUND.
   *
   * The document row gets `holds` when the model has finished with it, which is a few seconds after
   * the upload answers. Polled rather than pushed because this is one file, for one person, on one
   * open page - a socket for it would be machinery nobody needs. It gives up after a minute and
   * says so rather than leaving "Reading it now." as the last word.
   */
  async function whatTheReadFound(docId: string | undefined, fileName: string) {
    if (!docId) return
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const list: any[] = await documentsApi.list(groundId).catch(() => [])
      const mine = list.find((d) => d.id === docId)
      if (!mine?.holds) continue
      qc.invalidateQueries({ queryKey: ['documents', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      const asking: string | null = mine.askingAboutIt ?? mine.theContextWeHave ?? null
      const waiting = (mine.holds?.waiting ?? []).length
      if (asking && waiting > 0) {
        /* `askingAboutIt` already ends in the question - it is written by whatWeTookFromThat. */
        setProposal({ gap: 'document', say: asking, said: `yes, record the numbers from ${fileName}` })
      } else if (asking) {
        setHistory((h) => [...h, { role: 'assistant', content: asking }])
      } else {
        setHistory((h) => [...h, { role: 'assistant', content: `I have read ${fileName}. There are no numbers or dates in it to record, so it stays as context every check-in reads.` }])
      }
      return
    }
    setHistory((h) => [...h, { role: 'assistant', content: `${fileName} is taking a while to read. It is filed either way, and every check-in reads it.` }])
  }

  const send = useMutation({
    mutationFn: (next: { role: 'user' | 'assistant'; content: string }[]) =>
      groundsApi.contextChat(groundId, next),
    onSuccess: (res, next) => {
      setHistory([...next, { role: 'assistant', content: res.reply }])
      setDone(res.done)
      const said = [...next].reverse().find(m => m.role === 'user')?.content ?? ''
      setProposal(res.proposal && said ? { ...res.proposal, said } : null)
    },
    /*
     * A FAILED LOOK FOR THE NEXT QUESTION IS NOT A FAILED YES. After a yes the page asks the chat once
     * more for the next gap. That second request is slow (a model reads the whole record), and when it
     * failed the lead read a red "That did not go through" under a target that HAD been saved. It is
     * asked quietly: the lead's own message failing is still said, a follow-up that fails is not.
     */
    onError: () => {
      if (asking.current === 'next') { asking.current = 'message'; return }
      toast.error('That did not go through. Try again.')
    },
  })
  const asking = useRef<'message' | 'next'>('message')

  function start() {
    setOpen(true)
  }

  /**
   * IT OPENS BY SAYING WHAT IS MISSING, which is the only opening line worth having here.
   *
   * A composer with nothing above it asks the person to work out what to type. The first turn is the
   * one that makes the page useful: it names the expectations with nothing checkable against them and
   * the people who have not been told, which is exactly what somebody cannot see by reading the bands.
   *
   * A QUERY, NOT AN EFFECT THAT FIRES A MUTATION.
   *
   * My first version sent it from a useEffect guarded by a useRef. A ref is per instance, and React
   * remounts a component in development to surface exactly this - so the guard was defeated by the
   * thing it was written for, two requests went out, one never settled, and the panel sat on
   * "Thinking…" underneath a reply that had already arrived.
   *
   * Fetching once is not a fact this component should be tracking by hand. React Query already
   * dedupes by key and keeps the result, so asking for the opening turn as a QUERY makes the
   * double-mount produce one request by construction. No flag to get wrong.
   */
  /**
   * WHAT IS ON SCREEN. The opening turn, then everything said since.
   *
   * `history` holds only what has actually been exchanged, so the opening line has exactly one
   * owner and cannot be duplicated into state.
   */
  const opening = useQuery({
    queryKey: ['context-chat-opening', groundId],
    queryFn: () => groundsApi.contextChat(groundId, []),
    enabled: open && history.length === 0,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })

  const turns =
    history.length === 0 && opening.data
      ? [{ role: 'assistant' as const, content: opening.data.reply }]
      : history

  function submit() {
    const t = text.trim()
    /*
     * ONE SEND PER ACTION. The Send button already disables itself while `send.isPending`, but the
     * Enter key did not check it at all - pressing Enter twice in the instant before React
     * re-rendered the disabled button queued a second `send.mutate` on top of the first, and the
     * lead's own message was then saved and sent twice (engine workspace, 9 October night, test
     * bed copy a, "Nakuru win-back"). Checked here, in the one function both the key and the
     * button call, rather than in each caller.
     */
    if (!t || send.isPending) return
    const next = [...history, { role: 'user' as const, content: t }]
    setHistory(next)
    setText('')
    setProposal(null)
    asking.current = 'message'
    send.mutate(next)
  }

  const confirm = useMutation({
    mutationFn: () => groundsApi.confirmContext(groundId, proposal!.said, history),
    onSuccess: res => {
      toast.success(res.say.replace(/^I will /, 'Done. ').replace(/\.$/, '.'))
      setProposal(null)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      /** Ask again with the gap now closed, so the next question is the next real one. */
      asking.current = 'next'
      send.mutate(history)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be saved. Try again.'),
  })

  if (!open) {
    return (
      /*
        IT HAS TO LOOK LIKE A CONVERSATION, BECAUSE IT IS ONE.
        
        This was a single bordered line reading "Work out what this check-in is missing" between two
        cards. Asked where the chat on this page was, I could not point at it either: nothing about it
        said chat, said who it was for, or said what happens if you press it. It read like a link to a
        help article.
        
        Named, with its purpose under it and a control that says what it does. The same card also
        carries the promise the old line had nowhere to put - that nothing said here is anybody's
        account - which is the sentence that makes a person willing to use it at all.
      */
      <div style={{ background: 'white', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
          The context chat
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 11 }}>
          Talk through what this check-in is for, what each person is working to, and what you know
          about how it is going - or paste it all in at once. It fills in this page as you go, and
          what lands here guides the check-ins and the coaching. Nothing is written until you say so.
        </div>
        <button className="gwui-btn gwui-btn-primary gwui-btn-small"
          onClick={start}
        >
          Start the conversation
        </button>
      </div>
    )
  }

  return (
    /*
      THE PANEL, REBUILT 22 SEPTEMBER 2026: "the context chat box looks gross and badly designed."
      
      What it was: a grey inset panel inside a white page, a paragraph of explanation above the
      messages, a 360-pixel scroll area inside a page that also scrolls, bubbles at 82% width with
      two different corner radii, a bordered "+ Doc" beside a pill input and a grey Send. It read as
      a widget dropped onto the page rather than as the page's one way in.
      
      What it is: the page's own ground, one line of purpose, no nested scroll - the page scrolls -
      messages as text with a rule marking whose is whose, and a composer that looks like a composer.
    */
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {/*
          GROUP 3'S REVIEW, BATCH A FAULT 6: "THE CONTEXT CHAT" WAS SHOUTED IN CAPITALS
          (textTransform: uppercase), which the plain-wording rule treats the same as typing it in
          capitals. The prototype's own heading for this (B2-context, context.txt) is "Tell
          Groundwork how this team works", said at ordinary case and weight.
        */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)' }}>
          Tell Groundwork how this team works
        </div>
        {/* A quiet text link: the prototype's "Tell Groundwork how this team works" has no Close button. */}
        <button type="button" onClick={() => setOpen(false)} className="gwui-plain-link">
          Close
        </button>
      </div>

      {/*
        WHAT THIS IS FOR, SAID ONCE, AND SAID TRUTHFULLY.
        
        It used to read "About setting the check-in up, not about anybody in it. Nothing here reaches
        a report, and nothing is saved until you say so." Hafsah, 22 September 2026: that has to go -
        "everything in the context chat can be used to guide and coach the team and also help them
        where they are going wrong". It is what the context is FOR, and the old line promised the
        opposite of the product's own behaviour: what is written here already shapes what each person
        is asked and the coaching they get.
        
        What stays true and is worth saying: nothing is written until you say so, and nothing you
        write about a person is ever quoted to them or in a report.
      */}
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>
        {/*
          GROUP 3'S REVIEW, BATCH A FAULT 6: "SAY IT, PASTE IT, OR ATTACH IT: WHAT LANDS HERE..."
          JOINED TWO SENTENCES WITH A COLON.
        */}
        Say it, paste it, or attach it. What lands here guides every check-in and the coaching.
        Nothing is written until you say so.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
        {/*
          The opening turn belongs to the query, not to `history`. Copying it into state on arrival
          would give the same sentence two owners, and they would disagree the first time anything
          reset one of them.
        */}
        {turns.map((m, i) => (
          <div
            key={i}
            /* A thin rule says whose words these are. Yours are the darker ones; there are only
               ever two speakers here, so a colour and an indent carry it without furniture. */
            style={{
              maxWidth: '68ch',
              alignSelf: 'stretch',
              borderLeft: `2px solid ${m.role === 'user' ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
              paddingLeft: 12,
              color: m.role === 'user' ? 'var(--gw-dark)' : 'var(--gw-text)',
              fontWeight: m.role === 'user' ? 600 : 400,
              fontSize: 13.5,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}
          >
            {nothingInternalReachesTheBubble(m.content)}
          </div>
        ))}
        {(send.isPending || opening.isFetching) && (
          /* `wrap={false}`: this chat draws no bubbles of its own (a citation-style rule down the
             left edge instead, see the comment above), so the shared sentence sits plainly here
             too, rather than in a bubble shape nothing else on this screen has. */
          <div style={{ alignSelf: 'flex-start' }}><GroundworkIsWriting wrap={false} /></div>
        )}
      </div>

      {/**
        * THE YES. Shown only when there is something concrete, and it says exactly what will change
        * before it changes - "I will set this to run for twelve weeks" - because a confirm button
        * whose effect you have to guess is not a confirmation.
        */}
      {proposal && (
        <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{proposal.say}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="gwui-btn gwui-btn-primary gwui-btn-small"
              onClick={() => confirm.mutate()}
              disabled={confirm.isPending}
            >
              {confirm.isPending ? 'Saving…' : 'Yes, set it'}
            </button>
            <button className="gwui-btn gwui-btn-secondary gwui-btn-small"
              onClick={() => setProposal(null)}
            >
              Not that
            </button>
          </div>
        </div>
      )}

      {/*
        It is allowed to end, and the opening turn can already be the end - a check-in with nothing
        missing is told so and is not handed a box to type into. `done` starts false, so that has to
        read the opening turn too rather than only the mutation's answer.
      */}
      {!(history.length === 0 && opening.data ? opening.data.done : done) && (
        /* One bordered row: the attach inside it, the box growing, the send in the accent colour.
           It was three separate controls of three different weights sitting in a line. */
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 4, background: 'white' }}>
          {/*
            A DOCUMENT, LIKE EVERY OTHER CHAT IN THE PRODUCT.

            "The context chat should allow you to add another doc, just like every other chat. And
            it gets filed under your documents."

            The check-in chat has had a "+ Doc" button for a long time. This conversation
            recommends documents by name in nearly every turn - "the brief you sent them", "the
            grant terms" - and had no way to accept one, so the only route was to leave it, scroll
            to the Documents band, upload, and come back to a conversation that had moved on.
          */}
          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) attach.mutate(file)
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={attach.isPending}
            title="Attach a document to this check-in"
            aria-label="Attach a document to this check-in"
            className="gwui-icon-btn"
            style={{ cursor: attach.isPending ? 'wait' : 'pointer' }}
          >
            {attach.isPending ? '…' : '📎'}
          </button>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            data-gw-context-chat-input
            placeholder="Type your answer…"
            style={{ flex: 1, padding: '8px 4px', border: 'none', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'transparent' }}
          />
          <button className="gwui-btn gwui-btn-primary gwui-btn-small"
            onClick={submit}
            disabled={!text.trim() || send.isPending}
            style={{ flexShrink: 0 }}
          >
            Send
          </button>
        </div>
      )}
      {/*
        REQUIRED BY THE PERSISTENCE, NOT AN EXTRA.

        Before the conversation was kept, leaving the page WAS how you got a fresh one. Keeping it
        takes that away, so the way out has to become a control instead of a side effect of
        navigating. It clears the draft on this machine only - anything already confirmed is written
        on the ground and is not touched.
      */}
      {open && history.length > 0 && (
        <div style={{ textAlign: 'right', paddingTop: 8 }}>
          <button
            onClick={() => {
              forgetConversation(groundId)
              setHistory([])
              setProposal(null)
              setDone(false)
              setText('')
              qc.removeQueries({ queryKey: ['context-chat-opening', groundId] })
            }}
            style={{ fontSize: 11.5, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            title="Clear this conversation and start again. Anything already saved stays."
          >
            Start this conversation over
          </button>
        </div>
      )}
    </div>
  )
}

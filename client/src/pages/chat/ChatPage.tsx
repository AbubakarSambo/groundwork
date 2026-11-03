import { TheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { ANSWER_ON_WHATSAPP_INSTEAD } from '@/lib/answer-on-whatsapp-instead'
import { WaitingForYouToConfirm } from '@/components/gw/ThePlanPage'
import { CheckInOnWhatsApp } from '@/components/gw/CheckInOnWhatsApp'
import { useState, useEffect, useRef } from 'react'
import { nothingInternalReachesTheBubble } from '@/lib/nothing-internal-reaches-the-bubble'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { justTheQuestion } from '@/pages/invite/the-link-opens-on-the-question'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { conversationApi, streamMessage, type CheckInBrief, type TheEndCard as TheEndCardData } from '@/api/conversation'
import { closingMessageText } from '@/lib/a-closing-message-claims-nothing-it-does-not-keep'
import type { ConnectWhatsApp } from '@/types'
import { documentsApi, type DocumentAssessment } from '@/api/documents'
import { useAuthStore } from '@/stores/auth'
import { asTheirWords, isTheEnginesOwnNote } from '@/lib/as-their-words'
import { YourNextCheckIn } from '@/components/gw/YourNextCheckIn'
import { TheCheckInYouJustFinished } from '@/components/gw/TheCheckInYouJustFinished'
import { WhatYouGaveUs, type WhatYouGave } from '@/components/gw/WhatYouGaveUs'
import { WhoIsStillOut } from '@/components/gw/WhoIsStillOut'
import { SlowStep, CLOSING_STEPS } from '@/components/gw/SlowStep'
import { useAfterAWhile, GETTING_YOUR_FIRST_QUESTION_READY, STILL_READING_WHAT_YOU_WROTE } from '@/lib/opening-is-slow'
import { TheCheckInHeader } from '@/components/gw/checkin/TheCheckInHeader'
import { GroundGone } from '@/components/gw/GroundGone'
import { Bubble } from '@/components/gw/ui/Bubble'
import { GroundworkIsWriting, WritingDots } from '@/components/gw/ui/GroundworkIsWriting'
import { ConversationCard } from '@/components/gw/ui/ConversationCard'
import { Composer } from '@/components/gw/ui/Composer'
import { Modal } from '@/components/gw/ui/Modal'
import { Section } from '@/components/gw/ui/Section'
import { Tag } from '@/components/gw/ui/Tag'
import { Button } from '@/components/gw/ui/Button'
import { SuggestedAnswers } from '@/components/gw/checkin/SuggestedAnswers'
import { IdeaOffer } from '@/components/gw/checkin/IdeaOffer'
import { RequestOffer, OpenTheRequest } from '@/components/gw/checkin/RequestOffer'
import type { TheIdeaOfferInTheCheckIn, TheRequestOfferInTheCheckIn, TheRequestToOpen } from '@/api/anchorShapes'
import { TheEndCard } from '@/components/gw/checkin/TheEndCard'
import { TheDonePage, type WhatChanged } from '@/components/gw/checkin/TheDonePage'
import { whenTheNextOneOpens, whoElseAnswers, whoRunsThis } from '@/lib/what-the-end-of-a-check-in-can-say'
import { firstWordOfAName } from '@/lib/the-first-word-of-a-name'
import { toast } from 'sonner'
import { useCheckInFocusStore } from '@/stores/check-in-focus'
import '@/components/gw/ui/gw-ui.css'

/** ONE LIST. The OS dialog offered 23 extensions, the label's title a third list of 9, and the validator refused everything outside these 10 - so the dialog invited a refusal the product then issued. */
/* .webp and .heic too: an iPhone photo is HEIC, and the server has always read both (documents.service ALLOWED_MIME). */
const ACCEPTED_UPLOADS = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.md']

interface Msg {
  /** The turn that closed the check-in, whose middle sentence waits for the end card (pilots, problem 13). */
  closesTheCheckIn?: boolean
  id: string
  role: 'AI' | 'PERSON'
  content: string
  docAssessment?: { docId: string; docName: string; assessment: DocumentAssessment }
  /** The engine's suggested answers for this question, when it sends them. See SuggestedAnswers. */
  suggestedAnswers?: string[]
  /** Piece 21: the yes to capture a concrete idea, attached to the reply that offers it. See IdeaOffer. */
  ideaOffer?: TheIdeaOfferInTheCheckIn | null
  /** Anchor pieces 26/27: a leave or spending request read in the person's own words. See RequestOffer. */
  requestOffer?: TheRequestOfferInTheCheckIn | null
  /** Anchor pieces 26/27: what their yes opens, on the reply that follows. See OpenTheRequest. */
  openTheRequest?: TheRequestToOpen | null
}

/** Shows a document's "what this suggests / what will be done with it" bullets,
 * with an inline correction affordance so the person can fix a wrong read. */
function AssessmentCard({ groundId, docId, docName, assessment, onCorrected }: {
  groundId: string; docId: string; docName: string; assessment: DocumentAssessment
  onCorrected: (a: DocumentAssessment) => void
}) {
  const [agreed, setAgreed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [suggestsText, setSuggestsText] = useState(assessment.suggests.join('\n'))
  const [willDoText, setWillDoText] = useState(assessment.willDo.join('\n'))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const corrected = {
        suggests: suggestsText.split('\n').map(s => s.trim()).filter(Boolean),
        willDo: willDoText.split('\n').map(s => s.trim()).filter(Boolean),
      }
      const doc = await documentsApi.correctAssessment(groundId, docId, corrected)
      onCorrected(doc.assessment ?? corrected)
      setEditing(false)
    } catch {
      toast.error('The correction did not save. What you wrote is still here, try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gwui-ci-assessment">
      <div className="gwui-ci-assessment-title">📎 {docName}</div>
      {!editing ? (
        <>
          <div className="gwui-ci-assessment-label">What this suggests</div>
          <ul className="gwui-ci-assessment-list">
            {assessment.suggests.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <div className="gwui-ci-assessment-label">What I will do with it</div>
          <ul className="gwui-ci-assessment-list gwui-ci-assessment-list-last">
            {assessment.willDo.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          {/* The prototype's "That's right" beside "Not right" (references-upload-in-check-in.txt), restored 26 October 2026. */}
          {agreed ? <div className="gwui-ci-assessment-label">Kept as it reads.</div> : (
            <div className="gwui-ci-assessment-actions">
              <button onClick={() => setAgreed(true)} className="gwui-ci-assessment-link">That’s right</button>
              <button onClick={() => setEditing(true)} className="gwui-ci-assessment-link">
                Not right? Correct this
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="gwui-ci-assessment-label">What this suggests (one per line)</div>
          <textarea value={suggestsText} onChange={e => setSuggestsText(e.target.value)} rows={3}
            className="gwui-ci-assessment-textarea" />
          <div className="gwui-ci-assessment-label">What I will do with it (one per line)</div>
          <textarea value={willDoText} onChange={e => setWillDoText(e.target.value)} rows={2}
            className="gwui-ci-assessment-textarea" />
          <div className="gwui-ci-assessment-actions">
            <button onClick={save} disabled={saving} className="gwui-ci-assessment-save">
              {saving ? 'Saving…' : 'Save correction'}
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} className="gwui-ci-assessment-cancel">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const RECORD_ENTRY_LABELS: Record<string, string> = {
  SUCCESS_DEFINITION: 'What success looks like',
  PROGRESS: 'What got done',
  TIMEFRAME: 'Timeframe',
  COMMITMENT: 'Commitment',
  ASK: 'Ask',
  INTENT: 'Intent',
  TOLERANCE: 'Tolerance',
  WORRY: 'Worry',
  TENSION: 'Tension',
}

/**
 * How long an open request that is still working is waited for before the screen says it could not
 * open. See the watchdog in ChatPage: the first open of a new check-in was measured at 65 and 88
 * seconds against the real model.
 */
const AN_OPEN_MAY_TAKE = 150_000

export function ChatPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()

  const [searchParams] = useSearchParams()
  /* Opened from a team update's link: one card, no band, nothing but the question. */
  const bareFrame = justTheQuestion(location.search)
  /* The clip's little menu: both ways of adding something, out of the typing row. */
  const [attachOpen, setAttachOpen] = useState(false)
  const isClarificationSession = searchParams.get('clarify') === 'true'

  /*
   * THE SESSION NUMBER COMES FROM THE CHECK-IN, NOT FROM HOW YOU GOT HERE. It read navigation state
   * and defaulted to 1, so every check-in opened from an email, WhatsApp or a bookmark said
   * "Session 1" whatever session it was. Navigation state is the first guess; the transcript's own
   * check-in corrects it the moment it loads.
   */
  const [sessionNumber, setSessionNumber] = useState<number>((location.state as any)?.sessionNumber ?? 1)
  const groundLabel: string   = (location.state as any)?.groundLabel ?? ''
  const [groundId, setGroundId] = useState<string | undefined>((location.state as any)?.groundId)
  /** ROUND 6, ITEM 2: the two cards fold behind one quiet link and this panel. */
  const [showAboutPanel, setShowAboutPanel] = useState(false)
  /*
   * THE CHECK-IN ITSELF, for its name on the way back ("← Sales team, Q3") and, at the end, for who
   * else answers it. Read from the server rather than from how somebody got here: a check-in opened
   * from an email carries no navigation state, and the way back said "Back" with no name.
   */
  const ground = useQuery({
    queryKey: ['ground', groundId],
    queryFn: () => groundsApi.get(groundId!),
    enabled: !!groundId,
    retry: false,
  })
  const checkInName: string = groundLabel || (ground.data as any)?.label || ''
  /* The direct morning (lib/the-direct-morning.tsx): the fixed lines on this screen are direct where the organisation's switch is on. */
  const direct = isTheDirectMorningOn(ground.data)
  const [brief, setBrief] = useState<CheckInBrief | null>(null)
  /**
   * "CONNECT WHATSAPP" (decision 106, 5 October, night): served on the person's own transcript
   * read, or null. An optional convenience - never required to answer - so it is drawn as one
   * quiet line, nowhere near the composer.
   */
  const [connectWhatsApp, setConnectWhatsApp] = useState<ConnectWhatsApp | null>(null)
  const isInitiator: boolean  = (location.state as any)?.isInitiator ?? false
  const isFinalSession: boolean = (location.state as any)?.isFinal ?? false

  const [msgs, setMsgs]               = useState<Msg[]>([])
  /**
   * WHETHER WE YET KNOW IF THIS SESSION HAS ANYTHING IN IT.
   *
   * The privacy screen renders when session 1 has no messages, and for up to two seconds after
   * mount that is true of EVERY session 1 - the transcript fetch sits behind a random jitter of up
   * to 2000ms. So a person resuming a check-in got a full-page explainer thrown in front of them
   * and snatched away again before they could read it, which is what "it flashed and then got me
   * into the check-in" is.
   *
   * Empty is a fact you have to have looked to know. This is the looking.
   */
  /* The setter still records that the transcript was looked at; nothing reads the flag now the
     briefing screen it gated is gone. */
  const [, setKnowWhatIsHere] = useState(false)
  /** An assistant bubble with nothing in it yet, however it was minted. */
  const isWaiting = (m: { id: string; role: string; content: string }) =>
    m.id === 'loading' || (m.role === 'AI' && m.content.trim() === '…')

  const [priorTurns, setPriorTurns]   = useState<Msg[]>([])
  const [priorSessionNumber, setPriorSessionNumber] = useState<number | null>(null)
  /** The session this one is correcting, when it is a correction rather than a new session. */
  const [correctingSession, setCorrectingSession] = useState<number | null>(null)
  // #3: a normal returning session (not self-correction) gets a read-only
  // recap of the person's own prior record entries - the same data the
  // model's PRIOR_SESSION prompt block already reads, but shown to the
  // person themselves instead of continuity depending entirely on whether
  // the AI's opening line happens to mention it.
  const [priorRecordEntries, setPriorRecordEntries] = useState<import('@/api/conversation').PriorRecordEntrySession[]>([])
  const [displayedMsgs, setDisplayedMsgs] = useState<Msg[]>([])
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  /* True once a reply has been outstanding long enough for somebody to start doubting it. */
  const [waitedAWhile, setWaitedAWhile] = useState(false)
  const [opened, setOpened]           = useState(false)
  const [done, setDone]               = useState(false)
  const [completed, setCompleted]     = useState(false)
  /**
   * DECLINING TO TAKE PART, WHICH THE PRODUCT PROMISED AND HAD NO BUTTON FOR.
   *
   * `POST /check-ins/:id/decline` has existed and worked the whole time - it sets the row to DECLINED.
   * Nothing ever called it, so a product whose whole claim is that participation is voluntary offered
   * no way to say no. Somebody who did not want to take part could only go silent, and going silent
   * looks identical to being slow.
   *
   * IT WAS NOT SAFE TO WIRE UNTIL TODAY. `getSessionProgress` counted anyone with an account as still
   * owing an answer and only cleared them on COMPLETED, so a declined party sat in
   * `missingParticipantIds` for good - the round could never finish and the report never left
   * "forming". A button here without that fix would have made permanently stuck check-ins.
   *
   * Her decisions: the round completes and the report names the decline; and a decline is FINAL for
   * that session. Final is why this sits behind a confirm step that spells out the consequences
   * rather than a button in the toolbar, where it would be one mis-tap from irreversible.
   */
  const [declined, setDeclined]       = useState(false)
  /**
   * SCREEN FAULT 2: THE DONE PAGE HAD NO BOTTOM BAR AND NO WAY BACK TO TODAY.
   *
   * AppShell hides the phone's bottom bar for the whole `/checkin/:id` route, because a live
   * session is a full-screen card with its own way out (Pause) and the bar used to sit under the
   * composer fighting it (review round 3, item 7). But `/checkin/:id` is also where this page's
   * own Done state renders, once `completed` or `declined` - no Pause left to fight, and no other
   * way back to Today. `useCheckInFocusStore` tells AppShell which of the two this route is
   * showing right now: "in focus" (hide the bar) while there is still a live session to leave, and
   * not once it has settled. Reset to "in focus" on the way out, so the next session visited here
   * starts hidden-until-known rather than carrying this one's settled state along.
   */
  const setCheckInFocused = useCheckInFocusStore(s => s.setFocused)
  useEffect(() => {
    setCheckInFocused(!(completed || declined))
    return () => setCheckInFocused(true)
  }, [completed, declined, setCheckInFocused])
  const [confirmingDecline, setConfirmingDecline] = useState(false)
  const [openFailed, setOpenFailed]   = useState(false)
  /** The served sentence for why opening failed, read once and shown where the person can keep
      reading it (the banner below), not only in a toast that fades. Falls back to a plain one of
      ours when the server sent nothing usable. */
  const [openFailedMessage, setOpenFailedMessage] = useState('Could not open your session. This is usually a temporary issue.')
  /** B-201: the HTTP status the open request failed with, read once, so a stranger's two different
      reasons for not reaching this check-in (it was never theirs; the id is made up) can be told
      apart from everything else that can go wrong, without the server's own two different
      sentences ever reaching the screen - see the GroundGone render below. */
  const [openFailedStatus, setOpenFailedStatus] = useState<number | null>(null)
  /**
   * A RE-ENTRY GUARD KEYED BY SESSION ID, NOT A BARE FLAG RESET ON EVERY CLEANUP.
   *
   * This held a boolean that the effect's own cleanup reset to false on every run - including
   * React StrictMode's synchronous mount/cleanup/mount, and any ordinary re-render that happens to
   * re-run the effect. Resetting it there meant the ONE thing this guard exists to prevent - a
   * second `open()` for the same session - was only ever accidentally avoided (by the cancelled
   * timeout racing the reset), not actually guarded against. Storing the checkInId it was last
   * attempted for, and never clearing it except through the explicit "Try again" retry below,
   * means a page load opens a given session at most once, however many times its own effect runs.
   */
  const openedRef = useRef<string | null>(null)
  /**
   * Mirrors the `opened` STATE for the watchdog below.
   *
   * openedRef is a different thing - a re-entry guard that says "an open attempt
   * is scheduled". This one answers the question the watchdog actually needs to ask: did a
   * session ever open?
   */
  const hasOpenedRef = useRef(false)
  /**
   * WHEN THE OPEN REQUEST NOW IN FLIGHT WAS SENT, so the watchdog below can tell a request that is
   * still working from one that never went. Null when no open request is in flight. Each request
   * carries its own number, so an older one landing late never clears a newer one's time.
   */
  const openInFlightRef = useRef<{ n: number; at: number } | null>(null)
  const openCountRef = useRef(0)

  // Doc context
  const [pendingDoc, setPendingDoc]   = useState<File | null>(null)
  const [docContext, setDocContext]   = useState('')
  const [docContextMode, setDocContextMode] = useState(false)

  // Paste text
  const [pasteMode, setPasteMode]     = useState(false)
  const [pasteText, setPasteText]     = useState('')
  const [pasteLabel, setPasteLabel]   = useState('')

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef   = useRef<HTMLTextAreaElement>(null)
  const streamingRef = useRef(false)

  // Typewriter effect for new AI messages. Skipped while a live stream is running -
  // streamed deltas are rendered directly, so the typewriter must not fight them.
  useEffect(() => {
    if (streamingRef.current) return
    const lastIdx = msgs.length - 1
    const last = msgs[lastIdx]
    if (!last || last.role !== 'AI' || last.id === 'loading') {
      setDisplayedMsgs(msgs)
      setStreamingId(null)
      return
    }
    if (displayedMsgs[lastIdx]?.content === last.content) return

    setStreamingId(last.id)
    let i = 0
    const full = last.content
    const base = msgs.slice(0, lastIdx)
    /*
     * THE TYPEWRITER RAN AT A FIXED RATE, SO A LONG ANSWER TOOK LONGER TO APPEAR THAN TO WRITE.
     *
     * Two characters every 25ms is 80 a second, which is a nice pace for a two-line reply and
     * fifteen seconds for a twelve-hundred-character one. And this product's replies get longer
     * exactly when they matter most - a report summary, a long probe - so the wait grew with the
     * value of what was waiting.
     *
     * It is paced by the whole message now rather than per character: whatever the length, it
     * finishes inside FINISH_WITHIN. Short answers keep the same unhurried feel they had, because
     * the step never drops below the old two.
     */
    const FINISH_WITHIN = 2200
    const step = Math.max(2, Math.ceil(full.length / (FINISH_WITHIN / 25)))
    const tick = setInterval(() => {
      i += step
      setDisplayedMsgs([...base, { ...last, content: full.slice(0, i) }])
      if (i >= full.length) {
        clearInterval(tick)
        setDisplayedMsgs(msgs)
        setStreamingId(null)
      }
    }, 25)
    return () => clearInterval(tick)
  }, [msgs])

  useEffect(() => { hasOpenedRef.current = opened }, [opened])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [displayedMsgs, loading])

  /*
   * FOUR SECONDS is where the audit's waits started being noticed, so it is where the wait starts
   * explaining itself. Cleared on the way out so a fast reply never shows the line at all.
   */
  useEffect(() => {
    if (!loading) { setWaitedAWhile(false); return }
    const t = setTimeout(() => setWaitedAWhile(true), 4000)
    return () => clearTimeout(t)
  }, [loading])

  const openSession = useMutation({
    mutationFn: () => {
      const n = ++openCountRef.current
      openInFlightRef.current = { n, at: Date.now() }
      return conversationApi.open(checkInId!).finally(() => {
        if (openInFlightRef.current?.n === n) openInFlightRef.current = null
      })
    },
    onSuccess: res => {
      /* The session whose round had closed was closed as missed and today's opened instead: this page follows it, so what is said goes there. */
      if (res.checkInId && res.checkInId !== checkInId) {
        navigate(`/checkin/${res.checkInId}`, { replace: true, state: { ...((location.state as any) ?? {}), sessionNumber: sessionNumber + 1 } })
        return
      }
      setMsgs([{ id: 'ai-open', role: 'AI', content: res.reply, suggestedAnswers: res.suggestedAnswers, ideaOffer: res.ideaOffer, requestOffer: res.requestOffer, openTheRequest: res.openTheRequest }])
      if (res.groundId && !groundId) setGroundId(res.groundId)
      if (res.brief) setBrief(res.brief)
      setOpened(true)
      setOpenFailed(false)
    },
    /*
     * A 400 HERE DOES NOT MEAN THERE IS NOTHING TO SHOW.
     *
     * `open()` is idempotent server-side once a session has turns - a second caller gets the same
     * reply back, not a 400 - but the door it stands behind (on hold, closed, already complete, not
     * yet theirs to open) still answers 400, and so does a genuine race lost to a concurrent open
     * from another tab or a retried request. Before this read that as "could not open your
     * session" and left the person looking at a dead banner, it is worth asking once more whether
     * the session actually did open in the meantime: if the transcript now has turns, show the
     * conversation instead of a failure that no longer describes what happened. Otherwise, the
     * server's own sentence is shown - permanently, in the banner below, not a toast that fades -
     * so "this check-in is on hold" or "not yet theirs" is read, not guessed at.
     */
    onError: async (err: any) => {
      const message: string = err?.response?.data?.message ?? ''
      setOpenFailedStatus(err?.response?.status ?? null)
      if (checkInId) {
        try {
          const t = await conversationApi.transcript(checkInId)
          const turnsSoFar = t.turns ?? []
          if (turnsSoFar.length > 0) {
            setMsgs(turnsSoFar.map(turn => ({ id: turn.id, role: turn.role, content: turn.content, suggestedAnswers: turn.suggestedAnswers, ideaOffer: turn.ideaOffer, requestOffer: turn.requestOffer, openTheRequest: turn.openTheRequest })))
            if (t.brief) setBrief(t.brief)
            if (t.checkIn?.groundId && !groundId) setGroundId(t.checkIn.groundId)
            setOpened(true)
            setOpenFailed(false)
            return
          }
          /* B-129: the same "a completed check-in has no turns of its own on this endpoint
             unless this page opened it" case as the mount effect above, reached here when that
             effect's own transcript read raced the open request. A 400 "already finished" or
             "already complete" over a check-in the server itself calls COMPLETED is the settled
             state, not a failure to retry. */
          if (t.checkIn?.groundId && !groundId) setGroundId(t.checkIn.groundId)
          if (t.brief) setBrief(t.brief)
          if (t.checkIn?.status === 'COMPLETED') {
            setDone(true); setCompleted(true); setJustFinished(true)
            setOpened(true); setOpenFailed(false)
            return
          }
          if (t.checkIn?.status === 'DECLINED') {
            setDone(true); setDeclined(true)
            setOpened(true); setOpenFailed(false)
            return
          }
        } catch { /* no transcript either; fall through to the failure banner below */ }
      }
      /*
       * B-194: NO TOAST HERE. A toast duplicated the banner's own sentence - the same long
       * message once in the fading red toast and again, permanently, in the banner below with
       * "Try again" - and at 390px the toast sat over the tab row. The comment just above this
       * block already says why the banner, not a toast, is the right place: the state is
       * persistent ("this check-in is on hold", "not yet theirs") until "Try again" is pressed,
       * not a blip that fades on its own. One sentence, said once, is enough.
       */
      setOpenFailedMessage(message || 'Could not open your session. This is usually a temporary issue.')
      setOpenFailed(true)
    },
  })

  /*
   * OPENING A SESSION RUNS SEVERAL MODEL CALLS (ConversationService.open) BEFORE IT ANSWERS, and
   * that is 14 to 60 seconds of "Opening your session…" with nothing else said. Measured against
   * the booted API for the closing wait (SlowStep's own note) and found the same shape here: a
   * silence long enough to read as a hang unless it explains itself. Four seconds, same threshold
   * as the reply wait above, is where somebody starts wondering if anything is happening.
   */
  /* B-208 follow-up: `!openFailed` too - once the open has come back as a failure, the page shows
     its own permanent banner with a "Try again" (below), and "Opening your session…" must not go
     on claiming the session is still opening underneath it. Without this, a failed open on the bed
     (no model reachable) showed the toast, the banner's own 503 sentence, AND this status line, all
     three at once, for the one thing that happened. */
  const openingNow = !openFailed && (openSession.isPending || (!opened && msgs.length === 0 && !completed && !declined))
  const openingIsSlow = useAfterAWhile(openingNow)


  const decline = useMutation({
    mutationFn: () => conversationApi.decline(checkInId!),
    onSuccess: () => { setConfirmingDecline(false); setDone(true); setDeclined(true) },
    onError: () => toast.error('Could not record that. Try again.'),
  })

  /* What the product measured about their own answers, told to them rather than kept behind the
     curtain. Comes back on the completion response; see WhatYouGaveUs. */
  const [whatYouGave, setWhatYouGave] = useState<WhatYouGave | null>(null)
  /* The end card's parts that only the engine can write, sent with the reply that closes the
     conversation (request 7). Null until it does; the card shows what is there. */
  const [endCard, setEndCard] = useState<TheEndCardData | null>(null)
  /* Whether the card is still being written. It takes ten to forty seconds after the goodbye, so the screen waits for it instead of showing a card with nothing in it (user journeys, F-10). */
  const [cardIsBeingWritten, setCardIsBeingWritten] = useState(false)
  useEffect(() => {
    if (!done || completed || declined || endCard || !checkInId) return
    let stillHere = true
    setCardIsBeingWritten(true)
    Promise.resolve(conversationApi.endCard?.(checkInId))
      .then((c) => {
        if (!stillHere) return
        if (c) setEndCard(c)
        /* Only now is it known whether the card lists their answers, so only now may the closing line's middle sentence go (pilots, problem 13). */
        const settle = (v: typeof msgs) => v.map((m) => (m.closesTheCheckIn ? { ...m, content: closingMessageText(m.content, c ?? null) } : m))
        setMsgs(settle)
        setDisplayedMsgs(settle)
      })
      .catch(() => { /* No card stands: finishing reads the record, as it always did. */ })
      .finally(() => { if (stillHere) setCardIsBeingWritten(false) })
    return () => { stillHere = false }
  }, [done, completed, declined, endCard, checkInId])
  /*
   * THE DONE PAGE (done.txt) replaces the conversation the moment somebody finishes here. A check-in
   * finished earlier and opened again still shows its conversation and its report, as before.
   */
  const [justFinished, setJustFinished] = useState(false)
  /* What moved through stages, sent with the completion when the engine has it (request 7). */
  const [whatChanged, setWhatChanged] = useState<WhatChanged | null>(null)
  /* This person's own sessions, for when the next one opens. Only while the end is on screen. */
  const myStatus = useQuery({
    queryKey: ['my-checkin-status', groundId, 'end'],
    queryFn: () => groundsApi.getMyCheckinStatus(groundId!),
    enabled: !!groundId && (done || completed),
    retry: 2,
    retryDelay: 1500,
  })

  const complete = useMutation({
    /* `ended`: the person pressed End session (26 October). */
    mutationFn: (ended?: boolean) => conversationApi.complete(checkInId!, ended === true),
    /*
     * THE ONE-LINE QUESTION ENDS ON THE BOARD. Hafsah, 21 Sep 2026: "I check in on the update scenario...
     * then it should take me to the team board." Somebody who came through the one-line link has one
     * thing to see once they have answered: the board that everybody's answers build. Everybody else
     * gets the finished screen below, with the board as its first button.
     */
    onSuccess: (res: any) => {
      setCompleted(true)
      setJustFinished(true)
      if (res?.whatChanged) setWhatChanged(res.whatChanged as WhatChanged)
      if (res?.whatYouGave) setWhatYouGave(res.whatYouGave as WhatYouGave)
      /*
       * SCREEN FAULT 3 (FINAL WALK): "YOUR TURN" AND "NOBODY HAS CHECKED IN YET" RIGHT AFTER
       * FINISHING. Finishing a session marks this person's own check-in COMPLETED on the server,
       * but nothing here told the query cache - so the check-in's own page (`['ground', id]`,
       * `railAttention` off its stale `checkIns`), the sidebar's "what needs you" list
       * (`['grounds']`) and the board's "who checked in" (`['board', id]`) kept reading the
       * answer this person had just finished as still outstanding. Invalidated here, the moment
       * the server has actually recorded it.
       */
      if (groundId) {
        qc.invalidateQueries({ queryKey: ['ground', groundId] })
        qc.invalidateQueries({ queryKey: ['board', groundId] })
      }
      qc.invalidateQueries({ queryKey: ['grounds'] })
      if (bareFrame && groundId) navigate(`/grounds/${groundId}/board?done=1`, { replace: true })
    },
    /**
     * ALREADY COMPLETE IS NOT A FAILURE.
     *
     * The engine can close a session itself, on the person's last answer. When it
     * does, the record is written and the check-in is COMPLETED before they press
     * anything - and this button then asks the server to complete it a second
     * time, which correctly refuses with "This check-in is already complete".
     *
     * Treating that refusal as an error left `completed` false, so the confirm
     * panel stayed up with a live "Finish check-in" button that could never
     * succeed. The person's account was safely on record and the screen showed
     * them an unfinished session for as long as they were willing to wait. Four
     * separate thirteen-session runs died here, and the first read of it was that
     * the answers had been lost - they had not, the save had already happened.
     *
     * The end state the person asked for is the end state they are in, so this
     * agrees with the server rather than arguing with it.
     */
    onError: (err: any) => {
      const message: string = err?.response?.data?.message ?? ''
      if (/already complete/i.test(message)) {
        setCompleted(true)
        setJustFinished(true)
        /* Screen fault 3: the engine closed this session itself, on the last answer - the same
           stale-cache problem as the success path above, so the same refresh. */
        if (groundId) {
          qc.invalidateQueries({ queryKey: ['ground', groundId] })
          qc.invalidateQueries({ queryKey: ['board', groundId] })
        }
        qc.invalidateQueries({ queryKey: ['grounds'] })
        return
      }
      /**
       * A REFUSAL THAT ASKS FOR MORE HAS TO LET THEM GIVE IT.
       *
       * When the engine decides a session is over it returns sessionComplete, which sets `done`,
       * and `done` disables the composer. If the server then refuses the completion because the
       * record is too thin - "answer a couple of the questions properly, then complete" - the box
       * they would answer in is already switched off. The person is told what to do and given no
       * way to do it, which is the dead end behind "I could not complete my check-in".
       *
       * READS `canContinue` FIRST, THE 400 STATUS AS A FALLBACK (U.8 end-of-module suites,
       * `a-refusal-that-asks-must-be-answerable.spec.ts`). The server marks these two refusals
       * `canContinue: true` - the explicit signal that this 400 is answerable, not a hard stop like
       * a closed ground or a hold, which never carry it. A shared filter once rebuilt every error
       * body between the exception and the client and dropped that field entirely, so the live 400
       * carried no `canContinue` at all and this branch never ran; the filter has been fixed to
       * keep the field, and the `=== 400` fallback stays for exactly that history - if the field
       * were ever dropped again, every completion refusal that is not "already complete" is, by
       * construction, this same case (the gate has only these two throw branches). The server's own
       * sentence is still never shown - only ours.
       */
      if (err?.response?.data?.canContinue || err?.response?.status === 400) {
        /**
         * SAY IT WHERE THE CONVERSATION IS, NOT IN A POP-UP THAT FADES.
         *
         * A toast carrying the server's own gate wording ("the record is still thin") is jargon,
         * and it disappears in a few seconds while the end card came down with it - so the person
         * was left looking at a plain, silent composer with no idea why "finish" did not work.
         * The explanation belongs in the conversation itself, in plain words, as a permanent line
         * they can still see after the toast would have gone. The composer comes back with focus so
         * there is somewhere to act on it straight away.
         */
        setDone(false)
        setMsgs(v => [...v, {
          id: `ai-cannot-finish-yet-${Date.now()}`,
          role: 'AI',
          content: 'I need a little more from you before this check-in can close. Please answer one or two more questions, then finish again.',
        }])
        requestAnimationFrame(() => taRef.current?.focus())
        return
      }
      toast.error(message || 'Could not complete this session.')
    },
  })

  const uploadDoc = useMutation({
    /*
     * WHAT THEY SAID IT IS, KEPT. The line typed in the sheet was shown back as "Context you gave"
     * and then dropped: it never reached the server, so it was gone on the next load and the engine
     * never read it. It goes up as the uploader's note, which the server keeps in their words and
     * shows to them alone (what-a-document-is-for).
     */
    mutationFn: ({ file, ctx }: { file: File; ctx: string }) => {
      if (!groundId) throw new Error('groundId missing')
      /* Added in the check-in itself: with Release 1B's switch on, the server files it as evidence on its item. */
      return documentsApi.upload(groundId, file, false, ctx, { fromTheCheckIn: true })
    },
    onSuccess: async (doc, { ctx }) => {
      /* Now that it has landed, the sheet can go. */
      setDocContextMode(false); setPendingDoc(null); setDocContext('')
      setPasteMode(false); setPasteText(''); setPasteLabel('')
      /* Said as what happened, and who can open it: the server's own answer for this file. What
         they typed about it is not repeated back; it is kept with the file (see mutationFn). */
      void ctx
      const privateToThem = !doc.visibility || doc.visibility === 'OWN'
      const newMsgs: Msg[] = [{
        id: `doc-note-${Date.now()}`,
        role: 'AI',
        content: `You added “${doc.name}”.${privateToThem ? ' Only you can open it.' : ''}`,
      }]
      if (doc.assessment) {
        newMsgs.push({
          id: `doc-assess-${doc.id}`,
          role: 'AI',
          content: '',
          docAssessment: { docId: doc.id, docName: doc.name, assessment: doc.assessment },
        })
      }
      setMsgs(v => [...v, ...newMsgs])
      /*
       * WHAT THE DOCUMENT SUGGESTS, SHOWN ONCE IT IS READ (26 October 2026). Since a0db2a191 ("Nobody waits for a model") the reading is
       * written onto the document after the upload is answered, so `doc.assessment` is never on the upload's reply and this card had
       * quietly stopped appearing. It is fetched when it is ready, for up to a minute, and shown then. the-document-card-waits-for-its-reading.spec.ts
       */
      if (!doc.assessment && groundId) {
        const docId = doc.id, docName = doc.name, gid = groundId
        void (async () => {
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 3000))
            const found = await documentsApi.list(gid).then((all: any) => (Array.isArray(all) ? all : all?.data ?? []).find((d: any) => d.id === docId)).catch(() => null)
            if (found?.assessment?.suggests?.length) {
              setMsgs(v => v.some(m => m.id === `doc-assess-${docId}`) ? v : [...v, { id: `doc-assess-${docId}`, role: 'AI', content: '', docAssessment: { docId, docName, assessment: found.assessment } }])
              return
            }
          }
        })()
      }

      // The engine has a real follow-up for a fresh upload - acknowledge it
      // by name and ask what it confirms (documentReceived), instead of
      // leaving the static line above as the only reaction. This endpoint
      // existed and was fully wired server-side; nothing ever called it.
      if (checkInId) {
        try {
          const { reply } = await conversationApi.documentReceived(checkInId)
          if (reply) setMsgs(v => [...v, { id: `doc-followup-${Date.now()}`, role: 'AI', content: reply }])
        } catch { /* non-critical follow-up; the upload itself already succeeded */ }
      }
    },
    onError: (_err, { file, ctx }) => {
      // Restore what the person typed/picked instead of silently discarding it -
      // previously a failed upload cleared pendingDoc/docContext with no way to retry.
      setPendingDoc(file)
      setDocContext(ctx)
      setDocContextMode(true)
      toast.error('That did not upload. Nothing was added to the record, try again.')
    },
  })

  // Resume an in-progress check-in with its real transcript. open() only ever
  // returns the single opener line, so opening on every mount wiped the visible
  // conversation for a returning user (their turns are safe server-side, but
  // the screen reset to empty). On mount, load the stored transcript first: if
  // there are already turns, render them; only call open() for a fresh session
  // that has none yet.
  useEffect(() => {
    if (checkInId && !opened && openedRef.current !== checkInId) {
      let cancelled = false
      const jitter = Math.random() * 2000
      const t = setTimeout(async () => {
        /* The guard is taken when the open really starts, not when it is scheduled: React's
           development mode runs this effect twice, and a guard taken at scheduling let the first
           run's cancelled timer block the second run, so the page sat on "Opening your session…"
           for good (browser button test, 7 October). */
        if (cancelled || openedRef.current === checkInId) return
        openedRef.current = checkInId
        try {
          const t = await conversationApi.transcript(checkInId)
          if (cancelled) return
          // Reopen (#3): if this is a correction session, show the prior
          // session's turns read-only so the person sees what they said before.
          /*
           * AND THAT THIS IS A CORRECTION, which the header had no way to know.
           *
           * A correction is created at the next free session number, so the page called it
           * "Session 3" while the person had pressed Correct it on session 1. The check-in row
           * has said so all along; the header was reading `sessionNumber` out of navigation
           * state, which carries no such thing.
           *
           * OUT OF THE priorTurns BRANCH, WHERE IT WAS UNREACHABLE. Walked as a real participant:
           * pressed "Something here is wrong - correct it", landed on a page identical to the one
           * left behind - same transcript, same report card, same button - with nothing anywhere
           * saying a correction had opened. It looked so exactly like a failed press that it was
           * pressed again, and two empty correction sessions were created.
           *
           * The three places that say "Correcting session N" were all written and all correct.
           * They were nested inside `if (t.priorTurns.length > 0)`, so whether the page could tell
           * you what you were doing depended on whether the prior turns happened to come back.
           * Whether this is a correction is a fact about the check-in, so it is read from the
           * check-in and nothing else.
           */
          if ((t.checkIn as any)?.isSelfCorrection) {
            setCorrectingSession((t.checkIn as any).selfCorrectionTargetSession ?? t.priorSessionNumber ?? null)
          }
          // Reopen (#3): the prior session's turns, read-only, so the person sees what they said.
          if (t.priorTurns && t.priorTurns.length > 0) {
            setPriorTurns(t.priorTurns.map(turn => ({ id: turn.id, role: turn.role, content: turn.content })))
            setPriorSessionNumber(t.priorSessionNumber ?? null)
          }
          if (t.priorRecordEntries && t.priorRecordEntries.length > 0) {
            setPriorRecordEntries(t.priorRecordEntries)
          }
          /*
            WHAT THIS CHECK-IN IS ABOUT, ON EVERY LOAD.

            `brief` was set in exactly one place - `openSession.onSuccess` - so the band appeared on
            the single load that opened the session and never again. Somebody did an entire check-in
            and only found out what it was about afterwards. Outside the turns check on purpose: a
            session with no turns yet still has a subject, and that is the load where it matters most.
          */
          if (t.brief) setBrief(t.brief)
          if (t.connectWhatsApp) setConnectWhatsApp(t.connectWhatsApp)
          /*
            SCREEN FAULT 3: THE END CARD WAS GONE AFTER A RELOAD, AND THE HEADER READ "ABOUT TWO
            MINUTES" AGAIN. The engine had already closed this conversation - that is exactly what
            `t.endCard` being served means, before the person has pressed "That's right, finish" -
            but only `completed` (set from `t.checkIn.status === 'COMPLETED'` below, which this
            session has not reached yet) ever set `done`, so a reload left `done` false: the end
            card (gated on `done`) did not render, the header fell back to its "About two minutes"
            default, and the only way forward was the manual "Finish my check-in now" fallback
            further down. The served state is the one source of truth for whether this
            conversation has closed, so it is read from here too, not only from the live reply
            that first closed it.
          */
          if (t.endCard) { setEndCard(t.endCard); setDone(true) }
          /*
            AND WHICH SESSION THIS IS, FOR THE SAME REASON AS THE BAND ABOVE.

            This line lived inside the turns check below, so a session with no turns yet - which is
            every session at the moment somebody opens it - kept the default of 1 that navigation
            state carries. Walked in a browser as a participant on session 2: the header said
            "Session 1" and so did the composer, on a page whose opening line was about what they
            said last time.

            Which session this is is a fact about the check-in, not about whether its turns have
            arrived, so it is read from the check-in. Same fix, same paragraph, as the brief.
          */
          if (typeof t.checkIn?.sessionNumber === 'number') setSessionNumber(t.checkIn.sessionNumber)
          if (t.checkIn?.groundId && !groundId) setGroundId(t.checkIn.groundId)
          if (t.turns && t.turns.length > 0) {
            const lastTurnId = t.turns[t.turns.length - 1]?.id
            setMsgs(t.turns.map(turn => ({
              id: turn.id,
              role: turn.role,
              /* Screen fault 2: a reload replays the closing turn's own stored text, which can
                 still claim a record the end card does not have (see
                 a-closing-message-claims-nothing-it-does-not-keep.ts). */
              content: turn.id === lastTurnId ? closingMessageText(turn.content, t.endCard) : turn.content,
              suggestedAnswers: turn.suggestedAnswers, ideaOffer: turn.ideaOffer, requestOffer: turn.requestOffer, openTheRequest: turn.openTheRequest,
            })))
          }
          /**
            * ROUND 6, ITEM 4: A SESSION THAT WAS ALREADY FINISHED GETS THE SAME DONE PAGE AS
            * ONE JUST FINISHED NOW.
            *
            * Loading `/checkin/:id` for a session completed earlier used to set `completed`
            * alone - `justFinished` was only ever set by the two live-finish paths below (the
            * normal finish, and the "already complete" refusal caught while sending) - so the
            * early return to `TheDonePage` never fired here, and the OLD inline "already
            * complete" block further down rendered instead: its own report blocks, a dash-joined
            * sentence, "Open the team board →", and a "Back to check-ins" link cut off at the
            * bottom - none of it the prototype's Done page. `justFinished` is what that early
            * return actually keys on, so this sets it too - the prototype shows the same Done
            * page whether you just finished or are opening a finished check-in fresh.
            *
            * B-129: NOT NESTED INSIDE THE TURNS CHECK ANY MORE. A session this page has never
            * opened keeps no turns of its own on this endpoint - only a session that was actually
            * opened here has any - so `t.turns` is empty for a check-in completed without ever
            * going through this page's own composer, and this whole branch was unreachable for
            * it. That left a real, server-confirmed "you have already finished this check-in"
            * falling through to `openSession.mutate()`, whose 400 then painted the generic
            * failure banner - "Try again" (which can never work), a message box, and "Opening
            * your session…" stuck forever - over what is, in truth, a finished session like any
            * other. `status` is read from the check-in itself, same as `sessionNumber` and
            * `groundId` just above, never from whether turns happened to come back.
            */
          if (t.checkIn?.status === 'COMPLETED') { setDone(true); setCompleted(true); setJustFinished(true) }
          /** Reopening a session already declined must show the settled state, not the composer. */
          if (t.checkIn?.status === 'DECLINED') { setDone(true); setDeclined(true) }
          if ((t.turns && t.turns.length > 0) || t.checkIn?.status === 'COMPLETED' || t.checkIn?.status === 'DECLINED') {
            setOpened(true)
            setOpenFailed(false)
            setKnowWhatIsHere(true)
            return
          }
        } catch { /* no transcript yet or fetch failed - fall through to open() */ }
        /*
         * WE HAVE NOW LOOKED, whether or not we found anything - including on the failure path,
         * where falling through to open() is exactly the case the privacy screen is FOR.
         */
        if (!cancelled) { setKnowWhatIsHere(true); openSession.mutate() }
      }, jitter)

      /**
       * A WATCHDOG, because an opening that never arrives is a dead screen.
       *
       * `openFailed` is only set when the open request comes BACK with an error.
       * If it never returns - or never fires at all, because the transcript fetch
       * ahead of it hangs - then nothing sets it: no message, no "Try again", no
       * composer. The person sits in front of an empty check-in with nothing on
       * screen suggesting anything is wrong and no way forward but a reload.
       *
       * Seen live at sessions 5 and 9 of a thirteen-session ground: the check-in
       * NOT_STARTED, no turns, no error logged anywhere, blank indefinitely.
       *
       * Forty-five seconds is deliberately generous - the opening question is a
       * real model call and twenty seconds is normal - but past that, saying so
       * and offering the retry beats waiting in silence.
       *
       * EXCEPT WHILE THE OPEN REQUEST IS STILL WORKING (release check, 8 October). The first person
       * to open a new check-in waits while the brief is read three times before the first question
       * is written: measured on the test bed against the real model at 65 and 88 seconds. At 45 the
       * screen said "Could not open your session" over a request that was about to succeed, and
       * "Try again" sent a second open beside it, so the person was asked two different first
       * questions. A request in flight is now given until AN_OPEN_MAY_TAKE before the banner; one
       * that never went (the transcript fetch ahead of it hung) still gets the banner at 45.
       */
      let watchdog: ReturnType<typeof setTimeout>
      const fire = () => {
        if (cancelled || hasOpenedRef.current) return
        const inFlight = openInFlightRef.current
        const left = inFlight ? AN_OPEN_MAY_TAKE - (Date.now() - inFlight.at) : 0
        if (left > 0) { watchdog = setTimeout(fire, left); return }
        setOpenFailed(true)
        /**
         * Reset the mutation too, or the retry is offered and unusable.
         *
         * The retry button is disabled while the open request is in flight, and
         * reads "Opening..." rather than "Try again". A request that never comes
         * back is in flight forever, so without this the person gets the banner
         * telling them something went wrong, above a greyed-out button that will
         * never re-enable. Informed and still stuck.
         *
         * Resetting puts the mutation back to idle so the button becomes live.
         * The original request is not cancelled - if it does eventually land,
         * onSuccess still opens the session, which is the outcome they wanted.
         */
        openSession.reset()
      }
      watchdog = setTimeout(fire, 45_000)

      /* The pending timeout and watchdog are always cancelled on cleanup - a genuine unmount must
         not leave either one running against a component that is gone. `openedRef` itself is not
         reset here: the guard it keeps is "has this session already been attempted", which stays
         true until the person presses "Try again" below, whether this cleanup ran because the
         page really unmounted or because the effect merely re-ran. */
      return () => { cancelled = true; clearTimeout(t); clearTimeout(watchdog) }
    }
  }, [checkInId, opened])

  // Streaming send: shows the answer token-by-token. Falls back to the plain
  // request if the stream can't start (proxy buffering, older browser, error).
  async function sendStreaming(message: string) {
    if (!checkInId) return
    setLoading(true)
    const aiId = `ai-${Date.now()}`
    /**
     * The person's own line is echoed locally, before the server has seen it.
     *
     * That is right for the chat - it should feel instant - but it means this
     * message exists on screen whether or not it ever landed. Anything that
     * COUNTS messages to decide what the person may do next has to know the
     * difference, so the optimistic echo is marked as such. See the completion
     * fallback below.
     */
    const localId = `local-${Date.now()}`
    /*
     * THE SAME WORDS, SAID AGAIN TO THE NEXT QUESTION (Drop Access, item 26). Only when this answer is word for word their last
     * one, the question on their screen goes with it, so the server knows they read the reply and are answering it, rather than
     * pressing twice. Any other answer goes as it always has.
     */
    const lastOfTheirs = [...msgs].reverse().find(m => m.role === 'PERSON')?.content ?? null
    const answering = lastOfTheirs != null && lastOfTheirs.trim() === message.trim()
      ? ([...msgs].reverse().find(m => m.role === 'AI' && m.content && m.content !== '…')?.content ?? null)
      : null
    const optimisticTurn: Msg[] = [{ id: localId, role: 'PERSON', content: message }, { id: aiId, role: 'AI', content: '…' }]
    setMsgs(v => [...v, ...optimisticTurn])
    /**
     * `displayedMsgs` is synced here too, not left to the typewriter effect below.
     *
     * That effect only resyncs `displayedMsgs` from `msgs` while `streamingRef.current`
     * is false, and `streamingRef.current` is set true a line below, synchronously, in
     * the same tick as this echo - before React can ever flush a render with it still
     * false. A stream whose mock (or a very fast real one) calls `onDelta`/`onDone` with
     * no genuine async yield then has `onDelta`/`onDone` below run their own `v.map`
     * updates against a `displayedMsgs` that never got these two messages added to it, so
     * the map finds nothing to update and both bubbles never appear - though `msgs` is
     * correct the whole time. Setting it explicitly here means the person's echoed
     * message and the waiting AI bubble are already in `displayedMsgs` before anything
     * else runs, so the `onDelta`/`onDone` maps below always have something to find,
     * whatever the timing of the stream.
     */
    /* From `msgs`, whole, not from what the typewriter has shown so far (Drop Access, 16 October): Mercy answered while the first
       question was still being typed out, and it stayed on her screen as "Last t" for the rest of the check-in, because the
       typewriter is not resumed while a stream runs. */
    setDisplayedMsgs([...msgs, ...optimisticTurn])
    /**
     * Promote the echo once the server has actually answered.
     *
     * The reply is the proof: it can only exist if the turn was stored. Until
     * then the message stays marked local, so nothing that counts landed
     * answers counts this one.
     */
    const acknowledge = () =>
      setMsgs(v => v.map(m => (m.id === localId ? { ...m, id: `sent-${localId}` } : m)))
    let acc = ''
    let started = false
    streamingRef.current = true
    try {
      const handlers: Parameters<typeof streamMessage>[2] = {
        onDelta: (text) => {
          started = true
          acc += text
          setMsgs(v => v.map(m => m.id === aiId ? { ...m, content: acc } : m))
          setDisplayedMsgs(v => v.map(m => m.id === aiId ? { ...m, content: acc } : m))
        },
        onDone: (r) => {
          acknowledge()
          /* Screen fault 2: do not repeat "Below is what I wrote down from your answers." when
             this close sent no record lines - see a-closing-message-claims-nothing-it-does-not-keep.ts. */
          /* Decided only once the card is known: it is written ten to forty seconds after the goodbye (pilots, problem 13). */
          const replyText = r.endCard ? closingMessageText(r.reply, r.endCard) : r.reply
          setMsgs(v => v.map(m => m.id === aiId ? { ...m, content: replyText, closesTheCheckIn: !!r.sessionComplete && !r.endCard, suggestedAnswers: r.suggestedAnswers, ideaOffer: r.ideaOffer, requestOffer: r.requestOffer, openTheRequest: r.openTheRequest } : m))
          setDisplayedMsgs(v => v.map(m => m.id === aiId ? { ...m, content: replyText, closesTheCheckIn: !!r.sessionComplete && !r.endCard, suggestedAnswers: r.suggestedAnswers, ideaOffer: r.ideaOffer, requestOffer: r.requestOffer, openTheRequest: r.openTheRequest } : m))
          if (r.sessionComplete) setDone(true)
          if (r.endCard) setEndCard(r.endCard)
        },
        onError: (m) => { throw new Error(m) },
      }
      await (answering ? streamMessage(checkInId, message, handlers, answering) : streamMessage(checkInId, message, handlers))
      streamingRef.current = false
      setLoading(false)
    } catch (err) {
      streamingRef.current = false
      // If nothing streamed yet, fall back cleanly to the non-streaming path.
      if (!started) {
        setMsgs(v => v.filter(m => m.id !== aiId)) // drop the empty AI bubble; keep the person's message
        setDisplayedMsgs(v => v.filter(m => m.id !== aiId))
        try {
          const res = await (answering ? conversationApi.send(checkInId, message, answering) : conversationApi.send(checkInId, message))
          acknowledge()
          setMsgs(v => v.concat({ id: `ai-${Date.now()}`, role: 'AI', content: res.endCard ? closingMessageText(res.reply, res.endCard) : res.reply, closesTheCheckIn: !!res.sessionComplete && !res.endCard, suggestedAnswers: res.suggestedAnswers, ideaOffer: res.ideaOffer, requestOffer: res.requestOffer, openTheRequest: res.openTheRequest }))
          if (res.sessionComplete) setDone(true)
          if (res.endCard) setEndCard(res.endCard)
        } catch {
          /**
           * A MESSAGE THAT NEVER LANDED USED TO STAY ON SCREEN.
           *
           * The composer is cleared on the way in, and on a total failure the person's bubble was
           * left sitting in the transcript — never acknowledged, so never real. It looked sent, the
           * words were gone from the box, and a reload made the bubble disappear too. Somebody who
           * reads their own message on screen does not retype it.
           *
           * So the bubble comes back out and the words go back where they were written. `started`
           * is false here, which is what tells us the server took nothing.
           */
          setMsgs(v => v.filter(m => m.id !== localId))
          setDisplayedMsgs(v => v.filter(m => m.id !== localId))
          setInput(message)
          toast.error('That did not send. Your message is back in the box, try again.')
        }
        setLoading(false)
      } else {
        setLoading(false)
        toast.error('The reply was cut off. What you sent is on the record, send again to carry on.')
      }
    }
  }

  function send() {
    const content = input.trim()
    /* `done` blocked this too, so Enter did nothing once the engine had signalled a close - the
       other half of the input going dead. What locks the record is `completed`. */
    if (!content || loading || completed || declined || !opened) return
    setInput('')
    if (taRef.current) { try { taRef.current.style.height = '38px' } catch { /* ref detached */ } }
    sendStreaming(content)
  }

  function quickSend(msg: string) {
    if (loading || completed || declined || !opened) return
    sendStreaming(msg)
  }

  /**
   * A SUGGESTED ANSWER CONTAINING "..." IS A SHAPE TO FINISH, NOT A THING TO SEND.
   *
   * docs/conversation-standard.md, point 6: the engine's suggestions are "a help, never a limit".
   * Most of them are a real answer someone might give as it stands - "Sent it. They liked it but
   * want to wait until after December." - and pressing one sends it, same as typing it and hitting
   * Enter. But the engine sometimes sends a shape with a gap in it, marked "...", for something it
   * cannot fill in for the person (a name, a number, a date): sending that literally would put an
   * ellipsis in their record. So this puts it in the box instead, with the "..." itself selected -
   * typing immediately replaces it, rather than the person having to find and delete it first.
   */
  function pickSuggestion(a: string) {
    if (loading || completed || declined || !opened) return
    const gap = a.indexOf('...')
    if (gap === -1) { quickSend(a); return }
    setInput(a)
    requestAnimationFrame(() => {
      const el = taRef.current
      if (!el) return
      el.style.height = '38px'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
      el.focus()
      try { el.setSelectionRange(gap, gap + 3) } catch { /* not focusable yet */ }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }


  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!groundId) { toast.error('Context missing. Please open this session from your check-in page.'); e.currentTarget.value = ''; return }
    setPendingDoc(f)
    setDocContext('')
    setDocContextMode(true)
    e.currentTarget.value = ''
  }

  /* The sheet used to close and clear the moment the mutation was fired, so a failed upload left
     nothing to retry and a slow one (this path runs a model assessment) looked like nothing happened.
     It closes in uploadDoc.onSuccess now, and the commit button is disabled while it runs. */
  function submitDocWithContext() {
    if (!pendingDoc || uploadDoc.isPending) return
    if (!groundId) { toast.error('Context missing. Please open this session from your check-in page.'); return }
    uploadDoc.mutate({ file: pendingDoc, ctx: docContext })
  }

  function submitPaste() {
    const text = pasteText.trim()
    if (!text || !groundId || uploadDoc.isPending) return
    const label = pasteLabel.trim() || 'pasted-note.txt'
    const fileName = label.endsWith('.txt') ? label : label + '.txt'
    const file = new File([text], fileName, { type: 'text/plain' })
    uploadDoc.mutate({ file, ctx: '' })
  }

  /** Leave the check-in for its own page. Nothing is sent: every answer is saved as it is given. */
  function leave() {
    navigate(groundId ? `/grounds/${groundId}${isInitiator ? '' : '/p'}` : '/grounds')
  }

  /*
   * NO LONE "Session 1" AT THE BOTTOM OF AN ORDINARY SESSION (U.8 review). The prototype's own
   * check-in screens (docs/prototype/screens/B3-the-check-in/*.txt) never print a bare session
   * number in the bottom bar - only when there is something to say ABOUT the session, closing one
   * or correcting one, is there a sentence here. An ordinary session says nothing in this spot.
   */
  const privacyLabel = isFinalSession
    ? `Closing session ${sessionNumber} · This is the last word on the record. Take the time to be thorough - what you document here is what the final report weighs.`
    : correctingSession != null
      ? `Correcting session ${correctingSession} · nothing is overwritten - this is recorded alongside what you said then.`
      : null

  /**
   * WHAT HAPPENS TO WHAT YOU WRITE, BEFORE YOU ARE ASKED ANYTHING. (G40)
   *
   * Not a footer and not only copy. People write differently depending on what
   * they believe happens next, so this decides the quality of the record itself
   * - and a one-line "your words are private" under the header is doing that job
   * badly, because it answers a question nobody asked in the terms they wanted.
   *
   * Shown once, on the first session only. Anyone who has already seen it and
   * checked in is not made to read it again; a promise repeated every week stops
   * being read and starts being furniture.
   *
   * EVERY LINE IS TRUE AND TESTABLE TODAY, which is the whole constraint:
   *
   *   Nobody in your organisation can read this. Enforced by the report and
   *   board read paths, not by policy.
   *   Our own support tools cannot show it. The platform-admin view excludes
   *   raw turns, record entries, solo artifacts, lead context notes and the
   *   report body, and its test poisons the query with all five to prove it.
   *   Nothing written here trains a model.
   *
   * AND WHAT IS DELIBERATELY NOT SAID: "we cannot see your conversations".
   * Turns are stored unencrypted and transcripts go to Google for processing.
   * One technical question from a founder or an investor finds that out, and a
   * privacy claim caught being false costs more than one never made. G41 is the
   * work that would make the stronger claim true; until it lands, this says the
   * true version.
   */
  /**
   * AND IT MUST NOT SWALLOW A FAILURE TO OPEN.
   *
   * The state this screen appears in - first session, nothing said yet - is
   * exactly the state a check-in that failed to open is also in. The first
   * version returned early on both, so somebody whose session never opened sat
   * looking at a privacy explainer with no error, no "Try again", and no way to
   * tell that anything was wrong. Caught by the open-watchdog tests, which is
   * precisely what they were written for.
   *
   * An explainer can wait. An error cannot.
   */
  /*
   * AND IT IS NOT A FACT ABOUT THE GROUND'S SESSION NUMBER.
   *
   * This required `sessionNumber === 1`, which is a fact about the check-in rather than about the
   * person reading it. Somebody added at session 3 — a new manager, a colleague brought in halfway
   * through — has their first ever check-in numbered 3, so they were never shown this at all, and
   * wrote their account of the work having been told nothing about who reads it. Found by the
   * hundred-journey audit, which counted how many check-ins ever say so.
   *
   * The acknowledgement is what stops it being read twice, and it already errs the safe way: a
   * person on a new device sees the explainer again rather than never.
   */
  /*
   * THE "WHAT HAPPENS TO WHAT YOU WRITE" GATE IS GONE.
   *
   * A full-page screen stood between a person and their first question, headed "Nobody you work
   * with reads it", with a button to press before the check-in would start. Read back: "the nobody
   * sees what you write page should be deleted." The four claims themselves still exist in one
   * file and still render where somebody is deciding whether to take part - the invitation, and
   * the admin's guide - which is where a promise belongs. Not in front of every session.
   */

  /**
   * B-129 / B-201: A CHECK-IN A STRANGER CANNOT REACH IS A REFUSAL, NOT A LOAD FAILURE - AND THE
   * SAME REFUSAL FOR EVERY REASON (GW-PRI-04).
   *
   * An admin who opened a colleague's check-in by its conversation link (rather than its own
   * page) used to be shown the generic failure banner - "That check-in is not yours to open, so
   * go back to your own check-ins." over a live "Try again" (which can only ever fail the same
   * way again), a message box, and a composer, none of which this reader can use.
   *
   * B-201 found the other half of the same mistake: a made-up id (404, "That check-in could not
   * be found…") still fell through to that same stuck banner rather than to this screen, and the
   * server's two sentences - "not yours" against "could not be found" - told a stranger holding a
   * link whether something real sat behind it. Both answer the same way a check-in's own page
   * already does (GroundParticipantPage, GroundAdminPage): one shared screen, the same wording,
   * whichever of the two the server said.
   */
  if (openFailed && (openFailedStatus === 403 || openFailedStatus === 404) && !bareFrame) {
    return <GroundGone />
  }

  if (justFinished && groundId && checkInId && !bareFrame) {
    return (
      <div className="gwui-ci-done-wrap">
        <TheDonePage
          firstName={firstWordOfAName(user?.firstName)}
          checkInId={checkInId}
          groundId={groundId}
          sessionNumber={sessionNumber}
          myUserId={user?.id}
          isInitiator={isInitiator || !!(ground.data as any)?.viewerIsInitiator}
          whatChanged={whatChanged}
        />
      </div>
    )
  }

  /**
   * ROUND 6, ITEM 2: WHAT THE "WHAT THIS CHECK-IN IS ABOUT, AND WHAT YOU SAID LAST TIME" PANEL
   * HOLDS, COMPUTED ONCE FOR BOTH THE LINK'S OWN "IS THERE ANYTHING TO OPEN" CHECK AND THE PANEL.
   */
  const hasAboutContent = !!brief && !!(brief.subject || brief.says || brief.objectives.length > 0)
  const priorRecordLines = priorRecordEntries
    .flatMap(s => s.entries.map(e => ({ session: s.sessionNumber, type: e.type, text: asTheirWords(e.text), raw: e.text })))
    .filter(l => l.text && !isTheEnginesOwnNote(l.raw))

  /* Fills the screen exactly, so the composer sits at the bottom of the phone and the transcript scrolls inside. */
  return (
    /*
      THE PROTOTYPE'S SHAPE: the way back above one card, and the whole check-in inside the card
      (check-in-start.jpg). On a phone the card fills the screen.

      GROUP 3, PIECE 3: the page's own frame, and everything below it, is built from the shared
      parts in components/gw/ui - ConversationCard/Composer/Bubble/Modal/Section/Tag/Button - with
      every size, colour and spacing of this screen's own markup in gw-ui.css's `.gwui-ci-*`
      classes rather than an inline style.
    */
    <TheDirectMorning on={direct}>
    <div className="main">
      <div className="wrap">
      {/**
        * THE WAY OUT, ON THE LEFT, AND POINTED AT THE GROUND.
        *
        * It has to sit where nothing floats over it (the feedback pill once covered every pixel of
        * the old one), and it goes back to THE GROUND rather than the list of all grounds - leaving
        * a session should not cost you your place. Named after the check-in, as the prototype's
        * "← Sales team, Q3".
        */}
      {/* Not in the bare frame: somebody answering one question from their mail has no use for
          a ground page, and the only control on the screen should not lead out of the thing
          they came to do. See the-link-opens-on-the-question. */}
      <ConversationCard
        backLabel={!bareFrame ? (checkInName || 'Back') : undefined}
        onBack={leave}
        backTitle="Leave this session. Everything you have said is already saved."
        header={(
                <TheCheckInHeader
                  /**
                    * ROUND 6, ITEM 1: THE CHECK-IN'S OWN NAME, THE PROTOTYPE'S SHAPE.
                    * check-in-start.txt: "Sales team check-in" (bold), "About two minutes" under
                    * it, Pause on the right - "Your check-in" named no check-in at all. The
                    * estimate is honest about what it is measuring (this one conversation, not
                    * the record it draws on), so it applies the same way to every check-in.
                    *
                    * REVIEW ROUND 3, ITEM 7: APPENDING " check-in" READ AS "Sales team, Q3
                    * check-in" - a name ending in a comma-joined part, with a second noun stuck on
                    * after the comma reads worse than the fragment it was meant to fix. The
                    * prototype's own title, "Sales team check-in", IS the check-in's name (a
                    * check-in's `label` already names it that way in the prototype's data, not
                    * "Sales team" plus a suffix this screen adds). Simplest: the check-in's own
                    * name, exactly as it is, with nothing appended.
                    */
                  title={checkInName || 'Your check-in'}
                  underTitle={
                    done && !completed && !declined
                      ? 'That’s everything for today'
                      : correctingSession != null
                        ? `Correcting session ${correctingSession}`
                        : isFinalSession
                          ? `Closing session ${sessionNumber}. This is your final account.`
                          : direct ? 'A few minutes' : 'About ten minutes'
                  }
                  mayPause={opened && !completed && !declined}
                  /* Not in the bare frame: the only control on that screen should not lead out of the thing
                     they came to do. See the-link-opens-on-the-question. Skipping is still offered. */
                  onStopForNow={bareFrame ? undefined : leave}
                  onSkip={() => setConfirmingDecline(true)}
                />
        )}
        banners={(
          <>
                {/* Clarification session banner */}
                {isClarificationSession && (
                  <div className="gwui-ci-banner-info">
                    <strong>Clarification session.</strong> Something in your report was inferred, not quoted directly. Tell us what was actually happening and we'll update the record.
                  </div>
                )}

                {/* Session open failure - shown at top of chat area so it's always visible */}
                {openFailed && (
                  <div className="gwui-ci-banner-warn">
                    <span className="gwui-ci-banner-warn-text">{openFailedMessage}</span>
                    <button
                      onClick={() => { setOpenFailed(false); openedRef.current = null; openSession.mutate() }}
                      disabled={openSession.isPending}
                      className="gwui-ci-banner-warn-btn"
                    >
                      {openSession.isPending ? 'Opening…' : 'Try again'}
                    </button>
                  </div>
                )}
          </>
        )}
        bodyRef={msgsRef}
        footer={(
                  <div>
                    {/**
                      * ROUND 6, ITEM 3: THE GREY STRIP IS GONE.
                      *
                      * `background: 'var(--gw-bg)'` with its own `borderBottom` drew a visibly
                      * separate grey band between the last message and the composer - the
                      * prototype has none. The row stays (it still carries a real sentence when
                      * closing or correcting a session, and "Set the context"/"Add people" for
                      * whoever runs it - both real fixes for reported complaints, not decoration),
                      * just on the page's own white now, not banded off from it.
                      */}
                    <div className="gwui-ci-footer-strip">
                      {/* Always the spacer, whether or not there is a sentence to put in it: the buttons after
                          it are laid out against this flex item, not against whether it has words in it. */}
                      <span className="gwui-ci-footer-note">{privacyLabel}</span>
                      {/*
                        * THE TWO THINGS A PERSON KEEPS ASKING FOR, WHERE THEY ARE ASKING FOR THEM.
                        *
                        * Reported twice, the second time with "I told you to fix this": "the chat didn't ask
                        * me who is involved or tell me i can set context or add people later", and "if someone
                        * else is checking in and then others check in against it, the place to set context is
                        * not very good and you are not told you can set context on a tab".
                        *
                        * Both exist. The check-in has a Context tab and a Setup tab, and neither is mentioned
                        * anywhere in the conversation - so somebody sitting in the chat, realising the context
                        * is thin or that the people who should answer are missing, has no idea either is a
                        * click away. A tab nobody is told about is a tab nobody uses.
                        *
                        * Put in the privacy strip rather than in the model's mouth: an instruction to mention
                        * it would fire whenever the model felt like it, and this is true on every turn of
                        * every session. Quiet, always there, and it goes to the tab rather than describing it.
                        */}
                      {/*
                        BOTH OF THESE ARE THE LEAD'S, AND EVERYBODY WAS OFFERED THEM.

                        Walked as a participant: her chat carries "Set the context" and "Add people". The
                        first goes to a Context page that tells her "you cannot change this here"; the second
                        goes to Setup, which opens with "Nothing on this page is yours to change". Two
                        controls offered to somebody, both leading to a page that refuses them - which is
                        worse than not offering, because she has to go and find out.

                        A participant is not short of things to do here: the one thing that IS hers is her
                        own record, and it is already a tab.
                      */}
                      {groundId && isInitiator && (
                        <span className="gwui-ci-footer-links">
                          <button
                            onClick={() => navigate(`/grounds/${groundId}?tab=context`)}
                            className="gwui-ci-footer-link"
                          >
                            Set the context
                          </button>
                          <button
                            onClick={() => navigate(`/grounds/${groundId}?tab=settings`)}
                            className="gwui-ci-footer-link"
                          >
                            Add people
                          </button>
                        </span>
                      )}
                    </div>
                    {/*
                      THE COMPOSER, THE SHAPE EVERY PERSON ALREADY KNOWS. 18 September 2026, her words: "the
                      chat box is small and hard to engage, we need to make it look like you are on whatsapp."
                      Measured on a 375px phone before this: the typing box was 89 pixels wide, because Upload
                      doc and Paste text sat in the same row and took it. On the card whose whole promise is
                      two minutes on a phone, that is the thing that breaks it.

                      So: one round attach button holding both ways of adding something, a full-width pill to
                      type in, and a round send. Nothing was removed - the two controls moved inside the clip.
                    */}
                    <div>
                      <input type="file" id="doc-upload" accept={ACCEPTED_UPLOADS.join(',')} className="gwui-sr-only" onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) {
                          const allowed = ACCEPTED_UPLOADS
                          const ext = '.' + f.name.split('.').pop()?.toLowerCase()
                          if (!allowed.includes(ext)) { toast.error(`File type not supported. Accepted: ${allowed.join(', ')}`); e.target.value = ''; return }
                        }
                        handleFileChange(e)
                      }} />
                      <Composer
                        inputRef={taRef}
                        value={input}
                        onChange={(v) => {
                          setInput(v)
                          const el = taRef.current
                          if (el) { el.style.height = '38px'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
                        }}
                        onKeyDown={handleKeyDown}
                        onSend={send}
                        sendLabel="Send message"
                        disabled={loading || completed || declined || !opened}
                        /* Always beside the typing box, never missing; only disabled for the moment before the check-in has loaded (26 October 2026). */
                        onPlus={() => { if (groundId) setAttachOpen(o => !o) }}
                        plusOpen={attachOpen}
                        plusDisabled={completed || declined || !groundId}
                        plusMenu={groundId ? (
                          <>
                            {/* A photo first, because that is what the check-in asks for: "A photo of it is
                                enough." (check-in-end-card.txt). It is a real upload, and the server keeps it
                                private to whoever added it until they choose otherwise. */}
                            <label htmlFor="doc-upload"
                              title={`Accepted: ${ACCEPTED_UPLOADS.map(e => e.slice(1).toUpperCase()).join(', ')}`}
                              onClick={() => setAttachOpen(false)}
                              className="gwui-ci-attach-item"
                            >
                              Add a photo or a document
                            </label>
                            <button
                              onClick={() => { setAttachOpen(false); if (groundId) setPasteMode(true) }}
                              disabled={completed || declined}
                              className="gwui-ci-attach-item"
                            >
                              Paste text
                            </button>
                            {/* The prototype's own sentence for a new document (U.7, Add a document), and the
                                server's rule: a document starts private to its uploader (who-can-see-a-document). */}
                            <div className="gwui-ci-attach-note">
                              It starts private to you. You choose who can read it.
                            </div>
                          </>
                        ) : undefined}
                      />
                    </div>
                    {/*
                      AND A WAY BACK, WHICH THE BARE FRAME OTHERWISE HAS NONE OF.
                      "What a person now needs to login, is there a place to proceed to sign-in?" - there was
                      not. Accepting the link signed them in, and the page said nothing about it: no name, no
                      way to return on another device, no sign-in anywhere on screen. One line, under the
                      thing they are typing into, says all three.
                    */}
                    {bareFrame && (
                      <div className="gwui-ci-signin-note">
                        {user?.email ? `Signed in as ${user.email}. ` : ''}
                        Your link reopens this any time, or{' '}
                        <button
                          onClick={() => navigate('/auth')}
                          className="gwui-plain-link"
                        >
                          sign in with your email
                        </button>.
                      </div>
                    )}
                    {/*
                     * "CONNECT WHATSAPP" (decision 106): an optional convenience, drawn only when
                     * served - one quiet line near the composer, never in its way. Groundwork
                     * already writes to the person's saved number; this is only for saying hello
                     * back, so it never reads as something the person must do to answer.
                     */}
                    {/* The prototype's own words for it (B3, the check-in): "Answer on WhatsApp instead", a quiet button.
                        The session started here carries on there: the next message on WhatsApp continues this one. */}
                    {/* With the line Hafsah asked for (fix list, item 5): "You can also check in on WhatsApp." */}
                    {connectWhatsApp && (
                      /* Inside the composer's own side padding, not against the screen's edge on a phone. */
                      <div className="gwui-composer-aside">
                        <CheckInOnWhatsApp link={connectWhatsApp.link} label={ANSWER_ON_WHATSAPP_INSTEAD} testId="answer-on-whatsapp" />
                      </div>
                    )}
                  </div>
        )}
      >
          {/* From mount, not from the mutation: the transcript fetch sits behind a deliberate jitter of up to
              two seconds, and openSession.isPending cannot be true until after it, so every arrival opened on
              a blank screen. The jitter stays; the sentence starts earlier. */}
          {openingNow && (
            /*
             * THE SAME "GROUNDWORK IS WRITING…" EVERY OTHER CHAT SHOWS (journey test, 12 October 2026).
             * "Check in yourself" opened this page at once, but the opener took 94 seconds to be
             * written, under "Opening your session…", which read as a page that had not opened. The
             * page is open; Groundwork is writing its first message. Same bubble, sentence and dots
             * as GroundworkIsWriting, kept as one status element so the slow-wait line below sits
             * inside it (the-page-says-what-it-is-doing.spec.ts).
             */
            <Bubble mine={false}>
              <div role="status" aria-live="polite" className="gwui-writing">
                Groundwork is writing…
                <WritingDots />
                {/* Said only once the wait is long enough to need explaining (U.8 review): opening a
                    session runs several model calls and can take up to a minute with nothing else on
                    screen, which read as a hang. */}
                {openingIsSlow && (
                  <div className="gwui-panel-text-muted">{GETTING_YOUR_FIRST_QUESTION_READY}</div>
                )}
              </div>
            </Bubble>
          )}

          {/*
            ROUND 6, ITEM 2: "WHAT THIS CHECK-IN IS ABOUT" AND "WHAT YOU SAID LAST TIME" FOLD
            BEHIND ONE QUIET LINK.

            The prototype starts straight with Groundwork's first turn (check-in-start.jpg) - two
            cards above it, with their own capitalised headings, are not there. Both still carry
            real things the person may want before answering (an objective they have never seen
            elsewhere; what they said last time, so they are not asked to repeat it) - dropping
            them would be the wall an-objective-nobody-has-seen.spec.ts and
            what-you-said-last-time were written against. So they are reachable, not gone: one
            plain link above the first turn opens a panel with both, built from the parts
            (Modal), rather than sitting open on screen before anyone has typed a word.

            NOT IN THE BARE FRAME, same reason as before: a team update's link opens on the
            question, and a card - or now a link - above it says something before anybody has
            typed a word. See the-link-opens-on-the-question.
          */}
          {!bareFrame && (hasAboutContent || priorRecordLines.length > 0) && (
            <button
              type="button"
              onClick={() => setShowAboutPanel(true)}
              className="gw-link t-small gw-start"
            >
              What this check-in is about, and what you said last time
            </button>
          )}
          {showAboutPanel && (
            <Modal title="What this check-in is about, and what you said last time" onClose={() => setShowAboutPanel(false)}>
              {/*
                RE-REVIEW: THE FIRST HEADING REPEATED THE POP-UP'S OWN TITLE. "What this check-in
                is about" said, word for word, the first half of the title right above it
                ("What this check-in is about, and what you said last time"). This block is now a
                plain section with no heading of its own; "What you said last time" below keeps
                its heading, since that is genuinely the title's other half and there is content
                between the two.
              */}
              {hasAboutContent && (
                <div className="gwui-ci-about">
                  {brief!.subject && (
                    <p className="gwui-ci-subject">{brief!.subject}</p>
                  )}
                  {/*
                    THE ENGINE'S OWN COLON SENTENCE, UNCHANGED. "The goals on this check-in: …; …"
                    is the engine's own sentence (request 40 already asks it to write it as a plain
                    sentence) - not reworded here.
                  */}
                  {brief!.says && (
                    <p className="gwui-panel-text">{brief!.says}</p>
                  )}
                  {/*
                    REVIEW ROUND 3, ITEM 7: THE GOALS WERE LISTED TWICE. `brief.says` already names
                    every shared (and, for its owner, personal) goal in prose whenever it is
                    present - `whatAParticipantIsToldAboutThis` (api/src/modules/grounds) builds it
                    from the same objectives this structured list draws from. So this list, which
                    exists to catch an objective the prose might leave out (it never truncates,
                    where `says` caps at four), only draws when there is no prose to have already
                    said them - the one case an objective could otherwise go unseen. Renamed to a
                    full sentence, not a screen-authored colon label.
                  */}
                  {brief!.objectives.length > 0 && !brief!.says && (
                    <>
                      <p className="gwui-panel-text-muted">These are the goals on record.</p>
                      {brief!.objectives.map((o, i) => (
                        <p key={i} className="gwui-panel-text">
                          {o.name}{o.target != null ? ` (${o.target.toLocaleString('en-US')})` : ''}
                        </p>
                      ))}
                    </>
                  )}
                  {brief!.alsoSay && (
                    <p className="gwui-panel-text-muted">{brief!.alsoSay}</p>
                  )}
                  {!direct && <p className="gwui-panel-text-muted">Answer in your own words. You are not expected to agree with any of it.</p>}
                </div>
              )}
              {priorRecordLines.length > 0 && (
                <Section heading="What you said last time">
                  <div className="gwui-ci-record-list">
                    {priorRecordLines.map((l, i) => (
                      <div key={i} className="gwui-ci-record-line">
                        <span className="gwui-panel-text">{l.text}</span>
                        <Tag tone="plain">{RECORD_ENTRY_LABELS[l.type] ?? l.type}</Tag>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </Modal>
          )}
          {priorTurns.length > 0 && (
            <div className="gwui-ci-prior">
              <div className="gwui-ci-prior-label">
                {/* REVIEW ROUND 3, ITEM 7: A SENTENCE, NOT A DOT-JOINED FRAGMENT. */}
                From your earlier session{priorSessionNumber != null ? ` ${priorSessionNumber}` : ''}. You can read it, not change it.
              </div>
              <div className="gwui-ci-prior-list">
                {priorTurns.map(m => (
                  <div key={`prior-${m.id}`} className={`gwui-ci-prior-bubble ${m.role === 'PERSON' ? 'gwui-ci-prior-bubble-mine' : 'gwui-ci-prior-bubble-theirs'}`}>
                    {nothingInternalReachesTheBubble(m.content)}
                  </div>
                ))}
              </div>
              <div className="gwui-ci-prior-foot">
                This stays on record as it is. What you add below is recorded as an update, not a replacement.
              </div>
            </div>
          )}
          {/*
            THE WAITING TREATMENT EXISTED AND THE BUBBLE THAT NEEDED IT DID NOT QUALIFY FOR IT.

            "As a participant I type and I don't know if my chat landed until seconds later." The
            message does appear at once, and so does an assistant bubble - carrying a literal "…",
            because the bouncing dots and the after-a-few-seconds explanation below are gated on
            `m.id === 'loading'` and the optimistic bubble is minted with its own id. So the one
            path a person actually takes got a static ellipsis, which reads as a rendering glitch,
            while the treatment written for exactly this sat one condition away.

            Matched on what the bubble IS rather than on which id it happens to carry.
          */}
          {displayedMsgs.map(m => (
            m.docAssessment ? (
              <AssessmentCard
                key={m.id}
                groundId={groundId ?? ''}
                docId={m.docAssessment.docId}
                docName={m.docAssessment.docName}
                assessment={m.docAssessment.assessment}
                onCorrected={(a) => setMsgs(v => v.map(msg => msg.id === m.id ? { ...msg, docAssessment: { ...msg.docAssessment!, assessment: a } } : msg))}
              />
            ) : (
            <Bubble
              key={m.id}
              mine={m.role === 'PERSON'}
              opacity={isWaiting(m) ? 0.5 : 1}
            >
              {isWaiting(m) ? (
                /*
                 * "GROUNDWORK IS WRITING…", AND AFTER A FEW SECONDS WHAT THE WAIT MEANS.
                 *
                 * Ninety-nine of the hundred audited journeys waited longer than four seconds for
                 * a reply, and the answer to that doubt was people pressing send again — which
                 * used to put the same sentence in the record twice. `wrap={false}`: this turn
                 * already has its own enclosing `Bubble` (the one this content sits inside), so
                 * the indicator draws only its sentence and dots, not a second bubble around them.
                 */
                <>
                  <GroundworkIsWriting wrap={false} />
                  {waitedAWhile && (
                    <span role="status" className="gwui-ci-dot-note">
                      {STILL_READING_WHAT_YOU_WROTE}
                    </span>
                  )}
                </>
              ) : nothingInternalReachesTheBubble(m.content)}
              {streamingId === m.id && (
                <span className="gwui-ci-caret" />
              )}
            </Bubble>
            )
          ))}
          {/*
            THE ENGINE'S SUGGESTED ANSWERS, UNDER THE LATEST QUESTION ONLY (check-in-start.txt). Not
            while its words are still arriving, and not once the conversation has closed: the end card
            has its own two buttons. Pressing one sends it as the answer, exactly as if it were typed.
          */}
          {(() => {
            const last = displayedMsgs[displayedMsgs.length - 1]
            if (!last || last.role !== 'AI' || isWaiting(last) || streamingId !== null) return null
            if (loading || done || completed || declined || !opened) return null
            return <SuggestedAnswers answers={last.suggestedAnswers} onPick={pickSuggestion} />
          })()}
          {/*
            PIECE 21: THE YES TO CAPTURE AN IDEA FOR THE TEAM (plan section 5 row 21; decision 96,
            item 10). The same gate as the suggested answers above: not while its words are still
            arriving, and not once the conversation has closed. "Yes, capture it" and "Not now" are
            sent the same way a suggested answer is - typed and sent, in the person's own words.
          */}
          {(() => {
            const last = displayedMsgs[displayedMsgs.length - 1]
            if (!last || last.role !== 'AI' || isWaiting(last) || streamingId !== null) return null
            if (loading || done || completed || declined || !opened) return null
            return <IdeaOffer offer={last.ideaOffer} onPick={pickSuggestion} />
          })()}
          {/*
            ANCHOR PIECES 26/27: A LEAVE OR SPENDING REQUEST OFFERED IN THE CHECK-IN (section 22;
            docs/answers-from-engine.md, "Anchor pieces 26 and 27"). Same gate as the idea offer
            above. Only one of `ideaOffer` and `requestOffer` ever rides on the same reply, so at
            most one of the two blocks here ever draws anything.
          */}
          {(() => {
            const last = displayedMsgs[displayedMsgs.length - 1]
            if (!last || last.role !== 'AI' || isWaiting(last) || streamingId !== null) return null
            if (loading || done || completed || declined || !opened) return null
            return <RequestOffer offer={last.requestOffer} onPick={pickSuggestion} />
          })()}
          {/*
            ANCHOR PIECES 26/27: WHAT THEIR YES OPENS. Served on the reply that follows their yes -
            the spec's sentence, and, while the suite is on, a button to the suite's own request
            form (Leave or Payment Requests), filled in from what was read in their own words.
            Nothing is sent for them; the button only opens the form.

            STAYS ON THE DONE STATE (screen fault 5). The reply that closes the check-in can be the
            very same reply that carries `openTheRequest` - the form is the person's only way to
            reach the request, so hiding it once `done` stranded them with no way to ask for leave or
            spending after the conversation that offered it. `RequestOffer` just above (the yes/no
            question itself) is a different thing and stays hidden once done: answering it is a
            question, not a path to a form, and the conversation that could hear "yes" or "no" has
            already closed.
          */}
          {(() => {
            const last = displayedMsgs[displayedMsgs.length - 1]
            if (!last || last.role !== 'AI' || isWaiting(last) || streamingId !== null) return null
            if (loading || completed || declined || !opened) return null
            return <OpenTheRequest open={last.openTheRequest} replyText={last.content} />
          })()}
          {/*
            THE END CARD (check-in-end-card.txt). Finishing never happens on its own: the engine
            closing the conversation brings up this card, and only "That’s right, finish" finishes.
            "Change something" goes back to the conversation, where they say what is wrong in their
            own words; the card comes back on the next close.
          */}
          {done && !completed && !declined && (
            <TheEndCard
              engine={endCard}
              beingWritten={cardIsBeingWritten}
              leadName={whoElseAnswers(ground.data as any)}
              nextOpens={whenTheNextOneOpens(myStatus.data?.checkIns, checkInId, new Date(), myStatus.data)}
              othersCanSeeWhatYouSay={(ground.data as any)?.aTeamReportComes}
              whoReadsIt={(ground.data as any)?.viewerIsInitiator ? null : whoRunsThis(ground.data as any)}
              finishing={complete.isPending}
              /*
                HALF A MINUTE OF "SAVING…" READS AS A HANG. W8-16. Completing runs two model calls
                before it answers - scoring the account, then pulling the record entries out of it -
                so the wait says what is happening.
              */
              whileFinishing={<SlowStep steps={CLOSING_STEPS} />}
              onFinish={() => complete.mutate(false)}
              onChange={() => { setDone(false); taRef.current?.focus() }}
            />
          )}
          {/*
            THE TARGETS YOU GAVE, AT THE END OF YOUR OWN CHECK-IN (Hafsah, 18 October). Once the lead has finished, the targets read
            from her words wait here as one card, for her to confirm or correct before they go on record. The server holds them back
            only on a sales check-in with Release 1's sales board on, so with it off nothing shows here.
          */}
          {completed && groundId && (ground.data as any)?.viewerIsInitiator && (
            <WaitingForYouToConfirm groundId={groundId} lookAgain onlyTheTargetsYouGave />
          )}
          {/* THE END OF A SESSION (fix list, item 5): the next one can be answered on WhatsApp. Only where the server serves the way to connect. */}
          {(done || completed) && !declined && connectWhatsApp && (
            <CheckInOnWhatsApp link={connectWhatsApp.link} label={connectWhatsApp.says} testId="check-in-on-whatsapp-next-time" />
          )}
          {/* Manual fallback: "done" flips on the AI's close marker, or when the
              person asked to finish and the reply asked nothing (closesInOtherWords
              on the backend). A closing reply can still miss both, which would
              leave no way to complete. Once there's a real record built,
              offer a manual path - the backend's own readiness gate is the
              actual authority and returns a clear message if it's too early. */}
          {/* COUNT WHAT LANDED, NOT WHAT WAS TYPED.
              This counted every PERSON message on screen, including the ones
              echoed locally on send. So a dropped send inflated the count, this
              offered "Complete session", and the server then refused it: "a few
              more exchanges are needed before this check-in can close". The
              person is invited to finish and immediately turned down.
              Seen four times in one twelve-session run. Only messages the server
              has acknowledged are counted now, so the offer never appears on the
              strength of an echo that never landed.

              THE THRESHOLD IS THE SERVER'S OWN FLOOR (`mayCompleteAfter`), NOT A NUMBER OF ITS
              OWN (restored, U.8 end-of-module suites - `one-floor-not-two.spec.ts`). U.8's fourth
              review tried offering from the first landed answer always, reasoning that the
              engine's closing message and its own completion gate can disagree on the same
              session (request 47) - but that rule exists precisely so the engine, the server's
              refusal, and this offer never disagree about when finishing is allowed: a live
              check-in has deadlocked with the composer disabled, the session read as over, and
              the server refusing to close it, exactly when two sources of truth about the floor
              drifted apart. Removing the gate here recreated that shape from the other side. The
              refusal below still hands the composer back in plain words on an early press either
              way - that part of the fourth review's fix stands - but the offer itself now waits
              for the one floor everybody reads. */}
          {/*
            END SESSION, ALWAYS THERE (Hafsah, 26 October 2026). From the first message, on the web and the phone layout alike. What was
            said is kept and the next session picks up what is missing; with nothing said yet the server says so and the check-in stays open.
          */}
          {!done && !completed && !declined && opened && (
            <div className="gwui-ci-finish-wrap">
              {/*
                SCREEN FAULT 3: A 32px TEXT LINK WAS THE ONLY WAY FORWARD HERE, BELOW THE 40px
                FLOOR EVERY TAPPABLE CONTROL ON A PHONE NEEDS. `Button` (components/gw/ui) is
                44px tall at every width, the same shared part every other action on this page
                already uses, so this one no longer needs its own undersized class.
              */}
              <button type="button" className="gw-link" onClick={() => complete.mutate(true)} disabled={complete.isPending}>
                {complete.isPending ? 'Ending…' : 'End session'}
              </button>
            </div>
          )}
          {declined && (
            <div className="gwui-stack-10">
              <div className="gwui-ci-settled-box">
                <div className="gwui-ci-settled-title">You declined this session.</div>
                <div className="gwui-ci-settled-body">
                  That is recorded. The report for this session will say you declined and will not guess at
                  what you would have said. Nothing you write here counts towards it now.
                  {' '}If there is another session, you can take part in that one.
                </div>
              </div>
              <div className="gwui-ci-back-wrap">
                <button onClick={() => navigate('/grounds')} className="gwui-ci-back-link">
                  ← Back to check-ins
                </button>
              </div>
            </div>
          )}

          {confirmingDecline && !declined && (
            <div className="gwui-stack-10">
              <div className="gwui-ci-confirm-box">
                <div className="gwui-ci-confirm-title">
                  Not taking part in this session?
                </div>
                {/*
                  Everything that follows from it, before they do it. A final action whose consequences
                  are discovered afterwards is a trap, however quiet the button was.
                */}
                <ul className="gwui-ci-confirm-list">
                  <li>This cannot be undone for this session.</li>
                  <li>The session finishes without your answers, so nobody is left waiting on you.</li>
                  <li>The report will say you declined. It will not guess at what you would have said.</li>
                  {!direct && <li>Nothing you have written here is shown to anyone.</li>}
                </ul>
                <div className="gwui-ci-confirm-actions">
                  <Button kind="primary" onClick={() => decline.mutate()} disabled={decline.isPending}>
                    {decline.isPending ? 'Recording…' : 'Yes, I am not taking part'}
                  </Button>
                  <Button kind="secondary" onClick={() => setConfirmingDecline(false)}>
                    Keep going
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* The way to say no is under Pause now, in the header (check-in-start.txt), where it is
              present on every turn and still one step from final: the confirm above spells it out. */}

          {completed && groundId && checkInId && (
            <div className="gwui-stack-10">
              <TheCheckInYouJustFinished checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} />
              {/* What we measured about their answers, said to them - see WhatYouGaveUs. */}
              <WhatYouGaveUs it={whatYouGave} />
              {/* When the next one opens: the thing people asked after finishing. See YourNextCheckIn. */}
              <YourNextCheckIn groundId={groundId} />
              {/* And, for whoever is running it, the state of the round they are now waiting on. */}
              {isInitiator && <WhoIsStillOut groundId={groundId} sessionNumber={sessionNumber} myUserId={user?.id} />}
              {/*
                * WHERE THE REPORT LIVES, AND WHERE THE PEOPLE GO.
                *
                * The only way out of a finished session was "Back to check-ins", which is the list of
                * every check-in in the organisation. So the report somebody had just read had no
                * second home they could find - "the report showed up but I have no place else to see
                * the report i just saw" - and there was nowhere to add the people who still have to
                * check in, from the screen where you have just realised you need them.
                *
                * Both live on the check-in itself, one click away, and neither was linked from here.
                */}
              {/*
                * "SEE THE FULL REPORT" WAS A PROMISE THIS BUTTON COULD NOT KEEP.
                *
                * It went to the ground's Report tab, which holds the SHARED report - the one that
                * does not exist until everybody has checked in. So somebody who had just read their
                * own report pressed a button offering more of it and landed on "waiting for
                * sessions": "when I click the report, it redirects me somewhere else. Why can't I
                * see the same report I just saw at the end of a check-in."
                *
                * The report she wants is the one directly above this button, and it stays there -
                * this page renders it for any completed session of yours. What was missing was a
                * sentence saying which report is which, and that is what replaces the button.
                */}
              <p className="gwui-ci-finished-note">
                This report is yours and it stays on this session - the button below opens it on
                its own, and it is also under Report, in Your sessions. The shared report, where
                what everybody said sits side by side, appears once the others have checked in.
              </p>
              {/*
                PRIMARY-BUTTONS-NEVER-TOGETHER: "Open the team board" is the one navy action on this
                panel. "Open my report" and "Open this check-in" only go elsewhere, so they are
                secondary, same as every other page that keeps one true primary action.
              */}
              <div className="gwui-ci-finished-actions">
                {/* The check-in itself, where the people, the sessions and the setup all live.
                    Deliberately not deep-linked to a tab: the tab keys and their labels differ
                    ("settings" is shown as "Setup"), and a link that lands on the wrong one is
                    worse than a link that lands on the page and lets somebody look. */}
                {/*
                  THE REPORT, ON ITS OWN, WITH NOTHING ELSE ON THE PAGE.
                  It is rendered above this block too - but above a screen's worth of transcript,
                  which is why it kept reading as gone. This opens the same report by itself.
                */}
                {/* The board first: the whole run in one place, and where the Report tab now leads too. */}
                {groundId && (
                  <Button kind="primary" onClick={() => navigate(`/grounds/${groundId}/board`)}>
                    Open the team board →
                  </Button>
                )}
                <Button kind="secondary" onClick={() => navigate(`/checkin/${checkInId}/report`)}>
                  Open my report
                </Button>
                <Button kind="secondary" onClick={() => navigate(`/grounds/${groundId}`)}>
                  Open this check-in
                </Button>
              </div>
              <div className="gwui-ci-back-wrap">
                <button onClick={() => navigate('/grounds')} className="gwui-ci-back-link">
                  ← Back to check-ins
                </button>
              </div>
            </div>
          )}
      </ConversationCard>

      </div>

      {/* Paste text overlay */}
      {/* zIndex 9100, ABOVE THE FLOATING HELP BUTTON, which is fixed at 8000.
          These sheets were at 50. At 375px each one asks for text in a box that
          runs the full width, and the "?" button sat directly on top of its right
          edge - over a field somebody is being asked to type in. Found the first
          time any run drove the participant path at a phone width, which is what
          that was for. */}
      {pasteMode && (
        <div className="gwui-ci-sheet-overlay">
          <div className="gwui-ci-sheet">
            <div className="gwui-ci-sheet-handle" />
            <div className="gwui-ci-sheet-title">📋 Paste text</div>
            {/*
              U.8 REVIEW: "Slack thread" AND "THE TOOL" ARE WORK JARGON, AND THE PANEL NEVER SAID
              WHAT THE UPLOAD MODAL RIGHT NEXT TO IT ALREADY SAYS - that this starts private, the
              same as a photo or a document (see the upload label below "Add a photo or a
              document"). Pasted text goes up through the same upload endpoint as a file
              (documentsApi.upload), so it already gets the same OWN-by-default privacy
              (who-can-see-a-document.ts); this only makes the panel say so.
            */}
            <div className="gwui-ci-sheet-note">
              Paste an email, a message or your notes. It starts private to you.
            </div>
            <label htmlFor="paste-label" className="gwui-ci-sheet-label">
              What is it? You can skip this.
            </label>
            <input
              id="paste-label"
              value={pasteLabel}
              onChange={e => setPasteLabel(e.target.value)}
              className="gwui-ci-sheet-field"
            />
            <textarea autoFocus
              placeholder="Paste your text here…"
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              className="gwui-ci-sheet-textarea"
            />
            <div className="gwui-ci-sheet-actions">
              <button onClick={() => { setPasteMode(false); setPasteText(''); setPasteLabel('') }}
                className="gwui-ci-sheet-cancel">
                Cancel
              </button>
              <button onClick={submitPaste} disabled={!pasteText.trim() || uploadDoc.isPending}
                className="gwui-ci-sheet-submit">
                {uploadDoc.isPending ? 'Adding…' : 'Add it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doc context overlay */}
      {/* Same z-index correction as the paste sheet above: both were at 50,
          under the fixed help button at 8000. */}
      {docContextMode && pendingDoc && (
        <div className="gwui-ci-sheet-overlay">
          <div className="gwui-ci-sheet">
            <div className="gwui-ci-sheet-handle" />
            <div className="gwui-ci-sheet-title">📎 {pendingDoc.name}</div>
            <div className="gwui-ci-sheet-note">
              What does it show? One line is enough; you can skip it.
            </div>
            <textarea autoFocus
              aria-label="What does it show?"
              value={docContext} onChange={e => setDocContext(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDocWithContext() } }}
              className="gwui-ci-sheet-textarea gwui-ci-sheet-textarea-short"
            />
            <div className="gwui-ci-sheet-actions">
              <button onClick={() => { setDocContextMode(false); setPendingDoc(null) }}
                className="gwui-ci-sheet-cancel">
                Cancel
              </button>
              <button onClick={submitDocWithContext} disabled={uploadDoc.isPending}
                className="gwui-ci-sheet-submit">
                {uploadDoc.isPending ? 'Adding…' : 'Add to session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TheDirectMorning>
  )
}

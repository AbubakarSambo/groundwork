import { useState, useEffect, useRef } from 'react'
import { nothingInternalReachesTheBubble } from '@/lib/nothing-internal-reaches-the-bubble'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { justTheQuestion } from '@/pages/invite/the-link-opens-on-the-question'
import { useMutation, useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { conversationApi, streamMessage, type CheckInBrief } from '@/api/conversation'
import { documentsApi, type DocumentAssessment } from '@/api/documents'
import { useAuthStore } from '@/stores/auth'
import { asTheirWords, isTheEnginesOwnNote } from '@/lib/as-their-words'
import { YourNextCheckIn } from '@/components/gw/YourNextCheckIn'
import { TheCheckInYouJustFinished } from '@/components/gw/TheCheckInYouJustFinished'
import { WhatYouGaveUs, type WhatYouGave } from '@/components/gw/WhatYouGaveUs'
import { WhoIsStillOut } from '@/components/gw/WhoIsStillOut'
import { SlowStep, CLOSING_STEPS } from '@/components/gw/SlowStep'
import { TheCheckInHeader } from '@/components/gw/checkin/TheCheckInHeader'
import { SuggestedAnswers } from '@/components/gw/checkin/SuggestedAnswers'
import { toast } from 'sonner'

/** ONE LIST. The OS dialog offered 23 extensions, the label's title a third list of 9, and the validator refused everything outside these 10 - so the dialog invited a refusal the product then issued. */
/* .webp and .heic too: an iPhone photo is HEIC, and the server has always read both (documents.service ALLOWED_MIME). */
const ACCEPTED_UPLOADS = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.md']

interface Msg {
  id: string
  role: 'AI' | 'PERSON'
  content: string
  docAssessment?: { docId: string; docName: string; assessment: DocumentAssessment }
  /** The engine's suggested answers for this question, when it sends them. See SuggestedAnswers. */
  suggestedAnswers?: string[]
}

/** Shows a document's "what this suggests / what will be done with it" bullets,
 * with an inline correction affordance so the person can fix a wrong read. */
function AssessmentCard({ groundId, docId, docName, assessment, onCorrected }: {
  groundId: string; docId: string; docName: string; assessment: DocumentAssessment
  onCorrected: (a: DocumentAssessment) => void
}) {
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
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', background: 'white', maxWidth: '82%', alignSelf: 'flex-start' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 8 }}>📎 {docName}</div>
      {!editing ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What this suggests</div>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {assessment.suggests.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What I will do with it</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {assessment.willDo.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <button onClick={() => setEditing(true)} style={{ marginTop: 10, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
            Not right? Correct this
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What this suggests (one per line)</div>
          <textarea value={suggestsText} onChange={e => setSuggestsText(e.target.value)} rows={3}
            style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What I will do with it (one per line)</div>
          <textarea value={willDoText} onChange={e => setWillDoText(e.target.value)} rows={2}
            style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ padding: '7px 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save correction'}
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} style={{ padding: '7px 14px', borderRadius: 6, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
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

export function ChatPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)

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
  const [showAllPrior, setShowAllPrior] = useState(false)
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
  const [brief, setBrief] = useState<CheckInBrief | null>(null)
  /*
   * WHEN THE SCREEN MAY OFFER TO FINISH. The server holds a check-in to a turn floor - five answers
   * for a full check-in, three for a team update, one for a correction - and this page used to keep
   * its own copy of that number. The copies drifted (the server's went to five on 11 September, this
   * one stayed at three), and for ten days the page offered "Complete session" two answers before the
   * server would honour it: "a few more exchanges are needed" as a pop-up, on the button the page had
   * just shown. The server now says the number with the session, and this page reads it. Five until
   * it does, which is the stricter of the two and cannot offer early.
   */
  const [mayCompleteAfter, setMayCompleteAfter] = useState(5)
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
  const [confirmingDecline, setConfirmingDecline] = useState(false)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [openFailed, setOpenFailed]   = useState(false)
  const openedRef = useRef(false)
  /**
   * Mirrors the `opened` STATE for the watchdog below.
   *
   * openedRef is a different thing - a re-entry guard that says "an open attempt
   * is scheduled", and it is deliberately reset in cleanup. This one answers the
   * question the watchdog actually needs to ask: did a session ever open?
   */
  const hasOpenedRef = useRef(false)

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
    mutationFn: () => conversationApi.open(checkInId!),
    onSuccess: res => {
      setMsgs([{ id: 'ai-open', role: 'AI', content: res.reply, suggestedAnswers: res.suggestedAnswers }])
      if (res.groundId && !groundId) setGroundId(res.groundId)
      if (res.brief) setBrief(res.brief)
      if (res.mayCompleteAfter) setMayCompleteAfter(res.mayCompleteAfter)
      setOpened(true)
      setOpenFailed(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Could not open session.')
      setOpenFailed(true)
    },
  })


  const decline = useMutation({
    mutationFn: () => conversationApi.decline(checkInId!),
    onSuccess: () => { setConfirmingDecline(false); setDone(true); setDeclined(true) },
    onError: () => toast.error('Could not record that. Try again.'),
  })

  /* What the product measured about their own answers, told to them rather than kept behind the
     curtain. Comes back on the completion response; see WhatYouGaveUs. */
  const [whatYouGave, setWhatYouGave] = useState<WhatYouGave | null>(null)

  const complete = useMutation({
    mutationFn: () => conversationApi.complete(checkInId!),
    /*
     * THE ONE-LINE QUESTION ENDS ON THE BOARD. Hafsah, 21 Sep 2026: "I check in on the update scenario...
     * then it should take me to the team board." Somebody who came through the one-line link has one
     * thing to see once they have answered: the board that everybody's answers build. Everybody else
     * gets the finished screen below, with the board as its first button.
     */
    onSuccess: (res: any) => {
      setCompleted(true)
      if (res?.whatYouGave) setWhatYouGave(res.whatYouGave as WhatYouGave)
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
      if (/already complete/i.test(message)) { setCompleted(true); return }
      /**
       * A REFUSAL THAT ASKS FOR MORE HAS TO LET THEM GIVE IT.
       *
       * When the engine decides a session is over it returns sessionComplete, which sets `done`,
       * and `done` disables the composer. If the server then refuses the completion because the
       * record is too thin - "answer a couple of the questions properly, then complete" - the box
       * they would answer in is already switched off. The person is told what to do and given no
       * way to do it, which is the dead end behind "I could not complete my check-in".
       *
       * The server marks those two refusals `canContinue`, so re-open the session rather than
       * leaving them looking at a disabled box and an instruction. Not matched on the wording:
       * rewording the sentence would otherwise quietly bring the trap back.
       */
      if (err?.response?.data?.canContinue) {
        setDone(false)
        setConfirmingFinish(false)
        toast.error(message || 'A little more is needed before this can close.')
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
      return documentsApi.upload(groundId, file, false, ctx)
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
    if (checkInId && !opened && !openedRef.current) {
      openedRef.current = true
      let cancelled = false
      const jitter = Math.random() * 2000
      const t = setTimeout(async () => {
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
          if (t.mayCompleteAfter) setMayCompleteAfter(t.mayCompleteAfter)
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
            setMsgs(t.turns.map(turn => ({ id: turn.id, role: turn.role, content: turn.content, suggestedAnswers: turn.suggestedAnswers })))
            if (t.checkIn?.status === 'COMPLETED') { setDone(true); setCompleted(true) }
            /** Reopening a session already declined must show the settled state, not the composer. */
            if (t.checkIn?.status === 'DECLINED') { setDone(true); setDeclined(true) }
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
       */
      const watchdog = setTimeout(() => {
        if (cancelled || hasOpenedRef.current) return
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
      }, 45_000)

      return () => { cancelled = true; clearTimeout(t); clearTimeout(watchdog); openedRef.current = false }
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
    setMsgs(v => [...v, { id: localId, role: 'PERSON', content: message }, { id: aiId, role: 'AI', content: '…' }])
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
      await streamMessage(checkInId, message, {
        onDelta: (text) => {
          started = true
          acc += text
          setMsgs(v => v.map(m => m.id === aiId ? { ...m, content: acc } : m))
          setDisplayedMsgs(v => v.map(m => m.id === aiId ? { ...m, content: acc } : m))
        },
        onDone: (r) => {
          acknowledge()
          setMsgs(v => v.map(m => m.id === aiId ? { ...m, content: r.reply, suggestedAnswers: r.suggestedAnswers } : m))
          setDisplayedMsgs(v => v.map(m => m.id === aiId ? { ...m, content: r.reply, suggestedAnswers: r.suggestedAnswers } : m))
          if (r.sessionComplete) setDone(true)
        },
        onError: (m) => { throw new Error(m) },
      })
      streamingRef.current = false
      setLoading(false)
    } catch (err) {
      streamingRef.current = false
      // If nothing streamed yet, fall back cleanly to the non-streaming path.
      if (!started) {
        setMsgs(v => v.filter(m => m.id !== aiId)) // drop the empty AI bubble; keep the person's message
        try {
          const res = await conversationApi.send(checkInId, message)
          acknowledge()
          setMsgs(v => v.concat({ id: `ai-${Date.now()}`, role: 'AI', content: res.reply, suggestedAnswers: res.suggestedAnswers }))
          if (res.sessionComplete) setDone(true)
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !groundId) return
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

  const privacyLabel = isFinalSession
    ? `Closing session ${sessionNumber} · This is the last word on the record. Take the time to be thorough - what you document here is what the final report weighs.`
    : correctingSession != null
      ? `Correcting session ${correctingSession} · nothing is overwritten - this is recorded alongside what you said then.`
      : `Session ${sessionNumber}`

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

  /* Fills the screen exactly, so the composer sits at the bottom of the phone and the transcript scrolls inside. It was minHeight, and the composer measured 1,518px down on an 812px screen. */
  return (
    /* minHeight 100vh was fighting the height: on a narrow screen it re-added the nav strip the
       height had just subtracted. See --gw-bottom-nav in AppShell. */
    <div style={{ height: 'calc(100dvh - var(--gw-bottom-nav, 0px))', display: 'flex', flexDirection: 'column', background: 'var(--gw-page)' }}>
      {/*
        THE PROTOTYPE'S SHAPE: the way back above one card, and the whole check-in inside the card
        (check-in-start.jpg). On a phone the card fills the screen.
      */}
      <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 600, margin: '0 auto', padding: 'clamp(0px, 3vw, 20px) clamp(0px, 2vw, 16px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
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
      {!bareFrame && (
        <div style={{ padding: '8px 12px 10px' }}>
          <button
            className="gw-back"
            onClick={leave}
            title="Leave this session. Everything you have said is already saved."
            style={{ fontWeight: 700, color: 'var(--gw-navy)' }}
          >
            ← {checkInName || 'Back'}
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid var(--gw-border)', borderRadius: 14, overflow: 'hidden' }}>
      <TheCheckInHeader
        title="Your check-in"
        underTitle={
          done && !completed && !declined
            ? 'That’s everything for today'
            : correctingSession != null
              ? `Correcting session ${correctingSession}`
              : isFinalSession
                ? `Closing session ${sessionNumber}. This is your final account.`
                : null
        }
        mayPause={opened && !completed && !declined}
        /* Not in the bare frame: the only control on that screen should not lead out of the thing
           they came to do. See the-link-opens-on-the-question. Skipping is still offered. */
        onStopForNow={bareFrame ? undefined : leave}
        onSkip={() => setConfirmingDecline(true)}
      />
      {/* Clarification session banner */}
      {isClarificationSession && (
        <div style={{ background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)', padding: '10px 16px', fontSize: 12.5, color: 'var(--gw-navy)', lineHeight: 1.55 }}>
          <strong>Clarification session.</strong> Something in your report was inferred, not quoted directly. Tell us what was actually happening and we'll update the record.
        </div>
      )}

      {/* Session open failure - shown at top of chat area so it's always visible */}
      {openFailed && (
        <div style={{ padding: '12px 16px', background: 'var(--gw-amber-bg)', borderBottom: '1px solid var(--gw-amber-b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--gw-amber-t)', lineHeight: 1.4 }}>Could not open your session. This is usually a temporary issue.</span>
          <button
            onClick={() => { setOpenFailed(false); openedRef.current = false; openSession.mutate() }}
            disabled={openSession.isPending}
            style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--gw-amber-t)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: openSession.isPending ? 0.6 : 1 }}
          >
            {openSession.isPending ? 'Opening…' : 'Try again'}
          </button>
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          ref={msgsRef}
          aria-live="polite"
          style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {/* From mount, not from the mutation: the transcript fetch sits behind a deliberate jitter of up to
              two seconds, and openSession.isPending cannot be true until after it, so every arrival opened on
              a blank screen. The jitter stays; the sentence starts earlier. */}
          {(openSession.isPending || (!opened && msgs.length === 0 && !completed && !declined)) && (
            <div role="status" style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>Opening your session…</div>
          )}

          {/*
            WHAT YOU ARE CHECKING IN ON, ON SCREEN WHILE YOU ANSWER.
            
            A participant arrives by invite link and was asked "what did you understand your role in
            this to be" with nothing on screen: not the subject, not the objectives, not who set it
            up. So people freestyled, and the report was built on that.
            
            `an-objective-nobody-has-seen.spec.ts` already states the rule this serves: "reading a
            person against a target they have never seen is the definition of an unfair review, and
            the fact that the product would be doing it silently makes it worse rather than better."
            The objective carries a `seenBySubject` state for exactly this reason. Nothing was
            showing it, so the state could never honestly become true.
            
            It stays visible rather than appearing once, because a target you saw at the top of a
            ten-minute conversation is a target you are no longer looking at by the time it matters.
            Only shared facts: the subject and the stated objectives, never another party's words.
          */}
          {/* `says` is in the condition because it is rendered below: a check-in whose lead wrote a
              description but which has no objectives and no label showed nothing at all. */}
          {/*
            AND NOT IN THE BARE FRAME. A team update's link opens on the question, and the question
            is the first message: the band above it would say the same sentence twice before
            anybody has typed a word. See the-link-opens-on-the-question.
          */}
          {!bareFrame && brief && (brief.subject || brief.says || brief.objectives.length > 0) && (
            <div style={{ border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-navy)', borderRadius: 10, padding: '11px 13px', marginBottom: 4, background: 'white' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gw-muted)', marginBottom: 5 }}>
                What this check-in is about
              </div>
              {brief.subject && (
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gw-text)', lineHeight: 1.45, marginBottom: 4 }}>
                  {brief.subject}
                </div>
              )}
              {/*
                AND WHAT IT IS ACTUALLY ABOUT.

                The subject is the check-in's label, and on the picker path the label is the
                scenario - so this band, headed "What this check-in is about", said "New hire" and
                stopped. Read on a real invitation: the lead had written four sentences describing
                the situation and the person being asked to account for it never saw a word of them.
              */}
              {brief.says && (
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: brief.objectives.length ? 7 : 0 }}>
                  {brief.says}
                </div>
              )}
              {brief.objectives.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 4 }}>
                    {brief.objectives.length === 1 ? 'The objective on record:' : 'The objectives on record:'}
                  </div>
                  {brief.objectives.map((o, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--gw-navy)', flexShrink: 0 }}>•</span>
                      <span>{o.name}{o.target != null ? ` (${o.target.toLocaleString('en-US')})` : ''}</span>
                    </div>
                  ))}
                </>
              )}
              {/*
                AND WHY THE LIST IS SHORT, WHICH THE SERVER HAS BEEN SAYING TO NOBODY.

                A check-in that keeps numbers to their owner sends this line with the brief: "Other
                people on this check-in have numbers of their own, and those are theirs." Without
                it, somebody reads two objectives on a check-in with four people and has no idea
                whether the rest are missing, secret, or simply not set. The line was written on 15
                September and rendered nowhere.
              */}
              {brief.alsoSay && (
                <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6, lineHeight: 1.5, fontStyle: 'italic' }}>
                  {brief.alsoSay}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 7, lineHeight: 1.45 }}>
                Answer in your own words. You are not expected to agree with any of it.
              </div>
            </div>
          )}
          {priorRecordEntries.length > 0 && (() => {
            /*
             * WHAT YOU SAID LAST TIME, IN YOUR WORDS, THREE LINES UNLESS YOU ASK FOR MORE.
             *
             * This was every extracted line from every earlier session, with the engine's own marks
             * left in, sitting above the first question. On a phone the question was two screens
             * down. A participant read the machine's notes on her before she was asked anything.
             * The most recent session's last three lines, cleaned, with the rest behind a tap.
             */
            const lines = priorRecordEntries
              .flatMap(s => s.entries.map(e => ({ session: s.sessionNumber, type: e.type, text: asTheirWords(e.text), raw: e.text })))
              .filter(l => l.text && !isTheEnginesOwnNote(l.raw))
            const latest = Math.max(...priorRecordEntries.map(s => s.sessionNumber))
            const shown = showAllPrior ? lines : lines.filter(l => l.session === latest).slice(-3)
            const more = lines.length - shown.length
            return (
              <div style={{ border: '1px dashed var(--gw-border)', borderRadius: 10, padding: '10px 12px', marginBottom: 4, background: 'var(--gw-bg)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gw-muted)', marginBottom: 8 }}>
                  What you said last time
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {shown.map((l, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--gw-text)' }}>
                      {showAllPrior && <span style={{ color: 'var(--gw-muted)', fontSize: 11, marginRight: 6 }}>S{l.session}</span>}
                      <span style={{ fontWeight: 600 }}>{RECORD_ENTRY_LABELS[l.type] ?? l.type}: </span>
                      {l.text}
                    </div>
                  ))}
                </div>
                {more > 0 && (
                  <button type="button" onClick={() => setShowAllPrior(true)}
                    style={{ background: 'none', border: 'none', padding: 0, marginTop: 8, fontSize: 11.5, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                    {more === 1 ? 'One more line' : `${more} more lines`} on record
                  </button>
                )}
              </div>
            )
          })()}
          {priorTurns.length > 0 && (
            <div style={{ border: '1px dashed var(--gw-border)', borderRadius: 10, padding: '10px 12px', marginBottom: 4, background: 'var(--gw-bg)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gw-muted)', marginBottom: 8 }}>
                From your earlier session{priorSessionNumber != null ? ` ${priorSessionNumber}` : ''} · read-only
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.72 }}>
                {priorTurns.map(m => (
                  <div key={`prior-${m.id}`} style={{ alignSelf: m.role === 'PERSON' ? 'flex-end' : 'flex-start', maxWidth: '85%', fontSize: 13, lineHeight: 1.5, color: 'var(--gw-text)', background: m.role === 'PERSON' ? 'var(--gw-blue-bg)' : 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '7px 10px' }}>
                    {nothingInternalReachesTheBubble(m.content)}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 8, lineHeight: 1.5 }}>
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
            <div
              key={m.id}
              style={{
                maxWidth: '80%',
                alignSelf: m.role === 'PERSON' ? 'flex-end' : 'flex-start',
                /* The prototype's cream for Groundwork's words (check-in-start.jpg). */
                background: m.role === 'PERSON' ? 'var(--gw-navy)' : 'var(--gw-paper-2)',
                color: m.role === 'PERSON' ? 'white' : 'var(--gw-text)',
                border: 'none',
                borderRadius: m.role === 'PERSON' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0,
                opacity: isWaiting(m) ? 0.5 : 1,
              }}
            >
              {isWaiting(m) ? (
                /*
                 * THE DOTS, AND AFTER A FEW SECONDS WHAT THEY MEAN.
                 *
                 * Three bouncing dots say "something is happening" for about two seconds and
                 * "has this frozen?" for every second after that. Ninety-nine of the hundred
                 * audited journeys waited longer than four seconds for a reply, and the answer
                 * to that doubt was people pressing send again — which used to put the same
                 * sentence in the record twice.
                 */
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--gw-sub)',
                      animation: 'gwDotBounce 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                  <style>{`@keyframes gwDotBounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }`}</style>
                  {waitedAWhile && (
                    <span role="status" style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                      Still reading what you wrote. Nothing was lost, you do not need to send it again.
                    </span>
                  )}
                </span>
              ) : nothingInternalReachesTheBubble(m.content)}
              {streamingId === m.id && (
                <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--gw-navy)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink .7s step-end infinite' }} />
              )}
            </div>
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
            return <SuggestedAnswers answers={last.suggestedAnswers} onPick={quickSend} />
          })()}
          {/* Explicit end confirmation: finishing never auto-happens. Clicking
              "Complete session" opens a confirm step so the person can review
              before the record locks. This is the client half of one coherent
              close - the engine has already confirmed the timeframe and that
              they are ready in the conversation itself (TIMEFRAME RULE); this
              is the deliberate final action, not a second stacked prompt. */}
          {done && !completed && !confirmingFinish && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <button
                onClick={() => setConfirmingFinish(true)}
                style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Complete session ✓
              </button>
            </div>
          )}
          {!completed && confirmingFinish && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <div style={{ maxWidth: 460, margin: '0 auto', background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>Ready to finish this session?</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>
                  Take a moment to look back over what you have said. Once you finish, this session's record is locked in and cross-referenced with the others. If a timeframe matters here, make sure you have confirmed it above.
                </div>
                {/*
                  HALF A MINUTE OF "SAVING…" READS AS A HANG. W8-16.

                  Completing runs two model calls before it answers - scoring the
                  account, then pulling the record entries out of it. The entry
                  flow already said what was happening during that wait; this
                  path, which is the one everybody is on from session two, said
                  one word and then nothing.
                */}
                {complete.isPending && (
                  <div style={{ marginBottom: 12 }}>
                    <SlowStep steps={CLOSING_STEPS} note="This one takes about half a minute. Nothing is lost if you wait." />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    onClick={() => complete.mutate()}
                    disabled={complete.isPending}
                    style={{ padding: '10px 22px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {complete.isPending ? 'Saving…' : 'Finish session ✓'}
                  </button>
                  <button
                    /* "Not yet" means not yet: the offer to finish goes away too, and comes back on the next close signal. */
                    onClick={() => { setConfirmingFinish(false); setDone(false); taRef.current?.focus() }}
                    disabled={complete.isPending}
                    style={{ padding: '10px 18px', borderRadius: 8, background: 'none', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Not yet, keep going
                  </button>
                </div>
              </div>
            </div>
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
              has acknowledged are counted now, so the offer appears exactly when
              the server will honour it. */}
          {!done && !completed && !confirmingFinish && opened && msgs.filter(m => m.role === 'PERSON' && !m.id.startsWith('local-')).length >= mayCompleteAfter && (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <button
                onClick={() => setConfirmingFinish(true)}
                style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Not seeing a wrap-up? Complete session
              </button>
            </div>
          )}
          {declined && (
            <div style={{ padding: '4px 0 16px' }}>
              <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>You declined this session.</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65 }}>
                  That is recorded. The report for this session will say you declined and will not guess at
                  what you would have said. Nothing you write here counts towards it now.
                  {' '}If there is another session, you can take part in that one.
                </div>
              </div>
              <div style={{ textAlign: 'center', paddingTop: 10 }}>
                <button onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                  ← Back to check-ins
                </button>
              </div>
            </div>
          )}

          {confirmingDecline && !declined && (
            <div style={{ padding: '4px 0 16px' }}>
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>
                  Not taking part in this session?
                </div>
                {/*
                  Everything that follows from it, before they do it. A final action whose consequences
                  are discovered afterwards is a trap, however quiet the button was.
                */}
                <ul style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: 18 }}>
                  <li>This cannot be undone for this session.</li>
                  <li>The session finishes without your answers, so nobody is left waiting on you.</li>
                  <li>The report will say you declined. It will not guess at what you would have said.</li>
                  <li>Nothing you have written here is shown to anyone.</li>
                </ul>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => decline.mutate()}
                    disabled={decline.isPending}
                    style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
                  >
                    {decline.isPending ? 'Recording…' : 'Yes, I am not taking part'}
                  </button>
                  <button
                    onClick={() => setConfirmingDecline(false)}
                    style={{ padding: '9px 16px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    Keep going
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* The way to say no is under Pause now, in the header (check-in-start.txt), where it is
              present on every turn and still one step from final: the confirm above spells it out. */}

          {completed && groundId && checkInId && (
            <div style={{ padding: '4px 0 16px' }}>
              <TheCheckInYouJustFinished checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} />
              {/* What we measured about their answers, said to them - see WhatYouGaveUs. */}
              <WhatYouGaveUs it={whatYouGave} />
              {/* When the next one opens: the thing people asked after finishing. See YourNextCheckIn. */}
              <YourNextCheckIn groundId={groundId} />
              {/* And, for whoever is running it, the state of the round they are now waiting on. */}
              {isInitiator && <WhoIsStillOut groundId={groundId} sessionNumber={sessionNumber} />}
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
              <div style={{ maxWidth: 460, margin: '12px auto 0', fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, textAlign: 'center' }}>
                This report is yours and it stays on this session - the button below opens it on
                its own, and it is also under Report, in Your sessions. The shared report, where
                what everybody said sits side by side, appears once the others have checked in.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 12 }}>
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
                  <button
                    onClick={() => navigate(`/grounds/${groundId}/board`)}
                    style={{ padding: '9px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Open the team board →
                  </button>
                )}
                <button
                  onClick={() => navigate(`/checkin/${checkInId}/report`)}
                  style={{ padding: '9px 16px', borderRadius: 8, background: 'white', color: 'var(--gw-text)', fontSize: 13, fontWeight: 700, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Open my report
                </button>
                <button
                  onClick={() => navigate(`/grounds/${groundId}`)}
                  style={{ padding: '9px 16px', borderRadius: 8, background: 'white', color: 'var(--gw-text)', fontSize: 13, fontWeight: 700, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Open this check-in
                </button>
              </div>
              <div style={{ textAlign: 'center', paddingTop: 10 }}>
                <button onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                  ← Back to check-ins
                </button>
              </div>
            </div>
          )}
        </div>

        {/*
          THE THREE FIXED CHIPS ARE GONE ("What am I missing?", "Is there a document?", "What do I
          carry forward?"). They sent the same three questions into every check-in whatever was
          asked, and the prototype puts the engine's own suggested answers in that place, under the
          question they answer. "What am I missing?" belongs between check-ins (between-check-ins.txt).
        */}

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
          <div style={{ padding: '4px 14px', borderBottom: '1px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 200 }}>{privacyLabel}</span>
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
              <span style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                <button
                  onClick={() => navigate(`/grounds/${groundId}?tab=context`)}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  Set the context
                </button>
                <button
                  onClick={() => navigate(`/grounds/${groundId}?tab=settings`)}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
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
          <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative' }}>
            {groundId && attachOpen && (
              <div style={{ position: 'absolute', bottom: 58, left: 12, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, zIndex: 20, width: 260, maxWidth: 'calc(100vw - 40px)' }}>
                {/* A photo first, because that is what the check-in asks for: "A photo of it is
                    enough." (check-in-end-card.txt). It is a real upload, and the server keeps it
                    private to whoever added it until they choose otherwise. */}
                <label htmlFor="doc-upload"
                  title={`Accepted: ${ACCEPTED_UPLOADS.map(e => e.slice(1).toUpperCase()).join(', ')}`}
                  onClick={() => setAttachOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: 'var(--gw-text)' }}
                >
                  Add a photo or a document
                </label>
                <button
                  onClick={() => { setAttachOpen(false); if (groundId) setPasteMode(true) }}
                  disabled={completed || declined}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: 'var(--gw-text)', background: 'none', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  Paste text
                </button>
                {/* The prototype's own sentence for a new document (U.7, Add a document), and the
                    server's rule: a document starts private to its uploader (who-can-see-a-document). */}
                <div style={{ padding: '6px 12px 8px', fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.45, borderTop: '1px solid var(--gw-border)', marginTop: 4 }}>
                  It starts private to you. You choose who can read it.
                </div>
              </div>
            )}
            {groundId && (
              <button
                onClick={() => setAttachOpen(o => !o)}
                aria-label="Add a photo, a document or some text"
                aria-expanded={attachOpen}
                disabled={completed || declined}
                style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: 'white', border: '1.5px solid var(--gw-border)', color: 'var(--gw-text)', cursor: 'pointer', fontSize: 22, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
              >
                +
              </button>
            )}
            <input type="file" id="doc-upload" accept={ACCEPTED_UPLOADS.join(',')} style={{ display: 'none' }} onChange={e => {
              const f = e.target.files?.[0]
              if (f) {
                const allowed = ACCEPTED_UPLOADS
                const ext = '.' + f.name.split('.').pop()?.toLowerCase()
                if (!allowed.includes(ext)) { toast.error(`File type not supported. Accepted: ${allowed.join(', ')}`); e.target.value = ''; return }
              }
              handleFileChange(e)
            }} />

            <textarea ref={taRef} placeholder="Type your answer"
              value={input} onChange={autoResize} onKeyDown={handleKeyDown}
              disabled={loading || completed || declined || !opened}
              rows={1}
              style={{ flex: 1, minWidth: 0, resize: 'none', height: 42, maxHeight: 140, padding: '11px 16px', fontSize: 15, lineHeight: 1.35, border: '1px solid var(--gw-border)', borderRadius: 21, background: opened ? 'white' : 'var(--gw-bg)', fontFamily: 'inherit', outline: 'none' }}
            />
            <button onClick={send} disabled={loading || completed || declined || !opened} aria-label="Send message"
              style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!opened || completed || declined) ? 0.5 : 1 }}
            >
              ↑
            </button>
          </div>
          {/*
            AND A WAY BACK, WHICH THE BARE FRAME OTHERWISE HAS NONE OF.
            "What a person now needs to login, is there a place to proceed to sign-in?" - there was
            not. Accepting the link signed them in, and the page said nothing about it: no name, no
            way to return on another device, no sign-in anywhere on screen. One line, under the
            thing they are typing into, says all three.
          */}
          {bareFrame && (
            <div style={{ padding: '0 14px 10px', fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center' }}>
              {user?.email ? `Signed in as ${user.email}. ` : ''}
              Your link reopens this any time, or{' '}
              <button
                onClick={() => navigate('/auth')}
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                sign in with your email
              </button>.
            </div>
          )}
        </div>
      </div>

      </div>
      </div>

      {/* Paste text overlay */}
      {/* zIndex 9100, ABOVE THE FLOATING HELP BUTTON, which is fixed at 8000.
          These sheets were at 50. At 375px each one asks for text in a box that
          runs the full width, and the "?" button sat directly on top of its right
          edge - over a field somebody is being asked to type in. Found the first
          time any run drove the participant path at a phone width, which is what
          that was for. */}
      {pasteMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 9100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px 14px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 560 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gw-border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 4 }}>📋 Paste text</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.55 }}>
              Paste an email, Slack thread, meeting notes, or any text that supports what you are describing. The tool will use it to ask sharper questions.
            </div>
            <input
              placeholder="Label (optional) e.g. Q2 update email, project brief"
              value={pasteLabel}
              onChange={e => setPasteLabel(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
            />
            <textarea autoFocus
              placeholder="Paste your text here…"
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              style={{ width: '100%', resize: 'none', minHeight: 140, padding: '10px 12px', fontSize: 13, lineHeight: 1.55, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPasteMode(false); setPasteText(''); setPasteLabel('') }}
                style={{ padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={submitPaste} disabled={!pasteText.trim() || uploadDoc.isPending}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: pasteText.trim() && !uploadDoc.isPending ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: pasteText.trim() && !uploadDoc.isPending ? 1 : 0.5 }}>
                {uploadDoc.isPending ? 'Adding…' : 'Add to session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doc context overlay */}
      {/* Same z-index correction as the paste sheet above: both were at 50,
          under the fixed help button at 8000. */}
      {docContextMode && pendingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 9100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px 14px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 560 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gw-border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 4 }}>📎 {pendingDoc.name}</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.55 }}>
              What does it show? One line is enough; you can skip it.
            </div>
            <textarea autoFocus
              aria-label="What does it show?"
              value={docContext} onChange={e => setDocContext(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDocWithContext() } }}
              style={{ width: '100%', resize: 'none', minHeight: 80, padding: '10px 12px', fontSize: 13, lineHeight: 1.55, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setDocContextMode(false); setPendingDoc(null) }}
                style={{ padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={submitDocWithContext} disabled={uploadDoc.isPending}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: uploadDoc.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: uploadDoc.isPending ? 0.6 : 1 }}>
                {uploadDoc.isPending ? 'Adding…' : 'Add to session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

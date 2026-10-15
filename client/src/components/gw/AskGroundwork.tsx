import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { askApi, type AskBlock, type AskReply, type TextBlock, type ClaimBlock, type ProposalBlock, type PickerBlock, type NextStepBlock } from '@/api/ask'
import { anOldAskAnswerReadsProperly } from '@/lib/an-old-ask-answer-reads-properly'
import { documentsApi } from '@/api/documents'
import { groundsApi } from '@/api/grounds'
import { UPLOAD_ACCEPT_ATTR } from '@/lib/what-you-can-upload'
import { whatTellsItApart } from '@/lib/tell-apart-the-same-name'
import { askNameFor } from '@/lib/ask-name'
import { useAuthStore } from '@/stores/auth'
import { whatWentWrong, whyYouCannotSeeThis } from '@/pages/report/why-you-cannot-see-this'
import { Mark } from './kit'
import { Composer } from './ui/Composer'
import { GroundworkIsWriting } from './ui/GroundworkIsWriting'
import { PRIVATE_LINE } from './what-ask-groundwork-says'

/** What the Context page already says while a document's read has not landed yet (AddADocument.tsx). */
const STILL_READING = 'Reading it now.'
/** Recognised by Ask Groundwork whichever of the two upload routes sent it (docs/answers-from-engine.md,
    30 September, "a document's numbers, said back through Ask Groundwork"). */
const SAID_AFTER_UPLOAD = "I've uploaded it."
/** The picker's target when the document is for the whole organisation, not a check-in (the server's FOR_THE_ORGANISATION). */
const FOR_THE_ORGANISATION = 'organisation'
/** The picker's target when the "+" beside the message box opened it: the file is chosen first, and Ask decides where it goes. */
const CHOSEN_FIRST = 'chosen-first'
/** What the "+" says to Ask once a file is chosen: the same words a person could type (Hafsah, 15 October). */
export const ADDING_A_FILE = 'I want to add a document.'
export const ADDING_A_FILE_FOR_EVERYONE = 'I want to add a document for the whole organisation.'

/**
 * THE NAME AND CAPTION, BEFORE `GET /ask` HAS ANSWERED (screen fault 5d). Loading, or held up by
 * a 429, used to show the bare "Ask Groundwork" with no caption at all - the organisation's own
 * name was already in hand (the signed-in person's own profile), and the caption is a fixed
 * sentence, decision 100, the same one `ASK_CAPTION` on the server always serves
 * (api/src/modules/assistant/ask-name.ts) - so neither needs to wait for this request to land.
 */
const ASK_CAPTION_FALLBACK = 'Ask about the company, your work or your check-ins.'

/*
 * WIDTH CHECK, ITEM 8: THE COMPOSER'S OWN RESTING HEIGHT CUT OFF ITS OWN HINT. The placeholder -
 * "Ask about the company, your work or your check-ins" - wraps to two lines at the panel's own
 * 400px width, but the box this empty composer rests at (38px: a 24px line at this field's 16px/1.5
 * plus its 11px top-and-bottom padding, the Composer's own values) only ever had room to show the
 * first of them; the second sat cut off against the box's own bottom edge rather than genuinely
 * absent. 70px is two such lines (24px * 2) plus the same padding - the box still grows further as
 * somebody types (see the `onChange` below), this only fixes where it RESTS, empty.
 */
const COMPOSER_RESTING_HEIGHT = '70px'

/**
 * ASK (D1, U.14): the panel beside every page on a computer, and #/chat on a phone. Named for the
 * organisation on every screen (decision 100, docs/ask-definition.md) - "Ask Baridi", "Ask
 * Groundwork" only where there is no organisation yet.
 *
 * WHAT IS SERVED, EXACTLY AS IT ARRIVES (`GET /ask`, docs/answers-from-engine.md, "Request 153"):
 * `askName`, the caption and the one line under it (`caption`, `addLine`), the greeting
 * (`welcome`, once, then `null`), and the starter questions (`starters`). What Ask answers is the
 * assistant's own, drawn as it comes; this adds nothing to what it says. Your questions are served
 * to you alone, and a request is done only after you say yes to it: both are the server's rules
 * (api/src/modules/ask), not this screen's.
 *
 * ASK COVERS THE WHOLE ORGANISATION AND YOUR OWN WORK BY DEFAULT (decision 100, request 153 part
 * two). A check-in is an optional focus you may pick from "About"; it is never what Ask is about -
 * see the default-focus logic a little further down (`aboutId`).
 *
 * ADDING A DOCUMENT THROUGH THIS PANEL (decision 50, docs/answers-from-engine.md, 30 September). The
 * assistant's `next_step` block with `kind: 'upload_a_document'` opens the same file picker and the
 * same upload route the Context page uses, so the file arrives private to the person exactly as it
 * would from there. Nothing is sent to say the upload happened until the document's own background
 * read has had a chance to land - see `pollNumbersWaiting` below.
 */

/**
 * The check-in the page is about, from its address, so the panel opens on it.
 *
 * Exported for AppShell.tsx's own use (B-224): on a phone, "Ask" navigates away to `/chat` rather
 * than opening a drawer beside the page that is still showing - so whatever this would have read
 * from the page's own address has to be read and carried across before that navigation happens, or
 * it is lost. See AppShell's phone redirect, just above where `/chat` is reached.
 */
export function checkInOnThisPage(pathname: string): string | null {
  const m = pathname.match(/^\/grounds\/([^/?#]+)/)
  return m ? m[1] : null
}

/* `fileTaken`: this reply's "Choose a file" was already answered by the file chosen with the "+", so it is not drawn again. */
type Said = { from: 'you'; says: string } | { from: 'groundwork'; reply: AskReply; fileTaken?: boolean }

const isText = (b: AskBlock): b is TextBlock => b.type === 'text' && typeof b.body === 'string'
const isClaim = (b: AskBlock): b is ClaimBlock => b.type === 'claim' && typeof b.says === 'string'
const isProposal = (b: AskBlock): b is ProposalBlock =>
  b.type === 'proposal' && typeof b.proposalId === 'string' && typeof b.summary === 'string'
const isPicker = (b: AskBlock): b is PickerBlock => b.type === 'picker' && Array.isArray(b.options)
/* Only a page inside the product: a path the assistant names is followed, a web address is not. */
const isNextStep = (b: AskBlock): b is NextStepBlock =>
  b.type === 'next_step' && typeof b.href === 'string' && b.href.startsWith('/') && !b.href.startsWith('//') && typeof b.label === 'string'
/** The one next step this panel performs itself rather than sending somebody to a page: the file
    picker, on the check-in named by `id` (decision 50). */
const isUploadStep = (b: NextStepBlock): b is NextStepBlock & { id: string } =>
  b.kind === 'upload_a_document' && typeof b.id === 'string'

/**
 * THE CHECK-IN THE UPLOAD BELONGS TO. `id` on this block is the assistant's own session id, not the
 * check-in's - uploading there 404s, because the document route reads a check-in's id, not a
 * session's. `context.groundId` is the check-in's own id, put there for the "I've uploaded it."
 * message that follows; the upload itself was still going to the wrong address. Falls back to `id`
 * only when there is no `context` at all, so an older reply without it still uploads somewhere.
 */
const uploadGroundId = (b: NextStepBlock & { id: string }): string =>
  (typeof b.context?.groundId === 'string' && b.context.groundId) || b.id

const bubble = (mine: boolean): React.CSSProperties => ({
  alignSelf: mine ? 'flex-end' : 'flex-start',
  maxWidth: '82%',
  padding: '10px 14px',
  borderRadius: 14,
  background: mine ? 'var(--gw-navy)' : 'var(--gw-slate)',
  color: mine ? '#fff' : 'var(--gw-text)',
  whiteSpace: 'pre-wrap',
  /* Board review, sales piece C, item 10: the opening line ("Ask me about Sales team, Q3: a deal,
     a target, or what to do next.") read cut off at 375px. `pre-wrap` alone wraps at a space, so
     one long unbroken run - a long check-in label, a pasted id - could still push past the
     bubble's own 82% width. This lets a word break rather than overflow it. */
  overflowWrap: 'anywhere',
  fontSize: 15,
  lineHeight: 1.45,
  margin: 0,
})

const chip: React.CSSProperties = {
  border: '1px solid var(--gw-line)', background: 'var(--gw-card)', color: 'var(--gw-text)',
  borderRadius: 999, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * POLLS THE CHECK-IN'S OWN DOCUMENT LIST (the same route the Context page reads) until the document
 * just uploaded has numbers waiting on a yes, or the time given has passed - the rule decided in
 * docs/answers-from-engine.md, 30 September, "a document's numbers, said back through Ask Groundwork":
 * the upload's own response always says `numbersWaiting: 0`, because the read runs in the background
 * after it answers, so sending "I've uploaded it." straight away would usually find nothing.
 */
export async function pollNumbersWaiting(
  checkInId: string,
  docId: string,
  intervalMs: number,
  timeoutMs: number,
): Promise<number> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const docs = await documentsApi.list(checkInId)
      const doc = docs.find((d) => d.id === docId)
      const n = doc?.holds?.waiting?.length ?? 0
      if (n > 0) return n
    } catch {
      /* Kept trying until the deadline; a document that briefly fails to list is not "no numbers". */
    }
    if (Date.now() >= deadline) return 0
    await wait(intervalMs)
  }
}

/**
 * `initialMessage`: a question typed somewhere else - the board's own Ask bar (U.10 item 8) - asked
 * the moment this panel opens, once, rather than left sitting in a draft the person has to press
 * Ask on again. Consumed once (`sentRef`) so re-opening the panel later, or a re-render, never
 * re-sends it.
 */
export function AskGroundwork({
  onClose, initialMessage, onSentInitialMessage,
  initialOpenedFromGroundId, onSentInitialOpenedFrom,
  aboutGroundId,
  /* Real values in the product; a test hands in small ones so it does not wait a minute. */
  pollIntervalMs = 2000, pollTimeoutMs = 60_000,
}: {
  onClose?: () => void
  initialMessage?: string | null
  onSentInitialMessage?: () => void
  /**
   * DECISION 65: set only when the panel was opened from a check-in's own Context and resources
   * page or setup. The panel's first message is sent empty, with this check-in's id and
   * `openedFrom: "check_in_setup"`; every later message in the same opening carries both too.
   */
  initialOpenedFromGroundId?: string | null
  onSentInitialOpenedFrom?: () => void
  /**
   * B-210: the check-in this panel should open already focused on, for a caller that is not
   * itself a page living at `/grounds/:id` or `/checkin/:id` - the Ask page opened from
   * `/chat?about=<id>`. The same rule `here` already follows below: it only takes effect once
   * this check-in is confirmed to be one the reader may see (the caller passes `null` otherwise).
   */
  aboutGroundId?: string | null
  pollIntervalMs?: number
  pollTimeoutMs?: number
}) {
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const isAnAdmin = user?.role === 'ADMIN'
  const orgName = (user as any)?.organization?.name?.trim() || user?.organizationName || ''
  const page = useQuery({ queryKey: ['ask'], queryFn: askApi.mine })
  /*
   * B-112: `GET /ask` FAILING, OR STILL LOADING, USED TO READ IDENTICALLY TO "YOU MAY NOT ASK" -
   * the composer is gated on `page.data?.canAsk`, and a failed or slow fetch leaves `page.data`
   * undefined, so the whole question box vanished with nothing on screen to say why. Only the
   * name, the caption and the flag that turns the box off come from this payload at all (the
   * name and caption already fall back to a fixed default, above); the flag is the one thing
   * that cannot be guessed, so a failed load assumes the box still works rather than hiding it -
   * `POST /ask` and `/ask/answer` enforce who may ask on their own (ask.service.ts), so a wrong
   * guess here is caught there, not silently allowed. "About", the starters and the greeting are
   * the extras this payload also carries; they simply wait for a load that lands.
   */
  const askSettled = !page.isLoading
  const askOk = askSettled && (page.isError ? true : !!page.data?.canAsk)
  /*
   * ONE SENTENCE FOR EVERY WAY THIS LOAD CAN FAIL, NOT ONE PER STATUS CODE. `whyYouCannotSeeThis`
   * is written for a record that either opened or did not ("this record could not be opened"),
   * which reads oddly for a question box that keeps working regardless - there is no "it" that
   * failed to open here, only an extra that has not arrived yet. `canRetry` is still worth
   * keeping: a 401 (signed out) is the one case retrying this alone cannot fix.
   */
  /* Who sees the "+": a lead who may add context (served as `addsContext`), or an admin of the organisation. */
  const mayAddAFile = askOk && (!!page.data?.addsContext || isAnAdmin)
  const askWhy = page.isError ? whyYouCannotSeeThis(whatWentWrong(page.error)) : null
  /* The check-in the page is about, from its address, so the panel opens on it. Or, for the Ask
     page itself (`/chat?about=`), the id its caller confirmed the reader may see (B-210). */
  const here = aboutGroundId ?? checkInOnThisPage(location.pathname)
  /*
   * WHEN THE PAGE'S OWN CHECK-IN IS NOT ONE THE ASKER RUNS OR TAKES PART IN, BUT THEY MAY STILL
   * READ IT - an admin of its organisation, opening the panel on somebody else's check-in's page.
   * `askApi.mine`'s "About" only lists check-ins the asker runs or takes part in (ask.service.ts,
   * whatItMayBeAbout), so an admin on "Sales team, Q3" whose own check-ins are three others got a
   * panel that defaulted to one of those three, and anything they typed acted on that one instead of
   * the check-in they were actually reading. `/grounds` already lists every check-in a reader may
   * read, admin or not (groundsAViewerMayList - the same rule the sidebar's own list uses), so if the
   * page's check-in shows up there, the reader may read it, and it is added to "About" here and
   * chosen by default. Only ever fetched when "About" does not already have this check-in on it.
   * This is a screens-owned route (grounds, not ask or assistant); if it should instead come from
   * the engine's own /ask, that is a question for the engine workspace.
   */
  const needsWiderAbout = !!here && !!page.data && !(page.data.about ?? []).some((g) => g.id === here)
  const grounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list, enabled: needsWiderAbout })
  const about = useMemo(() => {
    const base = page.data?.about ?? []
    if (!here || base.some((g) => g.id === here)) return base
    const found = (grounds.data ?? []).find((g) => g.id === here)
    return found ? [...base, { id: found.id, label: found.label }] : base
  }, [page.data, here, grounds.data])
  /*
   * WALKTHROUGH PASS 2, ITEM 7: TWO CHECK-INS ON "ABOUT" CAN SHARE A LABEL. The engine's own
   * `/ask` serves only `id`/`label` for this list, so this reads when each one started from the
   * grounds list (same query the sidebar and YouPage already make), the same way those tell two
   * same-labelled check-ins apart.
   */
  const allGrounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list })
  const aboutWithDates = useMemo(() => {
    const startOf = new Map((allGrounds.data ?? []).map((g) => [g.id, { startsAt: g.startsAt, createdAt: g.createdAt }]))
    return about.map((g) => ({ id: g.id, label: g.label, ...startOf.get(g.id) }))
  }, [about, allGrounds.data])
  const [chosen, setChosen] = useState<string | null>(null)
  /* Decision 65: set once, from `initialOpenedFromGroundId`, for the life of this opening - every
     message sent while it is set carries this check-in's id and `openedFrom: "check_in_setup"`. */
  const [openedFromGroundId, setOpenedFromGroundId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [said, setSaid] = useState<Said[]>([])
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  /* True once a reply has been outstanding long enough for somebody to start doubting it - the
     check-in conversation's own four seconds (ChatPage.tsx, opening-is-slow.ts). */
  const [waitedAWhile, setWaitedAWhile] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  /* Set the moment a file is chosen, cleared once "I've uploaded it." has been sent (or the
     upload itself failed). Drawn as its own line, in the Context page's own words. */
  const [reading, setReading] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const sentInitial = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  /* The check-in the file just chosen belongs to - uploaded to, polled, and said "I've uploaded
     it." about afterwards, all the same one (see uploadGroundId). Set when the button is pressed,
     read when the file picker returns. */
  const uploadTarget = useRef<string | null>(null)

  /*
   * REQUEST 153, PART TWO: ASK COVERS THE WHOLE ORGANISATION AND YOUR OWN WORK BY DEFAULT. A
   * check-in is an optional focus you may pick; it is never what Ask is about. So the default is
   * no check-in at all (`''`, sent as no `groundId`) - never the first one on the list, which is
   * what the Company page's two buttons used to open onto before this (docs/answers-from-engine.md,
   * "There is nothing new to call. It already works this way").
   *
   * THE ONE EXCEPTION: a page that is itself about a check-in (`here`) opens the panel already
   * focused on it, so asking about "this check-in" on its own board needs no extra step. Picking
   * a check-in, or picking "The whole organisation and your work" (`''`) from "About", overrides
   * that and is remembered for the rest of the time the panel stays open (`chosen`, `null` until
   * the person has chosen anything).
   */
  const isMine = (id: string | null): id is string => !!id && about.some((g) => g.id === id)
  const aboutId = chosen !== null
    ? (isMine(chosen) ? chosen : '')
    : (isMine(here) ? here : '')

  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }) }, [said.length, reading, sending])

  useEffect(() => {
    if (!sending) { setWaitedAWhile(false); return }
    const t = setTimeout(() => setWaitedAWhile(true), 4000)
    return () => clearTimeout(t)
  }, [sending])

  /* The box grows as somebody types (see the Composer's onChange below) and needs to shrink back
     once what was in it is sent - `send` clears `draft` only after a reply comes back, so this
     watches for that rather than doing it optimistically. */
  useEffect(() => {
    if (draft === '' && composerRef.current) composerRef.current.style.height = COMPOSER_RESTING_HEIGHT
  }, [draft])

  /*
   * ONLY THE NEWEST WAITING PROPOSAL CAN BE ANSWERED (decision 50). Once a newer one arrives, an
   * older one shows no buttons at all - pressing them would only earn a 409, and the person cannot
   * tell which proposal is still live by looking at it, so the screen decides for them.
   */
  const latestProposalId = useMemo(() => {
    let last: string | null = null
    for (const s of said) {
      if (s.from !== 'groundwork') continue
      for (const b of s.reply.blocks) {
        if (isProposal(b)) last = b.proposalId
      }
    }
    return last
  }, [said])

  /*
   * ONLY THE NEWEST REPLY'S OPTION BUTTONS CAN BE PRESSED - the same reasoning as a proposal's Yes
   * and No above: once a newer reply has arrived, an older one's picker chips stayed clickable
   * forever, with nothing on screen to say they no longer reflected where the conversation was.
   */
  const latestGroundworkIndex = useMemo(() => {
    let last = -1
    said.forEach((s, i) => { if (s.from === 'groundwork') last = i })
    return last
  }, [said])

  async function send(message: string, how: () => Promise<AskReply>, clearDraft: boolean) {
    setSending(true)
    setProblem(null)
    try {
      const reply = await how()
      /* The very first message of a check-in-setup opening is sent empty, read as "start" - there
         is nothing of the asker's own to show as a bubble for that one. */
      setSaid((s) => [...s, ...(message ? [{ from: 'you' as const, says: message }] : []), { from: 'groundwork' as const, reply }])
      if (clearDraft) setDraft('')
    } catch (e: unknown) {
      const said = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      setProblem(typeof said === 'string' ? said : 'That did not send. What you wrote is still here, so you can try again.')
    } finally {
      setSending(false)
    }
  }

  const ask = (message: string, clearDraft = false, groundIdOverride?: string) => {
    const m = message.trim()
    if (!m || sending) return
    const gid = groundIdOverride ?? openedFromGroundId ?? aboutId ?? undefined
    /* Never sent on an ordinary question - only while this opening is the check-in-setup one. An
       ordinary call still passes exactly two arguments, as it always has. */
    void send(m, () => (openedFromGroundId ? askApi.ask(m, gid, 'check_in_setup') : askApi.ask(m, gid)), clearDraft)
  }

  /** The "Choose a file" button on a `next_step` block: opens the picker for that check-in. */
  const startUpload = (groundId: string) => {
    if (sending || reading) return
    uploadTarget.current = groundId
    fileInput.current?.click()
  }

  /**
   * THE FILE PICKER RETURNED. Upload it privately to the check-in the block named (uploadGroundId,
   * not the assistant's session id), then poll that same check-in's own document list - the Context
   * page's own read - until the document has numbers waiting on a yes or the time given has passed,
   * showing "Reading it now." meanwhile. Only then is "I've uploaded it." sent, against that same
   * check-in, so Ask Groundwork usually has something to say back (decision 50).
   */
  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const groundId = uploadTarget.current
    uploadTarget.current = null
    if (!file || !groundId) return
    if (groundId === CHOSEN_FIRST) { await addAFileChosenFirst(file); return }
    await uploadTo(file, groundId)
  }

  /**
   * THE "+" BESIDE THE MESSAGE BOX (Hafsah, 15 October): the file is chosen first, as in the check-in chat. Ask is then
   * told what the person could have typed, "I want to add a document." (or, for an admin with no check-in chosen, "for the
   * whole organisation"), and the server decides, exactly as for the typed way, whether they may and where it goes. Its
   * "Choose a file" step is answered with the file already chosen; anything else it says (it cannot go anywhere, say
   * which check-in) is shown as it comes, and the file is not sent. Nothing is kept until the said-back yes, as before.
   */
  const addAFileChosenFirst = async (file: File) => {
    const gid = openedFromGroundId ?? (aboutId || null)
    const message = isAnAdmin && !gid ? ADDING_A_FILE_FOR_EVERYONE : ADDING_A_FILE
    setSending(true)
    setProblem(null)
    let reply: AskReply
    try {
      reply = await (openedFromGroundId ? askApi.ask(message, openedFromGroundId, 'check_in_setup') : askApi.ask(message, gid ?? undefined))
    } catch (e: unknown) {
      const said = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      setProblem(typeof said === 'string' ? said : 'That did not send. Choose the file again to try once more.')
      setSending(false)
      return
    }
    setSending(false)
    const step = reply.blocks.find((b): b is NextStepBlock & { id: string } => isNextStep(b) && isUploadStep(b))
    setSaid((s) => [...s, { from: 'you' as const, says: message }, { from: 'groundwork' as const, reply, fileTaken: !!step }])
    if (step) await uploadTo(file, uploadGroundId(step))
  }

  const uploadTo = async (file: File, groundId: string) => {
    setProblem(null)
    /* AN ADMIN'S DOCUMENT FOR THE WHOLE ORGANISATION (fix list, item 3): read and said back by the server in one step. */
    if (groundId === FOR_THE_ORGANISATION) {
      setReading(true)
      try {
        const reply = await askApi.addADocumentForTheOrganisation(file)
        setSaid((s) => [...s, { from: 'you' as const, says: `Here is ${file.name}.` }, { from: 'groundwork' as const, reply }])
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
        setProblem(typeof msg === 'string' ? msg : 'That did not upload. Try again.')
      } finally {
        setReading(false)
      }
      return
    }
    setReading(true)
    try {
      const uploaded = await documentsApi.upload(groundId, file)
      await pollNumbersWaiting(groundId, uploaded.id, pollIntervalMs, pollTimeoutMs)
    } catch (err: unknown) {
      setReading(false)
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      setProblem(typeof msg === 'string' ? msg : 'That did not upload. Try again.')
      return
    }
    setReading(false)
    ask(SAID_AFTER_UPLOAD, false, groundId)
  }

  useEffect(() => {
    if (sentInitial.current || sending || !askOk) return
    /*
     * DECISION 65: OPENED FROM A CHECK-IN'S OWN SETUP. Sent before the ordinary `initialMessage`
     * check below, and with an empty message - this is the one case an empty message is sent at
     * all, so Ask Groundwork reads it as "start" rather than nothing being sent.
     */
    if (initialOpenedFromGroundId) {
      sentInitial.current = true
      setOpenedFromGroundId(initialOpenedFromGroundId)
      setChosen(initialOpenedFromGroundId)
      void send('', () => askApi.ask('', initialOpenedFromGroundId, 'check_in_setup'), false)
      onSentInitialOpenedFrom?.()
      return
    }
    if (!initialMessage) return
    sentInitial.current = true
    ask(initialMessage, false)
    onSentInitialMessage?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, initialOpenedFromGroundId, askOk])

  const answer = (proposalId: string, yes: boolean) => {
    if (sending) return
    setAnswered((a) => new Set(a).add(proposalId))
    void send(yes ? 'Yes' : 'No', () => askApi.answer(proposalId, yes ? 'yes' : 'no'), false)
  }

  function drawBlocks(reply: AskReply, key: number, isLatest: boolean, fileTaken = false) {
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
            {b.proposalId === latestProposalId && !answered.has(b.proposalId) && (
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
              <button key={o.key} type="button" style={chip} disabled={sending || !isLatest} onClick={() => ask(o.label)}>{o.label}</button>
            ))}
          </div>
        )
      }
      if (isNextStep(b)) {
        /* The one next step drawn as an action here rather than a link to another page - see
           isUploadStep. Everything else still goes to its own page in the product. */
        if (isUploadStep(b)) {
          if (fileTaken) return null
          return (
            <button key={k} type="button" style={chip} disabled={sending || reading}
              onClick={() => startUpload(uploadGroundId(b))}>
              {b.label}
            </button>
          )
        }
        return <Link key={k} to={b.href} style={{ ...chip, alignSelf: 'flex-start', textDecoration: 'none' }}>{b.label}</Link>
      }
      return null
    })
  }

  /* Named here once, so the header and the "is writing…" indicator always agree. */
  const askDisplayName = page.data?.askName ?? askNameFor(orgName)

  return (
    <section aria-labelledby="gw-ask-title" style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      background: 'var(--gw-card)', border: '1px solid var(--gw-line)', borderRadius: onClose ? 0 : 12,
    }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--gw-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h2 id="gw-ask-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{askDisplayName}</h2>
          {onClose && (
            <button type="button" className="gw-tap44" onClick={onClose} aria-label="Close"
              style={{ border: 0, background: 'transparent', fontSize: 20, cursor: 'pointer', color: 'var(--gw-sub)' }}>×</button>
          )}
        </div>
        {/*
         * THE CAPTION, AND THE ONE LINE UNDER IT (decision 100; docs/ask-definition.md, "Its
         * name"). Both served, both fixed - "Ask about the company, your work or your
         * check-ins." and "You can also add context or documents to your check-ins here." -
         * printed under the name exactly as they arrive.
         */}
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--gw-text)', lineHeight: 1.4 }}>{page.data?.caption ?? ASK_CAPTION_FALLBACK}</p>
        {page.data?.addLine && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{page.data.addLine}</p>}
        {about.length > 0 && (
          /*
           * ITEM 6: THE PICKER RAN PAST THE PANEL'S RIGHT EDGE. A flex item's default minimum width
           * is its content's own width, not zero, so a long check-in label ("Faith, first 90 days")
           * could make the `<select>` wider than the 400px drawer, pushing it (and this row) past
           * the edge instead of wrapping or shrinking. `minWidth: 0` on both the row and the select,
           * with the select set to `flex: 1`, lets it shrink to the space actually available.
           *
           * REQUEST 153, PART TWO: THE FIRST OPTION IS THE ORGANISATION, NOT A CHECK-IN. One
           * check-in is an optional focus a person may pick; it is never what Ask is about, so the
           * list always offers "The whole organisation and your work" first, and picking it sends
           * no `groundId` at all (the ordinary case, not a special one - docs/ask-definition.md).
           */
          /*
           * B-231: AT 390 THE SELECT READ "The whole organisation and your wor", CUT OFF. Item 6's
           * own fix (`flex: 1, minWidth: 0`, kept exactly as is - the-live-checks.spec.tsx pins
           * both) shrinks the select to whatever the row has left after "About", which at 390 was
           * too little for the longest option, and a plain `<select>` clips rather than wraps. The
           * row itself now wraps (`flexWrap: 'wrap'`), and `.gwui-ask-about-select`'s own narrow-
           * screen rule (gw-ui.css, written up in docs/the-parts-against-the-prototype.md) gives the
           * select `flex-basis: 100%` there, so it drops to its own full-width line instead of
           * squeezing beside "About" - inline styles untouched, so item 6's own shrink-to-fit still
           * holds at every width this rule does not apply at.
           */
          <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14, color: 'var(--gw-sub)', minWidth: 0 }}>
            About
            <select value={aboutId} onChange={(e) => setChosen(e.target.value)}
              className="gwui-ask-about-select"
              style={{ flex: 1, minWidth: 0, font: 'inherit', fontSize: 15, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--gw-line)', background: 'var(--gw-card)', color: 'var(--gw-text)', maxWidth: '100%' }}>
              <option value="">The whole organisation and your work</option>
              {aboutWithDates.map((g) => {
                const apart = whatTellsItApart(aboutWithDates, g)
                return <option key={g.id} value={g.id}>{apart ? `${g.label}, ${apart}` : g.label}</option>
              })}
            </select>
          </label>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{PRIVATE_LINE}</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--gw-page)' }}>
        {page.data && !page.data.canAsk && page.data.why && <p style={bubble(false)}>{page.data.why}</p>}
        {/*
         * THE GREETING (`welcome`): served once, the first time somebody opens Ask, then `null`
         * (docs/answers-from-engine.md, "Request 153, part two"). `said.length === 0` keeps it from
         * sitting on screen once this same visit has already asked something, ahead of the next
         * fetch of `/ask` that would clear it server-side too.
         */}
        {page.data?.canAsk && page.data.welcome && said.length === 0 && <p style={bubble(false)}>{page.data.welcome}</p>}
        {page.data?.canAsk && (page.data?.starters ?? []).length > 0 && (page.data?.turns ?? []).length === 0 && said.length === 0 && (
          <div role="group" aria-label="Questions you could ask" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(page.data?.starters ?? []).map((q) => (
              <button key={q} type="button" style={chip} disabled={sending || reading} onClick={() => ask(q)}>{q}</button>
            ))}
          </div>
        )}
        {(page.data?.turns ?? []).map((t, i) => (
          <p key={`t-${i}`} style={bubble(t.from === 'you')}>{t.from === 'you' ? t.says : anOldAskAnswerReadsProperly(t.says)}</p>
        ))}
        {said.map((s, i) => s.from === 'you'
          ? <p key={`s-${i}`} style={bubble(true)}>{s.says}</p>
          : <div key={`s-${i}`} style={{ display: 'contents' }}>{drawBlocks(s.reply, i, i === latestGroundworkIndex, s.fileTaken)}</div>)}
        {reading && <p style={bubble(false)}>{STILL_READING}</p>}
        {sending && (
          /*
           * ITEM 3: A SIGN OF WORK WHILE WAITING. A reply can take up to 90 seconds, and until now
           * nothing showed at all in that time - the buttons went quietly unresponsive with no
           * explanation. Now the one shared "<name> is writing…" indicator every chat uses
           * (GroundworkIsWriting.tsx), under Ask's own name, and after four seconds the same
           * sentence the check-in conversation says once a wait is long enough to need explaining.
           */
          <>
            <GroundworkIsWriting name={askDisplayName} />
            {waitedAWhile && (
              <p style={bubble(false)}>
                <span role="status" style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                  Still reading what you wrote. Nothing was lost, you do not need to send it again.
                </span>
              </p>
            )}
          </>
        )}
        <div ref={end} />
      </div>

      {/* Hidden: the "Choose a file" block above, and the "+" beside the message box, open this. */}
      <input ref={fileInput} type="file" style={{ display: 'none' }} accept={UPLOAD_ACCEPT_ATTR} onChange={onFileChosen} />

      {(askOk || !askSettled) && (
        /*
         * ITEM 2: A MULTI-LINE MESSAGE BOX. This was a one-line `<input>`, so a pasted plan lost
         * its own line breaks the moment it landed here. The shared `Composer` (already the check-in
         * conversation's own footer, ChatPage.tsx) is a textarea that grows with its text - Enter
         * sends, Shift+Enter starts a new line, the same as the prototype's chat.
         *
         * B-112: rendered while `page` is still loading (disabled, so it never flashes empty space
         * where it belongs) and after a failed load too (enabled - see `askOk`, above), not only
         * once `canAsk` has actually arrived true.
         */
        <div style={{ borderTop: '1px solid var(--gw-line)' }}>
          {page.isError && (
            <p role="alert" style={{ margin: '8px 12px 0', fontSize: 14, color: 'var(--gw-red-t)' }}>
              Ask didn't load fully. Nothing you have asked is lost. It is usually the connection.
              {askWhy?.canRetry && (
                <>
                  {' '}
                  <button type="button" onClick={() => page.refetch()}
                    style={{ fontSize: 14, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    Try again
                  </button>
                </>
              )}
            </p>
          )}
          {!askSettled && <p role="status" style={{ margin: '8px 12px 0', fontSize: 13, color: 'var(--gw-sub)' }}>Getting Ask ready.</p>}
          {problem && <p role="alert" style={{ margin: '8px 12px 0', fontSize: 14, color: 'var(--gw-red-t)' }}>{problem}</p>}
          <Composer
            inputRef={composerRef}
            value={draft}
            onChange={(v) => {
              setDraft(v)
              const el = composerRef.current
              if (el) { el.style.height = COMPOSER_RESTING_HEIGHT; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(draft, true) } }}
            onSend={() => ask(draft, true)}
            disabled={sending || !askSettled}
            sendDisabled={!draft.trim()}
            placeholder={page.data?.caption ?? 'Ask a question'}
            ariaLabel={page.data?.caption ?? 'Ask a question'}
            maxLength={8000}
            /* THE "+" (Hafsah, 15 October): for whoever may add a document here, a lead for the check-ins they run
               (`addsContext`, served) or an admin for the whole organisation. It opens the file picker at once.
               The server still decides, on the file's way in, whether they may and where it goes. */
            onPlus={mayAddAFile ? () => { if (sending || reading) return; uploadTarget.current = CHOSEN_FIRST; fileInput.current?.click() } : undefined}
            plusDisabled={sending || reading || !askSettled}
            plusLabel="Add a photo or a document"
          />
        </div>
      )}
    </section>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { isASalesKind } from '@/lib/a-sales-kind'
import { documentsApi } from '@/api/documents'
import { askApi } from '@/api/ask'
import { toast } from 'sonner'
import { personLabel, peopleLabels, firstNameOrLabel, atTheStart } from '@/lib/utils'
import { Section, Panel, Button, TextArea, Tag, Note, Callout, Choices, SubHeading, FoldedLine, SmallMenu, RowList, Row } from '@/components/gw/ui'
import { useIsAPhone } from '@/lib/a-phone-is-not-a-narrow-desktop'
import { scrollToId } from '@/lib/scroll-to'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { EachPerson } from '@/components/gw/EachPerson'
import { LEAD_HOLDS_MORE } from '@/components/gw/the-lead-holds-more'
import { ContextChat } from '@/components/gw/ContextChat'
import { FromAPlan, WaitingForYouToConfirm } from '@/components/gw/ThePlanPage'
import { TargetsBand } from '@/components/gw/TargetsBand'
import { AddADocument } from '@/components/gw/AddADocument'
import { SharedNote } from '@/components/gw/SharedNote'
import { DeliveredPanel } from '@/components/gw/DeliveredPanel'
import { WHAT_YOU_CAN_UPLOAD, UPLOAD_ACCEPT_ATTR } from '@/lib/what-you-can-upload'
import { whatIsOutstanding } from './where-a-promise-stands'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { useAskStore } from '@/stores/ask'
import { useAuthStore } from '@/stores/auth'
import { askNameFor } from '@/lib/ask-name'

/**
 * THE CONTEXT PAGE. ONE OF THEM, FOR EVERYBODY.
 *
 * This existed twice: assembled inline in GroundAdminPage for the lead, and again inline in
 * GroundParticipantPage for everyone else. Both were defensible on their own and nothing reconciled
 * them, so the two pages drifted into different orders for the same tab - documents third for the
 * lead and sixth for a participant, a stray "Context" heading halfway down one of them, and a
 * "say something about this in the chat" button on a page that has no chat.
 *
 * That is the failure this product exists to end, reproduced in the product's own source: two
 * places that must agree, each fine alone, nothing holding them together. So there is one file, and
 * adding a band is one edit.
 *
 * THE ORDER IS THE ARGUMENT, and it answers questions in the order a person asks them:
 *   1  what this check-in is for        - you cannot judge the rest without it
 *   2  what is expected of each person  - the thing anybody is actually read against
 *   3  what you delivered against it    - the other half of that, and only your own
 *   4  the material it all rests on     - files, and tickets settled elsewhere
 *   5  what only the lead sees          - steers the questions, never quoted
 *   6  what this check-in can tell you  - an honest read of what it can and cannot do yet
 *   7  the chat                         - where you go to change any of the above
 *
 * A band with nothing in it still renders its heading and says what would go there, because
 * "nothing yet" is a fact about this check-in and a blank space is not.
 *
 * WHAT DIFFERS BY ROLE IS WHO MAY WRITE, NEVER THE ORDER. A participant sees the same page and
 * writes in different places on it: they have deliveries and their own uploads, and they do not
 * have the lead's write boxes or the setup chat.
 */
/*
 * THE FIRST WORDS, SO A CHIP IS NOT A DEAD END.
 *
 * A button that opens an empty chat box has moved the blank page rather than removed it. Each of
 * these is a half-finished sentence in the lead's own voice, put in the composer for them to
 * finish - which is also what teaches them that this conversation takes plain sentences.
 */
const THE_WAY_IN: Record<string, string> = {
  STRATEGY: 'Our strategy this quarter is ',
  WAY_OF_WORKING: 'How we work: ',
  DECISION: 'We still have to decide ',
  UNSETTLED: 'Nobody is sure yet whether ',
  NOTE: 'Worth knowing: ',
}

export function ContextPage({
  ground,
  role,
  viewerUserId,
  only,
}: {
  ground: any
  /** 'lead' is whoever runs this check-in, including an org admin reading with their eyes. */
  /**
   * THREE READERS, NOT TWO, AND THIS WAS A SWITCH WITH TWO POSITIONS.
   *
   * `'lead' | 'party'` was fine until an admin of the organisation opened the page. The view that
   * runs a check-in passed `'lead'` for both the lead and an admin, so an admin got the whole of
   * the lead's authoring surface - including the band headed "Only you see this", which is the
   * lead's private steers: the notes that shape what everybody is asked and are promised never to
   * be quoted. Her words: "i still somehow see context setting when i should see some parts of what
   * a lead does on the context page."
   *
   * So the two questions are asked separately, because their answers differ for an admin:
   *   - WHO RUNS THIS CHECK-IN decides the brief, which is the shared description of the work. An
   *     admin may rewrite it - "she should rewrite".
   *   - WHOSE CHECK-IN IT IS decides the private steers, the running log, the standing note and the
   *     context conversation. Those are one person's own framing and one person's own private
   *     notes, and an admin reading over them is not the same as an admin running the place.
   */
  role: 'lead' | 'admin' | 'party'
  viewerUserId?: string | null
  /**
   * RELEASE 1B (pull request 3 of 3): ONLY THE PARTS THAT MOVE TO MY WORK. With Release 1B's switch on, References and resources
   * no longer draws the targets, the plan as agreed, each person's card and what people are down as doing ("progress and
   * promises, which belong on the board and in My work"), so My work draws them, here, by this same code, with the same words,
   * controls and rules. Left out, the page is exactly as before.
   */
  only?: 'what-moved-to-my-work'
}) {
  const id: string = ground.id
  const qc = useQueryClient()
  /** Whoever runs this check-in: its lead, or an admin of the organisation. */
  const isLead = role === 'lead' || role === 'admin'
  /** Its lead alone. See the note on `role` for why these are two questions. */
  const isTheLead = role === 'lead'
  /**
   * WHO MAY REWRITE THE BRIEF (Hafsah, 1 October): the same rule as every other setup change. Only
   * the lead, unless the lead has left the organisation; then an admin may, and people are told who
   * did it. The server says so in `mayChangeSetup` (request 104); until it sends that, only the
   * lead is offered it, the more careful side of the rule.
   */
  const mayRewriteTheBrief = typeof (ground as any)?.mayChangeSetup === 'boolean' ? (ground as any).mayChangeSetup === true : isTheLead

  /**
   * "ADD CONTEXT WITH ASK <ORGANISATION NAME>" (decision 65, request 169). Opens the Ask
   * Groundwork panel already on this check-in's setup, instead of needing the lead to type
   * "context" first. Shown only while the engine serves `addsContext: true` on `GET /ask` - the
   * switch is off everywhere until then, so this stays hidden rather than promising a conversation
   * the engine has not turned on - and only to whoever may confirm setup here (the same rule as
   * rewriting the brief above).
   */
  const askPage = useQuery({ queryKey: ['ask'], queryFn: askApi.mine })
  const orgName = useAuthStore((s) => s.user?.organizationName)
  const showForCheckInSetup = useAskStore((s) => s.showForCheckInSetup)
  const showWith = useAskStore((s) => s.showWith)
  const canAddContextWithAsk = mayRewriteTheBrief && askPage.data?.addsContext === true
  const contextEnabled = (ground as any)?.contextEnabled === true
  /* The old context chat is drawn only while the server says it is open; while Ask's answer is still loading it is not drawn, so it never flashes and goes. */
  const oldChatIsOpen = !askPage.isLoading && askPage.data?.oldContextChatIsOpen !== false
  /*
   * B-082: WHILE THE OLD CHAT IS OFF, NOTHING POINTS AT IT. Every control that used to fill the old
   * chat's box now opens Ask with the question already asked, naming this check-in so Ask knows
   * which one; every line that told somebody to use "the conversation below" or "on this page"
   * names Ask instead. `askName` is the same name `GET /ask` serves (askNameFor), read here before
   * Ask's own panel has ever opened.
   */
  const askName = askNameFor(orgName)
  const groundLabel: string = (ground as any).label || 'this check-in'
  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === viewerUserId)

  /*
   * THE DOCUMENTS ARE THE PEOPLE IN THE CHECK-IN'S, SO NOBODY ELSE IS SENT TO ASK FOR THEM (U.7
   * review). The server lets in the people in the check-in and its lead, and refuses anyone else,
   * an admin of the organisation included. Otieno, an admin not in Wanjiru's check-in, opened this
   * page and got "That one is not yours to open" twice (the request and its retry) right under a
   * banner saying he could see everything. Now the page does not ask on his behalf, says why in the
   * band, and a refusal that still comes is said there too, once, never as a toast.
   */
  const mayOpenDocuments = isTheLead || !!myParticipant
  const docsQuery = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documentsApi.list(id),
    enabled: mayOpenDocuments,
    retry: (n, e: any) => e?.response?.status !== 403 && n < 1,
  })
  const docs: any[] = docsQuery.data ?? []
  const documentsAreNotOpenToYou = !mayOpenDocuments || (docsQuery.error as any)?.response?.status === 403

  /*
   * A RECORD OF A CONVERSATION IS ASKED ABOUT BEFORE IT IS STORED.
   *
   * The server recognises one for itself and refuses it - so this is not the gate, it is the place
   * the question gets asked in words a person can act on. Somebody who says no keeps their file;
   * nothing was uploaded and nothing is pending.
   *
   * Asked here rather than in a settings page, because the person about to hand over a recording of
   * somebody else is the only one who can have told them, and this is the only moment they can
   * still go and ask.
   */

  /*
   * A FILE ARRIVES WITH NO INSTRUCTIONS AND THE SESSION HAS TO GUESS WHAT MATTERED ABOUT IT.
   *
   * In the chat somebody can say what to look for as they attach a file, because there is a
   * conversation to say it into. Here there was nowhere to put it, so a forty page architecture
   * document went in mute and the session asked about whichever half it happened to read.
   *
   * Optional, and skippable in one click: most files do not need it, and a required box in front
   * of an upload is a reason not to upload.
   */
  /*
   * SINCE U.7 THE QUESTION IS ASKED AFTER THE READ, NOT BEFORE THE UPLOAD. The prototype's "Add a
   * document" uploads the file (private to its uploader, as always), shows what was read from it,
   * and then asks what it is for and who can read it. AddADocument.tsx is that step.
   */
  const [reviewing, setReviewing] = useState<{ id: string; name: string; note?: string } | null>(null)
  /** The promise this upload is answering, where it was started from one. */
  const [attachingFor, setAttachingFor] = useState<string | null>(null)

  /**
   * WRITING OR REWRITING THE BRIEF.
   *
   * It could be written when a check-in was created and never again - so a lead who wanted to tell
   * their team what this is for afterwards had no way to, and a check-in carrying the WRONG brief
   * was stuck with it. Every check-in made through the entry chat before today has one: the
   * report's read of the lead's own account, in the second person, published to everybody.
   *
   * Blank clears it on purpose. Somebody who wants a brief they did not write GONE should not have
   * to replace it with something they do not mean.
   */
  const [briefDraft, setBriefDraft] = useState<string | null>(null)
  /* Which bucket is being typed into, and what. Only offered where there is no chat to say it in. */
  const [typingInto, setTypingInto] = useState<string | null>(null)
  const [addingALine, setAddingALine] = useState(false)
  const [lineDraft, setLineDraft] = useState('')
  const saveBrief = useMutation({
    mutationFn: (text: string) => groundsApi.update(id, { brief: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ground", id] })
      setBriefDraft(null)
      toast.success('Saved. Everyone in this check-in now reads this.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })

  const uploadDoc = useMutation({
    mutationFn: ({ file, consented, note }: { file: File; consented: boolean; note?: string }) =>
      documentsApi.upload(id, file, consented, note),
    /*
     * IT SAID NOTHING ON SUCCESS. The file appeared in a list further down the page, which is real
     * confirmation for somebody who knows to look there and none at all for somebody who has just
     * pressed a button and is watching the button. A silent success and a silent failure look
     * identical, so the honest reading was "I do not know whether that worked".
     */
    onSuccess: (res: any, { file, note }) => {
      /* The step that follows is the confirmation: it names the file and says what was read. */
      if (res?.id) setReviewing({ id: res.id, name: file.name, note })
      else toast.success(`Uploaded ${file.name}`)
      /* A record of a conversation is taken on their word, and the word is said back to them - the
         server no longer refuses and asks first. See a-conversation-belongs-to-the-people-in-it.ts. */
      if (res?.assumed) toast.message(res.assumed, { duration: 9000 })
      qc.invalidateQueries({ queryKey: ['docs', id] })
    },
    onError: (e: any) => {
      /*
       * The server refused because it recognised a conversation and nothing had been confirmed.
       * Ask, rather than reporting a failure at somebody who did nothing wrong.
       */
      toast.error(e?.response?.data?.message || 'Upload failed.')
    },
  })

  const setDocVisibility = useMutation({
    mutationFn: ({ docId, visibility }: { docId: string; visibility: 'OPEN' | 'OWN' | 'CLOSED' }) =>
      documentsApi.setVisibility(id, docId, visibility),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
    onError: () => toast.error('That did not change. It is still visible to the same people - try again.'),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => documentsApi.remove(id, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
  })

  /*
   * THE THREE WRITE MUTATIONS WENT WITH THEIR BOXES - the running log, the shared note and the
   * private steer. Everything they did is said in the conversation now. What replaces them is one
   * mutation per LINE, because a line of the record is the thing a lead actually wants to change.
   */
  /* A note written before the buckets existed has its own share route, and no id in the new table. */
  const shareOlderNote = useMutation({
    mutationFn: (noteId: string) => groundsApi.shareLeadContext(id, noteId),
    onSuccess: () => { toast.success('Shared. Everybody on this check-in can read it now.'); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('That did not share. Try again in a moment.'),
  })

  /* Their own to-do, moved by them and by nobody else - the server enforces that. */
  const setMyToDo = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: 'DONE' | 'NOT_DONE' | 'DROPPED' }) =>
      groundsApi.setMyCommitment(id, itemId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })

  /*
   * TYPING A LINE IN, WHERE THERE IS NO CONVERSATION TO SAY IT IN.
   *
   * Item B: the page could change a line, share it, make it private and retire it, and could not
   * create one - every line arrived through the chat. On a check-in where the chat is off, the lead
   * read five empty buckets each saying "say it in the conversation above", with no conversation
   * above. A page whose every empty state points at a control that is not there.
   */
  const addLine = useMutation({
    mutationFn: ({ kind, text }: { kind: string; text: string }) => groundsApi.addContextLine(id, { kind, text }),
    onSuccess: () => {
      setTypingInto(null)
      setLineDraft('')
      toast.success('Added')
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })

  const changeLine = useMutation({
    mutationFn: ({ itemId, ...change }: { itemId: string; text?: string; audience?: 'LEAD_ONLY' | 'EVERYONE'; closed?: boolean }) =>
      groundsApi.changeContextLine(id, itemId, change),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change. Try again in a moment.'),
  })

  /**
   * IS THERE ANYTHING ON THIS PAGE YET? Used to decide whether the write boxes open by default,
   * which is only kind when the person would otherwise be looking at nothing.
   */
  /*
   * THE BUCKETS, IN THE ORDER THE PAGE DRAWS THEM. Kept in step with THE_BUCKETS on the server by
   * name rather than by import, because this list is also the page's copy order.
   */
  /** Whose words the brief is, for everybody but the lead. */
  const theLeadsFirstName: string =
    atTheStart(firstNameOrLabel((ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR') ?? { partyType: 'INITIATOR' }))
  /* The same, inside a sentence: "Wanjiru" stays "Wanjiru", and a lead with no name is "the lead". */
  const theLeadMidSentence: string =
    firstNameOrLabel((ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR') ?? { partyType: 'INITIATOR' })
  const BUCKETS: { kind: string; title: string; sub: string }[] = [
    { kind: 'STRATEGY', title: 'The strategy', sub: 'This is how we win work and what we lead with.' },
    /* "as you wrote them" to the person who wrote them - item D. See the source lines below. */
    { kind: 'WAY_OF_WORKING', title: 'How we work', sub: isTheLead ? 'These are the rules, as you wrote them.' : `These are the rules, as ${theLeadMidSentence} wrote them.` },
    { kind: 'DECISION', title: 'Still to decide', sub: 'Nobody has decided these yet.' },
    { kind: 'UNSETTLED', title: 'Not settled', sub: 'These are not treated as facts or as targets.' },
    { kind: 'NOTE', title: 'Notes', sub: 'These are kept because somebody said them.' },
  ]
  const contextLines: any[] = (ground as any).contextItems ?? []
  /*
   * AND THE NOTES THAT PREDATE THE BUCKETS, read into Notes rather than lost. Everything typed into
   * the three write boxes before they were removed is still somebody's context.
   */
  const olderNotes: any[] = ((ground as any).leadContextNotes ?? [])
    .filter((n: any) => !n.participantId)
    /* `legacy` because it is a note, not a line: it is shared through its own route and cannot be
       reworded or retired by id. Marked rather than hidden - it is still somebody's context. */
    .map((n: any) => ({ id: n.id, kind: 'NOTE', text: n.text, audience: n.audience, legacy: true }))
  const theBuckets = BUCKETS.map((b) => ({
    ...b,
    lines: [
      ...contextLines.filter((l) => l.kind === b.kind),
      ...(b.kind === 'NOTE' ? olderNotes : []),
    ],
  }))
  /*
   * HAND A LINE TO THE CONVERSATION. The row says what it is; the lead finishes the sentence.
   * Scrolling as well as filling, because the chat is at the top and a filled box nobody can see is
   * the same as no box at all.
   */
  const changeThisInTheChat = (said: string, askSaid: string) => {
    if (oldChatIsOpen) {
      window.dispatchEvent(new CustomEvent('gw:context-chat:say', { detail: said }))
      scrollToId('gw-context-chat')
    } else {
      /* B-082: no chat is drawn to fill, so this asks Ask the whole question instead of filling a
         box nobody can see. */
      showWith(askSaid)
    }
  }

  /*
   * THE LEAD'S READ OF A PERSON IS NOT ON THIS PAGE, on her instruction of 22 September 2026. It
   * reaches their check-in as a place to look and it is read back in the conversation; drawing it on
   * a page beside their name made a steer look like a file on somebody.
   */

  /** What people are down as doing. Unowned first: it is the fact a lead can act on. */
  /* Everybody's label at once, so two people with no name are "one colleague" and "another colleague"
     (request 36). Never the lead's note. */
  const labelsHere = peopleLabels(ground.participants ?? [], {
    forTheLead: true, readerId: myParticipant?.id ?? null, readerIsInIt: !!myParticipant && !isTheLead,
  })
  const commitments = [...((ground as any).commitments ?? [])].sort(
    (a: any, b: any) => (a.participantId ? 1 : 0) - (b.participantId ? 1 : 0),
  )

  /*
   * THE BANDS ARE NOT NUMBERED (group 3, piece 5, last piece). They used to be, by a counter
   * incremented once per band actually drawn - a fix for numbers that went wrong when a band only
   * renders with content. But the prototype's own Context screen
   * (docs/prototype/screens/B2-context/context.txt and company-context.txt) never numbers a
   * heading anywhere, on this page or any other, and `docs/prototype/source/app.css` has no rule
   * for a numbered heading either. A count the prototype does not show is not this page's to add
   * back; `Section`'s heading and note, unnumbered, are what every other rebuilt page already
   * uses. See docs/the-parts-against-the-prototype.md.
   */

  /**
   * The lead's own answer to "What is this about? What needs to be true at the end?", typed at
   * setup. Trimmed here so a brief of nothing but whitespace is treated as no brief, the way the
   * readiness check below already treats it.
   */
  const theBrief: string = ((ground as any).brief ?? '').trim()
  /*
   * WHAT EVERYONE IN THE CHECK-IN READS, WHICH IS NOT ALWAYS THE BRIEF (U.7 review). The lead was
   * shown her own words with "Everyone reads this before they answer.", and her people were shown a
   * different text: the short read Groundwork writes from the brief. The server now sends whoever
   * runs the check-in what the people in it read, and a participant's `brief` already is that text.
   */
  const sentToWhoeverRunsIt: string | null = isLead ? (ground as any).briefAsEveryoneReadsIt ?? null : null
  const whatEveryoneReads: string = (sentToWhoeverRunsIt ?? theBrief ?? '').trim()
  /*
   * WHOSE WORDS THEY ARE, SAID ONLY WHEN IT IS TRUE (U.7 review). "Your words, from setup." while the
   * text is the lead's own and nobody else has changed it; the name of whoever changed it, where the
   * server knows who; Groundwork, where it wrote the text people read from the lead's words.
   */
  const changedBy = (ground as any).briefChangedBy as { firstName: string | null; isYou: boolean; isTheLead: boolean } | null | undefined
  /* Whether what everyone reads is the stored brief itself, or Groundwork's short read of it. */
  const shownIsTheBrief = !!theBrief && whatEveryoneReads === theBrief
  const whoseWords: string | null = (() => {
    const ownWords = (ground as any).briefIsTheLeadsOwnWords === true
    if (changedBy && !changedBy.isTheLead) {
      /* U.7 re-check: above text Groundwork rewrote from an admin's words, he is told so, as the lead is. */
      if (changedBy.isYou) return shownIsTheBrief ? 'You changed this.' : 'Groundwork wrote this from your words.'
      if (!changedBy.firstName) return shownIsTheBrief ? 'Someone else changed this.' : 'Someone else changed this, and Groundwork wrote it from their words.'
      return shownIsTheBrief ? `${changedBy.firstName} changed this.` : `Groundwork wrote this from ${changedBy.firstName}\u2019s words.`
    }
    if (ownWords) {
      if (isTheLead) return changedBy ? 'Your words.' : 'Your words, from setup.'
      return changedBy ? `${theLeadsFirstName}\u2019s words.` : `${theLeadsFirstName}\u2019s words, from setup.`
    }
    if (isTheLead) return 'Groundwork wrote this from your words.'
    if (isLead) return `Groundwork wrote this from ${theLeadMidSentence}\u2019s words.`
    return null
  })()
  /*
   * THE FOLDS UNDER IT, AND ONLY WORDS SOMEBODY WROTE (U.7, fourth check).
   *   - "What you wrote" is the lead's own messages from setup, which the server sends to her alone.
   *   - Once somebody has rewritten the brief, it is theirs: "What you wrote" or "What Otieno wrote".
   *   - The text setup put together from her answers is shown to nobody. It was "What Groundwork put
   *     together from your answers" for three reviews, and no template makes any answer a sentence:
   *     Otieno read fragments standing as sentences, and Wanjiru's "I" as if it were his. It stays
   *     only as what the engine reads. Rewriting starts from the text everyone reads.
   */
  const herSetupWords: string = ((ground as any).leadsOwnSetupWords ?? '').trim()
  const theBriefIsSetups = (ground as any).briefPutTogetherBySetup === true && !changedBy
  const theBriefFoldTitle: string = (() => {
    if (changedBy?.isYou) return 'What you wrote'
    if (changedBy && !changedBy.isTheLead) return changedBy.firstName ? `What ${changedBy.firstName} wrote` : 'What someone else wrote'
    return isTheLead ? 'What you wrote' : `What ${theLeadMidSentence} wrote`
  })()
  const objectives: any[] = (ground as any).objectives ?? []


  /*
   * THE LIGHT CONTEXT PAGE, for a sales check-in (docs/light-rebuild/sales-first.md, section 4). The
   * one-line fact on each folded part is counted from what the server sent this reader (the ground
   * read, the documents read), never read off the screen, and says only what those hold.
   */
  const light = isASalesKind((ground as any).kindOfWork)
  const onAPhone = useIsAPhone()
  const thePageAtAGlance = (() => {
    const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
    const shared = (ground as any).whoSeesTargets === 'EVERYBODY'
    const NOUN: Record<string, [string, string]> = {
      STRATEGY: ['line of strategy', 'lines of strategy'],
      WAY_OF_WORKING: ['rule', 'rules'],
      DECISION: ['thing still to decide', 'things still to decide'],
      UNSETTLED: ['thing not settled', 'things not settled'],
      NOTE: ['note', 'notes'],
    }
    const howWeWork = theBuckets.filter((b) => b.lines.length > 0).map((b) => plural(b.lines.length, NOUN[b.kind]?.[0] ?? 'line', NOUN[b.kind]?.[1])).join(', ')
    const onlyYou = docs.filter((d: any) => d.visibility !== 'OPEN').length
    const people = ((ground.participants ?? []) as any[]).length
    return {
      targets: objectives.length ? `${plural(objectives.length, 'target')}, ${shared ? 'everyone sees every share' : 'each person sees their own share'}` : null,
      howWeWork: howWeWork || 'Nothing written down yet',
      documents: docs.length ? `${plural(docs.length, 'document')}${onlyYou ? `, ${onlyYou} only you can read` : ''}` : 'None yet',
      people: people ? plural(people, 'person', 'people') : null,
      downAsDoing: commitments.length ? `${plural(commitments.length, 'thing')} people said they would do` : 'Nothing yet',
    }
  })()

  const partA1 = (
    <>
            {isTheLead && <FromAPlan groundId={id!} />}
    </>
  )
  const partA2 = (
    <>
            {canAddContextWithAsk && (
              <Button kind="quiet" size="small" onClick={() => showForCheckInSetup(id!)}>
                {`Add context with ${askNameFor(orgName)}`}
              </Button>
            )}
    </>
  )
  const partA3 = (
    <>
            <div id="gw-context-chat">
              {/* The lead's own conversation about their own check-in. An admin reads the page. */}
              {contextEnabled && isTheLead && oldChatIsOpen && <ContextChat groundId={id!} />}
              {/* THIS IS SETUP, NOT THE CHECK-IN. Hafsah, 21 Sep 2026: she finished the context conversation on
                  her own ground and waited for the first report. Nothing here writes a report; check-ins do,
                  and hers was still "Not started" on the Sessions tab. Said once, under the conversation. */}
              {contextEnabled && isTheLead && oldChatIsOpen && (
                <Note>
                  {/* GROUP 3'S REVIEW, BATCH A FAULT 6: "IT IS NOT YOUR CHECK-IN: THE REPORT..." JOINED TWO SENTENCES WITH A COLON. */}
                  This conversation sets the context. It is not your check-in. The report is written from check-ins, and yours is on the{' '}
                  <a href={`/grounds/${id}?tab=chat`} className="gwui-plain-link">Check-in tab</a>.
                </Note>
              )}
            </div>
    </>
  )
  const partB = (
    <>
            {isTheLead && <WaitingForYouToConfirm groundId={id!} />}
    </>
  )
  const partC = (
    <>
            {/* 1 - WHAT THIS CHECK-IN IS FOR */}
            {/*
              THE BRIEF IS THE ANSWER TO THIS BAND'S OWN QUESTION, AND IT WAS NOT ON THE PAGE.

              Setup asks the lead "What is this about? What needs to be true at the end?" and stores
              the answer on the ground. This band - whose entire job is to say what the check-in is
              for - rendered only the structured objectives that get extracted LATER from the lead's
              own check-in, so a lead who had just written a full brief was told "Nothing yet."

              The brief was not unused, which is what made it hard to see: it counts towards
              `hasSuccessDefinition` a few lines above, so the page already treated it as the
              statement of what doing well means. It just never showed it to anybody.

              Both are shown when both exist. They are different things and neither replaces the
              other - the brief is the lead's own words about the situation, the objectives are the
              checkable statements the engine drew out of their session - so the source line names
              whichever is actually there rather than claiming the check-in for both.
            */}
            {/*
              THE HEADING ALONE, AS THE PROTOTYPE HAS IT. The source line that sat beside it ("from
              setup, in your own words") is now a full sentence under the brief itself, and the
              targets, which it also had to account for, are their own band since U.7.
            */}
            <Section heading="What this check-in is for" />
            {whatEveryoneReads && (
              <Panel>
                <p data-gw-brief className="gwui-panel-text gwui-pre-line">{'“'}{whatEveryoneReads}{'”'}</p>
                {/*
                  WHOSE WORDS, SAID TO WHOEVER IS READING. The prototype's sentence for the lead; the
                  lead's name for everybody else, never "the lead" to the lead's own face (item D on
                  the Context fix list, 23 September 2026).
                */}
                <div className="gwui-sentence-row gwui-mt-8">
                  <span data-gw-brief-whose className="gwui-fs-13 gwui-ink-sub">
                    {whoseWords ? `${whoseWords} ` : ''}This is what everyone in this check-in reads before they answer.
                  </span>
                  {mayRewriteTheBrief && briefDraft === null && (
                    <Button
                      kind="quiet"
                      size="small"
                      onClick={() => setBriefDraft(theBriefIsSetups ? whatEveryoneReads : (theBrief || whatEveryoneReads))}
                    >
                      Rewrite
                    </Button>
                  )}
                </div>
                {/* Her own words from setup, to her alone, while the brief is still setup's. */}
                {isTheLead && herSetupWords && !changedBy && (
                  <details data-gw-brief-fold className="gwui-mt-8">
                    <summary className="gwui-inline-fold-summary gwui-fs-13 gwui-ink-navy">What you wrote</summary>
                    <p className="gwui-panel-text-muted gwui-pre-line gwui-mt-6">{herSetupWords}</p>
                  </details>
                )}
                {/* The stored brief, where what everyone reads is Groundwork's short read of it, and
                    only when somebody wrote it: never the text setup put together (see above). */}
                {isLead && theBrief && !shownIsTheBrief && !theBriefIsSetups && (
                  <details data-gw-brief-fold className="gwui-mt-8">
                    <summary className="gwui-inline-fold-summary gwui-fs-13 gwui-ink-navy">{theBriefFoldTitle}</summary>
                    <p className="gwui-panel-text-muted gwui-pre-line gwui-mt-6">{theBrief}</p>
                  </details>
                )}
              </Panel>
            )}
            {/*
              AN EMPTY BRIEF SAYS WHAT A BRIEF IS, rather than nothing at all.

              It could not be empty before, because it was filled with the report's read of the
              lead's own account - "You have two standards for Zainab's first quarter..." - which
              is not a brief and was not theirs to publish. With that gone, a check-in whose lead
              has not written one shows the space and what belongs in it, which somebody can act
              on. See the comment in entry.service.ts on `const brief`.
            */}
            {!whatEveryoneReads && briefDraft === null && (
              <Panel className="gwui-rule-dashed">
                <p className="gwui-panel-text-muted">
                  {/* B-151: THE LEAD READ ABOUT HERSELF IN THE THIRD PERSON. "The lead can write a
                      few lines" said to the one person who IS the lead reads as though somebody
                      else is being spoken about; everyone else still needs the third person,
                      since it names who they should expect this from. */}
                  {isTheLead
                    ? 'You have not said what this check-in is for yet. Write a few lines, and everyone reads them before they answer.'
                    : 'Nobody has said what this check-in is for yet. The lead can write a few lines about what it is for and what they want from it. Everyone in this check-in reads it before they answer.'}
                </p>
                {mayRewriteTheBrief && (
                  <div className="gwui-mt-8">
                    <Button kind="quiet" size="small" onClick={() => setBriefDraft('')}>
                      Write the brief
                    </Button>
                  </div>
                )}
              </Panel>
            )}
            {isLead && briefDraft !== null && (
              <Panel className="gwui-rule-blue">
                <TextArea
                  autoFocus
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="What this check-in is for, and what you want from it, in your own words."
                />
                <div className="gwui-button-row gwui-mt-8">
                  <Button
                    size="small"
                    onClick={() => saveBrief.mutate(briefDraft)}
                    disabled={saveBrief.isPending || briefDraft === theBrief}
                  >
                    {saveBrief.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button kind="secondary" size="small" onClick={() => setBriefDraft(null)}>
                    Cancel
                  </Button>
                  {theBrief && briefDraft.trim() === '' && (
                    <Note>Saving it empty removes the brief.</Note>
                  )}
                </div>
              </Panel>
            )}
    </>
  )
  const partD = (
    <>
            {/*
              TARGETS, IN THE PROTOTYPE'S TABLE (U.7): what it is, the number, whose it is, and who
              sees it, with what each target assumes under it. Its own file, TargetsBand.tsx.

              Before that it was one table grouped by person, which replaced thirteen cards - Hafsah,
              22 September 2026: "i feel like the targets i see are not real targets and they can all
              be in one box". Still one box: the team's rows first, then each person's share.

              WHO SEES A ROW IS THE SERVER'S ANSWER (targetsFor in the ground read). This draws what
              it was sent, and says beside each row who else reads it.
            */}
            {objectives.length > 0 ? (
              <>
                <Section heading="Targets" />
                <TargetsBand
                  groundId={id}
                  targets={objectives}
                  participants={(ground.participants ?? []) as any[]}
                  viewerUserId={viewerUserId}
                  isTheLead={isTheLead}
                  numbersShared={(ground as any).whoSeesTargets === 'EVERYBODY'}
                  onChangeTarget={isTheLead && contextEnabled ? (o) => changeThisInTheChat(`Change the target "${o.name}" to `, `I want to change the target "${o.name}" on ${groundLabel}.`) : undefined}
                />
              </>
            ) : (
              !theBrief && (
                <Callout>
                  {/*
                    "IN THE CONVERSATION BELOW" ONLY WHEN THERE IS ONE (real-user walk, Kijani
                    Foods, fault 5). The chat underneath this page only ever renders for the lead
                    who may change setup, gated the same way as everywhere else on this page
                    (`contextEnabled && isTheLead`, line 448) - Esther, a member, and Naomi, an
                    admin without that right, both read an instruction to use a conversation that
                    is not on their screen at all. Everybody else reads the same plain fact with
                    nothing to act on.
                  */}
                  {mayRewriteTheBrief && contextEnabled
                    ? (oldChatIsOpen
                      /* B-151: the conversation this points at (ContextChat, above the Targets
                         band) is ABOVE this sentence on the page, not below it - the same mistake
                         already caught and fixed on the nearby "What people are down as doing"
                         panel further down this file. */
                      ? 'Nothing yet. Say what this is counted by in the conversation above and it lands here.'
                      : `Nothing yet. Tell ${askName} what this is counted by and it lands here.`)
                    : 'Nothing yet.'}
                </Callout>
              )
            )}

    </>
  )
  /*
   * THE PLAN, AS AGREED (Hafsah, 18 October; the prototype's full Context page: "10 new leads a week", "Samuel, Weekly"). The
   * server builds each line from the record (confirmed plan cards, and targets a person carries on a cadence) and sends only what
   * this reader may read. With nothing on record it sends none, and the section is left out: the prototype has no empty wording.
   */
  const planAsAgreed: { id: string; what: string; who: string; when: string }[] = (ground as any).planAsAgreed ?? []
  const thePlanRows = planAsAgreed.length > 0 ? (
      <Panel pad={false}>
        <RowList label="The plan, as agreed">
          {planAsAgreed.map((l) => (
            <Row key={l.id} columns="1fr auto" inset="panel">
              <span>{l.what}</span>
              <Note tone="muted">{`${l.who}, ${l.when}`}</Note>
            </Row>
          ))}
        </RowList>
      </Panel>
  ) : null
  const partPlan = thePlanRows ? <><Section heading="The plan, as agreed" />{thePlanRows}</> : null
  const partE = (
    <>
            {/*
              THE LEAD'S FRAMING, under what this is for and above the people. It is the sentence that
              tells everybody what the situation is, in the lead's own words, and it is never quotable.
            */}
            <SharedNote text={(ground.leadContextNotes ?? []).find((n: any) => n.audience === 'EVERYONE' && !n.participantId)?.text} leadName={personLabel(ground.participants?.find((p: any) => p.partyType === 'INITIATOR'))} isViewerTheLead={isTheLead} />

    </>
  )
  const partF = (
    <>
            {/* 2 - PERSON BY PERSON */}
            {/*
              THE DESIGN NAMES THIS BAND DIFFERENTLY FOR EACH READER, and the difference is the
              point. A lead is reading a roster - "person by person". A participant is reading the
              one thing they are measured against, and "what is expected of you" is what they came
              for. One heading for both made the lead's page read like a form and the participant's
              read like somebody else's list.
            */}
            {/* Renamed 22 September 2026: "not sure the purpose of person by person". The band is a
                card per person holding everything about them, so it is named after that. */}
            <Section
              heading={isLead ? 'Each person' : 'Your part, and everybody else\u2019s'}
              note={isLead ? 'Open a card to see that person\u2019s numbers, to-dos and what they said they would show.' : 'Your card is open. Open anyone else\u2019s card to see what is on it.'}
            />
            {/*
              WHAT IS OUTSTANDING, IN ONE LINE, BEFORE THE LIST OF IT.
              
              The line somebody reads before a conversation. It counts and never characterises -
              three past their date is a number, and what that means is the report's business.
              
              Nothing at all when there is nothing to say, which is where a healthy check-in sits
              most of the time. A panel that always carries a warning is one people stop reading.
            */}
            {(() => {
              const all = (ground.participants ?? []).flatMap((p: any) => p.objective?.all ?? [])
              const line = whatIsOutstanding(all, new Date())
              if (!line || !isLead) return null
              return <Callout tone="warning">{line}</Callout>
            })()}

            {/*
              ONE CARD PER PERSON, AND THE ONLY PLACE ANYTHING ABOUT A PERSON APPEARS.
              
              "Not sure the purpose of person by person" - it rendered one card per EXPECTATION, so a
              lead read a stack of sentences with names on them and everything else about a person
              was in three other bands. Collapsed by default, because a hundred people is the test.
              
              And the lead's own read of somebody is NOT on it, on her instruction: that lives in the
              conversation, which is where they write it and the only place it is read back.
            */}
            <EachPerson
              groundId={id}
              people={(ground.participants ?? []) as any[]}
              targets={((ground as any).objectives ?? []) as any[]}
              toDos={commitments as any[]}
              files={(docs ?? []) as any[]}
              asks={((ground as any).asks ?? {}) as any}
              viewerUserId={viewerUserId}
              isLead={isLead}
              isTheLead={isTheLead}
              leadFirstName={theLeadMidSentence}
              groundLabel={groundLabel}
              oldChatIsOpen={oldChatIsOpen}
              askName={askName}
              onChangeInChat={isTheLead && contextEnabled ? changeThisInTheChat : undefined}
              /*
                ATTACHING AGAINST THE THING THEY PROMISED, not into a general pile. The line they
                pressed becomes what the check-in is told to look for in the file, so the promise and
                the document are joined at the moment of attaching rather than by somebody guessing
                later which sheet was meant.
              */
              onUploadFor={(_pid, ask) => {
                setAttachingFor(ask?.what ?? null)
                document.getElementById('ga-doc-upload')?.click()
              }}
              onSetToDo={(itemId, status) => setMyToDo.mutate({ itemId, status })}
            />

            {/*
              AND WHAT SUCCESS LOOKS LIKE, AT THE FOOT OF THIS BAND RATHER THAN AS ONE OF ITS OWN.

              It was not on Context at all, which made My record's "success and expectations live on
              Context" a link to a page holding one of the two things it named. Then it arrived here
              as its own numbered section, which was "a new section for no reason" - what success
              looks like and what is expected of each person are one subject, and a second heading
              said they were two.

              So it is a sentence or two under the expectations, which is where somebody reading what
              is expected of them wants the standard that sits over it. The full band, with each
              condition and where the accounts put it, still renders where there is room to work in
              it: the board, and each session's report.
            */}


            {/*
              3 - AND WHAT YOU DID ABOUT IT, touching the words you are measured against.

              The page could state what was expected of somebody and gave them nowhere to answer it,
              so their side reached the record only if they got it out in a session - which favours
              whoever speaks first and longest. The two belong next to each other or the second one
              is just a diary.

              Only your own, and only once there is something to answer. A lead is usually a party
              too and should record what they delivered like anybody else - but one who is MANAGING
              ONLY never checks in, so there is no session for this to be raised in.

              AND ONLY WHERE SOMETHING IS EXPECTED OF THEM. With no expectations the card renders
              three empty boxes and a menu whose only option is "something nobody asked for", which
              is what the lead saw on their own page: a control that cannot do the thing its heading
              describes. Nothing is expected of them yet, so there is nothing to have delivered
              against, and the honest render is no card at all.
            */}
            {myParticipant && !(myParticipant as any).managingOnly &&
              ((myParticipant as any)?.objective?.all ?? []).length > 0 && (
              <DeliveredPanel
                groundId={id}
                expectations={((myParticipant as any)?.objective?.all ?? []).map((o: any) => ({
                  id: o.id,
                  text: o.text,
                }))}
              />
            )}

    </>
  )
  const partG = (
    <>
            {/* WHAT THIS GROUND WILL AND WILL NOT BE ABLE TO TELL YOU. (G25)
                Above the upload, because it is the reason to bother with any of
                it. Not a score and not a completeness bar: a statement about the
                REPORT'S limits, given what the ground holds.

                "Your context is 40% complete" makes somebody feel marked at the
                exact moment they are deciding whether this product is on their
                side, and tells them nothing about what the effort buys. "It will
                not be able to tell you whether the conditions were met, because
                none have been named" carries the same information, names the
                missing thing, and is a fact about a tool rather than a judgement
                on a reader.

                Never mandatory and never graded. A ground with thin context is
                still a real ground; this exists so nobody is surprised in month
                three by a question the record was never able to answer. */}
            {/* 3 - DOCUMENTS AND REFERENCES: the material every question is built on. */}
            {/*
              "Documents and references" was true when a ticket was a row in this band. Tickets now
              live on the expectation they belong to, so this takes files and only files - and a
              heading that offers something the band cannot do is how somebody goes looking for a
              control that is not there.
            */}
            {/*
              THE QUESTION, IN THE WORDS SOMEBODY NEEDS TO READ.
              
              Not a tick-box in settings that was agreed to a year ago. The person about to hand
              over a recording of somebody else is the only one who can have told them, and this is
              the only moment they can still go and ask.
              
              Saying no keeps their file. Nothing was uploaded and nothing is waiting.
            */}
            {/*
              * NUMBERED IN THE ORDER THE PAGE ACTUALLY RUNS IN, WHICH IT WAS NOT.
              *
              * The numbers went on three of the five bands and started at the third one, so the page
              * read "What this check-in is for", "Person by person", then "1 DOCUMENTS". A number
              * that disagrees with the thing above it is worse than no number: it tells somebody
              * they have missed something.
              */}
            {/*
              HOW MANY ARE BELOW IT. Hafsah, 23 September 2026: "where does the list of docs go."
              The band opened with a large dashed box carrying a heading and two paragraphs, and the
              list only exists once a file does - so on a check-in with none, the answer to "where
              is the list" was genuinely nowhere, and on one with several the box still came first.
              The count is in the heading now and the box below it is one row.
            */}
            {/*
              RENAMED "DOCUMENTS" TO "RESOURCES", IN THE PROTOTYPE'S SHAPE (docs/prototype/screens/
              B2-context/company-context.txt, "Resources / Shared, read, and what each checks"). The
              same panel this page already had - upload, cards, controls - carries the heading and
              note the prototype gives the company-level Resources panel, one level down: a shared
              document, who reads it, what the check-in read from it, and what that read is used to
              check. Nothing here is invented - a line is only drawn where the server sends it.
            */}
            <Section heading="Resources" note="Shared, read, and what each checks" />
            {documentsAreNotOpenToYou && (
              <p data-gw-documents-not-open className="gwui-note">
                You can’t open these documents from here.
              </p>
            )}

            {/*
              AN EMPTY STATE THAT SAYS WHAT TO ADD, NOT THAT NOTHING IS THERE. W8-24.
              
              "No documents uploaded yet." is a sentence about absence, sitting directly
              under an upload control that already says PDF, DOCX, JPEG. It uses the one
              moment somebody is looking at an empty list to tell them it is empty.
            */}

            {/* OPEN AND CLOSED, NAMED AS SUCH. (G38)
                Nobody puts real context into a box whose readership they are
                guessing at, so the destinations are labelled rather than implied.
                Everything defaults to private (G24 rule 3) and moving something
                to open is a deliberate act: a performance plan dropped into
                shared context in a hurried first week cannot be undone, because
                the others have already read it. */}
            {/* Once, on the first document, not standing over the list forever. Three sentences
                about three states, above a row whose control already spells all three out, is the
                bulk she keeps naming - and the reader has already made the choice by their second
                upload. */}
            {contextEnabled && docs.length === 1 && (
              <Callout>
                {/*
                  THE WORDS HERE ARE THE WORDS ON THE CONTROL, which they were not: this sentence
                  explained "Open" and the button has always said "Everyone", so the one term the
                  reader was taught did not appear anywhere they could click. And the lead now has a
                  third answer, which a sentence naming two would quietly contradict.
                */}
                Everything you add starts private to you. If you choose <b>Everyone</b>, everyone in this check-in can read it. If you choose <b>Only you</b>, nobody else can open it.
                {isTheLead && <> If you choose <b>Whoever runs this check-in</b>, the person running it can read it, so it stays readable if someone else takes the check-in over from you.</>}
              </Callout>
            )}
            {/*
              THE DOCUMENTS AS CARDS, WITH "ADD A DOCUMENT" AS THE LAST CARD (U.7, the prototype's
              Context page). Shared ones first, so "what are we all working from" is the first row
              somebody reads; each card still says who reads it, with the same controls and rules.
            */}
            {reviewing && (
              <AddADocument
                key={reviewing.id}
                groundId={id}
                docId={reviewing.id}
                fileName={reviewing.name}
                contextEnabled={contextEnabled}
                startingNote={reviewing.note}
                onChooseAnother={() => { setReviewing(null); document.getElementById('ga-doc-upload')?.click() }}
                onClose={() => setReviewing(null)}
              />
            )}
            {!documentsAreNotOpenToYou && (
            <div className="gwui-doc-grid">
            {/*
              GROUPED BY WHO READS THEM, which is the only decision anybody makes about a file.
              
              It was one flat list where a brief the whole team works from sat between two private
              uploads, and the only way to tell them apart was to read the control on the right of
              each row. Somebody scanning for "what are we all working from" had to read every line.
              The rows themselves are unchanged - same controls, same rules about who may set what.
            */}
            {[
              ...docs.filter((d: any) => d.visibility === 'OPEN'),
              ...docs.filter((d: any) => d.visibility !== 'OPEN'),
            ].filter((d: any) => d.id !== reviewing?.id).map((doc: any) => (
              <Panel key={doc.id}>
                <div data-gw-document={doc.id} className="gwui-doc-card">
                <div>
                  <p className="gwui-fs-13">
                    <strong>{doc.name}</strong>
                    {/*
                      A PHOTO READS AS A PHOTO. Her words: "they should see docs/photos/things to
                      upload". A thumbnail is not possible today and saying so is better than
                      pretending: an image is read into words at upload and the bytes are not kept,
                      so the list can say it is a photo and what the product saw in it, and a real
                      thumbnail waits until a file is stored as a file.
                    */}
                    {/^image\//.test((doc as any).mimeType ?? '') && (
                      <> <Tag tone="action">photo</Tag></>
                    )}
                  </p>
                  {/*
                    "WHAT WE READ FROM IT" AND "USED TO CHECK", THE COMPANY-LEVEL RESOURCES ROW,
                    ONE LEVEL DOWN (company-context.txt, "Strategy v2.pdf / Everyone / What we read
                    from it / ... / Used to check / ..."). Each line is drawn only where the server
                    sends it - a summary the read produced, or the note the uploader wrote - and
                    left out rather than guessed where it did not.

                    "Used to check" IS THE UPLOADER'S OWN "WHAT IT IS FOR" (usedFor), in the
                    prototype's words for the row. The server sends it to the uploader alone, so a
                    shared document does not carry somebody else's private instruction to anyone
                    else who can read it.
                  */}
                  {doc.usedFor && (
                    <div className="gwui-mt-5">
                      <SubHeading>Used to check</SubHeading>
                      <p className="gwui-panel-text-muted">{doc.usedFor}</p>
                    </div>
                  )}
                  {/*
                    "WHAT WE READ FROM IT", ON THE FACE RATHER THAN FOLDED (U.7 review kept the raw
                    item-by-item read folded away below - it still is, in "What Groundwork took from
                    it" - but the prototype's Resources row states the summary plainly, and a summary
                    a person actually wrote (assessment.suggests) reads as a sentence rather than the
                    dashes and colons U.7 was written to keep off the card's face).
                  */}
                  {(() => {
                    const suggests = Array.isArray((doc as any).assessment?.suggests) ? (doc as any).assessment.suggests : []
                    const whatWeRead = suggests.length > 0
                      ? suggests.join(' ')
                      : (doc.theContextWeHave ? doc.theContextWeHave.replace(/^Here is the context we have from [^\n]*\n*/, '').trim() : null)
                    if (!whatWeRead) return null
                    return (
                      <div className="gwui-mt-5">
                        <SubHeading>What we read from it</SubHeading>
                        <p className="gwui-panel-text-muted gwui-pre-line">{whatWeRead}</p>
                      </div>
                    )
                  })()}
                  {/*
                    WHAT GROUNDWORK TOOK FROM IT, ITEM BY ITEM, STILL FOLDED (U.7 review).

                    The face now carries the summary line above. This keeps the fuller, itemised read
                    - the numbers and dates it holds, in the engine's own words (what-a-document-
                    holds.ts) - one click away rather than printed a second time.
                  */}
                  {doc.theContextWeHave && (
                    <details data-gw-document-took className="gwui-mt-6">
                      <summary className="gwui-inline-fold-summary gwui-fs-13 gwui-ink-navy">What Groundwork took from it</summary>
                      {doc.uploadedAt && (
                        <Note>Added on {whenItWas(doc.uploadedAt, 'day')}.</Note>
                      )}
                      {/* WALKTHROUGH PASS 2, ITEM 3: A <p> INSIDE A <p>. `Note` already renders its
                          own <p> (NoteEmpty.tsx), so wrapping it in another <p> here put one block
                          element inside another of the same kind - invalid HTML, and a console error
                          on the participant's Context tab. A <div> carries the same text classes. */}
                      <div className="gwui-panel-text gwui-pre-line gwui-mt-6">
                        {doc.theContextWeHave.replace(/^Here is the context we have from [^\n]*\n*/, '')}
                        {(doc.holds?.forOnePerson?.length || doc.holds?.forEverybody?.length) ? (
                          <Note>These are on the board and in the report, against the people who hold them.</Note>
                        ) : null}
                      </div>
                    </details>
                  )}
                </div>
                <div className="gwui-button-row">
                  {/* WHO CAN READ THIS, stated on the row rather than in a
                      settings screen. Somebody deciding whether to attach a
                      handover note needs the answer where they are, not two
                      clicks away.

                      Only shown with the flag on: with it off there is one
                      answer for every document and a control offering a choice
                      that does not exist would be a lie about the product. */}
                  {/*
                      ONLY THE UPLOADER MAY MOVE A DOCUMENT, so only the uploader is shown the
                      control. Everyone's list holds their own files and everything OPEN, so this
                      row is often somebody else's - and the control was drawn on it anyway,
                      enabled, answering "Document not found" about a document plainly on screen.
                      `mine` is omitted by older payloads, so an absent value means yes and the
                      screen behaves as it did before rather than hiding every control. */}
                  {contextEnabled && (doc as any).mine !== false && (isLead ? (
                    /*
                      THE LEAD GETS THE THIRD ANSWER, AND ONLY THE LEAD.

                      A party choosing between two states is choosing about their own file, so a
                      pill that flips between them is honest. CLOSED is not a third degree of
                      privacy - it hands the document to whoever is running the check-in - so
                      putting it at the end of a cycle that reads "Everyone, Only me, ..." would
                      invite a party to click once more and give their file away believing they had
                      locked it down harder. The server refuses them; this makes sure they are
                      never asked. A list rather than a cycle because three states on one button
                      means a mistake is two more clicks to undo.
                    */
                    <select
                      value={(doc as any).visibility ?? 'OWN'}
                      disabled={setDocVisibility.isPending}
                      onChange={e => setDocVisibility.mutate({
                        docId: doc.id,
                        visibility: e.target.value as 'OPEN' | 'OWN' | 'CLOSED',
                      })}
                      aria-label={`Who can read ${doc.name}`}
                      className={`tag gwui-tag-control ${(doc as any).visibility === 'OPEN' ? 'rec' : 'plain'}`}
                    >
                      <option value="OPEN">Everyone</option>
                      <option value="OWN">Only you</option>
                      {/* Named by who reads it, not by how private it feels, because "the person
                          running this check-in" is a chair rather than a person: it stays readable
                          if the lead changes or an org admin steps in. That is the whole of the
                          difference from "Only me" and the only thing worth saying on the row. */}
                      {/* The server lets the initiator alone set this (documents.service, CLOSED). An admin
                          who is not the lead was offered it and refused on press (A12): offered now only
                          to the one who can use it, shown read-only where a document already has it. */}
                      {(isTheLead || (doc as any).visibility === 'CLOSED') && (
                        <option value="CLOSED" disabled={!isTheLead}>Whoever runs this check-in</option>
                      )}
                    </select>
                  ) : (
                    <button
                      onClick={() => setDocVisibility.mutate({
                        docId: doc.id,
                        visibility: (doc as any).visibility === 'OPEN' ? 'OWN' : 'OPEN',
                      })}
                      disabled={setDocVisibility.isPending}
                      /* The CLOSED case that used to be handled here was unreachable: a party's
                         document list is their own files plus what is OPEN, so a CLOSED row never
                         arrives. It read "This is your own context and stays with you", which was
                         also the wrong sentence for what CLOSED means. */
                      title={(doc as any).visibility === 'OPEN'
                        ? 'Everyone in this check-in can read this. Click to make it yours only.'
                        : 'Only you can read this. Click to share it with everyone in this check-in.'}
                      className={`tag gwui-tag-control ${(doc as any).visibility === 'OPEN' ? 'rec' : 'plain'}`}
                    >
                      {/* THE DESTINATION IN WORDS, as the design has it. "Everyone" and "Only me"
                          are what a person is choosing between; an icon or a switch makes them
                          guess, and this is the one control on the page whose mistake cannot be
                          undone. CLOSED is the lead's own material and is not settable here. */}
                      {(doc as any).visibility === 'OPEN' ? 'Everyone' : 'Only you'}
                    </button>
                  ))}
                  {/* Same rule as the visibility control above it, and the same defect until now:
                      Delete was drawn on everybody's OPEN files and answered "Document not found".
                      Only the uploader may delete, so only the uploader is offered it. */}
                  {(doc as any).mine !== false && (
                    <button onClick={() => deleteDoc.mutate(doc.id)} className="btn quiet sm gwui-ink-red">Delete</button>
                  )}
                </div>
                </div>
              </Panel>
            ))}
            <Panel
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploadDoc.isPending) { e.preventDefault(); document.getElementById('ga-doc-upload')?.click() } }}
              onClick={() => { if (!uploadDoc.isPending) document.getElementById('ga-doc-upload')?.click() }}
              /* The formats, where somebody asks the question: while choosing a file. */
              title={WHAT_YOU_CAN_UPLOAD}
              className={`gwui-rule-dashed${uploadDoc.isPending ? ' gwui-busy' : ''}`}
            >
              {/*
                LABELLED BY WHO READS IT, like the two note boxes below. The page had three inputs
                named by what they were - documents, notes, private context - when the only difference
                that matters to somebody deciding where to put something is who ends up reading it.
              */}
              <p className="gwui-fs-13 gwui-ink-navy">
                {/*
                  THE HEADING FOLLOWS THE FLAG, LIKE THE SENTENCE UNDER IT.
                  
                  My first version read "private to you until you open it" in both states - and with
                  CONTEXT_ENABLED off there is no opening it, so it promised an action that does not
                  exist, directly above a sentence correctly saying the file reaches nobody. The same
                  contradiction this box was just fixed for, reintroduced one line higher.
                */}
                <strong>{uploadDoc.isPending ? 'Uploading…' : 'Add a document'}</strong>
              </p>
              {/*
                THE FILE-TYPE LIST CAME OFF THE PAGE AND ONTO THE CONTROL.

                "The Documents band is the loudest thing on the Context page." It was a large dashed
                dropzone carrying a heading, a list of eight accepted file types, and a
                three-line paragraph - about as much text as the brief, for a control that is
                pressed once. Which formats are allowed is a question somebody has WHILE choosing a
                file, which is where the file picker is, so it is on the control's tooltip and in
                its `accept` - where the picker enforces it anyway.
              */}
              {/*
                THE PROMISE SITS IN THE BOX IT IS ABOUT. It used to be a second bordered panel
                directly beneath this one, so an empty Documents band was two stacked boxes saying
                two halves of one thing - what you may upload, then what happens to it. One box.
              */}
              {/*
                THE PRIVACY DEFAULT IS STATED BEFORE ANYBODY UPLOADS, ALWAYS.
                
                This lived in the heading, and the heading is now what the box is FOR - her words:
                "upload file to use as proof or context of work in the checkin, it is private to
                you unless you decide to make it visible to everyone." So the privacy half moved
                down here, and it is NOT inside the empty-state branch: put there, the box stopped
                stating the default the moment the list had one document in it, which is the exact
                shape of the bug that spec was written for - the page telling the truth only after
                the upload it had already talked somebody into.
                
                Flag-aware, because with CONTEXT_ENABLED off a document can never be opened at all
                (`canSeeDocument` returns `isMine` and ignores the column), so promising that
                everyone reads it once you open it would swap one false sentence for another.
              */}
              {/*
                STAYS, WHATEVER ELSE IS TRIMMED. I moved this behind `docs.length === 0` while
                shrinking the band and what-the-upload-box-promises-is-true refused it, correctly:
                the whole point of that guard is that the privacy default is readable BEFORE
                somebody uploads, and the second person to upload a file reads this box too. The
                examples below are for a first-timer; this sentence is for every upload.
              */}
              <p className="gwui-panel-text-muted gwui-mt-4">
                {contextEnabled
                  ? 'It starts private to you. You choose who can read it.'
                  : 'It is private to you. It shapes your own questions and reaches nobody else.'}
              </p>
              {docs.length === 0 && (
                /* Left-aligned: it inherits the dropzone's centring otherwise, and a paragraph set
                   centred is harder to read than the same paragraph set flush. */
                <p className="gwui-note gwui-mt-6">
                  {/*
                    AND WHAT COUNTS, WHICH ONLY THE FIRST-TIME READER NEEDS.

                    Every example here used to be a document from BEFORE the work started, so people
                    uploaded a scope and stopped. The record of what was actually done or said -
                    meeting notes, a Gemini or other transcript, a photo of a whiteboard - is what a
                    check-in most wants to read, and it is already sitting in somebody's inbox.
                  */}
                  The check-in reads it, and says where it does not match what you have told it. It
                  can be proof of what has happened, such as meeting notes, a transcript from Gemini
                  or another notetaker, or a photo of what was agreed. It can also be the brief, plan
                  or scope this work was set against.
                </p>
              )}
              <input type="file" id="ga-doc-upload" className="gwui-sr-only" accept={UPLOAD_ACCEPT_ATTR}
                onChange={e => {
                  const f = e.target.files?.[0]
                  /*
                   * NOTHING IS ASKED BEFORE IT LEAVES THE DEVICE. This used to stop a file whose name said
                   * "transcript" and ask first. The server recognises a record of a conversation by its
                   * shape, keeps it, and says the assumption back (see the upload's onSuccess) - so the
                   * one question left to ask here is what to look for in it.
                   */
                  if (f) {
                    /* Carrying what they said they would show, where that is why they are here. */
                    uploadDoc.mutate({ file: f, consented: false, note: attachingFor ?? undefined })
                    setAttachingFor(null)
                  }
                  e.target.value = ''
                }} />
            </Panel>
            </div>
            )}
    </>
  )
  const partH = (
    <>
            {/*
              WHAT PEOPLE ARE DOWN AS DOING, WITH NOBODY MARKED AS HAVING DONE IT.
              
              A paste hands over the actions as well as the numbers. The ones with no owner are
              listed as having none, because that is the fact and it is the one worth acting on.
            */}
            {/*
              THE SAME OMISSION AS THE BUCKETS: gated on having some, so the one place a lead looks
              for "what did somebody commit to on that call" did not exist until something had
              already been recorded there. See the note on the strategy band.
            */}
            {(isTheLead || commitments.length > 0) && (
              <>
                <Section heading="What people are down as doing" note="Nobody is marked as having done these. The check-ins ask about them." />
                {isTheLead && contextEnabled && commitments.length === 0 && (
                  <Panel>
                    <p className="gwui-panel-text-muted">
                      {oldChatIsOpen
                        ? 'Nothing yet. Anything somebody says they will do in a check-in lands here on its own. Something agreed on a call goes in by saying it in the conversation above.'
                        : `Nothing yet. Anything somebody says they will do in a check-in lands here on its own. Something agreed on a call goes in by telling ${askName}.`}
                    </p>
                    <div className="gwui-mt-8">
                      {/* A quiet text link: the prototype's Context screen has no button here. */}
                      <button type="button" className="gwui-plain-link" onClick={() => changeThisInTheChat('On the call today, ', `Something was agreed on a call today for ${groundLabel}. I want to add it to this check-in.`)}>
                        Something agreed on a call
                      </button>
                    </div>
                  </Panel>
                )}
                <Panel pad={false}>
                  <ShowAFew rows={commitments} few={8} what="things people are down as doing">
                  {(c: any) => {
                    const p = c.participantId ? ground.participants.find((x: any) => x.id === c.participantId) : null
                    return (
                      <div key={c.id} className="gwui-panel-row gwui-line-row">
                        <Tag tone={c.participantId ? 'plain' : 'attention'}>
                          {c.participantId ? (p && p.id === myParticipant?.id ? 'You' : atTheStart((p && labelsHere.get(p.id)) ?? 'a colleague')) : 'Nobody owns this'}
                        </Tag>
                        <span className="gwui-panel-text">{c.text}</span>
                        {c.whenSaid && <Note>{c.whenSaid}</Note>}
                        {/* Whose words, to whoever is reading: it said "your words" to everyone (U.7 review). */}
                        {!c.explicit && <Note>{isTheLead ? 'These are your words, not theirs.' : p && p.id === myParticipant?.id ? `These are ${theLeadMidSentence}’s words, not yours.` : `These are ${theLeadMidSentence}’s words, not theirs.`}</Note>}
                      </div>
                    )
                  }}
                  </ShowAFew>
                </Panel>
              </>
            )}

    </>
  )
  const partI = (
    <>
            {/*
              WHAT WE KNOW, IN NAMED BUCKETS, ONE LINE EACH.
              
              This is what replaced four walls of text and a red band at the bottom of the page. Each
              line is a row with an id, so it can be reworded, shared, made private or retired in a
              sentence - and the two controls that do it sit on the line rather than in a form.
              
              The work buckets are the team's by default. A line about somebody is never here: it is
              under that person, above, and it is the lead's alone.
            */}
            {/*
              THE SECTION THAT WAS ONLY THERE ONCE SOMETHING WAS IN IT.
              
              Hafsah, 23 September 2026: "The Context tab still needs places to seed strategy, team
              notes, to dos, commitment... It should be clear where things go" and then, looking at
              her own empty check-in, "I still dont see it anything."
              
              She was right and the reason is one line: this whole band rendered inside
              `theBuckets.some(b => b.lines.length > 0)`. On a check-in with nothing in it yet -
              which is every check-in on its first day, the one day somebody wants to seed it - the
              section did not exist. A page whose job is to be a place to put things cannot appear
              only after things have been put in it.
              
              So the heading is always here, and where there is nothing yet it carries the five
              kinds by name with a way into each. Not five empty boxes: she has already said these
              sections are bulky, and an empty box for each of five kinds is the bulkiest possible
              way to say "nothing here".
            */}
            {(isTheLead || theBuckets.some((b) => b.lines.length > 0)) && (
              <>
                <Section heading="Strategy, notes and how we work" note={isTheLead ? 'What you put here guides every check-in. You can change any line in it.' : `What ${theLeadMidSentence} put here guides the check-ins. It is never quoted as something anyone found.`} />
                {/*
                  A PLACE TO TYPE A LINE, BESIDE THE CONVERSATION RATHER THAN INSTEAD OF IT.

                  Item B: the page could change a line of what a check-in knows, share it, make it
                  private and retire it, and could not create one. Every line arrived through the
                  chat, so five empty buckets each said "say it in the conversation at the top" and
                  nothing on the page put anything anywhere.

                  MY FIRST FIX WAS DEAD CODE, AND IT WAS THE FAULT I HAVE BEEN FIXING ALL DAY. I
                  gated this on `!contextEnabled`, having read that as a per-check-in setting. It is
                  a global flag and it is on - her decision, "context is always enabled", with an env
                  var kept only to kill it in an emergency. So the form rendered for nobody. A
                  control that agrees with you and does nothing.

                  The conversation is still the better route and still the first one: the chips hand
                  it the sentence, because it asks the follow-up a form cannot. This is for the lead
                  who knows exactly what the line is and does not want a conversation about it.
                */}
                {isTheLead && (
                  <Panel>
                    <p className="gwui-panel-text-muted">
                      {theBuckets.some((b) => b.lines.length > 0)
                        ? 'Add a line. Every check-in is guided by what is here.'
                        : 'Nothing here yet. Put anything the check-ins should know in the right place, and every check-in is guided by it.'}
                    </p>
                    {/* One quiet link, then the five kinds: the prototype's Context screen shows no row of kinds to choose from. */}
                    <div className="gwui-mt-8">
                    {!addingALine && !typingInto && (
                      <button type="button" className="gwui-plain-link" onClick={() => setAddingALine(true)}>Add a line</button>
                    )}
                    {(addingALine || typingInto) && (
                      <Choices
                        label="Which kind of line"
                        value={typingInto ?? ''}
                        onChange={(kind) => { setTypingInto(typingInto === kind ? null : kind); setLineDraft('') }}
                        options={BUCKETS.map((b) => ({ key: b.kind, label: b.title, description: b.sub }))}
                      />
                    )}
                    </div>
                    {typingInto && (
                      <div className="gwui-mt-10">
                        <TextArea
                          autoFocus
                          rows={3}
                          maxLength={2000}
                          value={lineDraft}
                          onChange={(e) => setLineDraft(e.target.value)}
                          placeholder={THE_WAY_IN[typingInto] ?? ''}
                        />
                        <div className="gwui-button-row gwui-mt-8">
                          {/*
                            SECONDARY, NOT PRIMARY: at most one navy button per screen, and the
                            brief's own "Save" above is the page's one primary action. This and that
                            one can be open at the same time (the brief editor and this bucket
                            editor are independent state), so they are never "two branches of one
                            either/or" - a genuine second navy button, not a false positive.
                          */}
                          <Button
                            kind="secondary"
                            size="small"
                            onClick={() => addLine.mutate({ kind: typingInto, text: lineDraft })}
                            disabled={!lineDraft.trim() || addLine.isPending}
                          >
                            {addLine.isPending ? 'Saving…' : 'Everyone here reads this'}
                          </Button>
                          <Button kind="secondary" size="small" onClick={() => { setTypingInto(null); setLineDraft('') }}>
                            Cancel
                          </Button>
                          {/*
                            AND THE CONVERSATION, WHICH IS STILL THE BETTER ROUTE.

                            A typed line is one sentence with nothing around it. The chat can ask
                            what the figure rests on, who agreed it, and what happens if it slips -
                            which is why it is the way in and why this hands the half-written
                            sentence over rather than competing with it.
                          */}
                          {contextEnabled && (
                            <button
                              onClick={() => {
                                const typed = lineDraft.trim()
                                changeThisInTheChat(
                                  typed || (THE_WAY_IN[typingInto] ?? ''),
                                  typed ? `For ${groundLabel}: ${typed}` : `I want to add something to ${groundLabel}.`,
                                )
                                setTypingInto(null); setLineDraft('')
                              }}
                              className="gwui-plain-link"
                            >
                              {oldChatIsOpen ? 'Say it in the conversation instead' : `Tell ${askName} instead`}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </Panel>
                )}
                <div className="gwui-stack-10">
                  {theBuckets.filter((b) => b.lines.length > 0).map((b) => (
                    <Panel key={b.kind} pad={false}>
                      <div className="gwui-group-head">
                        <span className="gwui-fs-13 gwui-ink-dark"><strong>{b.title}</strong></span>
                        <Note>{b.sub}</Note>
                      </div>
                      <ShowAFew rows={b.lines} few={6} what={`lines under ${b.title.toLowerCase()}`}>
                      {(l: any) => (
                        <div key={l.id} className="gwui-panel-row gwui-line-row">
                          <span className="gwui-panel-text">{l.text}</span>
                          {l.audience !== 'EVERYONE' && (
                            <Tag tone="plain">Only you</Tag>
                          )}
                          {isTheLead && l.legacy && l.audience !== 'EVERYONE' && (
                            <Button kind="quiet" size="small" onClick={() => shareOlderNote.mutate(l.id)} disabled={shareOlderNote.isPending}>
                              Share with the team
                            </Button>
                          )}
                          {isTheLead && !l.legacy && (
                            <>
                              <Button
                                kind="quiet"
                                size="small"
                                onClick={() => changeLine.mutate({ itemId: l.id, audience: l.audience === 'EVERYONE' ? 'LEAD_ONLY' : 'EVERYONE' })}
                                disabled={changeLine.isPending}
                              >
                                {l.audience === 'EVERYONE' ? 'Make it yours only' : 'Share with the team'}
                              </Button>
                              {contextEnabled && (
                                <Button kind="quiet" size="small" onClick={() => changeThisInTheChat(`Change the line "${l.text}" to `, `I want to change the line "${l.text}" on ${groundLabel}.`)}>
                                  Change this
                                </Button>
                              )}
                              {/* Retired, not deleted: a decision that was made is not one that never existed. */}
                              <Button kind="quiet" size="small" onClick={() => changeLine.mutate({ itemId: l.id, closed: true })} disabled={changeLine.isPending}>
                                Done with it
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      </ShowAFew>
                    </Panel>
                  ))}
                </div>
              </>
            )}
    </>
  )

  if (only === 'what-moved-to-my-work') {
    return (
      <div data-gw-moved-to-my-work>
        {partD}
        {partPlan}
        {partF}
        {partH}
      </div>
    )
  }

  return (
    <div>
            {/*
              THE CONTEXT PAGE IS BANDS, IN ONE ORDER, AND THE ORDER IS THE ARGUMENT.
              
              It used to be a stack of boxes: an expectations panel, a strength card, an upload box,
              three textareas and a chat somewhere in the middle. Everything was present and nothing
              said how the parts related, so the page read as a form rather than as a record.
              
              The order answers questions in the order a person asks them:
                1  what is this check-in for            - you cannot judge the rest without it
                2  what is expected of each person      - the thing anybody is actually read against
                3  the material it all rests on         - files and references
                4  what only the lead sees              - steers the questions, never quoted
                5  the chat                             - where you go to change any of the above
              
              A band with nothing in it still renders its heading and says what would go there, because
              "nothing yet" is a fact about this check-in and a blank space is not.
            */}

            {/* The prototype's order: "From a plan", the conversation, then "Waiting for you to confirm". The lead's only. */}
            {!light && (
              <>
                {partA1}
                {partA2}
                {partA3}
                {partB}
                {partC}
                {partD}
                {partE}
                {partF}
                {partG}
                {partH}
                {partI}
                {partPlan}
              </>
            )}
            {/*
              THE LIGHT CONTEXT PAGE (docs/light-rebuild/sales-first.md, section 4; the light prototype's
              s56, s63 and the phone menu in s72), for a sales check-in: one page. What needs the lead first,
              then what this check-in is for, then (for a team member) her own part; everything else folds to
              one line with a fact from the record; then "Add context", which opens Ask. Every part is the same
              one drawn above, by the same code, with the same words and controls; only its place changes.
            */}
            {light && (
              <div className="gwui-ctx-light">
                {isTheLead && <WaitingForYouToConfirm groundId={id!} heading="Needs you" />}
                {partC}
                {partE}
                {!isLead && partF}
                <div>
                <Section heading="Everything else" note="Tap any line to see more" />
                <div className="gwui-folds">
                  {objectives.length > 0 && (
                    <FoldedLine name="Targets" fact={thePageAtAGlance.targets}>
                      <div className="gwui-ctx-same">{partD}</div>
                    </FoldedLine>
                  )}
                  {(isTheLead || theBuckets.some((b) => b.lines.length > 0)) && (
                    <FoldedLine name="How we work" fact={thePageAtAGlance.howWeWork}>{partI}</FoldedLine>
                  )}
                  {partPlan && (
                    <FoldedLine name="The plan, as agreed" fact={planAsAgreed.length === 1 ? '1 line agreed' : `${planAsAgreed.length} lines agreed`}>{thePlanRows}</FoldedLine>
                  )}
                  <FoldedLine name="Documents" fact={thePageAtAGlance.documents}>{partG}</FoldedLine>
                  {isLead && <FoldedLine name="Each person’s card" fact={thePageAtAGlance.people}>{partF}</FoldedLine>}
                  {(isTheLead || commitments.length > 0) && (
                    <FoldedLine name="What people are down as doing" fact={thePageAtAGlance.downAsDoing}>{partH}</FoldedLine>
                  )}
                </div>
                </div>
                <div className="gwui-ctx-actions">
                  {canAddContextWithAsk && (
                    <Button kind="secondary" onClick={() => showForCheckInSetup(id!)}>Add context</Button>
                  )}
                  {/* On a phone, the other ways to add sit behind one button (s72: "More ways to add"). */}
                  {isTheLead && (onAPhone
                    ? <SmallMenu label="More ways to add" align="left"><FromAPlan groundId={id!} /></SmallMenu>
                    : <FromAPlan groundId={id!} />)}
                </div>
                {partA3}
              </div>
            )}




            {/*
              "ONLY YOU SEE THIS" IS GONE AS A SECTION, AND ITS CONTENT DID NOT GO WITH IT.
              
              Hafsah, 22 September 2026: "the 'only you see this bit' shouldnt exist... the content
              needs to be parsed and paraphrased in sections." It was a band of raw blobs at the
              bottom of the page, drawn in red, which made the steers that shape every question in
              this check-in look like something to be ashamed of - and made them the hardest thing
              on the page to read.
              
              What the lead wrote is now lines in named buckets below, and a line about a person sits
              under that person in the band above, marked as theirs to see and nobody else's. Nothing
              is hidden from the lead and nothing about a person reaches anybody else.
            */}
            {/*
              THE THREE WRITE BOXES ARE GONE: the running log, the note everyone reads, and the
              private steer.
              
              Hafsah, 22 September 2026: "that section needs to go since you can all do everything
              from the context chat." They were three textareas and about nine hundred pixels of
              form, competing with the record for the page, and each one did something the
              conversation above already does better - it asks, it proposes, and it writes on a yes.
              A form that duplicates the conversation teaches people the conversation is optional.
              
              Nothing that was written through them is lost: every note already on a check-in is read
              back into the buckets below.
            */}

            {/*
              THE CONTEXT CHAT, AT THE FOOT OF THE PAGE.

              It sat in the middle, between the context-strength card and the upload box, as a single
              line of text - so asked where the chat on this page was, nobody could point at it. It is
              last now, and it is where you go to change anything above: you read what the check-in
              holds, then talk to it.
            */}

            {/*
              WHAT THIS CHECK-IN CAN TELL YOU, directly above the chat rather than between the bands.
              
              It is a read on what the page as a whole can and cannot answer, so it belongs after the
              things it is reading - and next to the one control that can do something about it. Sat
              between the expectations and the documents it broke the run of bands with a summary of
              things the reader had not seen yet.
            */}
              {/*
                "WHAT THIS CHECK-IN CAN TELL YOU" IS GONE. "This has to go."

                It listed what the check-in could answer and then five things it could not, each
                with the reason - no conditions named, no record of where this stood, no document
                shared. All true, and all of it landing on somebody who had come to the page to do
                one thing. It was rewritten twice: once to strip the green-promise-over-amber-
                counter treatment, once to say what its list was for. Neither made it wanted, which
                is the answer - a panel that has to keep being justified is a panel nobody asked
                for.

                Nothing it said is lost that anybody needs. What a check-in still needs is named
                where it can be acted on: the conversation below asks for exactly these things, in
                the order that matters, and now takes them. The read was the same list without the
                asking.
              */}
            {/*
              THE HONESTY LINE SURVIVES THE FLAG BEING OFF, because that is when it matters most.

              It lives inside ContextStrength, which is gated on CONTEXT_ENABLED - so with the flag
              off it vanished in exactly the state where a participant sees least: every document is
              private to its uploader whatever its column says, the lead genuinely holds more, and
              nothing on screen said so.
            */}
            {!contextEnabled && !isLead && (
              <Callout>{LEAD_HOLDS_MORE}</Callout>
            )}

            {/*
              THE CHAT IS AT THE TOP NOW, BECAUSE IT IS THE WAY IN.
              
              It was at the foot of the page - below seven bands, two of which were forms - and
              Hafsah, looking for it on 22 September 2026, scrolled past all of them: "the chat
              doesnt seem to flow like a conversation to help you with these things." A page where
              the only control is last reads as a document. The record is what you scroll THROUGH;
              the conversation is what you arrive at.
            */}
    </div>
  )
}

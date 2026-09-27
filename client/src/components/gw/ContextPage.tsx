import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { toast } from 'sonner'
import { personLabel, peopleLabels, firstNameOrLabel, atTheStart } from '@/lib/utils'
import { Sec } from '@/components/gw/kit'
import { scrollToId } from '@/lib/scroll-to'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { EachPerson } from '@/components/gw/EachPerson'
import { LEAD_HOLDS_MORE } from '@/components/gw/the-lead-holds-more'
import { ContextChat } from '@/components/gw/ContextChat'
import { TargetsBand } from '@/components/gw/TargetsBand'
import { AddADocument } from '@/components/gw/AddADocument'
import { SharedNote } from '@/components/gw/SharedNote'
import { DeliveredPanel } from '@/components/gw/DeliveredPanel'
import { WHAT_YOU_CAN_UPLOAD, UPLOAD_ACCEPT_ATTR } from '@/lib/what-you-can-upload'
import { whatIsOutstanding } from './where-a-promise-stands'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

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
}) {
  const id: string = ground.id
  const qc = useQueryClient()
  /** Whoever runs this check-in: its lead, or an admin of the organisation. */
  const isLead = role === 'lead' || role === 'admin'
  /** Its lead alone. See the note on `role` for why these are two questions. */
  const isTheLead = role === 'lead'
  const contextEnabled = (ground as any)?.contextEnabled === true
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
  const [lineDraft, setLineDraft] = useState('')
  const saveBrief = useMutation({
    mutationFn: (text: string) => groundsApi.update(id, { brief: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ground", id] })
      setBriefDraft(null)
      toast.success('Saved. Everyone in this check-in now reads this.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save - try again.'),
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Try again in a moment.'),
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save - what you typed is still here, try again.'),
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
  const BUCKETS: { kind: string; title: string; sub: string }[] = [
    { kind: 'STRATEGY', title: 'The strategy', sub: 'how we win work and what we lead with' },
    /* "as you wrote them" to the person who wrote them - item D. See the source lines below. */
    { kind: 'WAY_OF_WORKING', title: 'How we work', sub: isTheLead ? 'the rules, as you wrote them' : 'the rules, as the lead wrote them' },
    { kind: 'DECISION', title: 'Still to decide', sub: 'nobody has decided these yet' },
    { kind: 'UNSETTLED', title: 'Not settled', sub: 'not treated as fact or as a target' },
    { kind: 'NOTE', title: 'Notes', sub: 'kept because somebody said it' },
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
  const changeThisInTheChat = (said: string) => {
    window.dispatchEvent(new CustomEvent('gw:context-chat:say', { detail: said }))
    scrollToId('gw-context-chat')
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

  /**
   * THE NUMBER EACH BAND GETS, COUNTED AS THE PAGE IS DRAWN.
   *
   * Numbering them by hand went wrong twice in one day: first the numbers started at the third band,
   * then a band that only renders when it has content ("Only you see this") left a gap between 3 and
   * 5. A fixed number on a conditional section is a promise the page cannot keep, and a reader who
   * sees 3 then 5 reasonably concludes something failed to load.
   *
   * Called in render order, once per band that actually renders, so the sequence is always what a
   * person can see. It is a counter rather than a computed list because the conditions are spread
   * through the JSX and a list would be a second copy of them.
   */
  let bandsSoFar = 0
  const band = () => ++bandsSoFar


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
  /** Whose words the brief is, for everybody but the lead. */
  const theLeadsFirstName: string =
    atTheStart(firstNameOrLabel((ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR') ?? { partyType: 'INITIATOR' }))
  /*
   * WHOSE WORDS THEY ARE, SAID ONLY WHEN IT IS TRUE (U.7 review). "Your words, from setup." while the
   * text is the lead's own and nobody else has changed it; the name of whoever changed it, where the
   * server knows who; Groundwork, where it wrote the text people read from the lead's words.
   */
  const whoseWords: string | null = (() => {
    const changedBy = (ground as any).briefChangedBy as { firstName: string | null; isYou: boolean; isTheLead: boolean } | null | undefined
    const ownWords = (ground as any).briefIsTheLeadsOwnWords === true
    if (changedBy && !changedBy.isTheLead) {
      if (changedBy.isYou) return 'You changed this.'
      return changedBy.firstName ? `${changedBy.firstName} changed this.` : 'Someone else changed this.'
    }
    if (ownWords) {
      if (isTheLead) return changedBy ? 'Your words.' : 'Your words, from setup.'
      return changedBy ? `${theLeadsFirstName}\u2019s words.` : `${theLeadsFirstName}\u2019s words, from setup.`
    }
    if (isTheLead) return 'Groundwork wrote this from your words.'
    if (isLead && !changedBy) return `Groundwork wrote this from ${theLeadsFirstName}\u2019s words.`
    return null
  })()
  const objectives: any[] = (ground as any).objectives ?? []


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

            <div id="gw-context-chat">
              {/* The lead's own conversation about their own check-in. An admin reads the page. */}
              {contextEnabled && isTheLead && <ContextChat groundId={id!} />}
              {/* THIS IS SETUP, NOT THE CHECK-IN. Hafsah, 21 Sep 2026: she finished the context conversation on
                  her own ground and waited for the first report. Nothing here writes a report; check-ins do,
                  and hers was still "Not started" on the Sessions tab. Said once, under the conversation. */}
              {contextEnabled && isTheLead && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                  This conversation sets the context. It is not your check-in: the report is written from check-ins, and yours is on the{' '}
                  <a href={`/grounds/${id}?tab=chat`} style={{ color: 'var(--gw-navy)' }}>Check-in tab</a>.
                </div>
              )}
            </div>

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
            <Sec n={band()} title="What this check-in is for" />
            {whatEveryoneReads && (
              <div data-gw-brief style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px', marginBottom: objectives.length > 0 ? 8 : 6, maxWidth: 620 }}>
                <div style={{ fontSize: 14, color: 'var(--gw-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{'\u201C'}{whatEveryoneReads}{'\u201D'}</div>
                {/*
                  WHOSE WORDS, SAID TO WHOEVER IS READING. The prototype's sentence for the lead; the
                  lead's name for everybody else, never "the lead" to the lead's own face (item D on
                  the Context fix list, 23 September 2026).
                */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  <span data-gw-brief-whose style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                    {whoseWords ? `${whoseWords} ` : ''}This is what everyone in this check-in reads before they answer.
                  </span>
                  {isLead && briefDraft === null && (
                    <button
                      onClick={() => setBriefDraft(theBrief || whatEveryoneReads)}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Rewrite
                    </button>
                  )}
                </div>
                {/* The words it was written from, where they differ from what everyone reads. */}
                {isLead && theBrief && theBrief !== whatEveryoneReads && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ fontSize: 12, color: 'var(--gw-navy)', cursor: 'pointer' }}>{isTheLead && !((ground as any).briefChangedBy && !(ground as any).briefChangedBy.isTheLead) ? 'What you wrote' : 'The words this was written from'}</summary>
                    <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 6 }}>{theBrief}</div>
                  </details>
                )}
              </div>
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
              <div style={{ background: 'white', border: '1px dashed var(--gw-border)', borderRadius: 8, padding: '11px 13px', marginBottom: 6, maxWidth: 620 }}>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                  Nobody has said what this check-in is for yet. Whoever runs it can write a few
                  lines about what it is for and what they want from it. Everyone in this check-in
                  reads it before they answer.
                </div>
                {isLead && (
                  <button
                    onClick={() => setBriefDraft('')}
                    style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                  >
                    Write the brief
                  </button>
                )}
              </div>
            )}
            {isLead && briefDraft !== null && (
              <div style={{ background: 'white', border: '1px solid var(--gw-blue-b)', borderRadius: 8, padding: '11px 13px', marginBottom: 6, maxWidth: 620 }}>
                <textarea
                  className="gw-ta"
                  autoFocus
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="What this check-in is for, and what you want from it, in your own words."
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => saveBrief.mutate(briefDraft)}
                    disabled={saveBrief.isPending || briefDraft === theBrief}
                    style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: briefDraft === theBrief ? 0.4 : 1 }}
                  >
                    {saveBrief.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setBriefDraft(null)}
                    style={{ padding: '8px 12px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 12.5, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                  {theBrief && briefDraft.trim() === '' && (
                    <span style={{ fontSize: 11.5, color: 'var(--gw-amber-t)' }}>Saving it empty removes the brief.</span>
                  )}
                </div>
              </div>
            )}
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
                <Sec n={band()} title="Targets" />
                <TargetsBand
                  groundId={id}
                  targets={objectives}
                  participants={(ground.participants ?? []) as any[]}
                  viewerUserId={viewerUserId}
                  isTheLead={isTheLead}
                  numbersShared={(ground as any).whoSeesTargets === 'EVERYBODY'}
                  onChangeTarget={isTheLead && contextEnabled ? (o) => changeThisInTheChat(`Change the target "${o.name}" to `) : undefined}
                />
              </>
            ) : (
              !theBrief && (
                <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '13px 15px', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 6, maxWidth: 620 }}>
                  Nothing yet. Say what this is counted by in the conversation below and it lands here.
                </div>
              )
            )}

            {/*
              THE LEAD'S FRAMING, under what this is for and above the people. It is the sentence that
              tells everybody what the situation is, in the lead's own words, and it is never quotable.
            */}
            <SharedNote text={(ground.leadContextNotes ?? []).find((n: any) => n.audience === 'EVERYONE' && !n.participantId)?.text} leadName={personLabel(ground.participants?.find((p: any) => p.partyType === 'INITIATOR'))} />

            {/* 2 - PERSON BY PERSON */}
            {/*
              THE DESIGN NAMES THIS BAND DIFFERENTLY FOR EACH READER, and the difference is the
              point. A lead is reading a roster - "person by person". A participant is reading the
              one thing they are measured against, and "what is expected of you" is what they came
              for. One heading for both made the lead's page read like a form and the participant's
              read like somebody else's list.
            */}
            <Sec
              n={band()}
              /* Renamed 22 September 2026: "not sure the purpose of person by person". The band is a
                 card per person holding everything about them, so it is named after that. */
              title={isLead ? 'Each person' : 'Your part, and everybody else\u2019s'}
              src={isLead ? 'their numbers, their to-dos, what they owe a look at' : 'yours is open \u00b7 theirs are a click'}
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
              return (
                <div style={{
                  fontSize: 12.5, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)',
                  border: '1px solid var(--gw-amber-b-soft)', borderRadius: 8,
                  padding: '9px 12px', marginBottom: 10, lineHeight: 1.55,
                }}>
                  {line}
                </div>
              )
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
            <Sec n={band()} title="Documents" />
            {documentsAreNotOpenToYou && (
              <div data-gw-documents-not-open style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, maxWidth: 620 }}>
                Documents here are shared by the people in this check-in, so you cannot open them from here.
              </div>
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
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, background: 'var(--gw-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                {/*
                  THE WORDS HERE ARE THE WORDS ON THE CONTROL, which they were not: this sentence
                  explained "Open" and the button has always said "Everyone", so the one term the
                  reader was taught did not appear anywhere they could click. And the lead now has a
                  third answer, which a sentence naming two would quietly contradict.
                */}
                Everything you add starts private to you. If you choose <b>Everyone</b>, everyone in this check-in can read it. If you choose <b>Only you</b>, nobody else can open it.
                {isTheLead && <> If you choose <b>Whoever runs this check-in</b>, the person running it can read it, so it stays readable if someone else takes the check-in over from you.</>}
              </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 12, maxWidth: 720 }}>
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
              <div key={doc.id} data-gw-document={doc.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {doc.name}
                    {/*
                      A PHOTO READS AS A PHOTO. Her words: "they should see docs/photos/things to
                      upload". A thumbnail is not possible today and saying so is better than
                      pretending: an image is read into words at upload and the bytes are not kept,
                      so the list can say it is a photo and what the product saw in it, and a real
                      thumbnail waits until a file is stored as a file.
                    */}
                    {/^image\//.test((doc as any).mimeType ?? '') && (
                      <span style={{ marginLeft: 7, fontSize: 10.5, fontWeight: 600, letterSpacing: '.03em', padding: '1px 7px', borderRadius: 10, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)' }}>photo</span>
                    )}
                  </div>
                  {/* WHAT IT IS FOR, in the uploader's words, as the prototype's card has it ("Checks price
                      objections"). The server sends it to the uploader alone (usedFor). */}
                  {doc.usedFor && (
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginTop: 3 }}>{doc.usedFor}</div>
                  )}
                  {/*
                    WHAT GROUNDWORK TOOK FROM IT, FOLDED UNDER THE CARD (U.7 review).

                    The card is the prototype's: the file, what it is for, and who can read it. What
                    the read found ("Read from it", the numbers and dates it holds) was printed on the
                    card's face in pieces joined with colons and dashes. It is still here, one click
                    away, because a card that says a file was read and not what it gave is a file
                    locker. The words of the second part are the engine's (what-a-document-holds.ts);
                    asked to be full sentences in request 40.
                  */}
                  {((Array.isArray((doc as any).assessment?.suggests) && (doc as any).assessment.suggests.length > 0) || doc.theContextWeHave) && (
                    <details data-gw-document-took style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: 12, color: 'var(--gw-navy)', cursor: 'pointer' }}>What Groundwork took from it</summary>
                      {doc.uploadedAt && (
                        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 5 }}>Added on {whenItWas(doc.uploadedAt, 'day')}.</div>
                      )}
                      {Array.isArray((doc as any).assessment?.suggests) && (doc as any).assessment.suggests.length > 0 && (
                        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.5, marginTop: 5 }}>
                          {(doc as any).assessment.suggests.slice(0, 2).join(' ')}
                        </div>
                      )}
                      {doc.theContextWeHave && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {doc.theContextWeHave.replace(/^Here is the context we have from [^\n]*\n*/, '')}
                          {(doc.holds?.forOnePerson?.length || doc.holds?.forEverybody?.length) ? (
                            <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6 }}>
                              These are on the board and in the report, against the people who hold them.
                            </div>
                          ) : null}
                        </div>
                      )}
                    </details>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                      style={{
                        fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        padding: '3px 6px', borderRadius: 20,
                        border: `1px solid ${(doc as any).visibility === 'OPEN' ? '#A7D9CC' : 'var(--gw-border)'}`,
                        background: (doc as any).visibility === 'OPEN' ? '#DFF1EA' : 'var(--gw-bg)',
                        color: (doc as any).visibility === 'OPEN' ? 'var(--gw-green-t)' : 'var(--gw-sub)',
                      }}
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
                      style={{
                        fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        padding: '3px 9px', borderRadius: 20,
                        border: `1px solid ${(doc as any).visibility === 'OPEN' ? '#A7D9CC' : 'var(--gw-border)'}`,
                        background: (doc as any).visibility === 'OPEN' ? '#DFF1EA' : 'var(--gw-bg)',
                        color: (doc as any).visibility === 'OPEN' ? 'var(--gw-green-t)' : 'var(--gw-sub)',
                      }}
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
                    <button onClick={() => deleteDoc.mutate(doc.id)} style={{ fontSize: 12, color: 'var(--gw-red-t)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                  )}
                </div>
              </div>
            ))}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploadDoc.isPending) { e.preventDefault(); document.getElementById('ga-doc-upload')?.click() } }}
              style={{
                border: '1.5px dashed var(--gw-border)', borderRadius: 8,
                /* A card beside the documents, as the prototype draws "Add a document". */
                padding: '12px 14px',
                textAlign: 'left', background: 'var(--gw-bg)',
                /* A dropped file can take a moment. Without this the box looks untouched and
                   somebody presses it again, which is how two copies of one file get attached. */
                cursor: uploadDoc.isPending ? 'progress' : 'pointer',
                opacity: uploadDoc.isPending ? 0.6 : 1,
              }}
              onClick={() => { if (!uploadDoc.isPending) document.getElementById('ga-doc-upload')?.click() }}
              /* The formats, where somebody asks the question: while choosing a file. */
              title={WHAT_YOU_CAN_UPLOAD}
            >
              {/*
                LABELLED BY WHO READS IT, like the two note boxes below. The page had three inputs
                named by what they were - documents, notes, private context - when the only difference
                that matters to somebody deciding where to put something is who ends up reading it.
              */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 4 }}>
                {/*
                  THE HEADING FOLLOWS THE FLAG, LIKE THE SENTENCE UNDER IT.
                  
                  My first version read "private to you until you open it" in both states - and with
                  CONTEXT_ENABLED off there is no opening it, so it promised an action that does not
                  exist, directly above a sentence correctly saying the file reaches nobody. The same
                  contradiction this box was just fixed for, reintroduced one line higher.
                */}
                {uploadDoc.isPending
                  ? 'Uploading…'
                  : 'Add a document'}
              </div>
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
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 4 }}>
                {contextEnabled
                  ? 'It starts private to you. You choose who can read it.'
                  : 'It is private to you. It shapes your own questions and reaches nobody else.'}
              </div>
              {docs.length === 0 && (
                /* Left-aligned: it inherits the dropzone's centring otherwise, and a paragraph set
                   centred is harder to read than the same paragraph set flush. */
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6, marginTop: 6 }}>
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
                </div>
              )}
              <input type="file" id="ga-doc-upload" style={{ display: 'none' }} accept={UPLOAD_ACCEPT_ATTR}
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
            </div>
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
                <Sec n={band()} title="What people are down as doing" src="nobody is marked as having done it &middot; the check-ins ask" />
                {isTheLead && contextEnabled && commitments.length === 0 && (
                  <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '11px 13px', marginBottom: 14, maxWidth: 720, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    Nothing yet. Anything somebody says they will do in a check-in lands here on its
                    own. Something agreed on a call goes in by saying it in the conversation above.
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => changeThisInTheChat('On the call today, ')}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 20, padding: '5px 11px', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Something agreed on a call
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '4px 0', marginBottom: 14, maxWidth: 720 }}>
                  <ShowAFew rows={commitments} few={8} what="things people are down as doing">
                  {(c: any, i: number) => {
                    const p = c.participantId ? ground.participants.find((x: any) => x.id === c.participantId) : null
                    return (
                      <div key={c.id} style={{ padding: '9px 13px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-line)', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: c.participantId ? 'var(--gw-dark)' : 'var(--gw-amber-t)', minWidth: 120 }}>
                          {c.participantId ? (p && p.id === myParticipant?.id ? 'You' : atTheStart((p && labelsHere.get(p.id)) ?? 'a colleague')) : 'Nobody owns this'}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, minWidth: 200 }}>{c.text}</span>
                        {c.whenSaid && <span style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>{c.whenSaid}</span>}
                        {!c.explicit && <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>your words, not theirs</span>}
                      </div>
                    )
                  }}
                  </ShowAFew>
                </div>
              </>
            )}

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
                <Sec n={band()} title="Strategy, notes and how we work" src={isTheLead ? 'what you put here guides every check-in \u00b7 change any line in it' : 'the lead\u2019s framing, never quoted as a finding'} />
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
                  <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '11px 13px', marginBottom: 10, maxWidth: 720 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                      {theBuckets.some((b) => b.lines.length > 0)
                        ? 'Add a line. Every check-in is guided by what is here.'
                        : 'Nothing here yet. Put anything the check-ins should know in the right place, and every check-in is guided by it.'}
                    </div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                      {BUCKETS.map((b) => (
                        <button
                          key={b.kind}
                          onClick={() => { setTypingInto(typingInto === b.kind ? null : b.kind); setLineDraft('') }}
                          title={b.sub}
                          style={{
                            fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '5px 11px', cursor: 'pointer', fontFamily: 'inherit',
                            border: `1px solid ${typingInto === b.kind ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                            background: typingInto === b.kind ? 'var(--gw-blue-bg)' : 'var(--gw-bg)',
                            color: 'var(--gw-navy)',
                          }}
                        >
                          {b.title}
                        </button>
                      ))}
                    </div>
                    {typingInto && (
                      <div style={{ marginTop: 10 }}>
                        <textarea
                          className="gw-ta"
                          autoFocus
                          rows={3}
                          maxLength={2000}
                          value={lineDraft}
                          onChange={(e) => setLineDraft(e.target.value)}
                          placeholder={THE_WAY_IN[typingInto] ?? ''}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            onClick={() => addLine.mutate({ kind: typingInto, text: lineDraft })}
                            disabled={!lineDraft.trim() || addLine.isPending}
                            style={{ padding: '7px 13px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: lineDraft.trim() ? 1 : 0.4 }}
                          >
                            {addLine.isPending ? 'Saving\u2026' : 'Everyone here reads this'}
                          </button>
                          <button
                            onClick={() => { setTypingInto(null); setLineDraft('') }}
                            style={{ padding: '7px 12px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 12.5, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Cancel
                          </button>
                          {/*
                            AND THE CONVERSATION, WHICH IS STILL THE BETTER ROUTE.

                            A typed line is one sentence with nothing around it. The chat can ask
                            what the figure rests on, who agreed it, and what happens if it slips -
                            which is why it is the way in and why this hands the half-written
                            sentence over rather than competing with it.
                          */}
                          {contextEnabled && (
                            <button
                              onClick={() => { changeThisInTheChat(lineDraft.trim() || (THE_WAY_IN[typingInto] ?? '')); setTypingInto(null); setLineDraft('') }}
                              style={{ background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                            >
                              Say it in the conversation instead
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, maxWidth: 720 }}>
                  {theBuckets.filter((b) => b.lines.length > 0).map((b) => (
                    <div key={b.kind} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 13px 6px', background: 'var(--gw-bg)', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-dark)' }}>{b.title}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>{b.sub}</span>
                      </div>
                      <ShowAFew rows={b.lines} few={6} what={`lines under ${b.title.toLowerCase()}`}>
                      {(l: any, i: number) => (
                        <div key={l.id} style={{ padding: '9px 13px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-line)', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, minWidth: 220 }}>{l.text}</span>
                          {l.audience !== 'EVERYONE' && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.03em', padding: '1px 7px', borderRadius: 10, color: 'var(--gw-sub)', background: 'var(--gw-bg)', border: '1px solid var(--gw-border)' }}>only you</span>
                          )}
                          {isTheLead && l.legacy && l.audience !== 'EVERYONE' && (
                            <button
                              onClick={() => shareOlderNote.mutate(l.id)}
                              disabled={shareOlderNote.isPending}
                              style={{ fontSize: 11.5, color: 'var(--gw-sub)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Share with the team
                            </button>
                          )}
                          {isTheLead && !l.legacy && (
                            <>
                              <button
                                onClick={() => changeLine.mutate({ itemId: l.id, audience: l.audience === 'EVERYONE' ? 'LEAD_ONLY' : 'EVERYONE' })}
                                disabled={changeLine.isPending}
                                style={{ fontSize: 11.5, color: 'var(--gw-sub)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                {l.audience === 'EVERYONE' ? 'Make it yours only' : 'Share with the team'}
                              </button>
                              {contextEnabled && (
                                <button
                                  onClick={() => changeThisInTheChat(`Change the line "${l.text}" to `)}
                                  style={{ fontSize: 11.5, color: 'var(--gw-sub)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  Change this
                                </button>
                              )}
                              {/* Retired, not deleted: a decision that was made is not one that never existed. */}
                              <button
                                onClick={() => changeLine.mutate({ itemId: l.id, closed: true })}
                                disabled={changeLine.isPending}
                                style={{ fontSize: 11.5, color: 'var(--gw-sub)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Done with it
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      </ShowAFew>
                    </div>
                  ))}
                </div>
              </>
            )}

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
              <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                {LEAD_HOLDS_MORE}
              </div>
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

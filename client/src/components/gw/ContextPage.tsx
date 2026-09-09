import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { toast } from 'sonner'
import { personLabel } from '@/lib/utils'
import { Sec } from '@/components/gw/kit'
import { ExpectationsPanel } from '@/components/gw/ExpectationsPanel'
import { LEAD_HOLDS_MORE } from '@/components/gw/the-lead-holds-more'
import { ContextChat } from '@/components/gw/ContextChat'
import { SharedNote } from '@/components/gw/SharedNote'
import { DeliveredPanel } from '@/components/gw/DeliveredPanel'
import { WHAT_YOU_CAN_UPLOAD, UPLOAD_ACCEPT_ATTR } from '@/lib/what-you-can-upload'
import { whatIsOutstanding } from './where-a-promise-stands'

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

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documentsApi.list(id),
  })

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
  const [askingConsent, setAskingConsent] = useState<File | null>(null)

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
  const [askingWhatToLookFor, setAskingWhatToLookFor] = useState<{ file: File; consented: boolean } | null>(null)
  const [whatToLookFor, setWhatToLookFor] = useState('')

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
  const saveBrief = useMutation({
    mutationFn: (text: string) => groundsApi.update(id, { brief: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ground", id] })
      setBriefDraft(null)
      toast.success('Everyone here reads this now')
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
    onSuccess: (_res, { file }) => {
      toast.success(`Uploaded ${file.name}`)
      qc.invalidateQueries({ queryKey: ['docs', id] })
    },
    onError: (e: any) => {
      /*
       * The server refused because it recognised a conversation and nothing had been confirmed.
       * Ask, rather than reporting a failure at somebody who did nothing wrong.
       */
      const said = e?.response?.data?.message
      if (typeof said === 'string' && said.includes('record of a conversation')) return
      toast.error(said || 'Upload failed.')
    },
  })

  const setDocVisibility = useMutation({
    mutationFn: ({ docId, visibility }: { docId: string; visibility: 'OPEN' | 'OWN' | 'CLOSED' }) =>
      documentsApi.setVisibility(id, docId, visibility),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
    onError: () => toast.error('That did not change. It is still visible to the same people — try again.'),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => documentsApi.remove(id, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
  })

  const [ctxNote, setCtxNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const addNote = useMutation({
    mutationFn: (note: string) => groundsApi.update(id, { contextNote: note }),
    onSuccess: () => { setCtxNote(''); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('The note did not save. It is still in the box — try again.'),
  })

  /**
   * THE SHARED NOTE. Separate mutation from the private one on purpose: they differ in the single
   * most consequential way a piece of context can differ - who reads it - and a shared control with
   * a checkbox is how somebody publishes a private note by mistake.
   */
  const [sharedNoteText, setSharedNoteText] = useState('')
  const [sharedNoteSaved, setSharedNoteSaved] = useState(false)
  const addSharedNoteMut = useMutation({
    mutationFn: () => groundsApi.addLeadContext(id, { text: sharedNoteText.trim(), audience: 'EVERYONE' }),
    onSuccess: () => { setSharedNoteText(''); setSharedNoteSaved(true); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('The note did not save. It is still in the box — try again.'),
  })

  const [leadCtxText, setLeadCtxText] = useState('')
  const [leadCtxTarget, setLeadCtxTarget] = useState('')
  const [leadCtxSaved, setLeadCtxSaved] = useState(false)
  const addLeadContextMut = useMutation({
    mutationFn: () => groundsApi.addLeadContext(id, {
      participantId: leadCtxTarget || undefined,
      text: leadCtxText.trim(),
    }),
    onSuccess: () => { setLeadCtxText(''); setLeadCtxSaved(true); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('That did not save. Your text is still here — try again.'),
  })

  /**
   * IS THERE ANYTHING ON THIS PAGE YET? Used to decide whether the write boxes open by default,
   * which is only kind when the person would otherwise be looking at nothing.
   */
  /** The lead's own steers: private by audience, and never the shared framing note. */
  const privateSteers = (ground.leadContextNotes ?? []).filter(
    (n: any) => n.audience !== 'EVERYONE',
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
            <Sec
              n={band()}
              title="What this check-in is for"
              src={
                theBrief && objectives.length > 0 ? 'from setup, and the lead\u2019s own check-in'
                : theBrief ? 'from setup, in the lead\u2019s own words'
                : 'from the lead\u2019s own check-in'
              }
            />
            {theBrief && (
              <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px', marginBottom: objectives.length > 0 ? 8 : 6, maxWidth: 620 }}>
                <span style={{
                  display: 'inline-block', fontSize: 10.5, fontWeight: 600, letterSpacing: '.03em',
                  padding: '1px 7px', borderRadius: 10, marginBottom: 4,
                  color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)',
                }}>
                  the brief
                </span>
                <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{theBrief}</div>
                {isLead && briefDraft === null && (
                  <button
                    onClick={() => setBriefDraft(theBrief)}
                    style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                  >
                    Rewrite this
                  </button>
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
            {!theBrief && briefDraft === null && (
              <div style={{ background: 'white', border: '1px dashed var(--gw-border)', borderRadius: 8, padding: '11px 13px', marginBottom: 6, maxWidth: 620 }}>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                  Nobody has written a brief yet. It is a few lines from whoever runs this saying
                  what the check-in is for and what they want out of it, in their own words -
                  everybody here reads it before they answer.
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
                  placeholder="What this check-in is for, and what you want out of it. Everybody here reads this before they answer."
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => saveBrief.mutate(briefDraft)}
                    disabled={saveBrief.isPending || briefDraft === theBrief}
                    style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: briefDraft === theBrief ? 0.4 : 1 }}
                  >
                    {saveBrief.isPending ? 'Saving…' : 'Everyone here reads this'}
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
            {objectives.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
                {objectives.map((o: any) => (
                  <div key={o.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px' }}>
                    <span style={{
                      display: 'inline-block', fontSize: 10.5, fontWeight: 600, letterSpacing: '.03em',
                      padding: '1px 7px', borderRadius: 10, marginBottom: 4,
                      color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)',
                    }}>
                      {o.target == null ? 'goal' : 'target'}
                    </span>
                    <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.6 }}>{o.name}</div>
                    {o.target != null && (
                      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 3 }}>
                        how we&rsquo;d know: a number crosses a line &middot; target {o.target}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /*
                AN EMPTY BAND IS A LINE, NOT A CARD.

                This was a full bordered panel, so the first thing anybody met on the Context page
                was a box about absence, drawn with the same weight as the expectations below it. A
                band with nothing in it should still say what would go there - that has not changed -
                but it should not be the loudest thing on the page while it does.
              */
              /* Only when there is genuinely nothing - a brief alone is not nothing. */
              /*
               * THE SAME SHAPE AS EVERY OTHER "NOTHING YET" ON THIS PAGE.
               *
               * There were three of them in three shapes: bare grey text here, a bordered panel for
               * the expectations below, and a dashed drop-zone for documents. Same idea, three
               * weights, so the page looked like a pile of unrelated states rather than one thing
               * with sections that are not filled in.
               *
               * The bordered panel is the one that wins, because it is the one that reads as a slot
               * waiting for something rather than as an apology.
               */
              !theBrief && (
                <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '13px 15px', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 6, maxWidth: 620 }}>
                  Nothing yet. This comes out of the lead&rsquo;s own check-in.
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
              title={isLead ? 'Person by person' : 'What is expected of you'}
              src={isLead ? 'stated in your check-in, read by everyone' : 'you cannot change this here'}
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

            <ExpectationsPanel
              groundId={id}
              parties={(ground.participants ?? []) as any[]}
              viewerUserId={viewerUserId}
              hasChat={isTheLead && contextEnabled}
            />

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
            {askingConsent && (
              <div style={{
                border: '1px solid var(--gw-amber-b-soft)', background: 'var(--gw-amber-bg)',
                borderRadius: 10, padding: '14px 16px', marginBottom: 12,
              }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 4 }}>
                  Other people are in this
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10, maxWidth: 520 }}>
                  {askingConsent.name} looks like a record of a conversation. Confirm that the people
                  in it know conversations like this may be used to help your team work better - and
                  that you told them, rather than us. We cannot ask them ourselves.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setWhatToLookFor(''); setAskingWhatToLookFor({ file: askingConsent, consented: true }); setAskingConsent(null) }}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: 'var(--gw-navy)', color: 'white',
                    }}
                  >
                    They know - upload it
                  </button>
                  <button
                    onClick={() => setAskingConsent(null)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', background: 'white',
                      color: 'var(--gw-sub)', border: '1px solid var(--gw-border)',
                    }}
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )}

            {/*
              * NUMBERED IN THE ORDER THE PAGE ACTUALLY RUNS IN, WHICH IT WAS NOT.
              *
              * The numbers went on three of the five bands and started at the third one, so the page
              * read "What this check-in is for", "Person by person", then "1 DOCUMENTS". A number
              * that disagrees with the thing above it is worse than no number: it tells somebody
              * they have missed something.
              */}
            <Sec n={band()} title="Documents" src="each one says who reads it" />

            <div
              style={{
                border: '1.5px dashed var(--gw-border)', borderRadius: 8, padding: 20,
                textAlign: 'center', marginBottom: 16, background: 'var(--gw-bg)',
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
                  : 'Upload a file as proof or context for this check-in'}
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
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6, marginTop: 6, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
                {contextEnabled
                  ? 'It is private to you unless you decide to make it visible to everyone. Either way the check-in reads it, and says where it does not match what you have told it.'
                  : 'It is private to you. It shapes your own questions and reaches nobody else.'}
              </div>
              {docs.length === 0 && (
                /* Left-aligned: it inherits the dropzone's centring otherwise, and a paragraph set
                   centred is harder to read than the same paragraph set flush. */
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6, marginTop: 6, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
                  {/*
                    AND WHAT COUNTS, WHICH ONLY THE FIRST-TIME READER NEEDS.

                    Every example here used to be a document from BEFORE the work started, so people
                    uploaded a scope and stopped. The record of what was actually done or said -
                    meeting notes, a Gemini or other transcript, a photo of a whiteboard - is what a
                    check-in most wants to read, and it is already sitting in somebody's inbox.
                  */}
                  Proof or context for what has happened: meeting notes, a transcript from Gemini or
                  another notetaker, a photo of what was agreed - or the brief, plan or scope this
                  work was set against.
                </div>
              )}
              <input type="file" id="ga-doc-upload" style={{ display: 'none' }} accept={UPLOAD_ACCEPT_ATTR}
                onChange={e => {
                  const f = e.target.files?.[0]
                  /*
                   * ASKED BEFORE IT LEAVES THE DEVICE where the name says what it is. The server
                   * catches the rest by reading the shape, and that path opens the same question.
                   */
                  if (f) {
                    if (/transcript|recording|call notes|meeting notes|whatsapp|chat|conversation|gemini|minutes/i.test(f.name)) {
                      setAskingConsent(f)
                    } else {
                      setWhatToLookFor(''); setAskingWhatToLookFor({ file: f, consented: false })
                    }
                  }
                  e.target.value = ''
                }} />
            </div>

            {/*
              * WHAT TO LOOK FOR, ASKED ONCE, SKIPPABLE.
              *
              * The chat asks this as a file is attached and nothing here did, so a document arrived
              * with no idea what mattered about it. Skip is a real answer and sits first, because
              * most files need nothing said about them and a required box before an upload is a
              * reason not to upload.
              */}
            {askingWhatToLookFor && (
              <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, background: 'var(--gw-bg)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
                  {askingWhatToLookFor.file.name}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 9 }}>
                  Anything you want read out of this? One line is enough, and you can skip it.
                </div>
                <textarea
                  autoFocus
                  value={whatToLookFor}
                  onChange={e => setWhatToLookFor(e.target.value)}
                  placeholder="e.g. the hardware interface dates in section 4, not the rest of it"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 58, resize: 'none', padding: '8px 10px', fontSize: 12.5, lineHeight: 1.55, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none', marginBottom: 9 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      uploadDoc.mutate({ file: askingWhatToLookFor.file, consented: askingWhatToLookFor.consented })
                      setAskingWhatToLookFor(null)
                    }}
                    style={{ padding: '8px 14px', borderRadius: 7, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Skip and upload</button>
                  <button
                    type="button"
                    disabled={!whatToLookFor.trim()}
                    onClick={() => {
                      uploadDoc.mutate({ file: askingWhatToLookFor.file, consented: askingWhatToLookFor.consented, note: whatToLookFor })
                      setAskingWhatToLookFor(null)
                    }}
                    style={{ flex: 1, padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: whatToLookFor.trim() ? 'pointer' : 'not-allowed', opacity: whatToLookFor.trim() ? 1 : 0.5, fontFamily: 'inherit' }}
                  >Upload with this</button>
                </div>
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
                Everything you add starts private to you. <b>Everyone</b> means everyone in this check-in can read it, which is what the brief and the plan are for. <b>Only me</b> keeps it yours.
                {isLead && <> <b>Whoever runs this check-in</b> keeps it to that person, so it stays readable if somebody takes the check-in over from you.</>}
              </div>
            )}
            {docs.map(doc => (
              <div key={doc.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0, paddingRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  {/*
                    WHAT THE CHECK-IN TOOK FROM IT, WHICH IT HAS ALWAYS WORKED OUT AND NEVER SHOWN.

                    Every upload is read and assessed - two to four things the document suggests,
                    and what will be done with it - and the result has been stored on the row and
                    rendered by nothing since it was built. So the card was a filename, a date and
                    two controls: a file locker, which is not what this is. A person cannot tell
                    that the thing they uploaded was read at all, let alone that it is read against
                    what they say in the chat.

                    Two lines, not the whole assessment: the point is to show the document landed
                    and was understood, not to reprint it. The rest reaches them in the check-in,
                    which is where it can actually be compared with what they said.
                  */}
                  {Array.isArray((doc as any).assessment?.suggests) && (doc as any).assessment.suggests.length > 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.5, marginTop: 5 }}>
                      <span style={{ color: 'var(--gw-muted)' }}>Read from it: </span>
                      {(doc as any).assessment.suggests.slice(0, 2).join(' ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                      <option value="OWN">Only me</option>
                      {/* Named by who reads it, not by how private it feels, because "the person
                          running this check-in" is a chair rather than a person: it stays readable
                          if the lead changes or an org admin steps in. That is the whole of the
                          difference from "Only me" and the only thing worth saying on the row. */}
                      <option value="CLOSED">Whoever runs this check-in</option>
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
                      {(doc as any).visibility === 'OPEN' ? 'Everyone' : 'Only me'}
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


            {/*
              THE THREE WRITE BOXES, FOLDED AWAY.
              
              The design has no form for any of this: you say it in the chat and it lands on the page.
              These are how it is done today, and deleting them before the chat can write a shared note
              or a private steer would remove something people use to fix a page they cannot otherwise
              fix - so they are still here, one click down, rather than three textareas competing with
              the record for the top of the page.
              
              Open by default when there is nothing on the page yet, because that is the state where a
              person most needs a way in and the chat may not have reached them.
            */}
            {/*
              WHAT ONLY THE LEAD SEES, AS CONTENT RATHER THAN AS A FORM.

              These existed only as a list at the bottom of a collapsed "or write it yourself" block,
              underneath the textarea that makes them - so the steers already shaping every question
              in this check-in were the hardest thing on the page to find, and were invisible whenever
              the block was shut. In the design this is a band of its own, and each steer carries the
              promise that limits it.
            */}
            {isTheLead && privateSteers.length > 0 && (
              <>
                <Sec n={band()} title="Only you see this" src="steers what gets asked &middot; never quoted" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
                  {privateSteers.map((n: any) => {
                    const p = n.participantId ? ground.participants.find((x: any) => x.id === n.participantId) : null
                    return (
                      <div key={n.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                          {/* The limit travels with the steer. A note that shapes what somebody is
                              asked, sitting on a page with no statement of what it cannot do, is the
                              thing people are right to be afraid of. */}
                          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.03em', padding: '1px 7px', borderRadius: 10, color: 'var(--gw-red-t)', background: 'var(--gw-red-bg)', border: '1px solid var(--gw-red-b-soft)' }}>
                            never quoted
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gw-muted)' }}>
                            about {n.participantId ? personLabel(p) : 'the check-in'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>{n.text}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/*
              LEAD ONLY, ALL OF IT. These write the framing everybody reads and the private steer
              nobody but the lead sees; the API refuses them from anyone else, so rendering them to a
              participant would only ever be a form that fails on submit.
            */}
            {/*
              * THE DISCLOSURE IS GONE, AND WITH IT A NUMBERED SECTION THAT LIVED INSIDE IT.
              *
              * "Or write it yourself instead of saying it in the chat" was a summary floating between
              * the numbered bands, and folded inside it were the running log AND section five, "What
              * everyone here reads" - so the page counted 1, 2, 3 and then hid 5 behind a triangle.
              * Somebody looking for where to write the framing everybody reads had to guess that a
              * one-line disclosure was where a numbered section went.
              *
              * It was collapsed for a good reason - it used to open three textareas and nine hundred
              * pixels of form on a page that was already full - but the answer to "too much form" is
              * fewer boxes with clearer jobs, not the same boxes behind a door.
              *
              * THE TWO WRITE BANDS ARE NOT MERGED, and that is deliberate rather than unfinished.
              * They look identical and they are not: one appends to a running log of what changed,
              * the other is the lead's standing framing with an audience. Different stores, different
              * lifetimes. Making them one control would have meant dropping one of them on my own
              * judgement. What they needed was to stop looking the same, which is a line each.
              */}
            {isTheLead && (
            <div style={{ marginTop: 16 }}>
              <Sec n={band()} title="What has changed since setup" src="a running log &middot; everyone here reads it" />
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 8, maxWidth: 620 }}>
                Short entries, added as things move. Each one is dated and kept; nothing is replaced.
              </div>
              <div className="gw-fld">
                <textarea className="gw-ta" rows={3} value={ctxNote} onChange={e => { setCtxNote(e.target.value.slice(0, 500)); setNoteSaved(false) }} placeholder="Add a context note: changed scope, revised goal, new constraint…" maxLength={500} />
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'right', marginTop: 2 }}>{ctxNote.length}/500</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {/*
                  A DEAD BUTTON SAYS WHY IT IS DEAD.
                  
                  All three of these grey out on an empty box and gave no reason - so somebody who had
                  clicked into the wrong field, or typed only spaces, met a control that refused and
                  said nothing. The hover says what to do, and each says what happens after, because
                  the three differ in the one way that matters: who ends up reading it.
                */}
                <button onClick={() => { if (ctxNote.trim()) addNote.mutate(ctxNote.trim(), { onSuccess: () => setNoteSaved(true) }) }}
                  disabled={addNote.isPending || !ctxNote.trim()}
                  title={!ctxNote.trim() ? 'Write something first, then this adds it.' : undefined}
                  style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: ctxNote.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: ctxNote.trim() ? 1 : 0.5 }}>
                  {addNote.isPending ? 'Saving…' : 'Add note'}
                </button>
                {noteSaved && <span style={{ fontSize: 12, color: 'var(--gw-green-t)' }}>Saved</span>}
              </div>
              {(ground.contextNotes ?? []).map((n: any, i: number) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.6 }}>{n}</div>
              ))}
            </div>
            )}

            {/*
              LABELLED BY WHO READS IT, WHICH IS THE ONLY DIFFERENCE THAT MATTERS.
              
              The page had two near-identical textareas whose only real difference was the audience,
              and that difference lived in the small print above each rather than in the heading. So
              this one leads with the readership and the private one below leads with its promise.
            */}
            {isTheLead && (
              <div style={{ marginTop: 20 }}>
                <Sec n={band()} title="What everyone here reads" src="your framing, never quoted as a finding" />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>A note everyone here reads</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                  About the whole check-in, not about one person. Everyone sees it with your name on
                  it, and it is never quoted as a finding about anybody.
                </div>
                <div className="gw-fld">
                  <textarea className="gw-ta" rows={3} value={sharedNoteText}
                    onChange={e => { setSharedNoteText(e.target.value.slice(0, 4000)); setSharedNoteSaved(false) }}
                    placeholder="e.g. We are deciding whether to renew. Both accounts go to all three of us at the same time."
                    maxLength={4000} />
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'right', marginTop: 2 }}>{sharedNoteText.length}/4000</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <button onClick={() => { if (sharedNoteText.trim()) addSharedNoteMut.mutate() }}
                    disabled={addSharedNoteMut.isPending || !sharedNoteText.trim()}
                    title={!sharedNoteText.trim() ? 'Write something first, then everyone here can read it.' : undefined}
                    style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: sharedNoteText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: sharedNoteText.trim() ? 1 : 0.5 }}>
                    {addSharedNoteMut.isPending ? 'Saving…' : 'Share this with everyone'}
                  </button>
                  {sharedNoteSaved && <span style={{ fontSize: 12, color: 'var(--gw-green-t)' }}>Everyone here can read this now</span>}
                </div>

                {/*
                  THE LINE WHERE THE PAGE STOPS BEING SHARED.

                  "Put a line between the private steer section and everything above, so we say
                  everything below can't be seen by your team, only the items above."

                  Until here, every band on this page is read by everybody on the check-in - that
                  is the point of it. From here down it is the lead's alone. The two were separated
                  only by a heading in the same weight as every other heading, on a page whose
                  whole job is telling people who reads what.
                */}
                <div style={{ borderTop: '2px solid var(--gw-border)', marginTop: 26, paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-clay)', marginBottom: 4 }}>
                    From here down, only you
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    Everything above this line is read by everybody on this check-in. Nothing below
                    it is: not by them, and not by anybody else in your organisation.
                  </div>
                </div>

                {/* 4 - ONLY YOU SEE THIS. Steers what a session looks at; never quoted, never shown. */}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>A private steer, never quoted</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                  Only you ever read this. It decides what gets looked at first, and is never the
                  reason given for anything.
                </div>
                <div className="gw-fld">
                  {/* LABELLED. It sat above a textarea with no label of its own, so "About the
                      whole check-in" read as a statement about the page rather than as the current
                      value of a control you can change. */}
                  <label className="gw-label" htmlFor="ctx-audience">Who this is about</label>
                  <select id="ctx-audience" className="gw-input" value={leadCtxTarget} onChange={e => { setLeadCtxTarget(e.target.value); setLeadCtxSaved(false) }} style={{ marginBottom: 8 }}>
                    <option value="">About the whole check-in</option>
                    {ground.participants.map((p: any) => (
                      <option key={p.id} value={p.id}>About {personLabel(p)}</option>
                    ))}
                  </select>
                  <textarea className="gw-ta" rows={3} value={leadCtxText} onChange={e => { setLeadCtxText(e.target.value.slice(0, 4000)); setLeadCtxSaved(false) }} placeholder="e.g. Ben has been carrying the on-call rotation solo since March." maxLength={4000} />
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'right', marginTop: 2 }}>{leadCtxText.length}/4000</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <button onClick={() => { if (leadCtxText.trim()) addLeadContextMut.mutate() }}
                    disabled={addLeadContextMut.isPending || !leadCtxText.trim()}
                    title={!leadCtxText.trim() ? 'Write something first, then only you will see it.' : undefined}
                    style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: leadCtxText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: leadCtxText.trim() ? 1 : 0.5 }}>
                    {addLeadContextMut.isPending ? 'Saving…' : 'Add context'}
                  </button>
                  {leadCtxSaved && <span style={{ fontSize: 12, color: 'var(--gw-green-t)' }}>Saved</span>}
                </div>
              </div>
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

            <div id="gw-context-chat">
              {/* The lead's own conversation about their own check-in. An admin reads the page. */}
              {contextEnabled && isTheLead && <ContextChat groundId={id!} />}
            </div>
    </div>
  )
}

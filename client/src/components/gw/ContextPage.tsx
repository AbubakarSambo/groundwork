import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { toast } from 'sonner'
import { personLabel } from '@/lib/utils'
import { Sec } from '@/components/gw/kit'
import { scrollToId } from '@/lib/scroll-to'
import { EachPerson } from '@/components/gw/EachPerson'
import { LEAD_HOLDS_MORE } from '@/components/gw/the-lead-holds-more'
import { ContextChat } from '@/components/gw/ContextChat'
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
  /** The promise this upload is answering, where it was started from one. */
  const [attachingFor, setAttachingFor] = useState<string | null>(null)
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
    onSuccess: (res: any, { file }) => {
      toast.success(`Uploaded ${file.name}`)
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
    { kind: 'WAY_OF_WORKING', title: 'How we work', sub: 'the rules, as the lead wrote them' },
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
            {/*
              THIRTEEN TARGETS WERE THIRTEEN CARDS, AND EACH ONE REPEATED THE SAME SENTENCE.
              
              Hafsah, 22 September 2026, on a page holding a quarter's numbers: "i feel like the
              targets i see are not real targets and they can all be in one box... those sections are
              so bulky." Every card carried "how we'd know: a number crosses a line", which is true of
              every target ever set and told her nothing, and the team's numbers sat in the same
              stack as one person's, so nine rows read as nine things everybody was held to.
              
              One table. The team's first, then each person's under their name, and the figure in a
              column a reader can run their eye down.
            */}
            {objectives.length > 0 ? (
              <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8, maxWidth: 720 }}>
                {(() => {
                  const nameOf = (pid: string | null | undefined) =>
                    pid ? personLabel(ground.participants?.find((x: any) => x.id === pid)) : null
                  const theTeams = objectives.filter((o: any) => !o.ownerParticipantId)
                  const theirs = objectives.filter((o: any) => o.ownerParticipantId)
                  const groups: { who: string | null; rows: any[] }[] = []
                  if (theTeams.length) groups.push({ who: null, rows: theTeams })
                  for (const o of theirs) {
                    const who = nameOf(o.ownerParticipantId) ?? 'somebody'
                    const at = groups.find((g) => g.who === who)
                    if (at) at.rows.push(o); else groups.push({ who, rows: [o] })
                  }
                  return groups.map((g, gi) => (
                    <div key={g.who ?? 'team'}>
                      <div style={{ padding: '7px 13px 5px', background: 'var(--gw-bg)', borderTop: gi === 0 ? 'none' : '1px solid var(--gw-border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--gw-sub)' }}>
                        {g.who ?? 'The whole check-in'}
                      </div>
                      {g.rows.map((o: any, i: number) => (
                        <div key={o.id} style={{ padding: '8px 13px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-line)' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)', minWidth: 140 }}>{o.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)', fontVariantNumeric: 'tabular-nums' }}>
                              {o.target == null ? <span style={{ fontWeight: 400, color: 'var(--gw-muted)', fontSize: 12 }}>no number set</span> : o.target.toLocaleString('en-GB')}
                            </span>
                            {isTheLead && contextEnabled && (
                              <button
                                onClick={() => changeThisInTheChat(`Change the target "${o.name}" to `)}
                                style={{ fontSize: 11.5, color: 'var(--gw-sub)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Change this
                              </button>
                            )}
                          </div>
                          {/* A NUMBER NOBODY HAS DEFINED IS NOT AN AGREED NUMBER, said beside the number
                              rather than a page away. The lead's own sentence, from what they wrote. */}
                          {o.notSettled && (
                            <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', marginTop: 4, lineHeight: 1.5, maxWidth: '62ch' }}>{o.notSettled}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                })()}
              </div>
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
                   * NOTHING IS ASKED BEFORE IT LEAVES THE DEVICE. This used to stop a file whose name said
                   * "transcript" and ask first. The server recognises a record of a conversation by its
                   * shape, keeps it, and says the assumption back (see the upload's onSuccess) - so the
                   * one question left to ask here is what to look for in it.
                   */
                  if (f) {
                    /* Prefilled with what they said they would show, where that is why they are here. */
                    setWhatToLookFor(attachingFor ?? ''); setAskingWhatToLookFor({ file: f, consented: false })
                    setAttachingFor(null)
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
            {/*
              GROUPED BY WHO READS THEM, which is the only decision anybody makes about a file.
              
              It was one flat list where a brief the whole team works from sat between two private
              uploads, and the only way to tell them apart was to read the control on the right of
              each row. Somebody scanning for "what are we all working from" had to read every line.
              The rows themselves are unchanged - same controls, same rules about who may set what.
            */}
            {(docs.length > 1 ? [
              { title: 'Everyone here reads these', rows: docs.filter((d: any) => d.visibility === 'OPEN') },
              { title: isLead ? 'Not shared: yours, and each person\u2019s own' : 'Not shared: yours', rows: docs.filter((d: any) => d.visibility !== 'OPEN') },
            ] : [{ title: '', rows: docs }]).filter(g => g.rows.length).map(group => (
            <div key={group.title || 'all'} style={{ marginBottom: 10 }}>
            {group.title && (
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--gw-muted)', marginBottom: 5 }}>{group.title}</div>
            )}
            {group.rows.map((doc: any) => (
              <div key={doc.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0, paddingRight: 12 }}>
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
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{whenItWas(doc.uploadedAt, 'day')}</div>
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
                  {/*
                    AND THE NUMBERS IT HOLDS, WHOSE THEY ARE, AND THE DATES - the same words the chat
                    says, from the same read (the API's what-a-document-holds). Hafsah, 22 Sep 2026:
                    "context tab as well as the reports and board. It can pull the targets." A card
                    that says a file was read and not what it gave is the locker this page is not.
                  */}
                  {doc.theContextWeHave && (
                    <div style={{ marginTop: 8, background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gw-navy)', fontWeight: 700 }}>The context we have from it</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 4 }}>
                        {doc.theContextWeHave.replace(/^Here is the context we have from [^\n]*\n*/, '')}
                      </div>
                      {(doc.holds?.forOnePerson?.length || doc.holds?.forEverybody?.length) ? (
                        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6 }}>
                          These are on the board and in the report, against the people who hold them.
                        </div>
                      ) : null}
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
            </div>
            ))}


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
            {commitments.length > 0 && (
              <>
                <Sec n={band()} title="What people are down as doing" src="nobody is marked as having done it &middot; the check-ins ask" />
                <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '4px 0', marginBottom: 14, maxWidth: 720 }}>
                  {commitments.map((c: any, i: number) => {
                    const p = c.participantId ? ground.participants.find((x: any) => x.id === c.participantId) : null
                    return (
                      <div key={c.id} style={{ padding: '9px 13px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-line)', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: c.participantId ? 'var(--gw-dark)' : 'var(--gw-amber-t)', minWidth: 120 }}>
                          {c.participantId ? personLabel(p) : 'nobody owns this'}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, minWidth: 200 }}>{c.text}</span>
                        {c.whenSaid && <span style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>{c.whenSaid}</span>}
                        {!c.explicit && <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>your words, not theirs</span>}
                      </div>
                    )
                  })}
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
            {theBuckets.some((b) => b.lines.length > 0) && (
              <>
                <Sec n={band()} title="What we know" src={isTheLead ? 'from the conversation \u00b7 change any line in it' : 'the lead\u2019s framing, never quoted as a finding'} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, maxWidth: 720 }}>
                  {theBuckets.filter((b) => b.lines.length > 0).map((b) => (
                    <div key={b.kind} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 13px 6px', background: 'var(--gw-bg)', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-dark)' }}>{b.title}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>{b.sub}</span>
                      </div>
                      {b.lines.map((l: any, i: number) => (
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
                      ))}
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

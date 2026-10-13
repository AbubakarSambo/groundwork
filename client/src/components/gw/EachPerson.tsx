/**
 * ONE CARD PER PERSON, AND EVERYTHING ABOUT THEM IS IN IT.
 *
 * Hafsah, 22 September 2026: "Not sure the purpose of person by person." Fair: it rendered one card
 * per EXPECTATION, so a lead read a stack of sentences with names on them and a participant read one
 * sentence about themselves. Everything else about a person - their targets, the things they are
 * down to do, what they were asked to show, the files they attached - was in three other bands or on
 * another page entirely.
 *
 * So: one row per person, collapsed to a line that says what they hold, opening to the whole of it.
 * It is the only place on the page anything about a person appears.
 *
 * WHAT IS NOT HERE. The lead's own read of somebody, and the questions they want asked. Those were
 * on this card for about an hour on 22 September and her instruction was to take them off: they live
 * in the conversation, which is where the lead writes them, and in that person's own check-in as a
 * place to look. Never on a page beside their name.
 *
 * WHO CAN CHANGE WHAT. A to-do's state is set by the person it belongs to and by nobody else -
 * including the lead, who cannot mark somebody else's work done. A lead changes what is EXPECTED,
 * and does it in the conversation, because a change has a reason and a form does not take one.
 */
import { TheLeadsNote } from '@/components/gw/TheLeadsNote'
import { useState } from 'react'
import { peopleLabels, atTheStart } from '@/lib/utils'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { ExpectationsPanel } from '@/components/gw/ExpectationsPanel'
import { Folded } from '@/components/gw/ui'

export interface APersonOnTheCard {
  id: string
  userId?: string | null
  roleAsDescribed?: string | null
  managingOnly?: boolean
  email?: string | null
  nameGiven?: string | null
  user?: { firstName?: string | null; lastName?: string | null } | null
  /** Their expectations, as the ground payload sends them. */
  objective?: { text?: string | null; all?: any[] } | null
}

export interface ATargetOnTheCard {
  id: string
  name: string
  target: number | null
  ownerParticipantId?: string | null
  notSettled?: string | null
}

export interface AToDoOnTheCard {
  id: string
  participantId: string | null
  text: string
  whenSaid?: string | null
  explicit?: boolean
  status?: string
}

export interface AFileOnTheCard {
  id: string
  /** The list serves `name`; `fileName` is kept for callers that pass it. */
  fileName?: string
  name?: string
  participantId?: string | null
  visibility?: string
  mine?: boolean
}

/** What somebody said they would show, and has not attached yet. */
export interface AnAskOnTheCard {
  id: string
  /** What was asked for, in the words it was asked in. */
  what: string
  /** Where it was asked, for a person who has forgotten the conversation. */
  askedIn?: string | null
}

const line = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function EachPerson({
  groundId,
  people,
  targets,
  toDos,
  files,
  asks,
  viewerUserId,
  isLead,
  isTheLead = false,
  leadFirstName = null,
  groundLabel = 'this check-in',
  oldChatIsOpen = true,
  askName = 'Ask Groundwork',
  onChangeInChat,
  onUploadFor,
  onSetToDo,
}: {
  groundId: string
  people: APersonOnTheCard[]
  targets: ATargetOnTheCard[]
  toDos: AToDoOnTheCard[]
  files: AFileOnTheCard[]
  /** What each person said they would show. Keyed by participant id. */
  asks: Record<string, AnAskOnTheCard[]>
  viewerUserId?: string | null
  isLead: boolean
  /** The check-in's own lead, not an admin reading it. Only the lead reads their own notes. */
  isTheLead?: boolean
  /** The lead's first name, so nobody but the lead reads "your" about the lead's own things. */
  leadFirstName?: string | null
  /** This check-in's own name, said to Ask so it knows which one (B-082). */
  groundLabel?: string
  /** Whether the old context chat is still drawn below this page (B-082). */
  oldChatIsOpen?: boolean
  /** What Ask is called for this organisation, read before its own panel has opened. */
  askName?: string
  /** The lead changes what is expected of somebody in the conversation, or, once that chat is gone, by asking Ask. */
  onChangeInChat?: (said: string, askSaid: string) => void
  /** A person attaching the thing they said they would show. */
  onUploadFor?: (participantId: string, ask?: AnAskOnTheCard) => void
  /** Their own to-do, moved by them. */
  onSetToDo?: (id: string, status: 'DONE' | 'NOT_DONE' | 'DROPPED') => void
}) {
  /*
   * COLLAPSED BY DEFAULT, AND THAT IS ABOUT A HUNDRED PEOPLE RATHER THAN ABOUT TIDINESS.
   *
   * "This platform may fail at a 100 people org." A page that draws every person's whole record is a
   * page nobody can read at ten and nothing can render at a hundred. Your own row opens, because
   * that is the one you came for.
   */
  const mine = people.find((p) => !!viewerUserId && p.userId === viewerUserId)
  const [open, setOpen] = useState<Record<string, boolean>>(mine ? { [mine.id]: true } : {})

  const rows = people.filter((p) => !p.managingOnly)
  if (!rows.length) return null

  /* Your own row first, then a few, then the count - at a hundred people a stack of cards is a wall
     however small each card is. See a-long-list-is-not-a-page. */
  const inOrder = mine ? [mine, ...rows.filter((p) => p.id !== mine.id)] : rows
  /* Never the lead's note as the name (request 36): two people with no name are "one colleague" and
     "another colleague", and you are "You". */
  const labels = peopleLabels(rows as any[], { forTheLead: true, readerId: mine?.id ?? null })
  const labelOf = (p: APersonOnTheCard) => labels.get(p.id) ?? 'a colleague'
  /* "Wanjiru’s", never "the lead’s" and never "your" to an admin reading the page (U.7 review). */
  const leadsOwn = leadFirstName ? `${leadFirstName}\u2019s` : 'the lead\u2019s'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
      <ShowAFew rows={inOrder} few={8} what="people">
      {(p) => {
        const isMe = !!viewerUserId && p.userId === viewerUserId
        const theirs = (p.objective?.all ?? []).filter((o: any) => o?.text?.trim())
        const theirTargets = targets.filter((t) => t.ownerParticipantId === p.id)
        const theirToDos = toDos.filter((t) => t.participantId === p.id && (t.status ?? 'UNKNOWN') === 'UNKNOWN')
        /* Whose file it is, as the list serves it: theirs by id, or the reader's own by `mine` (night quality run 1). */
        const theirFiles = files.filter((f) => f.participantId === p.id || (f.participantId == null && f.mine === true && p.userId === viewerUserId))
        const theirAsks = asks[p.id] ?? []
        const isOpen = !!open[p.id]
        /* The one line somebody reads when they are not opening it. Counts, never a verdict. */
        const summary = [
          theirs.length ? line(theirs.length, 'expectation') : null,
          theirTargets.length ? line(theirTargets.length, 'target') : null,
          theirToDos.length ? line(theirToDos.length, 'to-do') : null,
          theirAsks.length ? `${line(theirAsks.length, 'thing')} to show` : null,
          theirFiles.length ? line(theirFiles.length, 'file') : null,
        ].filter(Boolean).join(', ') || 'Nothing on record yet'

        return (
          /*
            THE FOLD ITSELF IS THE SHARED `Folded` PART, NOT A BESPOKE BUTTON (Hafsah, 30 September,
            the button rules: "something that only opens or closes a section is the shared Folded
            part"). `Folded` draws the arrow itself (CSS `::before` on its summary, pointing right
            closed and down open) and is a `<details>`/`<summary>`, not a `<button>` or `<a>`, so it
            is never counted by the two-button-rules test either way - the arrow and the "Open"/
            "Hide" word this used to carry are gone with the bespoke button, same as every other
            `Folded` row in the app (e.g. "Who reports to whom") carries neither.

            CONTROLLED, not the plain uncontrolled disclosure most `Folded` callers use: a closed
            row's whole body - the expectation, numbers, to-dos, asks and files - must stay OUT of
            the DOM while shut, exactly as the previous `{isOpen && (...)}` kept it, not merely
            hidden by the browser's own `<details>` styling. See the note on `Folded`'s own `open`/
            `onToggle` props.
          */
          <Folded
            key={p.id}
            summary={isMe ? 'You' : atTheStart(labelOf(p))}
            open={isOpen}
            onToggle={(next) => setOpen((o) => ({ ...o, [p.id]: next }))}
            note={(
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* The lead's own note, beside the name and never as it. The server sends it only to
                    the check-in's lead, and this card says "Your note" only to the lead as well: an
                    admin reading the page did not write it (U.7 review).

                    GROUP 3'S REVIEW, THE SCREEN'S OWN SENTENCES 7: TWO SENTENCES, NOT ONE RUN-ON
                    WORD. These sat as two inline spans with nothing between them, so the lead's
                    note ran straight into the summary with no space - "I sell fridges in
                    KilimaniNothing on record yet." A column, not a row, puts each on its own line. */}
                {isTheLead && p.roleAsDescribed && <TheLeadsNote role={p.roleAsDescribed} />}
                <span>{summary}</span>
              </div>
            )}
          >
            {(
              <div style={{ padding: '2px 0 0' }}>
                {/* WHAT THEIR CHECK-IN IS ABOUT FOR THEM: the expectation, in the lead's words, and
                    whether the person has seen it. Never editable here - see the note at the top. */}
                <Part title={isMe ? 'What is expected of you' : 'What is expected of them'}>
                  {/*
                    THE EXPECTATION ITSELF IS STILL RENDERED BY ExpectationsPanel, scoped to this one
                    person and drawn bare. It was kept rather than rewritten because of what it does
                    besides printing the sentence: whether this matches what they said doing well
                    looks like, whether the lead says they have been told, a tracked expectation's
                    link and how stale the state we last read is, and marking an expectation seen the
                    moment the person it is about looks at it.
                  */}
                  {theirs.length
                    ? <ExpectationsPanel groundId={groundId} parties={[p as any]} viewerUserId={viewerUserId} hasChat={false} viewerIsLead={isLead} bare />
                    : (
                      /*
                        "THE LEAD" SAID TO THE LEAD.

                        Hafsah, 23 September 2026, reading her own check-in: "why would you say it
                        comes from the lead's own check-in when I am actually the lead, why can't it
                        say your own check-in." `isLead` was already in scope one line below, used
                        to decide whether to offer the chat link.

                        "A MEMBER HAS NO CONVERSATION ON THIS PAGE" (Esther, live re-walk, fault 3a).
                        "...or from the conversation on this page." named a half this screen only
                        ever gives the check-in's own lead - a member reading her own context tab,
                        or an admin reading someone else's, has no conversation here to point at
                        (the chat link just below, `onChangeInChat`, is itself only ever passed for
                        `isTheLead`, never for an admin whom `isLead` alone would also cover), and
                        read a sentence naming something that was never true for her. Only the
                        check-in's own lead, who does have it, reads that second half now.
                      */
                      <Empty>
                        {isTheLead
                          ? (oldChatIsOpen
                            ? <>Nothing yet. It comes from your own check-in, or from the conversation on this page.</>
                            : <>Nothing yet. It comes from your own check-in, or from telling {askName}.</>)
                          : <>Nothing yet. It comes from {leadsOwn} own check-in.</>}
                      </Empty>
                    )}
                  {/* THIS ONLY GOES ELSEWHERE (Hafsah, 30 September, the button rules): it hands the
                      change to the conversation rather than doing anything itself, so it is a quiet
                      text link, `.gwui-plain-link`, not a button. B-082: once the old chat is gone,
                      the same link asks Ask the whole question instead of filling a box nobody can see. */}
                  {isLead && onChangeInChat && (
                    /*
                      B-116: ON HER OWN CARD, THE FILLED LINE MUST SPEAK AS HER. The lead can also be
                      a participant on her own check-in (isMe true here), and `labelOf(p)` always
                      gives her real name - there is no "you" form of it (see the "You" summary
                      above, handled as its own special case). Filling the chat with "Change what I
                      expect of Tendai Moyo to " read as if she were talking about somebody else.
                      Worded for the reader instead, same as every other "you"/"your" branch on this
                      card: "myself" in what she types, "me" in the sentence handed to Ask.
                    */
                    <QuietLink onClick={() => onChangeInChat(
                      isMe ? 'Change what I expect of myself to ' : `Change what I expect of ${labelOf(p)} to `,
                      isMe ? `I want to change what ${groundLabel} expects of me.` : `I want to change what ${groundLabel} expects of ${labelOf(p)}.`,
                    )}>Change this in the chat</QuietLink>
                  )}
                </Part>

                <Part title={isMe ? 'Your numbers' : 'Their numbers'}>
                  {theirTargets.length ? theirTargets.map((t) => (
                    <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)' }}>{t.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)', fontVariantNumeric: 'tabular-nums' }}>
                        {t.target == null ? <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--gw-muted)' }}>no number</span> : t.target.toLocaleString('en-GB')}
                      </span>
                    </div>
                  )) : <Empty>{isMe
                    ? 'You have no number of your own. Your check-in asks against the team\u2019s.'
                    : `${atTheStart(labelOf(p))} has no number of their own, so their check-in asks against the team\u2019s.`}</Empty>}
                </Part>

                {/* THEIR TO-DOS, MOVED BY THEM. A lead cannot mark somebody else's work done. */}
                <Part title={isMe ? 'Your to-dos' : 'What they are down as doing'}>
                  {theirToDos.length ? theirToDos.map((t) => (
                    <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.5, minWidth: 180 }}>{t.text}</span>
                      {t.whenSaid && <span style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>{t.whenSaid}</span>}
                      {/*
                        WHOSE WORDS, TO WHOEVER IS READING - and the commitments band two bands
                        below already said "your words, not theirs" about the same fact, so the page
                        named the lead in the third person and in the second within one scroll.
                      */}
                      {!t.explicit && (
                        <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>
                          {isTheLead ? 'These are your words, not theirs.' : isMe ? `These are ${leadsOwn} words, not yours.` : `These are ${leadsOwn} words, not theirs.`}
                        </span>
                      )}
                      {/* A PAIR OF CHOICES ON THE ROW (Hafsah, 30 September, the button rules): "Done"
                          or "Not doing it" is a quiet text link pair, not two buttons - it marks the
                          to-do's own state, which is a different action from the row's "Attach it"
                          below (that sends something; this only says what already happened). */}
                      {isMe && onSetToDo && (
                        <span style={{ display: 'flex', gap: 8 }}>
                          <QuietLink onClick={() => onSetToDo(t.id, 'DONE')}>Done</QuietLink>
                          <QuietLink onClick={() => onSetToDo(t.id, 'DROPPED')}>Not doing it</QuietLink>
                        </span>
                      )}
                    </div>
                  )) : <Empty>Nothing on record. What somebody says they will do in a check-in lands here.</Empty>}
                </Part>

                {/*
                  WHAT THEY SAID THEY WOULD SHOW, WITH THE UPLOAD ON THE LINE.
                  
                  Her words: "It is also a place for participants to upload docs they agreed they
                  would share in the chat... if they are asked for evidence or context." A dashed box
                  at the bottom of the page that says nothing about what was asked is not that.
                */}
                {(theirAsks.length > 0 || isMe) && (
                  <Part title={isMe ? 'What you said you would show' : 'What they said they would show'}>
                    {theirAsks.length ? theirAsks.map((a) => (
                      <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.5, minWidth: 180 }}>{a.what}</span>
                        {a.askedIn && <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>{a.askedIn}</span>}
                        {isMe && onUploadFor && <Small onClick={() => onUploadFor(p.id, a)}>Attach it</Small>}
                      </div>
                    )) : <Empty>Nothing outstanding. When a check-in asks you for something in writing, it appears here.</Empty>}
                  </Part>
                )}

                <Part title={isMe ? 'Your files' : 'Their files'}>
                  {theirFiles.length ? theirFiles.map((f) => (
                    <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--gw-text)', minWidth: 160 }}>{f.fileName ?? f.name}</span>
                      <span style={{ fontSize: 11.5, color: f.visibility === 'OPEN' ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
                        {f.visibility === 'OPEN'
                          ? 'Everyone in this check-in can read it.'
                          : f.visibility === 'CLOSED' ? 'Whoever runs this check-in can read it.' : 'Only you can read it.'}
                      </span>
                    </div>
                  )) : <Empty>{isMe ? 'Nothing attached yet.' : 'Nothing attached.'}</Empty>}
                  {isMe && onUploadFor && <Small onClick={() => onUploadFor(p.id)}>Attach something</Small>}
                </Part>
              </div>
            )}
          </Folded>
        )
      }}
      </ShowAFew>
    </div>
  )
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid var(--gw-line)', paddingTop: 8, marginTop: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--gw-muted)', marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', lineHeight: 1.55 }}>{children}</div>
}

/*
 * "ATTACH IT" AND "ATTACH SOMETHING" STAY BUTTONS (Hafsah, 30 September, the button rules:
 * "something that sends or changes something stays a button"). Uploading the thing somebody said
 * they would show is not navigation and not a row's own two-way state - it sends a file - so it
 * keeps its own `<button>`, drawn quietly rather than as a heavy primary control.
 */
function Small({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="gwui-tap-40"
      style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
    >
      {children}
    </button>
  )
}

/** A plain text link that still does something rather than going somewhere - `.gwui-plain-link`,
    CLAUDE.md's own name for this shape - for "Change this in the chat" and a to-do's own "Done" /
    "Not doing it" pair: neither sends anything itself, so neither competes with the page's one real
    primary button the way a boxed button would. */
function QuietLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="gwui-plain-link">
      {children}
    </button>
  )
}

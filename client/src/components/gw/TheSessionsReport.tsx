import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { Sec } from './kit'
import { WhatSuccessLooksLike } from './WhatSuccessLooksLike'

/**
 * ONE SESSION'S SHARED REPORT, IN THE SHAPE WE PROMISED A CLIENT.
 *
 * "I need the forming sessions report(s) to take the same shape we promised the client for each
 * session - specificity, alignment, etc."
 *
 * The same headings every session, in the order the promise makes them, whether it is session one
 * or session nine and whether the round is still open or closed. A section with nothing in it says
 * why rather than disappearing - a heading that comes and goes teaches a client that the product
 * is inconsistent, and "nobody named a risk this session" is itself a finding.
 *
 * Everything here is assembled server-side from what people actually said, typed at extraction.
 * Nothing on this screen was asked of a model.
 */
/**
 * THE THREE THINGS A SESSION REPORT ANSWERS, and which of the promised sections belong to each.
 *
 * The order inside each group is the promise's own order; the grouping is what stops eight
 * headings competing. A group with nothing in it does not render, which can only happen if the
 * assembled shape changes - the server always returns all seven.
 */
const THE_THREE_GROUPS: { heading: string; titles: string[] }[] = [
  { heading: 'What people said this session', titles: ['Progress and priorities', 'Commitments', 'Risks and concerns', 'Asks'] },
  { heading: 'What moved', titles: ['What changed since last session', 'What changed since the beginning'] },
  { heading: 'What this rests on', titles: ['What this rests on'] },
]

export function TheSessionsReport({ groundId, sessionNumber }: { groundId: string; sessionNumber: number }) {
  const qc = useQueryClient()
  /**
   * SHOWING YOUR OWN REPORT TO THE OTHERS. Came across with the button, for the reason in the
   * comment above it - the only other copy of this is on the party page, which a lead never opens.
   */
  const showMine = useMutation({
    mutationFn: () => reportsApi.activate(groundId),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['session-shaped-report', groundId] })
      qc.invalidateQueries({ queryKey: ['report', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      if (res?.allActivated) toast.success('Everyone has shown theirs. You can all read them now.')
      else toast.success('Noted. Yours becomes visible when everyone has done the same.')
    },
    onError: () => toast.error('That did not go through. Nothing has changed - try again.'),
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    enabled: !!groundId && !!sessionNumber,
  })

  if (isLoading) return <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Reading this session…</div>
  if (isError || !data) return null

  const final = data.state === 'final'

  return (
    <div>
      {/* WHAT STATE THIS IS IN, said before anything it contains. A forming report and a final one
          are different promises, and a reader who cannot tell them apart cannot use either. */}
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          border: '1px solid var(--gw-border)', borderLeft: `3px solid ${final ? 'var(--gw-green-b)' : 'var(--gw-amber-b)'}`,
          borderRadius: 8, padding: '10px 13px', marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12.5, color: 'var(--gw-text)', fontWeight: 700 }}>
          {final ? `Session ${data.sessionNumber} · final` : `Session ${data.sessionNumber} · still forming`}
        </span>
        <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
          {final
            ? `Closed ${data.takenAt ? new Date(data.takenAt).toLocaleDateString() : ''}. This does not change.`
            : 'People are still answering, so this moves. It never invents agreement that is not there.'}
        </span>
      </div>

      {data.amendedNote && (
        <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, lineHeight: 1.55 }}>
          {data.amendedNote}
        </div>
      )}

      {/*
        WHO THIS REPORT IS COUNTING, at the top, named.

        "You see who's checked in, the report is counting." Before this, the count lived on the tab
        above the report and the reveal state lived in a row that named people by position - "not
        yet, Party 2" - which tells a lead nothing they can act on. Both are here, on the report
        they are about, with the report's own labels.
      */}
      {data.counting.length > 0 && (
        <>
          <Sec title="Who this is counting" />
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
            {data.counting.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
                  padding: '8px 12px', fontSize: 12.5,
                  borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined,
                }}
              >
                <span style={{ color: 'var(--gw-text)' }}>{c.isYou ? `${c.who} (you)` : c.who}</span>
                <span style={{ color: c.answered ? 'var(--gw-green-t)' : 'var(--gw-muted)', flexShrink: 0 }}>
                  {!c.answered
                    ? 'Not answered yet'
                    : c.hasShownTheirs
                      ? 'Answered, and shown theirs'
                      : 'Answered'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/*
        THE FOUR READS, ABOVE EVERYTHING ELSE.

        "The report where we have people's names and where they are and also risk, similar to what
        is in the home page, and how aligned and specific things are, is completely absent."

        They existed on the BOARD and not on the report, which is the thing a person opens. Same
        four, computed from the same rows, so the two surfaces cannot disagree about how many
        differences are open. Each one says plainly when it cannot be computed - "no targets set"
        and "no change" are different facts, and a zero standing for the first reads as the second.
      */}
      {data.atAGlance?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 8, marginBottom: 16 }}>
          {data.atAGlance.map((r) => (
            <div key={r.label} style={{ border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', padding: '11px 13px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', letterSpacing: '.03em', marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--gw-text)', lineHeight: 1.25 }}>{r.value}</div>
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.45 }}>{r.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/*
        WHAT EACH PERSON SAID THEY DID, under their own name.

        The front page's "show what each of the eight said they did", which the product did not
        have anywhere. Each person's own lines, nobody describing anybody else - and whose lines
        reach this reader was decided on the server, by the same rule that decides whose NAME they
        may see.

        Somebody who answered and named nothing specific keeps their row and says so. That is the
        single most useful line on the page for whoever runs the check-in, and dropping the row
        would hide it.
      */}
      {data.whatEachPersonSaid?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <Sec title="What each person said they did" src="their own words, and nobody describing anybody else" />
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', overflow: 'hidden' }}>
            {data.whatEachPersonSaid.map((p, i) => (
              <div key={`${p.who}-${i}`} style={{ padding: '11px 14px', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>
                  {p.isYou ? `${p.who} (you)` : p.who}
                </div>
                {p.lines.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.7 }}>
                    {p.lines.map((line, k) => <li key={k}>{line}</li>)}
                  </ul>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', lineHeight: 1.6 }}>{p.saying}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Sec title="Where things stand" />
      <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 14 }}>
        {data.whereThingsStand.saying}
      </div>

      {/*
        AGAINST WHAT WAS NAMED, right under where things stand, because the two are one thought:
        this is where things are, and this is the thing they were supposed to be. It sat nowhere
        before - the platform asked for a definition of success on Setup and then never mentioned it
        on any report or board again.
      */}
      {(data as any).againstSuccess && (
        <div style={{ marginBottom: 16 }}>
          {/* The report already knows which line is the reader's own; the band uses it only to
              say "You" instead of printing their name back at them. */}
          <WhatSuccessLooksLike
            data={(data as any).againstSuccess}
            yourName={(data as any).counting?.find((c: any) => c.isYou)?.who ?? null}
          />
        </div>
      )}

      {data.sharedPicture && (
        <>
          <Sec title="The picture from the accounts" />
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, marginBottom: 14 }}>
            {data.sharedPicture}
          </div>
        </>
      )}

      {/*
        EIGHT EQUAL HEADINGS IS NOT A REPORT, IT IS A CONTENTS PAGE.

        "The session report looks chaotic." It was: eight uppercase eyebrows, each with a second
        grey caption right-aligned against it, each followed by one or two short lines, every line
        underlined by its own hairline. Sixteen labels and twenty rules for about a dozen facts -
        so nothing led, and the eye had nowhere to rest.

        The sections were never equal, and grouping them is the fix rather than restyling them:
        what people SAID this session, what MOVED, and what it RESTS ON. The group carries the
        heading; each section inside it is a plain sub-label, and an empty one is one quiet line.
        The per-section captions are gone - they explained a heading that does not need explaining
        and doubled the number of things to read.
      */}
      {THE_THREE_GROUPS.map((group) => {
        const inThisGroup = data.sections.filter((s) => group.titles.includes(s.title))
        if (inThisGroup.length === 0) return null
        return (
          <div key={group.heading} style={{ marginBottom: 18 }}>
            <Sec title={group.heading} />
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', padding: '4px 14px 12px' }}>
              {inThisGroup.map((s, si) => (
                <div key={s.title} style={{ paddingTop: si === 0 ? 12 : 14, borderTop: si > 0 ? '1px solid var(--gw-border)' : undefined, marginTop: si > 0 ? 12 : 0 }}>
                  {/* A group of one whose section is named after it does not say it twice -
                      "WHAT THIS RESTS ON" over "What this rests on", read off the live page. */}
                  {!(inThisGroup.length === 1 && s.title === group.heading) && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 5 }}>{s.title}</div>
                  )}
                  {s.items.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.7 }}>
                      {s.items.map((it, i) => (
                        <li key={i}>
                          {it.text}
                          {(it.who || it.documented) && (
                            <span style={{ color: 'var(--gw-muted)', fontSize: 11.5 }}>
                              {it.who ? ` — ${it.who}` : ''}
                              {it.documented ? ' · from a document' : ''}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', lineHeight: 1.6 }}>{s.saying}</div>
                  )}
                  {/*
                    HOW TO READ THE SECTION, WHERE ITS SHAPE COULD MISLEAD.

                    Risks and concerns groups by entry type, so it fills up with whoever names
                    problems out loud. On a real cohort five of six items were one hire's - the one
                    being honest about not reaching her number - while the one who had closed
                    nothing all quarter barely appeared. The server decides when to say this and
                    sends the sentence; usually there is none.
                  */}
                  {(s as any).note && (
                    <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 7, paddingLeft: 11, borderLeft: '2px solid var(--gw-border)' }}>
                      {(s as any).note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/*
        HOW SPECIFIC THE ACCOUNTS WERE, as a sentence about the REPORT rather than a heading of its
        own. Given equal billing with the substance it reads as a mark out of five for the person,
        which this product does not give - so it sits at the foot, in the muted weight, saying what
        the level means for what came out.
      */}
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.65, marginBottom: 14 }}>
        {data.howClearThisWas.saying}
      </div>

      {data.theConversationWorthHaving && (
        <>
          <Sec title="The conversation worth having now" />
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, marginBottom: 10 }}>
            {data.theConversationWorthHaving}
          </div>
        </>
      )}

      {/*
        SHOWING YOURS, ON THE REPORT IT OPENS.

        The mutual reveal used to live in two places - the lead's report tab and the party page -
        and when the report tab became a list of sessions the action went with the body. A lead who
        is also a party to their own check-in, which is nearly always, was left with no way to show
        their own report to their team at all.

        One place now, and it is the report the reveal is about, so a lead and a party reach it the
        same way. It appears only when there is something to decide: the shared report is out and
        this reader has not shown theirs yet.
      */}
      {data.released && !data.iHaveShownMine && (
        <div style={{ border: '1px solid var(--gw-blue-b)', background: 'var(--gw-blue-bg)', borderRadius: 10, padding: '13px 15px', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>
            Your own report is still private
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-blue-body)', lineHeight: 1.6, marginBottom: 10 }}>
            Each of you shows your own when you are ready. Once everybody has, you can all read them
            at the same moment. This cannot be undone.
          </div>
          <button
            onClick={() => showMine.mutate()}
            disabled={showMine.isPending}
            style={{ padding: '9px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: showMine.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
          >
            {showMine.isPending ? 'Confirming…' : 'Show mine'}
          </button>
        </div>
      )}

      {!data.showsEverybody && (
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.6, borderTop: '1px solid var(--gw-border)', paddingTop: 10 }}>
          Until the shared report is out, the words above are your own. The counts are from
          everybody's accounts; nobody else's wording reaches you and yours does not reach them.
        </div>
      )}
    </div>
  )
}

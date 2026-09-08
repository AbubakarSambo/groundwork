import { Sec } from './kit'
import { ResolutionPanel } from './ResolutionPanel'
import { WhatSuccessLooksLikeFor } from './WhatSuccessLooksLike'

/**
 * SOMEBODY'S OWN ACCOUNT OF A CHECK-IN.
 *
 * Lifted verbatim out of `GroundParticipantPage`, which is the only page that can render it today.
 * It has to be renderable by the page that RUNS a check-in too, because a lead is almost always
 * also a party to it - and until now reaching their own record meant leaving for a second page that
 * looks identical to the one they were on. That is the confusion this whole sequence is unpicking.
 *
 * NOTHING ABOUT IT CHANGED IN THE MOVE. The next step wires the other page to it; a step that both
 * moves code and alters it gives you nothing to compare against when something looks wrong
 * afterwards.
 *
 * `myRecord` is the reader's own - the caller fetches it, because only the caller knows whose
 * record it is asking for.
 */
export interface MyRecordProps {
  /** The check-in's id. Absent while it is still loading. */
  groundId?: string
  /** The check-in, for the objective set for this reader and the parties on it. */
  ground: any
  /** This reader's record, from `/grounds/:id/my-record`. */
  myRecord: any
  /** Who is reading, so their own objective can be found among the parties. */
  viewerUserId?: string
  /** How many sessions this check-in plans, for the "near the end" rule. */
  totalSessions: number | null
  /** How many this reader has finished, for the same rule. */
  completedCount: number
  /** This reader's own specificity read, from `/grounds/:id/my-specificity`. */
  specificity?: any
  /**
   * Send the reader to another tab of the same check-in. A prop rather than a router call, because
   * the two pages that render this name their tabs differently and neither's names belong in here.
   */
  onGoToTab: (tab: string) => void
}

export function MyRecord({
  groundId,
  ground,
  myRecord,
  viewerUserId,
  totalSessions,
  completedCount,
  specificity,
  onGoToTab,
}: MyRecordProps) {
  return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/*
            WHAT IS EXPECTED OF ME IS ON CONTEXT, IN PLAIN VIEW, WITH EVERYBODY ELSE'S.
            
            An ObjectivePanel stood here with an Accept button and the line "Nothing is read against
            this until you accept it or write your own". That is the old propose-and-accept model,
            and it contradicted the one the product now runs on:
            
              "Participants should not be able to rewrite their targets or accept it. One person is
               doing this, we dont want chaos. But they can see it."
            
            Both models were live at once, on the same PersonObjective rows - a lead stated an
            expectation, it published to Context as designed, and this page offered a button to
            accept it. Seeing it is right; agreeing to it by form is not the mechanism. If they think
            it is wrong they say so in their check-in, where it is probed and recorded.
          */}

          {/*
            THE EXIT BELONGS AT THE EXIT, ON THIS PAGE TOO. W8-5, half-fixed.

            I gated this on the admin page and marked the item done. Here it
            stayed unconditional and first, so "My record" opened with "Each
            person picks the outcome they think the record supports. The ground
            closes only when everyone picks the same one, and nobody closes it
            alone" - above four buttons including one that stops the project - on
            a ground with one session done. Hafsah found it in the same words she
            used the first time.

            Same rule as the admin page: near the end, or already started.
          */}
          {groundId && ((totalSessions != null && completedCount >= totalSessions - 1) || (ground as any).resolutionState) && (
            <ResolutionPanel groundId={groundId} />
          )}

          {/*
            WHAT SUCCESS WAS SAID TO BE, AND WHERE THE ACCOUNTS PUT IT.

            This is where a party meets it now. It used to be on her Setup tab, as a read-only panel
            under a paragraph apologising for being read-only - a disclosure, not a comparison, and
            on the one tab where nothing is hers. Here it sits beside her own sessions, next to her
            own account of the same question, which is the only place the two can be read together.
          */}
          {groundId && (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
              <WhatSuccessLooksLikeFor groundId={groundId} />
            </div>
          )}

          {/* The empty state, and NO price.
              `insightsLocked` does not mean "unpaid" - it means "no completed
              session yet", and the server says so: the first session of every
              ground is free, so there is no billing gate here at all. A
              monthly-subscription button had been attached to that empty
              state anyway, shown to the one person who has contributed
              nothing and is deciding whether to begin - and wired to a
              ONE-OFF purchase call, so the label was wrong twice over.
              Participants are never charged. The state is real; the price
              was scaffolding. */}
          {myRecord?.insightsLocked !== false && (
            <div style={{ background: 'var(--gw-navy)', borderRadius: 10, padding: '18px 20px' }}>
              {/*
                THE SECOND TIME THE SAME EMPTY STATE WAS SAID.

                Two inches above this, the private-report card already says "Your private report is
                not ready yet - it generates once you complete your check-in." This box then said
                "Complete your first check-in to start building your record", which is the same
                sentence in a louder colour. The pattern she has named twice: the same absence
                stated twice, close together.

                What this box is actually for is the question a party cannot otherwise answer -
                where does she see how specific she has been? She has no Sessions tab; the lead's
                view of everyone's state is not hers. The answer is this tab, in two places, and now
                it says so instead of restating the precondition.
              */}
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 6 }}>What this page will hold</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>
                A line per session, each with how specific that account was, and a trend across all
                of them once there is more than one. Both appear here - this is the page where you
                see how you are being read.
              </div>
            </div>
          )}

            {/*
              WHAT IS EXPECTED OF YOU, AS A STATE, BESIDE YOUR OWN SESSIONS.
              
              Who Sees What: a participant's Sessions tab is "their own sessions only, and their own
              target". The sessions were already theirs alone; the target used to be an editing
              panel with an Accept button, which is the model this product no longer runs on.
              
              So it is the same one line the lead's rows carry - set, seen, or nothing yet - and it
              opens Context, where the words are published for everyone including them. The state
              belongs next to the sessions it is read against; the words belong where everybody
              reads the same copy.
            */}
            {(() => {
              const mine = (ground.participants ?? []).find((p: any) => p.userId === viewerUserId)
              const o = mine?.objective
              return (
                <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 16px' }}>
                  <Sec title="What is expected of you" />
                  <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>
                    {!o?.text?.trim()
                      ? 'Nothing yet. This comes out of the lead\u2019s own check-in, where they are asked what they expect of each person.'
                      : o.text}
                  </div>
                  <button
                    onClick={() => onGoToTab('docs')}
                    style={{ marginTop: 8, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {o?.text?.trim() ? 'See it in context, with everyone else\u2019s' : 'Open Context'}
                  </button>
                </div>
              )
            })()}

          {/* Session history summary - always visible */}
          {/*
            THE SESSIONS LIST WAS HERE TWICE, AND THIS WAS THE COPY WITH LESS IN IT.

            "My record page seems to be doing too much." Two lists of the same sessions sat a few
            inches apart: this one - number, date, status - and the session-reports list above,
            which is the same sessions with the same dates AND a way into each session's report.
            Nothing is lost by keeping the one you can act from, and each row now also carries how
            checkable that session's account was, which is what the card below used to say without
            saying which session it meant.
          */}
          {/*
            SPECIFICITY AND CONFIDENCE ARE TWO DIFFERENT READS, AND THEY READ AS ONE.

            "Confidence is about the history and the read possible, and specificity is about how
            well you have given information in each session."

            So specificity is PER SESSION and now sits on the session it is about, in the list
            above. What is left here is the part that is genuinely about the run: whether your
            answers are getting more specific or less, and the one thing that would make the next
            one land harder. The bar chart is gone - a row of coloured bars with no dates and no
            scale is a mark out of something a person cannot see, and this read exists to be acted
            on rather than scored.
          */}
          {myRecord && !myRecord.insightsLocked && myRecord.specificity && (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
              <Sec title="How your answers are going" src="across the sessions so far" />
              <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6 }}>
                {specificity?.trend === 'rising'
                  ? 'Your answers are getting more specific as this goes on.'
                  : specificity?.trend === 'falling'
                    ? 'Your recent answers carry less detail than your earlier ones.'
                    : specificity?.trend === 'steady'
                      ? 'Your level of detail has held steady across these sessions.'
                      : 'Too early to read a trend. This fills in as you check in.'}
              </div>

              {/* Nobody can act on a word like "low"; everybody can act on "none of your answers
                  say when". */}
              {specificity?.whatWouldHelp && (
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 9 }}>
                  <span style={{ fontWeight: 700, color: 'var(--gw-text)' }}>What would make the next one land harder. </span>
                  {specificity.whatWouldHelp}
                </div>
              )}

              {/* Their own best answer, quoted back. What a checkable account looked like in their
                  own words teaches what no description of specificity can. */}
              {specificity?.strongest && (
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 9 }}>
                  <span style={{ fontWeight: 700, color: 'var(--gw-text)' }}>This one of yours was easy to check. </span>
                  <span style={{ fontStyle: 'italic' }}>"{specificity.strongest}"</span>
                </div>
              )}

              {/*
                THE REASON THIS IS SAFE TO SHOW AT ALL IS THAT IT GOES NOWHERE ELSE, and I dropped
                this line while tightening the card. A person reading feedback on their own writing
                assumes their lead is reading it too unless told otherwise, so the assurance is part
                of the feature rather than decoration around it.
              */}
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 10 }}>
                Only you see this. It is never shown to the lead or to anybody else in this check-in.
              </div>
            </div>
          )}

          {/* Confidence score - unlocked only */}
          {myRecord && !myRecord.insightsLocked && myRecord.confidence && (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Sec title="What your record can support" src="the whole history, not this session" />
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gw-navy)' }}>{myRecord.confidence.label}</div>
              </div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= myRecord.confidence!.score ? 'var(--gw-navy)' : 'var(--gw-border)' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{myRecord.confidence.description}</div>
            </div>
          )}

          {/* Pattern observations - unlocked, diplomatic */}
          {myRecord && !myRecord.insightsLocked && myRecord.patterns && myRecord.patterns.length > 0 && (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
              <Sec title="Observations from your record" />
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                These are patterns Groundwork has noticed across your check-ins. They are observations, not verdicts. Worth being aware of as your record builds.
              </div>
              {myRecord.patterns.map((p: any, i: number) => (
                <div key={i} style={{ padding: '10px 0', borderTop: i === 0 ? '1px solid var(--gw-bg)' : '1px solid var(--gw-bg)', fontSize: 13, color: '#3A3630', lineHeight: 1.6 }}>
                  {p.observation}
                  {p.sessionNumber && <span style={{ display: 'block', fontSize: 11, color: 'var(--gw-muted)', marginTop: 3 }}>First noticed in Session {p.sessionNumber}</span>}
                </div>
              ))}
            </div>
          )}

          {myRecord && !myRecord.insightsLocked && (!myRecord.patterns || myRecord.patterns.length === 0) && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6, padding: '0 2px' }}>
              No patterns have surfaced yet. They appear once the same thing has been seen across
              several sessions, which is deliberate - one session is not a pattern.
            </div>
          )}
        </div>
  )
}

import { ResolutionPanel } from './ResolutionPanel'

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
  /** How many sessions this check-in plans, for the "near the end" rule. */
  totalSessions: number | null
  /** How many this reader has finished, for the same rule. */
  completedCount: number
  /**
   * GONE FROM HERE, AND THE PROP WITH IT.
   *
   * The trend, the thing that would help and their own best answer were three lines in a card at the
   * foot of this component. They belong with the specificity read they describe, which is now at the
   * top of the page - see TheFiveThingsThatMakeItCheckable. Leaving the prop declared and unused
   * would be a promise this component no longer keeps.
   */
  /**
   * Send the reader to another tab of the same check-in. A prop rather than a router call, because
   * the two pages that render this name their tabs differently and neither's names belong in here.
   */
}

export function MyRecord({
  groundId,
  ground,
  myRecord,
  totalSessions,
  completedCount,
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
            AND THE EMPTY CARD IT LEFT BEHIND.

            Moving "what success looks like" to Context emptied this wrapper and left the wrapper
            rendering: a white box with a border, a radius and nothing inside it, floating between
            sign-off and the Context link. Visible in a screenshot before it was visible to me,
            which is the argument for looking at the page rather than at the diff.
          */}

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
                A line per session, each with how specific it was, and a trend across all
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
            {/*
              AND "WHAT IS EXPECTED OF YOU" WITH IT, FOR THE SAME REASON.

              It was a card whose usual content was "Nothing yet", above a button that opened
              Context - so the page carried a heading, an absence and a link, where the link alone
              says all three. Both bands are published on Context for everybody including the person
              they are about, which is the point of publishing them.
            */}
            {/* The Context signpost went with the Report one: a page that ends by naming its
                neighbouring tabs, which are in the tab bar above it, has run out of things to say
                about itself. */}

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
          {/*
            "HOW YOUR ANSWERS ARE GOING" AND "WHAT YOUR RECORD CAN SUPPORT" BOTH MOVED TO THE TOP.

            They were two cards here, below the sessions and below the carry-forward - a person read
            everything the page held before reaching the two lines that say what any of it amounts
            to. And both said it as a mark on a scale nobody can see: a five-segment bar with the
            word "moderate" beside it, and a sentence about a trend with nothing to compare against.

            One card now, above what it summarises, in sentences: see WhatYourRecordCanSupport. The
            two teaching lines that lived in the first of them - the thing the engine could not find,
            and the person's own best answer quoted back - moved with the specificity read they
            belong to, in TheFiveThingsThatMakeItCheckable.

            The assurance that only they see this went with the card and is in the new one.
          */}
          {/*
            OBSERVATIONS FOLDED INTO THE CARD AT THE TOP.

            A card of its own here made it the fourth thing on the page saying the same thing in a
            fourth vocabulary. Not dropped - they also reach a person on the board, but only where
            the scenario renders one, so dropping them would take them from exactly the people with
            nowhere else to read them. See WhatYourRecordCanSupport, "Also noticed".
          */}

          {myRecord && !myRecord.insightsLocked && (!myRecord.patterns || myRecord.patterns.length === 0) && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6, padding: '0 2px' }}>
              {/* REVIEW ROUND 3, ITEM 5: TWO SENTENCES, NOT A DASH-JOINED FRAGMENT. */}
              No patterns have surfaced yet. They appear once the same thing has been seen across
              several sessions. That is deliberate. One session is not a pattern.
            </div>
          )}
        </div>
  )
}

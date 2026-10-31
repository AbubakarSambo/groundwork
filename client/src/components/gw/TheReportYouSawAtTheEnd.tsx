import type { ReactNode } from 'react'
import type { EntryReport } from '@/api/entry'
import { CLOSE_SHEET, Block } from './the-shape-every-close-is-drawn-in'

/**
 * THE REPORT AS THE PERSON SAW IT AT THE END OF THEIR SESSION.
 *
 * "I want the exact same forming report to be openable or seen. I have not seen it anywhere, when
 * I click it sends me back to the chat and the report looks nothing like what I got at the end."
 *
 * It looked nothing like it for two reasons, and both are fixed here. The report was written into
 * a column a background job overwrites twenty seconds later, so the object itself was gone - that
 * is `CheckIn.sessionReport` now. And the SCREEN existed once, written into the entry chat page,
 * so nothing else could render it even with the data in hand. This is that screen, lifted out
 * unedited: the same sections, the same words, the same order.
 *
 * The three parts of it that only make sense while you are still finishing - the correction
 * conversation, the "+ Add them" buttons, the line about what is on record - come in as props,
 * because they are things you DO and this is a thing you READ. A page that only shows the report
 * passes none of them and gets the reading without the controls.
 */
function CardTitle({ children, weight = 600 }: { children: ReactNode; weight?: 600 | 700 }) {
  return <div style={{ fontSize: 'var(--er-lead)', fontWeight: weight, color: 'var(--gw-text)', marginBottom: 2 }}>{children}</div>
}

/**
 * U.9 THIRD REVIEW, ITEM 4: "SETTLED." AND "STILL OPEN." WERE A ONE-WORD LABEL BOLTED ONTO A
 * SENTENCE, NOT A SENTENCE OF THEIR OWN. Each line is now its own full sentence: what is settled
 * is said as something everybody agrees, and what is open says so before naming it.
 */
function lowerFirst(s: string): string {
  const t = s.trim()
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : t
}
function capitalize(s: string): string {
  const t = s.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

export interface TheReportYouSawAtTheEndProps {
  /** Settled and still open, from the session report's engines. */
  stands?: { settled: string[]; open: string[] } | null
  /** The report itself, exactly as it was produced. */
  report: EntryReport
  /** The correction conversation, when this reader can still correct it. */
  correctionSlot?: ReactNode
  /**
   * SAYING ONE BLOCK IS WRONG, FROM THE BLOCK THAT IS WRONG.
   *
   * "This isn't right, correct it" existed in exactly one place: under the opening summary. Every
   * other block on the page was read-only, including the open items, which is where the wrong thing
   * actually was - a lead read "Team members not named here" about a team she had named and had
   * nowhere to say so. Her words: "There's no place I know to correct the report that is wrong."
   *
   * A slot rather than a handler, because what correcting means differs by caller: the entry page
   * runs it through the live engine, and a signed-in reader may not be able to correct at all.
   */
  renderCorrect?: (about: string) => ReactNode
  /** True to note that the reader has already corrected this once. */
  correctedNote?: boolean
  /** Renders the invite control against a suggested party or a mentioned person, when there is one. */
  renderAdd?: (key: string, label: string) => ReactNode
  /** The line under "What happens next" saying what is on record. */
  onRecordLine?: ReactNode
  /**
   * WHAT THE CHECK-IN STILL NEEDS FROM THE PERSON WHO SET IT UP.
   *
   * Reported after a lead finished their first session: "the report only showed me where to add the
   * two people I listed, not more. It didn't point me to the setup. It also didn't tell me how I
   * should set my sessions cadence."
   *
   * Both true. This screen answers exactly one question - who else should be in this - and stops the
   * moment it is answered. Meanwhile the check-in is running on a fortnightly rhythm nobody chose
   * (`Ground.cadence` defaults to FORTNIGHTLY and `cadenceStated` records that nobody picked it),
   * and the board is separately complaining that no standard was set for what success looks like.
   *
   * The end of a first session is the one moment where somebody has just been thinking about the
   * work and has not yet been handed a dashboard. A slot rather than markup, because what is missing
   * differs by caller and only the caller can answer it - the same reason `renderAdd` is a slot.
   */
  stillNeeded?: ReactNode
  /**
   * DROP THE FIVE-RUNG LADDER, BECAUSE A BETTER READ OF THE SAME THING IS ON THE PAGE.
   *
   * "How complete your side of this is" and the specificity meter answer one question: how much
   * did you give this session. Read off the session report page they sat inches apart and
   * disagreed - "Specificity: Thin" above "Clear" - which is two meters telling a person two
   * different things about the same ten minutes.
   *
   * The rule for which survives is the architectural one. The ladder is `alignmentStatus`, a model's
   * word for it. The meter is `specificityLevel`, computed at extraction. Where both exist the
   * engine wins. Where only the model's exists - the end of an entry session, before extraction has
   * run - the ladder is the only read there is and it stays.
   */
  hideCompleteness?: boolean
}

// Display labels for the alignmentStatus ladder. DISPLAY ONLY - the underlying
// data values ('Unresolved'...'Aligned') are the AI report schema's enum and are
// what the report JSON carries; they must never change. Only what the person
// SEES is reframed here.
export const STATUS_DISPLAY: Record<'Unresolved' | 'Mixed' | 'Emerging' | 'Clear' | 'Aligned', string> = {
  Unresolved: 'Just started',
  Mixed: 'Taking shape',
  Emerging: 'Getting there',
  Clear: 'Clear',
  Aligned: 'Shared',
}

/**
 * A REPORT THAT IS MISSING A LIST IS STILL A REPORT.
 *
 * This page crashed with "Cannot read properties of undefined (reading 'length')" the moment a
 * second person had checked in: the Report tab's session row handed it a report whose
 * `areasRequiringAlignment` and `alignmentReached` were simply not there, and the two `.length`
 * reads below assumed the type. `honestClose` had the same hole one field deeper.
 *
 * The type says these are required, and for a freshly written report they are. What reaches this
 * component is JSON off the wire, from more than one endpoint, and a shape a reader cannot control
 * must not be able to take the whole screen down. So every list read goes through here first, and
 * a report arriving without one renders without that section instead of not rendering at all.
 */
function everySectionCanBeAbsent(report: EntryReport): EntryReport {
  const hc = report.honestClose ?? ({} as EntryReport['honestClose'])
  return {
    ...report,
    areasRequiringAlignment: report.areasRequiringAlignment ?? [],
    alignmentReached: report.alignmentReached ?? [],
    mentionedPeople: report.mentionedPeople ?? [],
    honestClose: { aligned: hc.aligned ?? '', open: hc.open ?? '', revisit: hc.revisit ?? '', risk: hc.risk ?? '' },
  }
}


/**
 * THE SIZES ARE VARIABLES SO A PHONE CAN MOVE THEM, AND NOTHING ELSE HERE MOVED.
 *
 * This is the report somebody reads at the end of the entry chat - the first thing a stranger ever
 * sees, ten minutes after meeting the product, often with no account to come back to. It is frozen
 * for that reason: a break here costs the person least able to recover from it.
 *
 * So this change is the narrowest one that fixes what was wrong. Read on a phone it was a wall:
 * 12px body over five stacked cards, each with a 9px uppercase label above every paragraph, in
 * boxes with 13px of padding inside boxes. Every number below was already in the file; each one is
 * now a variable with its old value as the default, so the desktop rendering is byte-for-byte what
 * it was, and the media query is the only thing that changes anything.
 *
 * NO STRUCTURE, NO DATA, NO LOGIC. Nothing was added, removed, reordered or re-fetched.
 */
const SIZES = `
.gw-entry-report {
  --er-lead: 13px; --er-body: 13px; --er-label: 13px;
  --er-box: 11px 13px; --er-box-lg: 14px 16px; --er-box-sm: 7px 9px;
  --er-gap: 16px; --er-gap-sm: 8px;
}
@media (max-width: 640px) {
  .gw-entry-report {
    --er-lead: 16px; --er-body: 14px; --er-label: 13px;
    --er-box: 14px 15px; --er-box-lg: 16px; --er-box-sm: 11px 12px;
    --er-gap: 22px; --er-gap-sm: 12px;
  }
  /* The line has to open up with the size or the longer measure reads as one block of grey. */
  .gw-entry-report p, .gw-entry-report div { line-height: 1.6; }
}
`

export function TheReportYouSawAtTheEnd({
  report: given,
  correctionSlot,
  renderCorrect,
  correctedNote,
  renderAdd,
  onRecordLine,
  stillNeeded,
  stands,
}: TheReportYouSawAtTheEndProps) {
  const report = everySectionCanBeAbsent(given)
  /* Numbered by what is DRAWN, the same rule the signed-in close follows: a block with nothing in
     it is not shown, and fixed numbers would then skip. */
  let step = 0
  const next = () => (step += 1)
  return (
    <div className="gw-close gw-entry-report" style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
        <style>{CLOSE_SHEET}</style>
        <style>{SIZES}</style>
        {/*
          THE PROTOTYPE'S OWN HEADINGS (Hafsah, 30 October 2026, first-experience round 1). Impatient
          leads read "What we heard from you", "What we noticed", "Why it matters" and "Where this
          leaves you" as a consultant's report. The prototype's own report and end card
          (B4 own-report, B3 check-in-end-card) say "What you told us" and "What happens next", with
          no caption over each sentence, so this says the same.
        */}
        <div className="gw-head"><div style={{ background: 'var(--gw-dark)', borderRadius: 10, padding: 'var(--er-box-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--er-gap-sm)' }}>
            {/* U.9 RE-REVIEW, ITEM A: a plain heading, not a shout. */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-green-b)' }}>What you told us</div>
            {correctedNote && (
              <div style={{ fontSize: 'var(--er-label)', color: 'rgba(255,255,255,.55)', fontStyle: 'normal' }}>Updated after your correction</div>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 'var(--er-lead)', lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{report.whatGroundworkSaw}</p>
          {correctionSlot}
        </div></div>

        {/*
          THE LADDER IS GONE. "Just started" here, "Your record is specific" two lines above it, and
          "Not much yet, most of this is general" on My record were three verdicts on one session.
          The specificity meter on the page is the one read; nothing else rates the record.
        */}
        {/* What's still open, and what to do about it. U.9 re-review, item A: the label and its
            note were "01 WHAT'S STILL OPEN" over a lower-case sub-line; they are now one plain
            sentence, and each field caption inside the card is no longer shouted in capitals. */}
        {report.areasRequiringAlignment.length > 0 && (
          <Block n={next()} label="What is still open">
            {report.areasRequiringAlignment.map((a, i) => (
              <div key={i} style={{ border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-amber-b)', borderRadius: 10, padding: 'var(--er-box)', marginBottom: 'var(--er-gap-sm)' }}>
                {/* A title the server judged unusable as a heading is absent; the card stands without it. */}
                {a.title && <div style={{ fontSize: 'var(--er-lead)', fontWeight: 700, marginBottom: 7 }}>{a.title}</div>}
                <p style={{ fontSize: 'var(--er-body)', lineHeight: 1.5, margin: '0 0 5px' }}>{[a.observation, a.whyItMatters].filter(Boolean).join(' ')}</p>
                {renderCorrect?.(a.title)}
                <div style={{ background: 'var(--gw-green-bg)', borderRadius: 7, padding: 'var(--er-box-sm)', fontSize: 'var(--er-body)', color: 'var(--gw-green-t)', lineHeight: 1.5 }}><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-green-t)', opacity: .75, display: 'block', marginBottom: 2 }}>What to do next</span>{a.recommendedMove}</div>
              </div>
            ))}
          </Block>
        )}

        {/* Clear from what this person said - not mutual agreement, nobody else has checked in yet. Not
            "your side": this is a team getting a read on something far more often than it is two
            people arguing, and side language turns an update into a case. */}
        {/*
          U.9 RE-REVIEW, ITEM A: NO CLAIM THIS COMPONENT CANNOT STAND BEHIND. "Nobody else has
          answered yet" was said unconditionally, whether or not that was true by the time somebody
          read it back later - this component has no read on who else has answered. The label now
          says only what it can: this is clear from THIS person's own words.
        */}
        {report.alignmentReached.length > 0 && (
          <Block n={next()} label="Clear from what you said">
            {report.alignmentReached.map((a, i) => (
              <div key={i} style={{ border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-green-b)', borderRadius: 10, padding: 'var(--er-box)', marginBottom: 'var(--er-gap-sm)' }}>
                {a.title && <div style={{ fontSize: 'var(--er-lead)', fontWeight: 700, marginBottom: 4 }}>{a.title}</div>}
                <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-sub)', lineHeight: 1.5 }}>{a.note}</div>
              </div>
            ))}
          </Block>
        )}

        {/* Suggested parties */}
        {/* FAULT 12 (live review): a heading made of two pieces joined with a comma reads as two
            headings stuck together, not a sentence. One plain phrase instead; the body
            underneath already says what these people would do for the check-in. */}
        {report.suggestedParties && report.suggestedParties.length > 0 && (
          <Block n={next()} label="Who else this check-in needs">
            <div style={{ border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-navy)', borderRadius: 10, padding: 'var(--er-box)', background: 'var(--gw-blue-bg)' }}>
              <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                Based on this check-in, these roles would strengthen the check-in. What they say would change or confirm what is currently on record from one side only.
              </div>
              {report.suggestedParties.map((p, i) => {
                const key = `sug-${i}-${p.role}`
                return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--gw-blue-bg)' : undefined }}>
                  <div style={{ flex: 1 }}>
                    <CardTitle>{p.role}</CardTitle>
                    <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-sub)', lineHeight: 1.4 }}>{p.reason}</div>
                    {renderAdd?.(key, p.reason)}
                  </div>
                </div>
                )
              })}
            </div>
          </Block>
        )}

        {/* Mentioned people */}
        {/* FAULT 12 (live review): same fix as "Who else this check-in needs" - one plain phrase,
            not two joined by a comma. */}
        {report.mentionedPeople && report.mentionedPeople.length > 0 && (
          <Block n={next()} label="People you named while you were talking">
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: 'var(--er-box)', background: 'var(--gw-paper)' }}>
              <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                {/*
                  W5. TWO PLACES TO ADD PEOPLE, NEITHER SAYING SO.
                  This list and the invite screen below are the same queue with two
                  entrances, which nobody could tell from either one. Both say which queue
                  they are.

                  THE WORDS WERE THE PLUMBING RATHER THAN THE POINT. "Adding one puts them
                  on the same invite list as the screen below, so you will not send twice"
                  explains our data model to somebody who is deciding whether to invite a
                  colleague. Read back as "a bit off", and it is: the sentence answers a
                  question nobody asked and leaves the one they did ask - what happens to
                  this person if I add them - unanswered.

                  What it says now is what adding somebody DOES. The not-sending-twice
                  reassurance stays, because two entrances to one queue is a real thing to
                  wonder about, but it goes second and in half the words.
                */}
                {/*
                  THE SAME PARAGRAPH ON A PAGE WITH NOTHING TO PRESS. Read back on the reopened
                  report, where it promised "they will be invited when you save" beside a list of
                  names, no buttons, and no save. It is only true while you are still finishing.
                */}
                {/*
                  FAULT 11 (live review): "ADDING HERE OR BELOW IS THE SAME LIST" CLAIMED A LIST
                  THAT IS NOT THERE WHEN NOBODY HAS BEEN ADDED YET - the chip row below
                  (`.gwui-ec-savecard-invite-list`) only renders once `inviteAdded.length > 0`. What
                  is true regardless is the behaviour, not the layout: adding someone here does the
                  same thing as adding them in the invite step below, so reworded to say that
                  instead of describing a list that may not be on screen.
                */}
                {renderAdd
                  ? 'You named these people while you were talking. Add anyone who should answer for this themselves, and they will be invited when you save. Adding them here does the same thing as adding them below, so nobody is invited twice.'
                  : 'You named these people while you were talking. Adding somebody to this check-in is done on its Setup tab.'}
              </div>
              {report.mentionedPeople.map((p, i) => {
                const key = `men-${i}-${p.name}`
                return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                  <div style={{ flex: 1 }}>
                    <CardTitle>{p.name}</CardTitle>
                    <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-sub)', lineHeight: 1.4 }}>{p.context}</div>
                    {renderAdd?.(key, `${p.name} - ${p.context}`)}
                  </div>
                </div>
                )
              })}
            </div>
          </Block>
        )}

        {/*
          W3. ALSO CAME UP, AND DELIBERATELY WITHOUT A BUTTON.
          Her report offered "Microchip Solutions" and "Mass General"
          with "+ Add them" next to them, and adding a client sends that
          client an invitation to give their own account of her team's
          performance. The split is made on the server, where it is
          arithmetic rather than a prompt hoping to be careful. Nothing
          is dropped: both are still named and still described here.
        */}
        {report.alsoCameUp && report.alsoCameUp.length > 0 && (
          <Block n={next()} label="Also came up, but not people to invite">
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: 'var(--er-box)', background: 'var(--gw-paper)' }}>
              {report.alsoCameUpNote && (
                <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                  {report.alsoCameUpNote}
                </div>
              )}
              {report.alsoCameUp.map((p, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                  <CardTitle>{p.name}</CardTitle>
                  <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-sub)', lineHeight: 1.4 }}>{p.context}</div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/*
          WHERE THIS LEAVES YOU, FROM THE SAME ENGINE AS THE SHARED REPORT. Four coloured boxes used to
          sit here with a model's honestClose in them, and on a first session they were four empty
          boxes while the shared report on the same page listed two open items. Settled and still open
          come from the session report now; with nothing in either, one line says so.
        */}
        {/* FAULT 12 (live review): same fix - "Where this leaves you" is the whole heading; what is
            settled and what is still open is what the rows underneath already say. */}
        <Block n={next()} label="What happens next">
          {((stands?.settled?.length ?? 0) || (stands?.open?.length ?? 0))
            ? <div style={{ display: 'grid', gap: 6 }}>
                {(stands?.settled ?? []).map((t, i) => <div key={`s${i}`} style={{ fontSize: 'var(--er-lead)', lineHeight: 1.5 }}>{`Everyone agrees that ${lowerFirst(t)}`}</div>)}
                {(stands?.open ?? []).map((t, i) => <div key={`o${i}`} style={{ fontSize: 'var(--er-lead)', lineHeight: 1.5 }}>{`This is still open. ${capitalize(t)}`}</div>)}
              </div>
            : <div style={{ fontSize: 'var(--er-lead)', color: 'var(--gw-sub)', lineHeight: 1.5 }}>Once someone else checks in, you will see where you agree and where you see things differently.</div>}
          <div style={{ fontSize: 'var(--er-body)', color: 'var(--gw-muted)', marginTop: 8 }}>
            {onRecordLine}
          </div>
        </Block>

        {/* Last, because it is about the check-in rather than about the session just finished. */}
        {stillNeeded && <div className="gw-foot">{stillNeeded}</div>}
    </div>
  )
}

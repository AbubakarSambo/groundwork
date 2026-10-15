import type { ReactNode } from 'react'
import { SELECTABLE_CADENCES } from '@/lib/cadence'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * THE TWO SETUP ANSWERS NOBODY IS EVER ASKED FOR.
 *
 * Reported after a lead finished their first session: the end screen offered the people named in the
 * conversation and nothing else - no route to Setup, and no word about how often the check-in should
 * run. So the check-in runs fortnightly, which nobody chose: `Ground.cadence` defaults to FORTNIGHTLY
 * and a separate column, `cadenceStated`, records whether a person actually picked one. The API is
 * already honest about it - grounds.service returns `cadence: cadenceStated ? cadence : null` - and
 * until now no screen asked the question the null was reporting.
 *
 * The second is the same shape. The board says, in its own words, that the person running the
 * check-in "has said what success looks like in their own check-in... but has not set it as the
 * standard, so nothing is being read against it. They can state it on the Setup tab." The board
 * knows. The screen where somebody would act on it never mentioned Setup at all.
 *
 * WHY HERE. The end of a session is the only moment where somebody has just spent ten minutes
 * thinking about this work and has not yet been handed a dashboard. Every other route to these two
 * answers requires knowing that a Setup tab exists and that something on it is unset.
 *
 * SHOWN ONLY WHEN GENUINELY MISSING. A block that appears for everybody becomes furniture, and
 * telling somebody who set a weekly cadence that they have not set one is worse than saying nothing.
 * Both halves take a flag from the caller and the whole thing disappears when neither is true.
 *
 * ONE IS INLINE AND ONE IS A LINK, deliberately. Cadence is one tap and it is wrong right now.
 * Saying what good looks like is writing, and writing belongs where there is room for it - which
 * also gets the word "Setup" onto a screen that never said it.
 */
export function WhatThisCheckInStillNeeds({
  cadenceUnset,
  cadence,
  onPickCadence,
  standardUnset,
  onGoToSetup,
  startDateUnset = false,
  renderStartDate,
  timelineUnset = false,
  timelineDays,
  briefStandard = null,
  saidDate = null,
  alreadyStarted = false,
  nextOpens = null,
}: {
  /** Session 1 has begun, so 'when does this start' is no longer a question. */
  alreadyStarted?: boolean
  /** When this reader's next session opens, if it is scheduled. */
  nextOpens?: string | null
  /** The first sentence of the brief that carries a number; read as the standard until one is set. */
  briefStandard?: string | null
  /** A timeframe this person gave in their check-in, so the product does not say nobody chose one. */
  saidDate?: string | null
  /** True when nobody has chosen a rhythm and the default is standing in for one. */
  cadenceUnset: boolean
  /** Whatever is in force now, chosen or defaulted, so the buttons can show which. */
  cadence: string
  onPickCadence: (c: string) => void
  /** True when what success looks like has been said but never set as the standard. */
  standardUnset: boolean
  onGoToSetup: () => void
  /**
   * THE OTHER TWO ANSWERS NOBODY IS ASKED FOR EITHER.
   *
   * Read back on a real check-in: "meeting cadence at the end of the report does not show up and
   * does not have start dates." Both true, and for different reasons.
   *
   * It does not show up because this block hides itself the moment a rhythm was picked - and the
   * door picks one, so `cadenceStated` is true on every check-in born that way and the block never
   * appears at all. That is the right rule applied to too narrow a question. The question is not
   * "is the cadence unset", it is "is anything about how this runs unset", and on that same
   * check-in `startsAt`, `endsAt` and `cadenceAnchorDay` were all null and `timelineStated` false.
   *
   * There are no dates because none were ever set. The control exists, on Setup, under "How long
   * this runs" - so these two rows send you there rather than growing a second date picker here.
   */
  startDateUnset?: boolean
  /**
   * A DATE PICKER HERE, WHERE THERE IS NOWHERE ELSE TO GO.
   *
   * The block offers "Set a start date on Setup" because a saved ground has a Setup page. On the
   * entry flow there is no ground yet and no Setup to send anybody to, so the block was passed
   * startDateUnset=false and simply never appeared. A lead finishing setup and picking a cadence saw
   * no way to say when any of it begins. Her words: "There's no start date etc."
   *
   * A slot, because the two callers genuinely differ: one navigates, one sets a value in place.
   */
  renderStartDate?: ReactNode
  timelineUnset?: boolean
  timelineDays?: number | null
}) {
  const missing = [cadenceUnset, standardUnset, startDateUnset && !alreadyStarted, timelineUnset, alreadyStarted && !!nextOpens].filter(Boolean).length
  if (!missing) return null

  return (
    <div style={{ marginTop: 18, border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 15px', background: 'var(--gw-paper-2)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
        {missing === 1 ? 'One thing this check-in still needs' : `${missing === 2 ? 'Two' : missing === 3 ? 'Three' : 'Four'} things this check-in still needs`}
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 11 }}>
        Nothing to do with the session you just finished. These are about how it runs.
      </div>

      {cadenceUnset && (
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>How often?</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 7 }}>
            Nobody has set this, so it is every two weeks by default.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SELECTABLE_CADENCES.map((c) => (
              <button
                key={c.cadence}
                onClick={() => onPickCadence(c.cadence)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: '1px solid ' + (cadence === c.cadence ? 'var(--gw-navy)' : 'var(--gw-border)'),
                  background: cadence === c.cadence ? 'var(--gw-navy)' : 'white',
                  color: cadence === c.cadence ? 'white' : 'var(--gw-text)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {startDateUnset && !alreadyStarted && (
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>When does this start?</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 7 }}>
            No start date is set, so everything is counted from the day you opened this. A date
            decides two real things: session one stays shut until then, and anybody added before it
            is invited on the day rather than now.
          </div>
          {renderStartDate ?? (
            <button
              onClick={onGoToSetup}
              style={{ padding: '7px 13px', borderRadius: 8, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Set a start date on People and setup &rarr;
            </button>
          )}
        </div>
      )}
      {alreadyStarted && nextOpens && (
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>When is the next one?</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
            Your next session opens on {whenItWas(nextOpens, 'dayAndMonthLong')}. The rhythm is set on People and setup.
          </div>
        </div>
      )}

      {timelineUnset && (
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>How long does it run?</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 7 }}>
            {saidDate
              ? <>You said {saidDate} in your check-in. The check-in itself is set to {timelineDays ?? 90} days, and everything that says days remaining counts against that, not against your date.</>
              : <>Nobody chose this, so it is {timelineDays ?? 90} days by default. Everything that says days remaining is counting against that number.</>}
          </div>
          <button
            onClick={onGoToSetup}
            style={{ padding: '7px 13px', borderRadius: 8, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Change it on People and setup &rarr;
          </button>
        </div>
      )}

      {standardUnset && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>What does good look like?</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 7 }}>
            {briefStandard
              ? <>Your brief says &ldquo;{briefStandard}&rdquo;. That is being read as the standard until you set one here.</>
              : <>You said it in the session. It is not set as the standard, so nothing is being read against it.</>}
          </div>
          <button
            onClick={onGoToSetup}
            style={{ padding: '7px 13px', borderRadius: 8, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Set it on People and setup →
          </button>
        </div>
      )}
    </div>
  )
}

import { SELECTABLE_CADENCES } from '@/lib/cadence'

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
}: {
  /** True when nobody has chosen a rhythm and the default is standing in for one. */
  cadenceUnset: boolean
  /** Whatever is in force now, chosen or defaulted, so the buttons can show which. */
  cadence: string
  onPickCadence: (c: string) => void
  /** True when what success looks like has been said but never set as the standard. */
  standardUnset: boolean
  onGoToSetup: () => void
}) {
  if (!cadenceUnset && !standardUnset) return null

  return (
    <div style={{ marginTop: 18, border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 15px', background: 'var(--gw-paper-2)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
        {cadenceUnset && standardUnset ? 'Two things this check-in still needs' : 'One thing this check-in still needs'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 11 }}>
        Nothing to do with the session you just finished. These are about how it runs.
      </div>

      {cadenceUnset && (
        <div style={{ marginBottom: standardUnset ? 13 : 0 }}>
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

      {standardUnset && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>What does good look like?</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 7 }}>
            You said it in the session. It is not set as the standard, so nothing is being read
            against it.
          </div>
          <button
            onClick={onGoToSetup}
            style={{ padding: '7px 13px', borderRadius: 8, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Set it on Setup →
          </button>
        </div>
      )}
    </div>
  )
}

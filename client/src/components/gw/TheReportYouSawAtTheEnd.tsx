import type { ReactNode } from 'react'
import { Sec } from './kit'
import type { EntryReport } from '@/api/entry'

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
  return <div style={{ fontSize: 13, fontWeight: weight, color: 'var(--gw-text)', marginBottom: 2 }}>{children}</div>
}

export interface TheReportYouSawAtTheEndProps {
  /** The report itself, exactly as it was produced. */
  report: EntryReport
  /** The correction conversation, when this reader can still correct it. */
  correctionSlot?: ReactNode
  /** True to note that the reader has already corrected this once. */
  correctedNote?: boolean
  /** Renders the invite control against a suggested party or a mentioned person, when there is one. */
  renderAdd?: (key: string, label: string) => ReactNode
  /** The line under "Where this leaves you" saying what is on record. */
  onRecordLine?: ReactNode
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

export function TheReportYouSawAtTheEnd({
  report,
  correctionSlot,
  correctedNote,
  renderAdd,
  onRecordLine,
}: TheReportYouSawAtTheEndProps) {
  return (
    <>
        {/* What we heard from you */}
        <div style={{ background: 'var(--gw-dark)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700 }}>What we heard from you</div>
            {correctedNote && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontStyle: 'normal' }}>Updated after your correction</div>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{report.whatGroundworkSaw}</p>
          {correctionSlot}
        </div>

        {/* How complete your account is (one-sided until others check in) */}
        <div style={{ marginBottom: 16 }}>
          <Sec title="How complete your account is" />
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--gw-text)' }}>{STATUS_DISPLAY[report.alignmentStatus] ?? report.alignmentStatus}</div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.5 }}>{report.alignmentBasis}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {(['Unresolved','Mixed','Emerging','Clear','Aligned'] as const).map(s => {
              const order = ['Unresolved','Mixed','Emerging','Clear','Aligned']
              const on = order.indexOf(s) <= order.indexOf(report.alignmentStatus)
              // "Shared" (data value 'Aligned') requires a second party, so it stays locked in a one-sided report.
              const locked = s === 'Aligned'
              const bg = on ? 'var(--gw-navy)' : 'var(--gw-bg)'
              return (
                <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 9, letterSpacing: '.03em', textTransform: 'uppercase', padding: '5px 2px', borderRadius: 5, fontWeight: 700, background: bg, color: on ? 'white' : (locked ? '#B8B4AE' : 'var(--gw-muted)'), border: locked ? '1px dashed #CFCBC4' : 'none' }}>{locked ? `${STATUS_DISPLAY[s]} 🔒` : STATUS_DISPLAY[s]}</div>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Reading left to right: <b>Just started</b> (little saved yet) → <b>Taking shape</b> → <b>Getting there</b> → <b>Clear</b> (your side is well defined) → <b>Shared</b>. This is your side only. It becomes "Shared" once everyone else checks in too.
          </div>
        </div>

        {/* What's still open */}
        {report.areasRequiringAlignment.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Sec title={`What's still open`} />
            {report.areasRequiringAlignment.map((a, i) => (
              <div key={i} style={{ border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-amber-b)', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7 }}>{a.title}</div>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>What we noticed</span>{a.observation}</div>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>Why it matters</span>{a.whyItMatters}</div>
                <div style={{ background: 'var(--gw-green-bg)', borderRadius: 7, padding: '7px 9px', fontSize: 12, color: 'var(--gw-green-t)', lineHeight: 1.5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-green-t)', opacity: .75, display: 'block', marginBottom: 2 }}>What to do next</span>{a.recommendedMove}</div>
              </div>
            ))}
          </div>
        )}

        {/* Clear on your side (not mutual agreement - only one party has checked in) */}
        {report.alignmentReached.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Sec title="Clear on your side" />
            {report.alignmentReached.map((a, i) => (
              <div key={i} style={{ border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-green-b)', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{a.note}</div>
              </div>
            ))}
          </div>
        )}

        {/* Suggested parties */}
        {report.suggestedParties && report.suggestedParties.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Sec title="Recommended additions" />
            <div style={{ border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-navy)', borderRadius: 10, padding: '11px 13px', background: 'var(--gw-blue-bg)' }}>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                Based on this check-in, these roles would strengthen the check-in. Their account would change or confirm what is currently on record from one side only.
              </div>
              {report.suggestedParties.map((p, i) => {
                const key = `sug-${i}-${p.role}`
                return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--gw-blue-bg)' : undefined }}>
                  <div style={{ flex: 1 }}>
                    <CardTitle>{p.role}</CardTitle>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{p.reason}</div>
                    {renderAdd?.(key, p.reason)}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mentioned people */}
        {report.mentionedPeople && report.mentionedPeople.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Sec title="People mentioned" />
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '11px 13px', background: 'var(--gw-paper)' }}>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
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
                {renderAdd
                  ? 'You named these people while you were talking. Add anyone who should give their own account of this, and they will be invited when you save. Adding here or below is the same list, so nobody is invited twice.'
                  : 'You named these people while you were talking. Adding somebody to this check-in is done on its Setup tab.'}
              </div>
              {report.mentionedPeople.map((p, i) => {
                const key = `men-${i}-${p.name}`
                return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                  <div style={{ flex: 1 }}>
                    <CardTitle>{p.name}</CardTitle>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{p.context}</div>
                    {renderAdd?.(key, `${p.name} - ${p.context}`)}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
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
          <div style={{ marginBottom: 16 }}>
            <Sec title="Also came up" />
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '11px 13px', background: 'var(--gw-paper)' }}>
              {report.alsoCameUpNote && (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                  {report.alsoCameUpNote}
                </div>
              )}
              {report.alsoCameUp.map((p, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                  <CardTitle>{p.name}</CardTitle>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{p.context}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Where this leaves you — the one-glance summary of the detail above */}
        <div style={{ marginBottom: 16 }}>
          <Sec title="Where this leaves you" />
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 8, lineHeight: 1.5 }}>A one-glance summary of your side. "Worth revisiting" is what we will check back on with you next time, not a task list.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { k: 'Settled', v: report.honestClose.aligned, bg: 'var(--gw-green-bg)', kc: 'var(--gw-green-t)' },
              { k: 'Still open', v: report.honestClose.open, bg: 'var(--gw-amber-bg)', kc: 'var(--gw-amber-t)' },
              { k: 'Worth revisiting', v: report.honestClose.revisit, bg: 'var(--gw-blue-bg)', kc: 'var(--gw-navy)' },
              { k: 'Watch for', v: report.honestClose.risk,  bg: 'var(--gw-clay-bg)', kc: 'var(--gw-clay)' },
            ].map(({ k, v, bg, kc }) => (
              <div key={k} style={{ background: bg, borderRadius: 8, padding: '9px 11px', fontSize: 12, lineHeight: 1.5, color: 'var(--gw-text)' }}>
                <span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: kc, display: 'block', marginBottom: 3 }}>{k}</span>
                {v}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 8 }}>
            {onRecordLine}
          </div>
        </div>
    </>
  )
}

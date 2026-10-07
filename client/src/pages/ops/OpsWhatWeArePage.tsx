import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { readDate } from './OpsTable'
import { Adder } from './OpsForm'

/**
 * WHAT WE SAY THIS PRODUCT IS.
 *
 * It existed already, as slide three of the sales deck — the wrong home twice
 * over. It lives inside one of the documents it is meant to govern, and a deck
 * is a file somebody edits and re-sends rather than something the system can
 * read. Every marketing check in the plan holds a resource up against this, so
 * it has to be here before any of them can work.
 *
 * The two halves are not equal. "What it is" reads much the same for every
 * product; the refusals are specific, arguable, and the thing a deck actually
 * violates — nothing usually claims to be something we never said we were, it
 * quietly becomes one of the four on the right.
 */
export function OpsWhatWeArePage() {
  const it = useQuery({ queryKey: ['ops', 'what-we-are'], queryFn: opsApi.whatWeAre, retry: false })
  const past = useQuery({ queryKey: ['ops', 'what-we-were'], queryFn: opsApi.whatWeUsedToSay, retry: false })
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const mayChangeIt = me.data?.capabilities?.includes('ceo:board') ?? false

  const d = it.data

  return (
    <section className="gw-page" style={PAGE}>
      <OpsHeader name="What we are" answers="What is this product, and what is it not?" />

      {d && (
        <>
          <section style={{ ...CARD, marginBottom: 14 }}>
            <p style={LABEL}>
              Version {d.version}
              {d.seeded ? ' · from the deck, not yet set here' : ''}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', margin: '6px 0 8px', maxWidth: '30ch' }}>
              {d.headline}
            </h2>
            {d.saidOutLoud && (
              <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: 0, maxWidth: '62ch', lineHeight: 1.6 }}>
                {d.saidOutLoud}
              </p>
            )}
            {d.writtenAt && (
              <p style={{ fontSize: 11.5, color: 'var(--gw-sub)', margin: '10px 0 0' }}>
                Written {readDate(d.writtenAt)}
                {d.writtenBy ? ` by ${d.writtenBy}` : ''}
                {d.because ? ` - ${d.because}` : ''}
              </p>
            )}
            {d.seeded && (
              /* Said, so nobody mistakes the deck's words for a decision made in
                 here. Until somebody sets it, the check is running against a
                 slide. */
              <p style={{ fontSize: 12.5, color: 'var(--gw-amber-t)', margin: '10px 0 0', maxWidth: '62ch', lineHeight: 1.6 }}>
                These are the words from the sales deck, carried across verbatim. Nobody has set them
                here yet, so every marketing check would be measuring against a slide.
              </p>
            )}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 14 }}>
            <section style={CARD}>
              <p style={LABEL}>What it is</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7 }}>
                {d.isIt.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>

            <section style={{ ...CARD, borderColor: 'var(--gw-red-b-soft)' }}>
              {/* The half that does the work, and it looks different because it
                  is different: this is the list a deck violates. */}
              <p style={{ ...LABEL, color: 'var(--gw-red-t)' }}>What it is not</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7 }}>
                {d.isNotIt.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          </div>

          {mayChangeIt && (
            <Adder
              title="Say it differently"
              fields={[
                { name: 'headline', label: 'What this is, in one line', required: true, placeholder: d.headline },
                { name: 'saidOutLoud', label: 'The line to say out loud in the room', placeholder: d.saidOutLoud },
                { name: 'isIt', label: 'What it is - one per line', type: 'textarea', required: true, placeholder: d.isIt.join('\n') },
                { name: 'isNotIt', label: 'What it is not - one per line', type: 'textarea', required: true, placeholder: d.isNotIt.join('\n') },
                { name: 'because', label: 'Why it changed', type: 'textarea' },
              ]}
              submit={(v) =>
                opsApi.sayItDifferently({
                  headline: v.headline,
                  saidOutLoud: v.saidOutLoud || d.saidOutLoud,
                  isIt: v.isIt.split('\n').map((l) => l.trim()).filter(Boolean),
                  isNotIt: v.isNotIt.split('\n').map((l) => l.trim()).filter(Boolean),
                  because: v.because || undefined,
                })
              }
              invalidate={[['ops']]}
              submitLabel="Say it"
            />
          )}

          {(past.data ?? []).length > 1 && (
            <section style={{ ...CARD, marginTop: 14 }}>
              {/* Kept because a sign-off records which version it was checked
                  against. What we used to say is evidence about what changed. */}
              <p style={LABEL}>What we used to say</p>
              {(past.data ?? []).slice(1).map((v) => (
                <p key={v.version} style={{ fontSize: 13, margin: '8px 0 0', color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                  <strong>v{v.version}</strong> · {v.headline}
                  {v.because ? ` - ${v.because}` : ''} · {readDate(v.writtenAt)}
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  )
}
